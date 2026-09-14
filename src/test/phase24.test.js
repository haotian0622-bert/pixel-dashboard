import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { createPinia } from 'pinia'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import Settings from '../views/Settings.vue'
import { initDB, closeDB, DB_NAME, DB_VERSION } from '../db/init'
import { clear, save } from '../db/dao'
import { STORES } from '../utils/constants'

/**
 * 阶段 24 测试：问题11 - 设置增加手动保存按钮与保存地址显示
 */

const BACKUP_KEY = 'pixel-dashboard:last-backup'

function mockRouter() {
  return createRouter({ history: createMemoryHistory(), routes: [{ path: '/settings', name: 'settings', component: Settings }] })
}
async function mountSettings() {
  const wrapper = mount(Settings, { global: { plugins: [createPinia(), mockRouter()] } })
  await flushPromises(); await new Promise(r => setTimeout(r, 50)); await flushPromises()
  return wrapper
}
const read = (rel) => readFileSync(resolve(process.cwd(), rel), 'utf-8')

describe('问题11：设置-手动保存与保存地址', () => {
  let clickSpy
  beforeEach(async () => {
    closeDB(); await initDB()
    for (const s of STORES) await clear(s)
    localStorage.removeItem(BACKUP_KEY)
    // jsdom 不实现下载链路
    URL.createObjectURL = vi.fn(() => 'blob:mock')
    URL.revokeObjectURL = vi.fn()
    clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('源码：含手动保存按钮、保存地址与备份记录逻辑', () => {
    const f = read('src/views/Settings.vue')
    expect(f).toContain('手动保存')
    expect(f).toContain('保存地址')
    expect(f).toContain('doManualSave')
    expect(f).toContain('lastBackup')
    expect(f).toContain('localStorage')
    expect(f).toContain('downloadBackup')
    expect(f).toContain('recordCount')
    expect(f).toMatch(/C:\\\\Users\\\\<你的用户名>\\\\Downloads/)
  })

  it('DB_NAME / DB_VERSION 可从 init 模块导入', () => {
    expect(DB_NAME).toBe('pixel-dashboard')
    expect(DB_VERSION).toBe(2)
  })

  it('页面展示保存地址：IndexedDB 数据库名、来源、下载文件夹', async () => {
    const wrapper = await mountSettings()
    const text = wrapper.text()
    expect(text).toContain('IndexedDB')
    expect(text).toContain('pixel-dashboard')
    expect(text).toContain(`v${DB_VERSION}`)
    expect(text).toContain(window.location.origin)
    expect(text).toContain('下载')
    expect(text).toContain('共 0 条记录')
    expect(text).toContain('尚未手动保存过')
  })

  it('当前数据量统计正确', async () => {
    await save('memos', { content: '一' })
    await save('memos', { content: '二' })
    const wrapper = await mountSettings()
    await flushPromises()
    expect(wrapper.text()).toContain('共 2 条记录')
  })

  it('点击“立即保存”导出 JSON、显示成功信息并记录上次保存', async () => {
    await save('memos', { content: '备份我' })
    const wrapper = await mountSettings()
    const btn = wrapper.findAll('button').find(b => b.text().includes('立即保存'))
    expect(btn).toBeDefined()
    await btn.trigger('click')
    await flushPromises(); await new Promise(r => setTimeout(r, 50))

    // 触发了下载
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1)
    expect(clickSpy).toHaveBeenCalledTimes(1)

    const text = wrapper.text()
    expect(text).toContain('保存成功')
    expect(text).toMatch(/pixel-dashboard-\d{8}\.json/)
    expect(text).toContain('上次保存')

    // 备份记录写入 localStorage
    const stored = JSON.parse(localStorage.getItem(BACKUP_KEY))
    expect(stored.fileName).toMatch(/^pixel-dashboard-\d{8}\.json$/)
    expect(stored.time).toBeDefined()
  })

  it('重新进入页面后仍显示上次保存信息', async () => {
    localStorage.setItem(BACKUP_KEY, JSON.stringify({ fileName: 'pixel-dashboard-20260920.json', time: '2026/9/20 10:00:00' }))
    const wrapper = await mountSettings()
    const text = wrapper.text()
    expect(text).toContain('上次保存')
    expect(text).toContain('pixel-dashboard-20260920.json')
    expect(text).toContain('2026/9/20 10:00:00')
    expect(text).not.toContain('尚未手动保存过')
  })

  it('原导出/清空/主题功能不受影响', async () => {
    const wrapper = await mountSettings()
    expect(wrapper.findAll('button').some(b => b.text().includes('导出数据'))).toBe(true)
    expect(wrapper.findAll('button').some(b => b.text().includes('清空'))).toBe(true)
    expect(wrapper.text()).toContain('浅色')
    expect(wrapper.text()).toContain('深色')
    expect(wrapper.text()).toContain('跟随系统')
  })
})
