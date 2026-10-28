<template>
  <transition name="daily-tip">
    <div v-if="visible" class="daily-tip" @click="hide">
      <div class="daily-tip__deco daily-tip__deco--tl">✦</div>
      <div class="daily-tip__deco daily-tip__deco--br">✦</div>
      <div class="daily-tip__card">
        <div class="daily-tip__badge">今日加油</div>
        <p class="daily-tip__text">{{ tip }}</p>
        <div class="daily-tip__date">{{ dateStr }}</div>
      </div>
      <div class="daily-tip__hint">2 秒后自动返回 · 点击立即关闭</div>
    </div>
  </transition>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { today } from '@/utils/date'
import { getDailyTip } from '@/utils/tips'

/** 每天只弹一次 */
const TIP_KEY = 'pixel-dashboard:daily-tip-date'
const SHOW_MS = 2000

const visible = ref(false)
const tip = ref('')
const dateStr = ref('')
let timer = null

function hide() {
  visible.value = false
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
}

onMounted(() => {
  const d = today()
  try {
    if (localStorage.getItem(TIP_KEY) === d) return
    localStorage.setItem(TIP_KEY, d)
  } catch {
    // localStorage 不可用时也照常展示
  }
  dateStr.value = d
  tip.value = getDailyTip(d)
  visible.value = true
  timer = setTimeout(hide, SHOW_MS)
})

onUnmounted(() => {
  if (timer) clearTimeout(timer)
})
</script>

<style scoped>
.daily-tip {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1.5rem;
  padding: 1.5rem;
  background:
    repeating-linear-gradient(
      45deg,
      var(--bg) 0,
      var(--bg) 12px,
      var(--panel) 12px,
      var(--panel) 24px
    );
  cursor: pointer;
}
.daily-tip__card {
  position: relative;
  z-index: 2;
  width: min(92vw, 560px);
  border: 6px double var(--accent);
  background: var(--panel);
  box-shadow: 8px 8px 0 var(--shadow);
  padding: 2rem 1.5rem;
  text-align: center;
}
.daily-tip__badge {
  display: inline-block;
  margin-bottom: 1.25rem;
  padding: 0.25rem 0.9rem;
  border: 3px solid var(--text);
  background: var(--accent);
  color: var(--panel);
  font-size: 1.1rem;
  font-weight: 700;
  letter-spacing: 2px;
}
.daily-tip__text {
  font-size: clamp(1.35rem, 5vw, 2rem);
  font-weight: 700;
  line-height: 1.6;
  color: var(--text);
}
.daily-tip__date {
  margin-top: 1.5rem;
  font-size: 1rem;
  font-weight: 700;
  color: var(--ochre);
}
.daily-tip__hint {
  position: relative;
  z-index: 2;
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--ochre);
}
.daily-tip__deco {
  position: absolute;
  color: var(--accent);
  font-size: 2rem;
}
.daily-tip__deco--tl {
  top: 1.5rem;
  left: 1.5rem;
}
.daily-tip__deco--br {
  bottom: 1.5rem;
  right: 1.5rem;
}

/* 入场 / 退场动画 */
.daily-tip-enter-active,
.daily-tip-leave-active {
  transition: opacity 0.35s ease, transform 0.35s ease;
}
.daily-tip-enter-from,
.daily-tip-leave-to {
  opacity: 0;
  transform: scale(1.06);
}
@media (max-width: 768px) {
  .daily-tip__card {
    padding: 1.5rem 1rem;
  }
}
</style>
