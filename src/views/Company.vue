<template>
  <div class="company">
    <PixelWindow title="公司事情安排" icon="▣">
      <div class="company__header">
        <div class="company__filters">
          <select class="pixel-select" v-model="filterCategory">
            <option value="">全部分类</option>
            <option v-for="(label, key) in categoryLabels" :key="key" :value="key">{{ label }}</option>
          </select>
          <select class="pixel-select" v-model="filterStatus">
            <option value="">全部状态</option>
            <option v-for="(label, key) in statusLabels" :key="key" :value="key">{{ label }}</option>
          </select>
        </div>
        <button class="pixel-btn" @click="showForm = !showForm">+ 新增事项</button>
      </div>

      <div v-if="showForm" class="company__form">
        <PixelInput v-model="form.title" placeholder="事项标题" />
        <div class="company__row">
          <label>分类:</label>
          <select class="pixel-select" v-model="form.category">
            <option v-for="(label, key) in categoryLabels" :key="key" :value="key">{{ label }}</option>
          </select>
          <label>优先级:</label>
          <select class="pixel-select" v-model="form.priority">
            <option v-for="(label, key) in priorityLabels" :key="key" :value="key">{{ label }}</option>
          </select>
          <label>截止:</label>
          <input type="date" class="pixel-input" v-model="form.deadline" />
          <label>状态:</label>
          <select class="pixel-select" v-model="form.status">
            <option v-for="(label, key) in statusLabels" :key="key" :value="key">{{ label }}</option>
          </select>
        </div>
        <div class="company__actions">
          <button class="pixel-btn pixel-btn--confirm" @click="saveItem">保存</button>
          <button class="pixel-btn pixel-btn--cancel" @click="showForm = false">取消</button>
        </div>
      </div>

      <PixelEmpty v-if="filteredList.length === 0" text="暂无事项" />
      <ul v-else class="item-list">
        <li v-for="item in filteredList" :key="item.id" class="company__item">
          <div class="company__item-main" @click="toggleNotes(item)">
            <span class="company__item-title">{{ item.title }}</span>
            <span class="company__item-cat">{{ categoryLabels[item.category] }}</span>
            <span class="company__item-priority">{{ prioritySymbols[item.priority] }}</span>
            <span v-if="item.deadline" class="company__item-deadline">{{ item.deadline }}</span>
            <span class="company__item-status" :style="{ color: statusColor(item.status) }">{{ statusLabels[item.status] }}</span>
          </div>
          <div class="company__item-actions">
            <button class="pixel-btn" @click="editItem(item)">改</button>
            <button class="pixel-btn pixel-btn--cancel" @click="deleteItem(item)">删</button>
          </div>
          <div v-if="expandedId === item.id" class="company__notes">
            <h4>跟进备注</h4>
            <ul v-if="notes[item.id]?.length" class="note-list">
              <li v-for="n in notes[item.id]" :key="n.id" class="note-list__item">
                <span class="note-list__time">{{ n.timestamp }}</span>
                <span class="note-list__content">{{ n.content }}</span>
              </li>
            </ul>
            <div class="note-input">
              <input class="pixel-input" v-model="noteText[item.id]" placeholder="输入跟进备注..." @keyup.enter="addNote(item)" />
              <button class="pixel-btn pixel-btn--confirm" @click="addNote(item)">添加</button>
            </div>
          </div>
        </li>
      </ul>
    </PixelWindow>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, reactive } from 'vue'
import PixelWindow from '@/components/PixelWindow.vue'
import PixelInput from '@/components/PixelInput.vue'
import PixelEmpty from '@/components/PixelEmpty.vue'
import { getAll, save, remove, query } from '@/db/dao'
import { COMPANY_STATUS, COMPANY_STATUS_LABELS, COMPANY_CATEGORY, COMPANY_CATEGORY_LABELS, PRIORITY_LABELS, PRIORITY_SYMBOLS } from '@/utils/constants'
import { today } from '@/utils/date'

const list = ref([])
const showForm = ref(false)
const editingId = ref(null)
const filterCategory = ref('')
const filterStatus = ref('')
const expandedId = ref(null)
const notes = reactive({})
const noteText = reactive({})

const form = ref({ title: '', category: COMPANY_CATEGORY.DAILY, priority: 'medium', deadline: '', status: COMPANY_STATUS.TODO })
const statusLabels = COMPANY_STATUS_LABELS
const categoryLabels = COMPANY_CATEGORY_LABELS
const priorityLabels = PRIORITY_LABELS
const prioritySymbols = PRIORITY_SYMBOLS

const filteredList = computed(() => {
  return list.value.filter(i => {
    if (filterCategory.value && i.category !== filterCategory.value) return false
    if (filterStatus.value && i.status !== filterStatus.value) return false
    return true
  })
})

function statusColor(s) {
  return { todo: 'var(--ochre)', active: 'var(--olive)', done: 'var(--accent)', shelved: 'var(--c-dev)' }[s] || 'var(--text)'
}

async function loadList() {
  list.value = await getAll('companyItems')
}

async function toggleNotes(item) {
  if (expandedId.value === item.id) {
    expandedId.value = null
  } else {
    expandedId.value = item.id
    if (!notes[item.id]) {
      const n = await query('companyNotes', 'itemId', item.id)
      notes[item.id] = n.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''))
    }
  }
}

async function saveItem() {
  if (!form.value.title.trim()) return
  if (editingId.value) {
    await save('companyItems', { ...form.value, id: editingId.value })
    editingId.value = null
  } else {
    await save('companyItems', { ...form.value })
  }
  form.value = { title: '', category: COMPANY_CATEGORY.DAILY, priority: 'medium', deadline: '', status: COMPANY_STATUS.TODO }
  showForm.value = false
  await loadList()
}

function editItem(item) {
  editingId.value = item.id
  form.value = { ...item }
  showForm.value = true
}

async function deleteItem(item) {
  await remove('companyItems', item.id)
  await loadList()
}

async function addNote(item) {
  const text = (noteText[item.id] || '').trim()
  if (!text) return
  await save('companyNotes', { itemId: item.id, content: text, timestamp: new Date().toLocaleString() })
  noteText[item.id] = ''
  const n = await query('companyNotes', 'itemId', item.id)
  notes[item.id] = n.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''))
}

onMounted(async () => { await loadList() })
</script>

<style scoped>
.company { max-width: 800px; margin: 0 auto; }
.company__header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
.company__filters { display: flex; gap: 0.5rem; }
.company__form { border: 3px solid var(--border); padding: 0.75rem; margin-bottom: 1rem; background: var(--bg); display: flex; flex-direction: column; gap: 0.5rem; }
.company__row { display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; flex-wrap: wrap; }
.company__actions { display: flex; gap: 0.5rem; }
.company__item { border-bottom: 2px solid var(--border); padding: 0.5rem; }
.company__item:last-child { border-bottom: none; }
.company__item-main { display: flex; align-items: center; gap: 0.5rem; cursor: pointer; font-size: 0.85rem; }
.company__item-title { flex: 1; }
.company__item-cat { font-size: 0.7rem; color: var(--ochre); }
.company__item-priority { font-size: 0.75rem; color: var(--accent); }
.company__item-deadline { font-size: 0.7rem; color: var(--ochre); }
.company__item-status { font-size: 0.75rem; font-weight: bold; }
.company__item-actions { display: flex; gap: 0.25rem; }
.company__item-actions .pixel-btn { padding: 0.2rem 0.5rem; font-size: 0.7rem; }
.company__notes { margin-top: 0.5rem; padding: 0.5rem; border: 2px solid var(--border); background: var(--bg); }
.company__notes h4 { font-size: 0.8rem; margin-bottom: 0.5rem; }
.note-list { display: flex; flex-direction: column; gap: 0.25rem; margin-bottom: 0.5rem; }
.note-list__item { font-size: 0.75rem; display: flex; gap: 0.5rem; }
.note-list__time { color: var(--ochre); flex-shrink: 0; }
.note-input { display: flex; gap: 0.5rem; }
.note-input .pixel-input { flex: 1; }
</style>
