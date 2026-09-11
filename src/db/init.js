/**
 * IndexedDB 初始化
 * 数据库：pixel-dashboard，版本 1
 * 创建 18 个 Object Store 及其索引
 */
import { STORES } from '@/utils/constants'

const DB_NAME = 'pixel-dashboard'
const DB_VERSION = 1

let dbInstance = null

/** Store 的索引配置：{ storeName: [{ name, keyPath, unique }, ...] } */
const STORE_INDEXES = {
  tasks: [
    { name: 'date', keyPath: 'date', unique: false },
    { name: 'done', keyPath: 'done', unique: false },
    { name: 'source', keyPath: 'source', unique: false }
  ],
  memos: [
    { name: 'createdAt', keyPath: 'createdAt', unique: false }
  ],
  media: [
    { name: 'status', keyPath: 'status', unique: false },
    { name: 'publishDate', keyPath: 'publishDate', unique: false }
  ],
  devProjects: [
    { name: 'status', keyPath: 'status', unique: false }
  ],
  devMilestones: [
    { name: 'projectId', keyPath: 'projectId', unique: false }
  ],
  devTasks: [
    { name: 'projectId', keyPath: 'projectId', unique: false },
    { name: 'dueDate', keyPath: 'dueDate', unique: false },
    { name: 'done', keyPath: 'done', unique: false }
  ],
  devSnippets: [
    { name: 'projectId', keyPath: 'projectId', unique: false }
  ],
  companyItems: [
    { name: 'status', keyPath: 'status', unique: false },
    { name: 'deadline', keyPath: 'deadline', unique: false }
  ],
  companyNotes: [
    { name: 'itemId', keyPath: 'itemId', unique: false }
  ],
  fitnessSchedule: [
    { name: 'weekday', keyPath: 'weekday', unique: false }
  ],
  fitnessLogs: [
    { name: 'date', keyPath: 'date', unique: false }
  ],
  fitnessBody: [
    { name: 'date', keyPath: 'date', unique: false }
  ],
  studyTopics: [
    { name: 'status', keyPath: 'status', unique: false }
  ],
  studyTasks: [
    { name: 'topicId', keyPath: 'topicId', unique: false },
    { name: 'dueDate', keyPath: 'dueDate', unique: false },
    { name: 'done', keyPath: 'done', unique: false }
  ],
  studyLogs: [
    { name: 'date', keyPath: 'date', unique: false },
    { name: 'topicId', keyPath: 'topicId', unique: false }
  ],
  studyMaterials: [
    { name: 'topicId', keyPath: 'topicId', unique: false }
  ],
  financeRecords: [
    { name: 'date', keyPath: 'date', unique: false },
    { name: 'type', keyPath: 'type', unique: false }
  ],
  meta: [
    { name: 'key', keyPath: 'key', unique: true }
  ]
}

/** 初始化数据库，返回 Promise<IDBDatabase> */
export function initDB() {
  if (dbInstance) {
    return Promise.resolve(dbInstance)
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (event) => {
      const db = event.target.result

      // 创建所有 store 和索引
      for (const storeName of STORES) {
        if (!db.objectStoreNames.contains(storeName)) {
          const store = db.createObjectStore(storeName, {
            keyPath: 'id',
            autoIncrement: false
          })

          const indexes = STORE_INDEXES[storeName] || []
          for (const idx of indexes) {
            store.createIndex(idx.name, idx.keyPath, {
              unique: idx.unique || false
            })
          }
        }
      }
    }

    request.onsuccess = (event) => {
      dbInstance = event.target.result
      resolve(dbInstance)
    }

    request.onerror = (event) => {
      reject(event.target.error)
    }
  })
}

/** 获取已初始化的数据库实例（需先调用 initDB） */
export function getDB() {
  if (!dbInstance) {
    throw new Error('数据库未初始化，请先调用 initDB()')
  }
  return dbInstance
}

/** 关闭数据库连接 */
export function closeDB() {
  if (dbInstance) {
    dbInstance.close()
    dbInstance = null
  }
}

// 导出 store 索引配置供测试使用
export { STORE_INDEXES }
