import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * 阶段 18 测试：问题5 - 优先度补充白天/晚上时间选择
 * 验收点：
 *   1. constants.js 定义 TIME_SLOT 枚举和符号
 *   2. 各模块表单含 timeSlot PixelSelect
 *   3. 各模块保存时持久化 timeSlot
 *   4. 各模块列表显示时段符号
 *   5. 今日计划 aggr 返回带 timeSlot 字段
 */

const read = (rel) => readFileSync(resolve(process.cwd(), rel), 'utf-8')

describe('问题5：优先度补充白天/晚上时间选择', () => {
  describe('constants.js 枚举', () => {
    let c
    beforeAll(() => { c = read('src/utils/constants.js') })

    it('定义 TIME_SLOT 枚举', () => {
      expect(c).toMatch(/export\s+const\s+TIME_SLOT\s*=\s*\{[^}]*DAY:\s*'day'[^}]*NIGHT:\s*'night'[^}]*ANY:\s*'any'[^}]*\}/s)
    })

    it('定义 TIME_SLOT_LABELS', () => {
      expect(c).toMatch(/export\s+const\s+TIME_SLOT_LABELS\s*=\s*\{[^}]*day:\s*'白天'[^}]*night:\s*'晚上'[^}]*any:\s*'不限'[^}]*\}/s)
    })

    it('定义 TIME_SLOT_SYMBOLS', () => {
      expect(c).toMatch(/export\s+const\s+TIME_SLOT_SYMBOLS\s*=/)
    })
  })

  describe('Plan.vue 表单含 timeSlot', () => {
    let f
    beforeAll(() => { f = read('src/views/Plan.vue') })

    it('newTask 含 timeSlot 字段', () => {
      expect(f).toMatch(/newTask\s*=\s*ref\(\{[^}]*timeSlot:\s*TIME_SLOT\.ANY/s)
    })

    it('新增表单含 timeSlot PixelSelect', () => {
      expect(f).toContain('v-model="newTask.timeSlot"')
      expect(f).toContain('timeSlotOptions')
    })

    it('saveNewTask 持久化 timeSlot', () => {
      expect(f).toMatch(/save\('tasks'[^}]*timeSlot:\s*newTask\.value\.timeSlot/s)
    })

    it('列表显示时段符号', () => {
      expect(f).toContain('task-list__time-slot')
      expect(f).toContain('timeSlotSymbols[item.timeSlot]')
    })

    it('导入 TIME_SLOT 等常量', () => {
      expect(f).toMatch(/TIME_SLOT[,\s]/)
      expect(f).toMatch(/TIME_SLOT_LABELS[,\s]/)
      expect(f).toMatch(/TIME_SLOT_SYMBOLS[,\s]/)
    })
  })

  describe('Home.vue 今日计划显示时段', () => {
    let f
    beforeAll(() => { f = read('src/views/Home.vue') })

    it('导入 TIME_SLOT_SYMBOLS', () => {
      expect(f).toContain('TIME_SLOT_SYMBOLS')
    })

    it('列表显示 timeSlot 符号', () => {
      expect(f).toContain('today-plan__item-time-slot')
      expect(f).toContain('timeSlotSymbols[item.timeSlot]')
    })

    it('列表显示 timeCost 标记', () => {
      expect(f).toContain('today-plan__item-time-cost')
    })
  })

  describe('aggr.js 返回 timeSlot 字段', () => {
    let f
    beforeAll(() => { f = read('src/db/aggr.js') })

    it('手动任务带 timeSlot', () => {
      expect(f).toMatch(/SOURCE\.MANUAL[\s\S]*?timeSlot:\s*t\.timeSlot\s*\|\|\s*'any'/s)
    })

    it('自媒体任务带 timeSlot', () => {
      expect(f).toMatch(/SOURCE\.MEDIA[\s\S]*?timeSlot:\s*m\.timeSlot\s*\|\|\s*'any'/s)
    })

    it('开发任务带 timeSlot', () => {
      expect(f).toMatch(/SOURCE\.DEV[\s\S]*?timeSlot:\s*t\.timeSlot\s*\|\|\s*'any'/s)
    })

    it('公司事项带 timeSlot', () => {
      expect(f).toMatch(/SOURCE\.COMPANY[\s\S]*?timeSlot:\s*c\.timeSlot\s*\|\|\s*'any'/s)
    })

    it('学习任务带 timeSlot', () => {
      expect(f).toMatch(/SOURCE\.STUDY[\s\S]*?timeSlot:\s*t\.timeSlot\s*\|\|\s*'any'/s)
    })
  })

  describe('其他视图也支持 timeSlot', () => {
    it.each([
      ['Media.vue', 'form.timeSlot', 'media-card__slot', 'item'],
      ['Company.vue', 'form.timeSlot', 'company__item-time-slot', 'item'],
      ['Dev.vue', 'form.timeSlot', 'project-list__time-slot', 'p'],
      ['DevDetail.vue', 'taskForm.timeSlot', 'item-list__time-slot', 't'],
      ['Study.vue', 'form.timeSlot', 'topic-list__time-slot', 't'],
      ['StudyDetail.vue', 'taskForm.timeSlot', 'item-list__time-slot', 't']
    ])('%s 含 timeSlot 字段、表单、列表展示', (file, varRef, className, iterVar) => {
      const f = read(`src/views/${file}`)
      // 表单字段
      expect(f).toContain(`v-model="${varRef}"`)
      // 表单状态含 timeSlot
      expect(f).toMatch(/timeSlot:\s*TIME_SLOT\.ANY/)
      // 列表显示时段符号
      expect(f).toContain(className)
      expect(f).toContain(`timeSlotSymbols[${iterVar}.timeSlot]`)
      // 持久化
      expect(f).toMatch(/timeSlot:\s*\w+\.value\.timeSlot\s*\|\|\s*TIME_SLOT\.ANY/s)
    })
  })
})
