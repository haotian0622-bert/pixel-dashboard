<template>
  <div class="plan">
    <!-- 右侧悬浮快捷改期条（和首页一样，辅助手机跨天拖动） -->
    <div
      class="plan__quick-strip home__quick-strip"
      :class="{
        'home__quick-strip--open': quickStripOpen,
        'home__quick-strip--drag-over': !!stripOverDate
      }"
      @mouseenter="quickStripOpen = true"
      @mouseleave="quickStripOpen = false"
    >
      <div class="home__quick-strip__label">
        <span v-if="quickStripOpen">挪到</span>
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

    <PixelWindow :title="currentViewTitle" :icon="currentViewIcon">
      <template #default>
        <!-- 视图切换 -->
        <div class="plan__tabs">
          <button
            class="pixel-btn"
            :class="{ 'pixel-btn--confirm': view === 'today' }"
            @click="view = 'today'"
          >今日</button>
          <button
            class="pixel-btn"
            :class="{ 'pixel-btn--confirm': view === 'week' }"
            @click="view = 'week'"
          >本周</button>
          <button class="pixel-btn plan__add-btn" @click="showAddForm = !showAddForm">
            + 新增任务
          </button>
        </div>

        <!-- 新增任务表单 -->
        <div v-if="showAddForm" class="plan__add-form">
          <PixelInput
            v-model="newTask.title"
            placeholder="任务标题"
          />
          <div class="plan__add-row">
            <label>日期:</label>
            <input
              type="date"
              class="pixel-input"
              v-model="newTask.date"
            />
            <label>优先级:</label>
            <PixelSelect
              v-model="newTask.priority"
              :options="priorityOptions"
            />
            <label>耗时(h):</label>
            <input
              type="number"
              class="pixel-input"
              v-model.number="newTask.timeCost"
              min="0"
              step="0.5"
              style="max-width: 90px"
              placeholder="0"
            />
            <label>时段:</label>
            <PixelSelect v-model="newTask.timeSlot" :options="timeSlotOptions" />
          </div>
          <PixelInput
            v-model="newTask.note"
            type="textarea"
            placeholder="备注（可选）"
            :rows="2"
          />
          <div class="plan__add-actions">
            <button class="pixel-btn pixel-btn--confirm" @click="saveNewTask">保存</button>
            <button class="pixel-btn pixel-btn--cancel" @click="showAddForm = false">取消</button>
          </div>
        </div>

        <!-- 拖拽提示 -->
        <p class="plan__drag-hint">
          按住任务左侧 <span class="drag-hint__grip">⠿</span> 可拖到任意一天
          <span v-if="dragMsg" class="plan__drag-msg">{{ dragMsg }}</span>
        </p>

        <!-- 今日视图：今日计划列 + 本周安排看板 -->
        <div v-if="view === 'today'" class="plan__today">
          <section
            class="day-column day-column--today"
            data-drop-date="today"
            :class="{ 'day-column--over': overDate === 'today' }"
          >
            <div class="day-column__head">
              <span class="day-column__title">今日计划</span>
              <span class="day-column__date">{{ todayLabel }} 周{{ weekdayNames[getWeekday() - 1] }}</span>
            </div>
            <div class="plan__stats">
              <span>{{ doneCount }}/{{ todayItems.length }} 完成</span>
              <PixelProgress :value="todayProgress" :max="10" />
            </div>
            <PixelEmpty v-if="todayItems.length === 0" text="今日暂无待办，拖进来吧" />
            <ul v-else class="task-list">
              <li
                v-for="item in todayItems"
                :key="item.id"
                class="task-list__item task-card"
                :class="{ 'task-done': item.done, 'task-card--dragging': dragging && dragging.id === item.id }"
              >
                <span class="drag-handle" title="按住拖动" @pointerdown.prevent="startDrag($event, item)">⠿</span>
                <span
                  class="task-checkbox"
                  :class="{ 'task-checkbox--checked': item.done }"
                  @click="onToggle(item)"
                >{{ item.done ? '✔' : '□' }}</span>
                <span
                  class="source-dot"
                  :style="{ background: `var(${sourceColorVar[item.source]})` }"
                ></span>
                <span class="task-list__title">{{ item.title }}</span>
                <span class="task-list__source">{{ sourceLabels[item.source] }}</span>
                <span v-if="item.priority" class="task-list__priority">
                  {{ prioritySymbols[item.priority] }}
                </span>
                <span v-if="item.timeSlot && item.timeSlot !== 'any'" class="task-list__time-slot">
                  {{ timeSlotSymbols[item.timeSlot] }}
                </span>
                <span v-if="item.timeCost" class="task-list__time-cost">
                  ⏱{{ item.timeCost }}h
                </span>
                <span
                  v-if="item.source === 'manual'"
                  class="task-list__actions"
                >
                  <button class="pixel-btn" @click="startEdit(item)">改</button>
                  <button class="pixel-btn pixel-btn--cancel" @click="deleteTask(item)">删</button>
                </span>
              </li>
            </ul>
          </section>
        </div>

        <!-- 本周安排：周一~周日七列，每列可接收拖拽 -->
        <div class="plan__week">
          <h3 class="plan__week-title">
            本周安排
            <span class="plan__week-sub">{{ weekRange }}</span>
          </h3>
          <div class="week-grid">
            <section
              v-for="day in weekBoard"
              :key="day.date"
              class="week-day day-column"
              :data-drop-date="day.date"
              :class="{
                'week-day--today': day.date === todayStr,
                'day-column--over': overDate === day.date
              }"
              @click="selectDay(day.date)"
            >
              <div class="week-day__header">
                <span class="week-day__name">周{{ weekdayNames[day.weekday - 1] }}</span>
                <span class="week-day__date">{{ day.label }}</span>
              </div>
              <div class="week-day__count">{{ day.count }} 项</div>
              <ul v-if="day.items.length" class="task-list task-list--compact">
                <li
                  v-for="item in day.items"
                  :key="item.id"
                  class="task-list__item task-card"
                  :class="{ 'task-done': item.done, 'task-card--dragging': dragging && dragging.id === item.id }"
                >
                  <span class="drag-handle" title="按住拖动" @pointerdown.prevent="startDrag($event, item)">⠿</span>
                  <span
                    class="task-checkbox"
                    :class="{ 'task-checkbox--checked': item.done }"
                    @click.stop="onToggle(item)"
                  >{{ item.done ? '✔' : '□' }}</span>
                  <span class="task-list__title">{{ item.title }}</span>
                </li>
              </ul>
              <div v-else class="week-day__empty">放到这里</div>
            </section>
          </div>
        </div>

        <!-- 编辑表单 -->
        <div v-if="editingTask" class="plan__edit-form">
          <h4>编辑任务</h4>
          <PixelInput v-model="editingTask.title" placeholder="任务标题" />
          <div class="plan__add-row">
            <label>日期:</label>
            <input type="date" class="pixel-input" v-model="editingTask.date" />
            <label>优先级:</label>
            <PixelSelect v-model="editingTask.priority" :options="priorityOptions" />
            <label>耗时(h):</label>
            <input
              type="number"
              class="pixel-input"
              v-model.number="editingTask.timeCost"
              min="0"
              step="0.5"
              style="max-width: 90px"
              placeholder="0"
            />
            <label>时段:</label>
            <PixelSelect v-model="editingTask.timeSlot" :options="timeSlotOptions" />
          </div>
          <PixelInput v-model="editingTask.note" type="textarea" placeholder="备注" :rows="2" />
          <div class="plan__add-actions">
            <button class="pixel-btn pixel-btn--confirm" @click="saveEdit">保存</button>
            <button class="pixel-btn pixel-btn--cancel" @click="editingTask = null">取消</button>
          </div>
        </div>
      </template>
    </PixelWindow>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import PixelWindow from '@/components/PixelWindow.vue'
import PixelInput from '@/components/PixelInput.vue'
import PixelSelect from '@/components/PixelSelect.vue'
import PixelProgress from '@/components/PixelProgress.vue'
import PixelEmpty from '@/components/PixelEmpty.vue'
import {
  getTodayItems,
  toggleDone,
  getWeekBoard,
  moveItemToDate
} from '@/db/aggr'
import { save, remove } from '@/db/dao'
import { today, getWeekday, formatDate } from '@/utils/date'
import {
  SOURCE_LABELS,
  SOURCE_COLOR_VAR,
  PRIORITY_SYMBOLS,
  PRIORITY,
  PRIORITY_LABELS,
  TIME_SLOT,
  TIME_SLOT_LABELS,
  TIME_SLOT_SYMBOLS
} from '@/utils/constants'

const view = ref('today') // 'today' | 'week'
const showAddForm = ref(false)
const todayItems = ref([])
const weekBoard = ref([])
const selectedDay = ref(null)
const editingTask = ref(null)

const todayStr = today()
const weekdayNames = ['一', '二', '三', '四', '五', '六', '日']

// 右侧快捷日期条（和首页一样）
const quickStripOpen = ref(false)
const stripOverDate = ref('')

const upcomingDates = computed(() => {
  const todayObj = new Date()
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

const newTask = ref({
  title: '',
  date: todayStr,
  priority: PRIORITY.MEDIUM,
  note: '',
  timeCost: 0,
  timeSlot: TIME_SLOT.ANY
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

const sourceLabels = SOURCE_LABELS
const sourceColorVar = SOURCE_COLOR_VAR
const prioritySymbols = PRIORITY_SYMBOLS
const timeSlotSymbols = TIME_SLOT_SYMBOLS

const currentViewTitle = computed(() => {
  if (view.value === 'today') return '今日计划'
  return '本周计划'
})

const currentViewIcon = computed(() => {
  return view.value === 'today' ? '★' : '◆'
})

const doneCount = computed(() => todayItems.value.filter(i => i.done).length)
const todayProgress = computed(() => {
  if (todayItems.value.length === 0) return 0
  return Math.round((doneCount.value / todayItems.value.length) * 100)
})

const todayLabel = computed(() => {
  const d = new Date()
  return `${d.getMonth() + 1}月${d.getDate()}日`
})

const weekRange = computed(() => {
  if (!weekBoard.value.length) return ''
  return `${weekBoard.value[0].label} — ${weekBoard.value[6].label}`
})

// ===== 拖拽（指针事件，鼠标与手机触摸通用）=====
const dragging = ref(null)
const overDate = ref('')
const dragMsg = ref('')
let dragState = null

function startDrag(e, item) {
  if (e.pointerType === 'mouse' && e.button !== 0) return
  dragState = {
    item,
    startX: e.clientX,
    startY: e.clientY,
    active: false,
    ghost: null
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
    dragging.value = s.item
    const ghost = document.createElement('div')
    ghost.className = 'plan-drag-ghost'
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

  // 先查右侧快捷日期条
  const el = document.elementFromPoint(e.clientX, e.clientY)
  const stripItem = el && el.closest ? el.closest('[data-strip-date]') : null
  if (stripItem) {
    stripOverDate.value = stripItem.getAttribute('data-strip-date')
    overDate.value = ''
    return
  }
  stripOverDate.value = ''

  const col = el && el.closest ? el.closest('[data-drop-date]') : null
  overDate.value = col ? col.getAttribute('data-drop-date') : ''
}

async function onPointerUp(e) {
  const s = dragState
  cleanupDrag()
  if (!s || !s.active) return

  // 先查是不是放到了右侧快捷日期条
  const el = document.elementFromPoint(e.clientX, e.clientY)
  const stripItem = el && el.closest ? el.closest('[data-strip-date]') : null
  if (stripItem) {
    const target = stripItem.getAttribute('data-strip-date')
    const ok = await moveItemToDate(s.item, target)
    if (!ok) {
      dragMsg.value = '健身任务按星期排程，不能拖到其他日期'
      setTimeout(() => { dragMsg.value = '' }, 2500)
      return
    }
    dragMsg.value = `已移动到 ${target.slice(5)}`
    setTimeout(() => { dragMsg.value = '' }, 2000)
    await refresh()
    return
  }

  const col = el && el.closest ? el.closest('[data-drop-date]') : null
  if (!col) return

  let target = col.getAttribute('data-drop-date')
  if (target === 'today') target = todayStr

  const ok = await moveItemToDate(s.item, target)
  if (!ok) {
    dragMsg.value = '健身任务按星期排程，不能拖到其他日期'
    setTimeout(() => { dragMsg.value = '' }, 2500)
    return
  }
  dragMsg.value = `已移动到 ${target.slice(5)}`
  setTimeout(() => { dragMsg.value = '' }, 2000)
  await refresh()
}

function cleanupDrag() {
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
  window.removeEventListener('pointercancel', onPointerUp)
  if (dragState && dragState.ghost) dragState.ghost.remove()
  dragState = null
  dragging.value = null
  overDate.value = ''
  stripOverDate.value = ''
}

function selectDay(dateStr) {
  selectedDay.value = dateStr
}

async function loadTodayItems() {
  todayItems.value = await getTodayItems()
}

async function loadWeekBoard() {
  weekBoard.value = await getWeekBoard()
}

async function refresh() {
  await loadTodayItems()
  await loadWeekBoard()
}

async function onToggle(item) {
  await toggleDone(item)
  await refresh()
}

async function saveNewTask() {
  if (!newTask.value.title.trim()) return
  await save('tasks', {
    title: newTask.value.title.trim(),
    date: newTask.value.date,
    priority: newTask.value.priority,
    note: newTask.value.note,
    timeCost: Number(newTask.value.timeCost) || 0,
    timeSlot: newTask.value.timeSlot,
    done: false,
    source: 'manual'
  })
  newTask.value = { title: '', date: todayStr, priority: PRIORITY.MEDIUM, note: '', timeCost: 0, timeSlot: TIME_SLOT.ANY }
  showAddForm.value = false
  await refresh()
}

function startEdit(item) {
  editingTask.value = { ...item }
}

async function saveEdit() {
  if (!editingTask.value.title.trim()) return
  await save('tasks', {
    id: editingTask.value.sourceId,
    title: editingTask.value.title.trim(),
    date: editingTask.value.date,
    priority: editingTask.value.priority,
    note: editingTask.value.note || '',
    timeCost: Number(editingTask.value.timeCost) || 0,
    timeSlot: editingTask.value.timeSlot || TIME_SLOT.ANY,
    done: editingTask.value.done,
    source: 'manual'
  })
  editingTask.value = null
  await refresh()
}

async function deleteTask(item) {
  await remove('tasks', item.sourceId)
  await refresh()
}

onMounted(refresh)
onUnmounted(cleanupDrag)
</script>

<style scoped>
.plan {
  max-width: 800px;
  margin: 0 auto;
}
.plan__tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
  align-items: center;
}
.plan__add-btn {
  margin-left: auto;
}
.plan__add-form,
.plan__edit-form {
  border: 3px solid var(--border);
  padding: 0.75rem;
  margin-bottom: 1rem;
  background: var(--bg);
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.plan__add-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  font-size: 1.1rem;
  font-weight: 700;
}
.plan__add-actions {
  display: flex;
  gap: 0.5rem;
}
.plan__drag-hint {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--ochre);
  margin-bottom: 0.75rem;
}
.drag-hint__grip {
  color: var(--accent);
  font-size: 1.15rem;
}
.plan__drag-msg {
  margin-left: 0.6rem;
  color: var(--accent);
}
.plan__stats {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
  font-size: 1.1rem;
  font-weight: 700;
}
.day-column {
  border: 3px solid var(--border);
  background: var(--bg);
  padding: 0.6rem;
  transition: border-color 0.1s, background 0.1s;
}
.day-column--today {
  border-color: var(--accent);
  background: var(--panel);
}
.day-column--over {
  border-color: var(--accent);
  border-style: dashed;
  background: var(--panel);
}
.day-column__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  padding-bottom: 0.4rem;
  border-bottom: 2px dashed var(--border);
}
.day-column__title {
  font-size: 1.2rem;
  font-weight: 700;
}
.day-column__date {
  font-size: 1rem;
  font-weight: 700;
  color: var(--ochre);
}
.task-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.task-list--compact {
  gap: 0.35rem;
}
.task-list__item {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.4rem 0.4rem;
  border-bottom: 2px solid var(--border);
  font-size: 1.1rem;
  font-weight: 700;
}
.task-list__item:last-child {
  border-bottom: none;
}
.task-card--dragging {
  opacity: 0.4;
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
.task-list__title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}
.task-list__source {
  font-size: 1rem;
  font-weight: 700;
  color: var(--ochre);
}
.task-list__priority {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--accent);
}
.task-list__time-cost {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--olive);
  white-space: nowrap;
}
.task-list__time-slot {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--c-dev);
  white-space: nowrap;
}
.task-list__actions {
  display: flex;
  gap: 0.25rem;
}
.task-list__actions .pixel-btn {
  padding: 0.2rem 0.5rem;
  font-size: 1rem;
  font-weight: 700;
}
.plan__week {
  margin-top: 1.25rem;
}
.plan__week-title {
  display: flex;
  align-items: baseline;
  gap: 0.6rem;
  font-size: 1.2rem;
  font-weight: 700;
  margin-bottom: 0.6rem;
}
.plan__week-sub {
  font-size: 0.95rem;
  color: var(--ochre);
}
.week-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(90px, 1fr));
  gap: 0.4rem;
  overflow-x: auto;
  padding-bottom: 0.3rem;
}
.plan__week {
  margin-top: 1.25rem;
  overflow-x: hidden; /* week-grid 自己滚 */
}
.week-day {
  min-height: 130px;
  padding: 0.4rem;
  cursor: pointer;
}
.week-day--today {
  border-color: var(--accent);
  background: var(--panel);
}
.week-day__header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.1rem;
  padding-bottom: 0.3rem;
  border-bottom: 2px dashed var(--border);
  margin-bottom: 0.3rem;
}
.week-day__name {
  font-size: 1rem;
  font-weight: 700;
}
.week-day__date {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--ochre);
}
.week-day__count {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text);
  opacity: 0.65;
  margin-bottom: 0.25rem;
}
.week-day__empty {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--border);
  text-align: center;
  padding: 0.5rem 0;
}
.week-day .task-list__item {
  font-size: 0.9rem;
  padding: 0.25rem 0.15rem;
  gap: 0.2rem;
}
.week-day .drag-handle {
  font-size: 0.95rem;
  padding: 0.1rem 0;
}
.week-day .task-list__title {
  line-height: 1.25;
  word-break: break-all;
}

/* 手机上：7 列保持横滑，内容缩小 */
@media (max-width: 768px) {
  .week-grid {
    grid-template-columns: repeat(7, minmax(80px, 1fr));
    gap: 0.25rem;
  }
  .week-day {
    min-height: auto;
    padding: 0.3rem;
  }
  .week-day__header {
    flex-direction: row;
    justify-content: space-between;
    padding-bottom: 0.2rem;
  }
  .week-day__name { font-size: 0.9rem; }
  .week-day__date { font-size: 0.8rem; }
  .week-day .task-list__item {
    font-size: 0.9rem;
    padding: 0.2rem 0.1rem;
  }
}

/* ===== 右侧快捷日期条（Plan 页自己的 scoped 版本）===== */
.plan__quick-strip.home__quick-strip {
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
.plan__quick-strip.home__quick-strip--open {
  width: 96px;
  padding: 0.5rem 0.35rem;
}
.plan__quick-strip.home__quick-strip--drag-over {
  background: var(--bg);
  border-color: var(--accent);
}
.plan__quick-strip .home__quick-strip__label {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--ochre);
  writing-mode: vertical-rl;
  letter-spacing: 2px;
  padding: 0.35rem 0.1rem;
  border-bottom: 2px dashed var(--border);
  margin-bottom: 0.25rem;
}
.plan__quick-strip.home__quick-strip--open .home__quick-strip__label {
  writing-mode: horizontal-tb;
  letter-spacing: 0;
  font-size: 1rem;
  text-align: center;
  padding: 0;
}
.plan__quick-strip .home__quick-strip__hint {
  font-size: 1rem;
  color: var(--accent);
}
.plan__quick-strip .home__quick-strip__item {
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
.plan__quick-strip .home__quick-strip__item:hover {
  background: var(--panel);
  border-color: var(--accent);
}
.plan__quick-strip .home__quick-strip__item--over {
  background: var(--panel);
  border-color: var(--accent);
  border-style: dashed;
  transform: translateX(-2px);
}
.plan__quick-strip .home__quick-strip__wd {
  font-size: 0.9rem;
  color: var(--ochre);
}
.plan__quick-strip .home__quick-strip__md {
  font-size: 0.95rem;
}
@media (max-width: 768px) {
  .plan__quick-strip.home__quick-strip { width: 44px; }
  .plan__quick-strip.home__quick-strip--open { width: 88px; }
}
</style>
