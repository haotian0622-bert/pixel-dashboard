<template>
  <div class="study">
    <PixelWindow title="学习计划" icon="☆">
      <div class="study__header">
        <div class="study__stats">
          <span>进行中主题: {{ activeCount }}</span>
          <span>本周学习: {{ weekCount }} 次</span>
          <span>本周时长: {{ weekDuration }} 分钟</span>
        </div>
        <button class="pixel-btn" @click="showForm = !showForm">+ 新增主题</button>
      </div>

      <div v-if="showForm" class="study__form">
        <PixelInput v-model="form.name" placeholder="主题名称" />
        <PixelInput v-model="form.goal" placeholder="一句话目标" />
        <label>耗时(h):</label><input type="number" class="pixel-input" v-model.number="form.timeCost" min="0" step="0.5" style="max-width: 90px" placeholder="0" />
        <label>时段:</label><PixelSelect v-model="form.timeSlot" :options="timeSlotOptions" />
        <div class="study__actions">
          <button class="pixel-btn pixel-btn--confirm" @click="saveTopic">保存</button>
          <button class="pixel-btn pixel-btn--cancel" @click="showForm = false">取消</button>
        </div>
      </div>

      <PixelEmpty v-if="topics.length === 0" text="暂无学习主题" />
      <ul v-else class="topic-list">
        <li v-for="t in topics" :key="t.id" class="topic-list__item" @click="goDetail(t.id)">
          <div class="topic-list__info">
            <span class="topic-list__name">{{ t.name }}</span>
            <span class="topic-list__goal">{{ t.goal }}</span>
            <span class="topic-list__status" :style="{ color: statusColor(t.status) }">{{ statusLabels[t.status] }}</span>
            <span v-if="t.timeSlot && t.timeSlot !== 'any'" class="topic-list__time-slot">{{ timeSlotSymbols[t.timeSlot] }}</span>
            <span v-if="t.timeCost" class="topic-list__time-cost">⏱{{ t.timeCost }}h</span>
          </div>
          <div class="topic-list__progress">
            <PixelProgress :value="getProgress(t.id)" :max="10" />
          </div>
        </li>
      </ul>
    </PixelWindow>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import PixelWindow from '@/components/PixelWindow.vue'
import PixelInput from '@/components/PixelInput.vue'
import PixelSelect from '@/components/PixelSelect.vue'
import PixelProgress from '@/components/PixelProgress.vue'
import PixelEmpty from '@/components/PixelEmpty.vue'
import { getAll, save, query } from '@/db/dao'
import {
  STUDY_STATUS,
  STUDY_STATUS_LABELS,
  TIME_SLOT,
  TIME_SLOT_LABELS,
  TIME_SLOT_SYMBOLS
} from '@/utils/constants'
import { isThisWeek } from '@/utils/date'

const router = useRouter()
const topics = ref([])
const showForm = ref(false)
const form = ref({ name: '', goal: '', timeCost: 0, timeSlot: TIME_SLOT.ANY })
const logs = ref([])
const taskCache = ref({})

const statusLabels = STUDY_STATUS_LABELS

const timeSlotOptions = [
  { value: TIME_SLOT.ANY, label: TIME_SLOT_LABELS.any },
  { value: TIME_SLOT.DAY, label: TIME_SLOT_LABELS.day },
  { value: TIME_SLOT.NIGHT, label: TIME_SLOT_LABELS.night }
]

const timeSlotSymbols = TIME_SLOT_SYMBOLS

const activeCount = computed(() => topics.value.filter(t => t.status === STUDY_STATUS.ACTIVE).length)
const weekCount = computed(() => logs.value.filter(l => isThisWeek(l.date)).length)
const weekDuration = computed(() => logs.value.filter(l => isThisWeek(l.date)).reduce((sum, l) => sum + Number(l.duration || 0), 0))

function statusColor(s) {
  return { active: 'var(--olive)', done: 'var(--accent)', shelved: 'var(--c-dev)' }[s] || 'var(--text)'
}

function getProgress(topicId) {
  const tasks = taskCache.value[topicId] || []
  if (tasks.length === 0) return 0
  return Math.round((tasks.filter(t => t.done).length / tasks.length) * 100)
}

async function loadData() {
  topics.value = await getAll('studyTopics')
  logs.value = await getAll('studyLogs')
  for (const t of topics.value) {
    taskCache.value[t.id] = await query('studyTasks', 'topicId', t.id)
  }
}

async function saveTopic() {
  if (!form.value.name.trim()) return
  await save('studyTopics', { name: form.value.name.trim(), goal: form.value.goal, timeCost: Number(form.value.timeCost) || 0, timeSlot: form.value.timeSlot || TIME_SLOT.ANY, status: STUDY_STATUS.ACTIVE })
  form.value = { name: '', goal: '', timeCost: 0, timeSlot: TIME_SLOT.ANY }
  showForm.value = false
  await loadData()
}

function goDetail(id) {
  router.push(`/study/${id}`)
}

onMounted(async () => { await loadData() })
</script>

<style scoped>
.study { max-width: 800px; margin: 0 auto; }
.study__header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
.study__stats { display: flex; gap: 1rem; font-size: 1.05rem; font-weight: 600; }
.study__form { border: 3px solid var(--border); padding: 0.75rem; margin-bottom: 1rem; background: var(--bg); display: flex; flex-direction: column; gap: 0.5rem; }
.study__actions { display: flex; gap: 0.5rem; }
.topic-list { display: flex; flex-direction: column; gap: 0.75rem; }
.topic-list__item { border: 3px solid var(--border); padding: 0.75rem; background: var(--bg); cursor: pointer; }
.topic-list__item:hover { background: var(--panel); }
.topic-list__info { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem; }
.topic-list__name { font-size: 1.15rem; font-weight: bold; }
.topic-list__goal { font-size: 1.05rem; font-weight: 700; color: var(--ochre); flex: 1; }
.topic-list__status { font-size: 1.05rem; font-weight: 700; }
.topic-list__time-cost { font-size: 0.95rem; font-weight: 700; color: var(--olive); white-space: nowrap; }
.topic-list__time-slot { font-size: 1.05rem; font-weight: 700; color: var(--c-dev); white-space: nowrap; }
.topic-list__progress { display: flex; align-items: center; }
</style>
