<template>
  <div class="home">
    <!-- 页头 -->
    <div class="home__header">
      <h1 class="home__date">{{ dateStr }}</h1>
      <p class="home__status">{{ statusText }}</p>
    </div>

    <!-- 右侧悬浮快捷改期条（明天/后天/本周剩余） -->
    <div
      class="home__quick-strip"
      :class="{ 'home__quick-strip--open': quickStripOpen, 'home__quick-strip--drag-over': !!stripOverDate }"
      @mouseenter="quickStripOpen = true"
      @mouseleave="quickStripOpen = false"
    >
      <div class="home__quick-strip__label">
        <span v-if="quickStripOpen">挪到其他日期</span>
        <span v-else class="home__quick-strip__hint">日期</span>
      </div>
      <button
        v-for="d in upcomingDates"
        :key="d.date"
        class="home__quick-strip__item"
        :data-strip-date="d.date"
        :class="{ 'home__quick-strip__item--over': stripOverDate === d.date, 'home__quick-strip__item--today': d.isToday }"
      >
        <span class="home__quick-strip__wd">周{{ d.wd }}</span>
        <span class="home__quick-strip__md">{{ d.md }}</span>
      </button>
    </div>

    <!-- 今日计划区 -->
    <PixelWindow title="今日计划" icon="★" class="home__section">
      <div class="today-plan">
        <div class="today-plan__bar">
          <div class="today-plan__stats" style="margin-bottom: 0; flex: 1">
            <span>{{ todayDoneCount }}/{{ todayItems.length }} 完成</span>
            <PixelProgress :value="todayProgress" :max="10" />
          </div>
          <button class="pixel-btn pixel-btn--confirm today-plan__add-btn" @click="toggleAddForm">
            ＋ 添加任务
          </button>
        </div>

        <!-- 首页直接添加任务（可选日期，默认今天） -->
        <div v-if="showAddTask" class="today-plan__form">
          <PixelInput
            v-model="newTask.title"
            placeholder="任务标题"
            @keyup.enter="saveNewTask"
          />
          <div class="today-plan__form-row">
            <label>日期</label>
            <input
              type="date"
              class="pixel-input today-plan__date-picker"
              v-model="newTask.date"
            />
            <label>优先级</label>
            <PixelSelect v-model="newTask.priority" :options="priorityOptions" />
            <label>时段</label>
            <PixelSelect v-model="newTask.timeSlot" :options="timeSlotOptions" />
            <label>耗时(h)</label>
            <input
              type="number"
              class="pixel-input today-plan__time-cost"
              v-model.number="newTask.timeCost"
              min="0"
              step="0.5"
              placeholder="0"
            />
          </div>
          <div class="today-plan__form-actions">
            <button class="pixel-btn pixel-btn--confirm" @click="saveNewTask">保存</button>
            <button class="pixel-btn" @click="showAddTask = false">取消</button>
          </div>
        </div>

        <div v-if="todayItems.length === 0" class="pixel-empty">
          <span class="pixel-empty__icon">◇</span>
          <span class="pixel-empty__text">今日暂无待办</span>
        </div>
        <ul v-else class="today-plan__list" data-list-container>
          <li
            v-for="(item, idx) in todayItems"
            :key="item.id"
            class="today-plan__item"
            :class="{
              'task-done': item.done,
              'today-plan__item--dragging': dragging && dragging.item && dragging.item.id === item.id,
              'today-plan__item--placeholder': dragging && dragging.mode === 'sort' && dragging.targetIdx === idx
            }"
          >
            <!-- 左侧拖拽把手：手动任务可排序，全部可拖到右侧改期 -->
            <span
              v-if="item.source === 'manual'"
              class="drag-handle"
              title="按住拖动排序 / 拖到右侧改期"
              @pointerdown.prevent="startDrag($event, item, 'sort')"
            >⠿</span>
            <span
              v-else
              class="drag-handle drag-handle--readonly"
              title="拖到右侧改期"
              @pointerdown.prevent="startDrag($event, item, 'reschedule')"
            >⠿</span>
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
        <p v-if="dragMsg" class="today-plan__drag-msg">{{ dragMsg }}</p>
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
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import PixelWindow from '@/components/PixelWindow.vue'
import PixelProgress from '@/components/PixelProgress.vue'
import PixelInput from '@/components/PixelInput.vue'
import PixelSelect from '@/components/PixelSelect.vue'
import {
  getTodayItems,
  toggleDone,
  reorderManualTasks,
  moveItemToDate
} from '@/db/aggr'
import { getAll, save, remove } from '@/db/dao'
import { query } from '@/db/dao'
import {
  getChineseDate,
  today,
  isThisWeek,
  isThisMonth,
  formatMonth,
  getWeekday,
  formatDate
} from '@/utils/date'
import {
  SOURCE_LABELS,
  SOURCE_COLOR_VAR,
  PRIORITY_SYMBOLS,
  PRIORITY,
  PRIORITY_LABELS,
  TIME_SLOT,
  TIME_SLOT_LABELS,
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

// 首页直接添加任务
const showAddTask = ref(false)
const newTask = ref({
  title: '',
  date: today(),
  priority: PRIORITY.MEDIUM,
  timeSlot: TIME_SLOT.ANY,
  timeCost: 0
})
const priorityOptions = [
  { value: PRIORITY.HIGH, label: PRIORITY_LABELS.high },
  { value: PRIORITY.MEDIUM, label: PRIORITY_LABELS.medium },
  { value: PRIORITY.LOW, label: PRIORITY_LABELS.low }
]
const timeSlotOptions = [
  { value: TIME_SLOT.ANY, label: TIME_SLOT_LABELS.any },
  { value: TIME_SLOT.DAY, label: TIME_SLOT_LABELS.day },
  { value: TIME_SLOT.NIGHT, label: TIME_SLOT_LABELS.night }
]

// 右侧悬浮日期条：明天 / 后天 / 本周剩余 5 天（含今天作为跳转参考）
const quickStripOpen = ref(false)
const stripOverDate = ref('')
const dragMsg = ref('')
const weekdayNames = ['一', '二', '三', '四', '五', '六', '日']

const upcomingDates = computed(() => {
  const todayObj = new Date()
  // 算出本周剩余 6 天（明天到下周日），共 6 条
  const result = []
  for (let i = 1; i <= 7; i++) {
    const d = new Date(todayObj)
    d.setDate(todayObj.getDate() + i)
    const dateStr = formatDate(d)
    const wd = getWeekday(dateStr)
    result.push({
      date: dateStr,
      wd: weekdayNames[wd - 1],
      md: `${d.getMonth() + 1}/${d.getDate()}`,
      isToday: false
    })
  }
  return result
})

function toggleAddForm() {
  showAddTask.value = !showAddTask.value
}

async function saveNewTask() {
  if (!newTask.value.title.trim()) return
  await save('tasks', {
    title: newTask.value.title.trim(),
    date: newTask.value.date || today(),
    priority: newTask.value.priority,
    timeSlot: newTask.value.timeSlot,
    timeCost: Number(newTask.value.timeCost) || 0,
    note: '',
    done: false,
    source: 'manual'
  })
  newTask.value = { title: '', date: today(), priority: PRIORITY.MEDIUM, timeSlot: TIME_SLOT.ANY, timeCost: 0 }
  showAddTask.value = false
  await loadTodayItems()
  await loadSummaryCards()
}

// ===== 拖拽：列表内排序(sort) / 拖到右侧改期(reschedule) =====
const dragging = ref(null)
let dragState = null

function startDrag(e, item, mode) {
  if (e.pointerType === 'mouse' && e.button !== 0) return
  dragState = {
    mode,                    // 'sort' | 'reschedule'
    item,
    startX: e.clientX,
    startY: e.clientY,
    active: false,
    ghost: null,
    targetIdx: -1
  }
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
  window.addEventListener('pointercancel', onPointerUp)
}

function onPointerMove(e) {
  const s = dragState
  if (!s) return
  const dx = e.clientX - s.startX
  const dy = e.clientY - s.startY

  if (!s.active) {
    if (Math.hypot(dx, dy) < 8) return
    s.active = true
    dragging.value = { mode: s.mode, item: s.item }
    // 创建 ghost 气泡（不管哪种模式都显示）
    const ghost = document.createElement('div')
    ghost.className = 'home-drag-ghost'
    ghost.textContent = s.item.title
    ghost.style.cssText = [
      'position:fixed',
      'z-index:9999',
      'pointer-events:none',
      'padding:6px 12px',
      'border:3px solid var(--accent)',
      'background:var(--panel)',
      'color:var(--text)',
      'font-weight:700',
      'font-size:16px',
      'box-shadow:3px 3px 0 var(--shadow)',
      'max-width:240px',
      'white-space:nowrap',
      'overflow:hidden',
      'text-overflow:ellipsis'
    ].join(';')
    document.body.appendChild(ghost)
    s.ghost = ghost
  }

  s.ghost.style.left = `${e.clientX + 14}px`
  s.ghost.style.top = `${e.clientY - 18}px`

  // 1) 检查是否悬停在右侧日期条上（两种模式都支持）
  const stripEl = document.elementFromPoint(e.clientX, e.clientY)
  const stripItem = stripEl && stripEl.closest ? stripEl.closest('[data-strip-date]') : null
  if (stripItem) {
    stripOverDate.value = stripItem.getAttribute('data-strip-date')
    s.targetIdx = -1
    return
  }

  // 2) 排序模式：只在 today-plan__list 内有效
  stripOverDate.value = ''
  if (s.mode === 'sort') {
    const listEl = document.elementFromPoint(e.clientX, e.clientY)
    const listItem = listEl && listEl.closest ? listEl.closest('.today-plan__item') : null
    if (!listItem) {
      s.targetIdx = -1
      return
    }
    const items = Array.from(document.querySelectorAll('.today-plan__list .today-plan__item'))
    const idx = items.indexOf(listItem)
    s.targetIdx = idx >= 0 ? idx : -1
  } else {
    s.targetIdx = -1
  }
}

async function onPointerUp(e) {
  const s = dragState
  cleanupDrag()
  if (!s || !s.active) return

  // 1) 先判断是不是放到了右侧日期条上（改期）
  const el = document.elementFromPoint(e.clientX, e.clientY)
  const stripItem = el && el.closest ? el.closest('[data-strip-date]') : null
  if (stripItem) {
    const target = stripItem.getAttribute('data-strip-date')
    const ok = await moveItemToDate(s.item, target)
    if (!ok) {
      dragMsg.value = '健身任务按星期排程，不能改期'
      setTimeout(() => { dragMsg.value = '' }, 2500)
    } else {
      dragMsg.value = `已挪到 ${target.slice(5)}`
      setTimeout(() => { dragMsg.value = '' }, 2000)
      await loadTodayItems()
      await loadSummaryCards()
    }
    return
  }

  // 2) 排序模式：目标索引有效且和原位置不同 → 重排
  if (s.mode === 'sort' && s.targetIdx >= 0 && s.item.source === 'manual') {
    const curManual = todayItems.value.filter(i => i.source === 'manual')
    const curIdx = curManual.findIndex(i => i.id === s.item.id)
    if (curIdx >= 0 && curIdx !== s.targetIdx && s.targetIdx < curManual.length) {
      const next = [...curManual]
      const [moved] = next.splice(curIdx, 1)
      next.splice(s.targetIdx, 0, moved)
      await reorderManualTasks(next)
      dragMsg.value = '顺序已更新'
      setTimeout(() => { dragMsg.value = '' }, 1500)
      await loadTodayItems()
    }
  }
}

function cleanupDrag() {
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
  window.removeEventListener('pointercancel', onPointerUp)
  if (dragState && dragState.ghost) dragState.ghost.remove()
  dragState = null
  dragging.value = null
  stripOverDate.value = ''
}

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
onUnmounted(cleanupDrag)
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
  font-weight: 700;
  color: var(--ochre);
  margin-top: 0.25rem;
}
.home__section {
  margin-bottom: 1.5rem;
}
.today-plan__bar {
  display: flex;
  align-items: stretch;
  gap: 0.75rem;
  margin-bottom: 1.25rem;
}
.today-plan__add-btn {
  align-self: stretch;
  padding: 0.5rem 1rem;
  font-size: 1.1rem;
  font-weight: 700;
  white-space: nowrap;
}
.today-plan__form {
  border: 3px solid var(--border);
  background: var(--bg);
  padding: 0.75rem;
  margin-bottom: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}
.today-plan__form-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  font-size: 1.05rem;
  font-weight: 700;
}
.today-plan__time-cost {
  max-width: 90px;
}
.today-plan__form-actions {
  display: flex;
  gap: 0.5rem;
}
@media (max-width: 768px) {
  .today-plan__bar {
    flex-direction: column;
  }
  .today-plan__add-btn {
    padding: 0.6rem 1rem;
  }
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
  font-weight: 700;
}
.today-plan__item:last-child {
  border-bottom: none;
}
.today-plan__item-title {
  flex: 1;
}
.today-plan__item-source {
  font-size: 0.8rem;
  font-weight: 700;
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
  font-weight: 700;
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
  font-weight: 700;
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
  font-weight: 700;
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

/* ===== 右侧悬浮日期细条 ===== */
.home__quick-strip {
  position: fixed;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  z-index: 50;
  width: 48px;
  background: var(--panel);
  border: 3px solid var(--border);
  border-right: none;
  border-radius: 6px 0 0 6px;
  padding: 0.4rem 0.25rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  transition: width 0.2s, padding 0.2s, background 0.15s, border-color 0.15s;
  box-shadow: -3px 3px 0 var(--shadow);
}
.home__quick-strip--open {
  width: 96px;
  padding: 0.5rem 0.35rem;
}
.home__quick-strip--drag-over {
  background: var(--bg);
  border-color: var(--accent);
}
.home__quick-strip__label {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--ochre);
  writing-mode: vertical-rl;
  letter-spacing: 2px;
  padding: 0.35rem 0.1rem;
  border-bottom: 2px dashed var(--border);
  margin-bottom: 0.25rem;
}
.home__quick-strip--open .home__quick-strip__label {
  writing-mode: horizontal-tb;
  letter-spacing: 0;
  font-size: 1rem;
  text-align: center;
  padding: 0;
}
.home__quick-strip__hint {
  font-size: 1rem;
  color: var(--accent);
}
.home__quick-strip__item {
  width: 100%;
  border: 2px solid var(--border);
  background: var(--bg);
  padding: 0.35rem 0.15rem;
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--text);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.1rem;
  border-radius: 4px;
  transition: background 0.1s, border-color 0.1s, transform 0.1s;
}
.home__quick-strip__item:hover {
  background: var(--panel);
  border-color: var(--accent);
}
.home__quick-strip__item--over {
  background: var(--panel);
  border-color: var(--accent);
  border-style: dashed;
  transform: translateX(-2px);
}
.home__quick-strip__item--today {
  border-color: var(--accent);
  color: var(--accent);
}
.home__quick-strip__wd {
  font-size: 0.9rem;
  color: var(--ochre);
}
.home__quick-strip__md {
  font-size: 0.95rem;
}

/* ===== 日期选择器 ===== */
.today-plan__date-picker {
  max-width: 160px;
}

/* ===== 拖拽把手 ===== */
.today-plan__item {
  position: relative;
  transition: opacity 0.15s;
}
.drag-handle {
  cursor: grab;
  touch-action: none;
  color: var(--accent);
  font-size: 1.2rem;
  line-height: 1;
  padding: 0.2rem 0.15rem;
  user-select: none;
}
.drag-handle:active { cursor: grabbing; }
.drag-handle--readonly {
  color: var(--ochre);
  opacity: 0.7;
}
.today-plan__item--dragging {
  opacity: 0.35;
}
.today-plan__item--placeholder {
  border-top: 3px dashed var(--accent) !important;
  margin-top: 0.15rem;
}
.today-plan__drag-msg {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--accent);
  margin-top: 0.3rem;
}

/* 给右侧细条留一点右边距（桌面） */
@media (max-width: 768px) {
  .home__quick-strip {
    width: 44px;
  }
  .home__quick-strip--open {
    width: 88px;
  }
  .today-plan__date-picker {
    max-width: 140px;
  }
}
</style>
