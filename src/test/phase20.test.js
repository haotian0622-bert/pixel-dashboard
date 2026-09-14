import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { createPinia } from 'pinia'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import PixelChart from '../components/PixelChart.vue'
import Media from '../views/Media.vue'
import { initDB, closeDB } from '../db/init'
import { clear, save, getAll } from '../db/dao'
import { STORES, MEDIA_METRIC, MEDIA_METRIC_LABELS } from '../utils/constants'
import {
  formatStat,
  latestStats,
  upsertStats,
  buildBarData,
  buildLineSeries,
  niceMax
} from '../utils/stats'

/**
 * 阶段 20 测试：问题7 - 自媒体发布后视频数据统计可视化图表
 */

describe('问题7：视频数据统计图表', () => {
  describe('constants.js 指标枚举', () => {
    it('定义 MEDIA_METRIC 4 个指标', () => {
      expect(MEDIA_METRIC.VIEWS).toBe('views')
      expect(MEDIA_METRIC.LIKES).toBe('likes')
      expect(MEDIA_METRIC.COMMENTS).toBe('comments')
      expect(MEDIA_METRIC.SHARES).toBe('shares')
    })
    it('定义 MEDIA_METRIC_LABELS 中文标签', () => {
      expect(MEDIA_METRIC_LABELS.views).toBe('播放量')
      expect(MEDIA_METRIC_LABELS.likes).toBe('点赞')
      expect(MEDIA_METRIC_LABELS.comments).toBe('评论')
      expect(MEDIA_METRIC_LABELS.shares).toBe('转发')
    })
  })

  describe('stats.js 纯函数', () => {
    it('formatStat 大数字简写', () => {
      expect(formatStat(0)).toBe('0')
      expect(formatStat(999)).toBe('999')
      expect(formatStat(1000)).toBe('1k')
      expect(formatStat(1200)).toBe('1.2k')
      expect(formatStat(10000)).toBe('1万')
      expect(formatStat(12345)).toBe('1.2万')
      expect(formatStat(null)).toBe('0')
      expect(formatStat('abc')).toBe('0')
    })

    it('latestStats 取日期最新一条快照', () => {
      const item = {
        stats: [
          { date: '2026-09-01', views: 100 },
          { date: '2026-09-08', views: 500 },
          { date: '2026-09-05', views: 300 }
        ]
      }
      expect(latestStats(item).views).toBe(500)
      expect(latestStats({ stats: [] })).toBeNull()
      expect(latestStats({})).toBeNull()
      expect(latestStats(null)).toBeNull()
    })

    it('upsertStats 追加新日期快照并按日期升序', () => {
      const out = upsertStats(
        [{ date: '2026-09-05', views: 300, likes: 0, comments: 0, shares: 0 }],
        { date: '2026-09-01', views: 100, likes: 10, comments: 2, shares: 1 }
      )
      expect(out).toHaveLength(2)
      expect(out[0].date).toBe('2026-09-01')
      expect(out[1].date).toBe('2026-09-05')
    })

    it('upsertStats 同日期覆盖（不是追加）', () => {
      const out = upsertStats(
        [{ date: '2026-09-05', views: 300, likes: 0, comments: 0, shares: 0 }],
        { date: '2026-09-05', views: 800, likes: 66, comments: 8, shares: 3 }
      )
      expect(out).toHaveLength(1)
      expect(out[0].views).toBe(800)
      expect(out[0].likes).toBe(66)
    })

    it('upsertStats 非数字输入归一化为 0，无 stats 也能用', () => {
      const out = upsertStats(undefined, { date: '2026-09-05', views: '', likes: null })
      expect(out[0].views).toBe(0)
      expect(out[0].likes).toBe(0)
    })

    it('buildBarData 每个有快照的视频取最新值', () => {
      const items = [
        { title: 'A', stats: [{ date: '2026-09-01', views: 100 }, { date: '2026-09-08', views: 900 }] },
        { title: 'B', stats: [{ date: '2026-09-08', views: 200 }] },
        { title: 'C' }
      ]
      const data = buildBarData(items, 'views')
      expect(data).toHaveLength(2)
      expect(data[0]).toEqual({ name: 'A', value: 900 })
      expect(data[1]).toEqual({ name: 'B', value: 200 })
    })

    it('buildLineSeries 日期取并集，缺失日期为 null（断线）', () => {
      const items = [
        { title: 'A', stats: [{ date: '2026-09-01', views: 100 }, { date: '2026-09-08', views: 900 }] },
        { title: 'B', stats: [{ date: '2026-09-08', views: 200 }] }
      ]
      const series = buildLineSeries(items, 'views')
      expect(series).toHaveLength(2)
      expect(series[0].points.map(p => p.label)).toEqual(['2026-09-01', '2026-09-08'])
      expect(series[0].points.map(p => p.value)).toEqual([100, 900])
      // B 在 09-01 无数据 → null，09-08 有值
      expect(series[1].points[0].value).toBeNull()
      expect(series[1].points[1].value).toBe(200)
    })

    it('niceMax 取好看的 y 轴上限', () => {
      expect(niceMax(0)).toBe(1)
      expect(niceMax(1)).toBe(1)
      expect(niceMax(15)).toBe(20)
      expect(niceMax(120)).toBe(200)
      expect(niceMax(5000)).toBe(5000)
      expect(niceMax(5001)).toBe(10000)
    })
  })

  describe('PixelChart 组件', () => {
    it('柱状图：每个数据点渲染一根柱子', () => {
      const wrapper = mount(PixelChart, {
        props: {
          type: 'bar',
          series: [{ name: '对比', points: [{ label: 'A', value: 100 }, { label: 'B', value: 200 }] }]
        }
      })
      expect(wrapper.findAll('rect')).toHaveLength(2)
      expect(wrapper.find('svg').exists()).toBe(true)
      expect(wrapper.text()).toContain('A')
    })

    it('折线图：每条序列渲染 polyline + 方块数据点', () => {
      const wrapper = mount(PixelChart, {
        props: {
          type: 'line',
          series: [
            { name: 'A', points: [{ label: '09-01', value: 100 }, { label: '09-08', value: 300 }] },
            { name: 'B', points: [{ label: '09-01', value: 50 }, { label: '09-08', value: 80 }] }
          ]
        }
      })
      expect(wrapper.findAll('polyline')).toHaveLength(2)
      expect(wrapper.findAll('rect')).toHaveLength(4)
      // 图例显示两个视频名
      expect(wrapper.text()).toContain('A')
      expect(wrapper.text()).toContain('B')
    })

    it('折线图：null 数据点断线成两段', () => {
      const wrapper = mount(PixelChart, {
        props: {
          type: 'line',
          series: [{
            name: 'A',
            points: [
              { label: 'd1', value: 100 },
              { label: 'd2', value: null },
              { label: 'd3', value: 200 }
            ]
          }]
        }
      })
      expect(wrapper.findAll('polyline')).toHaveLength(2)
      // 只有两个非空数据点画方块
      expect(wrapper.findAll('rect')).toHaveLength(2)
    })

    it('空数据显示占位提示，不渲染 svg', () => {
      const wrapper = mount(PixelChart, { props: { type: 'bar', series: [] } })
      expect(wrapper.find('svg').exists()).toBe(false)
      expect(wrapper.find('.pixel-chart__empty').exists()).toBe(true)
    })

    it('大数字在柱顶按简写显示', () => {
      const wrapper = mount(PixelChart, {
        props: {
          type: 'bar',
          series: [{ name: '对比', points: [{ label: '爆款', value: 12000 }] }]
        }
      })
      expect(wrapper.text()).toContain('1.2万')
    })
  })

  describe('Media.vue 数据看板集成', () => {
    beforeEach(async () => {
      closeDB()
      await initDB()
      for (const s of STORES) await clear(s)
    })

    function mockRouter() {
      return createRouter({
        history: createMemoryHistory(),
        routes: [{ path: '/media', name: 'media', component: Media }]
      })
    }
    async function mountMedia() {
      const wrapper = mount(Media, { global: { plugins: [createPinia(), mockRouter()] } })
      await flushPromises()
      await new Promise(r => setTimeout(r, 50))
      await flushPromises()
      return wrapper
    }
    async function waitFor(fn, t = 2000) {
      return vi.waitFor(fn, { timeout: t, interval: 50 })
    }
    async function openPanel(wrapper) {
      const toggle = wrapper.findAll('button').find(b => b.text().includes('数据看板'))
      await toggle.trigger('click')
      await flushPromises()
    }

    it('源码接入 PixelChart 与指标切换/快照保存', () => {
      const f = readFileSync(resolve(process.cwd(), 'src/views/Media.vue'), 'utf-8')
      expect(f).toContain('PixelChart')
      expect(f).toContain('media__stats-panel')
      expect(f).toContain('media__metric-btn')
      expect(f).toContain('upsertStats')
      expect(f).toContain('saveStats')
      expect(f).toContain('media-card__stat-form')
    })

    it('带 stats 的记录：看板展示图例、柱顶数值，卡片显示最新摘要', async () => {
      await save('media', {
        title: '爆款视频',
        category: 'published',
        status: 'published',
        stats: [
          { date: '2026-09-01', views: 1000, likes: 100, comments: 10, shares: 5 },
          { date: '2026-09-08', views: 5000, likes: 400, comments: 40, shares: 20 }
        ]
      })
      const wrapper = await mountMedia()
      await openPanel(wrapper)

      // 折线图图例含视频名
      expect(wrapper.find('.pixel-chart__legend').text()).toContain('爆款视频')
      // 柱状图取最新值 5000 → 5k
      expect(wrapper.find('.media__chart--bar').text()).toContain('5k')
      // 卡片摘要：播放 + 点赞
      expect(wrapper.text()).toContain('▶5k')
      expect(wrapper.text()).toContain('♥400')
      // 折线图有 1 条线、2 个数据点
      expect(wrapper.findAll('polyline')).toHaveLength(1)
      expect(wrapper.findAll('.media__chart--line rect')).toHaveLength(2)
    })

    it('通过卡片「数据」按钮录入快照并持久化到 media 记录', async () => {
      await save('media', { title: '新视频', category: 'published', status: 'published' })
      const wrapper = await mountMedia()
      await waitFor(() => { expect(wrapper.text()).toContain('新视频') })

      const dataBtn = wrapper.findAll('button').find(b => b.text() === '数据')
      await dataBtn.trigger('click')
      await flushPromises()

      const dateInput = wrapper.find('.media-card__stat-form input[type="date"]')
      await dateInput.setValue('2026-09-14')
      const viewsInput = wrapper.find('.media-card__stat-form input[placeholder="播放量"]')
      await viewsInput.setValue('1200')
      const likesInput = wrapper.find('.media-card__stat-form input[placeholder="点赞"]')
      await likesInput.setValue('88')

      const saveDataBtn = wrapper.findAll('button').find(b => b.text() === '保存数据')
      await saveDataBtn.trigger('click')
      await flushPromises()
      await new Promise(r => setTimeout(r, 50))

      const all = await getAll('media')
      expect(all).toHaveLength(1)
      expect(all[0].stats).toHaveLength(1)
      expect(all[0].stats[0].date).toBe('2026-09-14')
      expect(all[0].stats[0].views).toBe(1200)
      expect(all[0].stats[0].likes).toBe(88)
      // 卡片出现最新数据摘要
      expect(wrapper.text()).toContain('▶1.2k')
    })

    it('切换指标按钮后图表换成对应数据', async () => {
      await save('media', {
        title: '指标视频',
        category: 'published',
        status: 'published',
        stats: [{ date: '2026-09-08', views: 1000, likes: 250, comments: 30, shares: 8 }]
      })
      const wrapper = await mountMedia()
      await openPanel(wrapper)
      // 默认播放量：柱顶 1k
      expect(wrapper.find('.media__chart--bar').text()).toContain('1k')

      const likesBtn = wrapper.findAll('.media__metric-btn').find(b => b.text() === '点赞')
      await likesBtn.trigger('click')
      await flushPromises()
      // 切换后柱顶为点赞数 250
      expect(wrapper.find('.media__chart--bar').text()).toContain('250')
      expect(wrapper.find('.media__chart--bar').text()).not.toContain('1k')
    })

    it('无任何快照时看板显示空状态提示', async () => {
      await save('media', { title: '没数据的视频', category: 'idea', status: 'idea' })
      const wrapper = await mountMedia()
      await openPanel(wrapper)
      expect(wrapper.findAll('.pixel-chart__empty')).toHaveLength(2)
      expect(wrapper.find('svg').exists()).toBe(false)
    })
  })
})
