import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { createPinia } from 'pinia'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import Home from '../views/Home.vue'
import Plan from '../views/Plan.vue'
import Game from '../views/Game.vue'
import DailyTip from '../components/DailyTip.vue'
import router from '../router/index.js'
import { initDB, closeDB } from '../db/init'
import { clear, save, getAll, query, get } from '../db/dao'
import { STORES } from '../utils/constants'
import { today, formatDate, getMondayOfWeek } from '../utils/date'
import { carryOverUnfinishedTasks, moveItemToDate, getWeekBoard } from '../db/aggr'
import { DAILY_TIPS, getDailyTip } from '../utils/tips'

/**
 * 阶段 25 测试：本轮 5 项优化
 * 1 首页直接添加任务 / 2 周看板拖拽与顺延 / 3 移除开发模块 / 4 每日全屏 tips / 5 抽卡小游戏
 */

const read = (rel) => readFileSync(resolve(process.cwd(), rel), 'utf-8')

function mockRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: Home },
      { path: '/plan', name: 'plan', component: Plan },
      { path: '/game', name: 'game', component: Game }
    ]
  })
}

async function mountView(comp) {
  const wrapper = mount(comp, {
    global: { plugins: [createPinia(), mockRouter()] }
  })
  await flushPromises()
  await new Promise(r => setTimeout(r, 50))
  await flushPromises()
  return wrapper
}
async function waitFor(fn, t = 2000) {
  return vi.waitFor(fn, { timeout: t, interval: 50 })
}

function tomorrowStr() {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return formatDate(d)
}

describe('本轮优化', () => {
  beforeEach(async () => {
    closeDB()
    await initDB()
    for (const s of STORES) await clear(s)
    localStorage.clear()
  })

  // ===== 需求 1：首页直接添加任务 =====
  describe('需求1：首页今日计划直接添加任务', () => {
    it('首页今日计划区有添加按钮与内嵌表单', async () => {
      const wrapper = await mountView(Home)
      const btn = wrapper.find('.today-plan__add-btn')
      expect(btn.exists()).toBe(true)
      expect(btn.text()).toContain('添加任务')
      expect(wrapper.find('.today-plan__form').exists()).toBe(false)

      await btn.trigger('click')
      expect(wrapper.find('.today-plan__form').exists()).toBe(true)
    })

    it('在首页保存任务后写入 tasks 并出现在今日列表', async () => {
      const wrapper = await mountView(Home)
      await wrapper.find('.today-plan__add-btn').trigger('click')

      const input = wrapper.find('.today-plan__form input.pixel-input')
      await input.setValue('首页快速任务')
      await wrapper.find('.today-plan__form-actions .pixel-btn--confirm').trigger('click')
      await flushPromises()
      await new Promise(r => setTimeout(r, 50))
      await flushPromises()

      const saved = await getAll('tasks')
      expect(saved).toHaveLength(1)
      expect(saved[0].title).toBe('首页快速任务')
      expect(saved[0].date).toBe(today())
      expect(saved[0].source).toBe('manual')

      await waitFor(() => {
        expect(wrapper.text()).toContain('首页快速任务')
      })
    })

    it('空标题不会保存', async () => {
      const wrapper = await mountView(Home)
      await wrapper.find('.today-plan__add-btn').trigger('click')
      await wrapper.find('.today-plan__form-actions .pixel-btn--confirm').trigger('click')
      await flushPromises()
      expect(await getAll('tasks')).toHaveLength(0)
    })
  })

  // ===== 需求 2：周看板拖拽 + 每日顺延 =====
  describe('需求2：计划页拖拽看板与未完成顺延', () => {
    it('Plan.vue 定义今日列与七天的拖放区域', () => {
      const f = read('src/views/Plan.vue')
      expect(f).toContain('data-drop-date')
      expect(f).toContain('day-column--over')
      expect(f).toContain('startDrag')
      expect(f).toContain('pointerdown')
      expect(f).toContain('pointermove')
      expect(f).toContain('moveItemToDate')
      expect(f).toContain('本周安排')
    })

    it('周看板返回周一至周日 7 天并带日期备注', async () => {
      const board = await getWeekBoard()
      expect(board).toHaveLength(7)
      expect(board[0].weekday).toBe(1)
      expect(board[6].weekday).toBe(7)
      const monday = formatDate(getMondayOfWeek())
      expect(board[0].date).toBe(monday)
      for (const day of board) {
        expect(day.label).toMatch(/^\d{1,2}\/\d{1,2}$/)
      }
    })

    it('手动任务可拖到任意一天（改期）', async () => {
      const t = await save('tasks', { title: '拖拽任务', date: today(), source: 'manual', done: false })
      const target = tomorrowStr()
      const ok = await moveItemToDate({ source: 'manual', sourceId: t.id }, target)
      expect(ok).toBe(true)
      const updated = await get('tasks', t.id)
      expect(updated.date).toBe(target)
    })

    it('自媒体任务拖动会修改发布日期', async () => {
      const m = await save('media', {
        title: '视频', status: 'scheduled', publishDate: today()
      })
      const target = tomorrowStr()
      const ok = await moveItemToDate({ source: 'media', sourceId: m.id }, target)
      expect(ok).toBe(true)
      const updated = await get('media', m.id)
      expect(updated.publishDate).toBe(target)
    })

    it('健身按星期排程，不可拖到其他日期', async () => {
      const f = await save('fitnessSchedule', { name: '跑步', weekday: 1 })
      const ok = await moveItemToDate({ source: 'fitness', sourceId: f.id }, tomorrowStr())
      expect(ok).toBe(false)
    })

    it('拖到其他日期后仍在周看板对应列显示', async () => {
      // 选一个本周内、但不是今天的日期，避免跨周边界
      const boardBefore = await getWeekBoard()
      const targetDay = boardBefore.find(d => d.date !== today())
      expect(targetDay).toBeDefined()

      const m = await save('media', { title: '本周视频', status: 'scheduled', publishDate: today() })
      await moveItemToDate({ source: 'media', sourceId: m.id }, targetDay.date)

      const board = await getWeekBoard()
      const day = board.find(d => d.date === targetDay.date)
      expect(day).toBeDefined()
      expect(day.items.some(i => i.title.includes('本周视频'))).toBe(true)
    })

    it('每日未完成的手动任务自动顺延到今天', async () => {
      await save('tasks', { title: '昨天没做完', date: '2020-01-01', source: 'manual', done: false })
      await save('tasks', { title: '昨天做完了', date: '2020-01-02', source: 'manual', done: true })

      const moved = await carryOverUnfinishedTasks()
      expect(moved).toBe(1)

      const pending = (await getAll('tasks')).find(t => t.title === '昨天没做完')
      const done = (await getAll('tasks')).find(t => t.title === '昨天做完了')
      expect(pending.date).toBe(today())
      expect(done.date).toBe('2020-01-02')
    })

    it('同一天只顺延一次', async () => {
      await save('tasks', { title: '待顺延', date: '2020-01-01', source: 'manual', done: false })
      await carryOverUnfinishedTasks()
      const again = await carryOverUnfinishedTasks()
      expect(again).toBe(0)
    })
  })

  // ===== 需求 3：移除开发模块 =====
  describe('需求3：移除开发模块', () => {
    it('路由中不再有开发相关路由', () => {
      const names = router.options.routes.map(r => r.name)
      expect(names).not.toContain('dev')
      expect(names).not.toContain('devDetail')
      expect(names).toContain('game')
    })

    it('侧边栏不再显示开发入口', async () => {
      const sidebar = read('src/components/PixelSidebar.vue')
      expect(sidebar).not.toContain('开发工作（AI）')
      expect(sidebar).toContain('抽卡小游戏')
    })

    it('首页摘要卡不再包含开发卡', async () => {
      const wrapper = await mountView(Home)
      await waitFor(() => {
        expect(wrapper.findAll('.summary-card')).toHaveLength(6)
      })
      expect(wrapper.text()).not.toContain('开发（AI）')
    })
  })

  // ===== 需求 4：每日全屏 tips =====
  describe('需求4：每日首次打开的全屏加油提示', () => {
    it('tips 库非空且同一天内容稳定', () => {
      expect(DAILY_TIPS.length).toBeGreaterThanOrEqual(20)
      expect(getDailyTip('2026-09-15')).toBe(getDailyTip('2026-09-15'))
      expect(getDailyTip('2026-09-16')).toBe(getDailyTip('2026-09-16'))
      expect(DAILY_TIPS).toContain(getDailyTip('2026-09-15'))
    })

    it('App.vue 全局挂载 DailyTip', () => {
      const app = read('src/App.vue')
      expect(app).toContain('DailyTip')
      expect(app).toContain('<DailyTip />')
    })

    it('每天首次打开显示全屏提示，2 秒后自动隐藏', async () => {
      vi.useFakeTimers()
      try {
        const wrapper = mount(DailyTip)
        await wrapper.vm.$nextTick()
        expect(wrapper.find('.daily-tip').exists()).toBe(true)
        expect(localStorage.getItem('pixel-dashboard:daily-tip-date')).toBe(today())
        expect(wrapper.text()).toContain('今日加油')

        vi.advanceTimersByTime(2000)
        await wrapper.vm.$nextTick()
        await wrapper.vm.$nextTick()
        expect(wrapper.find('.daily-tip').exists()).toBe(false)
      } finally {
        vi.useRealTimers()
      }
    })

    it('同一天再次打开不再显示', async () => {
      localStorage.setItem('pixel-dashboard:daily-tip-date', today())
      const wrapper = mount(DailyTip)
      await flushPromises()
      expect(wrapper.find('.daily-tip').exists()).toBe(false)
    })

    it('点击提示可立即关闭', async () => {
      const wrapper = mount(DailyTip)
      await wrapper.vm.$nextTick()
      await wrapper.find('.daily-tip').trigger('click')
      await flushPromises()
      await wrapper.vm.$nextTick()
      expect(wrapper.find('.daily-tip').exists()).toBe(false)
    })
  })

  // ===== 需求 5：抽卡小游戏 =====
  describe('需求5：54 张扑克随机抽卡', () => {
    it('初始牌堆为 54 张', async () => {
      const wrapper = await mountView(Game)
      expect(wrapper.find('.draw-game__stats').text()).toContain('剩余 54 张')
      expect(wrapper.find('.poker-card--back').exists()).toBe(true)
      expect(wrapper.find('.draw-game__draw-btn').text()).toContain('抽')
    })

    it('点击抽卡显示一张牌并减少牌堆', async () => {
      const wrapper = await mountView(Game)
      await wrapper.find('.draw-game__draw-btn').trigger('click')
      await flushPromises()

      expect(wrapper.find('.poker-card--back').exists()).toBe(false)
      expect(wrapper.find('.poker-card').exists()).toBe(true)
      expect(wrapper.find('.draw-game__stats').text()).toContain('剩余 53 张')
      expect(wrapper.find('.draw-game__stats').text()).toContain('已抽 1 次')
      expect(wrapper.findAll('.history-list__item')).toHaveLength(1)
    })

    it('连续抽完 54 张后自动重新洗牌', async () => {
      const wrapper = await mountView(Game)
      for (let i = 0; i < 54; i++) {
        await wrapper.find('.draw-game__draw-btn').trigger('click')
      }
      await flushPromises()
      expect(wrapper.find('.draw-game__stats').text()).toContain('已抽 54 次')
      expect(wrapper.findAll('.history-list__item').length).toBeLessThanOrEqual(8)
      // 第 55 次抽卡时牌堆重置
      await wrapper.find('.draw-game__draw-btn').trigger('click')
      await flushPromises()
      expect(wrapper.find('.draw-game__stats').text()).toContain('剩余 53 张')
    })

    it('重新洗牌清空历史', async () => {
      const wrapper = await mountView(Game)
      await wrapper.find('.draw-game__draw-btn').trigger('click')
      const resetBtn = wrapper.findAll('.draw-game__actions .pixel-btn')[1]
      await resetBtn.trigger('click')
      await flushPromises()
      expect(wrapper.find('.draw-game__stats').text()).toContain('剩余 54 张')
      expect(wrapper.find('.poker-card--back').exists()).toBe(true)
      expect(wrapper.findAll('.history-list__item')).toHaveLength(0)
    })

    it('游戏路由可访问', () => {
      const names = router.options.routes.map(r => r.name)
      expect(names).toContain('game')
      expect(read('src/views/Game.vue')).toContain('54')
    })
  })
})
