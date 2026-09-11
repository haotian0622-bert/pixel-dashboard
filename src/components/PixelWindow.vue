<template>
  <div class="pixel-window">
    <div class="pixel-window__titlebar">
      <span class="pixel-window__titlebar-icon">{{ icon }}</span>
      <span class="pixel-window__titlebar-title">{{ title }}</span>
    </div>
    <div class="pixel-window__body pixel-scroll" style="overflow: auto">
      <slot />
    </div>
  </div>
</template>

<script setup>
defineProps({
  title: { type: String, default: '' },
  icon: { type: String, default: '◆' }
})
</script>

<style scoped>
.pixel-window {
  border: 4px double var(--border);
  background: var(--panel);
  box-shadow: 4px 4px 0 var(--shadow);
}
.pixel-window__titlebar {
  display: flex;
  align-items: center;
  padding: 0.4rem 0.75rem;
  background: var(--text);
  color: var(--bg);
  font-size: 0.85rem;
}
.pixel-window__titlebar-icon {
  margin-right: 0.5rem;
}
.pixel-window__titlebar-title {
  flex: 1;
}
.pixel-window__body {
  padding: 1rem;
  max-height: 80vh;
}
</style>
