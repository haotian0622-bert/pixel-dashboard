<template>
  <div class="settings">
    <PixelWindow title="数据与设置" icon="⚙">
      <!-- 主题切换 -->
      <div class="settings__section">
        <h3>主题</h3>
        <div class="settings__theme">
          <button
            v-for="opt in themeOptions"
            :key="opt.value"
            class="pixel-btn"
            :class="{ 'pixel-btn--confirm': themeStore.mode === opt.value }"
            @click="themeStore.setMode(opt.value)"
          >{{ opt.label }}</button>
        </div>
      </div>

      <!-- 手动保存 -->
      <div class="settings__section">
        <h3>手动保存</h3>
        <p class="settings__tip">
          日常操作已自动写入浏览器数据库；点击下方按钮可立即把全部数据导出为一份 JSON 备份，保存到电脑磁盘。
        </p>
        <button
          class="pixel-btn pixel-btn--confirm settings__save-btn"
          :disabled="saving"
          @click="doManualSave"
        >{{ saving ? '保存中…' : '立即保存（导出备份到电脑）' }}</button>
        <p v-if="saveMsg" class="settings__save-msg">✔ {{ saveMsg }}</p>
        <p v-if="lastBackup" class="settings__last-backup">
          上次保存：<strong>{{ lastBackup.fileName }}</strong>（{{ lastBackup.time }}）
        </p>
        <p v-else class="settings__last-backup settings__last-backup--empty">尚未手动保存过</p>
      </div>

      <!-- 保存地址 -->
      <div class="settings__section">
        <h3>保存地址</h3>
        <ul class="settings__storage">
          <li>
            <span class="settings__storage-label">自动保存（数据库）：</span>
            浏览器 IndexedDB「{{ dbName }}」v{{ dbVersion }}，来源 {{ origin }}
          </li>
          <li>
            <span class="settings__storage-label">手动备份文件：</span>
            浏览器默认下载文件夹（{{ downloadDir }}）
          </li>
          <li>
            <span class="settings__storage-label">当前数据量：</span>
            共 {{ recordCount }} 条记录
          </li>
        </ul>
      </div>

      <!-- 数据导出导入 -->
      <div class="settings__section">
        <h3>数据管理</h3>
        <div class="settings__data">
          <button class="pixel-btn pixel-btn--confirm" @click="doExport">导出数据（JSON）</button>
          <label class="pixel-btn">
            导入数据
            <input type="file" accept=".json" @change="doImport" style="display: none;" />
          </label>
          <button class="pixel-btn pixel-btn--cancel" @click="showClearDialog = true">清空所有数据</button>
        </div>
      </div>
    </PixelWindow>

    <!-- 清空确认 -->
    <PixelDialog
      :visible="showClearDialog"
      title="确认清空"
      icon="!"
      confirmText="确认清空"
      cancelText="取消"
      @confirm="doClear"
      @cancel="showClearDialog = false"
    >
      <p>这将删除所有数据，且不可恢复。确定继续吗？</p>
    </PixelDialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import PixelWindow from '@/components/PixelWindow.vue'
import PixelDialog from '@/components/PixelDialog.vue'
import { useThemeStore } from '@/stores/theme'
import { exportAll, importAll, clearAll } from '@/db/backup'
import { DB_NAME, DB_VERSION } from '@/db/init'
import { getAll } from '@/db/dao'
import { STORES } from '@/utils/constants'

const themeStore = useThemeStore()
const showClearDialog = ref(false)

// 手动保存（导出备份）
const BACKUP_KEY = 'pixel-dashboard:last-backup'
const saving = ref(false)
const saveMsg = ref('')
const lastBackup = ref(null)
const recordCount = ref(0)

const dbName = DB_NAME
const dbVersion = DB_VERSION
const origin = typeof window !== 'undefined' ? window.location.origin : ''
const isWindows = typeof navigator !== 'undefined' && /windows/i.test(navigator.userAgent)
const downloadDir = isWindows
  ? 'C:\\Users\\<你的用户名>\\Downloads'
  : '系统「下载」文件夹'

function loadLastBackup() {
  try {
    lastBackup.value = JSON.parse(localStorage.getItem(BACKUP_KEY) || 'null')
  } catch {
    lastBackup.value = null
  }
}

async function refreshCount() {
  let n = 0
  for (const s of STORES) {
    try {
      n += (await getAll(s)).length
    } catch {
      // 忽略未初始化的 store
    }
  }
  recordCount.value = n
}

async function downloadBackup() {
  const data = await exportAll()
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const d = new Date()
  const dateStr = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
  a.href = url
  a.download = `pixel-dashboard-${dateStr}.json`
  a.click()
  URL.revokeObjectURL(url)
  return `pixel-dashboard-${dateStr}.json`
}

async function doManualSave() {
  saving.value = true
  try {
    const fileName = await downloadBackup()
    const info = { fileName, time: new Date().toLocaleString() }
    localStorage.setItem(BACKUP_KEY, JSON.stringify(info))
    lastBackup.value = info
    saveMsg.value = `保存成功！备份文件「${fileName}」已存入下载文件夹`
    await refreshCount()
  } finally {
    saving.value = false
  }
}

const themeOptions = [
  { value: 'light', label: '浅色' },
  { value: 'dark', label: '深色' },
  { value: 'system', label: '跟随系统' }
]

async function doExport() {
  await downloadBackup()
}

async function doImport(event) {
  const file = event.target.files[0]
  if (!file) return
  const text = await file.text()
  const data = JSON.parse(text)
  await importAll(data)
  alert('导入成功，页面将刷新')
  window.location.reload()
}

async function doClear() {
  showClearDialog.value = false
  await clearAll()
  alert('已清空所有数据，页面将刷新')
  window.location.reload()
}

onMounted(() => {
  loadLastBackup()
  refreshCount()
})
</script>

<style scoped>
.settings { max-width: 600px; margin: 0 auto; }
.settings__section { margin-bottom: 1.5rem; }
.settings__section h3 { font-size: 1.15rem; font-weight: 700; margin-bottom: 0.5rem; }
.settings__theme { display: flex; gap: 0.5rem; }
.settings__data { display: flex; flex-direction: column; gap: 0.5rem; align-items: flex-start; }
.settings__tip { font-size: 1rem; font-weight: 600; line-height: 1.6; margin-bottom: 0.6rem; }
.settings__save-btn { font-size: 1.1rem; font-weight: 700; padding: 0.6rem 1.2rem; }
.settings__save-msg { margin-top: 0.6rem; font-size: 1rem; font-weight: 700; color: var(--olive); }
.settings__last-backup { margin-top: 0.4rem; font-size: 0.95rem; font-weight: 600; }
.settings__last-backup--empty { color: var(--ochre); }
.settings__storage { display: flex; flex-direction: column; gap: 0.4rem; border: 3px solid var(--border); background: var(--bg); padding: 0.7rem; }
.settings__storage li { font-size: 0.95rem; font-weight: 600; line-height: 1.5; word-break: break-all; }
.settings__storage-label { font-weight: 700; color: var(--ochre); }
@media (max-width: 768px) {
  .settings__save-btn { width: 100%; }
}
</style>
