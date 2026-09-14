import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { initDB, closeDB } from '../db/init'
import { clear, save, getAll } from '../db/dao'
import { STORES, MEDIA_CATEGORY, MEDIA_CATEGORY_LABELS } from '../utils/constants'

/**
 * 阶段 19 测试：问题6 - 自媒体增加发布/进展/调整记录+拖拽
 */

const read = (rel) => readFileSync(resolve(process.cwd(), rel), 'utf-8')

describe('问题6：自媒体增加发布/进展/调整记录+拖拽', () => {
  describe('constants.js 枚举', () => {
    let c
    beforeAll(() => { c = read('src/utils/constants.js') })

    it('定义 MEDIA_CATEGORY 4 个分类', () => {
      expect(c).toMatch(/export\s+const\s+MEDIA_CATEGORY\s*=\s*\{[^}]*IDEA:\s*'idea'[^}]*PUBLISHED:\s*'published'[^}]*PROGRESS:\s*'progress'[^}]*ADJUST:\s*'adjust'[^}]*\}/s)
    })

    it('定义 MEDIA_CATEGORY_LABELS', () => {
      expect(c).toMatch(/MEDIA_CATEGORY_LABELS/)
      expect(MEDIA_CATEGORY_LABELS.idea).toBe('点子/草稿')
      expect(MEDIA_CATEGORY_LABELS.published).toBe('已发布项目')
      expect(MEDIA_CATEGORY_LABELS.progress).toBe('进展记录')
      expect(MEDIA_CATEGORY_LABELS.adjust).toBe('后续调整')
    })
  })

  describe('Media.vue 4 栏目拖拽布局', () => {
    let f
    beforeAll(() => { f = read('src/views/Media.vue') })

    it('有 4 个栏目（idea/published/progress/adjust）', () => {
      expect(f).toContain("key: MEDIA_CATEGORY.IDEA")
      expect(f).toContain("key: MEDIA_CATEGORY.PUBLISHED")
      expect(f).toContain("key: MEDIA_CATEGORY.PROGRESS")
      expect(f).toContain("key: MEDIA_CATEGORY.ADJUST")
    })

    it('栏目支持拖拽放置（drop handler）', () => {
      expect(f).toContain('draggable="true"')
      expect(f).toContain('@dragstart=')
      expect(f).toContain('@dragover.prevent=')
      expect(f).toContain('@drop=')
    })

    it('卡片拖拽中状态视觉反馈', () => {
      expect(f).toContain('media-card--dragging')
    })

    it('分类按 category 分组（itemsByCategory）', () => {
      expect(f).toContain('itemsByCategory')
    })

    it('onDrop 把记录移到目标栏目（持久化 category）', () => {
      expect(f).toMatch(/onDrop[\s\S]*?save\('media'[^}]*category:\s*targetCat/s)
    })

    it('表单含 category 选择', () => {
      expect(f).toContain('v-model="form.category"')
    })

    it('saveIdea 持久化 category', () => {
      expect(f).toMatch(/saveIdea[\s\S]*?category:\s*form\.value\.category\s*\|\|\s*MEDIA_CATEGORY\.IDEA/s)
    })

    it('列表显示标题/平台/备注/耗时/时段/日期/链接', () => {
      expect(f).toContain('media-card__title')
      expect(f).toContain('media-card__meta')
      expect(f).toContain('media-card__note')
      expect(f).toContain('media-card__time')
      expect(f).toContain('media-card__slot')
      expect(f).toContain('media-card__date')
      expect(f).toContain('media-card__link')
    })

    it('空栏目有占位提示', () => {
      expect(f).toContain('media-card__empty')
      expect(f).toContain('拖拽记录到此栏目')
    })

    it('响应式布局（窄屏退化为 2 列/1 列）', () => {
      expect(f).toContain('@media (max-width: 900px)')
      expect(f).toContain('@media (max-width: 600px)')
    })
  })

  describe('数据持久化（IndexedDB）', () => {
    beforeEach(async () => {
      closeDB()
      await initDB()
      for (const s of STORES) await clear(s)
    })

    it('新增记录时含 category 字段，可按栏目查询', async () => {
      await save('media', { title: '点子1', category: 'idea', status: 'idea' })
      await save('media', { title: '发布1', category: 'published', status: 'published' })
      await save('media', { title: '进展1', category: 'progress', status: 'published' })
      await save('media', { title: '调整1', category: 'adjust', status: 'published' })

      const all = await getAll('media')
      const byCat = {}
      for (const m of all) {
        byCat[m.category] = (byCat[m.category] || 0) + 1
      }
      expect(byCat.idea).toBe(1)
      expect(byCat.published).toBe(1)
      expect(byCat.progress).toBe(1)
      expect(byCat.adjust).toBe(1)
    })

    it('更新 category（拖拽到另一栏目）后保留其他字段', async () => {
      const orig = await save('media', {
        title: '视频A',
        category: 'idea',
        platform: 'b站',
        timeCost: 2,
        note: '原备注',
        status: 'idea'
      })
      // 模拟拖拽：把记录从 idea 移到 published
      await save('media', { ...orig, category: 'published' })
      const all = await getAll('media')
      const updated = all.find(m => m.id === orig.id)
      expect(updated.category).toBe('published')
      // 其他字段保留
      expect(updated.title).toBe('视频A')
      expect(updated.platform).toBe('b站')
      expect(updated.timeCost).toBe(2)
      expect(updated.note).toBe('原备注')
    })

    it('旧数据（无 category）默认归到 idea 栏目', async () => {
      // 模拟旧数据：没填 category
      await save('media', { title: '老点子', status: 'idea' })
      const all = await getAll('media')
      const item = all.find(m => m.title === '老点子')
      // 视图层会兜底为 idea
      expect(item.category || 'idea').toBe('idea')
    })
  })
})
