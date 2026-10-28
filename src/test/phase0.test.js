import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * 阶段 0 测试：项目初始化
 * 验证项目骨架、配置文件、路由结构、CSS 变量是否就位
 */

describe('阶段0：项目初始化', () => {
  // 0.1 验证 vite.config.js 配置了 base: './'，构建产物可 file:// 打开
  it('vite.config.js 配置了 base 为相对路径', () => {
    const config = readFileSync(resolve(process.cwd(), 'vite.config.js'), 'utf-8')
    expect(config).toContain("base: './'")
  })

  // 0.2 验证 package.json 包含必要依赖
  it('package.json 包含 Vue / Pinia / Vue Router 依赖', () => {
    const pkg = JSON.parse(
      readFileSync(resolve(process.cwd(), 'package.json'), 'utf-8')
    )
    expect(pkg.dependencies).toHaveProperty('vue')
    expect(pkg.dependencies).toHaveProperty('pinia')
    expect(pkg.dependencies).toHaveProperty('vue-router')
  })

  // 0.3 验证 index.html 存在且有 #app 挂载点
  it('index.html 存在且有 #app 挂载点和 main.js 入口', () => {
    const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf-8')
    expect(html).toContain('id="app"')
    expect(html).toContain('src="/src/main.js"')
  })

  // 0.4 验证路由配置（开发模块已移除，新增抽卡小游戏）
  it('路由配置包含全部模块路由', async () => {
    const routerModule = await import('../router/index.js')
    const routes = routerModule.default.options.routes
    const routeNames = routes.map(r => r.name)
    expect(routeNames).toContain('home')
    expect(routeNames).toContain('plan')
    expect(routeNames).toContain('media')
    expect(routeNames).toContain('company')
    expect(routeNames).toContain('fitness')
    expect(routeNames).toContain('study')
    expect(routeNames).toContain('studyDetail')
    expect(routeNames).toContain('finance')
    expect(routeNames).toContain('game')
    expect(routeNames).toContain('settings')
    expect(routeNames).not.toContain('dev')
    expect(routes.length).toBe(10) // 8 个模块 + 1 个详情子页 + 游戏
  })

  // 0.5 验证 CSS 变量包含日间和夜间主题
  it('CSS 变量文件包含日间和夜间双主题', () => {
    const css = readFileSync(
      resolve(process.cwd(), 'src/styles/variables.css'),
      'utf-8'
    )
    expect(css).toContain('[data-theme="light"]')
    expect(css).toContain('[data-theme="dark"]')
    // 模块专属色变量
    expect(css).toContain('--c-plan')
    expect(css).toContain('--c-media')
    expect(css).toContain('--c-dev')
    expect(css).toContain('--c-company')
    expect(css).toContain('--c-fitness')
    expect(css).toContain('--c-study')
    expect(css).toContain('--c-finance')
    expect(css).toContain('--c-settings')
  })

  // 0.6 验证像素 UI 样式包含核心控件类
  it('pixel-ui.css 包含核心像素控件样式类', () => {
    const css = readFileSync(
      resolve(process.cwd(), 'src/styles/pixel-ui.css'),
      'utf-8'
    )
    expect(css).toContain('.pixel-window')
    expect(css).toContain('.pixel-btn')
    expect(css).toContain('.pixel-btn--confirm')
    expect(css).toContain('.pixel-btn--cancel')
    expect(css).toContain('.pixel-input')
    expect(css).toContain('.pixel-scroll')
    expect(css).toContain('.pixel-progress')
    expect(css).toContain('.sidebar-nav')
    expect(css).toContain('.task-checkbox')
  })

  // 0.7 验证测试环境已加载 fake-indexeddb
  it('fake-indexeddb 已加载（indexedDB 可用）', () => {
    expect(typeof indexedDB).toBe('object')
    expect(typeof indexedDB.open).toBe('function')
  })
})
