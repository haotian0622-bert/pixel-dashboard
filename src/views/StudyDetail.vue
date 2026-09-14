<template>
  <div class="study-detail">
    <PixelWindow :title="`学习: ${topic?.name || ''}`" icon="☆">
      <button class="pixel-btn" @click="$router.push('/study')">← 返回</button>

      <div v-if="topic" class="study-detail__info">
        <div class="study-detail__row">
          <label>名称:</label>
          <PixelInput v-model="topic.name" @blur="saveTopic" />
          <label>状态:</label>
          <select class="pixel-select" v-model="topic.status" @change="saveTopic">
            <option v-for="(label, key) in statusLabels" :key="key" :value="key">{{ label }}</option>
          </select>
        </div>
        <PixelInput v-model="topic.goal" placeholder="一句话目标" @blur="saveTopic" />
      </div>

      <!-- 学习任务 -->
      <div class="study-detail__section">
        <h3>学习任务</h3>
        <button class="pixel-btn" @click="showTaskForm = !showTaskForm">+ 新增任务</button>
        <div v-if="showTaskForm" class="study-detail__form">
          <PixelInput v-model="taskForm.title" placeholder="任务标题" />
          <input type="date" class="pixel-input" v-model="taskForm.dueDate" />
          <button class="pixel-btn pixel-btn--confirm" @click="saveTask">保存</button>
        </div>
        <ul v-if="tasks.length" class="item-list">
          <li v-for="t in tasks" :key="t.id" class="item-list__item">
            <span class="task-checkbox" :class="{ 'task-checkbox--checked': t.done }" @click="toggleTask(t)">{{ t.done ? '✔' : '□' }}</span>
            <span class="item-list__title" :class="{ 'task-done': t.done }">{{ t.title }}</span>
            <span v-if="t.dueDate" class="item-list__date">{{ t.dueDate }}</span>
            <button class="pixel-btn pixel-btn--cancel" @click="deleteTask(t)">删</button>
          </li>
        </ul>
      </div>

      <!-- 打卡记录 -->
      <div class="study-detail__section">
        <h3>打卡记录</h3>
        <div class="study-detail__form">
          <input type="date" class="pixel-input" v-model="logForm.date" />
          <PixelInput v-model="logForm.content" placeholder="学了什么" />
          <input class="pixel-input" v-model="logForm.duration" placeholder="时长(分钟)" type="number" />
          <button class="pixel-btn pixel-btn--confirm" @click="saveLog">记录</button>
        </div>
        <ul v-if="logs.length" class="item-list">
          <li v-for="l in logs" :key="l.id" class="item-list__item">
            <span class="item-list__date">{{ l.date }}</span>
            <span class="item-list__title">{{ l.content }}</span>
            <span v-if="l.duration">{{ l.duration }}分钟</span>
            <button class="pixel-btn pixel-btn--cancel" @click="deleteLog(l)">删</button>
          </li>
        </ul>
      </div>

      <!-- 资料备忘 -->
      <div class="study-detail__section">
        <h3>资料备忘</h3>
        <button class="pixel-btn" @click="showMatForm = !showMatForm">+ 新增资料</button>
        <div v-if="showMatForm" class="study-detail__form">
          <PixelInput v-model="matForm.content" placeholder="链接或要点" />
          <button class="pixel-btn pixel-btn--confirm" @click="saveMaterial">保存</button>
        </div>
        <ul v-if="materials.length" class="item-list">
          <li v-for="m in materials" :key="m.id" class="item-list__item">
            <span class="item-list__title">{{ m.content }}</span>
            <button class="pixel-btn pixel-btn--cancel" @click="deleteMaterial(m)">删</button>
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
import { STUDY_STATUS_LABELS } from '@/utils/constants'
import { today } from '@/utils/date'

const route = useRoute()
const topicId = route.params.id
const topic = ref(null)
const tasks = ref([])
const logs = ref([])
const materials = ref([])

const showTaskForm = ref(false)
const showMatForm = ref(false)
const taskForm = ref({ title: '', dueDate: '' })
const logForm = ref({ date: today(), content: '', duration: '' })
const matForm = ref({ content: '' })

const statusLabels = STUDY_STATUS_LABELS

async function loadData() {
  topic.value = await get('studyTopics', topicId)
  tasks.value = await query('studyTasks', 'topicId', topicId)
  logs.value = (await query('studyLogs', 'topicId', topicId)).sort((a, b) => (b.date || '').localeCompare(a.date || ''))
  materials.value = await query('studyMaterials', 'topicId', topicId)
}

async function saveTopic() {
  if (topic.value) await save('studyTopics', topic.value)
}

async function saveTask() {
  if (!taskForm.value.title.trim()) return
  await save('studyTasks', { ...taskForm.value, topicId, done: false })
  taskForm.value = { title: '', dueDate: '' }
  showTaskForm.value = false
  await loadData()
}

async function toggleTask(t) {
  await patch('studyTasks', t.id, { done: !t.done })
  await loadData()
}

async function deleteTask(t) {
  await remove('studyTasks', t.id)
  await loadData()
}

async function saveLog() {
  if (!logForm.value.content.trim()) return
  await save('studyLogs', { ...logForm.value, topicId, duration: logForm.value.duration ? Number(logForm.value.duration) : undefined })
  logForm.value = { date: today(), content: '', duration: '' }
  await loadData()
}

async function deleteLog(l) {
  await remove('studyLogs', l.id)
  await loadData()
}

async function saveMaterial() {
  if (!matForm.value.content.trim()) return
  await save('studyMaterials', { ...matForm.value, topicId })
  matForm.value = { content: '' }
  showMatForm.value = false
  await loadData()
}

async function deleteMaterial(m) {
  await remove('studyMaterials', m.id)
  await loadData()
}

onMounted(async () => { await loadData() })
</script>

<style scoped>
.study-detail { max-width: 800px; margin: 0 auto; }
.study-detail__info { margin: 1rem 0; display: flex; flex-direction: column; gap: 0.5rem; }
.study-detail__row { display: flex; align-items: center; gap: 0.5rem; }
.study-detail__section { margin-top: 1.5rem; }
.study-detail__section h3 { font-size: 1.15rem; font-weight: 700; margin-bottom: 0.5rem; }
.study-detail__form { border: 3px solid var(--border); padding: 0.75rem; margin: 0.5rem 0; background: var(--bg); display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; }
.item-list { display: flex; flex-direction: column; gap: 0.5rem; }
.item-list__item { display: flex; align-items: center; gap: 0.5rem; padding: 0.4rem; border-bottom: 2px solid var(--border); font-size: 1.1rem; font-weight: 600; }
.item-list__item:last-child { border-bottom: none; }
.item-list__title { flex: 1; }
.item-list__date { font-size: 1rem; font-weight: 600; color: var(--ochre); }
</style>
