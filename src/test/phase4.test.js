import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { createPinia } from 'pinia'
import Plan from '../views/Plan.vue'
import { initDB, closeDB } from '../db/init'
import { clear, save, getAll } from '../db/dao'
import { STORES } from '../utils/constants'
import { today, formatDate } from '../utils/date'

/**
 * 阶段 4 测试：计划模块
 */

function mockRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/plan', name: 'plan', component: Plan }
    ]
  })
}

async function mountPlan() {
  const router = mockRouter()
  const wrapper = mount(Plan, {
    global: { plugins: [createPinia(), router] }
  })
  await flushPromises()
  await new Promise(r => setTimeout(r, 50))
  await flushPromises()
  return wrapper
}

async function waitFor(fn, timeout = 2000) {
  return vi.waitFor(fn, { timeout, interval: 50 })
}

describe('阶段4：计划模块', () => {
  beforeEach(async () => {
    closeDB()
    await initDB()
    for (const store of STORES) {
      await clear(store)
    }
  })

  it('今日视图展示今日所有项，来源用色点/标签标明', async () => {
    await save('tasks', { title: '手动任务', date: today(), done: false, source: 'manual' })
    await save('devTasks', { title: '开发任务', projectId: 'p1', dueDate: today(), done: false })

    const wrapper = await mountPlan()
    await waitFor(() => {
      expect(wrapper.text()).toContain('手动任务')
      expect(wrapper.text()).toContain('开发任务')
    })
    // 来源标签
    expect(wrapper.text()).toContain('手动')
    expect(wrapper.text()).toContain('开发')
    // 色点
    const dots = wrapper.findAll('.source-dot')
    expect(dots.length).toBeGreaterThan(0)
  })

  it('本周视图展示周一到周日，每天项数量正确', async () => {
    await save('tasks', { title: '今日任务', date: today(), done: false, source: 'manual' })

    const wrapper = await mountPlan()
    // 切换到本周视图
    const buttons = wrapper.findAll('button')
    const weekBtn = buttons.find(b => b.text().includes('本周'))
    await weekBtn.trigger('click')
    await flushPromises()

    const weekDays = wrapper.findAll('.week-day')
    expect(weekDays.length).toBe(7)
    // 至少今天有 1 项
    await waitFor(() => {
      expect(wrapper.text()).toContain('1 项')
    })
  })

  it('可新增手动任务（指定日期、优先级、备注）', async () => {
    const wrapper = await mountPlan()

    // 点击新增任务
    const addBtn = wrapper.findAll('button').find(b => b.text().includes('新增任务'))
    await addBtn.trigger('click')
    await flushPromises()

    // 填写表单
    const inputs = wrapper.findAll('input')
    const titleInput = inputs.find(i => i.attributes('placeholder') === '任务标题')
    await titleInput.setValue('新测试任务')

    const dateInput = inputs.find(i => i.attributes('type') === 'date')
    await dateInput.setValue(today())

    // 保存
    const saveBtn = wrapper.findAll('button').find(b => b.text() === '保存')
    await saveBtn.trigger('click')
    await flushPromises()
    await new Promise(r => setTimeout(r, 50))
    await flushPromises()

    // 应出现在列表中
    await waitFor(() => {
      expect(wrapper.text()).toContain('新测试任务')
    })

    // 验证数据库
    const tasks = await getAll('tasks')
    expect(tasks.length).toBe(1)
    expect(tasks[0].title).toBe('新测试任务')
    expect(tasks[0].source).toBe('manual')
  })

  it('可编辑手动任务', async () => {
    await save('tasks', {
      title: '原始任务', date: today(), done: false, source: 'manual', priority: 'medium'
    })

    const wrapper = await mountPlan()
    await waitFor(() => {
      expect(wrapper.text()).toContain('原始任务')
    })

    // 点击编辑
    const editBtn = wrapper.findAll('button').find(b => b.text() === '改')
    await editBtn.trigger('click')
    await flushPromises()

    // 修改标题
    const titleInput = wrapper.findAll('input').find(i => i.attributes('placeholder') === '任务标题')
    await titleInput.setValue('已修改任务')

    // 保存
    const saveBtn = wrapper.findAll('button').find(b => b.text() === '保存')
    await saveBtn.trigger('click')
    await flushPromises()
    await new Promise(r => setTimeout(r, 50))

    await waitFor(() => {
      expect(wrapper.text()).toContain('已修改任务')
    })

    const tasks = await getAll('tasks')
    expect(tasks.length).toBe(1)
    expect(tasks[0].title).toBe('已修改任务')
  })

  it('可删除手动任务', async () => {
    await save('tasks', {
      title: '待删任务', date: today(), done: false, source: 'manual'
    })

    const wrapper = await mountPlan()
    await waitFor(() => {
      expect(wrapper.text()).toContain('待删任务')
    })

    const deleteBtn = wrapper.findAll('button').find(b => b.text() === '删')
    await deleteBtn.trigger('click')
    await flushPromises()
    await new Promise(r => setTimeout(r, 50))

    const tasks = await getAll('tasks')
    expect(tasks.length).toBe(0)
  })

  it('可勾选完成，双向同步', async () => {
    await save('tasks', {
      title: '待勾选', date: today(), done: false, source: 'manual'
    })

    const wrapper = await mountPlan()
    await waitFor(() => {
      expect(wrapper.text()).toContain('0/1')
    })

    const checkbox = wrapper.find('.task-checkbox')
    await checkbox.trigger('click')
    await flushPromises()
    await new Promise(r => setTimeout(r, 50))

    await waitFor(() => {
      expect(wrapper.text()).toContain('1/1')
    })

    // 数据库也应同步
    const tasks = await getAll('tasks')
    expect(tasks[0].done).toBe(true)
  })

  it('本周视图点击某天展开详情', async () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = formatDate(tomorrow)

    await save('tasks', {
      title: '明天任务', date: tomorrowStr, done: false, source: 'manual'
    })

    const wrapper = await mountPlan()
    // 切换到本周
    const weekBtn = wrapper.findAll('button').find(b => b.text().includes('本周'))
    await weekBtn.trigger('click')
    await flushPromises()

    // 点击明天那天
    const weekDays = wrapper.findAll('.week-day')
    expect(weekDays.length).toBe(7)
    // 找到有任务的那天（不是今天，今天为 0 项）
    const dayWithTask = weekDays.find(d => d.text().includes('1 项'))
    if (dayWithTask) {
      await dayWithTask.trigger('click')
      await flushPromises()
      await new Promise(r => setTimeout(r, 50))
      // 应显示详情
      await waitFor(() => {
        expect(wrapper.text()).toContain('明天任务')
      })
    }
  })
})
