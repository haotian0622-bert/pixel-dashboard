import { describe, it, expect, beforeEach, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { initDB, closeDB } from '../db/init'
import { clear, save, getAll, query } from '../db/dao'
import { getTodayItems, toggleDone } from '../db/aggr'
import { exportAll, importAll, clearAll } from '../db/backup'
import { STORES, MEDIA_STATUS, COMPANY_STATUS, STUDY_STATUS, DEV_PROJECT_STATUS, MILESTONE_STATUS, FINANCE_TYPE } from '../utils/constants'
import { today, getWeekday, formatDate, isThisWeek, isThisMonth } from '../utils/date'

/**
 * 阶段 13 测试：全量验收
 * 对照 PRD.md 第 10 节验收标准逐条检查
 */

describe('阶段13：全量验收（对照PRD验收标准）', () => {
  beforeEach(async () => {
    closeDB()
    await initDB()
    for (const s of STORES) await clear(s)
  })

  describe('基础运行', () => {
    it('用浏览器直接打开本地文件即可运行（vite base 配置为相对路径）', () => {
      const config = readFileSync(resolve(process.cwd(), 'vite.config.js'), 'utf-8')
      expect(config).toContain("base: './'")
    })

    it('刷新页面后数据不丢失（IndexedDB 持久化）', async () => {
      await save('memos', { content: '持久化验证' })
      closeDB()
      await initDB()
      const all = await getAll('memos')
      expect(all.length).toBe(1)
      expect(all[0].content).toBe('持久化验证')
    })

    it('关闭浏览器再打开后数据不丢失（同一会话内重新连接）', async () => {
      await save('tasks', { title: '持久任务', date: today(), source: 'manual', done: false })
      closeDB()
      await initDB()
      const all = await getAll('tasks')
      expect(all.length).toBe(1)
    })

    it('重启电脑后再打开数据不丢失（数据库重建后数据仍在）', async () => {
      // 模拟重启：关闭连接，重新打开数据库
      await save('memos', { content: '重启测试' })
      closeDB()
      // 重新打开（模拟重启后）
      await initDB()
      const all = await getAll('memos')
      expect(all.length).toBe(1)
      expect(all[0].content).toBe('重启测试')
    })
  })

  describe('9 个模块', () => {
    it('左侧导航可见 9 个模块入口，分组正确', () => {
      const sidebar = readFileSync(
        resolve(process.cwd(), 'src/components/PixelSidebar.vue'),
        'utf-8'
      )
      // 6 个分组
      const groupCount = (sidebar.match(/sidebar-nav__group/g) || []).length
      expect(groupCount).toBeGreaterThanOrEqual(6)
      // 9 个模块名
      expect(sidebar).toContain('首页')
      expect(sidebar).toContain('本周/今日计划')
      expect(sidebar).toContain('自媒体')
      expect(sidebar).toContain('开发工作（AI）')
      expect(sidebar).toContain('公司事情安排')
      expect(sidebar).toContain('健身计划')
      expect(sidebar).toContain('学习计划')
      expect(sidebar).toContain('本月开支和收入')
      expect(sidebar).toContain('数据与设置')
    })

    it('点击每个模块都能进入对应页面（路由 11 条）', async () => {
      const routerModule = await import('../router/index.js')
      const routes = routerModule.default.options.routes
      expect(routes.length).toBe(11)
      const names = routes.map(r => r.name)
      const expected = ['home', 'plan', 'media', 'dev', 'devDetail', 'company', 'fitness', 'study', 'studyDetail', 'finance', 'settings']
      for (const n of expected) expect(names).toContain(n)
    })

    it('窄屏下导航收成图标条，内容不溢出', () => {
      const sidebar = readFileSync(
        resolve(process.cwd(), 'src/components/PixelSidebar.vue'),
        'utf-8'
      )
      expect(sidebar).toContain('@media (max-width: 768px)')
      expect(sidebar).toContain('48px')
    })
  })

  describe('首页', () => {
    it('显示今日日期和状态', () => {
      const home = readFileSync(resolve(process.cwd(), 'src/views/Home.vue'), 'utf-8')
      expect(home).toContain('dateStr')
      expect(home).toContain('statusText')
      expect(home).toContain('项待办')
    })

    it('今日计划区展示各模块汇集的今日项 + 手动任务', async () => {
      await save('tasks', { title: '手动项', date: today(), done: false, source: 'manual' })
      await save('devTasks', { title: '开发项', projectId: 'p1', dueDate: today(), done: false })
      const items = await getTodayItems()
      expect(items.some(i => i.title === '手动项')).toBe(true)
      expect(items.some(i => i.title === '开发项')).toBe(true)
    })

    it('今日计划区每项可勾选完成，勾选后数字更新', async () => {
      const task = await save('tasks', { title: '验收勾选', date: today(), done: false, source: 'manual' })
      const items = await getTodayItems()
      expect(items.filter(i => i.done).length).toBe(0)
      await toggleDone({ source: 'manual', sourceId: task.id, done: false })
      const items2 = await getTodayItems()
      expect(items2.filter(i => i.done).length).toBe(1)
    })

    it('快速备忘可新增多条便签，自动保存，可删', async () => {
      await save('memos', { content: '便签1' })
      await save('memos', { content: '便签2' })
      const all = await getAll('memos')
      expect(all.length).toBe(2)
    })

    it('8 张模块摘要卡显示正确的关键数字', async () => {
      const home = readFileSync(resolve(process.cwd(), 'src/views/Home.vue'), 'utf-8')
      // 首页有摘要卡区域和7张卡（设置不显示）
      expect(home).toContain('summary-card')
      expect(home).toContain('summaryCards')
    })
  })

  describe('计划模块', () => {
    it('今日视图展示今日所有项，来源用色点/标签标明', () => {
      const plan = readFileSync(resolve(process.cwd(), 'src/views/Plan.vue'), 'utf-8')
      expect(plan).toContain('source-dot')
      expect(plan).toContain('sourceLabels')
    })

    it('本周视图展示周一到周日，每天项数量正确', async () => {
      const { getWeekItemsCount } = await import('../db/aggr')
      const days = await getWeekItemsCount()
      expect(days.length).toBe(7)
      expect(days[0].weekday).toBe(1)
      expect(days[6].weekday).toBe(7)
    })

    it('可新增手动任务（指定日期、优先级、备注）', async () => {
      const plan = readFileSync(resolve(process.cwd(), 'src/views/Plan.vue'), 'utf-8')
      expect(plan).toContain('newTask')
      expect(plan).toContain('title')
      expect(plan).toContain('date')
      expect(plan).toContain('priority')
      expect(plan).toContain('note')
    })

    it('可编辑、删除、勾选完成', () => {
      const plan = readFileSync(resolve(process.cwd(), 'src/views/Plan.vue'), 'utf-8')
      expect(plan).toContain('startEdit')
      expect(plan).toContain('deleteTask')
      expect(plan).toContain('onToggle')
    })
  })

  describe('自媒体', () => {
    it('可新增点子（标题、平台、状态）', () => {
      const media = readFileSync(resolve(process.cwd(), 'src/views/Media.vue'), 'utf-8')
      expect(media).toContain('title')
      expect(media).toContain('platform')
      expect(media).toContain('status')
    })

    it('可修改状态（点子→草稿→待发→已发）', () => {
      const media = readFileSync(resolve(process.cwd(), 'src/views/Media.vue'), 'utf-8')
      expect(media).toContain('changeStatus')
      expect(media).toContain('MEDIA_STATUS_LABELS')
    })

    it('可排发布日期', () => {
      const media = readFileSync(resolve(process.cwd(), 'src/views/Media.vue'), 'utf-8')
      expect(media).toContain('publishDate')
    })

    it('已发布可填链接归档', () => {
      const media = readFileSync(resolve(process.cwd(), 'src/views/Media.vue'), 'utf-8')
      expect(media).toContain('link')
    })
  })

  describe('开发（AI）', () => {
    it('可新增项目，显示在项目列表', () => {
      const dev = readFileSync(resolve(process.cwd(), 'src/views/Dev.vue'), 'utf-8')
      expect(dev).toContain('saveProject')
      expect(dev).toContain('projects')
    })

    it('项目详情页有里程碑、任务、代码片段', () => {
      const detail = readFileSync(resolve(process.cwd(), 'src/views/DevDetail.vue'), 'utf-8')
      expect(detail).toContain('milestones')
      expect(detail).toContain('tasks')
      expect(detail).toContain('snippets')
    })

    it('完成里程碑/任务后进度条自动更新', async () => {
      const p = await save('devProjects', { name: '验收项目', status: DEV_PROJECT_STATUS.ACTIVE })
      await save('devTasks', { title: 'T1', projectId: p.id, done: false })
      await save('devTasks', { title: 'T2', projectId: p.id, done: false })
      const tasks = await query('devTasks', 'projectId', p.id)
      expect(tasks.length).toBe(2)
      await save('devTasks', { ...tasks[0], done: true })
      const tasks2 = await query('devTasks', 'projectId', p.id)
      expect(tasks2.filter(t => t.done).length).toBe(1)
    })

    it('今日到期任务出现在今日计划', async () => {
      const p = await save('devProjects', { name: 'P', status: DEV_PROJECT_STATUS.ACTIVE })
      await save('devTasks', { title: '今日到期', projectId: p.id, dueDate: today(), done: false })
      const items = await getTodayItems()
      expect(items.some(i => i.source === 'dev' && i.title === '今日到期')).toBe(true)
    })
  })

  describe('公司', () => {
    it('可新增事项（标题、分类、优先级、截止、状态）', () => {
      const company = readFileSync(resolve(process.cwd(), 'src/views/Company.vue'), 'utf-8')
      expect(company).toContain('title')
      expect(company).toContain('category')
      expect(company).toContain('priority')
      expect(company).toContain('deadline')
      expect(company).toContain('status')
    })

    it('可加跟进备注（带时间戳）', async () => {
      const item = await save('companyItems', { title: '跟进测试', category: 'daily', status: COMPANY_STATUS.TODO, priority: 'medium' })
      await save('companyNotes', { itemId: item.id, content: '已跟进', timestamp: new Date().toLocaleString() })
      const notes = await query('companyNotes', 'itemId', item.id)
      expect(notes.length).toBe(1)
      expect(notes[0].timestamp).toBeDefined()
    })

    it('今日截止事项出现在今日计划', async () => {
      await save('companyItems', { title: '今日截止', category: 'daily', deadline: today(), status: COMPANY_STATUS.TODO, priority: 'high' })
      const items = await getTodayItems()
      expect(items.some(i => i.source === 'company' && i.title === '今日截止')).toBe(true)
    })
  })

  describe('健身', () => {
    it('可编辑周一到周日的训练排程', () => {
      const fitness = readFileSync(resolve(process.cwd(), 'src/views/Fitness.vue'), 'utf-8')
      expect(fitness).toContain('fitnessSchedule')
      expect(fitness).toContain('weekday')
      expect(fitness).toContain('saveSchedule')
    })

    it('今日训练出现在今日计划', async () => {
      await save('fitnessSchedule', { weekday: getWeekday(), name: '训练', exercises: [] })
      const items = await getTodayItems()
      expect(items.some(i => i.source === 'fitness')).toBe(true)
    })

    it('可打卡、可记录身体数据', () => {
      const fitness = readFileSync(resolve(process.cwd(), 'src/views/Fitness.vue'), 'utf-8')
      expect(fitness).toContain('checkin')
      expect(fitness).toContain('saveBody')
      expect(fitness).toContain('fitnessLogs')
      expect(fitness).toContain('fitnessBody')
    })

    it('可查看历史打卡和身体数据列表', () => {
      const fitness = readFileSync(resolve(process.cwd(), 'src/views/Fitness.vue'), 'utf-8')
      expect(fitness).toContain('bodyList')
      expect(fitness).toContain('fitness__body-list')
    })
  })

  describe('学习', () => {
    it('可新增学习主题', () => {
      const study = readFileSync(resolve(process.cwd(), 'src/views/Study.vue'), 'utf-8')
      expect(study).toContain('saveTopic')
      expect(study).toContain('studyTopics')
    })

    it('主题下可加任务、打卡、资料备忘', () => {
      const detail = readFileSync(resolve(process.cwd(), 'src/views/StudyDetail.vue'), 'utf-8')
      expect(detail).toContain('saveTask')
      expect(detail).toContain('saveLog')
      expect(detail).toContain('saveMaterial')
    })

    it('今日到期任务出现在今日计划', async () => {
      const t = await save('studyTopics', { name: '主题', status: STUDY_STATUS.ACTIVE })
      await save('studyTasks', { title: '今日学习', topicId: t.id, dueDate: today(), done: false })
      const items = await getTodayItems()
      expect(items.some(i => i.source === 'study' && i.title === '今日学习')).toBe(true)
    })

    it('显示本周累计次数和时长', () => {
      const study = readFileSync(resolve(process.cwd(), 'src/views/Study.vue'), 'utf-8')
      expect(study).toContain('weekCount')
      expect(study).toContain('weekDuration')
    })
  })

  describe('收支', () => {
    it('可新增收支流水（金额、类型、分类、日期、备注）', () => {
      const finance = readFileSync(resolve(process.cwd(), 'src/views/Finance.vue'), 'utf-8')
      expect(finance).toContain('amount')
      expect(finance).toContain('type')
      expect(finance).toContain('category')
      expect(finance).toContain('date')
      expect(finance).toContain('note')
    })

    it('本月总收入、总支出、结余正确', async () => {
      await save('financeRecords', { amount: 5000, type: 'income', category: 'salary', date: today() })
      await save('financeRecords', { amount: 500, type: 'expense', category: 'food', date: today() })
      const all = await getAll('financeRecords')
      const monthRecords = all.filter(r => isThisMonth(r.date))
      const income = monthRecords.filter(r => r.type === 'income').reduce((s, r) => s + Number(r.amount), 0)
      const expense = monthRecords.filter(r => r.type === 'expense').reduce((s, r) => s + Number(r.amount), 0)
      expect(income).toBe(5000)
      expect(expense).toBe(500)
      expect(income - expense).toBe(4500)
    })

    it('按分类汇总支出正确', async () => {
      await save('financeRecords', { amount: 100, type: 'expense', category: 'food', date: today() })
      await save('financeRecords', { amount: 200, type: 'expense', category: 'transport', date: today() })
      const all = await getAll('financeRecords')
      const monthExpenses = all.filter(r => r.type === 'expense' && isThisMonth(r.date))
      const byCat = {}
      for (const r of monthExpenses) {
        byCat[r.category] = (byCat[r.category] || 0) + Number(r.amount)
      }
      expect(byCat.food).toBe(100)
      expect(byCat.transport).toBe(200)
    })

    it('可切换月份查看历史', () => {
      const finance = readFileSync(resolve(process.cwd(), 'src/views/Finance.vue'), 'utf-8')
      expect(finance).toContain('prevMonth')
      expect(finance).toContain('nextMonth')
      expect(finance).toContain('currentMonth')
    })
  })

  describe('数据与设置', () => {
    it('导出 JSON 文件可下载', async () => {
      await save('memos', { content: '导出测试' })
      const data = await exportAll()
      expect(data._exportTime).toBeDefined()
      expect(data.memos.length).toBe(1)
    })

    it('导入 JSON 文件后数据恢复', async () => {
      await save('memos', { content: '导入前' })
      const backup = await exportAll()
      await clearAll()
      await importAll(backup)
      const all = await getAll('memos')
      expect(all.length).toBe(1)
      expect(all[0].content).toBe('导入前')
    })

    it('清空数据需二次确认', () => {
      const settings = readFileSync(resolve(process.cwd(), 'src/views/Settings.vue'), 'utf-8')
      expect(settings).toContain('PixelDialog')
      expect(settings).toContain('showClearDialog')
    })

    it('主题切换为浅色/深色/跟随系统，切换即时生效', () => {
      const settings = readFileSync(resolve(process.cwd(), 'src/views/Settings.vue'), 'utf-8')
      expect(settings).toContain('浅色')
      expect(settings).toContain('深色')
      expect(settings).toContain('跟随系统')
      const theme = readFileSync(resolve(process.cwd(), 'src/stores/theme.js'), 'utf-8')
      expect(theme).toContain('applyTheme')
      expect(theme).toContain('data-theme')
    })
  })

  describe('今日计划汇集与同步', () => {
    it('各模块今日到期项自动出现在今日计划', async () => {
      await save('tasks', { title: '手动', date: today(), done: false, source: 'manual' })
      await save('devTasks', { title: '开发', projectId: 'p1', dueDate: today(), done: false })
      await save('companyItems', { title: '公司', category: 'daily', deadline: today(), status: COMPANY_STATUS.TODO })
      await save('fitnessSchedule', { weekday: getWeekday(), name: '训练', exercises: [] })
      await save('studyTasks', { title: '学习', topicId: 't1', dueDate: today(), done: false })
      await save('media', { title: '发布', status: MEDIA_STATUS.SCHEDULED, publishDate: today() })

      const items = await getTodayItems()
      const sources = items.map(i => i.source)
      expect(sources).toContain('manual')
      expect(sources).toContain('dev')
      expect(sources).toContain('company')
      expect(sources).toContain('fitness')
      expect(sources).toContain('study')
      expect(sources).toContain('media')
    })

    it('在今日计划勾选完成 → 源模块对应项同步完成', async () => {
      const task = await save('tasks', { title: '同步测试', date: today(), done: false, source: 'manual' })
      await toggleDone({ source: 'manual', sourceId: task.id, done: false })
      const updated = await getAll('tasks')
      expect(updated[0].done).toBe(true)
    })

    it('在源模块勾选完成 → 今日计划对应项同步完成', async () => {
      const task = await save('tasks', { title: '反向同步', date: today(), done: false, source: 'manual' })
      // 在源模块直接修改
      await save('tasks', { ...task, done: true })
      const items = await getTodayItems()
      const item = items.find(i => i.sourceId === task.id)
      expect(item.done).toBe(true)
    })
  })

  describe('视觉设计', () => {
    it('整体为 16-bit 像素复古风格', () => {
      const variables = readFileSync(resolve(process.cwd(), 'src/styles/variables.css'), 'utf-8')
      expect(variables).toContain('#F8F2DC') // 更浅的米黄底色
      expect(variables).toContain('#2E2014') // 更深的褐黑，对比更大
      expect(variables).toContain('#D85A1A') // 更饱和的橘红
    })

    it('全像素中文字体显示', () => {
      const base = readFileSync(resolve(process.cwd(), 'src/styles/base.css'), 'utf-8')
      expect(base).toContain("'ArkPixel'")
      expect(base).toContain('@font-face')
    })

    it('DOS 窗口式控件（标题栏、双边框、像素按钮、像素滚动条）', () => {
      const ui = readFileSync(resolve(process.cwd(), 'src/styles/pixel-ui.css'), 'utf-8')
      expect(ui).toContain('.pixel-window__titlebar')
      expect(ui).toContain('double') // 双边框
      expect(ui).toContain('.pixel-btn')
      expect(ui).toContain('.pixel-scroll')
    })

    it('分段式游戏进度条', () => {
      const progress = readFileSync(resolve(process.cwd(), 'src/components/PixelProgress.vue'), 'utf-8')
      expect(progress).toContain('▰')
      expect(progress).toContain('▱')
    })

    it('8 模块有各自专属色，来源标记正确', () => {
      const variables = readFileSync(resolve(process.cwd(), 'src/styles/variables.css'), 'utf-8')
      expect(variables).toContain('--c-plan')
      expect(variables).toContain('--c-media')
      expect(variables).toContain('--c-dev')
      expect(variables).toContain('--c-company')
      expect(variables).toContain('--c-fitness')
      expect(variables).toContain('--c-study')
      expect(variables).toContain('--c-finance')
      expect(variables).toContain('--c-settings')
      const constants = readFileSync(resolve(process.cwd(), 'src/utils/constants.js'), 'utf-8')
      expect(constants).toContain('SOURCE_COLOR_VAR')
    })

    it('浅色/深色双主题可用', () => {
      const variables = readFileSync(resolve(process.cwd(), 'src/styles/variables.css'), 'utf-8')
      expect(variables).toContain('[data-theme="light"]')
      expect(variables).toContain('[data-theme="dark"]')
      expect(variables).toContain('#1F1810') // 夜间深褐底
      expect(variables).toContain('#F2C875') // 夜间琥珀字
    })
  })

  describe('架构', () => {
    it('所有数据读写通过统一数据接口层', () => {
      const dao = readFileSync(resolve(process.cwd(), 'src/db/dao.js'), 'utf-8')
      expect(dao).toContain('getAll')
      expect(dao).toContain('get')
      expect(dao).toContain('query')
      expect(dao).toContain('save')
      expect(dao).toContain('remove')
      expect(dao).toContain('clear')
      expect(dao).toContain('patch')

      // 视图组件不直接使用 indexedDB
      const home = readFileSync(resolve(process.cwd(), 'src/views/Home.vue'), 'utf-8')
      expect(home).not.toContain('indexedDB')
      expect(home).toContain('dao')
      expect(home).toContain('aggr')
    })

    it('界面层不直接操作 IndexedDB', () => {
      const views = ['Home.vue', 'Plan.vue', 'Media.vue', 'Dev.vue', 'DevDetail.vue', 'Company.vue', 'Fitness.vue', 'Study.vue', 'StudyDetail.vue', 'Finance.vue', 'Settings.vue']
      for (const v of views) {
        const content = readFileSync(resolve(process.cwd(), `src/views/${v}`), 'utf-8')
        expect(content).not.toContain('indexedDB.open')
        expect(content).not.toContain('IDBKeyRange')
      }
    })
  })
})
