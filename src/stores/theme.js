import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { initDB } from '@/db/init'
import { get, save } from '@/db/dao'

/**
 * 主题状态管理
 * mode: 'light' | 'dark' | 'system'
 */
export const useThemeStore = defineStore('theme', () => {
  const mode = ref('light')
  const systemDark = ref(false)

  // 监听系统主题变化
  if (typeof window !== 'undefined' && window.matchMedia) {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    systemDark.value = mq.matches
    mq.addEventListener('change', (e) => {
      systemDark.value = e.matches
      applyTheme()
    })
  }

  // 实际生效的主题
  function getEffective() {
    if (mode.value === 'system') {
      return systemDark.value ? 'dark' : 'light'
    }
    return mode.value
  }

  // 应用主题到 DOM
  function applyTheme() {
    const effective = getEffective()
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', effective)
    }
  }

  // 设置模式
  async function setMode(newMode) {
    mode.value = newMode
    applyTheme()
    // 持久化到 meta store
    await initDB()
    await save('meta', { id: 'theme', key: 'theme', value: newMode })
  }

  // 初始化：从 meta store 读取上次设置
  async function init() {
    try {
      await initDB()
      const meta = await get('meta', 'theme')
      if (meta && meta.value) {
        mode.value = meta.value
      }
    } catch (e) {
      // 数据库未就绪时用默认值
    }
    applyTheme()
  }

  return { mode, getEffective, setMode, init, applyTheme }
})
