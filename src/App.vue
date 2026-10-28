<template>
  <div class="app-container">
    <PixelSidebar />
    <main class="main-content pixel-scroll">
      <router-view />
    </main>
    <DailyTip />
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import PixelSidebar from '@/components/PixelSidebar.vue'
import DailyTip from '@/components/DailyTip.vue'
import { useThemeStore } from '@/stores/theme'

const themeStore = useThemeStore()

onMounted(() => {
  themeStore.init()
})
</script>

<style scoped>
.app-container {
  display: flex;
  min-height: 100vh;
}
.main-content {
  flex: 1;
  padding: 1.5rem;
  overflow-y: auto;
  max-height: 100vh;
}
</style>
