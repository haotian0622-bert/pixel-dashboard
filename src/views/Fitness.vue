<template>
  <div class="fitness">
    <PixelWindow title="健身计划" icon="♥">
      <!-- 周排程 -->
      <div class="fitness__section">
        <h3>周训练排程</h3>
        <div class="fitness__schedule">
          <div v-for="day in 7" :key="day" class="fitness__day" :class="{ 'fitness__day--today': isToday(day) }">
            <div class="fitness__day-header">周{{ weekdayNames[day - 1] }}</div>
            <div v-if="schedule[day]" class="fitness__day-content">
              <span class="fitness__day-name">{{ schedule[day].name }}</span>
              <span v-if="schedule[day].duration" class="fitness__day-duration">⏱{{ schedule[day].duration }}min</span>
              <div v-if="schedule[day].exercises?.length" class="fitness__exercises">
                <span v-for="(ex, i) in schedule[day].exercises" :key="i" class="fitness__exercise">
                  {{ ex.name }} {{ ex.sets }}x{{ ex.reps }}
                </span>
              </div>
            </div>
            <button v-else class="pixel-btn fitness__day-add" @click="editSchedule(day)">+ 添加</button>
            <button v-if="schedule[day]" class="pixel-btn fitness__day-edit" @click="editSchedule(day)">改</button>
          </div>
        </div>
      </div>

      <!-- 今日打卡 -->
      <div class="fitness__section">
        <h3>今日打卡</h3>
        <div class="fitness__checkin">
          <button class="pixel-btn pixel-btn--confirm" @click="checkin" :disabled="todayChecked">
            {{ todayChecked ? '已打卡 ✔' : '点击打卡' }}
          </button>
          <span class="fitness__streak">本周已练 {{ weekCount }} 次</span>
        </div>
      </div>

      <!-- 打卡日历 -->
      <div class="fitness__section">
        <h3>打卡日历</h3>
        <PixelCalendar
          v-model="selectedDate"
          :year="fitYear"
          :month="fitMonthIndex"
          :marks="fitMarks"
          @prev="prevFitMonth"
          @next="nextFitMonth"
        />
        <div class="fitness__day-detail">
          <div class="fitness__day-detail-head">
            <strong class="fitness__day-detail-date">{{ selectedDate }}</strong>
            <span v-if="daySchedule" class="fitness__day-plan">
              计划：{{ daySchedule.name }}<template v-if="daySchedule.duration"> ⏱{{ daySchedule.duration }}min</template>
            </span>
            <span v-else class="fitness__day-plan fitness__day-plan--rest">休息日</span>
            <button
              class="pixel-btn"
              :class="selectedChecked ? 'pixel-btn--cancel' : 'pixel-btn--confirm'"
              @click="toggleCheckin"
            >
              {{ selectedChecked ? '取消打卡' : '打卡' }}
            </button>
          </div>
          <div v-if="selectedBody" class="fitness__day-body">
            体重 {{ selectedBody.weight }}kg<span v-if="selectedBody.bodyFat"> · 体脂 {{ selectedBody.bodyFat }}%</span>
          </div>
        </div>
      </div>

      <!-- 身体数据 -->
      <div class="fitness__section">
        <h3>身体数据</h3>
        <div class="fitness__body-form">
          <input type="date" class="pixel-input" v-model="bodyForm.date" />
          <input class="pixel-input" v-model="bodyForm.weight" placeholder="体重(kg)" type="number" />
          <input class="pixel-input" v-model="bodyForm.bodyFat" placeholder="体脂(%)" type="number" />
          <button class="pixel-btn pixel-btn--confirm" @click="saveBody">记录</button>
        </div>
        <ul v-if="bodyList.length" class="fitness__body-list">
          <li v-for="b in bodyList" :key="b.id" class="fitness__body-item">
            <span>{{ b.date }}</span>
            <span>{{ b.weight }}kg</span>
            <span v-if="b.bodyFat">{{ b.bodyFat }}%</span>
          </li>
        </ul>
      </div>

      <!-- 排程编辑弹窗 -->
      <div v-if="editingDay" class="fitness__edit-overlay" @click.self="editingDay = null">
        <div class="fitness__edit-form pixel-window">
          <div class="pixel-window__titlebar"><span>训练排程</span></div>
          <div class="pixel-window__body">
            <PixelInput v-model="scheduleForm.name" placeholder="训练名称（如 胸+三头）" />
            <div class="fitness__ex-duration">
              <label>耗时(min):</label>
              <input
                type="number"
                class="pixel-input"
                v-model.number="scheduleForm.duration"
                min="0"
                step="5"
                style="max-width: 100px"
                placeholder="0"
              />
            </div>
            <h4>动作清单</h4>
            <div v-for="(ex, i) in scheduleForm.exercises" :key="i" class="fitness__ex-row">
              <input class="pixel-input" v-model="ex.name" placeholder="动作名" />
              <input class="pixel-input" v-model="ex.sets" placeholder="组数" type="number" />
              <input class="pixel-input" v-model="ex.reps" placeholder="次数" />
              <button class="pixel-btn pixel-btn--cancel" @click="scheduleForm.exercises.splice(i, 1)">删</button>
            </div>
            <button class="pixel-btn" @click="scheduleForm.exercises.push({ name: '', sets: '', reps: '' })">+ 添加动作</button>
            <div class="fitness__edit-actions">
              <button class="pixel-btn pixel-btn--confirm" @click="saveSchedule">保存</button>
              <button class="pixel-btn pixel-btn--cancel" @click="editingDay = null">取消</button>
            </div>
          </div>
        </div>
      </div>
    </PixelWindow>
  </div>
</template>

<script setup>
import { computed, ref, reactive, onMounted } from 'vue'
import PixelWindow from '@/components/PixelWindow.vue'
import PixelInput from '@/components/PixelInput.vue'
import PixelCalendar from '@/components/PixelCalendar.vue'
import { getAll, save, query, remove } from '@/db/dao'
import { today, getWeekday, isThisWeek, formatMonth } from '@/utils/date'

const weekdayNames = ['一', '二', '三', '四', '五', '六', '日']
const schedule = reactive({})
const logs = ref([])
const bodyList = ref([])
const todayChecked = ref(false)
const weekCount = ref(0)
const editingDay = ref(null)
const scheduleForm = ref({ name: '', exercises: [], duration: 0 })
const bodyForm = ref({ date: today(), weight: '', bodyFat: '' })

// 打卡日历
const fitMonth = ref(formatMonth(today()))
const selectedDate = ref(today())
const fitYear = computed(() => Number(fitMonth.value.slice(0, 4)))
const fitMonthIndex = computed(() => Number(fitMonth.value.slice(5, 7)) - 1)
function prevFitMonth() {
  const [y, m] = fitMonth.value.split('-').map(Number)
  const d = new Date(y, m - 1, 1)
  d.setMonth(d.getMonth() - 1)
  fitMonth.value = formatMonth(d)
}
function nextFitMonth() {
  const [y, m] = fitMonth.value.split('-').map(Number)
  const d = new Date(y, m - 1, 1)
  d.setMonth(d.getMonth() + 1)
  fitMonth.value = formatMonth(d)
}
const selectedChecked = computed(() => logs.value.some(l => l.date === selectedDate.value && l.done))
const selectedBody = computed(() => bodyList.value.find(b => b.date === selectedDate.value) || null)
const daySchedule = computed(() => schedule[getWeekday(selectedDate.value)] || null)
// 日历标记：打卡日绿框绿点，有身体数据显示体重
const fitMarks = computed(() => {
  const m = {}
  for (const l of logs.value) {
    if (l.done && l.date) m[l.date] = { cls: 'pixel-cal__cell--mark-green', dots: ['done'] }
  }
  for (const b of bodyList.value) {
    if (!b.date) continue
    m[b.date] = { ...(m[b.date] || {}), text: `${b.weight}kg` }
  }
  return m
})
async function toggleCheckin() {
  const log = logs.value.find(l => l.date === selectedDate.value && l.done)
  if (log) {
    await remove('fitnessLogs', log.id)
  } else {
    await save('fitnessLogs', { date: selectedDate.value, done: true })
  }
  await loadLogs()
}

function isToday(day) {
  return day === getWeekday()
}

async function loadSchedule() {
  const all = await getAll('fitnessSchedule')
  for (const s of all) {
    schedule[s.weekday] = s
  }
}

async function loadLogs() {
  logs.value = await getAll('fitnessLogs')
  const todayStr = today()
  todayChecked.value = logs.value.some(l => l.date === todayStr && l.done)
  weekCount.value = logs.value.filter(l => isThisWeek(l.date) && l.done).length
}

async function loadBody() {
  bodyList.value = (await getAll('fitnessBody')).sort((a, b) => (b.date || '').localeCompare(a.date || ''))
}

function editSchedule(day) {
  editingDay.value = day
  const existing = schedule[day]
  scheduleForm.value = {
    name: existing?.name || '',
    duration: existing?.duration || 0,
    exercises: existing?.exercises ? existing.exercises.map(e => ({ ...e })) : [{ name: '', sets: '', reps: '' }]
  }
}

async function saveSchedule() {
  const day = editingDay.value
  const existing = schedule[day]
  await save('fitnessSchedule', {
    id: existing?.id,
    weekday: day,
    name: scheduleForm.value.name,
    duration: Number(scheduleForm.value.duration) || 0,
    exercises: scheduleForm.value.exercises.filter(e => e.name.trim())
  })
  editingDay.value = null
  // 重新加载
  const all = await getAll('fitnessSchedule')
  for (const key in schedule) delete schedule[key]
  for (const s of all) schedule[s.weekday] = s
}

async function checkin() {
  await save('fitnessLogs', { date: today(), done: true })
  await loadLogs()
}

async function saveBody() {
  if (!bodyForm.value.weight) return
  await save('fitnessBody', { ...bodyForm.value, weight: Number(bodyForm.value.weight), bodyFat: bodyForm.value.bodyFat ? Number(bodyForm.value.bodyFat) : undefined })
  bodyForm.value = { date: today(), weight: '', bodyFat: '' }
  await loadBody()
}

onMounted(async () => {
  await loadSchedule()
  await loadLogs()
  await loadBody()
})
</script>

<style scoped>
.fitness { max-width: 800px; margin: 0 auto; }
.fitness__section { margin-bottom: 1.5rem; }
.fitness__section h3 { font-size: 1.15rem; font-weight: 700; margin-bottom: 0.5rem; }
.fitness__schedule { display: grid; grid-template-columns: repeat(7, 1fr); gap: 0.5rem; }
.fitness__day { border: 3px solid var(--border); background: var(--bg); padding: 0.5rem; text-align: center; min-height: 80px; }
.fitness__day--today { border-color: var(--accent); background: var(--panel); }
.fitness__day-header { font-size: 1.05rem; font-weight: bold; margin-bottom: 0.25rem; }
.fitness__day-content { font-size: 1rem; font-weight: 700; }
.fitness__day-name { display: block; margin-bottom: 0.25rem; }
.fitness__day-duration { font-size: 0.9rem; font-weight: 700; color: var(--olive); }
.fitness__ex-duration { display: flex; align-items: center; gap: 0.5rem; margin: 0.5rem 0; font-size: 1rem; font-weight: 700; }
.fitness__exercises { display: flex; flex-direction: column; gap: 0.1rem; }
.fitness__exercise { font-size: 0.9rem; font-weight: 700; color: var(--ochre); }
.fitness__day-add { padding: 0.2rem 0.4rem; font-size: 0.9rem; font-weight: 700; }
.fitness__day-edit { padding: 0.1rem 0.3rem; font-size: 0.85rem; font-weight: 700; margin-top: 0.25rem; }
.fitness__checkin { display: flex; align-items: center; gap: 1rem; }
.fitness__streak { font-size: 1.1rem; font-weight: 700; color: var(--olive); }
.fitness__day-detail { border: 3px solid var(--border); background: var(--bg); padding: 0.6rem; margin-top: 0.6rem; }
.fitness__day-detail-head { display: flex; align-items: center; gap: 0.8rem; flex-wrap: wrap; }
.fitness__day-detail-date { font-size: 1.1rem; }
.fitness__day-plan { font-size: 1.05rem; font-weight: 700; color: var(--c-fitness); flex: 1; }
.fitness__day-plan--rest { color: var(--ochre); font-weight: 700; }
.fitness__day-body { margin-top: 0.4rem; font-size: 1.05rem; font-weight: 700; color: var(--ochre); }
.fitness__body-form { display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; }
.fitness__body-list { display: flex; flex-direction: column; gap: 0.25rem; margin-top: 0.5rem; }
.fitness__body-item { display: flex; gap: 1rem; font-size: 1.05rem; font-weight: 700; padding: 0.25rem; border-bottom: 1px solid var(--border); }
.fitness__edit-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.fitness__edit-form { min-width: 400px; max-width: 600px; }
.fitness__ex-row { display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.5rem; }
.fitness__ex-row .pixel-input { flex: 1; }
.fitness__edit-actions { display: flex; gap: 0.5rem; margin-top: 1rem; }
@media (max-width: 768px) {
  .fitness__schedule { grid-template-columns: repeat(2, 1fr); }
}
</style>
