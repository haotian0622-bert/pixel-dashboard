<template>
  <div class="pixel-empty">
    <span class="pixel-empty__icon">◇</span>
    <span class="pixel-empty__text">{{ text }}</span>
  </div>
</template>

<script setup>
defineProps({
  text: { type: String, default: '暂无数据' }
})
</script>

<style scoped>
.pixel-empty {
  text-align: center;
  padding: 2rem 1rem;
  color: var(--ochre);
  opacity: 0.6;
}
.pixel-empty__icon {
  display: block;
  font-size: 2rem;
  margin-bottom: 0.5rem;
}
.pixel-empty__text {
  font-size: 0.85rem;
}
</style>
