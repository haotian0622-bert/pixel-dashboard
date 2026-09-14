<template>
  <div class="pixel-cal">
    <div class="pixel-cal__header">
      <button type="button" class="pixel-btn pixel-cal__nav" @click="$emit('prev')">‹ 上月</button>
      <span class="pixel-cal__title">{{ year }}年{{ month + 1 }}月</span>
      <button type="button" class="pixel-btn pixel-cal__nav" @click="$emit('next')">下月 ›</button>
    </div>
    <div class="pixel-cal__weekdays">
      <span v-for="w in weekNames" :key="w" class="pixel-cal__weekday">{{ w }}</span>
    </div>
    <div class="pixel-cal__grid">
      <button
        v-for="cell in cells"
        :key="cell.date"
        type="button"
        class="pixel-cal__cell"
        :class="[
          !cell.inMonth ? 'pixel-cal__cell--out' : '',
          cell.isToday ? 'pixel-cal__cell--today' : '',
          cell.date === modelValue ? 'pixel-cal__cell--selected' : '',
          marks[cell.date]?.cls || ''
        ]"
        :data-date="cell.date"
        @click="onSelect(cell.date)"
      >
        <span class="pixel-cal__num">{{ cell.day }}</span>
        <span v-if="marks[cell.date]?.dots?.length" class="pixel-cal__dots">
          <i
            v-for="(d, i) in marks[cell.date].dots"
            :key="i"
            class="pixel-cal__dot"
            :class="`pixel-cal__dot--${d}`"
          ></i>
        </span>
        <span v-if="marks[cell.date]?.text" class="pixel-cal__text">{{ marks[cell.date].text }}</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { formatDate } from '@/utils/date'

const props = defineProps({
  year: { type: Number, required: true },
  month: { type: Number, required: true }, // 0-11
  modelValue: { type: String, default: '' },
  // { 'YYYY-MM-DD': { cls?: string, dots?: string[], text?: string } }
  marks: { type: Object, default: () => ({}) }
})
const emit = defineEmits(['update:modelValue', 'select', 'prev', 'next'])

const weekNames = ['一', '二', '三', '四', '五', '六', '日']

const cells = computed(() => {
  const first = new Date(props.year, props.month, 1)
  const offset = (first.getDay() + 6) % 7 // 周一起始
  const start = new Date(props.year, props.month, 1 - offset)
  const todayStr = formatDate(new Date())
  const list = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)
    const dateStr = formatDate(d)
    list.push({
      date: dateStr,
      day: d.getDate(),
      inMonth: d.getMonth() === props.month,
      isToday: dateStr === todayStr
    })
  }
  return list
})

function onSelect(date) {
  emit('update:modelValue', date)
  emit('select', date)
}
</script>

<style scoped>
.pixel-cal { border: 3px solid var(--border); background: var(--panel); padding: 0.6rem; }
.pixel-cal__header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem; }
.pixel-cal__title { font-size: 1.15rem; font-weight: 700; }
.pixel-cal__nav { padding: 0.25rem 0.6rem; font-size: 0.95rem; font-weight: 700; }
.pixel-cal__weekdays { display: grid; grid-template-columns: repeat(7, 1fr); margin-bottom: 0.25rem; }
.pixel-cal__weekday { text-align: center; font-size: 0.95rem; font-weight: 700; color: var(--ochre); }
.pixel-cal__grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 3px; }
.pixel-cal__cell {
  min-height: 58px;
  border: 2px solid var(--border);
  background: var(--bg);
  color: var(--text);
  padding: 2px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  cursor: pointer;
  font-family: inherit;
}
.pixel-cal__cell:hover { border-color: var(--accent); }
.pixel-cal__cell--out { opacity: 0.35; }
.pixel-cal__cell--today { box-shadow: inset 0 0 0 2px var(--accent); }
.pixel-cal__cell--selected { background: var(--accent); color: var(--panel); }
.pixel-cal__num { font-size: 1rem; font-weight: 700; line-height: 1.1; }
.pixel-cal__dots { display: flex; gap: 3px; }
.pixel-cal__dot { width: 6px; height: 6px; display: inline-block; border: 1px solid var(--border); }
.pixel-cal__dot--income,
.pixel-cal__dot--done { background: var(--olive); border-color: var(--olive); }
.pixel-cal__dot--expense { background: var(--accent); border-color: var(--accent); }
.pixel-cal__text { font-size: 0.72rem; font-weight: 700; line-height: 1.1; }
/* 语义化整格标记 */
.pixel-cal__cell--mark-green { border-color: var(--olive); }
.pixel-cal__cell--mark-green .pixel-cal__text { color: var(--olive); }
.pixel-cal__cell--mark-red { border-color: var(--accent); }
.pixel-cal__cell--mark-red .pixel-cal__text { color: var(--accent); }
.pixel-cal__cell--selected .pixel-cal__text { color: var(--panel); }
@media (max-width: 768px) {
  .pixel-cal__cell { min-height: 44px; }
  .pixel-cal__title { font-size: 1rem; }
  .pixel-cal__text { font-size: 0.65rem; }
}
</style>
