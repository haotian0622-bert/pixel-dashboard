import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * 阶段 17 测试：问题4 - 新增项目/任务增加时间消耗填写项
 * 验收点：各模块新增表单含 timeCost/duration 字段，列表展示带耗时标记
 */

const read = (rel) => readFileSync(resolve(process.cwd(), rel), 'utf-8')
const CLOCK = '\u23F1'

describe('问题4：新增项目/任务增加时间消耗填写项', () => {
  describe('Plan.vue（手动任务）', () => {
    let f
    beforeAll(() => { f = read('src/views/Plan.vue') })

    it('新增表单含 timeCost 输入', () => {
      expect(f).toContain('newTask.timeCost')
      expect(f).toMatch(/type="number"[^>]*v-model\.number="newTask\.timeCost"/s)
    })

    it('newTask 初始含 timeCost: 0', () => {
      expect(f).toMatch(/newTask\s*=\s*ref\(\{[^}]*timeCost:\s*0/s)
    })

    it('saveNewTask 持久化 timeCost', () => {
      expect(f).toMatch(/save\('tasks'[^}]*timeCost:\s*Number\(newTask\.value\.timeCost\)/s)
    })

    it('编辑表单含 timeCost', () => {
      expect(f).toContain('editingTask.timeCost')
    })

    it('列表显示耗时标记', () => {
      expect(f).toContain('task-list__time-cost')
      expect(f).toContain(CLOCK + '{{ item.timeCost }}h')
    })
  })

  describe('Media.vue（自媒体点子）', () => {
    let f
    beforeAll(() => { f = read('src/views/Media.vue') })

    it('表单含 timeCost', () => {
      expect(f).toContain('form.timeCost')
    })

    it('saveIdea 持久化 timeCost', () => {
      expect(f).toMatch(/timeCost:\s*Number\(form\.value\.timeCost\)/s)
    })

    it('列表显示耗时标记', () => {
      expect(f).toContain('media-card__time')
      expect(f).toContain(CLOCK + '{{ item.timeCost }}h')
    })
  })

  describe('Dev.vue（开发项目）', () => {
    let f
    beforeAll(() => { f = read('src/views/Dev.vue') })

    it('表单含 timeCost', () => {
      expect(f).toContain('form.timeCost')
    })

    it('saveProject 持久化 timeCost', () => {
      expect(f).toMatch(/timeCost:\s*Number\(form\.value\.timeCost\)/s)
    })

    it('列表显示耗时标记', () => {
      expect(f).toContain('project-list__time-cost')
      expect(f).toContain(CLOCK + '{{ p.timeCost }}h')
    })
  })

  describe('DevDetail.vue（开发任务）', () => {
    let f
    beforeAll(() => { f = read('src/views/DevDetail.vue') })

    it('新增任务表单含 timeCost', () => {
      expect(f).toContain('taskForm.timeCost')
    })

    it('saveTask 持久化 timeCost', () => {
      expect(f).toMatch(/timeCost:\s*Number\(taskForm\.value\.timeCost\)/s)
    })

    it('列表显示耗时标记', () => {
      expect(f).toContain('item-list__time-cost')
      expect(f).toContain(CLOCK + '{{ t.timeCost }}h')
    })
  })

  describe('Company.vue（公司事项）', () => {
    let f
    beforeAll(() => { f = read('src/views/Company.vue') })

    it('表单含 timeCost', () => {
      expect(f).toContain('form.timeCost')
    })

    it('saveItem 持久化 timeCost', () => {
      expect(f).toMatch(/timeCost:\s*Number\(form\.value\.timeCost\)/s)
    })

    it('列表显示耗时标记', () => {
      expect(f).toContain('company__item-time-cost')
      expect(f).toContain(CLOCK + '{{ item.timeCost }}h')
    })
  })

  describe('Fitness.vue（训练排程）', () => {
    let f
    beforeAll(() => { f = read('src/views/Fitness.vue') })

    it('排程表单含 duration', () => {
      expect(f).toContain('scheduleForm.duration')
    })

    it('saveSchedule 持久化 duration', () => {
      expect(f).toMatch(/duration:\s*Number\(scheduleForm\.value\.duration\)/s)
    })

    it('日历卡显示耗时', () => {
      expect(f).toContain('fitness__day-duration')
      expect(f).toContain(CLOCK + '{{ schedule[day].duration }}min')
    })
  })

  describe('Study.vue（学习主题）', () => {
    let f
    beforeAll(() => { f = read('src/views/Study.vue') })

    it('表单含 timeCost', () => {
      expect(f).toContain('form.timeCost')
    })

    it('saveTopic 持久化 timeCost', () => {
      expect(f).toMatch(/timeCost:\s*Number\(form\.value\.timeCost\)/s)
    })

    it('列表显示耗时标记', () => {
      expect(f).toContain('topic-list__time-cost')
      expect(f).toContain(CLOCK + '{{ t.timeCost }}h')
    })
  })

  describe('StudyDetail.vue（学习任务）', () => {
    let f
    beforeAll(() => { f = read('src/views/StudyDetail.vue') })

    it('表单含 timeCost', () => {
      expect(f).toContain('taskForm.timeCost')
    })

    it('saveTask 持久化 timeCost', () => {
      expect(f).toMatch(/timeCost:\s*Number\(taskForm\.value\.timeCost\)/s)
    })

    it('列表显示耗时标记', () => {
      expect(f).toContain('item-list__time-cost')
      expect(f).toContain(CLOCK + '{{ t.timeCost }}h')
    })
  })
})
