import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { createPinia } from 'pinia'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import PixelCalendar from '../components/PixelCalendar.vue'
import Fitness from '../views/Fitness.vue'
import Finance from '../views/Finance.vue'
import { initDB, closeDB } from '../db/init'
import { clear, save, getAll } from '../db/dao'
import { STORES } from '../utils/constants'
import { today, formatMonth, formatDate } from '../utils/date'

/**
 * 阶段 23 测试：问题10 - 健身（生活）与收支以月历形式交互
 */

function routerFor(path, comp) {
  return createRouter({ history: createMemoryHistory(), routes: [{ path, component: comp }] })
}
async function mountView(comp, path) {
  const wrapper = mount(comp, { global: { plugins: [createPinia(), routerFor(path, comp)] } })
  await flushPromises(); await new Promise(r => setTimeout(r, 50)); await flushPromises()
  return wrapper
}
async function waitFor(fn, t = 2000) { return vi.waitFor(fn, { timeout: t, interval: 50 }) }
const read = (rel) => readFileSync(resolve(process.cwd(), rel), 'utf-8')
const cell = (wrapper, date) =>
  wrapper.findAll('.pixel-cal__cell').find(c => c.attributes('data-date') === date)

describe('问题10：PixelCalendar 月历组件', () => {
  it('渲染周一开头的 42 格与月份标题', () => {
    const wrapper = mount(PixelCalendar, { props: { year: 2026, month: 8, modelValue: '' } })
    expect(wrapper.find('.pixel-cal__title').text()).toBe('2026年9月')
    expect(wrapper.findAll('.pixel-cal__weekday').map(w => w.text())).toEqual(['一', '二', '三', '四', '五', '六', '日'])
    expect(wrapper.findAll('.pixel-cal__cell')).toHaveLength(42)
    // 2026-09-01 是周二，第一行第二格
    expect(cell(wrapper, '2026-09-01').find('.pixel-cal__num').text()).toBe('1')
    // 8 月日期为非本月格
    expect(cell(wrapper, '2026-08-31').classes()).toContain('pixel-cal__cell--out')
  })

  it('点击日期格子触发 select / update:modelValue', async () => {
    const wrapper = mount(PixelCalendar, { props: { year: 2026, month: 8, modelValue: '' } })
    await cell(wrapper, '2026-09-15').trigger('click')
    expect(wrapper.emitted('select')[0]).toEqual(['2026-09-15'])
    expect(wrapper.emitted('update:modelValue')[0]).toEqual(['2026-09-15'])
  })

  it('选中日高亮、prev/next 事件触发、marks 渲染', async () => {
    const wrapper = mount(PixelCalendar, {
      props: {
        year: 2026, month: 8, modelValue: '2026-09-15',
        marks: { '2026-09-15': { cls: 'pixel-cal__cell--mark-green', dots: ['done'], text: '70kg' } }
      }
    })
    expect(cell(wrapper, '2026-09-15').classes()).toContain('pixel-cal__cell--selected')
    expect(cell(wrapper, '2026-09-15').classes()).toContain('pixel-cal__cell--mark-green')
    expect(cell(wrapper, '2026-09-15').find('.pixel-cal__dot--done').exists()).toBe(true)
    expect(cell(wrapper, '2026-09-15').find('.pixel-cal__text').text()).toBe('70kg')

    await wrapper.findAll('.pixel-cal__nav')[0].trigger('click')
    expect(wrapper.emitted('prev')).toBeDefined()
    await wrapper.findAll('.pixel-cal__nav')[1].trigger('click')
    expect(wrapper.emitted('next')).toBeDefined()
  })
})

describe('问题10：健身打卡日历', () => {
  beforeEach(async () => {
    closeDB(); await initDB()
    for (const s of STORES) await clear(s)
  })

  it('源码：引入 PixelCalendar 且支持取消打卡', () => {
    const f = read('src/views/Fitness.vue')
    expect(f).toContain('PixelCalendar')
    expect(f).toContain('打卡日历')
    expect(f).toContain('toggleCheckin')
    expect(f).toMatch(/remove\('fitnessLogs'/)
    expect(f).toContain('fitMarks')
  })

  it('在日历上给任意日期打卡并可取消', async () => {
    const wrapper = await mountView(Fitness, '/fitness')
    // 初始选中今天，面板显示“打卡”按钮
    const panelBtn = wrapper.find('.fitness__day-detail-head button')
    expect(panelBtn.text()).toBe('打卡')

    // 选一个本月其他日期
    const base = new Date()
    const other = new Date(base.getFullYear(), base.getMonth(), base.getDate() === 15 ? 16 : 15)
    const otherStr = formatDate(other)
    await cell(wrapper, otherStr).trigger('click')
    await flushPromises()

    await wrapper.find('.fitness__day-detail-head button').trigger('click')
    await flushPromises(); await new Promise(r => setTimeout(r, 50))

    const logs = await getAll('fitnessLogs')
    expect(logs).toHaveLength(1)
    expect(logs[0]).toMatchObject({ date: otherStr, done: true })

    // 格子出现绿色打卡标记
    await waitFor(() => {
      expect(cell(wrapper, otherStr).classes()).toContain('pixel-cal__cell--mark-green')
    })

    // 按钮变“取消打卡”，再点删除
    const cancelBtn = wrapper.find('.fitness__day-detail-head button')
    expect(cancelBtn.text()).toBe('取消打卡')
    await cancelBtn.trigger('click')
    await flushPromises(); await new Promise(r => setTimeout(r, 50))
    expect(await getAll('fitnessLogs')).toHaveLength(0)
  })

  it('打卡日与体重在月历上标记显示', async () => {
    await save('fitnessLogs', { date: today(), done: true })
    await save('fitnessBody', { date: today(), weight: 70, bodyFat: 18 })
    const wrapper = await mountView(Fitness, '/fitness')

    await waitFor(() => {
      expect(cell(wrapper, today()).classes()).toContain('pixel-cal__cell--mark-green')
    })
    expect(cell(wrapper, today()).find('.pixel-cal__dot--done').exists()).toBe(true)
    expect(cell(wrapper, today()).find('.pixel-cal__text').text()).toBe('70kg')
    // 当日详情显示身体数据
    expect(wrapper.find('.fitness__day-body').text()).toContain('70kg')
    expect(wrapper.find('.fitness__day-body').text()).toContain('18%')
  })

  it('可切换月份查看历史打卡', async () => {
    const d = new Date(); d.setMonth(d.getMonth() - 1)
    const past = formatDate(new Date(d.getFullYear(), d.getMonth(), 10))
    await save('fitnessLogs', { date: past, done: true })

    const wrapper = await mountView(Fitness, '/fitness')
    const nav = wrapper.findAll('.pixel-cal__nav')[0]
    await nav.trigger('click'); await flushPromises(); await new Promise(r => setTimeout(r, 50))

    expect(wrapper.find('.pixel-cal__title').text()).toContain(`${d.getFullYear()}年${d.getMonth() + 1}月`)
    await waitFor(() => {
      expect(cell(wrapper, past).classes()).toContain('pixel-cal__cell--mark-green')
    })
  })
})

describe('问题10：收支月历', () => {
  beforeEach(async () => {
    closeDB(); await initDB()
    for (const s of STORES) await clear(s)
  })

  it('源码：引入 PixelCalendar、当日流水与日标记', () => {
    const f = read('src/views/Finance.vue')
    expect(f).toContain('PixelCalendar')
    expect(f).toContain('dayMarks')
    expect(f).toContain('dayRecords')
    expect(f).toContain('当日流水')
  })

  it('日历格按当日收支显示净额颜色与红绿圆点', async () => {
    await save('financeRecords', { amount: 100, type: 'expense', category: 'food', date: today() })
    await save('financeRecords', { amount: 500, type: 'income', category: 'salary', date: today() })
    const wrapper = await mountView(Finance, '/finance')

    await waitFor(() => {
      const c = cell(wrapper, today())
      expect(c.exists()).toBe(true)
      expect(c.find('.pixel-cal__text').text()).toBe('+400')
    })
    const c = cell(wrapper, today())
    expect(c.classes()).toContain('pixel-cal__cell--mark-green')
    expect(c.find('.pixel-cal__dot--income').exists()).toBe(true)
    expect(c.find('.pixel-cal__dot--expense').exists()).toBe(true)
  })

  it('点击日期格子，当日面板只显示该日流水', async () => {
    const base = new Date()
    const d1 = formatDate(new Date(base.getFullYear(), base.getMonth(), 5))
    const d2 = formatDate(new Date(base.getFullYear(), base.getMonth(), 6))
    await save('financeRecords', { amount: 88, type: 'expense', category: 'food', date: d1, note: '午餐' })
    await save('financeRecords', { amount: 99, type: 'expense', category: 'food', date: d2, note: '晚餐' })

    const wrapper = await mountView(Finance, '/finance')
    await cell(wrapper, d1).trigger('click')
    await flushPromises()

    const dayPanel = wrapper.find('.finance__day')
    expect(dayPanel.text()).toContain(d1)
    expect(dayPanel.text()).toContain('88')
    expect(dayPanel.text()).not.toContain('99')
  })

  it('“记一笔”表单日期自动取选中日，保存后写入该日', async () => {
    const wrapper = await mountView(Finance, '/finance')
    const base = new Date()
    const d = formatDate(new Date(base.getFullYear(), base.getMonth(), 12))
    await cell(wrapper, d).trigger('click')
    await flushPromises()

    await wrapper.find('.finance__day-add').trigger('click')
    await flushPromises()
    const dateInput = wrapper.find('.finance__form input[type="date"]')
    expect(dateInput.element.value).toBe(d)

    await wrapper.findAll('.finance__form input').find(i => i.attributes('placeholder') === '金额').setValue('66')
    await wrapper.findAll('.finance__form button').find(b => b.text() === '保存').trigger('click')
    await flushPromises(); await new Promise(r => setTimeout(r, 50))

    const all = await getAll('financeRecords')
    expect(all).toHaveLength(1)
    expect(all[0]).toMatchObject({ amount: 66, date: d })
  })

  it('当日面板可删除流水', async () => {
    await save('financeRecords', { amount: 30, type: 'expense', category: 'food', date: today() })
    const wrapper = await mountView(Finance, '/finance')
    await waitFor(() => { expect(wrapper.find('.finance__day .record-list__item').exists()).toBe(true) })

    await wrapper.find('.finance__day .pixel-btn--cancel').trigger('click')
    await flushPromises(); await new Promise(r => setTimeout(r, 50))
    expect(await getAll('financeRecords')).toHaveLength(0)
    expect(wrapper.find('.finance__day').text()).toContain('当日暂无记录')
  })

  it('月历随月份切换（组件内上月按钮）', async () => {
    const d = new Date(); d.setMonth(d.getMonth() - 1)
    const past = formatDate(new Date(d.getFullYear(), d.getMonth(), 20))
    await save('financeRecords', { amount: 123, type: 'expense', category: 'food', date: past })

    const wrapper = await mountView(Finance, '/finance')
    await wrapper.findAll('.pixel-cal__nav')[0].trigger('click')
    await flushPromises(); await new Promise(r => setTimeout(r, 50))

    await waitFor(() => {
      expect(cell(wrapper, past).find('.pixel-cal__text').text()).toBe('-123')
    })
    expect(cell(wrapper, past).classes()).toContain('pixel-cal__cell--mark-red')
  })
})
