# 个人工作生活专属 App · 开发计划

> 本文件是 V1 开发的执行计划，与 [PRD.md](./PRD.md) 配套使用。按阶段顺序执行，每个阶段完成后对照验收点检查。

---

## 技术选型

| 项 | 选择 | 理由 |
|----|------|------|
| 构建 | Vite | 开发热更新，构建产物为纯静态文件 |
| 框架 | Vue 3 + Pinia | 组件化适合 9 模块；响应式系统天然适配今日汇集与双向同步 |
| 路由 | Vue Router（hash 模式） | hash 路由兼容 `file://` 协议，构建产物可直接双击打开 |
| 存储 | IndexedDB（原生 API 封装） | 满足 PRD 要求，不引入额外依赖 |
| 字体 | 缝合像素 / Zpix（woff2，本地打包） | 全像素中文显示，个人免费 |
| 像素 UI | 纯 CSS（无 UI 库） | 像素风高度定制，第三方库不匹配 |

**构建产物可直接运行**：Vite 配置 `base: './'`，构建后 `dist/index.html` 可直接用浏览器双击打开，无需服务器。

---

## 目录结构

```
app1/
├── PRD.md                         # 产品需求文档
├── DEV_PLAN.md                    # 本文件
├── index.html                     # 入口 HTML
├── package.json
├── vite.config.js
├── public/
│   └── fonts/
│       └── zpix.woff2             # 像素字体文件
├── src/
│   ├── main.js                    # 应用入口
│   ├── App.vue                    # 根组件（侧边栏 + 路由出口）
│   ├── router/
│   │   └── index.js               # 路由配置（9 个路由）
│   ├── db/                        # 数据接口层（界面只调这层）
│   │   ├── init.js                # IndexedDB 建库建表
│   │   ├── dao.js                 # 通用增删改查
│   │   ├── aggr.js                # 今日汇集查询 + 双向同步
│   │   └── backup.js              # 导出/导入/清空
│   ├── stores/                    # Pinia 全局状态
│   │   ├── theme.js               # 主题状态
│   │   └── data.js                # 各模块数据的响应式缓存
│   ├── components/                # 通用像素 UI 组件
│   │   ├── PixelWindow.vue        # 像素窗口（标题栏+双边框）
│   │   ├── PixelButton.vue        # 像素按钮（确认/取消/普通）
│   │   ├── PixelDialog.vue        # 像素确认对话框
│   │   ├── PixelProgress.vue      # 分段式进度条
│   │   ├── PixelInput.vue         # 像素输入框
│   │   ├── PixelSelect.vue        # 像素下拉选择
│   │   └── PixelEmpty.vue         # 空状态占位
│   ├── views/                     # 9 个页面组件
│   │   ├── Home.vue
│   │   ├── Plan.vue
│   │   ├── Media.vue
│   │   ├── Dev.vue
│   │   ├── DevDetail.vue
│   │   ├── Company.vue
│   │   ├── Fitness.vue
│   │   ├── Study.vue
│   │   ├── StudyDetail.vue
│   │   ├── Finance.vue
│   │   └── Settings.vue
│   ├── styles/
│   │   ├── variables.css          # CSS 变量（色板、模块色）
│   │   ├── base.css               # 重置 + 基础排版
│   │   ├── theme-light.css        # 日间主题变量
│   │   ├── theme-dark.css         # 夜间主题变量
│   │   └── pixel-ui.css           # 像素边框、按钮、滚动条样式
│   └── utils/
│       ├── date.js                # 日期工具（今日/本周/格式化）
│       ├── id.js                 # ID 生成（时间戳+随机）
│       └── constants.js          # 枚举常量（状态、优先级、分类等）
```

---

## 数据库设计

数据库名：`pixel-dashboard`，版本 `1`。

| Store 名 | 用途 | 关键字段 | 索引 |
|----------|------|---------|------|
| `tasks` | 手动计划任务 | id, title, date, priority, done, source, sourceId | date, done |
| `memos` | 快速备忘便签 | id, content, createdAt | createdAt |
| `media` | 自媒体点子 | id, title, platform, status, publishDate, link, note | status, publishDate |
| `devProjects` | 开发项目 | id, name, desc, status, createdAt | status |
| `devMilestones` | 开发里程碑 | id, projectId, name, status, dueDate | projectId |
| `devTasks` | 开发任务 | id, projectId, milestoneId, title, dueDate, priority, done | projectId, dueDate, done |
| `devSnippets` | 开发代码片段 | id, projectId, code, note, tags | projectId |
| `companyItems` | 公司事项 | id, title, category, priority, deadline, status | status, deadline |
| `companyNotes` | 公司跟进备注 | id, itemId, content, timestamp | itemId |
| `fitnessSchedule` | 健身周排程 | id, weekday, name, exercises[] | weekday |
| `fitnessLogs` | 健身打卡 | id, date, done, note | date |
| `fitnessBody` | 身体数据 | id, date, weight, bodyFat, note | date |
| `studyTopics` | 学习主题 | id, name, goal, status | status |
| `studyTasks` | 学习任务 | id, topicId, title, dueDate, priority, done, note | topicId, dueDate, done |
| `studyLogs` | 学习打卡 | id, date, topicId, content, duration | date, topicId |
| `studyMaterials` | 学习资料 | id, topicId, content, note | topicId |
| `financeRecords` | 收支流水 | id, amount, type, category, date, note | date, type |
| `meta` | 元数据 | id, key, value | key |

---

## 执行阶段

### 阶段 0：项目初始化

**0.1 初始化 Vite + Vue 项目**
- 任务：创建项目骨架
- 命令：`npm create vite@latest . -- --template vue`
- 安装依赖：`npm install vue-router pinia`
- 配置 `vite.config.js`：`base: './'`，确保构建产物可用 `file://` 打开

**0.2 获取像素字体**
- 任务：下载缝合像素或 Zpix 字体的 woff2 文件
- 放置：`public/fonts/zpix.woff2`
- 在 `index.html` 或 CSS 中 `@font-face` 引用，`font-family: 'Zpix'`

**0.3 搭建目录结构**
- 任务：按上述目录结构创建所有空文件
- 验证：`npm run dev` 能启动，页面显示空白 Vue 应用

**验收点**：
- [ ] `npm run dev` 正常启动
- [ ] `npm run build` 生成 `dist/`，双击 `dist/index.html` 可在浏览器打开

---

### 阶段 1：数据层（数据接口层）

**1.1 IndexedDB 初始化** → `src/db/init.js`
- 任务：打开数据库，创建上述 18 个 Object Store 和索引
- 导出：`initDB()` 返回 Promise，resolve 后可使用
- 验证：浏览器 DevTools → Application → IndexedDB 可见数据库和所有 store

**1.2 通用 DAO** → `src/db/dao.js`
- 任务：封装通用增删改查
- 接口：
  ```js
  getAll(store)            // 获取全部
  get(store, id)           // 按 id 获取
  query(store, indexName, value)  // 按索引查询
  save(store, obj)         // 新增或更新（有 id 则更新，无则生成 id + createdAt）
  remove(store, id)        // 删除
  clear(store)             // 清空单个 store
  ```
- 验证：在浏览器控制台调用 `dao.save('tasks', {title:'test', date:'2026-09-08'})` 后刷新，数据仍在

**1.3 今日汇集查询** → `src/db/aggr.js`
- 任务：从各模块查询今日相关项，汇总成统一格式
- 接口：
  ```js
  getTodayItems()  // 返回 [{ id, title, source, sourceId, priority, done }]
  ```
- 查询规则：
  - `tasks`：where `date == today` 且 `source == 'manual'`
  - `media`：where `publishDate == today` 且 `status == '待发'`
  - `devTasks`：where `dueDate == today` 且 `!done`
  - `companyItems`：where `deadline == today` 且 `status != '已完成'`
  - `fitnessSchedule`：where `weekday == today.weekday`
  - `studyTasks`：where `dueDate == today` 且 `!done`
- 验证：在各 store 插入今日测试数据，调用 `getTodayItems()` 返回正确数量

**1.4 双向同步** → `src/db/aggr.js`
- 任务：勾选完成时回写源模块
- 接口：
  ```js
  toggleDone(item)  // item = { source, sourceId, done }
  ```
- 逻辑：根据 `source` 找到对应 store，更新 `sourceId` 那条的 `done`/`status` 字段
- 验证：在今日计划勾选一项 → 查源模块该条状态已变更；在源模块勾选 → 今日计划刷新后状态同步

**1.5 备份恢复** → `src/db/backup.js`
- 任务：导出/导入/清空
- 接口：
  ```js
  exportAll()   // 返回 JSON 对象，含所有 store 数据
  importAll(data)  // 校验后覆盖写入
  clearAll()    // 清空所有 store（meta 保留主题设置）
  ```
- 验证：导出后清空，再导入，数据恢复

**验收点**：
- [ ] 18 个 store 在 IndexedDB 可见
- [ ] DAO 增删改查正常，刷新后数据不丢失
- [ ] `getTodayItems()` 正确汇集各模块今日项
- [ ] 双向同步工作正常
- [ ] 导出/导入/清空正常

---

### 阶段 2：UI 基础框架

**2.1 CSS 变量与色板** → `src/styles/variables.css` + `theme-light.css` + `theme-dark.css`
- 任务：定义全部 CSS 变量
- 日间变量（`[data-theme="light"]`）：
  - `--bg: #EFE3C8` / `--panel: #F7EED9` / `--text: #4A3728`
  - `--accent: #E07A3F` / `--ochre: #A9703F` / `--olive: #7A8450`
  - 模块色：`--c-plan` `--c-media` `--c-dev` `--c-company` `--c-fitness` `--c-study` `--c-finance` `--c-settings`
- 夜间变量（`[data-theme="dark"]`）：
  - `--bg: #2B2118` / `--panel: #3A2E22` / `--text: #E8A44C`
- 验证：切换 `data-theme` 属性，颜色正确变化

**2.2 基础排版** → `src/styles/base.css`
- 任务：CSS 重置、全局 `font-family: 'Zpix'`、基础间距、舒适留白
- 验证：页面文字为像素字体

**2.3 像素 UI 样式** → `src/styles/pixel-ui.css`
- 任务：定义像素风基础样式类
  - `.pixel-border`：双边框（`border: 4px double`）+ 硬边缘（`image-rendering: pixelated`）
  - `.pixel-window`：窗口容器，带标题栏
  - `.pixel-btn`：凸起按钮，`:active` 凹陷
  - `.pixel-btn--confirm`：橄榄绿底
  - `.pixel-btn--cancel`：砖红底
  - `.pixel-input`：输入框像素边框
  - `.pixel-scroll`：自定义像素滚动条
  - `.pixel-progress`：分段进度条容器
- 验证：写一个测试页面，按钮/窗口/输入框呈现像素风

**2.4 通用组件** → `src/components/`
- PixelWindow.vue：props `title`，slot 默认内容；标题栏左侧小图标，右侧关闭按钮
- PixelButton.vue：props `type`（confirm/cancel/plain）、`label`，emit `click`
- PixelDialog.vue：props `title`、`visible`，slot 内容，底部确认/取消按钮，emit `confirm`/`cancel`
- PixelProgress.vue：props `value`（0-100）、`max`，渲染 `▰▰▰▱▱▱` 分段
- PixelInput.vue：props `modelValue`、`placeholder`，像素输入框
- PixelSelect.vue：props `options`、`modelValue`，像素下拉
- PixelEmpty.vue：props `text`，空状态占位（像素小图 + 文字）
- 验证：每个组件单独写测试用例渲染正常

**2.5 侧边栏** → `src/App.vue`（或单独 `PixelSidebar.vue`）
- 任务：左侧固定侧边栏，6 分组 9 入口
- 结构：
  ```
  总览
    ▶ 首页
  计划
    本周/今日计划
  工作
    自媒体
    开发工作（AI）
    公司事情安排
  生活
    健身计划
    学习计划
  收支
    本月开支和收入
  系统
    数据与设置
  ```
- 选中项左侧显示 `▶`
- 每项前有模块色小方块图标
- 窄屏（`@media max-width: 768px`）收成图标条，hover 显示文字
- 验证：点击各项路由跳转正确，选中态 `▶` 正确

**2.6 路由配置** → `src/router/index.js`
- 任务：配置 9 个路由（hash 模式）
  - `/` → Home
  - `/plan` → Plan
  - `/media` → Media
  - `/dev` → Dev
  - `/dev/:id` → DevDetail
  - `/company` → Company
  - `/fitness` → Fitness
  - `/study` → Study
  - `/study/:id` → StudyDetail
  - `/finance` → Finance
  - `/settings` → Settings
- 验证：地址栏 hash 变化，页面切换正常

**2.7 主题状态** → `src/stores/theme.js` + `src/main.js`
- 任务：Pinia store 管理 `mode`（light/dark/system），监听系统主题变化
- 应用启动时从 `meta` store 读取上次设置
- 切换时写入 `meta` store + 设置 `document.documentElement.dataset.theme`
- 验证：切换主题即时生效，刷新后保持上次选择

**验收点**：
- [ ] 色板变量正确，日间/夜间切换正常
- [ ] 全像素字体显示
- [ ] 像素窗口、按钮、输入框、滚动条样式正确
- [ ] 分段式进度条渲染 `▰▰▰▱▱▱`
- [ ] 侧边栏 6 分组 9 入口，选中态 `▶` 正确
- [ ] 窄屏侧边栏收成图标条
- [ ] 路由 9 个页面跳转正常
- [ ] 主题切换刷新后保持

---

### 阶段 3：首页

**3.1 页头** → `Home.vue` 顶部
- 今日日期 + 星期（用 `utils/date.js` 格式化）
- 一句话状态：今日 N 项待办 / 本周健身 N 次 / 本周学习 N 次

**3.2 今日计划区**
- 调用 `aggr.getTodayItems()`
- 列表展示，每项：来源色点 + 标题 + 优先级符号 + 勾选框
- 勾选调用 `aggr.toggleDone(item)`，带勾选动效
- 顶部显示：今日完成数 / 总数 + 分段进度条

**3.3 快速备忘区**
- 调用 `dao.getAll('memos')`
- 便签流网格展示，每张：内容文本 + 删除按钮
- 底部 `+ 新建便签` 按钮 → 就地展开输入框
- 输入失焦自动保存（`dao.save('memos', {...})`）
- 验证：新增便签刷新仍在，可删除

**3.4 模块摘要卡网格**
- 8 张卡片（设置不显示）
- 各卡片调用对应 store 的统计：
  - 计划：`tasks` where date==today 的总数/完成数
  - 自媒体：`media` where status=='待发' 且本周发布的数量
  - 开发：`devProjects` where status=='进行中' 的数量 + 平均进度
  - 公司：`companyItems` where deadline 在本周的数量
  - 健身：`fitnessLogs` 本周打卡次数 + 下次训练星期
  - 学习：`studyTopics` where status=='进行中' 数量 + `studyLogs` 本周次数
  - 收支：`financeRecords` 本月支出合计 + 收入合计
- 每张卡：模块色边框 + 图标 + 关键数字 + 一句话
- 点击卡片跳转对应模块
- 验证：各模块有数据后摘要卡数字正确

**验收点**：
- [ ] 显示今日日期和状态
- [ ] 今日计划区汇集各模块今日项 + 手动任务
- [ ] 勾选完成有动效，数字更新
- [ ] 来源色点正确标注
- [ ] 便签可增删，自动保存，刷新不丢
- [ ] 8 张摘要卡数字正确
- [ ] 点击摘要卡跳转对应模块

---

### 阶段 4：计划模块（本周/今日计划）

**4.1 今日视图**
- 调用 `aggr.getTodayItems()`（和首页同一个接口）
- 每项展示来源标签（色点 + 文字：手动/健身/公司/学习/开发/自媒体）
- 可勾选完成（双向同步）
- 可编辑手动任务、删除手动任务
- 来自其他模块的项只读（跳转到源模块编辑）
- 顶部：今日完成数/总数 + 分段进度条

**4.2 本周视图**
- 周一到周日 7 列网格
- 每列显示当天项数量 + 小色点列表
- 点击某列 → 展开当天详情（同今日视图逻辑，但限定日期）
- 调用 `aggr.getTodayItems()` 的变体：`getItemsByDate(date)`

**4.3 新增手动任务**
- 右上角 `+` 按钮 → 就地表单
- 字段：标题、日期（默认今日）、优先级、备注
- 保存：`dao.save('tasks', { ...fields, source:'manual', done:false })`
- 验证：新增后出现在今日视图，刷新不丢

**验收点**：
- [ ] 今日视图展示所有今日项，来源标注正确
- [ ] 本周视图 7 天，每天数量正确，可点击展开
- [ ] 可新增手动任务
- [ ] 可编辑/删除手动任务
- [ ] 勾选完成双向同步

---

### 阶段 5：自媒体模块

**5.1 点子库列表**
- 调用 `dao.getAll('media')`
- 每行：标题 + 平台 + 状态标签（色块）+ 计划发布日期 + 操作按钮
- 顶部筛选：按状态（全部/点子/草稿/待发/已发）
- 右上角 `+` 新增

**5.2 新增/编辑点子**
- 就地表单
- 字段：标题、平台、状态、计划发布日期、发布链接、备注
- 状态可选：点子 → 草稿 → 待发 → 已发

**5.3 状态流转**
- 列表中可直接切状态（下拉或按钮组）
- 切到"已发"时提示填发布链接

**5.4 归档**
- 状态为"已发"的归到归档区（筛选即可，不单独存）

**验收点**：
- [ ] 可新增点子
- [ ] 可修改状态流转
- [ ] 可排发布日期
- [ ] 已发布可填链接
- [ ] 按状态筛选正常
- [ ] 待发且发布日期=今日的出现在今日计划

---

### 阶段 6：开发工作（AI）模块

**6.1 项目列表** → `Dev.vue`
- 调用 `dao.getAll('devProjects')`
- 每行：名称 + 简述 + 状态 + 进度条（自动算）
- 进度算法：该项目的 `devTasks` 中 done 数量 / 总数 × 100%
- 点击项目 → 跳转 `/dev/:id`

**6.2 项目详情** → `DevDetail.vue`
- 四个区块：
  - 项目信息（名称/简述/状态，可编辑）
  - 里程碑列表（名称/状态/预计日期，可增删改）
  - 任务列表（归属里程碑，标题/截止/优先级/完成，可增删改）
  - 代码片段列表（代码/说明/标签，可增删改）

**6.3 自动进度**
- 里程碑或任务完成度变化时，重新计算项目进度
- 进度条用 PixelProgress 组件渲染

**验收点**：
- [ ] 可新增项目
- [ ] 项目详情有里程碑/任务/代码片段
- [ ] 进度条随完成度自动更新
- [ ] 今日到期任务出现在今日计划

---

### 阶段 7：公司事情安排模块

**7.1 事项列表**
- 调用 `dao.getAll('companyItems')`
- 每行：标题 + 分类 + 优先级符号 + 截止日期 + 状态
- 顶部筛选：按分类 / 按状态
- 右上角 `+` 新增

**7.2 新增/编辑事项**
- 字段：标题、分类、优先级、截止时间、状态

**7.3 跟进备注**
- 点击事项 → 展开跟进备注区
- 显示历史备注列表（内容 + 时间戳，倒序）
- 底部输入框，回车新增备注（`dao.save('companyNotes', {itemId, content, timestamp})`）

**验收点**：
- [ ] 可新增事项
- [ ] 可按分类/状态筛选
- [ ] 可加跟进备注（带时间戳）
- [ ] 今日截止事项出现在今日计划

---

### 阶段 8：健身计划模块

**8.1 周训练排程**
- 调用 `dao.getAll('fitnessSchedule')`
- 周一到周日 7 行
- 每行：星期 + 训练名称 + 动作清单（动作名/组数/次数/重量备注）
- 可编辑每天的训练内容
- 今日训练高亮（边框/背景色）

**8.2 打卡**
- 今日训练行显示打卡按钮
- 点击打卡 → `dao.save('fitnessLogs', {date:today, done:true})`
- 显示本周已打卡天数 + 连续打卡天数

**8.3 身体数据**
- 表单：日期（默认今日）、体重、体脂（可选）、备注
- 历史列表倒序展示

**验收点**：
- [ ] 可编辑周排程
- [ ] 今日训练出现在今日计划
- [ ] 可打卡
- [ ] 可记录身体数据
- [ ] 历史列表正确

---

### 阶段 9：学习计划模块

**9.1 主题列表** → `Study.vue`
- 调用 `dao.getAll('studyTopics')`
- 每行：主题名 + 目标 + 状态 + 任务完成数/总数
- 点击主题 → 跳转 `/study/:id`

**9.2 主题详情** → `StudyDetail.vue`
- 四个区块：
  - 主题信息（名称/目标/状态，可编辑）
  - 学习任务列表（标题/截止/优先级/完成/备注，可增删改）
  - 打卡记录（日期/内容/时长，可新增，历史倒序）
  - 资料备忘（链接或要点，可增删）

**9.3 本周统计**
- 顶部显示：本周打卡次数 + 累计时长
- 连续打卡天数

**验收点**：
- [ ] 可新增学习主题
- [ ] 主题下可加任务/打卡/资料
- [ ] 今日到期任务出现在今日计划
- [ ] 本周统计正确

---

### 阶段 10：收支模块

**10.1 流水列表**
- 调用 `dao.getAll('financeRecords')` 按日期倒序
- 每行：日期 + 类型（收入绿/支出红）+ 分类 + 金额 + 备注
- 顶部：月份选择器（上一月/下一月），只显示选中月份
- 右上角 `+` 新增

**10.2 新增/编辑流水**
- 字段：金额、类型（收入/支出）、分类、日期、备注

**10.3 本月汇总**
- 顶部显示：本月总收入 + 总支出 + 结余
- 分类汇总：按分类分组，显示每类支出合计
- 用分段进度条展示各分类占比

**验收点**：
- [ ] 可新增流水
- [ ] 月份切换正常
- [ ] 本月汇总正确
- [ ] 分类汇总正确

---

### 阶段 11：数据与设置模块

**11.1 导出**
- 按钮"导出数据" → 调用 `backup.exportAll()` → 生成 JSON → 触发下载
- 文件名：`pixel-dashboard-YYYYMMDD.json`

**11.2 导入**
- 按钮"导入数据" → 选择文件 → 读取 JSON → 校验格式 → `backup.importAll(data)`
- 导入后刷新页面

**11.3 清空**
- 按钮"清空所有数据" → 像素确认对话框（二次确认）→ `backup.clearAll()`
- 清空后刷新页面

**11.4 主题切换**
- 三个选项：浅色 / 深色 / 跟随系统
- 切换即时生效

**验收点**：
- [ ] 导出 JSON 可下载
- [ ] 导入 JSON 后数据恢复
- [ ] 清空需二次确认
- [ ] 主题切换即时生效

---

### 阶段 12：响应式适配

**12.1 窄屏适配**
- 侧边栏：`@media max-width: 768px` 收成图标条，hover 显示文字
- 首页摘要卡：`@media max-width: 768px` 从网格改单列
- 表单/列表：宽度自适应，不溢出
- 字体：窄屏下适当缩小

**12.2 触摸适配**
- 按钮最小点击区域 44×44px
- 无 hover 依赖的交互

**验收点**：
- [ ] 浏览器宽度调到 375px 时，布局不溢出
- [ ] 侧边栏收成图标条
- [ ] 摘要卡单列
- [ ] 按钮可触摸点击

---

### 阶段 13：全量验收

对照 PRD.md 第 10 节的验收标准逐条检查：

**基础运行**
- [ ] 双击 `dist/index.html` 可运行
- [ ] 刷新/关闭/重启后数据不丢

**9 个模块**
- [ ] 导航 9 入口分组正确
- [ ] 各模块页面可进入
- [ ] 窄屏图标条

**首页**
- [ ] 日期状态
- [ ] 今日计划汇集 + 勾选
- [ ] 便签增删
- [ ] 8 张摘要卡

**各模块功能**
- [ ] 计划：今日/本周/手动任务 CRUD
- [ ] 自媒体：点子/状态流转/发布日/归档
- [ ] 开发：项目/里程碑/任务/片段/自动进度
- [ ] 公司：事项/跟进备注/筛选
- [ ] 健身：排程/打卡/身体数据
- [ ] 学习：主题/任务/打卡/资料/统计
- [ ] 收支：流水/汇总/分类/切月份

**数据与设置**
- [ ] 导出/导入/清空/主题

**今日汇集与同步**
- [ ] 自动汇集
- [ ] 双向同步

**视觉设计**
- [ ] 像素风
- [ ] 像素字体
- [ ] DOS 窗口控件
- [ ] 分段进度条
- [ ] 模块专属色
- [ ] 双主题

**架构**
- [ ] 数据接口层（界面不直接操作 IndexedDB）

---

## 开发顺序总结

| 阶段 | 内容 | 依赖 |
|------|------|------|
| 0 | 项目初始化 | 无 |
| 1 | 数据层 | 0 |
| 2 | UI 基础框架 | 0 |
| 3 | 首页 | 1 + 2 |
| 4 | 计划模块 | 1 + 2 + 3 |
| 5 | 自媒体 | 1 + 2 |
| 6 | 开发（AI） | 1 + 2 |
| 7 | 公司 | 1 + 2 |
| 8 | 健身 | 1 + 2 |
| 9 | 学习 | 1 + 2 |
| 10 | 收支 | 1 + 2 |
| 11 | 数据与设置 | 1 + 2 |
| 12 | 响应式适配 | 所有模块 |
| 13 | 全量验收 | 所有模块 |

> 阶段 5-11 之间无依赖，可并行或按任意顺序。建议先做首页（阶段 3）和计划模块（阶段 4），因为它们是最核心的中枢，能验证汇集机制是否跑通。
