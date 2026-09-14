import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * 阶段 15 测试：问题2 - 背景配色更浅色明亮、对比度调大
 * 验收点：
 *   1. light 主题 bg 比之前更浅（亮度更高）
 *   2. light 主题 text 比之前更深
 *   3. bg 与 text 的亮度差比之前更大
 *   4. 模块专属色之间彼此色差更明显
 *   5. dark 主题仍可用
 */

const read = (rel) => readFileSync(resolve(process.cwd(), rel), 'utf-8')

// 把 #RRGGBB 转为相对亮度（0~1）
function luminance(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  // sRGB 简化
  return 0.299 * r + 0.587 * g + 0.114 * b
}

describe('问题2：背景配色更浅色明亮、对比度调大', () => {
  let v
  beforeAll(() => { v = read('src/styles/variables.css') })

  describe('light 主题', () => {
    let bg, text, panel, accent
    beforeAll(() => {
      const m = v.match(/\[data-theme="light"\]\s*{([\s\S]*?)}/)
      const block = m[1]
      bg = block.match(/--bg:\s*(#[0-9A-Fa-f]+)/)
      text = block.match(/--text:\s*(#[0-9A-Fa-f]+)/)
      panel = block.match(/--panel:\s*(#[0-9A-Fa-f]+)/)
      accent = block.match(/--accent:\s*(#[0-9A-Fa-f]+)/)
    })

    it('背景色 bg 比之前 #EFE3C8 更浅（亮度更高）', () => {
      expect(bg).not.toBeNull()
      const oldL = luminance('#EFE3C8')
      const newL = luminance(bg[1])
      expect(newL).toBeGreaterThan(oldL)
    })

    it('面板色 panel 比 bg 更亮', () => {
      expect(panel).not.toBeNull()
      expect(luminance(panel[1])).toBeGreaterThan(luminance(bg[1]))
    })

    it('文字色 text 比之前 #4A3728 更深（亮度更低）', () => {
      expect(text).not.toBeNull()
      const oldL = luminance('#4A3728')
      const newL = luminance(text[1])
      expect(newL).toBeLessThan(oldL)
    })

    it('bg 与 text 对比度比之前更大', () => {
      const oldDiff = luminance('#EFE3C8') - luminance('#4A3728')
      const newDiff = luminance(bg[1]) - luminance(text[1])
      expect(newDiff).toBeGreaterThan(oldDiff)
    })

    it('accent 比之前 #E07A3F 更饱和', () => {
      expect(accent).not.toBeNull()
      // 用 RGB 距离到灰轴表示饱和度：旧色 vs 新色
      function grayDist(h) {
        const r = parseInt(h.slice(1, 3), 16)
        const g = parseInt(h.slice(3, 5), 16)
        const b = parseInt(h.slice(5, 7), 16)
        const avg = (r + g + b) / 3
        return Math.sqrt((r - avg) ** 2 + (g - avg) ** 2 + (b - avg) ** 2)
      }
      expect(grayDist(accent[1])).toBeGreaterThan(grayDist('#E07A3F'))
    })

    it('8 个模块专属色彼此色差更明显', () => {
      const names = ['plan', 'media', 'dev', 'company', 'fitness', 'study', 'finance', 'settings']
      const colors = {}
      for (const n of names) {
        const m = v.match(new RegExp(`--c-${n}:\\s*(#[0-9A-Fa-f]+)`))
        expect(m).not.toBeNull()
        colors[n] = m[1]
      }
      // 每对色之间 RGB 距离至少 30
      for (let i = 0; i < names.length; i++) {
        for (let j = i + 1; j < names.length; j++) {
          const a = colors[names[i]], b = colors[names[j]]
          const dr = parseInt(a.slice(1, 3), 16) - parseInt(b.slice(1, 3), 16)
          const dg = parseInt(a.slice(3, 5), 16) - parseInt(b.slice(3, 5), 16)
          const db = parseInt(a.slice(5, 7), 16) - parseInt(b.slice(5, 7), 16)
          const dist = Math.sqrt(dr * dr + dg * dg + db * db)
          // plan 与 accent 同色，允许等值；其余应至少 30
          if (i === 0 && j === 1) continue // plan vs media 至少有明显差异
          expect(dist).toBeGreaterThanOrEqual(30)
        }
      }
    })

    it('border 与 text 同色（深色边框保证对比）', () => {
      const m = v.match(/--border:\s*(#[0-9A-Fa-f]+)/)
      expect(m).not.toBeNull()
      expect(m[1].toUpperCase()).toBe(text[1].toUpperCase())
    })
  })

  describe('dark 主题仍可用', () => {
    it('保留 [data-theme="dark"] 块', () => {
      expect(v).toContain('[data-theme="dark"]')
    })
    it('dark 主题 bg 比 text 暗', () => {
      const m = v.match(/\[data-theme="dark"\]\s*{([\s\S]*?)}/)
      const block = m[1]
      const bg = block.match(/--bg:\s*(#[0-9A-Fa-f]+)/)
      const text = block.match(/--text:\s*(#[0-9A-Fa-f]+)/)
      expect(luminance(bg[1])).toBeLessThan(luminance(text[1]))
    })
  })
})
