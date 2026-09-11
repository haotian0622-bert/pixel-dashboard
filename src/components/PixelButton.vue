<template>
  <button
    class="pixel-btn"
    :class="{
      'pixel-btn--confirm': type === 'confirm',
      'pixel-btn--cancel': type === 'cancel'
    }"
    @click="$emit('click', $event)"
    :disabled="disabled"
  >
    {{ label }}
  </button>
</template>

<script setup>
defineProps({
  label: { type: String, default: '按钮' },
  type: { type: String, default: 'plain' }, // plain | confirm | cancel
  disabled: { type: Boolean, default: false }
})
defineEmits(['click'])
</script>

<style scoped>
.pixel-btn {
  display: inline-block;
  padding: 0.4rem 1rem;
  border: 3px solid var(--border);
  background: var(--panel);
  color: var(--text);
  font-family: inherit;
  font-size: 0.85rem;
  cursor: pointer;
  box-shadow: 2px 2px 0 var(--shadow);
  transition: transform 0.05s, box-shadow 0.05s;
}
.pixel-btn:active {
  transform: translate(2px, 2px);
  box-shadow: none;
}
.pixel-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.pixel-btn--confirm {
  background: var(--olive);
  color: var(--bg);
}
.pixel-btn--cancel {
  background: var(--c-company);
  color: var(--bg);
}
</style>
