/**
 * ID 生成工具
 * 用时间戳 + 随机数生成唯一 ID
 */
export function generateId() {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 8)
  return `${timestamp}-${random}`
}
