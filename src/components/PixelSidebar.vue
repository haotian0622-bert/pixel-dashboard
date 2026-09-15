<template>
  <nav class="sidebar-nav">
    <!-- 总览 -->
    <div class="sidebar-nav__group">
      <div class="sidebar-nav__group-title">总览</div>
      <div
        class="sidebar-nav__item"
        :class="{ 'sidebar-nav__item--active': currentRoute === 'home' }"
        @click="navigate('/')"
      >
        <span
          class="sidebar-nav__module-color"
          :style="{ background: 'var(--c-plan)' }"
        ></span>
        <span>首页</span>
      </div>
    </div>

    <!-- 计划 -->
    <div class="sidebar-nav__group">
      <div class="sidebar-nav__group-title">计划</div>
      <div
        class="sidebar-nav__item"
        :class="{ 'sidebar-nav__item--active': currentRoute === 'plan' }"
        @click="navigate('/plan')"
      >
        <span
          class="sidebar-nav__module-color"
          :style="{ background: 'var(--c-plan)' }"
        ></span>
        <span>本周/今日计划</span>
      </div>
    </div>

    <!-- 工作 -->
    <div class="sidebar-nav__group">
      <div class="sidebar-nav__group-title">工作</div>
      <div
        v-for="item in workItems"
        :key="item.route"
        class="sidebar-nav__item"
        :class="{ 'sidebar-nav__item--active': currentRoute === item.name }"
        @click="navigate(item.route)"
      >
        <span
          class="sidebar-nav__module-color"
          :style="{ background: `var(${item.color})` }"
        ></span>
        <span>{{ item.label }}</span>
      </div>
    </div>

    <!-- 生活 -->
    <div class="sidebar-nav__group">
      <div class="sidebar-nav__group-title">生活</div>
      <div
        v-for="item in lifeItems"
        :key="item.route"
        class="sidebar-nav__item"
        :class="{ 'sidebar-nav__item--active': currentRoute === item.name }"
        @click="navigate(item.route)"
      >
        <span
          class="sidebar-nav__module-color"
          :style="{ background: `var(${item.color})` }"
        ></span>
        <span>{{ item.label }}</span>
      </div>
    </div>

    <!-- 收支 -->
    <div class="sidebar-nav__group">
      <div class="sidebar-nav__group-title">收支</div>
      <div
        class="sidebar-nav__item"
        :class="{ 'sidebar-nav__item--active': currentRoute === 'finance' }"
        @click="navigate('/finance')"
      >
        <span
          class="sidebar-nav__module-color"
          :style="{ background: 'var(--c-finance)' }"
        ></span>
        <span>本月开支和收入</span>
      </div>
    </div>

    <!-- 系统 -->
    <div class="sidebar-nav__group">
      <div class="sidebar-nav__group-title">系统</div>
      <div
        class="sidebar-nav__item"
        :class="{ 'sidebar-nav__item--active': currentRoute === 'settings' }"
        @click="navigate('/settings')"
      >
        <span
          class="sidebar-nav__module-color"
          :style="{ background: 'var(--c-settings)' }"
        ></span>
        <span>数据与设置</span>
      </div>
    </div>
  </nav>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const currentRoute = computed(() => route.name || '')

const workItems = [
  { route: '/media', name: 'media', label: '自媒体', color: '--c-media' },
  { route: '/dev', name: 'dev', label: '开发工作（AI）', color: '--c-dev' },
  { route: '/company', name: 'company', label: '公司事情安排', color: '--c-company' }
]

const lifeItems = [
  { route: '/fitness', name: 'fitness', label: '健身计划', color: '--c-fitness' },
  { route: '/study', name: 'study', label: '学习计划', color: '--c-study' }
]

function navigate(path) {
  router.push(path)
}
</script>

<style scoped>
.sidebar-nav {
  width: 200px;
  min-height: 100vh;
  background: var(--panel);
  border-right: 4px double var(--border);
  padding: 1rem 0;
  flex-shrink: 0;
}
.sidebar-nav__group {
  margin-bottom: 1rem;
}
.sidebar-nav__group-title {
  padding: 0.25rem 1rem;
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--ochre);
  letter-spacing: 1px;
}
.sidebar-nav__item {
  display: flex;
  align-items: center;
  padding: 0.5rem 0.75rem;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 700;
  color: var(--text);
  position: relative;
}
.sidebar-nav__item:hover {
  background: var(--bg);
}
.sidebar-nav__item--active {
  background: var(--bg);
  font-weight: 700;
}
.sidebar-nav__item--active::before {
  content: '▶';
  position: absolute;
  left: 0.15rem;
  color: var(--accent);
  font-size: 0.75rem;
}
.sidebar-nav__module-color {
  display: inline-block;
  width: 12px;
  height: 12px;
  border: 2px solid var(--border);
  margin-right: 0.5rem;
  flex-shrink: 0;
}

/* 响应式：窄屏收成图标条 */
@media (max-width: 768px) {
  .sidebar-nav {
    width: 48px;
  }
  .sidebar-nav__group-title,
  .sidebar-nav__item span:not(.sidebar-nav__module-color) {
    display: none;
  }
  .sidebar-nav__item {
    justify-content: center;
    padding: 0.5rem 0;
  }
  .sidebar-nav__module-color {
    margin-right: 0;
  }
}
</style>
