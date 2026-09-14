<template>
  <div class="dev-detail">
    <PixelWindow :title="`项目: ${project?.name || ''}`" icon="⚙">
      <button class="pixel-btn" @click="$router.push('/dev')">← 返回</button>

      <div v-if="project" class="dev-detail__info">
        <div class="dev-detail__row">
          <label>名称:</label>
          <PixelInput v-model="project.name" @blur="saveProject" />
          <label>状态:</label>
          <select class="pixel-select" v-model="project.status" @change="saveProject">
            <option v-for="(label, key) in statusLabels" :key="key" :value="key">{{ label }}</option>
          </select>
        </div>
        <PixelInput v-model="project.desc" type="textarea" placeholder="项目说明" :rows="2" @blur="saveProject" />
        <div class="dev-detail__row dev-detail__row--link">
          <label>本地目录:</label>
          <PixelInput v-model="project.localDir" placeholder="如 D:/code/my-app" @blur="saveProject" />
        </div>
        <div class="dev-detail__row dev-detail__row--link">
          <label>代码仓库:</label>
          <PixelInput v-model="project.repo" placeholder="https://github.com/..." @blur="saveProject" />
          <a v-if="project.repo" :href="normalizeUrl(project.repo)" target="_blank" rel="noopener" class="dev-detail__open-link">打开 ↗</a>
        </div>
        <div class="dev-detail__row dev-detail__row--link">
          <label>文档链接:</label>
          <PixelInput v-model="project.docs" placeholder="https://..." @blur="saveProject" />
          <a v-if="project.docs" :href="normalizeUrl(project.docs)" target="_blank" rel="noopener" class="dev-detail__open-link">打开 ↗</a>
        </div>
      </div>

      <!-- 里程碑（不同颜色小旗子） -->
      <div class="dev-detail__section">
        <h3>里程碑</h3>
        <button class="pixel-btn" @click="showMilestoneForm = !showMilestoneForm">+ 新增里程碑</button>
        <div v-if="showMilestoneForm" class="dev-detail__form">
          <PixelInput v-model="milestoneForm.name" placeholder="里程碑名称" />
          <input type="date" class="pixel-input" v-model="milestoneForm.dueDate" />
          <select class="pixel-select" v-model="milestoneForm.status">
            <option v-for="(label, key) in milestoneStatusLabels" :key="key" :value="key">{{ label }}</option>
          </select>
          <button class="pixel-btn pixel-btn--confirm" @click="saveMilestone">保存</button>
        </div>
        <ul v-if="milestones.length" class="item-list">
          <li v-for="m in milestones" :key="m.id" class="item-list__item">
            <span class="task-checkbox" :class="{ 'task-checkbox--checked': m.status === 'done' }"
              @click="toggleMilestone(m)">{{ m.status === 'done' ? '✔' : '□' }}</span>
            <span class="milestone-flag" :class="`milestone-flag--${m.status || 'not_started'}`">⚑</span>
            <span class="item-list__title" :class="{ 'task-done': m.status === 'done' }">{{ m.name }}</span>
            <span class="milestone-tag" :class="`milestone-tag--${m.status || 'not_started'}`">{{ milestoneStatusLabels[m.status] || milestoneStatusLabels.not_started }}</span>
            <span v-if="m.dueDate" class="item-list__date">{{ m.dueDate }}</span>
            <button class="pixel-btn pixel-btn--cancel" @click="deleteMilestone(m)">删</button>
          </li>
        </ul>
      </div>

      <!-- 工作项（功能 / 需求 / Bug / 技术问题） -->
      <div class="dev-detail__section">
        <h3>工作项</h3>
        <div class="dev-detail__filters">
          <button
            v-for="opt in kindFilterOptions"
            :key="opt.value"
            class="pixel-btn dev-detail__filter"
            :class="{ 'dev-detail__filter--active': kindFilter === opt.value }"
            @click="kindFilter = opt.value"
          >{{ opt.label }}</button>
        </div>
        <button class="pixel-btn" @click="showTaskForm = !showTaskForm">+ 新增工作项</button>
        <div v-if="showTaskForm" class="dev-detail__form">
          <PixelInput v-model="taskForm.title" placeholder="工作项标题" />
          <select class="pixel-select" v-model="taskForm.kind">
            <option v-for="(label, key) in kindLabels" :key="key" :value="key">{{ label }}</option>
          </select>
          <input type="date" class="pixel-input" v-model="taskForm.dueDate" />
          <select class="pixel-select" v-model="taskForm.priority">
            <option v-for="(label, key) in priorityLabels" :key="key" :value="key">{{ label }}</option>
          </select>
          <label>耗时(h):</label>
          <input type="number" class="pixel-input" v-model.number="taskForm.timeCost" min="0" step="0.5" style="max-width: 90px" placeholder="0" />
          <label>时段:</label>
          <PixelSelect v-model="taskForm.timeSlot" :options="timeSlotOptions" />
          <button class="pixel-btn pixel-btn--confirm" @click="saveTask">保存</button>
        </div>
        <ul v-if="filteredTasks.length" class="item-list">
          <li v-for="t in filteredTasks" :key="t.id" class="item-list__item">
            <span class="task-checkbox" :class="{ 'task-checkbox--checked': t.done }"
              @click="toggleTask(t)">{{ t.done ? '✔' : '□' }}</span>
            <span class="kind-tag" :class="`kind-tag--${t.kind || 'feature'}`">{{ kindLabels[t.kind] || kindLabels.feature }}</span>
            <span class="item-list__title" :class="{ 'task-done': t.done }">{{ t.title }}</span>
            <span v-if="t.dueDate" class="item-list__date">{{ t.dueDate }}</span>
            <span v-if="t.timeSlot && t.timeSlot !== 'any'" class="item-list__time-slot">{{ timeSlotSymbols[t.timeSlot] }}</span>
            <span v-if="t.timeCost" class="item-list__time-cost">⏱{{ t.timeCost }}h</span>
            <button class="pixel-btn pixel-btn--cancel" @click="deleteTask(t)">删</button>
          </li>
        </ul>
      </div>

      <!-- 开发日志 -->
      <div class="dev-detail__section">
        <h3>开发日志</h3>
        <button class="pixel-btn" @click="showLogForm = !showLogForm">+ 新增日志</button>
        <div v-if="showLogForm" class="dev-detail__form dev-detail__form--column">
          <input type="date" class="pixel-input" v-model="logForm.date" />
          <PixelInput v-model="logForm.content" type="textarea" placeholder="今天做了什么、遇到什么问题……" :rows="3" />
          <button class="pixel-btn pixel-btn--confirm" @click="saveLog">保存</button>
        </div>
        <ul v-if="logs.length" class="log-list">
          <li v-for="l in sortedLogs" :key="l.id" class="log-list__item">
            <div class="log-list__head">
              <span class="log-list__date">{{ l.date }}</span>
              <button class="pixel-btn pixel-btn--cancel" @click="deleteLog(l)">删</button>
            </div>
            <div class="log-list__content">{{ l.content }}</div>
          </li>
        </ul>
      </div>

      <!-- 代码片段 -->
      <div class="dev-detail__section">
        <h3>代码片段</h3>
        <button class="pixel-btn" @click="showSnippetForm = !showSnippetForm">+ 新增片段</button>
        <div v-if="showSnippetForm" class="dev-detail__form">
          <PixelInput v-model="snippetForm.note" placeholder="说明" />
          <PixelInput v-model="snippetForm.code" type="textarea" placeholder="代码" :rows="5" />
          <button class="pixel-btn pixel-btn--confirm" @click="saveSnippet">保存</button>
        </div>
        <ul v-if="snippets.length" class="item-list">
          <li v-for="s in snippets" :key="s.id" class="item-list__item item-list__item--column">
            <div class="item-list__header">
              <span class="item-list__title">{{ s.note }}</span>
              <button class="pixel-btn pixel-btn--cancel" @click="deleteSnippet(s)">删</button>
            </div>
            <pre class="item-list__code">{{ s.code }}</pre>
          </li>
        </ul>
      </div>
    </PixelWindow>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import PixelWindow from '@/components/PixelWindow.vue'
import PixelInput from '@/components/PixelInput.vue'
import PixelSelect from '@/components/PixelSelect.vue'
import { get, save, remove, query, patch } from '@/db/dao'
import {
  DEV_PROJECT_STATUS_LABELS,
  MILESTONE_STATUS,
  MILESTONE_STATUS_LABELS,
  DEV_TASK_KIND,
  DEV_TASK_KIND_LABELS,
  PRIORITY_LABELS,
  TIME_SLOT,
  TIME_SLOT_LABELS,
  TIME_SLOT_SYMBOLS
} from '@/utils/constants'
import { today } from '@/utils/date'

const route = useRoute()
const projectId = route.params.id

const project = ref(null)
const milestones = ref([])
const tasks = ref([])
const logs = ref([])
const snippets = ref([])

const showMilestoneForm = ref(false)
const showTaskForm = ref(false)
const showLogForm = ref(false)
const showSnippetForm = ref(false)

const milestoneForm = ref({ name: '', dueDate: '', status: MILESTONE_STATUS.NOT_STARTED })
const taskForm = ref({ title: '', kind: DEV_TASK_KIND.FEATURE, dueDate: '', priority: 'medium', timeCost: 0, timeSlot: TIME_SLOT.ANY })
const logForm = ref({ date: today(), content: '' })
const snippetForm = ref({ note: '', code: '' })

const statusLabels = DEV_PROJECT_STATUS_LABELS
const milestoneStatusLabels = MILESTONE_STATUS_LABELS
const priorityLabels = PRIORITY_LABELS
const kindLabels = DEV_TASK_KIND_LABELS

// 工作项分类筛选
const kindFilter = ref('all')
const kindFilterOptions = [
  { value: 'all', label: '全部' },
  { value: DEV_TASK_KIND.FEATURE, label: DEV_TASK_KIND_LABELS.feature },
  { value: DEV_TASK_KIND.REQUIREMENT, label: DEV_TASK_KIND_LABELS.requirement },
  { value: DEV_TASK_KIND.BUG, label: DEV_TASK_KIND_LABELS.bug },
  { value: DEV_TASK_KIND.TECH, label: DEV_TASK_KIND_LABELS.tech }
]
const filteredTasks = computed(() =>
  kindFilter.value === 'all'
    ? tasks.value
    : tasks.value.filter(t => (t.kind || 'feature') === kindFilter.value)
)

// 日志按日期倒序
const sortedLogs = computed(() =>
  [...logs.value].sort((a, b) => (b.date || '').localeCompare(a.date || ''))
)

const timeSlotOptions = [
  { value: TIME_SLOT.ANY, label: TIME_SLOT_LABELS.any },
  { value: TIME_SLOT.DAY, label: TIME_SLOT_LABELS.day },
  { value: TIME_SLOT.NIGHT, label: TIME_SLOT_LABELS.night }
]
const timeSlotSymbols = TIME_SLOT_SYMBOLS

function normalizeUrl(url) {
  const s = String(url || '').trim()
  if (!s) return '#'
  return /^https?:\/\//i.test(s) ? s : `https://${s}`
}

async function loadData() {
  project.value = await get('devProjects', projectId)
  milestones.value = await query('devMilestones', 'projectId', projectId)
  tasks.value = await query('devTasks', 'projectId', projectId)
  logs.value = await query('devLogs', 'projectId', projectId)
  snippets.value = await query('devSnippets', 'projectId', projectId)
}

async function saveProject() {
  if (project.value) {
    await save('devProjects', project.value)
  }
}

async function saveMilestone() {
  if (!milestoneForm.value.name.trim()) return
  await save('devMilestones', {
    ...milestoneForm.value,
    projectId,
    status: milestoneForm.value.status || MILESTONE_STATUS.NOT_STARTED
  })
  milestoneForm.value = { name: '', dueDate: '', status: MILESTONE_STATUS.NOT_STARTED }
  showMilestoneForm.value = false
  await loadData()
}

async function toggleMilestone(m) {
  const newStatus = m.status === MILESTONE_STATUS.DONE ? MILESTONE_STATUS.NOT_STARTED : MILESTONE_STATUS.DONE
  await patch('devMilestones', m.id, { status: newStatus })
  await loadData()
}

async function deleteMilestone(m) {
  await remove('devMilestones', m.id)
  await loadData()
}

async function saveTask() {
  if (!taskForm.value.title.trim()) return
  await save('devTasks', {
    ...taskForm.value,
    kind: taskForm.value.kind || DEV_TASK_KIND.FEATURE,
    projectId,
    done: false,
    timeCost: Number(taskForm.value.timeCost) || 0,
    timeSlot: taskForm.value.timeSlot || TIME_SLOT.ANY
  })
  taskForm.value = { title: '', kind: DEV_TASK_KIND.FEATURE, dueDate: '', priority: 'medium', timeCost: 0, timeSlot: TIME_SLOT.ANY }
  showTaskForm.value = false
  await loadData()
}

async function toggleTask(t) {
  await patch('devTasks', t.id, { done: !t.done })
  await loadData()
}

async function deleteTask(t) {
  await remove('devTasks', t.id)
  await loadData()
}

async function saveLog() {
  if (!logForm.value.content.trim()) return
  await save('devLogs', {
    projectId,
    date: logForm.value.date || today(),
    content: logForm.value.content.trim()
  })
  logForm.value = { date: today(), content: '' }
  showLogForm.value = false
  await loadData()
}

async function deleteLog(l) {
  await remove('devLogs', l.id)
  await loadData()
}

async function saveSnippet() {
  if (!snippetForm.value.code.trim()) return
  await save('devSnippets', { ...snippetForm.value, projectId })
  snippetForm.value = { note: '', code: '' }
  showSnippetForm.value = false
  await loadData()
}

async function deleteSnippet(s) {
  await remove('devSnippets', s.id)
  await loadData()
}

onMounted(async () => {
  await loadData()
})
</script>

<style scoped>
.dev-detail { max-width: 900px; margin: 0 auto; }
.dev-detail__info { margin: 1rem 0; display: flex; flex-direction: column; gap: 0.5rem; }
.dev-detail__row { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
.dev-detail__row--link .pixel-input { flex: 1; min-width: 200px; }
.dev-detail__open-link { color: var(--accent); font-weight: 700; text-decoration: underline; white-space: nowrap; font-size: 0.95rem; }
.dev-detail__section { margin-top: 1.5rem; }
.dev-detail__section h3 { font-size: 1.15rem; font-weight: 700; margin-bottom: 0.5rem; }
.dev-detail__form { border: 3px solid var(--border); padding: 0.75rem; margin: 0.5rem 0; background: var(--bg); display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; }
.dev-detail__form--column { flex-direction: column; align-items: stretch; }
.dev-detail__filters { display: flex; gap: 0.4rem; flex-wrap: wrap; margin-bottom: 0.5rem; }
.dev-detail__filter { font-size: 0.95rem; padding: 0.25rem 0.7rem; }
.dev-detail__filter--active { background: var(--c-dev); color: var(--bg); border-color: var(--text); }
.item-list { display: flex; flex-direction: column; gap: 0.5rem; }
.item-list__item { display: flex; align-items: center; gap: 0.5rem; padding: 0.4rem; border-bottom: 2px solid var(--border); font-size: 1.1rem; font-weight: 600; flex-wrap: wrap; }
.item-list__item:last-child { border-bottom: none; }
.item-list__item--column { flex-direction: column; align-items: stretch; }
.item-list__header { display: flex; justify-content: space-between; align-items: center; }
.item-list__title { flex: 1; }
.item-list__date { font-size: 1rem; font-weight: 600; color: var(--ochre); }
.item-list__time-cost { font-size: 0.95rem; font-weight: 700; color: var(--olive); white-space: nowrap; }
.item-list__time-slot { font-size: 1.05rem; font-weight: 700; color: var(--c-dev); white-space: nowrap; }
.item-list__code { font-size: 1.05rem; font-weight: 700; background: var(--bg); border: 2px solid var(--border); padding: 0.5rem; overflow: auto; white-space: pre-wrap; word-break: break-all; }

/* 里程碑小旗子（按状态三色） */
.milestone-flag { font-size: 1.3rem; line-height: 1; font-weight: 700; }
.milestone-flag--not_started { color: var(--ochre); opacity: 0.55; }
.milestone-flag--active { color: var(--c-dev); }
.milestone-flag--done { color: var(--olive); }
.milestone-tag {
  font-size: 0.85rem; font-weight: 700;
  padding: 0.1rem 0.45rem;
  border: 2px solid var(--border);
  white-space: nowrap;
}
.milestone-tag--not_started { color: var(--ochre); }
.milestone-tag--active { color: var(--bg); background: var(--c-dev); }
.milestone-tag--done { color: var(--bg); background: var(--olive); }

/* 工作项分类标签（四类四色） */
.kind-tag {
  font-size: 0.85rem; font-weight: 700;
  padding: 0.1rem 0.45rem;
  border: 2px solid var(--border);
  white-space: nowrap;
}
.kind-tag--feature { color: var(--bg); background: var(--c-dev); }
.kind-tag--requirement { color: var(--bg); background: var(--c-study); }
.kind-tag--bug { color: var(--bg); background: var(--accent); }
.kind-tag--tech { color: var(--bg); background: var(--ochre); }

/* 开发日志 */
.log-list { display: flex; flex-direction: column; gap: 0.5rem; }
.log-list__item { border: 2px solid var(--border); background: var(--bg); padding: 0.5rem 0.6rem; }
.log-list__head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.3rem; }
.log-list__date { font-size: 0.95rem; font-weight: 700; color: var(--c-dev); }
.log-list__content { font-size: 1rem; font-weight: 600; white-space: pre-wrap; word-break: break-all; }
</style>
