<template>
  <div class="media">
    <PixelWindow title="自媒体" icon="✦">
      <div class="media__tabs">
        <label>筛选:</label>
        <select class="pixel-select" v-model="filterStatus">
          <option value="">全部</option>
          <option v-for="(label, key) in statusLabels" :key="key" :value="key">{{ label }}</option>
        </select>
        <button class="pixel-btn plan__add-btn" @click="showForm = !showForm">+ 新增点子</button>
      </div>

      <div v-if="showForm" class="media__form">
        <PixelInput v-model="form.title" placeholder="标题" />
        <div class="media__row">
          <label>平台:</label>
          <PixelInput v-model="form.platform" placeholder="如 b站/小红书" />
        </div>
        <div class="media__row">
          <label>耗时(h):</label>
          <input type="number" class="pixel-input" v-model.number="form.timeCost" min="0" step="0.5" style="max-width: 90px" placeholder="0" />
        </div>
        <div class="media__row">
          <label>状态:</label>
          <select class="pixel-select" v-model="form.status">
            <option v-for="(label, key) in statusLabels" :key="key" :value="key">{{ label }}</option>
          </select>
          <label>发布日期:</label>
          <input type="date" class="pixel-input" v-model="form.publishDate" />
        </div>
        <PixelInput v-model="form.link" placeholder="发布链接（已发布后填）" />
        <PixelInput v-model="form.note" type="textarea" placeholder="备注" :rows="2" />
        <div class="media__actions">
          <button class="pixel-btn pixel-btn--confirm" @click="saveIdea">保存</button>
          <button class="pixel-btn pixel-btn--cancel" @click="showForm = false">取消</button>
        </div>
      </div>

      <PixelEmpty v-if="filteredList.length === 0" text="暂无内容" />
      <ul v-else class="idea-list">
        <li v-for="item in filteredList" :key="item.id" class="idea-list__item">
          <div class="idea-list__main">
            <span class="idea-list__title">{{ item.title }}</span>
            <span class="idea-list__platform">{{ item.platform }}</span>
            <span class="idea-list__status" :style="{ color: statusColor(item.status) }">
              {{ statusLabels[item.status] }}
            </span>
            <span v-if="item.timeCost" class="idea-list__time-cost">⏱{{ item.timeCost }}h</span>
            <span v-if="item.publishDate" class="idea-list__date">{{ item.publishDate }}</span>
          </div>
          <div class="idea-list__actions">
            <select class="pixel-select idea-list__status-select" :value="item.status" @change="changeStatus(item, $event.target.value)">
              <option v-for="(label, key) in statusLabels" :key="key" :value="key">{{ label }}</option>
            </select>
            <button class="pixel-btn" @click="editItem(item)">改</button>
            <button class="pixel-btn pixel-btn--cancel" @click="deleteItem(item)">删</button>
          </div>
        </li>
      </ul>
    </PixelWindow>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import PixelWindow from '@/components/PixelWindow.vue'
import PixelInput from '@/components/PixelInput.vue'
import PixelEmpty from '@/components/PixelEmpty.vue'
import { getAll, save, remove } from '@/db/dao'
import { MEDIA_STATUS, MEDIA_STATUS_LABELS } from '@/utils/constants'
import { today } from '@/utils/date'

const list = ref([])
const showForm = ref(false)
const editingId = ref(null)
const filterStatus = ref('')

const form = ref({
  title: '',
  platform: '',
  status: MEDIA_STATUS.IDEA,
  publishDate: '',
  link: '',
  note: '',
  timeCost: 0
})

const statusLabels = MEDIA_STATUS_LABELS

const filteredList = computed(() => {
  if (!filterStatus.value) return list.value
  return list.value.filter(i => i.status === filterStatus.value)
})

function statusColor(status) {
  const colors = {
    idea: 'var(--ochre)',
    draft: 'var(--c-dev)',
    scheduled: 'var(--c-media)',
    published: 'var(--olive)'
  }
  return colors[status] || 'var(--text)'
}

async function loadList() {
  list.value = await getAll('media')
}

function resetForm() {
  form.value = {
    title: '', platform: '', status: MEDIA_STATUS.IDEA,
    publishDate: '', link: '', note: '', timeCost: 0
  }
}

async function saveIdea() {
  if (!form.value.title.trim()) return
  if (editingId.value) {
    await save('media', { ...form.value, id: editingId.value, timeCost: Number(form.value.timeCost) || 0 })
    editingId.value = null
  } else {
    await save('media', { ...form.value, timeCost: Number(form.value.timeCost) || 0 })
  }
  resetForm()
  showForm.value = false
  await loadList()
}

function editItem(item) {
  editingId.value = item.id
  form.value = { ...item }
  showForm.value = true
}

async function changeStatus(item, newStatus) {
  await save('media', { ...item, status: newStatus })
  await loadList()
}

async function deleteItem(item) {
  await remove('media', item.id)
  await loadList()
}

onMounted(async () => {
  await loadList()
})
</script>

<style scoped>
.media { max-width: 800px; margin: 0 auto; }
.media__tabs { display: flex; gap: 0.5rem; align-items: center; margin-bottom: 1rem; }
.plan__add-btn { margin-left: auto; }
.media__form { border: 3px solid var(--border); padding: 0.75rem; margin-bottom: 1rem; background: var(--bg); display: flex; flex-direction: column; gap: 0.5rem; }
.media__row { display: flex; align-items: center; gap: 0.5rem; font-size: 1.1rem; font-weight: 600; }
.media__actions { display: flex; gap: 0.5rem; }
.idea-list { display: flex; flex-direction: column; gap: 0.5rem; }
.idea-list__item { display: flex; justify-content: space-between; align-items: center; padding: 0.5rem; border-bottom: 2px solid var(--border); }
.idea-list__item:last-child { border-bottom: none; }
.idea-list__main { display: flex; align-items: center; gap: 0.5rem; flex: 1; }
.idea-list__title { font-size: 1.1rem; font-weight: 600; }
.idea-list__platform { font-size: 1rem; font-weight: 600; color: var(--ochre); }
.idea-list__status { font-size: 1.05rem; font-weight: bold; }
.idea-list__date { font-size: 1rem; font-weight: 600; color: var(--ochre); }
.idea-list__time-cost { font-size: 0.95rem; font-weight: 700; color: var(--olive); white-space: nowrap; }
.idea-list__actions { display: flex; gap: 0.25rem; align-items: center; }
.idea-list__actions .pixel-btn { padding: 0.2rem 0.5rem; font-size: 1rem; font-weight: 600; }
.idea-list__status-select { padding: 0.2rem; font-size: 1rem; font-weight: 600; }
</style>
