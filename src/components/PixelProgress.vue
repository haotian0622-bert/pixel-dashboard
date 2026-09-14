<template>
  <div class="pixel-progress">
    <span
      v-for="i in max"
      :key="i"
      class="pixel-progress__segment"
      :class="{
        'pixel-progress__segment--filled': i <= filledCount,
        'pixel-progress__segment--empty': i > filledCount
      }"
    >
      {{ i <= filledCount ? '▰' : '▱' }}
    </span>
    <span class="pixel-progress__label">{{ percent }}%</span>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  value: { type: Number, default: 0 },
  max: { type: Number, default: 10 }
})

const percent = computed(() => {
  return Math.round(Math.min(100, Math.max(0, props.value)))
})

const filledCount = computed(() => {
  return Math.round((percent.value / 100) * props.max)
})
</script>

<style scoped>
.pixel-progress {
  display: flex;
  align-items: center;
  gap: 2px;
  font-family: 'ArkPixel', 'Courier New', monospace;
  font-weight: 700;
  font-size: 1.5rem;
  letter-spacing: 1px;
}
.pixel-progress__segment--filled {
  color: var(--accent);
}
.pixel-progress__segment--empty {
  color: var(--text);
  opacity: 0.3;
}
.pixel-progress__label {
  margin-left: 0.5rem;
  font-size: 1rem;
  font-weight: 700;
  opacity: 0.7;
}
</style>
