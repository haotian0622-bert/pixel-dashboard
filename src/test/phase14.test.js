import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * 阶段 14 测试：问题1 - 字体加大加粗、层级差异化
 * 验收点：
 *   1. 全局字体替换为 ArkPixel（方舟像素）
 *   2. 根字号加大（18px）
 *   3. body 加粗（font-weight >= 600）
 *   4. 标题层级 h1/h2/h3/h4 字号递减且 font-weight: 700
 *   5. 各 UI 组件字号加大、加粗
 *   6. 各视图局部字号同步加大、加粗
 */

const read = (rel) => readFileSync(resolve(process.cwd(), rel), 'utf-8')

describe('问题1：字体加大加粗、层级差异化', () => {
  describe('全局基础样式（base.css）', () => {
    let base
    beforeAll(() => { base = read('src/styles/base.css') })

    it('替换为 ArkPixel 方舟像素字体', () => {
      expect(base).toContain("'ArkPixel'")
      expect(base).not.toContain("'Zpix'")
      expect(base).toContain('@font-face')
      expect(base).toContain('ark-pixel-16px-proportional-zh_cn.woff2')
    })

    it('根字号加大到 18px', () => {
      expect(base).toMatch(/html\s*{[^}]*font-size:\s*18px/)
    })

    it('body 加粗（font-weight 至少 600）', () => {
      const m = base.match(/body\s*{[^}]*font-weight:\s*(\d+)/)
      expect(m).not.toBeNull()
      expect(Number(m[1])).toBeGreaterThanOrEqual(600)
    })

    it('标题层级 h1/h2/h3/h4 字号递减且加粗', () => {
      const h1 = base.match(/h1\s*{[^}]*font-size:\s*([\d.]+)rem[^}]*font-weight:\s*(\d+)/)
      const h2 = base.match(/h2\s*{[^}]*font-size:\s*([\d.]+)rem[^}]*font-weight:\s*(\d+)/)
      const h3 = base.match(/h3\s*{[^}]*font-size:\s*([\d.]+)rem[^}]*font-weight:\s*(\d+)/)
      const h4 = base.match(/h4\s*{[^}]*font-size:\s*([\d.]+)rem[^}]*font-weight:\s*(\d+)/)

      expect(h1).not.toBeNull()
      expect(h2).not.toBeNull()
      expect(h3).not.toBeNull()
      expect(h4).not.toBeNull()

      expect(Number(h1[1])).toBeGreaterThan(Number(h2[1]))
      expect(Number(h2[1])).toBeGreaterThan(Number(h3[1]))
      expect(Number(h3[1])).toBeGreaterThan(Number(h4[1]))

      expect(Number(h1[2])).toBe(700)
      expect(Number(h2[2])).toBe(700)
      expect(Number(h3[2])).toBe(700)
      expect(Number(h4[2])).toBe(700)
    })

    it('正文段落字号 1rem，small 类更小', () => {
      const p = base.match(/p,\s*li,\s*span,\s*label\s*{[^}]*font-size:\s*([\d.]+)rem/)
      expect(p).not.toBeNull()
      expect(Number(p[1])).toBeGreaterThanOrEqual(1)
      const small = base.match(/small,\s*\.text-sm\s*{[^}]*font-size:\s*([\d.]+)rem/)
      expect(Number(small[1])).toBeLessThan(Number(p[1]))
    })
  })

  describe('UI 组件样式（pixel-ui.css）', () => {
    let ui
    beforeAll(() => { ui = read('src/styles/pixel-ui.css') })

    it('窗口标题栏字号加大、加粗', () => {
      const m = ui.match(/\.pixel-window__titlebar\s*{[^}]*font-size:\s*([\d.]+)rem[^}]*font-weight:\s*(\d+)/s)
      expect(m).not.toBeNull()
      expect(Number(m[1])).toBeGreaterThanOrEqual(1)
      expect(Number(m[2])).toBeGreaterThanOrEqual(700)
    })

    it('按钮字号加大、加粗', () => {
      const m = ui.match(/\.pixel-btn\s*{[^}]*font-size:\s*([\d.]+)rem[^}]*font-weight:\s*(\d+)/s)
      expect(m).not.toBeNull()
      expect(Number(m[1])).toBeGreaterThanOrEqual(1)
      expect(Number(m[2])).toBeGreaterThanOrEqual(700)
    })

    it('输入框字号加大、加粗', () => {
      const m = ui.match(/\.pixel-input\s*{[^}]*font-size:\s*([\d.]+)rem[^}]*font-weight:\s*(\d+)/s)
      expect(m).not.toBeNull()
      expect(Number(m[1])).toBeGreaterThanOrEqual(1)
      expect(Number(m[2])).toBeGreaterThanOrEqual(600)
    })

    it('侧栏分组标题字号加大、加粗', () => {
      const m = ui.match(/\.sidebar-nav__group-title\s*{[^}]*font-size:\s*([\d.]+)rem[^}]*font-weight:\s*(\d+)/s)
      expect(m).not.toBeNull()
      expect(Number(m[1])).toBeGreaterThanOrEqual(0.8)
      expect(Number(m[2])).toBeGreaterThanOrEqual(700)
    })

    it('侧栏菜单项字号加大、加粗', () => {
      const m = ui.match(/\.sidebar-nav__item\s*{[^}]*font-size:\s*([\d.]+)rem[^}]*font-weight:\s*(\d+)/s)
      expect(m).not.toBeNull()
      expect(Number(m[1])).toBeGreaterThanOrEqual(1)
      expect(Number(m[2])).toBeGreaterThanOrEqual(600)
    })
  })

  describe('像素组件 .vue', () => {
    it('PixelProgress 使用 ArkPixel 且字号加大', () => {
      const f = read('src/components/PixelProgress.vue')
      expect(f).not.toContain("'Zpix'")
      expect(f).toContain("'ArkPixel'")
      // 容器或段块任一处声明 font-size: ≥1.2rem，font-weight: ≥700
      const style = f.match(/<style[^>]*>([\s\S]*?)<\/style>/)[1]
      const sizes = [...style.matchAll(/font-size:\s*([\d.]+)rem/g)].map(m => Number(m[1]))
      const weights = [...style.matchAll(/font-weight:\s*(\d+)/g)].map(m => Number(m[1]))
      expect(Math.max(...sizes)).toBeGreaterThanOrEqual(1.2)
      expect(Math.max(...weights)).toBeGreaterThanOrEqual(700)
    })

    it('PixelWindow 标题栏字号加大', () => {
      const f = read('src/components/PixelWindow.vue')
      const m = f.match(/\.pixel-window__titlebar\s*{[^}]*font-size:\s*([\d.]+)rem[^}]*font-weight:\s*(\d+)/s)
      expect(m).not.toBeNull()
      expect(Number(m[1])).toBeGreaterThanOrEqual(1.05)
      expect(Number(m[2])).toBeGreaterThanOrEqual(700)
    })

    it('PixelInput 字号加大、加粗', () => {
      const f = read('src/components/PixelInput.vue')
      const m = f.match(/\.pixel-input\s*{[^}]*font-size:\s*([\d.]+)rem[^}]*font-weight:\s*(\d+)/s)
      expect(m).not.toBeNull()
      expect(Number(m[1])).toBeGreaterThanOrEqual(1)
      expect(Number(m[2])).toBeGreaterThanOrEqual(600)
    })

    it('PixelButton 字号加大、加粗', () => {
      const f = read('src/components/PixelButton.vue')
      const m = f.match(/\.pixel-btn\s*{[^}]*font-size:\s*([\d.]+)rem[^}]*font-weight:\s*(\d+)/s)
      expect(m).not.toBeNull()
      expect(Number(m[1])).toBeGreaterThanOrEqual(1)
      expect(Number(m[2])).toBeGreaterThanOrEqual(700)
    })

    it('PixelSidebar 分组标题和菜单项字号加大', () => {
      const f = read('src/components/PixelSidebar.vue')
      const t = f.match(/\.sidebar-nav__group-title\s*{[^}]*font-size:\s*([\d.]+)rem[^}]*font-weight:\s*(\d+)/s)
      const i = f.match(/\.sidebar-nav__item\s*{[^}]*font-size:\s*([\d.]+)rem[^}]*font-weight:\s*(\d+)/s)
      expect(t).not.toBeNull()
      expect(i).not.toBeNull()
      expect(Number(t[1])).toBeGreaterThanOrEqual(0.8)
      expect(Number(i[1])).toBeGreaterThanOrEqual(1)
    })
  })

  describe('各视图字号差异化（避免全 .85rem 一刀切）', () => {
    const views = [
      'src/views/Home.vue',
      'src/views/Plan.vue',
      'src/views/Media.vue',
      'src/views/Dev.vue',
      'src/views/DevDetail.vue',
      'src/views/Company.vue',
      'src/views/Fitness.vue',
      'src/views/Study.vue',
      'src/views/StudyDetail.vue',
      'src/views/Finance.vue',
      'src/views/Settings.vue'
    ]

    it.each(views)('%s 已提升字号（无残留 0.6/0.65/0.7/0.75/0.8/0.85rem 小号）', (rel) => {
      const f = read(rel)
      // 抓 style 块内的 font-size 声明
      const styleMatch = f.match(/<style[^>]*>([\s\S]*?)<\/style>/)
      if (!styleMatch) return // 无样式块则跳过
      const css = styleMatch[1]
      const sizes = [...css.matchAll(/font-size:\s*([\d.]+)rem/g)].map(m => Number(m[1]))
      const tiny = sizes.filter(s => s < 0.9)
      // 允许少量小号（如 active::before 的 ▶ 图标），但不能有大面积小号
      expect(tiny.length).toBeLessThan(sizes.length * 0.3)
    })

    it('Home.vue 标题加大并加粗', () => {
      const f = read('src/views/Home.vue')
      const date = f.match(/\.home__date\s*{[^}]*font-size:\s*([\d.]+)rem[^}]*font-weight:\s*(\d+)/s)
      expect(date).not.toBeNull()
      expect(Number(date[1])).toBeGreaterThanOrEqual(1.8)
      expect(Number(date[2])).toBeGreaterThanOrEqual(700)
    })

    it('Home.vue 摘要卡数字加大', () => {
      const f = read('src/views/Home.vue')
      const num = f.match(/\.summary-card__number\s*{[^}]*font-size:\s*([\d.]+)rem[^}]*font-weight:\s*(\d+)/s)
      expect(num).not.toBeNull()
      expect(Number(num[1])).toBeGreaterThanOrEqual(1.3)
      expect(Number(num[2])).toBeGreaterThanOrEqual(700)
    })

    it('Home.vue 今日计划项加粗', () => {
      const f = read('src/views/Home.vue')
      const item = f.match(/\.today-plan__item\s*{[^}]*font-size:\s*([\d.]+)rem[^}]*font-weight:\s*(\d+)/s)
      expect(item).not.toBeNull()
      expect(Number(item[1])).toBeGreaterThanOrEqual(1)
      expect(Number(item[2])).toBeGreaterThanOrEqual(600)
    })
  })
})
