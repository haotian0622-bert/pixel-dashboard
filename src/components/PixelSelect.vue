<template>
  <select
    class="pixel-select"
    :value="modelValue"
    @change="$emit('update:modelValue', $event.target.value)"
  >
    <option v-for="opt in options" :key="opt.value" :value="opt.value">
      {{ opt.label }}
    </option>
  </select>
</template>

<script setup>
defineProps({
  modelValue: { type: [String, Number], default: '' },
  options: { type: Array, default: () => [] } // [{ value, label }]
})
defineEmits(['update:modelValue'])
</script>

<style scoped>
.pixel-select {
  padding: 0.4rem 0.6rem;
  border: 3px solid var(--border);
  background: var(--bg);
  color: var(--text);
  font-family: inherit;
  font-size: 0.85rem;
  outline: none;
  cursor: pointer;
}
.pixel-select:focus {
  border-color: var(--accent);
}
</style>
