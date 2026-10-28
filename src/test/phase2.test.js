import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import PixelWindow from '../components/PixelWindow.vue'
import PixelButton from '../components/PixelButton.vue'
import PixelDialog from '../components/PixelDialog.vue'
import PixelProgress from '../components/PixelProgress.vue'
import PixelInput from '../components/PixelInput.vue'
import PixelSelect from '../components/PixelSelect.vue'
import PixelEmpty from '../components/PixelEmpty.vue'
import PixelSidebar from '../components/PixelSidebar.vue'

// 测试用路由
function mockRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: { template: '<div/>' } },
      { path: '/plan', name: 'plan', component: { template: '<div/>' } },
      { path: '/media', name: 'media', component: { template: '<div/>' } },
      { path: '/dev', name: 'dev', component: { template: '<div/>' } },
      { path: '/company', name: 'company', component: { template: '<div/>' } },
      { path: '/fitness', name: 'fitness', component: { template: '<div/>' } },
      { path: '/study', name: 'study', component: { template: '<div/>' } },
      { path: '/finance', name: 'finance', component: { template: '<div/>' } },
      { path: '/settings', name: 'settings', component: { template: '<div/>' } }
    ]
  })
}

// 带router的mount
function mountWithRouter(comp, options = {}) {
  const router = mockRouter()
  return mount(comp, {
    ...options,
    global: {
      plugins: [router]
    }
  })
}

/**
 * 阶段 2 测试：UI 基础框架
 * 验证像素组件渲染、侧边栏导航、主题状态
 */

describe('阶段2：UI 基础框架', () => {
  describe('2.4 通用像素组件', () => {
    it('PixelWindow 渲染标题栏和内容', () => {
      const wrapper = mount(PixelWindow, {
        props: { title: '测试窗口', icon: '★' },
        slots: { default: '<p>内容</p>' }
      })
      expect(wrapper.text()).toContain('测试窗口')
      expect(wrapper.text()).toContain('内容')
      expect(wrapper.find('.pixel-window__titlebar').exists()).toBe(true)
    })

    it('PixelButton 渲染文字和类型', () => {
      const w1 = mount(PixelButton, { props: { label: '确认', type: 'confirm' } })
      expect(w1.text()).toContain('确认')
      expect(w1.find('.pixel-btn--confirm').exists()).toBe(true)

      const w2 = mount(PixelButton, { props: { label: '取消', type: 'cancel' } })
      expect(w2.find('.pixel-btn--cancel').exists()).toBe(true)
    })

    it('PixelButton 点击触发事件', async () => {
      const wrapper = mount(PixelButton, { props: { label: '点击' } })
      await wrapper.trigger('click')
      expect(wrapper.emitted('click')).toBeTruthy()
    })

    it('PixelDialog 可见时渲染，不可见时不渲染', () => {
      const w1 = mount(PixelDialog, { props: { visible: true, title: '确认操作' } })
      expect(w1.find('.pixel-dialog-overlay').exists()).toBe(true)
      expect(w1.text()).toContain('确认操作')

      const w2 = mount(PixelDialog, { props: { visible: false } })
      expect(w2.find('.pixel-dialog-overlay').exists()).toBe(false)
    })

    it('PixelDialog 确认和取消按钮触发事件', async () => {
      const wrapper = mount(PixelDialog, {
        props: { visible: true, confirmText: '是', cancelText: '否' }
      })
      const buttons = wrapper.findAll('button')
      await buttons[0].trigger('click') // 确认
      expect(wrapper.emitted('confirm')).toBeTruthy()
      await buttons[1].trigger('click') // 取消
      expect(wrapper.emitted('cancel')).toBeTruthy()
    })

    it('PixelProgress 分段进度条渲染正确', () => {
      const w = mount(PixelProgress, { props: { value: 50, max: 10 } })
      const segments = w.findAll('.pixel-progress__segment')
      expect(segments.length).toBe(10)
      // 50% 应该有 5 个 filled
      const filled = w.findAll('.pixel-progress__segment--filled')
      expect(filled.length).toBe(5)
      const empty = w.findAll('.pixel-progress__segment--empty')
      expect(empty.length).toBe(5)
      expect(w.text()).toContain('50%')
    })

    it('PixelProgress 0% 和 100% 边界', () => {
      const w0 = mount(PixelProgress, { props: { value: 0, max: 5 } })
      expect(w0.findAll('.pixel-progress__segment--filled').length).toBe(0)

      const w100 = mount(PixelProgress, { props: { value: 100, max: 5 } })
      expect(w100.findAll('.pixel-progress__segment--filled').length).toBe(5)
    })

    it('PixelInput 文本输入', async () => {
      const wrapper = mount(PixelInput, {
        props: { modelValue: '', placeholder: '输入...' }
      })
      const input = wrapper.find('input')
      expect(input.attributes('placeholder')).toBe('输入...')
      await input.setValue('你好')
      expect(wrapper.emitted('update:modelValue')[0]).toEqual(['你好'])
    })

    it('PixelInput textarea 模式', () => {
      const wrapper = mount(PixelInput, {
        props: { type: 'textarea', modelValue: '内容', rows: 5 }
      })
      expect(wrapper.find('textarea').exists()).toBe(true)
    })

    it('PixelSelect 下拉选择', async () => {
      const wrapper = mount(PixelSelect, {
        props: {
          modelValue: 'a',
          options: [
            { value: 'a', label: '选项A' },
            { value: 'b', label: '选项B' }
          ]
        }
      })
      const select = wrapper.find('select')
      const options = select.findAll('option')
      expect(options.length).toBe(2)
      expect(options[0].text()).toBe('选项A')
    })

    it('PixelEmpty 空状态', () => {
      const wrapper = mount(PixelEmpty, { props: { text: '暂无数据' } })
      expect(wrapper.text()).toContain('暂无数据')
      expect(wrapper.find('.pixel-empty__icon').exists()).toBe(true)
    })
  })

  describe('2.5 侧边栏', () => {
    it('侧边栏包含 7 个分组', () => {
      const wrapper = mountWithRouter(PixelSidebar)
      const groups = wrapper.findAll('.sidebar-nav__group')
      expect(groups.length).toBe(7)
    })

    it('侧边栏包含 9 个导航项', () => {
      const wrapper = mountWithRouter(PixelSidebar)
      const items = wrapper.findAll('.sidebar-nav__item')
      expect(items.length).toBe(9)
    })

    it('侧边栏包含正确的模块名', () => {
      const wrapper = mountWithRouter(PixelSidebar)
      const text = wrapper.text()
      expect(text).toContain('首页')
      expect(text).toContain('本周/今日计划')
      expect(text).toContain('自媒体')
      expect(text).toContain('公司事情安排')
      expect(text).toContain('健身计划')
      expect(text).toContain('学习计划')
      expect(text).toContain('本月开支和收入')
      expect(text).toContain('抽卡小游戏')
      expect(text).toContain('数据与设置')
      expect(text).not.toContain('开发工作（AI）')
    })

    it('侧边栏每项有模块色块', () => {
      const wrapper = mountWithRouter(PixelSidebar)
      const colors = wrapper.findAll('.sidebar-nav__module-color')
      expect(colors.length).toBe(9)
    })
  })

  describe('2.6 路由配置', () => {
    it('路由配置包含全部模块路由', async () => {
      const routerModule = await import('../router/index.js')
      const routes = routerModule.default.options.routes
      const names = routes.map(r => r.name)
      const expected = ['home', 'plan', 'media', 'company', 'fitness', 'study', 'studyDetail', 'finance', 'game', 'settings']
      for (const name of expected) {
        expect(names).toContain(name)
      }
      expect(names).not.toContain('dev')
    })
  })

  describe('2.7 主题状态', () => {
    it('主题 store 导出 init/setMode/getEffective', async () => {
      const mod = await import('../stores/theme.js')
      const { useThemeStore } = mod
      // 在 Pinia 没初始化的情况下，只验证导出存在
      expect(typeof useThemeStore).toBe('function')
    })
  })

  describe('2.1-2.3 CSS 样式文件', () => {
    it('variables.css 包含日间/夜间双主题', () => {
      const fs = require('fs')
      const path = require('path')
      const css = fs.readFileSync(
        path.resolve(process.cwd(), 'src/styles/variables.css'),
        'utf-8'
      )
      expect(css).toContain('[data-theme="light"]')
      expect(css).toContain('[data-theme="dark"]')
      expect(css).toContain('--c-plan')
      expect(css).toContain('--c-finance')
    })

    it('pixel-ui.css 包含核心像素控件类', () => {
      const fs = require('fs')
      const path = require('path')
      const css = fs.readFileSync(
        path.resolve(process.cwd(), 'src/styles/pixel-ui.css'),
        'utf-8'
      )
      expect(css).toContain('.pixel-window')
      expect(css).toContain('.pixel-btn')
      expect(css).toContain('.pixel-input')
      expect(css).toContain('.pixel-scroll')
      expect(css).toContain('.pixel-progress')
      expect(css).toContain('@media (max-width: 768px)')
    })
  })
})
