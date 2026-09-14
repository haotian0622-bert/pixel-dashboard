import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * 阶段 16 测试：问题3 - 首页今日计划进度条放大显眼
 */

const read = (rel) => readFileSync(resolve(process.cwd(), rel), 'utf-8')

describe('问题3：首页今日计划进度条放大显眼', () => {
  describe('PixelProgress 组件', () => {
    let f
    beforeAll(() => { f = read('src/components/PixelProgress.vue') })

    it('段块字号至少 2rem（明显放大）', () => {
      const m = f.match(/\.pixel-progress__segment\s*{[^}]*font-size:\s*([\d.]+)rem/s)
      expect(m).not.toBeNull()
      expect(Number(m[1])).toBeGreaterThanOrEqual(2)
    })

    it('段块字号加粗 700', () => {
      const style = f.match(/<style[^>]*>([\s\S]*?)<\/style>/)[1]
      // 容器或段块任一处声明 font-weight: 700 即可
      expect(style).toMatch(/font-weight:\s*700/)
    })

    it('段块容器有边框/背景（更显眼）', () => {
      const m = f.match(/\.pixel-progress__bar\s*{([^}]*)}/s)
      expect(m).not.toBeNull()
      expect(m[1]).toMatch(/border/)
      expect(m[1]).toMatch(/background/)
      expect(m[1]).toMatch(/padding/)
    })

    it('标签字号至少 1.2rem（数字大显眼）', () => {
      const m = f.match(/\.pixel-progress__label\s*{[^}]*font-size:\s*([\d.]+)rem/s)
      expect(m).not.toBeNull()
      expect(Number(m[1])).toBeGreaterThanOrEqual(1.2)
    })

    it('段块用 accent 色（已填部分）', () => {
      const m = f.match(/\.pixel-progress__segment--filled\s*{[^}]*color:\s*var\(--accent\)/s)
      expect(m).not.toBeNull()
    })

    it('段块用 text 色（未填部分）', () => {
      const m = f.match(/\.pixel-progress__segment--empty\s*{[^}]*color:\s*var\(--text\)/s)
      expect(m).not.toBeNull()
    })
  })

  describe('Home.vue 今日计划区 stats', () => {
    let f
    beforeAll(() => { f = read('src/views/Home.vue') })

    it('stats 区有边框/背景/阴影（视觉强化）', () => {
      const m = f.match(/\.today-plan__stats\s*{([^}]*)}/s)
      expect(m).not.toBeNull()
      expect(m[1]).toMatch(/border/)
      expect(m[1]).toMatch(/background/)
      expect(m[1]).toMatch(/box-shadow/)
    })

    it('stats 字号至少 1.2rem', () => {
      const m = f.match(/\.today-plan__stats\s*{[^}]*font-size:\s*([\d.]+)rem/s)
      expect(m).not.toBeNull()
      expect(Number(m[1])).toBeGreaterThanOrEqual(1.2)
    })

    it('stats 区加粗 700', () => {
      const m = f.match(/\.today-plan__stats\s*{[^}]*font-weight:\s*700/s)
      expect(m).not.toBeNull()
    })

    it('今日计划区使用 PixelProgress 组件', () => {
      expect(f).toContain('PixelProgress')
      expect(f).toContain(':value="todayProgress"')
    })
  })
})
