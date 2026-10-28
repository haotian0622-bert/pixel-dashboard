import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * 阶段 12 测试：响应式适配
 * 验证各视图 CSS 包含 @media 响应式规则
 */

function readView(fileName) {
  return readFileSync(
    resolve(process.cwd(), `src/views/${fileName}`),
    'utf-8'
  )
}

describe('阶段12：响应式适配', () => {
  it('首页 CSS 包含窄屏响应式规则', () => {
    const css = readView('Home.vue')
    expect(css).toContain('@media')
    expect(css).toContain('max-width: 768px')
    // 便签网格和摘要卡应变单列
    expect(css).toContain('grid-template-columns: 1fr')
  })

  it('计划模块 CSS 包含窄屏响应式规则', () => {
    const css = readView('Plan.vue')
    expect(css).toContain('@media')
    expect(css).toContain('max-width: 768px')
    // 周视图始终 7 列横滑（用户需求调整：不再改 2 列）
    expect(css).toContain('repeat(7,')
  })

  it('健身模块 CSS 包含窄屏响应式规则', () => {
    const css = readView('Fitness.vue')
    expect(css).toContain('@media')
    expect(css).toContain('max-width: 768px')
  })

  it('收支模块 CSS 包含窄屏响应式规则', () => {
    const css = readView('Finance.vue')
    expect(css).toContain('@media')
    expect(css).toContain('max-width: 768px')
    // 汇总应变纵向
    expect(css).toContain('flex-direction: column')
  })

  it('侧边栏 CSS 包含窄屏收成图标条规则', () => {
    const css = readFileSync(
      resolve(process.cwd(), 'src/components/PixelSidebar.vue'),
      'utf-8'
    )
    expect(css).toContain('@media')
    expect(css).toContain('max-width: 768px')
    expect(css).toContain('48px') // 收窄到 48px 图标条
  })

  it('pixel-ui.css 全局响应式规则存在', () => {
    const css = readFileSync(
      resolve(process.cwd(), 'src/styles/pixel-ui.css'),
      'utf-8'
    )
    expect(css).toContain('@media (max-width: 768px)')
  })

  it('各模块视图 CSS 无水平溢出（无固定大宽度）', () => {
    const files = ['Home.vue', 'Plan.vue', 'Media.vue', 'Dev.vue', 'DevDetail.vue', 'Company.vue', 'Fitness.vue', 'Study.vue', 'StudyDetail.vue', 'Finance.vue', 'Settings.vue']
    for (const f of files) {
      const css = readView(f)
      // 不应有超过 900px 的固定宽度
      expect(css).not.toMatch(/width:\s*\d{4,}px/)
    }
  })
})
