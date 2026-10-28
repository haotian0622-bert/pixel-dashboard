/**
 * 今日汇集查询 + 双向同步
 *
 * 汇集规则：各模块中"今日到期/截止/训练/待发布/学习任务"的条目自动出现在今日计划
 * 双向同步：在今日计划勾选完成 → 回写源模块；在源模块勾选 → 今日计划同步
 */
import { getAll, query, patch, save } from './dao'
import { today, getWeekday, formatDate, isThisWeek, getMondayOfWeek } from '@/utils/date'
import {
  SOURCE,
  MEDIA_STATUS,
  COMPANY_STATUS
} from '@/utils/constants'

/** 未完成顺延的每日标记，避免同一天重复执行 */
const ROLLOVER_KEY = 'pixel-dashboard:rollover-date'

/**
 * 每日顺延：把今天之前的未完成手动任务移到今天
 * 只在每天第一次打开应用时执行一次
 * @returns {Promise<number>} 顺延的任务数
 */
export async function carryOverUnfinishedTasks() {
  const todayStr = today()
  try {
    if (localStorage.getItem(ROLLOVER_KEY) === todayStr) return 0
  } catch {
    // localStorage 不可用时仍然执行顺延
  }

  const tasks = await getAll('tasks')
  let moved = 0
  for (const t of tasks) {
    if (!t.done && t.date && t.date < todayStr) {
      await patch('tasks', t.id, { date: todayStr })
      moved += 1
    }
  }

  try {
    localStorage.setItem(ROLLOVER_KEY, todayStr)
  } catch {
    // 忽略
  }
  return moved
}

/** 不同来源的任务对应的日期字段 */
const DATE_FIELDS = {
  [SOURCE.MEDIA]: ['media', 'publishDate'],
  [SOURCE.COMPANY]: ['companyItems', 'deadline'],
  [SOURCE.STUDY]: ['studyTasks', 'dueDate'],
  [SOURCE.DEV]: ['devTasks', 'dueDate']
}

/**
 * 把某条任务拖到指定日期（改期）
 * @param {{source:string, sourceId:string}} item
 * @param {string} dateStr YYYY-MM-DD
 * @returns {Promise<boolean>} 是否成功改期
 */
export async function moveItemToDate(item, dateStr) {
  if (!item || !item.sourceId || !dateStr) return false

  if (item.source === SOURCE.MANUAL) {
    await patch('tasks', item.sourceId, { date: dateStr })
    return true
  }

  const target = DATE_FIELDS[item.source]
  if (!target) return false // 健身按星期排程，不能改日期
  await patch(target[0], item.sourceId, { [target[1]]: dateStr })
  return true
}


/**
 * 获取今日所有项（各模块汇集）
 * @returns {Promise<Array<{id, title, source, sourceId, priority, done, date, note}>>}
 */
export async function getTodayItems() {
  // 每天首次加载时，把之前未完成的任务顺延到今天
  await carryOverUnfinishedTasks()
  return collectItemsForDate(today())
}

/**
 * 汇集指定日期的所有项
 * 各模块按各自的日期字段匹配；健身按星期排程，仅今日展示
 * @param {string} dateStr YYYY-MM-DD
 */
async function collectItemsForDate(dateStr) {
  const isTodayDate = dateStr === today()
  const weekday = getWeekday(dateStr)
  const items = []

  // 1. 手动任务（带 sortOrder，用于首页拖拽排序）
  const tasks = await query('tasks', 'date', dateStr)
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
      timeSlot: t.timeSlot || 'any',
      sortOrder: typeof t.sortOrder === 'number' ? t.sortOrder : null
    })
  }

  // 2. 自媒体待发且发布日期匹配
  const media = await query('media', 'publishDate', dateStr)
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

  // 3. 开发任务到期且未完成
  const devTasks = await query('devTasks', 'dueDate', dateStr)
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

  // 4. 公司事项截止且未完成
  const companyItems = await query('companyItems', 'deadline', dateStr)
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

  // 5. 健身今日训练（按星期几查排程，仅今日，避免提前勾选）
  if (isTodayDate) {
    const fitnessSchedule = await query('fitnessSchedule', 'weekday', weekday)
    for (const f of fitnessSchedule) {
      items.push({
        id: `fitness-${f.id}`,
        title: `训练: ${f.name}`,
        source: SOURCE.FITNESS,
        sourceId: f.id,
        priority: 'medium',
        done: false, // 打卡状态在 fitnessLogs 中查
        date: dateStr,
        note: '',
        timeCost: 0,
        timeSlot: 'any'
      })
    }
  }

  // 6. 学习任务到期且未完成
  const studyTasks = await query('studyTasks', 'dueDate', dateStr)
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

  // === 统一排序 ===
  // 规则：未完成在前 → 手动任务按 sortOrder 升序 → 其他来源按 priority 高到低
  // priority high=1 / medium=2 / low=3 映射
  const PRI_RANK = { high: 1, medium: 2, low: 3 }
  const sorted = [...items].sort((a, b) => {
    if (!!a.done !== !!b.done) return a.done ? 1 : -1           // 未完成先
    if (a.source === SOURCE.MANUAL && b.source === SOURCE.MANUAL) {
      const soA = a.sortOrder === null ? Number.MAX_SAFE_INTEGER : a.sortOrder
      const soB = b.sortOrder === null ? Number.MAX_SAFE_INTEGER : b.sortOrder
      return soA - soB                                          // 手动按 sortOrder
    }
    if (a.source === SOURCE.MANUAL) return -1                    // 手动先于其他
    if (b.source === SOURCE.MANUAL) return 1
    const prA = PRI_RANK[a.priority] || 2
    const prB = PRI_RANK[b.priority] || 2
    return prA - prB                                            // 其他按优先级
  })
  return sorted
}

/**
 * 批量重排手动任务的 sortOrder（首页今日计划内拖拽排序后调用）
 * @param {Array<{sourceId:string}>} manualItemsInNewOrder 新顺序的手动任务
 */
export async function reorderManualTasks(manualItemsInNewOrder) {
  for (let i = 0; i < manualItemsInNewOrder.length; i++) {
    const id = manualItemsInNewOrder[i].sourceId
    if (id) await patch('tasks', id, { sortOrder: i })
  }
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
  return collectItemsForDate(dateStr)
}

/**
 * 获取本周看板：周一~周日，每天带日期、标签与任务列表
 * 每天均汇集各模块对应日期的条目
 */
export async function getWeekBoard() {
  const monday = getMondayOfWeek()
  const board = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    const dateStr = formatDate(d)
    const items = await getItemsByDate(dateStr)
    board.push({
      weekday: i + 1,
      date: dateStr,
      label: `${d.getMonth() + 1}/${d.getDate()}`,
      items,
      count: items.length
    })
  }
  return board
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
