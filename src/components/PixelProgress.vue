<template>
  <div class="pixel-progress">
    <div class="pixel-progress__bar">
      <span
        v-for="i in max"
        :key="i"
        class="pixel-progress__segment"
        :class="{
          'pixel-progress__segment--filled': i <= filledCount,
          'pixel-progress__segment--empty': i > filledCount
        }"
      >{{ i <= filledCount ? '▰' : '▱' }}</span>
    </div>
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
  gap: 0.75rem;
  font-family: 'ArkPixel', 'Courier New', monospace;
  font-weight: 700;
}
.pixel-progress__bar {
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 0.35rem 0.5rem;
  border: 3px solid var(--text);
  background: var(--panel);
  box-shadow: 2px 2px 0 var(--shadow);
}
.pixel-progress__segment {
  display: inline-block;
  font-size: 2rem;
  line-height: 1;
  letter-spacing: 1px;
}
.pixel-progress__segment--filled {
  color: var(--accent);
  text-shadow: 0 0 0 var(--accent);
}
.pixel-progress__segment--empty {
  color: var(--text);
  opacity: 0.35;
}
.pixel-progress__label {
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--text);
  min-width: 3.5rem;
  text-align: right;
}
</style>
