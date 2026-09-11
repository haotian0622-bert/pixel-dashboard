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
    const addBtn = wrapper.findAll('button').find(b => b.text().includes('新增点子'))
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
    const select = wrapper.find('.idea-list__status-select')
    await select.setValue(MEDIA_STATUS.PUBLISHED)
    await flushPromises(); await new Promise(r => setTimeout(r, 50))
    const all = await getAll('media')
    expect(all[0].status).toBe(MEDIA_STATUS.PUBLISHED)
  })

  it('可排发布日期', async () => {
    const wrapper = await mountMedia()
    const addBtn = wrapper.findAll('button').find(b => b.text().includes('新增点子'))
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

  it('按状态筛选', async () => {
    await save('media', { title: '点子1', platform: 'b站', status: MEDIA_STATUS.IDEA })
    await save('media', { title: '草稿1', platform: 'b站', status: MEDIA_STATUS.DRAFT })
    await save('media', { title: '已发1', platform: 'b站', status: MEDIA_STATUS.PUBLISHED })
    const wrapper = await mountMedia()
    await waitFor(() => { expect(wrapper.findAll('.idea-list__item').length).toBe(3) })
    const filterSelect = wrapper.find('select')
    await filterSelect.setValue(MEDIA_STATUS.DRAFT)
    await flushPromises()
    expect(wrapper.text()).toContain('草稿1')
    expect(wrapper.text()).not.toContain('点子1')
    expect(wrapper.text()).not.toContain('已发1')
  })
})
