/**
 * 日期工具
 */

/** 格式化日期为 YYYY-MM-DD */
export function formatDate(date = new Date()) {
  const d = new Date(date)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** 格式化日期为 YYYY-MM */
export function formatMonth(date = new Date()) {
  const d = new Date(date)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

/** 获取星期几（1=周一, 7=周日） */
export function getWeekday(date = new Date()) {
  const d = new Date(date)
  const jsDay = d.getDay() // 0=周日, 1=周一...6=周六
  return jsDay === 0 ? 7 : jsDay
}

/** 获取本周一的日期 */
export function getMondayOfWeek(date = new Date()) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day // 周日归到上周一
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

/** 获取本周日的日期（含当天） */
export function getSundayOfWeek(date = new Date()) {
  const monday = getMondayOfWeek(date)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)
  return sunday
}

/** 判断日期是否在今天 */
export function isToday(dateStr) {
  if (!dateStr) return false
  return formatDate(dateStr) === formatDate(new Date())
}

/** 判断日期在本周 */
export function isThisWeek(dateStr) {
  if (!dateStr) return false
  const d = new Date(dateStr)
  const monday = getMondayOfWeek()
  const sunday = getSundayOfWeek()
  return d >= monday && d <= sunday
}

/** 判断日期在本月 */
export function isThisMonth(dateStr) {
  if (!dateStr) return false
  return formatMonth(dateStr) === formatMonth(new Date())
}

/** 获取今日日期字符串 */
export function today() {
  return formatDate(new Date())
}

/** 获取中文星期名 */
export function getWeekdayName(date = new Date()) {
  const names = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return names[new Date(date).getDay()]
}

/** 获取中文完整日期（如 9月8日 周一） */
export function getChineseDate(date = new Date()) {
  const d = new Date(date)
  return `${d.getMonth() + 1}月${d.getDate()}日 ${getWeekdayName(d)}`
}
