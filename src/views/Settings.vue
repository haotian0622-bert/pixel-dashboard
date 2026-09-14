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
import { ref } from 'vue'
import PixelWindow from '@/components/PixelWindow.vue'
import PixelDialog from '@/components/PixelDialog.vue'
import { useThemeStore } from '@/stores/theme'
import { exportAll, importAll, clearAll } from '@/db/backup'

const themeStore = useThemeStore()
const showClearDialog = ref(false)

const themeOptions = [
  { value: 'light', label: '浅色' },
  { value: 'dark', label: '深色' },
  { value: 'system', label: '跟随系统' }
]

async function doExport() {
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
</script>

<style scoped>
.settings { max-width: 600px; margin: 0 auto; }
.settings__section { margin-bottom: 1.5rem; }
.settings__section h3 { font-size: 1.15rem; font-weight: 700; margin-bottom: 0.5rem; }
.settings__theme { display: flex; gap: 0.5rem; }
.settings__data { display: flex; flex-direction: column; gap: 0.5rem; align-items: flex-start; }
</style>
