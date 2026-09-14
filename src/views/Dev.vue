<template>
  <div class="dev">
    <PixelWindow title="开发工作（AI）" icon="⚙">
      <div class="dev__header">
        <span>{{ projects.length }} 个项目</span>
        <button class="pixel-btn" @click="showForm = !showForm">+ 新增项目</button>
      </div>

      <div v-if="showForm" class="dev__form">
        <PixelInput v-model="form.name" placeholder="项目名称" />
        <PixelInput v-model="form.desc" type="textarea" placeholder="项目简述" :rows="2" />
        <label>耗时(h):</label>
        <input type="number" class="pixel-input" v-model.number="form.timeCost" min="0" step="0.5" style="max-width: 90px" placeholder="0" />
        <label>时段:</label>
        <PixelSelect v-model="form.timeSlot" :options="timeSlotOptions" />
        <div class="dev__actions">
          <button class="pixel-btn pixel-btn--confirm" @click="saveProject">保存</button>
          <button class="pixel-btn pixel-btn--cancel" @click="showForm = false">取消</button>
        </div>
      </div>

      <PixelEmpty v-if="projects.length === 0" text="暂无项目" />
      <ul v-else class="project-list">
        <li v-for="p in projects" :key="p.id" class="project-list__item" @click="goDetail(p.id)">
          <div class="project-list__info">
            <span class="project-list__name">{{ p.name }}</span>
            <span class="project-list__status" :style="{ color: statusColor(p.status) }">
              {{ statusLabels[p.status] }}
            </span>
            <span v-if="p.timeSlot && p.timeSlot !== 'any'" class="project-list__time-slot">{{ timeSlotSymbols[p.timeSlot] }}</span>
            <span v-if="p.timeCost" class="project-list__time-cost">⏱{{ p.timeCost }}h</span>
          </div>
          <div class="project-list__desc">{{ p.desc }}</div>
          <div class="project-list__progress">
            <PixelProgress :value="getProgress(p.id)" :max="10" />
          </div>
        </li>
      </ul>
    </PixelWindow>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import PixelWindow from '@/components/PixelWindow.vue'
import PixelInput from '@/components/PixelInput.vue'
import PixelProgress from '@/components/PixelProgress.vue'
import PixelSelect from '@/components/PixelSelect.vue'
import PixelEmpty from '@/components/PixelEmpty.vue'
import { getAll, save, query } from '@/db/dao'
import { DEV_PROJECT_STATUS, DEV_PROJECT_STATUS_LABELS, TIME_SLOT, TIME_SLOT_LABELS, TIME_SLOT_SYMBOLS } from '@/utils/constants'

const router = useRouter()
const projects = ref([])
const showForm = ref(false)
const form = ref({ name: '', desc: '', timeCost: 0, timeSlot: TIME_SLOT.ANY })
const taskCache = ref({}) // projectId -> tasks

const statusLabels = DEV_PROJECT_STATUS_LABELS

const timeSlotOptions = [
  { value: TIME_SLOT.ANY, label: TIME_SLOT_LABELS.any },
  { value: TIME_SLOT.DAY, label: TIME_SLOT_LABELS.day },
  { value: TIME_SLOT.NIGHT, label: TIME_SLOT_LABELS.night }
]
const timeSlotSymbols = TIME_SLOT_SYMBOLS

function statusColor(status) {
  const colors = {
    planning: 'var(--ochre)',
    active: 'var(--olive)',
    paused: 'var(--c-dev)',
    done: 'var(--accent)'
  }
  return colors[status] || 'var(--text)'
}

function getProgress(projectId) {
  const tasks = taskCache.value[projectId] || []
  if (tasks.length === 0) return 0
  const done = tasks.filter(t => t.done).length
  return Math.round((done / tasks.length) * 100)
}

async function loadProjects() {
  projects.value = await getAll('devProjects')
  for (const p of projects.value) {
    const tasks = await query('devTasks', 'projectId', p.id)
    taskCache.value[p.id] = tasks
  }
}

async function saveProject() {
  if (!form.value.name.trim()) return
  await save('devProjects', {
    name: form.value.name.trim(),
    desc: form.value.desc,
    status: DEV_PROJECT_STATUS.PLANNING,
    timeCost: Number(form.value.timeCost) || 0,
    timeSlot: form.value.timeSlot || TIME_SLOT.ANY
  })
  form.value = { name: '', desc: '', timeCost: 0, timeSlot: TIME_SLOT.ANY }
  showForm.value = false
  await loadProjects()
}

function goDetail(id) {
  router.push(`/dev/${id}`)
}

onMounted(async () => {
  await loadProjects()
})
</script>

<style scoped>
.dev { max-width: 800px; margin: 0 auto; }
.dev__header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
.dev__form { border: 3px solid var(--border); padding: 0.75rem; margin-bottom: 1rem; background: var(--bg); display: flex; flex-direction: column; gap: 0.5rem; }
.dev__actions { display: flex; gap: 0.5rem; }
.project-list { display: flex; flex-direction: column; gap: 0.75rem; }
.project-list__item { border: 3px solid var(--border); padding: 0.75rem; background: var(--bg); cursor: pointer; }
.project-list__item:hover { background: var(--panel); }
.project-list__info { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
.project-list__name { font-size: 1.15rem; font-weight: bold; }
.project-list__status { font-size: 1.05rem; font-weight: 700; }
.project-list__time-cost { font-size: 0.95rem; font-weight: 700; color: var(--olive); white-space: nowrap; }
.project-list__time-slot { font-size: 1.05rem; font-weight: 700; color: var(--c-dev); white-space: nowrap; }
.project-list__desc { font-size: 1.05rem; font-weight: 600; color: var(--ochre); margin-bottom: 0.5rem; }
.project-list__progress { display: flex; align-items: center; }
</style>
