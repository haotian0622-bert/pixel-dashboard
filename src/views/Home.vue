<template>
  <div class="home">
    <!-- 页头 -->
    <div class="home__header">
      <h1 class="home__date">{{ dateStr }}</h1>
      <p class="home__status">{{ statusText }}</p>
    </div>

    <!-- 今日计划区 -->
    <PixelWindow title="今日计划" icon="★" class="home__section">
      <div class="today-plan">
        <div class="today-plan__stats">
          <span>{{ todayDoneCount }}/{{ todayItems.length }} 完成</span>
          <PixelProgress :value="todayProgress" :max="10" />
        </div>
        <div v-if="todayItems.length === 0" class="pixel-empty">
          <span class="pixel-empty__icon">◇</span>
          <span class="pixel-empty__text">今日暂无待办</span>
        </div>
        <ul v-else class="today-plan__list">
          <li
            v-for="item in todayItems"
            :key="item.id"
            class="today-plan__item"
            :class="{ 'task-done': item.done }"
          >
            <span
              class="task-checkbox"
              :class="{ 'task-checkbox--checked': item.done }"
              @click="onToggle(item)"
            >{{ item.done ? '✔' : '□' }}</span>
            <span
              class="source-dot"
              :style="{ background: `var(${sourceColorVar[item.source]})` }"
            ></span>
            <span class="today-plan__item-title">{{ item.title }}</span>
            <span class="today-plan__item-source">{{ sourceLabels[item.source] }}</span>
            <span v-if="item.priority" class="today-plan__item-priority">
              {{ prioritySymbols[item.priority] }}
            </span>
            <span v-if="item.timeSlot && item.timeSlot !== 'any'" class="today-plan__item-time-slot">
              {{ timeSlotSymbols[item.timeSlot] }}
            </span>
            <span v-if="item.timeCost" class="today-plan__item-time-cost">
              ⏱{{ item.timeCost }}h
            </span>
          </li>
        </ul>
      </div>
    </PixelWindow>

    <!-- 快速备忘区 -->
    <PixelWindow title="快速备忘" icon="✎" class="home__section">
      <div class="memos">
        <div class="memos__grid">
          <div v-for="memo in memos" :key="memo.id" class="memo-card">
            <p class="memo-card__content">{{ memo.content }}</p>
            <button class="memo-card__delete pixel-btn" @click="deleteMemo(memo.id)">删</button>
          </div>
        </div>
        <div v-if="showNewMemo" class="memo-new">
          <PixelInput
            v-model="newMemoContent"
            type="textarea"
            placeholder="记点什么..."
            @blur="saveNewMemo"
          />
        </div>
        <button class="pixel-btn" @click="showNewMemo = true">+ 新建便签</button>
      </div>
    </PixelWindow>

    <!-- 模块摘要卡片网格 -->
    <PixelWindow title="模块总览" icon="◆" class="home__section">
      <div class="summary-grid">
        <div
          v-for="card in summaryCards"
          :key="card.name"
          class="summary-card"
          :style="{ borderColor: `var(${card.color})` }"
          @click="goTo(card.route)"
        >
          <div
            class="summary-card__header"
            :style="{ background: `var(${card.color})` }"
          >
            {{ card.label }}
          </div>
          <div class="summary-card__body">
            <span class="summary-card__number">{{ card.number }}</span>
            <span class="summary-card__text">{{ card.text }}</span>
            <ul v-if="card.lines && card.lines.length" class="summary-card__lines">
              <li
                v-for="(line, i) in card.lines"
                :key="i"
                class="summary-card__line"
              >{{ line }}</li>
            </ul>
          </div>
        </div>
      </div>
    </PixelWindow>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import PixelWindow from '@/components/PixelWindow.vue'
import PixelProgress from '@/components/PixelProgress.vue'
import PixelInput from '@/components/PixelInput.vue'
import { getTodayItems, toggleDone } from '@/db/aggr'
import { getAll, save, remove } from '@/db/dao'
import { query } from '@/db/dao'
import { getChineseDate, today, isThisWeek, isThisMonth, formatMonth, getWeekday } from '@/utils/date'
import {
  SOURCE_LABELS,
  SOURCE_COLOR_VAR,
  PRIORITY_SYMBOLS,
  TIME_SLOT_SYMBOLS,
  MEDIA_STATUS
} from '@/utils/constants'

const router = useRouter()

// 今日计划
const todayItems = ref([])
const todayDoneCount = computed(() => todayItems.value.filter(i => i.done).length)
const todayProgress = computed(() => {
  if (todayItems.value.length === 0) return 0
  return Math.round((todayDoneCount.value / todayItems.value.length) * 100)
})

const sourceLabels = SOURCE_LABELS
const sourceColorVar = SOURCE_COLOR_VAR
const prioritySymbols = PRIORITY_SYMBOLS
const timeSlotSymbols = TIME_SLOT_SYMBOLS

// 便签
const memos = ref([])
const showNewMemo = ref(false)
const newMemoContent = ref('')

// 日期
const dateStr = computed(() => getChineseDate(new Date()))

// 状态文本
const statusText = computed(() => {
  const total = todayItems.value.length
  const done = todayDoneCount.value
  const pending = total - done
  return `今日 ${total} 项待办，已完成 ${done} 项`
})

// 摘要卡
const summaryCards = ref([])

async function loadTodayItems() {
  todayItems.value = await getTodayItems()
}

async function loadMemos() {
  memos.value = await getAll('memos')
}

async function loadSummaryCards() {
  const todayStr = today()

  // 计划摘要
  const tasks = await query('tasks', 'date', todayStr)
  const taskDone = tasks.filter(t => t.done).length

  // 自媒体摘要
  const allMedia = await getAll('media')
  const pendingMedia = allMedia.filter(m => m.status === MEDIA_STATUS.SCHEDULED && isThisWeek(m.publishDate))

  // 开发摘要
  const projects = await getAll('devProjects')
  const activeProjects = projects.filter(p => p.status === 'active')
  const devTasks = await getAll('devTasks')
  let devProgress = 0
  if (devTasks.length > 0) {
    devProgress = Math.round((devTasks.filter(t => t.done).length / devTasks.length) * 100)
  }

  // 公司摘要
  const companyItems = await getAll('companyItems')
  const weekCompany = companyItems.filter(c =>
    c.deadline && isThisWeek(c.deadline) && c.status !== 'done' && c.status !== 'shelved'
  )

  // 健身摘要
  const fitnessLogs = await getAll('fitnessLogs')
  const weekFitness = fitnessLogs.filter(l => isThisWeek(l.date))
  const fitnessSchedule = await getAll('fitnessSchedule')

  // 学习摘要
  const studyTopics = await getAll('studyTopics')
  const activeTopics = studyTopics.filter(t => t.status === 'active')
  const studyLogs = await getAll('studyLogs')
  const weekStudy = studyLogs.filter(l => isThisWeek(l.date))

  // 收支摘要
  const financeRecords = await getAll('financeRecords')
  const monthRecords = financeRecords.filter(r => isThisMonth(r.date))
  const monthExpense = monthRecords
    .filter(r => r.type === 'expense')
    .reduce((sum, r) => sum + Number(r.amount || 0), 0)
  const monthIncome = monthRecords
    .filter(r => r.type === 'income')
    .reduce((sum, r) => sum + Number(r.amount || 0), 0)

  // ===== 各卡片明细（最多 2 行，放大信息量）=====
  // 计划：未完成任务标题
  const planLines = tasks
    .filter(t => !t.done)
    .slice(0, 2)
    .map(t => `□ ${clip(t.title)}`)
  if (planLines.length === 0 && tasks.length > 0) planLines.push('✓ 今日全部完成')

  // 自媒体：本周待发布的视频日期+标题
  const mediaLines = pendingMedia
    .slice(0, 2)
    .map(m => `${md(m.publishDate)} ${clip(m.title)}`.trim())

  // 开发：进行中项目名
  const devLines = activeProjects
    .slice(0, 2)
    .map(p => `▸ ${clip(p.name)}`)

  // 公司：本周截止事项
  const companyLines = weekCompany
    .slice(0, 2)
    .map(c => `${md(c.deadline)} ${clip(c.title)}`.trim())

  // 健身：今日计划 + 最近打卡
  const fitnessLines = []
  const todayPlan = fitnessSchedule.find(s => s.weekday === getWeekday())
  const sortedFitness = [...weekFitness].sort((a, b) => (b.date || '').localeCompare(a.date || ''))
  if (todayPlan?.name) {
    fitnessLines.push(`今日 ${clip(todayPlan.name)}`)
    if (sortedFitness[0]) fitnessLines.push(`最近打卡 ${md(sortedFitness[0].date)}`)
  } else {
    sortedFitness.slice(0, 2).forEach(l => fitnessLines.push(`打卡 ${md(l.date)}`))
  }

  // 学习：进行中主题名
  const studyLines = activeTopics
    .slice(0, 2)
    .map(t => `▸ ${clip(t.name)}`)

  // 收支：净额 + 笔数
  const financeLines = [
    `净 ¥${monthIncome - monthExpense}`,
    `本月 ${monthRecords.length} 笔`
  ]

  summaryCards.value = [
    {
      name: 'plan', label: '计划', color: '--c-plan', route: '/plan',
      number: `${taskDone}/${tasks.length}`, text: '今日完成', lines: planLines
    },
    {
      name: 'media', label: '自媒体', color: '--c-media', route: '/media',
      number: pendingMedia.length, text: '本周待发布', lines: mediaLines
    },
    {
      name: 'dev', label: '开发（AI）', color: '--c-dev', route: '/dev',
      number: activeProjects.length, text: `进行中 · ${devProgress}%`, lines: devLines
    },
    {
      name: 'company', label: '公司', color: '--c-company', route: '/company',
      number: weekCompany.length, text: '本周截止', lines: companyLines
    },
    {
      name: 'fitness', label: '健身', color: '--c-fitness', route: '/fitness',
      number: weekFitness.length, text: '本周已练', lines: fitnessLines
    },
    {
      name: 'study', label: '学习', color: '--c-study', route: '/study',
      number: activeTopics.length, text: `本周${weekStudy.length}次`, lines: studyLines
    },
    {
      name: 'finance', label: '收支', color: '--c-finance', route: '/finance',
      number: `¥${monthExpense}`, text: `收 ¥${monthIncome}`, lines: financeLines
    }
  ]
}

// 明细文本工具：超长截断 / 日期取 MM-DD
function clip(s, n = 8) {
  s = String(s || '')
  return s.length > n ? `${s.slice(0, n)}…` : s
}
function md(dateStr) {
  return dateStr ? String(dateStr).slice(5) : ''
}

async function onToggle(item) {
  await toggleDone(item)
  await loadTodayItems()
  await loadSummaryCards()
}

async function saveNewMemo() {
  if (newMemoContent.value.trim()) {
    await save('memos', { content: newMemoContent.value.trim() })
    newMemoContent.value = ''
    await loadMemos()
  }
  showNewMemo.value = false
}

async function deleteMemo(id) {
  await remove('memos', id)
  await loadMemos()
}

function goTo(path) {
  router.push(path)
}

onMounted(async () => {
  await loadTodayItems()
  await loadMemos()
  await loadSummaryCards()
})
</script>

<style scoped>
.home {
  max-width: 980px;
  margin: 0 auto;
}
.home__header {
  margin-bottom: 1.5rem;
  text-align: center;
}
.home__date {
  font-size: 2rem;
  font-weight: 700;
}
.home__status {
  font-size: 1rem;
  font-weight: 600;
  color: var(--ochre);
  margin-top: 0.25rem;
}
.home__section {
  margin-bottom: 1.5rem;
}
.today-plan__stats {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.25rem;
  padding: 0.75rem 1rem;
  border: 3px solid var(--text);
  background: var(--bg);
  font-size: 1.25rem;
  font-weight: 700;
  box-shadow: 3px 3px 0 var(--shadow);
}
.today-plan__list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.today-plan__item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.5rem;
  border-bottom: 2px solid var(--border);
  font-size: 1.05rem;
  font-weight: 600;
}
.today-plan__item:last-child {
  border-bottom: none;
}
.today-plan__item-title {
  flex: 1;
}
.today-plan__item-source {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--ochre);
  opacity: 0.7;
}
.today-plan__item-priority {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--accent);
}
.today-plan__item-time-slot {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--c-dev);
}
.today-plan__item-time-cost {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--olive);
  white-space: nowrap;
}
.memos__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 0.75rem;
  margin-bottom: 1rem;
}
.memo-card {
  border: 3px solid var(--border);
  padding: 0.75rem;
  background: var(--bg);
  position: relative;
}
.memo-card__content {
  font-size: 1rem;
  font-weight: 600;
  white-space: pre-wrap;
  word-break: break-all;
  padding-right: 1.5rem;
}
.memo-card__delete {
  position: absolute;
  top: 0.25rem;
  right: 0.25rem;
  padding: 0.1rem 0.4rem;
  font-size: 0.8rem;
  font-weight: 700;
}
.memo-new {
  margin-bottom: 1rem;
}
.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(225px, 1fr));
  gap: 1rem;
}
.summary-card {
  border: 3px solid var(--border);
  background: var(--bg);
  cursor: pointer;
  transition: transform 0.05s;
  box-shadow: 3px 3px 0 var(--shadow);
  display: flex;
  flex-direction: column;
}
.summary-card:hover {
  transform: translate(2px, -2px);
}
.summary-card__header {
  padding: 0.6rem 0.85rem;
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--bg);
}
.summary-card__body {
  padding: 0.85rem 0.9rem;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  flex: 1;
}
.summary-card__number {
  font-size: 1.85rem;
  font-weight: 700;
  color: var(--text);
  line-height: 1.1;
}
.summary-card__text {
  font-size: 1rem;
  font-weight: 600;
  color: var(--ochre);
}
.summary-card__lines {
  list-style: none;
  margin: 0.45rem 0 0;
  padding: 0.5rem 0 0;
  border-top: 2px dashed var(--border);
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.summary-card__line {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text);
  opacity: 0.8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
@media (max-width: 768px) {
  .memos__grid,
  .summary-grid {
    grid-template-columns: 1fr;
  }
}
</style>
