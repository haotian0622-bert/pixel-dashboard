import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { createPinia } from 'pinia'
import Dev from '../views/Dev.vue'
import DevDetail from '../views/DevDetail.vue'
import { initDB, closeDB } from '../db/init'
import { clear, save, getAll, query } from '../db/dao'
import { STORES, DEV_PROJECT_STATUS, MILESTONE_STATUS } from '../utils/constants'
import { today } from '../utils/date'

function mockRouter(id) {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/dev', name: 'dev', component: Dev },
      { path: '/dev/:id', name: 'devDetail', component: DevDetail }
    ]
  })
}
async function mountDev() {
  const wrapper = mount(Dev, { global: { plugins: [createPinia(), mockRouter()] } })
  await flushPromises(); await new Promise(r => setTimeout(r, 50)); await flushPromises()
  return wrapper
}
async function mountDevDetail(id) {
  const router = mockRouter()
  router.push(`/dev/${id}`)
  await router.isReady()
  const wrapper = mount(DevDetail, { global: { plugins: [createPinia(), router] } })
  await flushPromises(); await new Promise(r => setTimeout(r, 50)); await flushPromises()
  return wrapper
}
async function waitFor(fn, t = 2000) { return vi.waitFor(fn, { timeout: t, interval: 50 }) }

describe('阶段6：开发工作（AI）模块', () => {
  beforeEach(async () => {
    closeDB(); await initDB()
    for (const s of STORES) await clear(s)
  })

  it('可新增项目，显示在项目列表', async () => {
    const wrapper = await mountDev()
    const addBtn = wrapper.findAll('button').find(b => b.text().includes('新增项目'))
    await addBtn.trigger('click'); await flushPromises()
    const nameInput = wrapper.findAll('input').find(i => i.attributes('placeholder') === '项目名称')
    await nameInput.setValue('AI助手')
    const saveBtn = wrapper.findAll('button').find(b => b.text() === '保存')
    await saveBtn.trigger('click'); await flushPromises()
    await new Promise(r => setTimeout(r, 50))
    await waitFor(() => { expect(wrapper.text()).toContain('AI助手') })
    const all = await getAll('devProjects')
    expect(all.length).toBe(1)
  })

  it('项目详情页有里程碑、任务、代码片段', async () => {
    const p = await save('devProjects', { name: '测试项目', desc: '', status: DEV_PROJECT_STATUS.ACTIVE })
    await save('devMilestones', { name: 'M1', projectId: p.id, status: MILESTONE_STATUS.NOT_STARTED })
    await save('devTasks', { title: '写代码', projectId: p.id, done: false })
    await save('devSnippets', { code: 'console.log(1)', note: '测试片段', projectId: p.id })

    const wrapper = await mountDevDetail(p.id)
    await waitFor(() => {
      expect(wrapper.text()).toContain('测试项目')
      expect(wrapper.text()).toContain('M1')
      expect(wrapper.text()).toContain('写代码')
      expect(wrapper.text()).toContain('测试片段')
    })
  })

  it('完成里程碑/任务后进度条自动更新', async () => {
    const p = await save('devProjects', { name: '进度项目', desc: '', status: DEV_PROJECT_STATUS.ACTIVE })
    await save('devTasks', { title: '任务1', projectId: p.id, done: false })
    await save('devTasks', { title: '任务2', projectId: p.id, done: false })

    // 验证初始进度 0%
    const wrapper = await mountDev()
    await waitFor(() => { expect(wrapper.text()).toContain('进度项目') })
    expect(wrapper.text()).toContain('0%')

    // 完成一个任务
    const tasks = await query('devTasks', 'projectId', p.id)
    await save('devTasks', { ...tasks[0], done: true })

    // 重新加载
    const wrapper2 = await mountDev()
    await waitFor(() => { expect(wrapper2.text()).toContain('50%') })
  })

  it('今日到期任务出现在今日计划', async () => {
    const p = await save('devProjects', { name: '项目', desc: '', status: DEV_PROJECT_STATUS.ACTIVE })
    await save('devTasks', { title: '今日到期任务', projectId: p.id, dueDate: today(), done: false })

    const { getTodayItems } = await import('../db/aggr')
    const items = await getTodayItems()
    const devItems = items.filter(i => i.source === 'dev')
    expect(devItems.length).toBe(1)
    expect(devItems[0].title).toBe('今日到期任务')
  })
})
