import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { createPinia } from 'pinia'
import Company from '../views/Company.vue'
import { initDB, closeDB } from '../db/init'
import { clear, save, getAll, query } from '../db/dao'
import { STORES, COMPANY_STATUS, COMPANY_CATEGORY } from '../utils/constants'
import { today } from '../utils/date'

function mockRouter() {
  return createRouter({ history: createMemoryHistory(), routes: [{ path: '/company', name: 'company', component: Company }] })
}
async function mountCompany() {
  const wrapper = mount(Company, { global: { plugins: [createPinia(), mockRouter()] } })
  await flushPromises(); await new Promise(r => setTimeout(r, 50)); await flushPromises()
  return wrapper
}
async function waitFor(fn, t = 2000) { return vi.waitFor(fn, { timeout: t, interval: 50 }) }

describe('阶段7：公司事情安排模块', () => {
  beforeEach(async () => {
    closeDB(); await initDB()
    for (const s of STORES) await clear(s)
  })

  it('可新增事项（标题、分类、优先级、截止、状态）', async () => {
    const wrapper = await mountCompany()
    const addBtn = wrapper.findAll('button').find(b => b.text().includes('新增事项'))
    await addBtn.trigger('click'); await flushPromises()
    const titleInput = wrapper.findAll('input').find(i => i.attributes('placeholder') === '事项标题')
    await titleInput.setValue('项目会议')
    const saveBtn = wrapper.findAll('button').find(b => b.text() === '保存')
    await saveBtn.trigger('click'); await flushPromises()
    await new Promise(r => setTimeout(r, 50))
    await waitFor(() => { expect(wrapper.text()).toContain('项目会议') })
    const all = await getAll('companyItems')
    expect(all.length).toBe(1)
  })

  it('可按分类/状态筛选', async () => {
    await save('companyItems', { title: '项目A', category: COMPANY_CATEGORY.PROJECT, status: COMPANY_STATUS.TODO, priority: 'high' })
    await save('companyItems', { title: '会议B', category: COMPANY_CATEGORY.MEETING, status: COMPANY_STATUS.DONE, priority: 'medium' })
    const wrapper = await mountCompany()
    await waitFor(() => { expect(wrapper.findAll('.company__item').length).toBe(2) })
    // 按分类筛选
    const selects = wrapper.findAll('select')
    await selects[0].setValue(COMPANY_CATEGORY.PROJECT)
    await flushPromises()
    expect(wrapper.text()).toContain('项目A')
    expect(wrapper.text()).not.toContain('会议B')
  })

  it('可加跟进备注（带时间戳）', async () => {
    const item = await save('companyItems', { title: '待跟进', category: COMPANY_CATEGORY.DAILY, status: COMPANY_STATUS.TODO, priority: 'medium' })
    const wrapper = await mountCompany()
    await waitFor(() => { expect(wrapper.text()).toContain('待跟进') })
    // 点击展开备注
    await wrapper.find('.company__item-main').trigger('click')
    await flushPromises()
    await new Promise(r => setTimeout(r, 50))
    // 输入备注
    const noteInput = wrapper.find('.note-input input')
    await noteInput.setValue('已邮件跟进')
    await noteInput.trigger('keyup.enter')
    await flushPromises()
    await new Promise(r => setTimeout(r, 50))
    const notes = await query('companyNotes', 'itemId', item.id)
    expect(notes.length).toBe(1)
    expect(notes[0].content).toBe('已邮件跟进')
    expect(notes[0].timestamp).toBeDefined()
  })

  it('今日截止事项出现在今日计划', async () => {
    await save('companyItems', { title: '今日截止事', category: COMPANY_CATEGORY.DAILY, deadline: today(), status: COMPANY_STATUS.TODO, priority: 'high' })
    const { getTodayItems } = await import('../db/aggr')
    const items = await getTodayItems()
    const companyItems = items.filter(i => i.source === 'company')
    expect(companyItems.length).toBe(1)
    expect(companyItems[0].title).toBe('今日截止事')
  })
})
