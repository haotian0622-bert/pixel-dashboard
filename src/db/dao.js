/**
 * 通用 DAO —— 增删改查
 * 所有数据读写走这一层，界面不直接碰 IndexedDB
 */
import { initDB, getDB } from './init'
import { generateId } from '@/utils/id'

/** 确保数据库已初始化 */
async function ensureDB() {
  await initDB()
  return getDB()
}

/** 获取全部记录 */
export async function getAll(store) {
  const db = await ensureDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly')
    const req = tx.objectStore(store).getAll()
    req.onsuccess = () => resolve(req.result || [])
    req.onerror = () => reject(req.error)
  })
}

/** 按 id 获取单条 */
export async function get(store, id) {
  const db = await ensureDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly')
    const req = tx.objectStore(store).get(id)
    req.onsuccess = () => resolve(req.result || null)
    req.onerror = () => reject(req.error)
  })
}

/** 按索引查询（精确匹配，返回数组） */
export async function query(store, indexName, value) {
  const db = await ensureDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly')
    const storeObj = tx.objectStore(store)
    const index = storeObj.index(indexName)
    const req = index.getAll(value)
    req.onsuccess = () => resolve(req.result || [])
    req.onerror = () => reject(req.error)
  })
}

/** 按索引范围查询（用于日期范围等） */
export async function queryRange(store, indexName, lower, upper) {
  const db = await ensureDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly')
    const storeObj = tx.objectStore(store)
    const index = storeObj.index(indexName)
    const range = IDBKeyRange.bound(lower, upper)
    const req = index.getAll(range)
    req.onsuccess = () => resolve(req.result || [])
    req.onerror = () => reject(req.error)
  })
}

/** 新增或更新（有 id 则更新，无则生成 id + createdAt） */
export async function save(store, obj) {
  const db = await ensureDB()
  const data = { ...obj }
  if (!data.id) {
    data.id = generateId()
    data.createdAt = data.createdAt || new Date().toISOString()
  }
  data.updatedAt = new Date().toISOString()

  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite')
    const req = tx.objectStore(store).put(data)
    req.onsuccess = () => resolve(data)
    req.onerror = () => reject(req.error)
  })
}

/** 删除单条 */
export async function remove(store, id) {
  const db = await ensureDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite')
    const req = tx.objectStore(store).delete(id)
    req.onsuccess = () => resolve(true)
    req.onerror = () => reject(req.error)
  })
}

/** 清空单个 store */
export async function clear(store) {
  const db = await ensureDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite')
    const req = tx.objectStore(store).clear()
    req.onsuccess = () => resolve(true)
    req.onerror = () => reject(req.error)
  })
}

/** 按 id 更新部分字段 */
export async function patch(store, id, updates) {
  const existing = await get(store, id)
  if (!existing) {
    throw new Error(`记录不存在: ${store}/${id}`)
  }
  const updated = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString()
  }
  return save(store, updated)
}
