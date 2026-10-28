/**
 * 每日加油打气 tips
 * 每天按日期稳定选出一条，同一天多次打开内容一致
 * 用户可在「设置 → 每日加油」自定义自己的列表（每行一条），保存后优先使用
 */

export const DAILY_TIPS = [
  '今天也要元气满满，先完成最重要的一件小事。',
  '慢慢来，比较快。稳住节奏就是赢。',
  '你不需要完美，只需要开始。',
  '把大事拆小，把小事做完。',
  '今天的努力，是明天的底气。',
  '别等状态好，先动起来状态就来了。',
  '一小步也是前进，别停下就好。',
  '专注眼前这一件事，其余的稍后再说。',
  '你已经比昨天的自己更强了。',
  '允许自己慢一点，但不要允许自己放弃。',
  '完成比完美更重要。',
  '先做最难的那件事，今天就会轻松很多。',
  '深呼吸，一切都在掌控之中。',
  '你的坚持，正在悄悄改变结果。',
  '今天少刷一会儿手机，多给自己一点时间。',
  '身体是本钱，记得按时吃饭、好好睡觉。',
  '不必和别人比，只和昨天的自己比。',
  '把注意力放回自己能控制的事情上。',
  '每一次认真，都会留下痕迹。',
  '困难只是暂时的，你比它更有耐心。',
  '今天也请好好照顾自己。',
  '想清楚再行动，行动后再复盘。',
  '别怕做得慢，怕的是原地不动。',
  '给自己一点掌声，你已经走了很远。',
  '今天的计划，完成一半也算胜利。',
  '情绪来了先接住它，再决定怎么做。',
  '保持好奇，保持热爱，保持行动。',
  '把时间花在值得的人和事上。',
  '你正在成为你想成为的那个人。',
  '先完成，再完善，最后才是完美。',
  '哪怕只前进一厘米，也比原地踏步强。',
  '今天的太阳，也在为你加油。',
  '别把精力浪费在无法改变的事情上。',
  '认真生活的样子，本身就很酷。',
  '给未来的自己，留一份从容。',
  '偶尔休息不是偷懒，是为了走更远。',
  '把今天过好，就是对明天最好的准备。',
  '你的努力，时间都记得。',
  '沉住气，熬过去就是新的天地。',
  '今天也要相信，好事正在发生。'
]

/** localStorage key */
const CUSTOM_TIPS_KEY = 'pixel-dashboard:custom-tips'

/**
 * 读取用户自定义列表
 * @returns {string[] | null} 若未定义则返回 null
 */
export function loadCustomTips() {
  try {
    const raw = localStorage.getItem(CUSTOM_TIPS_KEY)
    if (!raw) return null
    const arr = JSON.parse(raw)
    if (!Array.isArray(arr)) return null
    const cleaned = arr.map(s => String(s || '').trim()).filter(Boolean)
    return cleaned.length ? cleaned : null
  } catch {
    return null
  }
}

/**
 * 保存用户自定义列表
 * @param {string[] | null} list 传 null 等同于清空
 */
export function saveCustomTips(list) {
  if (!list || !Array.isArray(list)) {
    localStorage.removeItem(CUSTOM_TIPS_KEY)
    return
  }
  const cleaned = list.map(s => String(s || '').trim()).filter(Boolean)
  if (cleaned.length === 0) {
    localStorage.removeItem(CUSTOM_TIPS_KEY)
  } else {
    localStorage.setItem(CUSTOM_TIPS_KEY, JSON.stringify(cleaned))
  }
}

/**
 * 根据日期取一条稳定的 tip
 * 优先使用用户自定义列表；若未定义则用默认的 40 条
 * @param {string} dateStr YYYY-MM-DD
 */
export function getDailyTip(dateStr) {
  const pool = loadCustomTips() || DAILY_TIPS
  const s = String(dateStr || '')
  let sum = 0
  for (let i = 0; i < s.length; i++) sum = (sum * 31 + s.charCodeAt(i)) % 100000
  return pool[sum % pool.length]
}

/** 把数组转成多行文本（每行一条），便于 Settings 页编辑 */
export function tipsToText(list) {
  return (list || []).join('\n')
}

/** 把多行文本转回数组（忽略空行、去重） */
export function textToTips(text) {
  if (!text) return []
  const arr = text.split(/\r?\n/).map(s => s.trim()).filter(Boolean)
  return Array.from(new Set(arr))
}
