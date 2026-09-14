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
import { getChineseDate, today, isThisWeek, isThisMonth, formatMonth } from '@/utils/date'
import {
  SOURCE_LABELS,
  SOURCE_COLOR_VAR,
  PRIORITY_SYMBOLS,
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

  summaryCards.value = [
    {
      name: 'plan', label: '计划', color: '--c-plan', route: '/plan',
      number: `${taskDone}/${tasks.length}`, text: '今日完成'
    },
    {
      name: 'media', label: '自媒体', color: '--c-media', route: '/media',
      number: pendingMedia.length, text: '本周待发布'
    },
    {
      name: 'dev', label: '开发（AI）', color: '--c-dev', route: '/dev',
      number: activeProjects.length, text: `进行中 · ${devProgress}%`
    },
    {
      name: 'company', label: '公司', color: '--c-company', route: '/company',
      number: weekCompany.length, text: '本周截止'
    },
    {
      name: 'fitness', label: '健身', color: '--c-fitness', route: '/fitness',
      number: weekFitness.length, text: '本周已练'
    },
    {
      name: 'study', label: '学习', color: '--c-study', route: '/study',
      number: activeTopics.length, text: `本周${weekStudy.length}次`
    },
    {
      name: 'finance', label: '收支', color: '--c-finance', route: '/finance',
      number: `¥${monthExpense}`, text: `收 ¥${monthIncome}`
    }
  ]
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
  max-width: 900px;
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
  margin-bottom: 1rem;
  font-size: 1.1rem;
  font-weight: 700;
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
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 0.75rem;
}
.summary-card {
  border: 3px solid var(--border);
  background: var(--bg);
  cursor: pointer;
  transition: transform 0.05s;
}
.summary-card:hover {
  transform: translate(2px, -2px);
}
.summary-card__header {
  padding: 0.4rem 0.6rem;
  font-size: 1rem;
  font-weight: 700;
  color: var(--bg);
}
.summary-card__body {
  padding: 0.6rem;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}
.summary-card__number {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text);
}
.summary-card__text {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--ochre);
}
@media (max-width: 768px) {
  .memos__grid,
  .summary-grid {
    grid-template-columns: 1fr;
  }
}
</style>
