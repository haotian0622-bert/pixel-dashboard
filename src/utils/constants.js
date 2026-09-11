/**
 * 枚举常量
 */

// 任务优先级
export const PRIORITY = {
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low'
}

export const PRIORITY_LABELS = {
  high: '高',
  medium: '中',
  low: '低'
}

export const PRIORITY_SYMBOLS = {
  high: '!!',
  medium: '!',
  low: '·'
}

// 自媒体点子状态
export const MEDIA_STATUS = {
  IDEA: 'idea',       // 点子
  DRAFT: 'draft',     // 草稿
  SCHEDULED: 'scheduled', // 待发
  PUBLISHED: 'published'  // 已发
}

export const MEDIA_STATUS_LABELS = {
  idea: '点子',
  draft: '草稿',
  scheduled: '待发',
  published: '已发'
}

// 开发项目状态
export const DEV_PROJECT_STATUS = {
  PLANNING: 'planning',  // 规划中
  ACTIVE: 'active',      // 进行中
  PAUSED: 'paused',       // 暂停
  DONE: 'done'            // 完成
}

export const DEV_PROJECT_STATUS_LABELS = {
  planning: '规划中',
  active: '进行中',
  paused: '暂停',
  done: '完成'
}

// 里程碑状态
export const MILESTONE_STATUS = {
  NOT_STARTED: 'not_started',
  ACTIVE: 'active',
  DONE: 'done'
}

export const MILESTONE_STATUS_LABELS = {
  not_started: '未开始',
  active: '进行中',
  done: '完成'
}

// 公司事项状态
export const COMPANY_STATUS = {
  TODO: 'todo',         // 待办
  ACTIVE: 'active',      // 进行中
  DONE: 'done',          // 已完成
  SHELVED: 'shelved'     // 搁置
}

export const COMPANY_STATUS_LABELS = {
  todo: '待办',
  active: '进行中',
  done: '已完成',
  shelved: '搁置'
}

// 公司事项分类
export const COMPANY_CATEGORY = {
  PROJECT: 'project',   // 项目
  MEETING: 'meeting',   // 会议
  LIAISON: 'liaison',   // 对接
  DAILY: 'daily'        // 日常
}

export const COMPANY_CATEGORY_LABELS = {
  project: '项目',
  meeting: '会议',
  liaison: '对接',
  daily: '日常'
}

// 学习主题状态
export const STUDY_STATUS = {
  ACTIVE: 'active',    // 进行中
  DONE: 'done',        // 已完成
  SHELVED: 'shelved'   // 搁置
}

export const STUDY_STATUS_LABELS = {
  active: '进行中',
  done: '已完成',
  shelved: '搁置'
}

// 收支类型
export const FINANCE_TYPE = {
  INCOME: 'income',   // 收入
  EXPENSE: 'expense'   // 支出
}

export const FINANCE_TYPE_LABELS = {
  income: '收入',
  expense: '支出'
}

// 收支分类
export const FINANCE_CATEGORY = {
  FOOD: 'food',         // 餐饮
  TRANSPORT: 'transport', // 交通
  SALARY: 'salary',     // 工资
  SHOPPING: 'shopping', // 购物
  OTHER: 'other'        // 其他
}

export const FINANCE_CATEGORY_LABELS = {
  food: '餐饮',
  transport: '交通',
  salary: '工资',
  shopping: '购物',
  other: '其他'
}

// 任务来源
export const SOURCE = {
  MANUAL: 'manual',     // 手动
  MEDIA: 'media',       // 自媒体
  DEV: 'dev',           // 开发
  COMPANY: 'company',   // 公司
  FITNESS: 'fitness',   // 健身
  STUDY: 'study'        // 学习
}

export const SOURCE_LABELS = {
  manual: '手动',
  media: '自媒体',
  dev: '开发',
  company: '公司',
  fitness: '健身',
  study: '学习'
}

// 模块专属色变量名映射
export const SOURCE_COLOR_VAR = {
  manual: '--c-plan',
  media: '--c-media',
  dev: '--c-dev',
  company: '--c-company',
  fitness: '--c-fitness',
  study: '--c-study'
}

// 所有 Store 名称
export const STORES = [
  'tasks',
  'memos',
  'media',
  'devProjects',
  'devMilestones',
  'devTasks',
  'devSnippets',
  'companyItems',
  'companyNotes',
  'fitnessSchedule',
  'fitnessLogs',
  'fitnessBody',
  'studyTopics',
  'studyTasks',
  'studyLogs',
  'studyMaterials',
  'financeRecords',
  'meta'
]
