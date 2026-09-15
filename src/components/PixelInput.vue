<template>
  <input
    v-if="type !== 'textarea'"
    class="pixel-input"
    :value="modelValue"
    :placeholder="placeholder"
    :type="type"
    @input="$emit('update:modelValue', $event.target.value)"
    @blur="$emit('blur', $event)"
  />
  <textarea
    v-else
    class="pixel-input"
    :value="modelValue"
    :placeholder="placeholder"
    :rows="rows"
    @input="$emit('update:modelValue', $event.target.value)"
    @blur="$emit('blur', $event)"
  />
</template>

<script setup>
defineProps({
  modelValue: { type: [String, Number], default: '' },
  placeholder: { type: String, default: '' },
  type: { type: String, default: 'text' },
  rows: { type: Number, default: 3 }
})
defineEmits(['update:modelValue', 'blur'])
</script>

<style scoped>
.pixel-input {
  padding: 0.4rem 0.6rem;
  border: 3px solid var(--border);
  background: var(--bg);
  color: var(--text);
  font-family: inherit;
  font-size: 1rem;
  font-weight: 700;
  outline: none;
  width: 100%;
}
.pixel-input:focus {
  border-color: var(--accent);
}
textarea.pixel-input {
  resize: vertical;
  min-height: 60px;
}
</style>
