/**
 * 今日汇集查询 + 双向同步
 *
 * 汇集规则：各模块中"今日到期/截止/训练/待发布/学习任务"的条目自动出现在今日计划
 * 双向同步：在今日计划勾选完成 → 回写源模块；在源模块勾选 → 今日计划同步
 */
import { getAll, query, patch } from './dao'
import { today, getWeekday, formatDate, isThisWeek } from '@/utils/date'
import {
  SOURCE,
  MEDIA_STATUS,
  COMPANY_STATUS
} from '@/utils/constants'

/**
 * 获取今日所有项（各模块汇集）
 * @returns {Promise<Array<{id, title, source, sourceId, priority, done, date, note}>>}
 */
export async function getTodayItems() {
  const todayStr = today()
  const weekday = getWeekday()
  const items = []

  // 1. 手动任务（tasks 中 source == 'manual' 且 date == today）
  const tasks = await query('tasks', 'date', todayStr)
  for (const t of tasks) {
    items.push({
      id: t.id,
      title: t.title,
      source: SOURCE.MANUAL,
      sourceId: t.id,
      priority: t.priority || 'medium',
      done: !!t.done,
      date: t.date,
      note: t.note || '',
      timeCost: t.timeCost || 0,
      timeSlot: t.timeSlot || 'any'
    })
  }

  // 2. 自媒体待发且发布日期=今日
  const media = await query('media', 'publishDate', todayStr)
  for (const m of media) {
    if (m.status === MEDIA_STATUS.SCHEDULED) {
      items.push({
        id: `media-${m.id}`,
        title: `发布: ${m.title}`,
        source: SOURCE.MEDIA,
        sourceId: m.id,
        priority: 'high',
        done: m.status === MEDIA_STATUS.PUBLISHED,
        date: m.publishDate,
        note: m.note || '',
        timeCost: m.timeCost || 0,
        timeSlot: m.timeSlot || 'any'
      })
    }
  }

  // 3. 开发任务今日到期且未完成
  const devTasks = await query('devTasks', 'dueDate', todayStr)
  for (const t of devTasks) {
    if (!t.done) {
      items.push({
        id: `dev-${t.id}`,
        title: t.title,
        source: SOURCE.DEV,
        sourceId: t.id,
        priority: t.priority || 'medium',
        done: !!t.done,
        date: t.dueDate,
        note: '',
        timeCost: t.timeCost || 0,
        timeSlot: t.timeSlot || 'any'
      })
    }
  }

  // 4. 公司事项今日截止且未完成
  const companyItems = await query('companyItems', 'deadline', todayStr)
  for (const c of companyItems) {
    if (c.status !== COMPANY_STATUS.DONE && c.status !== COMPANY_STATUS.SHELVED) {
      items.push({
        id: `company-${c.id}`,
        title: c.title,
        source: SOURCE.COMPANY,
        sourceId: c.id,
        priority: c.priority || 'medium',
        done: c.status === COMPANY_STATUS.DONE,
        date: c.deadline,
        note: '',
        timeCost: c.timeCost || 0,
        timeSlot: c.timeSlot || 'any'
      })
    }
  }

  // 5. 健身今日训练（按星期几查排程）
  const fitnessSchedule = await query('fitnessSchedule', 'weekday', weekday)
  for (const f of fitnessSchedule) {
    items.push({
      id: `fitness-${f.id}`,
      title: `训练: ${f.name}`,
      source: SOURCE.FITNESS,
      sourceId: f.id,
      priority: 'medium',
      done: false, // 打卡状态在 fitnessLogs 中查
      date: todayStr,
      note: '',
      timeCost: 0,
      timeSlot: 'any'
    })
  }

  // 6. 学习任务今日到期且未完成
  const studyTasks = await query('studyTasks', 'dueDate', todayStr)
  for (const t of studyTasks) {
    if (!t.done) {
      items.push({
        id: `study-${t.id}`,
        title: t.title,
        source: SOURCE.STUDY,
        sourceId: t.id,
        priority: t.priority || 'medium',
        done: !!t.done,
        date: t.dueDate,
        note: t.note || '',
        timeCost: t.timeCost || 0,
        timeSlot: t.timeSlot || 'any'
      })
    }
  }

  return items
}

/**
 * 双向同步：勾选完成状态
 * 根据来源回写源模块的对应记录
 */
export async function toggleDone(item) {
  const newDone = !item.done

  switch (item.source) {
    case SOURCE.MANUAL:
      await patch('tasks', item.sourceId, { done: newDone })
      break

    case SOURCE.MEDIA:
      // 自媒体勾选完成 = 状态变为已发
      await patch('media', item.sourceId, {
        status: newDone ? MEDIA_STATUS.PUBLISHED : MEDIA_STATUS.SCHEDULED
      })
      break

    case SOURCE.DEV:
      await patch('devTasks', item.sourceId, { done: newDone })
      break

    case SOURCE.COMPANY:
      await patch('companyItems', item.sourceId, {
        status: newDone ? COMPANY_STATUS.DONE : COMPANY_STATUS.TODO
      })
      break

    case SOURCE.FITNESS:
      // 健身打卡：在 fitnessLogs 中写入/删除今日记录
      if (newDone) {
        const { save } = await import('./dao')
        await save('fitnessLogs', {
          date: today(),
          scheduleId: item.sourceId,
          done: true
        })
      } else {
        // 撤销打卡：删除今日该排程的打卡记录
        const logs = await query('fitnessLogs', 'date', today())
        const log = logs.find(l => l.scheduleId === item.sourceId)
        if (log) {
          const { remove } = await import('./dao')
          await remove('fitnessLogs', log.id)
        }
      }
      break

    case SOURCE.STUDY:
      await patch('studyTasks', item.sourceId, { done: newDone })
      break

    default:
      throw new Error(`未知的来源: ${item.source}`)
  }

  return { ...item, done: newDone }
}

/**
 * 获取指定日期的所有项（用于本周视图的某天展开）
 */
export async function getItemsByDate(dateStr) {
  const isTodayStr = dateStr === today()
  if (isTodayStr) {
    return getTodayItems()
  }

  // 非今日：只查手动任务（其他模块的汇集仅对今日生效）
  const tasks = await query('tasks', 'date', dateStr)
  return tasks.map(t => ({
    id: t.id,
    title: t.title,
    source: SOURCE.MANUAL,
    sourceId: t.id,
    priority: t.priority || 'medium',
    done: !!t.done,
    date: t.date,
    note: t.note || ''
  }))
}

/**
 * 获取本周各天的项数量（用于本周视图概览）
 */
export async function getWeekItemsCount() {
  const days = []
  for (let i = 1; i <= 7; i++) {
    // 计算本周 i 对应的日期
    const d = new Date()
    const jsDay = d.getDay()
    const mondayOffset = jsDay === 0 ? -6 : 1 - jsDay
    const target = new Date(d)
    target.setDate(d.getDate() + mondayOffset + (i - 1))
    const dateStr = formatDate(target)

    if (dateStr === today()) {
      const items = await getTodayItems()
      days.push({ weekday: i, date: dateStr, count: items.length })
    } else {
      const tasks = await query('tasks', 'date', dateStr)
      days.push({ weekday: i, date: dateStr, count: tasks.length })
    }
  }
  return days
}
