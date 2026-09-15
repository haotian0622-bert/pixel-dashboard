<template>
  <div class="dev">
    <PixelWindow title="开发工作（AI）" icon="⚙">
      <div class="dev__header">
        <span>{{ projects.length }} 个项目</span>
        <button class="pixel-btn" @click="showForm = !showForm">+ 新增项目</button>
      </div>

      <div v-if="showForm" class="dev__form">
        <PixelInput v-model="form.name" placeholder="项目名称" />
        <PixelInput v-model="form.desc" type="textarea" placeholder="项目说明" :rows="2" />
        <div class="dev__form-row">
          <label>状态:</label>
          <select class="pixel-select" v-model="form.status">
            <option v-for="(label, key) in statusLabels" :key="key" :value="key">{{ label }}</option>
          </select>
          <label>耗时(h):</label>
          <input type="number" class="pixel-input" v-model.number="form.timeCost" min="0" step="0.5" style="max-width: 90px" placeholder="0" />
          <label>时段:</label>
          <PixelSelect v-model="form.timeSlot" :options="timeSlotOptions" />
        </div>
        <PixelInput v-model="form.localDir" placeholder="本地保存目录（如 D:/code/my-app）" />
        <PixelInput v-model="form.repo" placeholder="代码仓库地址（如 https://github.com/you/repo）" />
        <PixelInput v-model="form.docs" placeholder="文档链接（如 https://...）" />
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
          <div v-if="p.desc" class="project-list__desc">{{ p.desc }}</div>

          <!-- 本地目录 / 仓库 / 文档：默认显示 -->
          <div class="project-list__meta">
            <span v-if="p.localDir" class="project-list__dir" :title="p.localDir">📁 {{ p.localDir }}</span>
            <a
              v-if="p.repo"
              class="project-list__link"
              :href="normalizeUrl(p.repo)"
              target="_blank"
              rel="noopener"
              @click.stop
            >🔗 代码仓库</a>
            <a
              v-if="p.docs"
              class="project-list__link"
              :href="normalizeUrl(p.docs)"
              target="_blank"
              rel="noopener"
              @click.stop
            >📄 文档</a>
          </div>

          <div class="project-list__progress">
            <PixelProgress :value="getProgress(p.id)" :max="10" />
            <span class="project-list__counts">
              工作项 {{ taskCache[p.id]?.length || 0 }} ·
              里程碑 {{ (milestoneCache[p.id] || []).length }} ·
              日志 {{ (logCache[p.id] || []).length }}
            </span>
          </div>
        </li>
      </ul>

      <!-- 里程碑看板：不同颜色小旗子，直接展示在主页 -->
      <div class="dev__milestones">
        <h3 class="dev__milestones-title">🚩 里程碑看板</h3>
        <PixelEmpty v-if="allMilestones.length === 0" text="暂无里程碑，进入项目添加" />
        <ul v-else class="flag-list">
          <li
            v-for="m in sortedMilestones"
            :key="m.id"
            class="flag-list__item"
            @click="goDetail(m.projectId)"
          >
            <span class="milestone-flag" :class="`milestone-flag--${m.status || 'not_started'}`">⚑</span>
            <span class="flag-list__name" :class="{ 'flag-list__name--done': m.status === 'done' }">{{ m.name }}</span>
            <span class="flag-list__status">{{ milestoneLabels[m.status] || milestoneLabels.not_started }}</span>
            <span class="flag-list__project">{{ projectName(m.projectId) }}</span>
            <span v-if="m.dueDate" class="flag-list__date">{{ m.dueDate }}</span>
          </li>
        </ul>
      </div>
    </PixelWindow>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import PixelWindow from '@/components/PixelWindow.vue'
import PixelInput from '@/components/PixelInput.vue'
import PixelProgress from '@/components/PixelProgress.vue'
import PixelSelect from '@/components/PixelSelect.vue'
import PixelEmpty from '@/components/PixelEmpty.vue'
import { getAll, save } from '@/db/dao'
import {
  DEV_PROJECT_STATUS,
  DEV_PROJECT_STATUS_LABELS,
  MILESTONE_STATUS_LABELS,
  TIME_SLOT,
  TIME_SLOT_LABELS,
  TIME_SLOT_SYMBOLS
} from '@/utils/constants'

const router = useRouter()
const projects = ref([])
const showForm = ref(false)
const form = ref(emptyForm())
const taskCache = ref({})       // projectId -> tasks
const milestoneCache = ref({})  // projectId -> milestones
const logCache = ref({})        // projectId -> logs
const allMilestones = ref([])

const statusLabels = DEV_PROJECT_STATUS_LABELS
const milestoneLabels = MILESTONE_STATUS_LABELS

const timeSlotOptions = [
  { value: TIME_SLOT.ANY, label: TIME_SLOT_LABELS.any },
  { value: TIME_SLOT.DAY, label: TIME_SLOT_LABELS.day },
  { value: TIME_SLOT.NIGHT, label: TIME_SLOT_LABELS.night }
]
const timeSlotSymbols = TIME_SLOT_SYMBOLS

function emptyForm() {
  return {
    name: '', desc: '', status: DEV_PROJECT_STATUS.NOT_STARTED,
    localDir: '', repo: '', docs: '',
    timeCost: 0, timeSlot: TIME_SLOT.ANY
  }
}

// 里程碑按截止日期升序（无日期排后）
const sortedMilestones = computed(() =>
  [...allMilestones.value].sort((a, b) => {
    if (!a.dueDate) return 1
    if (!b.dueDate) return -1
    return a.dueDate.localeCompare(b.dueDate)
  })
)

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

function projectName(id) {
  return projects.value.find(p => p.id === id)?.name || '未知项目'
}

// 补全链接协议
function normalizeUrl(url) {
  const s = String(url || '').trim()
  if (!s) return '#'
  return /^https?:\/\//i.test(s) ? s : `https://${s}`
}

async function loadProjects() {
  projects.value = await getAll('devProjects')
  const [allTasks, allMilestonesList, allLogs] = await Promise.all([
    getAll('devTasks'),
    getAll('devMilestones'),
    getAll('devLogs')
  ])
  taskCache.value = groupBy(allTasks, 'projectId')
  milestoneCache.value = groupBy(allMilestonesList, 'projectId')
  logCache.value = groupBy(allLogs, 'projectId')
  allMilestones.value = allMilestonesList
}

function groupBy(list, key) {
  const out = {}
  for (const item of list) {
    const k = item[key]
    if (!out[k]) out[k] = []
    out[k].push(item)
  }
  return out
}

async function saveProject() {
  if (!form.value.name.trim()) return
  await save('devProjects', {
    name: form.value.name.trim(),
    desc: form.value.desc,
    status: form.value.status || DEV_PROJECT_STATUS.NOT_STARTED,
    localDir: form.value.localDir?.trim() || '',
    repo: form.value.repo?.trim() || '',
    docs: form.value.docs?.trim() || '',
    timeCost: Number(form.value.timeCost) || 0,
    timeSlot: form.value.timeSlot || TIME_SLOT.ANY
  })
  form.value = emptyForm()
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
.dev { max-width: 900px; margin: 0 auto; }
.dev__header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
.dev__form { border: 3px solid var(--border); padding: 0.75rem; margin-bottom: 1rem; background: var(--bg); display: flex; flex-direction: column; gap: 0.5rem; }
.dev__form-row { display: flex; align-items: center; gap: 0.5rem; font-size: 1.05rem; font-weight: 700; flex-wrap: wrap; }
.dev__actions { display: flex; gap: 0.5rem; }
.project-list { display: flex; flex-direction: column; gap: 0.75rem; }
.project-list__item { border: 3px solid var(--border); padding: 0.75rem; background: var(--bg); cursor: pointer; box-shadow: 3px 3px 0 var(--shadow); }
.project-list__item:hover { background: var(--panel); }
.project-list__info { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; gap: 0.5rem; }
.project-list__name { font-size: 1.15rem; font-weight: bold; }
.project-list__status { font-size: 1.05rem; font-weight: 700; white-space: nowrap; }
.project-list__time-cost { font-size: 0.95rem; font-weight: 700; color: var(--olive); white-space: nowrap; }
.project-list__time-slot { font-size: 1.05rem; font-weight: 700; color: var(--c-dev); white-space: nowrap; }
.project-list__desc { font-size: 1.05rem; font-weight: 700; color: var(--ochre); margin-bottom: 0.5rem; }
.project-list__meta {
  display: flex; flex-wrap: wrap; gap: 0.4rem 1rem;
  font-size: 0.95rem; font-weight: 700;
  margin-bottom: 0.5rem;
}
.project-list__dir { color: var(--c-dev); word-break: break-all; }
.project-list__link { color: var(--accent); text-decoration: underline; cursor: pointer; }
.project-list__progress { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; }
.project-list__counts { font-size: 0.9rem; font-weight: 700; color: var(--ochre); white-space: nowrap; }

/* 里程碑看板 */
.dev__milestones { margin-top: 1.5rem; border: 3px solid var(--border); background: var(--panel); padding: 0.75rem; }
.dev__milestones-title { font-size: 1.2rem; font-weight: 700; margin-bottom: 0.6rem; }
.flag-list { display: flex; flex-direction: column; gap: 0.4rem; }
.flag-list__item {
  display: flex; align-items: center; gap: 0.6rem;
  padding: 0.45rem 0.5rem;
  border: 2px solid var(--border);
  background: var(--bg);
  cursor: pointer;
  font-size: 1rem; font-weight: 700;
}
.flag-list__item:hover { background: var(--panel); }
.milestone-flag { font-size: 1.35rem; line-height: 1; font-weight: 700; }
.milestone-flag--not_started { color: var(--ochre); opacity: 0.55; }
.milestone-flag--active { color: var(--c-dev); }
.milestone-flag--done { color: var(--olive); }
.flag-list__name { flex: 1; font-weight: 700; }
.flag-list__name--done { text-decoration: line-through; opacity: 0.6; }
.flag-list__status {
  font-size: 0.85rem; font-weight: 700;
  padding: 0.1rem 0.45rem;
  border: 2px solid var(--border);
  white-space: nowrap;
}
.flag-list__project { font-size: 0.9rem; font-weight: 700; color: var(--c-dev); white-space: nowrap; }
.flag-list__date { font-size: 0.9rem; font-weight: 700; color: var(--ochre); white-space: nowrap; }

@media (max-width: 768px) {
  .project-list__info { flex-wrap: wrap; }
  .flag-list__item { flex-wrap: wrap; }
}
</style>
