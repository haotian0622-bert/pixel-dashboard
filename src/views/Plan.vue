<template>
  <div class="plan">
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

        <!-- 今日视图 -->
        <div v-if="view === 'today'" class="plan__today">
          <div class="plan__stats">
            <span>{{ doneCount }}/{{ todayItems.length }} 完成</span>
            <PixelProgress :value="todayProgress" :max="10" />
          </div>
          <PixelEmpty v-if="todayItems.length === 0" text="今日暂无待办" />
          <ul v-else class="task-list">
            <li
              v-for="item in todayItems"
              :key="item.id"
              class="task-list__item"
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
              <span class="task-list__title">{{ item.title }}</span>
              <span class="task-list__source">{{ sourceLabels[item.source] }}</span>
              <span v-if="item.priority" class="task-list__priority">
                {{ prioritySymbols[item.priority] }}
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
        </div>

        <!-- 本周视图 -->
        <div v-if="view === 'week'" class="plan__week">
          <div class="week-grid">
            <div
              v-for="day in weekDays"
              :key="day.weekday"
              class="week-day"
              :class="{ 'week-day--today': day.date === todayStr }"
              @click="selectDay(day.date)"
            >
              <div class="week-day__header">
                周{{ weekdayNames[day.weekday - 1] }}
              </div>
              <div class="week-day__count">
                {{ day.count }} 项
              </div>
            </div>
          </div>
          <!-- 选中天的详情 -->
          <div v-if="selectedDay" class="week-day-detail">
            <h3>{{ selectedDayLabel }} 的任务</h3>
            <PixelEmpty v-if="selectedDayItems.length === 0" text="该天暂无任务" />
            <ul v-else class="task-list">
              <li
                v-for="item in selectedDayItems"
                :key="item.id"
                class="task-list__item"
                :class="{ 'task-done': item.done }"
              >
                <span
                  class="task-checkbox"
                  :class="{ 'task-checkbox--checked': item.done }"
                  @click="onToggle(item)"
                >{{ item.done ? '✔' : '□' }}</span>
                <span class="task-list__title">{{ item.title }}</span>
                <span class="task-list__source">{{ sourceLabels[item.source] }}</span>
              </li>
            </ul>
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
import { ref, computed, onMounted } from 'vue'
import PixelWindow from '@/components/PixelWindow.vue'
import PixelInput from '@/components/PixelInput.vue'
import PixelSelect from '@/components/PixelSelect.vue'
import PixelProgress from '@/components/PixelProgress.vue'
import PixelEmpty from '@/components/PixelEmpty.vue'
import { getTodayItems, toggleDone, getItemsByDate, getWeekItemsCount } from '@/db/aggr'
import { save, remove } from '@/db/dao'
import { today, formatDate } from '@/utils/date'
import {
  SOURCE_LABELS,
  SOURCE_COLOR_VAR,
  PRIORITY_SYMBOLS,
  PRIORITY,
  PRIORITY_LABELS
} from '@/utils/constants'

const view = ref('today') // 'today' | 'week'
const showAddForm = ref(false)
const todayItems = ref([])
const weekDays = ref([])
const selectedDay = ref(null)
const selectedDayItems = ref([])
const editingTask = ref(null)

const todayStr = today()
const weekdayNames = ['一', '二', '三', '四', '五', '六', '日']

const newTask = ref({
  title: '',
  date: todayStr,
  priority: PRIORITY.MEDIUM,
  note: '',
  timeCost: 0
})

const priorityOptions = [
  { value: PRIORITY.HIGH, label: PRIORITY_LABELS.high },
  { value: PRIORITY.MEDIUM, label: PRIORITY_LABELS.medium },
  { value: PRIORITY.LOW, label: PRIORITY_LABELS.low }
]

const sourceLabels = SOURCE_LABELS
const sourceColorVar = SOURCE_COLOR_VAR
const prioritySymbols = PRIORITY_SYMBOLS

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

const selectedDayLabel = computed(() => {
  if (!selectedDay.value) return ''
  const d = new Date(selectedDay.value)
  return `${d.getMonth() + 1}月${d.getDate()}日`
})

async function loadTodayItems() {
  todayItems.value = await getTodayItems()
}

async function loadWeekDays() {
  weekDays.value = await getWeekItemsCount()
}

async function selectDay(dateStr) {
  selectedDay.value = dateStr
  selectedDayItems.value = await getItemsByDate(dateStr)
}

async function onToggle(item) {
  await toggleDone(item)
  await loadTodayItems()
  if (selectedDay.value) {
    await selectDay(selectedDay.value)
  }
}

async function saveNewTask() {
  if (!newTask.value.title.trim()) return
  await save('tasks', {
    title: newTask.value.title.trim(),
    date: newTask.value.date,
    priority: newTask.value.priority,
    note: newTask.value.note,
    timeCost: Number(newTask.value.timeCost) || 0,
    done: false,
    source: 'manual'
  })
  newTask.value = { title: '', date: todayStr, priority: PRIORITY.MEDIUM, note: '', timeCost: 0 }
  showAddForm.value = false
  await loadTodayItems()
  await loadWeekDays()
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
    done: editingTask.value.done,
    source: 'manual'
  })
  editingTask.value = null
  await loadTodayItems()
  await loadWeekDays()
}

async function deleteTask(item) {
  await remove('tasks', item.sourceId)
  await loadTodayItems()
  await loadWeekDays()
}

onMounted(async () => {
  await loadTodayItems()
  await loadWeekDays()
})
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
  font-size: 1.1rem;
  font-weight: 600;
}
.plan__add-actions {
  display: flex;
  gap: 0.5rem;
}
.plan__stats {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
  font-size: 1.1rem;
  font-weight: 600;
}
.task-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.task-list__item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0.5rem;
  border-bottom: 2px solid var(--border);
  font-size: 1.1rem;
  font-weight: 600;
}
.task-list__item:last-child {
  border-bottom: none;
}
.task-list__title {
  flex: 1;
}
.task-list__source {
  font-size: 1rem;
  font-weight: 600;
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
.task-list__actions {
  display: flex;
  gap: 0.25rem;
}
.task-list__actions .pixel-btn {
  padding: 0.2rem 0.5rem;
  font-size: 1rem;
  font-weight: 600;
}
.week-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 0.5rem;
  margin-bottom: 1rem;
}
.week-day {
  border: 3px solid var(--border);
  background: var(--bg);
  padding: 0.5rem;
  text-align: center;
  cursor: pointer;
}
.week-day:hover {
  background: var(--panel);
}
.week-day--today {
  border-color: var(--accent);
  background: var(--panel);
}
.week-day__header {
  font-size: 1.05rem;
  font-weight: bold;
  margin-bottom: 0.25rem;
}
.week-day__count {
  font-size: 1.1rem;
  font-weight: 600;
}
.week-day-detail {
  margin-top: 1rem;
}
.week-day-detail h3 {
  font-size: 1.15rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
}
@media (max-width: 768px) {
  .week-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
