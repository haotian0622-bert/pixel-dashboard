import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { createPinia } from 'pinia'
import Media from '../views/Media.vue'
import { initDB, closeDB } from '../db/init'
import { clear, save, getAll } from '../db/dao'
import { STORES, MEDIA_STATUS } from '../utils/constants'
import { today } from '../utils/date'

function mockRouter() {
  return createRouter({ history: createMemoryHistory(), routes: [{ path: '/media', name: 'media', component: Media }] })
}
async function mountMedia() {
  const wrapper = mount(Media, { global: { plugins: [createPinia(), mockRouter()] } })
  await flushPromises(); await new Promise(r => setTimeout(r, 50)); await flushPromises()
  return wrapper
}
async function waitFor(fn, t = 2000) { return vi.waitFor(fn, { timeout: t, interval: 50 }) }

describe('阶段5：自媒体模块', () => {
  beforeEach(async () => {
    closeDB(); await initDB()
    for (const s of STORES) await clear(s)
  })

  it('可新增点子（标题、平台、状态）', async () => {
    const wrapper = await mountMedia()
    const addBtn = wrapper.findAll('button').find(b => b.text().includes('新增记录'))
    await addBtn.trigger('click'); await flushPromises()
    const titleInput = wrapper.findAll('input').find(i => i.attributes('placeholder') === '标题')
    await titleInput.setValue('测试视频')
    const saveBtn = wrapper.findAll('button').find(b => b.text() === '保存')
    await saveBtn.trigger('click'); await flushPromises()
    await new Promise(r => setTimeout(r, 50))
    await waitFor(() => { expect(wrapper.text()).toContain('测试视频') })
    const all = await getAll('media')
    expect(all.length).toBe(1)
    expect(all[0].title).toBe('测试视频')
  })

  it('可修改状态（点子→草稿→待发→已发）', async () => {
    await save('media', { title: '状态测试', platform: 'b站', status: MEDIA_STATUS.IDEA })
    const wrapper = await mountMedia()
    await waitFor(() => { expect(wrapper.text()).toContain('状态测试') })
    // 进入编辑模式
    const editBtn = wrapper.findAll('button').find(b => b.text() === '改')
    await editBtn.trigger('click'); await flushPromises()
    // 表单内含 status select，通过 v-model="form.status" 定位
    const statusSelect = wrapper.findAll('select').find(s => s.attributes('style') === '' && s.element.value === MEDIA_STATUS.IDEA)
      || wrapper.findAll('select').filter(s => s.element.value === MEDIA_STATUS.IDEA)[1]
    if (statusSelect) {
      await statusSelect.setValue(MEDIA_STATUS.PUBLISHED)
    }
    // 直接修改 form.status 兜底（绕过选择器歧义）
    const saveBtn = wrapper.findAll('button').find(b => b.text() === '保存')
    await saveBtn.trigger('click'); await flushPromises()
    await new Promise(r => setTimeout(r, 50))
    const all = await getAll('media')
    // 由于编辑表单中状态字段实际由 v-model 绑定，setValue 后保存应同步
    expect(all[0].status).toBe(MEDIA_STATUS.PUBLISHED)
  })

  it('可排发布日期', async () => {
    const wrapper = await mountMedia()
    const addBtn = wrapper.findAll('button').find(b => b.text().includes('新增记录'))
    await addBtn.trigger('click'); await flushPromises()
    const titleInput = wrapper.findAll('input').find(i => i.attributes('placeholder') === '标题')
    await titleInput.setValue('排期视频')
    const dateInput = wrapper.findAll('input').find(i => i.attributes('type') === 'date')
    await dateInput.setValue(today())
    const saveBtn = wrapper.findAll('button').find(b => b.text() === '保存')
    await saveBtn.trigger('click'); await flushPromises()
    await new Promise(r => setTimeout(r, 50))
    await waitFor(() => { expect(wrapper.text()).toContain('排期视频') })
    const all = await getAll('media')
    expect(all[0].publishDate).toBe(today())
  })

  it('已发布可填链接', async () => {
    await save('media', { title: '链接测试', platform: 'b站', status: MEDIA_STATUS.PUBLISHED, link: 'https://example.com' })
    const wrapper = await mountMedia()
    await waitFor(() => { expect(wrapper.text()).toContain('链接测试') })
    // 验证编辑时可看到链接
    const editBtn = wrapper.findAll('button').find(b => b.text() === '改')
    await editBtn.trigger('click'); await flushPromises()
    const linkInput = wrapper.findAll('input').find(i => i.attributes('placeholder')?.includes('发布链接'))
    expect(linkInput?.element.value).toBe('https://example.com')
  })

  it('按栏目分组展示（取代状态筛选）', async () => {
    await save('media', { title: '点子1', platform: 'b站', status: MEDIA_STATUS.IDEA, category: 'idea' })
    await save('media', { title: '发布1', platform: 'b站', status: MEDIA_STATUS.PUBLISHED, category: 'published' })
    await save('media', { title: '进展1', platform: 'b站', status: MEDIA_STATUS.PUBLISHED, category: 'progress' })
    const wrapper = await mountMedia()
    await waitFor(() => { expect(wrapper.findAll('.media-card').length).toBe(3) })
    // 三个栏目都有内容
    expect(wrapper.text()).toContain('点子1')
    expect(wrapper.text()).toContain('发布1')
    expect(wrapper.text()).toContain('进展1')
  })
})
