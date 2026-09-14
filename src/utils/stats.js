/**
 * 视频发布后数据统计 —— 纯函数工具
 * 每条 media 记录可携带多条按日期记录的数据快照：
 * stats: [{ date: 'YYYY-MM-DD', views, likes, comments, shares }]
 */
import { MEDIA_METRIC } from './constants'

export const MEDIA_METRIC_KEYS = [
  MEDIA_METRIC.VIEWS,
  MEDIA_METRIC.LIKES,
  MEDIA_METRIC.COMMENTS,
  MEDIA_METRIC.SHARES
]

/** 保留 1 位小数并去掉多余的 0 */
function trimNum(n) {
  return String(Math.round(n * 10) / 10)
}

/** 大数字简写：1234 -> 1.2k，12345 -> 1.2万 */
export function formatStat(n) {
  const v = Number(n) || 0
  if (v >= 10000) return `${trimNum(v / 10000)}万`
  if (v >= 1000) return `${trimNum(v / 1000)}k`
  return String(v)
}

/** 取一条记录最新的数据快照（按日期降序后第一条），无数据返回 null */
export function latestStats(item) {
  const stats = Array.isArray(item?.stats) ? item.stats : []
  if (!stats.length) return null
  return [...stats].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))[0]
}

/**
 * 追加/更新某日快照（同日期覆盖），返回按日期升序排列的新数组
 * @param {Array} stats 原有快照
 * @param {Object} entry { date, views, likes, comments, shares }
 */
export function upsertStats(stats, entry) {
  const list = Array.isArray(stats) ? [...stats] : []
  const normalized = {
    date: entry.date,
    views: Number(entry.views) || 0,
    likes: Number(entry.likes) || 0,
    comments: Number(entry.comments) || 0,
    shares: Number(entry.shares) || 0
  }
  const idx = list.findIndex(s => s.date === normalized.date)
  if (idx >= 0) list[idx] = normalized
  else list.push(normalized)
  return list.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
}

/** 柱状图数据：每个有快照的视频取指定指标的最新值 */
export function buildBarData(items, metric) {
  return items
    .map(item => {
      const s = latestStats(item)
      if (!s) return null
      return { name: item.title, value: Number(s[metric]) || 0 }
    })
    .filter(Boolean)
}

/**
 * 折线图序列：每个有快照的视频一条线
 * x 轴取所有快照日期的并集（升序），某视频该日无数据则 value 为 null（断线）
 */
export function buildLineSeries(items, metric) {
  const withStats = items.filter(i => Array.isArray(i.stats) && i.stats.length > 0)
  const dateSet = new Set()
  for (const item of withStats) {
    for (const s of item.stats) dateSet.add(s.date)
  }
  const labels = [...dateSet].sort()
  return withStats.map(item => {
    const map = new Map(item.stats.map(s => [s.date, Number(s[metric]) || 0]))
    return {
      name: item.title,
      points: labels.map(label => ({
        label,
        value: map.has(label) ? map.get(label) : null
      }))
    }
  })
}

/** y 轴上限取“好看”的整数（1/2/2.5/5 × 10^n） */
export function niceMax(max) {
  if (!(max > 0)) return 1
  const pow = Math.pow(10, Math.floor(Math.log10(max)))
  for (const m of [1, 2, 2.5, 5, 10]) {
    if (max <= m * pow) return m * pow
  }
  return 10 * pow
}
