import { createRouter, createWebHashHistory } from 'vue-router'

// 路由配置：9 个模块（开发模块已移除）
const routes = [
  { path: '/', name: 'home', component: () => import('@/views/Home.vue') },
  { path: '/plan', name: 'plan', component: () => import('@/views/Plan.vue') },
  { path: '/media', name: 'media', component: () => import('@/views/Media.vue') },
  { path: '/company', name: 'company', component: () => import('@/views/Company.vue') },
  { path: '/fitness', name: 'fitness', component: () => import('@/views/Fitness.vue') },
  { path: '/study', name: 'study', component: () => import('@/views/Study.vue') },
  { path: '/study/:id', name: 'studyDetail', component: () => import('@/views/StudyDetail.vue') },
  { path: '/finance', name: 'finance', component: () => import('@/views/Finance.vue') },
  { path: '/game', name: 'game', component: () => import('@/views/Game.vue') },
  { path: '/settings', name: 'settings', component: () => import('@/views/Settings.vue') }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
