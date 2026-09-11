import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { createPinia } from 'pinia'
import Study from '../views/Study.vue'
import StudyDetail from '../views/StudyDetail.vue'
import { initDB, closeDB } from '../db/init'
import { clear, save, getAll, query } from '../db/dao'
import { STORES, STUDY_STATUS } from '../utils/constants'
import { today } from '../utils/date'

function mockRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/study', name: 'study', component: Study },
      { path: '/study/:id', name: 'studyDetail', component: StudyDetail }
    ]
  })
}
async function mountStudy() {
  const wrapper = mount(Study, { global: { plugins: [createPinia(), mockRouter()] } })
  await flushPromises(); await new Promise(r => setTimeout(r, 50)); await flushPromises()
  return wrapper
}
async function mountStudyDetail(id) {
  const router = mockRouter()
  router.push(`/study/${id}`)
  await router.isReady()
  const wrapper = mount(StudyDetail, { global: { plugins: [createPinia(), router] } })
  await flushPromises(); await new Promise(r => setTimeout(r, 50)); await flushPromises()
  return wrapper
}
async function waitFor(fn, t = 2000) { return vi.waitFor(fn, { timeout: t, interval: 50 }) }

describe('阶段9：学习计划模块', () => {
  beforeEach(async () => {
    closeDB(); await initDB()
    for (const s of STORES) await clear(s)
  })

  it('可新增学习主题', async () => {
    const wrapper = await mountStudy()
    const addBtn = wrapper.findAll('button').find(b => b.text().includes('新增主题'))
    await addBtn.trigger('click'); await flushPromises()
    const nameInput = wrapper.findAll('input').find(i => i.attributes('placeholder') === '主题名称')
    await nameInput.setValue('AI学习')
    const saveBtn = wrapper.findAll('button').find(b => b.text() === '保存')
    await saveBtn.trigger('click'); await flushPromises()
    await new Promise(r => setTimeout(r, 50))
    await waitFor(() => { expect(wrapper.text()).toContain('AI学习') })
    const all = await getAll('studyTopics')
    expect(all.length).toBe(1)
  })

  it('主题下可加任务、打卡、资料备忘', async () => {
    const t = await save('studyTopics', { name: '测试主题', goal: '学完', status: STUDY_STATUS.ACTIVE })
    const wrapper = await mountStudyDetail(t.id)
    await waitFor(() => { expect(wrapper.text()).toContain('测试主题') })

    // 加任务
    let addBtn = wrapper.findAll('button').find(b => b.text().includes('新增任务'))
    await addBtn.trigger('click'); await flushPromises()
    let titleInput = wrapper.findAll('input').find(i => i.attributes('placeholder') === '任务标题')
    await titleInput.setValue('看第1章')
    let saveBtn = wrapper.findAll('button').find(b => b.text() === '保存')
    await saveBtn.trigger('click'); await flushPromises()
    await new Promise(r => setTimeout(r, 50))

    // 加打卡
    const contentInput = wrapper.findAll('input').find(i => i.attributes('placeholder')?.includes('学了什么'))
    await contentInput.setValue('学了基础')
    addBtn = wrapper.findAll('button').find(b => b.text() === '记录')
    await addBtn.trigger('click'); await flushPromises()
    await new Promise(r => setTimeout(r, 50))

    // 加资料
    addBtn = wrapper.findAll('button').find(b => b.text().includes('新增资料'))
    await addBtn.trigger('click'); await flushPromises()
    const matInput = wrapper.findAll('input').find(i => i.attributes('placeholder')?.includes('链接或要点'))
    await matInput.setValue('教程链接')
    saveBtn = wrapper.findAll('button').find(b => b.text() === '保存')
    await saveBtn.trigger('click'); await flushPromises()
    await new Promise(r => setTimeout(r, 50))

    const tasks = await query('studyTasks', 'topicId', t.id)
    const logs = await query('studyLogs', 'topicId', t.id)
    const mats = await query('studyMaterials', 'topicId', t.id)
    expect(tasks.length).toBe(1)
    expect(logs.length).toBe(1)
    expect(mats.length).toBe(1)
  })

  it('今日到期任务出现在今日计划', async () => {
    const t = await save('studyTopics', { name: '主题', goal: '', status: STUDY_STATUS.ACTIVE })
    await save('studyTasks', { title: '今日学习任务', topicId: t.id, dueDate: today(), done: false })
    const { getTodayItems } = await import('../db/aggr')
    const items = await getTodayItems()
    const studyItems = items.filter(i => i.source === 'study')
    expect(studyItems.length).toBe(1)
    expect(studyItems[0].title).toBe('今日学习任务')
  })

  it('显示本周累计次数和时长', async () => {
    const t = await save('studyTopics', { name: '统计主题', goal: '', status: STUDY_STATUS.ACTIVE })
    await save('studyLogs', { date: today(), topicId: t.id, content: '学习', duration: 60 })
    await save('studyLogs', { date: today(), topicId: t.id, content: '学习2', duration: 90 })
    const wrapper = await mountStudy()
    await waitFor(() => {
      expect(wrapper.text()).toContain('2 次')
      expect(wrapper.text()).toContain('150 分钟')
    })
  })
})
