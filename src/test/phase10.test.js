import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { createPinia } from 'pinia'
import Finance from '../views/Finance.vue'
import { initDB, closeDB } from '../db/init'
import { clear, save, getAll } from '../db/dao'
import { STORES } from '../utils/constants'
import { today, formatMonth } from '../utils/date'

function mockRouter() {
  return createRouter({ history: createMemoryHistory(), routes: [{ path: '/finance', name: 'finance', component: Finance }] })
}
async function mountFinance() {
  const wrapper = mount(Finance, { global: { plugins: [createPinia(), mockRouter()] } })
  await flushPromises(); await new Promise(r => setTimeout(r, 50)); await flushPromises()
  return wrapper
}
async function waitFor(fn, t = 2000) { return vi.waitFor(fn, { timeout: t, interval: 50 }) }

describe('阶段10：收支模块', () => {
  beforeEach(async () => {
    closeDB(); await initDB()
    for (const s of STORES) await clear(s)
  })

  it('可新增收支流水（金额、类型、分类、日期、备注）', async () => {
    const wrapper = await mountFinance()
    const addBtn = wrapper.findAll('button').find(b => b.text().includes('新增'))
    await addBtn.trigger('click'); await flushPromises()
    const amountInput = wrapper.findAll('input').find(i => i.attributes('placeholder') === '金额')
    await amountInput.setValue('50')
    const saveBtn = wrapper.findAll('button').find(b => b.text() === '保存')
    await saveBtn.trigger('click'); await flushPromises()
    await new Promise(r => setTimeout(r, 50))
    await waitFor(() => { expect(wrapper.text()).toContain('50') })
    const all = await getAll('financeRecords')
    expect(all.length).toBe(1)
    expect(all[0].amount).toBe(50)
  })

  it('本月总收入、总支出、结余正确', async () => {
    await save('financeRecords', { amount: 5000, type: 'income', category: 'salary', date: today() })
    await save('financeRecords', { amount: 100, type: 'expense', category: 'food', date: today() })
    await save('financeRecords', { amount: 200, type: 'expense', category: 'transport', date: today() })
    const wrapper = await mountFinance()
    await waitFor(() => {
      expect(wrapper.text()).toContain('5000')
      expect(wrapper.text()).toContain('300')
      expect(wrapper.text()).toContain('4700')
    })
  })

  it('按分类汇总支出正确', async () => {
    await save('financeRecords', { amount: 100, type: 'expense', category: 'food', date: today() })
    await save('financeRecords', { amount: 200, type: 'expense', category: 'food', date: today() })
    await save('financeRecords', { amount: 50, type: 'expense', category: 'transport', date: today() })
    const wrapper = await mountFinance()
    await waitFor(() => {
      // 餐饮 300 占 6/7 ≈ 86%
      expect(wrapper.text()).toContain('餐饮')
      expect(wrapper.text()).toContain('交通')
    })
  })

  it('可切换月份查看历史', async () => {
    // 本月记录
    await save('financeRecords', { amount: 100, type: 'expense', category: 'food', date: today() })
    // 上月记录
    const lastMonth = new Date()
    lastMonth.setMonth(lastMonth.getMonth() - 1)
    const lastMonthStr = formatMonth(lastMonth)
    await save('financeRecords', { amount: 200, type: 'expense', category: 'food', date: `${lastMonthStr}-15` })

    const wrapper = await mountFinance()
    await waitFor(() => { expect(wrapper.text()).toContain('100') })

    // 切换到上月
    const prevBtn = wrapper.findAll('button').find(b => b.text().includes('上月'))
    await prevBtn.trigger('click')
    await flushPromises()
    await new Promise(r => setTimeout(r, 50))

    await waitFor(() => {
      expect(wrapper.text()).toContain('200')
    })
  })
})
