/**
 * 备份与恢复
 * 导出全部数据为 JSON / 导入 JSON 恢复 / 清空所有数据
 */
import { initDB, getDB } from './init'
import { getAll, clear } from './dao'
import { STORES } from '@/utils/constants'

/**
 * 导出全部数据
 * @returns {Promise<object>} 含所有 store 数据的对象
 */
export async function exportAll() {
  await initDB()
  const data = { _exportTime: new Date().toISOString(), _appVersion: '0.1.0' }

  for (const store of STORES) {
    data[store] = await getAll(store)
  }

  return data
}

/**
 * 导入 JSON 数据恢复
 * @param {object} data - 导出的 JSON 对象
 */
export async function importAll(data) {
  // 校验格式
  if (!data || typeof data !== 'object') {
    throw new Error('导入数据格式无效：不是有效对象')
  }

  // 至少包含一个已知的 store
  const hasKnownStore = STORES.some(s => Array.isArray(data[s]))
  if (!hasKnownStore) {
    throw new Error('导入数据格式无效：未找到任何已知数据表')
  }

  await initDB()
  const db = getDB()

  // 先清空所有 store，再写入
  for (const store of STORES) {
    await clear(store)
  }

  // 逐 store 写入
  for (const store of STORES) {
    if (Array.isArray(data[store])) {
      await new Promise((resolve, reject) => {
        const tx = db.transaction(store, 'readwrite')
        const storeObj = tx.objectStore(store)
        for (const item of data[store]) {
          if (item && typeof item === 'object' && item.id) {
            storeObj.put(item)
          }
        }
        tx.oncomplete = () => resolve(true)
        tx.onerror = () => reject(tx.error)
      })
    }
  }

  return true
}

/**
 * 清空所有数据（保留 meta 中的主题设置）
 */
export async function clearAll() {
  await initDB()

  // 保存主题设置
  const { get } = await import('./dao')
  const themeMeta = await get('meta', 'theme')

  for (const store of STORES) {
    if (store !== 'meta') {
      await clear(store)
    }
  }

  // 清空 meta 后写回主题
  await clear('meta')
  if (themeMeta) {
    const { save } = await import('./dao')
    await save('meta', themeMeta)
  }

  return true
}
