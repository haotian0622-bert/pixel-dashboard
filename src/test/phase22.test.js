import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { createPinia } from 'pinia'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import Dev from '../views/Dev.vue'
import DevDetail from '../views/DevDetail.vue'
import { initDB, closeDB, STORE_INDEXES } from '../db/init'
import { clear, save, getAll, query } from '../db/dao'
import {
  STORES,
  DEV_PROJECT_STATUS,
  DEV_PROJECT_STATUS_LABELS,
  DEV_TASK_KIND,
  DEV_TASK_KIND_LABELS,
  MILESTONE_STATUS
} from '../utils/constants'
import { today } from '../utils/date'

/**
 * 阶段 22 测试：问题9 - 开发工作模块大改
 * 项目字段扩展 / 里程碑小旗子主页看板 / 工作项四分类 / 开发日志
 */

function mockRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/dev', name: 'dev', component: Dev },
      { path: '/dev/:id', name: 'devDetail', component: DevDetail }
    ]
  })
}
async function mountDev() {
  const wrapper = mount(Dev, { global: { plugins: [createPinia(), mockRouter()] } })
  await flushPromises(); await new Promise(r => setTimeout(r, 50)); await flushPromises()
  return wrapper
}
async function mountDevDetail(id) {
  const router = mockRouter()
  router.push(`/dev/${id}`)
  await router.isReady()
  const wrapper = mount(DevDetail, { global: { plugins: [createPinia(), router] } })
  await flushPromises(); await new Promise(r => setTimeout(r, 50)); await flushPromises()
  return wrapper
}
async function waitFor(fn, t = 2000) { return vi.waitFor(fn, { timeout: t, interval: 50 }) }
const read = (rel) => readFileSync(resolve(process.cwd(), rel), 'utf-8')

describe('问题9：开发工作模块大改', () => {
  beforeEach(async () => {
    closeDB(); await initDB()
    for (const s of STORES) await clear(s)
  })

  describe('常量与数据库', () => {
    it('DEV_PROJECT_STATUS_LABELS 使用待开始/进行中/已完结', () => {
      expect(DEV_PROJECT_STATUS_LABELS.planning).toBe('待开始')
      expect(DEV_PROJECT_STATUS_LABELS.active).toBe('进行中')
      expect(DEV_PROJECT_STATUS_LABELS.done).toBe('已完结')
    })

    it('DEV_TASK_KIND 定义功能/需求/Bug/技术问题四类', () => {
      expect(DEV_TASK_KIND).toMatchObject({
        FEATURE: 'feature',
        REQUIREMENT: 'requirement',
        BUG: 'bug',
        TECH: 'tech'
      })
      expect(DEV_TASK_KIND_LABELS.feature).toBe('功能')
      expect(DEV_TASK_KIND_LABELS.requirement).toBe('需求')
      expect(DEV_TASK_KIND_LABELS.bug).toBe('Bug')
      expect(DEV_TASK_KIND_LABELS.tech).toBe('技术问题')
    })

    it('新增 devLogs store 并带 projectId/date 索引，DB 版本升级到 2', () => {
      expect(STORES).toContain('devLogs')
      expect(STORE_INDEXES.devLogs.map(i => i.name)).toEqual(expect.arrayContaining(['projectId', 'date']))
      const initSrc = read('src/db/init.js')
      expect(initSrc).toMatch(/DB_VERSION\s*=\s*2/)
    })

    it('devLogs 可存取并按 projectId 查询', async () => {
      const p = await save('devProjects', { name: 'P', status: 'active' })
      await save('devLogs', { projectId: p.id, date: today(), content: '第一天' })
      const logs = await query('devLogs', 'projectId', p.id)
      expect(logs).toHaveLength(1)
      expect(logs[0].content).toBe('第一天')
    })
  })

  describe('Dev.vue 项目字段扩展', () => {
    it('源码：新增表单含状态/本地目录/代码仓库/文档链接', () => {
      const f = read('src/views/Dev.vue')
      expect(f).toContain('form.status')
      expect(f).toContain('form.localDir')
      expect(f).toContain('form.repo')
      expect(f).toContain('form.docs')
      expect(f).toContain('localDir:')
    })

    it('通过表单创建全字段项目并持久化、列表默认展示', async () => {
      const wrapper = await mountDev()
      await wrapper.findAll('button').find(b => b.text().includes('新增项目')).trigger('click')
      await flushPromises()

      await wrapper.findAll('input').find(i => i.attributes('placeholder') === '项目名称').setValue('全字段项目')
      // 状态选“已完结”
      const statusSelect = wrapper.find('.dev__form select')
      await statusSelect.setValue(DEV_PROJECT_STATUS.DONE)
      await wrapper.findAll('input').find(i => i.attributes('placeholder')?.includes('本地保存目录')).setValue('D:/code/app')
      await wrapper.findAll('input').find(i => i.attributes('placeholder')?.includes('代码仓库地址')).setValue('github.com/me/app')
      await wrapper.findAll('input').find(i => i.attributes('placeholder')?.includes('文档链接')).setValue('https://docs.example.com/app')

      await wrapper.findAll('button').find(b => b.text() === '保存').trigger('click')
      await flushPromises()
      await new Promise(r => setTimeout(r, 50))

      const all = await getAll('devProjects')
      expect(all[0]).toMatchObject({
        name: '全字段项目',
        status: 'done',
        localDir: 'D:/code/app',
        repo: 'github.com/me/app',
        docs: 'https://docs.example.com/app'
      })

      await waitFor(() => { expect(wrapper.text()).toContain('D:/code/app') })
      expect(wrapper.text()).toContain('已完结')
      // 链接默认显示，且裸域名自动补 https://
      const links = wrapper.findAll('.project-list__link').map(a => a.attributes('href'))
      expect(links).toContain('https://github.com/me/app')
      expect(links).toContain('https://docs.example.com/app')
    })
  })

  describe('Dev.vue 主页里程碑小旗子看板', () => {
    it('源码：里程碑看板 + 三色旗子 class', () => {
      const f = read('src/views/Dev.vue')
      expect(f).toContain('里程碑看板')
      expect(f).toContain('milestone-flag--not_started')
      expect(f).toContain('milestone-flag--active')
      expect(f).toContain('milestone-flag--done')
    })

    it('跨项目里程碑集中显示在主页，旗子按状态着色', async () => {
      const p1 = await save('devProjects', { name: '项目甲', status: 'active' })
      const p2 = await save('devProjects', { name: '项目乙', status: 'active' })
      await save('devMilestones', { name: '需求评审', projectId: p1.id, status: MILESTONE_STATUS.NOT_STARTED, dueDate: '2026-09-20' })
      await save('devMilestones', { name: '开发中里程碑', projectId: p1.id, status: MILESTONE_STATUS.ACTIVE, dueDate: '2026-09-15' })
      await save('devMilestones', { name: '已上线', projectId: p2.id, status: MILESTONE_STATUS.DONE, dueDate: '2026-09-10' })

      const wrapper = await mountDev()
      await waitFor(() => { expect(wrapper.text()).toContain('需求评审') })

      const flags = wrapper.findAll('.flag-list__item')
      expect(flags).toHaveLength(3)
      expect(wrapper.findAll('.milestone-flag--not_started')).toHaveLength(1)
      expect(wrapper.findAll('.milestone-flag--active')).toHaveLength(1)
      expect(wrapper.findAll('.milestone-flag--done')).toHaveLength(1)
      // 显示所属项目名与日期
      expect(wrapper.text()).toContain('项目甲')
      expect(wrapper.text()).toContain('项目乙')
      expect(wrapper.text()).toContain('2026-09-20')
      // 按截止日期升序：09-10 在 09-20 前
      const order = flags.map(f => f.find('.flag-list__date').text())
      expect(order[0]).toBe('2026-09-10')
      expect(order[2]).toBe('2026-09-20')
    })

    it('项目卡片显示工作项/里程碑/日志计数', async () => {
      const p = await save('devProjects', { name: '计数项目', status: 'active' })
      await save('devTasks', { title: 't1', projectId: p.id, done: false })
      await save('devTasks', { title: 't2', projectId: p.id, done: true })
      await save('devMilestones', { name: 'm1', projectId: p.id, status: 'not_started' })
      await save('devLogs', { projectId: p.id, date: today(), content: 'log' })

      const wrapper = await mountDev()
      await waitFor(() => { expect(wrapper.text()).toContain('计数项目') })
      const cardText = wrapper.find('.project-list__item').text()
      expect(cardText).toContain('工作项 2')
      expect(cardText).toContain('里程碑 1')
      expect(cardText).toContain('日志 1')
    })
  })

  describe('DevDetail.vue 工作项四分类', () => {
    it('源码：工作项表单含 kind 选择与四类标签', () => {
      const f = read('src/views/DevDetail.vue')
      expect(f).toContain('工作项')
      expect(f).toContain('taskForm.kind')
      expect(f).toContain('kind-tag--feature')
      expect(f).toContain('kind-tag--bug')
      expect(f).toContain('kind-tag--tech')
      expect(f).toContain('kindFilter')
    })

    it('新增 Bug 工作项：持久化 kind 并显示分类标签', async () => {
      const p = await save('devProjects', { name: 'P', status: 'active' })
      const wrapper = await mountDevDetail(p.id)
      await wrapper.findAll('button').find(b => b.text().includes('新增工作项')).trigger('click')
      await flushPromises()

      await wrapper.findAll('input').find(i => i.attributes('placeholder') === '工作项标题').setValue('登录报错')
      const kindSelect = wrapper.findAll('.dev-detail__form select')[0]
      await kindSelect.setValue(DEV_TASK_KIND.BUG)
      await wrapper.findAll('button').find(b => b.text() === '保存').trigger('click')
      await flushPromises()
      await new Promise(r => setTimeout(r, 50))

      const tasks = await query('devTasks', 'projectId', p.id)
      expect(tasks[0].kind).toBe('bug')
      await waitFor(() => { expect(wrapper.text()).toContain('登录报错') })
      expect(wrapper.findAll('.kind-tag--bug')).toHaveLength(1)
      expect(wrapper.find('.kind-tag--bug').text()).toBe('Bug')
    })

    it('按分类筛选工作项', async () => {
      const p = await save('devProjects', { name: 'P', status: 'active' })
      await save('devTasks', { title: '新功能', projectId: p.id, kind: 'feature', done: false })
      await save('devTasks', { title: '需求点', projectId: p.id, kind: 'requirement', done: false })
      await save('devTasks', { title: '崩溃', projectId: p.id, kind: 'bug', done: false })
      await save('devTasks', { title: '性能问题', projectId: p.id, kind: 'tech', done: false })

      const wrapper = await mountDevDetail(p.id)
      await waitFor(() => { expect(wrapper.text()).toContain('崩溃') })
      // 默认全部显示 4 条
      expect(wrapper.findAll('.kind-tag')).toHaveLength(4)
      // 点 Bug 筛选
      await wrapper.findAll('.dev-detail__filter').find(b => b.text() === 'Bug').trigger('click')
      await flushPromises()
      const visible = wrapper.findAll('.item-list__item').map(i => i.text())
      expect(visible.some(t => t.includes('崩溃'))).toBe(true)
      expect(visible.some(t => t.includes('新功能'))).toBe(false)
    })

    it('旧工作项（无 kind）默认归为功能类', async () => {
      const p = await save('devProjects', { name: 'P', status: 'active' })
      await save('devTasks', { title: '老任务', projectId: p.id, done: false })
      const wrapper = await mountDevDetail(p.id)
      await waitFor(() => { expect(wrapper.find('.kind-tag').exists()).toBe(true) })
      expect(wrapper.find('.kind-tag').text()).toBe('功能')
    })

    it('工作项可删除（取消）', async () => {
      const p = await save('devProjects', { name: 'P', status: 'active' })
      await save('devTasks', { title: '删掉我', projectId: p.id, kind: 'tech', done: false })
      const wrapper = await mountDevDetail(p.id)
      await waitFor(() => { expect(wrapper.text()).toContain('删掉我') })
      const item = wrapper.findAll('.item-list__item').find(i => i.text().includes('删掉我'))
      await item.findAll('button').find(b => b.text() === '删').trigger('click')
      await flushPromises()
      const left = await query('devTasks', 'projectId', p.id)
      expect(left).toHaveLength(0)
    })
  })

  describe('DevDetail.vue 开发日志', () => {
    it('源码：使用 devLogs store', () => {
      const f = read('src/views/DevDetail.vue')
      expect(f).toContain('开发日志')
      expect(f).toMatch(/save\('devLogs'/)
      expect(f).toContain('logForm.content')
    })

    it('新增日志（日期+内容）并持久化、倒序展示', async () => {
      const p = await save('devProjects', { name: 'P', status: 'active' })
      await save('devLogs', { projectId: p.id, date: '2026-09-01', content: '早先的日志' })

      const wrapper = await mountDevDetail(p.id)
      await wrapper.findAll('button').find(b => b.text().includes('新增日志')).trigger('click')
      await flushPromises()
      const dateInput = wrapper.find('.dev-detail__form--column input[type="date"]')
      await dateInput.setValue('2026-09-10')
      await wrapper.find('.dev-detail__form--column textarea').setValue('今天修好了构建')
      await wrapper.findAll('button').find(b => b.text() === '保存').trigger('click')
      await flushPromises()
      await new Promise(r => setTimeout(r, 50))

      const logs = await query('devLogs', 'projectId', p.id)
      expect(logs).toHaveLength(2)
      await waitFor(() => { expect(wrapper.text()).toContain('今天修好了构建') })
      // 倒序：新日志在前
      const dates = wrapper.findAll('.log-list__date').map(d => d.text())
      expect(dates[0]).toBe('2026-09-10')
    })
  })

  describe('DevDetail.vue 项目字段默认显示 + 里程碑旗子', () => {
    it('本地目录/仓库/文档字段在详情页默认显示且预填', async () => {
      const p = await save('devProjects', {
        name: '字段项目', status: 'active',
        localDir: 'E:/work/x', repo: 'https://git.example.com/x', docs: 'https://doc.example.com'
      })
      const wrapper = await mountDevDetail(p.id)
      await waitFor(() => { expect(wrapper.text()).toContain('字段项目') })
      const inputs = wrapper.findAll('input').map(i => i.element.value)
      expect(inputs).toContain('E:/work/x')
      expect(inputs).toContain('https://git.example.com/x')
      expect(inputs).toContain('https://doc.example.com')
      // “打开”链接
      expect(wrapper.findAll('.dev-detail__open-link').length).toBe(2)
    })

    it('里程碑旗子按状态着色并可勾选完成', async () => {
      const p = await save('devProjects', { name: 'P', status: 'active' })
      await save('devMilestones', { name: '冲刺1', projectId: p.id, status: MILESTONE_STATUS.ACTIVE })
      const wrapper = await mountDevDetail(p.id)
      await waitFor(() => { expect(wrapper.findAll('.milestone-flag--active')).toHaveLength(1) })

      // 勾选完成 → 旗子变绿
      const checkbox = wrapper.find('.item-list__item .task-checkbox')
      await checkbox.trigger('click')
      await flushPromises()
      await waitFor(() => { expect(wrapper.findAll('.milestone-flag--done')).toHaveLength(1) })
    })

    it('代码片段功能保留（回归）', async () => {
      const p = await save('devProjects', { name: 'P', status: 'active' })
      await save('devSnippets', { code: 'const a=1', note: '片段A', projectId: p.id })
      const wrapper = await mountDevDetail(p.id)
      await waitFor(() => {
        expect(wrapper.text()).toContain('片段A')
        expect(wrapper.text()).toContain('const a=1')
      })
    })
  })
})
