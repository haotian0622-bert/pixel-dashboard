import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { createPinia } from 'pinia'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import Home from '../views/Home.vue'
import { initDB, closeDB } from '../db/init'
import { clear, save } from '../db/dao'
import { STORES } from '../utils/constants'
import { today } from '../utils/date'

/**
 * 阶段 21 测试：问题8 - 首页模块摘要卡放大、多呈现内容
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
  const wrapper = mount(Home, { global: { plugins: [createPinia(), mockRouter()] } })
  await flushPromises()
  await new Promise(r => setTimeout(r, 50))
  await flushPromises()
  return wrapper
}
async function waitFor(fn, t = 2000) {
  return vi.waitFor(fn, { timeout: t, interval: 50 })
}

// 在卡片数组中按标题找卡
function cardByLabel(wrapper, label) {
  return wrapper.findAll('.summary-card').find(c =>
    c.find('.summary-card__header').text() === label
  )
}

describe('问题8：首页摘要卡放大、多呈现内容', () => {
  beforeEach(async () => {
    closeDB()
    await initDB()
    for (const s of STORES) await clear(s)
  })

  describe('卡片放大（CSS）', () => {
    let f
    beforeEach(() => { f = readFileSync(resolve(process.cwd(), 'src/views/Home.vue'), 'utf-8') })

    it('摘要网格最小列宽放大到 220px 以上（原 180px）', () => {
      const m = f.match(/\.summary-grid\s*{[^}]*minmax\(\s*(\d+)px/)
      expect(m).not.toBeNull()
      expect(Number(m[1])).toBeGreaterThanOrEqual(220)
    })

    it('摘要数字字号放大到 1.6rem 以上（原 1.5rem）', () => {
      const m = f.match(/\.summary-card__number\s*{[^}]*font-size:\s*([\d.]+)rem/)
      expect(m).not.toBeNull()
      expect(Number(m[1])).toBeGreaterThanOrEqual(1.6)
    })

    it('卡片标题与内边距放大', () => {
      const h = f.match(/\.summary-card__header\s*{[^}]*font-size:\s*([\d.]+)rem/)
      expect(Number(h[1])).toBeGreaterThanOrEqual(1.1)
      const b = f.match(/\.summary-card__body\s*{[^}]*padding:\s*([\d.]+)rem/)
      expect(Number(b[1])).toBeGreaterThanOrEqual(0.8)
    })

    it('窄屏仍退化为单列（响应式不破坏）', () => {
      expect(f).toContain('@media (max-width: 768px)')
      expect(f).toMatch(/@media[\s\S]*?\.summary-grid[\s\S]*?grid-template-columns:\s*1fr/)
    })
  })

  describe('卡片明细行（多呈现内容）', () => {
    beforeEach(async () => {
      await save('tasks', { title: '任务1', date: today(), done: false, source: 'manual' })
      await save('tasks', { title: '任务2', date: today(), done: true, source: 'manual' })
      await save('media', { title: '本周视频', status: 'scheduled', publishDate: today() })
      await save('devProjects', { name: 'AI项目', status: 'active' })
      await save('companyItems', { title: '重要会议', category: 'meeting', deadline: today(), status: 'todo' })
      await save('fitnessLogs', { date: today(), done: true })
      await save('studyTopics', { name: 'AI学习', status: 'active' })
      await save('financeRecords', { amount: 100, type: 'expense', date: today() })
      await save('financeRecords', { amount: 5000, type: 'income', date: today() })
    })

    it('每张卡都带明细容器，6 张卡数量不变', async () => {
      const wrapper = await mountHome()
      await waitFor(() => { expect(wrapper.findAll('.summary-card')).toHaveLength(6) })
      expect(wrapper.findAll('.summary-card__lines').length).toBeGreaterThanOrEqual(5)
    })

    it('计划卡：列出未完成任务标题，不包含已完成', async () => {
      const wrapper = await mountHome()
      const card = await waitFor(() => {
        const c = cardByLabel(wrapper, '计划')
        if (!c) throw new Error('no card')
        return c
      })
      const lines = card.findAll('.summary-card__line').map(l => l.text())
      expect(lines.some(l => l.includes('任务1'))).toBe(true)
      expect(lines.some(l => l.includes('任务2'))).toBe(false)
    })

    it('自媒体卡：列出本周待发布视频与日期', async () => {
      const wrapper = await mountHome()
      const card = await waitFor(() => cardByLabel(wrapper, '自媒体'))
      const text = card.text()
      expect(text).toContain('本周视频')
      expect(text).toContain(today().slice(5))
    })

    it('开发卡已移除，不再出现开发（AI）入口', async () => {
      const wrapper = await mountHome()
      await waitFor(() => { expect(wrapper.findAll('.summary-card').length).toBeGreaterThan(0) })
      const devCard = cardByLabel(wrapper, '开发（AI）')
      expect(devCard === undefined || devCard === null).toBe(true)
    })

    it('公司卡：列出本周截止事项与日期', async () => {
      const wrapper = await mountHome()
      const card = await waitFor(() => cardByLabel(wrapper, '公司'))
      expect(card.text()).toContain('重要会议')
      expect(card.text()).toContain(today().slice(5))
    })

    it('健身卡：显示本周打卡日期', async () => {
      const wrapper = await mountHome()
      const card = await waitFor(() => cardByLabel(wrapper, '健身'))
      expect(card.text()).toContain('打卡')
      expect(card.text()).toContain(today().slice(5))
    })

    it('学习卡：列出进行中主题名', async () => {
      const wrapper = await mountHome()
      const card = await waitFor(() => cardByLabel(wrapper, '学习'))
      expect(card.text()).toContain('AI学习')
    })

    it('收支卡：显示净额与本月笔数', async () => {
      const wrapper = await mountHome()
      const card = await waitFor(() => cardByLabel(wrapper, '收支'))
      const text = card.text()
      expect(text).toContain('净 ¥4900')
      expect(text).toContain('本月 2 笔')
      // 原有主指标保留
      expect(text).toContain('¥100')
    })
  })

  describe('明细行规则', () => {
    it('明细最多显示 2 行', async () => {
      await save('tasks', { title: '任务A', date: today(), done: false, source: 'manual' })
      await save('tasks', { title: '任务B', date: today(), done: false, source: 'manual' })
      await save('tasks', { title: '任务C', date: today(), done: false, source: 'manual' })
      const wrapper = await mountHome()
      const card = await waitFor(() => cardByLabel(wrapper, '计划'))
      expect(card.findAll('.summary-card__line')).toHaveLength(2)
    })

    it('今日任务全部完成时给出完成提示', async () => {
      await save('tasks', { title: '搞定它', date: today(), done: true, source: 'manual' })
      const wrapper = await mountHome()
      const card = await waitFor(() => cardByLabel(wrapper, '计划'))
      expect(card.text()).toContain('全部完成')
    })

    it('超长标题截断并加省略号', async () => {
      await save('tasks', { title: '一二三四五六七八九十一二三四', date: today(), done: false, source: 'manual' })
      const wrapper = await mountHome()
      const card = await waitFor(() => cardByLabel(wrapper, '计划'))
      const line = card.find('.summary-card__line').text()
      expect(line).toContain('…')
      expect(line).not.toContain('十一二三四')
    })

    it('无待办/无数据的卡不报错（空库渲染）', async () => {
      const wrapper = await mountHome()
      await waitFor(() => { expect(wrapper.findAll('.summary-card')).toHaveLength(6) })
      // 计划卡 0/0，无明细行
      const planCard = cardByLabel(wrapper, '计划')
      expect(planCard.find('.summary-card__lines').exists()).toBe(false)
      // 收支净额为 0、笔数 0
      expect(cardByLabel(wrapper, '收支').text()).toContain('本月 0 笔')
    })
  })
})
