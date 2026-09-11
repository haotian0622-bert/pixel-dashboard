<template>
  <div v-if="visible" class="pixel-dialog-overlay">
    <div class="pixel-dialog">
      <div class="pixel-window__titlebar">
        <span class="pixel-window__titlebar-icon">{{ icon }}</span>
        <span class="pixel-window__titlebar-title">{{ title }}</span>
      </div>
      <div class="pixel-dialog__body">
        <slot />
      </div>
      <div class="pixel-dialog__footer">
        <button class="pixel-btn pixel-btn--confirm" @click="$emit('confirm')">
          {{ confirmText }}
        </button>
        <button class="pixel-btn pixel-btn--cancel" @click="$emit('cancel')">
          {{ cancelText }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  visible: { type: Boolean, default: false },
  title: { type: String, default: '确认' },
  icon: { type: String, default: '!' },
  confirmText: { type: String, default: '确认' },
  cancelText: { type: String, default: '取消' }
})
defineEmits(['confirm', 'cancel'])
</script>

<style scoped>
.pixel-dialog-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.pixel-dialog {
  min-width: 300px;
  max-width: 500px;
  border: 4px double var(--border);
  background: var(--panel);
  box-shadow: 6px 6px 0 var(--shadow);
}
.pixel-dialog__body {
  padding: 1.5rem;
  font-size: 0.9rem;
}
.pixel-dialog__footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 0 1.5rem 1.5rem;
}
</style>
