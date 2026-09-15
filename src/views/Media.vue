<template>
  <div class="media">
    <PixelWindow title="自媒体" icon="✦">
      <div class="media__tabs">
        <button
          class="pixel-btn media__stats-toggle"
          :class="{ 'media__stats-toggle--active': showStatsPanel }"
          @click="showStatsPanel = !showStatsPanel"
        >📊 数据看板</button>
        <button class="pixel-btn plan__add-btn" @click="showForm = !showForm">+ 新增记录</button>
      </div>

      <!-- 发布后数据统计看板 -->
      <div v-if="showStatsPanel" class="media__stats-panel">
        <div class="media__metrics">
          <button
            v-for="(label, key) in metricLabels"
            :key="key"
            class="pixel-btn media__metric-btn"
            :class="{ 'media__metric-btn--active': metric === key }"
            @click="metric = key"
          >{{ label }}</button>
        </div>
        <div class="media__charts">
          <div class="media__chart media__chart--line">
            <div class="media__chart-title">数据趋势 · {{ metricLabels[metric] }}</div>
            <PixelChart type="line" :series="lineSeries" />
          </div>
          <div class="media__chart media__chart--bar">
            <div class="media__chart-title">各视频最新对比 · {{ metricLabels[metric] }}</div>
            <PixelChart type="bar" :series="barSeries" />
          </div>
        </div>
      </div>

      <!-- 新增表单 -->
      <div v-if="showForm" class="media__form">
        <PixelInput v-model="form.title" placeholder="标题" />
        <div class="media__row">
          <label>平台:</label>
          <PixelInput v-model="form.platform" placeholder="如 b站/小红书" />
          <label>栏目:</label>
          <select class="pixel-select" v-model="form.category">
            <option v-for="(label, key) in categoryLabels" :key="key" :value="key">{{ label }}</option>
          </select>
        </div>
        <div class="media__row">
          <label>耗时(h):</label>
          <input type="number" class="pixel-input" v-model.number="form.timeCost" min="0" step="0.5" style="max-width: 90px" placeholder="0" />
          <label>时段:</label>
          <PixelSelect v-model="form.timeSlot" :options="timeSlotOptions" />
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
        <PixelInput v-model="form.note" type="textarea" placeholder="备注/进展/调整说明" :rows="3" />
        <div class="media__actions">
          <button class="pixel-btn pixel-btn--confirm" @click="saveIdea">保存</button>
          <button class="pixel-btn pixel-btn--cancel" @click="showForm = false">取消</button>
        </div>
      </div>

      <!-- 4 栏目拖拽区 -->
      <div class="media__board">
        <div
          v-for="cat in categories"
          :key="cat.key"
          class="media__column"
          :data-cat="cat.key"
          @dragover.prevent="onDragOver"
          @dragleave="onDragLeave"
          @drop="onDrop(cat.key)"
        >
          <div class="media__column-header" :style="{ background: `var(${cat.color})` }">
            {{ cat.label }}
            <span class="media__column-count">{{ itemsByCategory[cat.key].length }}</span>
          </div>
          <ul class="media__column-list">
            <li
              v-for="item in itemsByCategory[cat.key]"
              :key="item.id"
              class="media-card"
              :class="{ 'media-card--dragging': dragId === item.id }"
              draggable="true"
              @dragstart="onDragStart($event, item)"
              @dragend="onDragEnd"
            >
              <div class="media-card__title">{{ item.title }}</div>
              <div v-if="item.platform" class="media-card__meta">平台: {{ item.platform }}</div>
              <div v-if="item.note" class="media-card__note">{{ item.note }}</div>
              <div class="media-card__footer">
                <span v-if="item.timeCost" class="media-card__time">⏱{{ item.timeCost }}h</span>
                <span v-if="item.timeSlot && item.timeSlot !== 'any'" class="media-card__slot">{{ timeSlotSymbols[item.timeSlot] }}</span>
                <span v-if="item.publishDate" class="media-card__date">{{ item.publishDate }}</span>
                <span v-if="item.link" class="media-card__link" @click="openLink(item.link)">链接</span>
                <span v-if="latestOf(item)" class="media-card__stats">
                  ▶{{ formatStat(latestOf(item).views) }} ♥{{ formatStat(latestOf(item).likes) }}
                </span>
              </div>
              <div class="media-card__actions">
                <button class="pixel-btn" @click="toggleStatForm(item)">数据</button>
                <button class="pixel-btn" @click="editItem(item)">改</button>
                <button class="pixel-btn pixel-btn--cancel" @click="deleteItem(item)">删</button>
              </div>
              <!-- 发布后数据录入 -->
              <div v-if="statEditingId === item.id" class="media-card__stat-form" @click.stop>
                <div class="media-card__stat-row">
                  <label>日期:</label>
                  <input type="date" class="pixel-input" v-model="statForm.date" />
                </div>
                <div class="media-card__stat-row">
                  <label>播放:</label>
                  <input type="number" min="0" class="pixel-input" v-model.number="statForm.views" placeholder="播放量" />
                  <label>点赞:</label>
                  <input type="number" min="0" class="pixel-input" v-model.number="statForm.likes" placeholder="点赞" />
                </div>
                <div class="media-card__stat-row">
                  <label>评论:</label>
                  <input type="number" min="0" class="pixel-input" v-model.number="statForm.comments" placeholder="评论" />
                  <label>转发:</label>
                  <input type="number" min="0" class="pixel-input" v-model.number="statForm.shares" placeholder="转发" />
                </div>
                <div class="media-card__stat-actions">
                  <button class="pixel-btn pixel-btn--confirm" @click="saveStats(item)">保存数据</button>
                  <button class="pixel-btn pixel-btn--cancel" @click="statEditingId = null">取消</button>
                </div>
              </div>
            </li>
            <li v-if="itemsByCategory[cat.key].length === 0" class="media-card__empty">
              拖拽记录到此栏目
            </li>
          </ul>
        </div>
      </div>
    </PixelWindow>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import PixelWindow from '@/components/PixelWindow.vue'
import PixelInput from '@/components/PixelInput.vue'
import PixelSelect from '@/components/PixelSelect.vue'
import PixelChart from '@/components/PixelChart.vue'
import { getAll, save, remove } from '@/db/dao'
import {
  MEDIA_STATUS,
  MEDIA_STATUS_LABELS,
  MEDIA_CATEGORY,
  MEDIA_CATEGORY_LABELS,
  MEDIA_METRIC,
  MEDIA_METRIC_LABELS,
  TIME_SLOT,
  TIME_SLOT_LABELS,
  TIME_SLOT_SYMBOLS
} from '@/utils/constants'
import {
  latestStats,
  upsertStats,
  buildBarData,
  buildLineSeries,
  formatStat
} from '@/utils/stats'
import { today } from '@/utils/date'

const list = ref([])
const showForm = ref(false)
const editingId = ref(null)
const dragId = ref(null)
const dragOverCat = ref(null)

// 数据看板
const showStatsPanel = ref(false)
const metric = ref(MEDIA_METRIC.VIEWS)
const metricLabels = MEDIA_METRIC_LABELS
const statEditingId = ref(null)
const statForm = ref({ date: today(), views: 0, likes: 0, comments: 0, shares: 0 })

const form = ref({
  title: '',
  platform: '',
  category: MEDIA_CATEGORY.IDEA,
  status: MEDIA_STATUS.IDEA,
  publishDate: '',
  link: '',
  note: '',
  timeCost: 0,
  timeSlot: TIME_SLOT.ANY
})

const statusLabels = MEDIA_STATUS_LABELS
const categoryLabels = MEDIA_CATEGORY_LABELS
const timeSlotOptions = [
  { value: TIME_SLOT.DAY, label: TIME_SLOT_LABELS[TIME_SLOT.DAY] },
  { value: TIME_SLOT.NIGHT, label: TIME_SLOT_LABELS[TIME_SLOT.NIGHT] },
  { value: TIME_SLOT.ANY, label: TIME_SLOT_LABELS[TIME_SLOT.ANY] }
]
const timeSlotSymbols = TIME_SLOT_SYMBOLS

const categories = [
  { key: MEDIA_CATEGORY.IDEA, label: MEDIA_CATEGORY_LABELS.idea, color: '--c-media' },
  { key: MEDIA_CATEGORY.PUBLISHED, label: MEDIA_CATEGORY_LABELS.published, color: '--olive' },
  { key: MEDIA_CATEGORY.PROGRESS, label: MEDIA_CATEGORY_LABELS.progress, color: '--c-study' },
  { key: MEDIA_CATEGORY.ADJUST, label: MEDIA_CATEGORY_LABELS.adjust, color: '--c-company' }
]

const itemsByCategory = computed(() => {
  const out = {}
  for (const c of categories) out[c.key] = []
  for (const item of list.value) {
    const k = item.category || MEDIA_CATEGORY.IDEA
    if (!out[k]) out[k] = []
    out[k].push(item)
  }
  return out
})

// 只有带数据快照的记录才进图表
const chartItems = computed(() =>
  list.value.filter(i => Array.isArray(i.stats) && i.stats.length > 0)
)
const lineSeries = computed(() => buildLineSeries(chartItems.value, metric.value))
const barSeries = computed(() => [
  { name: MEDIA_METRIC_LABELS[metric.value], points: buildBarData(chartItems.value, metric.value) }
])

async function loadList() {
  list.value = await getAll('media')
}

function latestOf(item) {
  return latestStats(item)
}

function toggleStatForm(item) {
  if (statEditingId.value === item.id) {
    statEditingId.value = null
    return
  }
  statEditingId.value = item.id
  const latest = latestStats(item)
  statForm.value = latest
    ? { date: today(), views: latest.views, likes: latest.likes, comments: latest.comments, shares: latest.shares }
    : { date: today(), views: 0, likes: 0, comments: 0, shares: 0 }
}

async function saveStats(item) {
  if (!statForm.value.date) statForm.value.date = today()
  const stats = upsertStats(item.stats, statForm.value)
  await save('media', { ...item, stats })
  statEditingId.value = null
  await loadList()
}

function resetForm() {
  form.value = {
    title: '', platform: '', category: MEDIA_CATEGORY.IDEA,
    status: MEDIA_STATUS.IDEA, publishDate: '', link: '', note: '',
    timeCost: 0, timeSlot: TIME_SLOT.ANY
  }
}

async function saveIdea() {
  if (!form.value.title.trim()) return
  const payload = {
    ...form.value,
    category: form.value.category || MEDIA_CATEGORY.IDEA,
    timeCost: Number(form.value.timeCost) || 0,
    timeSlot: form.value.timeSlot || TIME_SLOT.ANY
  }
  if (editingId.value) {
    await save('media', { ...payload, id: editingId.value })
    editingId.value = null
  } else {
    await save('media', payload)
  }
  resetForm()
  showForm.value = false
  await loadList()
}

function editItem(item) {
  editingId.value = item.id
  form.value = { ...item, category: item.category || MEDIA_CATEGORY.IDEA }
  showForm.value = true
}

async function deleteItem(item) {
  await remove('media', item.id)
  await loadList()
}

// 拖拽：把记录移到新栏目
function onDragStart(e, item) {
  dragId.value = item.id
  e.dataTransfer.effectAllowed = 'move'
  e.dataTransfer.setData('text/plain', String(item.id))
}

function onDragOver(e) {
  e.preventDefault()
  e.dataTransfer.dropEffect = 'move'
  dragOverCat.value = e.currentTarget.dataset.cat
}

function onDragLeave(e) {
  if (dragOverCat.value === e.currentTarget.dataset.cat) {
    dragOverCat.value = null
  }
}

async function onDrop(targetCat) {
  const id = dragId.value
  dragId.value = null
  dragOverCat.value = null
  if (!id) return
  const item = list.value.find(i => i.id === id)
  if (!item || item.category === targetCat) return
  await save('media', { ...item, category: targetCat })
  await loadList()
}

function onDragEnd() {
  dragId.value = null
  dragOverCat.value = null
}

function openLink(url) {
  if (url) window.open(url, '_blank')
}

onMounted(async () => {
  await loadList()
})
</script>

<style scoped>
.media { max-width: 980px; margin: 0 auto; }
.media__tabs { display: flex; gap: 0.5rem; align-items: center; margin-bottom: 1rem; }
.plan__add-btn { margin-left: auto; }
.media__form { border: 3px solid var(--border); padding: 0.75rem; margin-bottom: 1rem; background: var(--bg); display: flex; flex-direction: column; gap: 0.5rem; }
.media__row { display: flex; align-items: center; gap: 0.5rem; font-size: 1.1rem; font-weight: 700; flex-wrap: wrap; }
.media__actions { display: flex; gap: 0.5rem; }

.media__board {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.75rem;
}
@media (max-width: 900px) {
  .media__board { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 600px) {
  .media__board { grid-template-columns: 1fr; }
}
.media__column {
  display: flex;
  flex-direction: column;
  min-height: 200px;
  border: 3px solid var(--border);
  background: var(--panel);
  transition: background 0.1s, border-color 0.1s;
}
.media__column-header {
  padding: 0.5rem 0.75rem;
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--bg);
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.media__column-count {
  font-size: 0.85rem;
  background: rgba(0, 0, 0, 0.25);
  padding: 0.1rem 0.5rem;
  border-radius: 2px;
}
.media__column-list {
  flex: 1;
  padding: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  overflow-y: auto;
  min-height: 100px;
}

.media-card {
  list-style: none;
  padding: 0.5rem;
  border: 2px solid var(--border);
  background: var(--bg);
  cursor: grab;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.media-card:active { cursor: grabbing; }
.media-card--dragging { opacity: 0.4; }
.media-card__title { font-size: 1.05rem; font-weight: 700; line-height: 1.3; }
.media-card__meta { font-size: 0.95rem; font-weight: 700; color: var(--ochre); }
.media-card__note {
  font-size: 0.95rem; font-weight: 700;
  white-space: pre-wrap; word-break: break-all;
  padding: 0.25rem;
  background: var(--panel);
  border-left: 3px solid var(--border);
}
.media-card__footer {
  display: flex; gap: 0.5rem; align-items: center;
  font-size: 0.95rem; font-weight: 700;
  flex-wrap: wrap;
  margin-top: 0.25rem;
}
.media-card__time { color: var(--olive); }
.media-card__slot { color: var(--c-dev); font-size: 1.05rem; }
.media-card__date { color: var(--ochre); }
.media-card__link { color: var(--accent); cursor: pointer; text-decoration: underline; }
.media-card__actions {
  display: flex; gap: 0.25rem;
  margin-top: 0.25rem;
}
.media-card__actions .pixel-btn { padding: 0.2rem 0.5rem; font-size: 0.95rem; }
.media-card__empty {
  list-style: none;
  text-align: center;
  color: var(--ochre);
  opacity: 0.5;
  font-size: 0.95rem;
  font-weight: 700;
  padding: 1rem 0.5rem;
  border: 2px dashed var(--border);
}

/* ===== 数据看板 ===== */
.media__stats-toggle { font-weight: 700; }
.media__stats-toggle--active {
  background: var(--accent);
  color: var(--bg);
}
.media__stats-panel {
  border: 3px solid var(--border);
  background: var(--panel);
  padding: 0.75rem;
  margin-bottom: 1rem;
  box-shadow: 3px 3px 0 var(--shadow);
}
.media__metrics {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-bottom: 0.75rem;
}
.media__metric-btn {
  font-weight: 700;
  font-size: 1rem;
  padding: 0.35rem 0.9rem;
}
.media__metric-btn--active {
  background: var(--accent);
  color: var(--bg);
  border-color: var(--text);
}
.media__charts {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}
.media__chart-title {
  font-size: 1.05rem;
  font-weight: 700;
  margin-bottom: 0.4rem;
  color: var(--text);
}
.media-card__stats {
  color: var(--c-media);
  font-size: 0.95rem;
}
.media-card__stat-form {
  margin-top: 0.4rem;
  padding: 0.5rem;
  border: 2px solid var(--border);
  background: var(--panel);
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  cursor: default;
}
.media-card__stat-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
  font-size: 0.95rem;
  font-weight: 700;
}
.media-card__stat-row .pixel-input { max-width: 110px; }
.media-card__stat-actions { display: flex; gap: 0.4rem; }
.media-card__stat-actions .pixel-btn { padding: 0.2rem 0.6rem; font-size: 0.95rem; }

@media (max-width: 900px) {
  .media__charts { grid-template-columns: 1fr; }
}
</style>
