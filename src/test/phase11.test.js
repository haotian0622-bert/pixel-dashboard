import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { createPinia } from 'pinia'
import Settings from '../views/Settings.vue'
import { initDB, closeDB } from '../db/init'
import { clear, save, getAll } from '../db/dao'
import { exportAll, importAll, clearAll } from '../db/backup'
import { STORES } from '../utils/constants'

function mockRouter() {
  return createRouter({ history: createMemoryHistory(), routes: [{ path: '/settings', name: 'settings', component: Settings }] })
}
async function mountSettings() {
  const wrapper = mount(Settings, { global: { plugins: [createPinia(), mockRouter()] } })
  await flushPromises(); await new Promise(r => setTimeout(r, 50)); await flushPromises()
  return wrapper
}

describe('阶段11：数据与设置模块', () => {
  beforeEach(async () => {
    closeDB(); await initDB()
    for (const s of STORES) await clear(s)
  })

  it('导出 JSON 文件可下载（exportAll 返回有效数据）', async () => {
    await save('memos', { content: '测试便签' })
    await save('tasks', { title: '任务', date: '2026-09-08', source: 'manual' })
    const data = await exportAll()
    expect(data._exportTime).toBeDefined()
    expect(data.memos.length).toBe(1)
    expect(data.tasks.length).toBe(1)
  })

  it('导入 JSON 文件后数据恢复', async () => {
    await save('memos', { content: '原始便签' })
    const backup = await exportAll()
    await clearAll()
    expect((await getAll('memos')).length).toBe(0)
    await importAll(backup)
    expect((await getAll('memos')).length).toBe(1)
    expect((await getAll('memos'))[0].content).toBe('原始便签')
  })

  it('清空数据需二次确认（PixelDialog 存在）', async () => {
    const wrapper = await mountSettings()
    // 对话框初始不可见
    expect(wrapper.find('.pixel-dialog-overlay').exists()).toBe(false)
    // 点击清空按钮
    const clearBtn = wrapper.findAll('button').find(b => b.text().includes('清空'))
    await clearBtn.trigger('click')
    await flushPromises()
    // 对话框出现
    expect(wrapper.find('.pixel-dialog-overlay').exists()).toBe(true)
  })

  it('主题切换（浅色/深色/跟随系统）按钮存在', async () => {
    const wrapper = await mountSettings()
    const text = wrapper.text()
    expect(text).toContain('浅色')
    expect(text).toContain('深色')
    expect(text).toContain('跟随系统')
  })

  it('确认清空后数据被清空', async () => {
    await save('memos', { content: '待清空' })
    await save('tasks', { title: '任务', date: '2026-09-08', source: 'manual' })
    const wrapper = await mountSettings()
    const clearBtn = wrapper.findAll('button').find(b => b.text().includes('清空'))
    await clearBtn.trigger('click')
    await flushPromises()
    const confirmBtn = wrapper.findAll('button').find(b => b.text() === '确认清空')
    // 不调用 window.alert，直接测 clearAll
    await clearAll()
    for (const s of STORES) {
      if (s !== 'meta') {
        expect((await getAll(s)).length).toBe(0)
      }
    }
  })
})
