import { describe, it, expect, beforeEach } from 'vitest'
import { initDB, closeDB, getDB } from '../db/init'
import { getAll, get, query, save, remove, clear, patch } from '../db/dao'
import { getTodayItems, toggleDone, getItemsByDate, getWeekItemsCount } from '../db/aggr'
import { exportAll, importAll, clearAll } from '../db/backup'
import { STORES } from '../utils/constants'
import { today, getWeekday, formatDate } from '../utils/date'

/**
 * 阶段 1 测试：数据层
 * 验证 IndexedDB 18 个 store、DAO 增删改查、今日汇集、双向同步、备份恢复
 */

describe('阶段1：数据层', () => {
  beforeEach(async () => {
    // 每个测试前重新初始化，确保干净状态
    closeDB()
    await initDB()
    // 清空所有 store
    for (const store of STORES) {
      await clear(store)
    }
  })

  describe('1.1 IndexedDB 初始化', () => {
    it('初始化后数据库包含 18 个 Object Store', async () => {
      const db = getDB()
      const storeNames = Array.from(db.objectStoreNames).sort()
      expect(storeNames.length).toBe(STORES.length)
      for (const s of STORES) {
        expect(storeNames).toContain(s)
      }
    })

    it('重复调用 initDB 返回同一实例', async () => {
      const db1 = await initDB()
      const db2 = await initDB()
      expect(db1).toBe(db2)
    })
  })

  describe('1.2 通用 DAO', () => {
    it('save 新增记录时自动生成 id 和时间戳', async () => {
      const saved = await save('tasks', {
        title: '测试任务',
        date: today(),
        priority: 'high',
        done: false,
        source: 'manual'
      })
      expect(saved.id).toBeDefined()
      expect(saved.createdAt).toBeDefined()
      expect(saved.updatedAt).toBeDefined()
      expect(saved.title).toBe('测试任务')
    })

    it('save 有 id 时更新而非新建', async () => {
      const saved = await save('tasks', {
        title: '原始',
        date: today(),
        source: 'manual'
      })
      const originalId = saved.id

      const updated = await save('tasks', {
        ...saved,
        title: '已修改'
      })
      expect(updated.id).toBe(originalId)
      expect(updated.title).toBe('已修改')

      const all = await getAll('tasks')
      expect(all.length).toBe(1) // 没有新增，是更新
    })

    it('get 按 id 获取单条', async () => {
      const saved = await save('memos', { content: '测试便签' })
      const found = await get('memos', saved.id)
      expect(found).not.toBeNull()
      expect(found.content).toBe('测试便签')
    })

    it('getAll 获取全部', async () => {
      await save('memos', { content: '便签1' })
      await save('memos', { content: '便签2' })
      await save('memos', { content: '便签3' })
      const all = await getAll('memos')
      expect(all.length).toBe(3)
    })

    it('query 按索引查询', async () => {
      await save('tasks', { title: '任务1', date: '2026-09-08', source: 'manual' })
      await save('tasks', { title: '任务2', date: '2026-09-09', source: 'manual' })
      await save('tasks', { title: '任务3', date: '2026-09-08', source: 'manual' })

      const result = await query('tasks', 'date', '2026-09-08')
      expect(result.length).toBe(2)
    })

    it('remove 删除单条', async () => {
      const saved = await save('memos', { content: '待删' })
      await remove('memos', saved.id)
      const found = await get('memos', saved.id)
      expect(found).toBeNull()
    })

    it('clear 清空单个 store', async () => {
      await save('memos', { content: '1' })
      await save('memos', { content: '2' })
      await clear('memos')
      const all = await getAll('memos')
      expect(all.length).toBe(0)
    })

    it('patch 部分更新', async () => {
      const saved = await save('tasks', {
        title: '原始', date: today(), done: false, source: 'manual'
      })
      const patched = await patch('tasks', saved.id, { done: true })
      expect(patched.done).toBe(true)
      expect(patched.title).toBe('原始') // 其他字段不变
    })

    it('数据持久化（刷新后不丢失）', async () => {
      // 模拟"刷新"：关闭连接重新打开
      await save('memos', { content: '持久化测试' })
      closeDB()
      await initDB()
      const all = await getAll('memos')
      expect(all.length).toBe(1)
      expect(all[0].content).toBe('持久化测试')
    })
  })

  describe('1.3 今日汇集查询', () => {
    it('getTodayItems 返回手动任务', async () => {
      await save('tasks', {
        title: '今日手动任务', date: today(), done: false, source: 'manual'
      })
      const items = await getTodayItems()
      expect(items.length).toBe(1)
      expect(items[0].title).toBe('今日手动任务')
      expect(items[0].source).toBe('manual')
    })

    it('getTodayItems 返回今日待发的自媒体内容', async () => {
      await save('media', {
        title: '视频1', platform: 'b站', status: 'scheduled', publishDate: today()
      })
      await save('media', {
        title: '视频2', platform: 'b站', status: 'scheduled', publishDate: '2026-12-31'
      })
      const items = await getTodayItems()
      const mediaItems = items.filter(i => i.source === 'media')
      expect(mediaItems.length).toBe(1)
      expect(mediaItems[0].title).toContain('视频1')
    })

    it('getTodayItems 返回今日到期的开发任务', async () => {
      await save('devTasks', {
        title: '写代码', projectId: 'p1', dueDate: today(), done: false
      })
      await save('devTasks', {
        title: '改bug', projectId: 'p1', dueDate: '2026-12-31', done: false
      })
      const items = await getTodayItems()
      const devItems = items.filter(i => i.source === 'dev')
      expect(devItems.length).toBe(1)
      expect(devItems[0].title).toBe('写代码')
    })

    it('getTodayItems 返回今日截止的公司事项', async () => {
      await save('companyItems', {
        title: '会议', category: 'meeting', priority: 'high',
        deadline: today(), status: 'todo'
      })
      const items = await getTodayItems()
      const companyItems = items.filter(i => i.source === 'company')
      expect(companyItems.length).toBe(1)
      expect(companyItems[0].title).toBe('会议')
    })

    it('getTodayItems 返回今日训练', async () => {
      await save('fitnessSchedule', {
        weekday: getWeekday(), name: '胸+三头', exercises: []
      })
      const items = await getTodayItems()
      const fitnessItems = items.filter(i => i.source === 'fitness')
      expect(fitnessItems.length).toBe(1)
      expect(fitnessItems[0].title).toContain('胸+三头')
    })

    it('getTodayItems 返回今日到期的学习任务', async () => {
      await save('studyTasks', {
        title: '看第3章', topicId: 't1', dueDate: today(), done: false
      })
      const items = await getTodayItems()
      const studyItems = items.filter(i => i.source === 'study')
      expect(studyItems.length).toBe(1)
      expect(studyItems[0].title).toBe('看第3章')
    })

    it('已完成/已搁置的事项不出现在今日计划', async () => {
      await save('companyItems', {
        title: '已完成的事', category: 'daily', deadline: today(), status: 'done'
      })
      await save('companyItems', {
        title: '搁置的事', category: 'daily', deadline: today(), status: 'shelved'
      })
      const items = await getTodayItems()
      expect(items.filter(i => i.source === 'company').length).toBe(0)
    })

    it('getWeekItemsCount 返回7天', async () => {
      const days = await getWeekItemsCount()
      expect(days.length).toBe(7)
      expect(days[0].weekday).toBe(1) // 周一
      expect(days[6].weekday).toBe(7) // 周日
    })
  })

  describe('1.4 双向同步', () => {
    it('勾选手动任务 → tasks 表 done 变为 true', async () => {
      const saved = await save('tasks', {
        title: '任务', date: today(), done: false, source: 'manual'
      })
      await toggleDone({
        source: 'manual', sourceId: saved.id, done: false
      })
      const updated = await get('tasks', saved.id)
      expect(updated.done).toBe(true)
    })

    it('取消勾选手动任务 → tasks 表 done 变回 false', async () => {
      const saved = await save('tasks', {
        title: '任务', date: today(), done: true, source: 'manual'
      })
      await toggleDone({
        source: 'manual', sourceId: saved.id, done: true
      })
      const updated = await get('tasks', saved.id)
      expect(updated.done).toBe(false)
    })

    it('勾选自媒体 → 状态变为已发', async () => {
      const saved = await save('media', {
        title: '视频', status: 'scheduled', publishDate: today()
      })
      await toggleDone({
        source: 'media', sourceId: saved.id, done: false
      })
      const updated = await get('media', saved.id)
      expect(updated.status).toBe('published')
    })

    it('勾选开发任务 → done 变为 true', async () => {
      const saved = await save('devTasks', {
        title: '任务', projectId: 'p1', dueDate: today(), done: false
      })
      await toggleDone({
        source: 'dev', sourceId: saved.id, done: false
      })
      const updated = await get('devTasks', saved.id)
      expect(updated.done).toBe(true)
    })

    it('勾选公司事项 → 状态变为已完成', async () => {
      const saved = await save('companyItems', {
        title: '事项', category: 'daily', deadline: today(), status: 'todo'
      })
      await toggleDone({
        source: 'company', sourceId: saved.id, done: false
      })
      const updated = await get('companyItems', saved.id)
      expect(updated.status).toBe('done')
    })

    it('勾选健身训练 → fitnessLogs 写入打卡记录', async () => {
      const saved = await save('fitnessSchedule', {
        weekday: getWeekday(), name: '跑步', exercises: []
      })
      await toggleDone({
        source: 'fitness', sourceId: saved.id, done: false
      })
      const logs = await query('fitnessLogs', 'date', today())
      expect(logs.length).toBe(1)
      expect(logs[0].done).toBe(true)
      expect(logs[0].scheduleId).toBe(saved.id)
    })

    it('取消勾选健身训练 → fitnessLogs 删除打卡记录', async () => {
      const saved = await save('fitnessSchedule', {
        weekday: getWeekday(), name: '跑步', exercises: []
      })
      await toggleDone({
        source: 'fitness', sourceId: saved.id, done: false
      })
      await toggleDone({
        source: 'fitness', sourceId: saved.id, done: true
      })
      const logs = await query('fitnessLogs', 'date', today())
      expect(logs.length).toBe(0)
    })

    it('勾选学习任务 → done 变为 true', async () => {
      const saved = await save('studyTasks', {
        title: '任务', topicId: 't1', dueDate: today(), done: false
      })
      await toggleDone({
        source: 'study', sourceId: saved.id, done: false
      })
      const updated = await get('studyTasks', saved.id)
      expect(updated.done).toBe(true)
    })
  })

  describe('1.5 备份与恢复', () => {
    it('exportAll 返回包含所有 store 的对象', async () => {
      await save('memos', { content: '测试' })
      await save('tasks', { title: '任务', date: today(), source: 'manual' })

      const data = await exportAll()
      expect(data._exportTime).toBeDefined()
      expect(data._appVersion).toBeDefined()
      expect(Array.isArray(data.memos)).toBe(true)
      expect(Array.isArray(data.tasks)).toBe(true)
      expect(data.memos.length).toBe(1)
      expect(data.tasks.length).toBe(1)
    })

    it('importAll 恢复数据', async () => {
      // 先写入原始数据
      await save('memos', { content: '原始便签1' })
      await save('memos', { content: '原始便签2' })

      // 导出
      const backup = await exportAll()

      // 清空
      await clearAll()

      // 确认清空
      const emptyAll = await getAll('memos')
      expect(emptyAll.length).toBe(0)

      // 导入恢复
      await importAll(backup)

      // 验证恢复
      const restored = await getAll('memos')
      expect(restored.length).toBe(2)
      expect(restored.map(m => m.content).sort()).toEqual(['原始便签1', '原始便签2'])
    })

    it('importAll 拒绝无效格式', async () => {
      await expect(importAll(null)).rejects.toThrow()
      await expect(importAll({})).rejects.toThrow()
      await expect(importAll('string')).rejects.toThrow()
    })

    it('clearAll 清空所有数据', async () => {
      await save('memos', { content: '便签' })
      await save('tasks', { title: '任务', date: today(), source: 'manual' })
      await save('media', { title: '视频', status: 'idea' })

      await clearAll()

      for (const store of STORES) {
        const all = await getAll(store)
        // meta 可能保留主题设置，其他全部为空
        if (store !== 'meta') {
          expect(all.length).toBe(0)
        }
      }
    })
  })
})
