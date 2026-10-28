import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { createPinia } from 'pinia'
import Home from '../views/Home.vue'
import { initDB, closeDB } from '../db/init'
import { clear, save, getAll } from '../db/dao'
import { STORES } from '../utils/constants'
import { today, getWeekday } from '../utils/date'

/**
 * 阶段 3 测试：首页
 * 验证今日计划区、快速备忘、模块摘要卡
 */

function mockRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: Home },
      { path: '/plan', name: 'plan', component: { template: '<div/>' } },
      { path: '/media', name: 'media', component: { template: '<div/>' } },
      { path: '/dev', name: 'dev', component: { template: '<div/>' } },
      { path: '/company', name: 'company', component: { template: '<div/>' } },
      { path: '/fitness', name: 'fitness', component: { template: '<div/>' } },
      { path: '/study', name: 'study', component: { template: '<div/>' } },
      { path: '/finance', name: 'finance', component: { template: '<div/>' } },
      { path: '/settings', name: 'settings', component: { template: '<div/>' } }
    ]
  })
}

async function mountHome() {
  const router = mockRouter()
  const wrapper = mount(Home, {
    global: {
      plugins: [createPinia(), router]
    }
  })
  // 等待所有异步 onMounted 完成
  await flushPromises()
  await new Promise(r => setTimeout(r, 50))
  await flushPromises()
  return wrapper
}

// 辅助：等待条件成立
async function waitFor(fn, timeout = 2000) {
  return vi.waitFor(fn, { timeout, interval: 50 })
}

describe('阶段3：首页', () => {
  beforeEach(async () => {
    closeDB()
    await initDB()
    for (const store of STORES) {
      await clear(store)
    }
  })

  it('显示今日日期和状态', async () => {
    const wrapper = await mountHome()
    const text = wrapper.text()
    expect(text).toMatch(/\d+月\d+日\s*周[一二三四五六日]/)
    expect(text).toContain('今日')
    expect(text).toContain('项待办')
  })

  it('今日计划区展示汇集的今日项', async () => {
    await save('tasks', {
      title: '今日测试任务', date: today(), done: false, source: 'manual'
    })
    const wrapper = await mountHome()
    await waitFor(() => {
      expect(wrapper.text()).toContain('今日测试任务')
    })
    expect(wrapper.text()).toContain('手动')
  })

  it('今日计划区每项可勾选完成，勾选后数字更新', async () => {
    await save('tasks', {
      title: '可勾选任务', date: today(), done: false, source: 'manual'
    })
    const wrapper = await mountHome()

    // 初始 0/1
    await waitFor(() => {
      expect(wrapper.text()).toContain('0/1')
    })

    // 点击勾选
    const checkbox = wrapper.find('.task-checkbox')
    await checkbox.trigger('click')
    await flushPromises()
    await new Promise(r => setTimeout(r, 50))
    await flushPromises()

    // 应变为 1/1
    await waitFor(() => {
      expect(wrapper.text()).toContain('1/1')
    })
    expect(wrapper.find('.task-done').exists()).toBe(true)
  })

  it('今日计划区项有来源色点', async () => {
    await save('tasks', {
      title: '带色点任务', date: today(), done: false, source: 'manual'
    })
    const wrapper = await mountHome()
    await waitFor(() => {
      const dots = wrapper.findAll('.source-dot')
      expect(dots.length).toBeGreaterThan(0)
    })
    const dots = wrapper.findAll('.source-dot')
    expect(dots[0].attributes('style')).toContain('background')
  })

  it('快速备忘可新增多条便签，自动保存，可删', async () => {
    await save('memos', { content: '已有便签' })
    const wrapper = await mountHome()

    await waitFor(() => {
      expect(wrapper.text()).toContain('已有便签')
    })

    // 找到新建便签按钮并点击
    const buttons = wrapper.findAll('button')
    const newMemoBtn = buttons.find(b => b.text().includes('新建便签'))
    await newMemoBtn.trigger('click')
    await flushPromises()

    // 输入内容
    const textarea = wrapper.find('textarea')
    await textarea.setValue('新便签内容')
    await textarea.trigger('blur')
    await flushPromises()
    await new Promise(r => setTimeout(r, 50))
    await flushPromises()

    const allMemos = await getAll('memos')
    expect(allMemos.length).toBe(2)
    expect(allMemos.map(m => m.content)).toContain('新便签内容')
  })

  it('摘要卡显示正确的关键数字', async () => {
    await save('tasks', { title: '任务1', date: today(), done: false, source: 'manual' })
    await save('tasks', { title: '任务2', date: today(), done: true, source: 'manual' })
    await save('media', { title: '视频', status: 'scheduled', publishDate: today() })
    await save('devProjects', { name: 'AI项目', status: 'active' })
    await save('devTasks', { title: '写代码', projectId: 'p1', done: false })
    await save('devTasks', { title: '测试', projectId: 'p1', done: true })
    await save('companyItems', { title: '会议', category: 'meeting', deadline: today(), status: 'todo' })
    await save('fitnessLogs', { date: today(), done: true })
    await save('studyTopics', { name: 'AI学习', status: 'active' })
    await save('financeRecords', { amount: 100, type: 'expense', date: today() })
    await save('financeRecords', { amount: 5000, type: 'income', date: today() })

    const wrapper = await mountHome()
    await waitFor(() => {
      const cards = wrapper.findAll('.summary-card')
      expect(cards.length).toBe(6)
    })

    expect(wrapper.text()).toContain('1/2')
    expect(wrapper.text()).toContain('¥100')
    expect(wrapper.text()).toContain('5000')
  })

  it('摘要卡点击跳转对应模块', async () => {
    const wrapper = await mountHome()
    await waitFor(() => {
      const cards = wrapper.findAll('.summary-card')
      expect(cards.length).toBe(6)
    })
    const cards = wrapper.findAll('.summary-card')
    await cards[0].trigger('click')
    await flushPromises()
  })
})
