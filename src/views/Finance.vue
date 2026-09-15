<template>
  <div class="finance">
    <PixelWindow title="本月开支和收入" icon="¥">
      <!-- 月份选择 -->
      <div class="finance__header">
        <button class="pixel-btn" @click="prevMonth">< 上月</button>
        <span class="finance__month">{{ displayMonth }}</span>
        <button class="pixel-btn" @click="nextMonth">下月 ></button>
        <button class="pixel-btn" @click="openForm" style="margin-left: auto;">+ 新增</button>
      </div>

      <!-- 汇总 -->
      <div class="finance__summary">
        <div class="finance__summary-item">
          <span class="finance__summary-label">收入</span>
          <span class="finance__summary-value finance__summary-value--income">+¥{{ totalIncome }}</span>
        </div>
        <div class="finance__summary-item">
          <span class="finance__summary-label">支出</span>
          <span class="finance__summary-value finance__summary-value--expense">-¥{{ totalExpense }}</span>
        </div>
        <div class="finance__summary-item">
          <span class="finance__summary-label">结余</span>
          <span class="finance__summary-value">¥{{ totalIncome - totalExpense }}</span>
        </div>
      </div>

      <!-- 分类汇总 -->
      <div v-if="categorySummary.length" class="finance__categories">
        <h4>支出分类</h4>
        <div v-for="cat in categorySummary" :key="cat.category" class="finance__cat-item">
          <span>{{ cat.label }}</span>
          <PixelProgress :value="cat.percent" :max="10" />
          <span>¥{{ cat.amount }}</span>
        </div>
      </div>

      <!-- 月历视图 -->
      <div class="finance__calendar">
        <PixelCalendar
          v-model="selectedDate"
          :year="calYear"
          :month="calMonth"
          :marks="dayMarks"
          @prev="prevMonth"
          @next="nextMonth"
        />
      </div>

      <!-- 选中日期的流水 -->
      <div class="finance__day">
        <h4 class="finance__day-title">
          {{ selectedDate }} 当日流水
          <button class="pixel-btn finance__day-add" @click="openForm">+ 记一笔</button>
        </h4>
        <PixelEmpty v-if="dayRecords.length === 0" text="当日暂无记录" />
        <ul v-else class="record-list">
          <li v-for="r in dayRecords" :key="r.id" class="record-list__item">
            <span class="record-list__type" :class="{ 'record-list__type--income': r.type === 'income', 'record-list__type--expense': r.type === 'expense' }">
              {{ typeLabels[r.type] }}
            </span>
            <span class="record-list__cat">{{ categoryLabels[r.category] }}</span>
            <span class="record-list__amount" :class="{ 'record-list__amount--income': r.type === 'income', 'record-list__amount--expense': r.type === 'expense' }">
              {{ r.type === 'income' ? '+' : '-' }}¥{{ r.amount }}
            </span>
            <span v-if="r.note" class="record-list__note">{{ r.note }}</span>
            <button class="pixel-btn pixel-btn--cancel" @click="deleteRecord(r)">删</button>
          </li>
        </ul>
      </div>

      <!-- 新增表单 -->
      <div v-if="showForm" class="finance__form">
        <select class="pixel-select" v-model="form.type">
          <option value="expense">支出</option>
          <option value="income">收入</option>
        </select>
        <input class="pixel-input" v-model="form.amount" placeholder="金额" type="number" />
        <select class="pixel-select" v-model="form.category">
          <option v-for="(label, key) in categoryLabels" :key="key" :value="key">{{ label }}</option>
        </select>
        <input type="date" class="pixel-input" v-model="form.date" />
        <PixelInput v-model="form.note" placeholder="备注" />
        <button class="pixel-btn pixel-btn--confirm" @click="saveRecord">保存</button>
      </div>

      <!-- 流水列表 -->
      <PixelEmpty v-if="monthRecords.length === 0" text="本月暂无记录" />
      <ul v-else class="record-list">
        <li v-for="r in monthRecords" :key="r.id" class="record-list__item">
          <span class="record-list__date">{{ r.date }}</span>
          <span class="record-list__type" :class="{ 'record-list__type--income': r.type === 'income', 'record-list__type--expense': r.type === 'expense' }">
            {{ typeLabels[r.type] }}
          </span>
          <span class="record-list__cat">{{ categoryLabels[r.category] }}</span>
          <span class="record-list__amount" :class="{ 'record-list__amount--income': r.type === 'income', 'record-list__amount--expense': r.type === 'expense' }">
            {{ r.type === 'income' ? '+' : '-' }}¥{{ r.amount }}
          </span>
          <span v-if="r.note" class="record-list__note">{{ r.note }}</span>
          <button class="pixel-btn pixel-btn--cancel" @click="deleteRecord(r)">删</button>
        </li>
      </ul>
    </PixelWindow>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import PixelWindow from '@/components/PixelWindow.vue'
import PixelInput from '@/components/PixelInput.vue'
import PixelProgress from '@/components/PixelProgress.vue'
import PixelEmpty from '@/components/PixelEmpty.vue'
import PixelCalendar from '@/components/PixelCalendar.vue'
import { getAll, save, remove } from '@/db/dao'
import { FINANCE_TYPE_LABELS, FINANCE_CATEGORY_LABELS } from '@/utils/constants'
import { today, formatMonth } from '@/utils/date'

const records = ref([])
const showForm = ref(false)
const currentMonth = ref(formatMonth(today()))
const selectedDate = ref(today())

const form = ref({ type: 'expense', amount: '', category: 'food', date: today(), note: '' })
const typeLabels = FINANCE_TYPE_LABELS
const categoryLabels = FINANCE_CATEGORY_LABELS

const displayMonth = computed(() => currentMonth.value)
const calYear = computed(() => Number(currentMonth.value.slice(0, 4)))
const calMonth = computed(() => Number(currentMonth.value.slice(5, 7)) - 1)

const monthRecords = computed(() => {
  return records.value
    .filter(r => r.date && r.date.startsWith(currentMonth.value))
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
})

const totalIncome = computed(() => {
  return monthRecords.value
    .filter(r => r.type === 'income')
    .reduce((sum, r) => sum + Number(r.amount || 0), 0)
})

const totalExpense = computed(() => {
  return monthRecords.value
    .filter(r => r.type === 'expense')
    .reduce((sum, r) => sum + Number(r.amount || 0), 0)
})

const categorySummary = computed(() => {
  const expenses = monthRecords.value.filter(r => r.type === 'expense')
  const total = expenses.reduce((sum, r) => sum + Number(r.amount || 0), 0)
  const byCat = {}
  for (const r of expenses) {
    byCat[r.category] = (byCat[r.category] || 0) + Number(r.amount || 0)
  }
  return Object.entries(byCat).map(([cat, amount]) => ({
    category: cat,
    label: categoryLabels[cat] || cat,
    amount,
    percent: total > 0 ? Math.round((amount / total) * 100) : 0
  })).sort((a, b) => b.amount - a.amount)
})

function prevMonth() {
  const [y, m] = currentMonth.value.split('-').map(Number)
  const d = new Date(y, m - 1, 1)
  d.setMonth(d.getMonth() - 1)
  currentMonth.value = formatMonth(d)
  selectedDate.value = `${currentMonth.value}-01`
}

function nextMonth() {
  const [y, m] = currentMonth.value.split('-').map(Number)
  const d = new Date(y, m - 1, 1)
  d.setMonth(d.getMonth() + 1)
  currentMonth.value = formatMonth(d)
  selectedDate.value = `${currentMonth.value}-01`
}

// 选中日的流水（倒序）
const dayRecords = computed(() => records.value
  .filter(r => r.date === selectedDate.value)
  .sort((a, b) => (b.id || '').localeCompare(a.id || '')))

// 月历每日标记：红绿圆点 + 净额
const dayMarks = computed(() => {
  const sums = {}
  for (const r of monthRecords.value) {
    if (!r.date) continue
    if (!sums[r.date]) sums[r.date] = { income: 0, expense: 0 }
    if (r.type === 'income') sums[r.date].income += Number(r.amount || 0)
    else sums[r.date].expense += Number(r.amount || 0)
  }
  const marks = {}
  for (const [date, v] of Object.entries(sums)) {
    const net = v.income - v.expense
    const dots = []
    if (v.income > 0) dots.push('income')
    if (v.expense > 0) dots.push('expense')
    marks[date] = {
      dots,
      text: net >= 0 ? `+${net}` : `${net}`,
      cls: net >= 0 ? 'pixel-cal__cell--mark-green' : 'pixel-cal__cell--mark-red'
    }
  }
  return marks
})

function openForm() {
  form.value.date = selectedDate.value
  showForm.value = true
}

async function saveRecord() {
  if (!form.value.amount) return
  await save('financeRecords', {
    ...form.value,
    amount: Number(form.value.amount)
  })
  form.value = { type: 'expense', amount: '', category: 'food', date: today(), note: '' }
  showForm.value = false
  await loadRecords()
}

async function deleteRecord(r) {
  await remove('financeRecords', r.id)
  await loadRecords()
}

async function loadRecords() {
  records.value = await getAll('financeRecords')
}

onMounted(async () => { await loadRecords() })
</script>

<style scoped>
.finance { max-width: 800px; margin: 0 auto; }
.finance__header { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem; }
.finance__month { font-size: 1.15rem; font-weight: bold; min-width: 80px; text-align: center; }
.finance__summary { display: flex; gap: 1rem; margin-bottom: 1rem; }
.finance__summary-item { flex: 1; text-align: center; border: 3px solid var(--border); padding: 0.5rem; background: var(--bg); }
.finance__summary-label { display: block; font-size: 1rem; font-weight: 700; color: var(--ochre); }
.finance__summary-value { display: block; font-size: 1.2rem; }
.finance__summary-value--income { color: var(--olive); }
.finance__summary-value--expense { color: var(--accent); }
.finance__categories { margin-bottom: 1rem; }
.finance__calendar { margin-bottom: 1rem; }
.finance__day { margin-bottom: 1rem; border: 3px solid var(--border); background: var(--bg); padding: 0.6rem; }
.finance__day-title { display: flex; align-items: center; gap: 0.6rem; font-size: 1.1rem; font-weight: 700; margin-bottom: 0.5rem; }
.finance__day-add { padding: 0.2rem 0.5rem; font-size: 0.95rem; font-weight: 700; }
.finance__categories h4 { font-size: 1.1rem; font-weight: 700; margin-bottom: 0.5rem; }
.finance__cat-item { display: flex; align-items: center; gap: 0.5rem; font-size: 1.05rem; font-weight: 700; margin-bottom: 0.25rem; }
.finance__form { border: 3px solid var(--border); padding: 0.75rem; margin-bottom: 1rem; background: var(--bg); display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; }
.record-list { display: flex; flex-direction: column; gap: 0.5rem; }
.record-list__item { display: flex; align-items: center; gap: 0.5rem; padding: 0.4rem; border-bottom: 2px solid var(--border); font-size: 1.1rem; font-weight: 700; }
.record-list__item:last-child { border-bottom: none; }
.record-list__date { font-size: 1rem; font-weight: 700; color: var(--ochre); min-width: 80px; }
.record-list__type { font-size: 1.05rem; font-weight: 700; min-width: 30px; }
.record-list__type--income { color: var(--olive); }
.record-list__type--expense { color: var(--accent); }
.record-list__cat { font-size: 1.05rem; font-weight: 700; color: var(--ochre); }
.record-list__amount { font-weight: bold; min-width: 60px; }
.record-list__amount--income { color: var(--olive); }
.record-list__amount--expense { color: var(--accent); }
.record-list__note { font-size: 1rem; font-weight: 700; color: var(--ochre); flex: 1; }
.record-list .pixel-btn { padding: 0.2rem 0.5rem; font-size: 1rem; font-weight: 700; }
@media (max-width: 768px) {
  .finance__summary { flex-direction: column; }
  .finance__form { flex-direction: column; align-items: stretch; }
}
</style>
