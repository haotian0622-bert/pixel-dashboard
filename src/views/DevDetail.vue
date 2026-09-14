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
        <PixelInput v-model="project.desc" type="textarea" placeholder="项目简述" :rows="2" @blur="saveProject" />
      </div>

      <!-- 里程碑 -->
      <div class="dev-detail__section">
        <h3>里程碑</h3>
        <button class="pixel-btn" @click="showMilestoneForm = !showMilestoneForm">+ 新增里程碑</button>
        <div v-if="showMilestoneForm" class="dev-detail__form">
          <PixelInput v-model="milestoneForm.name" placeholder="里程碑名称" />
          <input type="date" class="pixel-input" v-model="milestoneForm.dueDate" />
          <button class="pixel-btn pixel-btn--confirm" @click="saveMilestone">保存</button>
        </div>
        <ul v-if="milestones.length" class="item-list">
          <li v-for="m in milestones" :key="m.id" class="item-list__item">
            <span class="task-checkbox" :class="{ 'task-checkbox--checked': m.status === 'done' }"
              @click="toggleMilestone(m)">{{ m.status === 'done' ? '✔' : '□' }}</span>
            <span class="item-list__title">{{ m.name }}</span>
            <span v-if="m.dueDate" class="item-list__date">{{ m.dueDate }}</span>
            <button class="pixel-btn pixel-btn--cancel" @click="deleteMilestone(m)">删</button>
          </li>
        </ul>
      </div>

      <!-- 任务 -->
      <div class="dev-detail__section">
        <h3>任务</h3>
        <button class="pixel-btn" @click="showTaskForm = !showTaskForm">+ 新增任务</button>
        <div v-if="showTaskForm" class="dev-detail__form">
          <PixelInput v-model="taskForm.title" placeholder="任务标题" />
          <input type="date" class="pixel-input" v-model="taskForm.dueDate" />
          <select class="pixel-select" v-model="taskForm.priority">
            <option v-for="(label, key) in priorityLabels" :key="key" :value="key">{{ label }}</option>
          </select>
          <button class="pixel-btn pixel-btn--confirm" @click="saveTask">保存</button>
        </div>
        <ul v-if="tasks.length" class="item-list">
          <li v-for="t in tasks" :key="t.id" class="item-list__item">
            <span class="task-checkbox" :class="{ 'task-checkbox--checked': t.done }"
              @click="toggleTask(t)">{{ t.done ? '✔' : '□' }}</span>
            <span class="item-list__title" :class="{ 'task-done': t.done }">{{ t.title }}</span>
            <span v-if="t.dueDate" class="item-list__date">{{ t.dueDate }}</span>
            <button class="pixel-btn pixel-btn--cancel" @click="deleteTask(t)">删</button>
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
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import PixelWindow from '@/components/PixelWindow.vue'
import PixelInput from '@/components/PixelInput.vue'
import { get, save, remove, query, patch } from '@/db/dao'
import {
  DEV_PROJECT_STATUS_LABELS,
  MILESTONE_STATUS,
  MILESTONE_STATUS_LABELS,
  PRIORITY_LABELS
} from '@/utils/constants'

const route = useRoute()
const projectId = route.params.id

const project = ref(null)
const milestones = ref([])
const tasks = ref([])
const snippets = ref([])

const showMilestoneForm = ref(false)
const showTaskForm = ref(false)
const showSnippetForm = ref(false)

const milestoneForm = ref({ name: '', dueDate: '', status: MILESTONE_STATUS.NOT_STARTED })
const taskForm = ref({ title: '', dueDate: '', priority: 'medium' })
const snippetForm = ref({ note: '', code: '' })

const statusLabels = DEV_PROJECT_STATUS_LABELS
const priorityLabels = PRIORITY_LABELS

async function loadData() {
  project.value = await get('devProjects', projectId)
  milestones.value = await query('devMilestones', 'projectId', projectId)
  tasks.value = await query('devTasks', 'projectId', projectId)
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
    status: MILESTONE_STATUS.NOT_STARTED
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
    projectId,
    done: false
  })
  taskForm.value = { title: '', dueDate: '', priority: 'medium' }
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
.dev-detail { max-width: 800px; margin: 0 auto; }
.dev-detail__info { margin: 1rem 0; display: flex; flex-direction: column; gap: 0.5rem; }
.dev-detail__row { display: flex; align-items: center; gap: 0.5rem; }
.dev-detail__section { margin-top: 1.5rem; }
.dev-detail__section h3 { font-size: 1.15rem; font-weight: 700; margin-bottom: 0.5rem; }
.dev-detail__form { border: 3px solid var(--border); padding: 0.75rem; margin: 0.5rem 0; background: var(--bg); display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; }
.item-list { display: flex; flex-direction: column; gap: 0.5rem; }
.item-list__item { display: flex; align-items: center; gap: 0.5rem; padding: 0.4rem; border-bottom: 2px solid var(--border); font-size: 1.1rem; font-weight: 600; }
.item-list__item:last-child { border-bottom: none; }
.item-list__item--column { flex-direction: column; align-items: stretch; }
.item-list__header { display: flex; justify-content: space-between; align-items: center; }
.item-list__title { flex: 1; }
.item-list__date { font-size: 1rem; font-weight: 600; color: var(--ochre); }
.item-list__code { font-size: 1.05rem; font-weight: 700; background: var(--bg); border: 2px solid var(--border); padding: 0.5rem; overflow: auto; white-space: pre-wrap; word-break: break-all; }
</style>
