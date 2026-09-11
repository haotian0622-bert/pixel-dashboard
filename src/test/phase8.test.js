import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { createPinia } from 'pinia'
import Fitness from '../views/Fitness.vue'
import { initDB, closeDB } from '../db/init'
import { clear, save, getAll, query } from '../db/dao'
import { STORES } from '../utils/constants'
import { today, getWeekday } from '../utils/date'

function mockRouter() {
  return createRouter({ history: createMemoryHistory(), routes: [{ path: '/fitness', name: 'fitness', component: Fitness }] })
}
async function mountFitness() {
  const wrapper = mount(Fitness, { global: { plugins: [createPinia(), mockRouter()] } })
  await flushPromises(); await new Promise(r => setTimeout(r, 50)); await flushPromises()
  return wrapper
}
async function waitFor(fn, t = 2000) { return vi.waitFor(fn, { timeout: t, interval: 50 }) }

describe('阶段8：健身计划模块', () => {
  beforeEach(async () => {
    closeDB(); await initDB()
    for (const s of STORES) await clear(s)
  })

  it('可编辑周一到周日的训练排程', async () => {
    const wrapper = await mountFitness()
    // 点击今天的 + 添加
    const day = getWeekday()
    const dayEl = wrapper.findAll('.fitness__day').find(d => d.text().includes(`周${['一','二','三','四','五','六','日'][day-1]}`))
    const addBtn = dayEl.find('button')
    await addBtn.trigger('click'); await flushPromises()

    // 输入训练名称
    const nameInput = wrapper.findAll('input').find(i => i.attributes('placeholder')?.includes('训练名称'))
    await nameInput.setValue('胸+三头')
    const saveBtn = wrapper.findAll('button').find(b => b.text() === '保存')
    await saveBtn.trigger('click'); await flushPromises()
    await new Promise(r => setTimeout(r, 50))

    await waitFor(() => { expect(wrapper.text()).toContain('胸+三头') })
    const all = await getAll('fitnessSchedule')
    expect(all.length).toBe(1)
    expect(all[0].weekday).toBe(day)
  })

  it('今日训练出现在今日计划', async () => {
    await save('fitnessSchedule', { weekday: getWeekday(), name: '腿+核心', exercises: [] })
    const { getTodayItems } = await import('../db/aggr')
    const items = await getTodayItems()
    const fitnessItems = items.filter(i => i.source === 'fitness')
    expect(fitnessItems.length).toBe(1)
    expect(fitnessItems[0].title).toContain('腿+核心')
  })

  it('可打卡', async () => {
    const wrapper = await mountFitness()
    await waitFor(() => {
      const btn = wrapper.findAll('button').find(b => b.text().includes('点击打卡'))
      expect(btn).toBeDefined()
    })
    const checkinBtn = wrapper.findAll('button').find(b => b.text().includes('点击打卡'))
    await checkinBtn.trigger('click')
    await flushPromises()
    await new Promise(r => setTimeout(r, 50))

    const logs = await getAll('fitnessLogs')
    expect(logs.length).toBe(1)
    expect(logs[0].date).toBe(today())
    expect(logs[0].done).toBe(true)
  })

  it('可记录身体数据', async () => {
    const wrapper = await mountFitness()
    const inputs = wrapper.findAll('input')
    const weightInput = inputs.find(i => i.attributes('placeholder')?.includes('体重'))
    await weightInput.setValue('70')
    const recordBtn = wrapper.findAll('button').find(b => b.text() === '记录')
    await recordBtn.trigger('click')
    await flushPromises()
    await new Promise(r => setTimeout(r, 50))

    const body = await getAll('fitnessBody')
    expect(body.length).toBe(1)
    expect(body[0].weight).toBe(70)
  })

  it('可查看历史打卡和身体数据列表', async () => {
    await save('fitnessLogs', { date: today(), done: true })
    await save('fitnessBody', { date: today(), weight: 68 })
    await save('fitnessBody', { date: '2026-09-01', weight: 69 })
    const wrapper = await mountFitness()
    await waitFor(() => {
      const bodyItems = wrapper.findAll('.fitness__body-item')
      expect(bodyItems.length).toBe(2)
    })
    // 按日期倒序，今天应在前面
    const bodyItems = wrapper.findAll('.fitness__body-item')
    expect(bodyItems[0].text()).toContain('68')
  })
})
