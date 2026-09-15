<template>
  <div class="pixel-chart">
    <!-- 折线图图例 -->
    <ul v-if="hasData && type === 'line'" class="pixel-chart__legend">
      <li v-for="(ser, i) in series" :key="i" class="pixel-chart__legend-item">
        <span class="pixel-chart__legend-swatch" :style="{ background: colorAt(i) }"></span>
        {{ ser.name }}
      </li>
    </ul>

    <svg v-if="hasData" :viewBox="`0 0 ${W} ${H}`" class="pixel-chart__svg" role="img" aria-label="数据图表">
      <!-- 网格线 + y 轴刻度 -->
      <line
        v-for="g in grids"
        :key="'grid' + g.value"
        :x1="padL" :y1="g.y" :x2="W - padR" :y2="g.y"
        class="pixel-chart__grid"
      />
      <text
        v-for="g in grids"
        :key="'gy' + g.value"
        :x="padL - 8" :y="g.y + 5"
        class="pixel-chart__axis"
        text-anchor="end"
      >{{ formatStat(g.value) }}</text>

      <!-- 柱状图 -->
      <template v-if="type === 'bar'">
        <rect
          v-for="(r, i) in barRects"
          :key="'b' + i"
          :x="r.x" :y="r.y" :width="r.w" :height="r.h"
          class="pixel-chart__bar"
        />
        <text
          v-for="(r, i) in barRects"
          :key="'bv' + i"
          :x="r.x + r.w / 2" :y="r.y - 6"
          class="pixel-chart__value"
          text-anchor="middle"
        >{{ formatStat(barPoints[i].value) }}</text>
        <text
          v-for="(r, i) in barRects"
          :key="'bl' + i"
          :x="r.x + r.w / 2" :y="H - padB + 18"
          class="pixel-chart__axis"
          text-anchor="middle"
        >{{ short(barPoints[i].name || barPoints[i].label) }}</text>
      </template>

      <!-- 折线图 -->
      <template v-else>
        <g v-for="(seg, si) in lineSegments" :key="'seg' + si">
          <polyline
            :points="seg.pts.map(p => `${p.x},${p.y}`).join(' ')"
            :stroke="colorAt(seg.seriesIndex)"
            class="pixel-chart__line"
          />
          <rect
            v-for="(p, pi) in seg.pts"
            :key="'d' + si + '-' + pi"
            :x="p.x - 3.5" :y="p.y - 3.5"
            width="7" height="7"
            :fill="colorAt(seg.seriesIndex)"
            stroke="var(--panel)"
            stroke-width="1.5"
          />
        </g>
        <text
          v-for="(lb, i) in xLabels"
          :key="'lx' + i"
          :x="lb.x" :y="H - padB + 18"
          class="pixel-chart__axis"
          text-anchor="middle"
        >{{ lb.text }}</text>
      </template>
    </svg>

    <div v-else class="pixel-chart__empty">
      暂无数据，先在记录卡片上点「数据」录入吧
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { formatStat, niceMax } from '@/utils/stats'

const props = defineProps({
  type: { type: String, default: 'line' }, // 'line' | 'bar'
  series: { type: Array, default: () => [] } // [{ name, points: [{ label, value }] }]
})

const W = 640
const H = 260
const padL = 52
const padR = 16
const padT = 18
const padB = 42
const plotW = W - padL - padR
const plotH = H - padT - padB

// 像素风高饱和调色板（与模块色同色系）
const PALETTE = ['#D85A1A', '#3D5A75', '#5E7035', '#6B3F8C', '#9A3F22', '#B08400']
function colorAt(i) {
  return PALETTE[i % PALETTE.length]
}

const hasData = computed(() =>
  props.series.some(s => Array.isArray(s.points) && s.points.length > 0)
)

const maxV = computed(() => {
  let m = 0
  for (const s of props.series) {
    for (const p of s.points || []) {
      if (p.value != null && p.value > m) m = p.value
    }
  }
  return niceMax(m)
})

function yAt(v) {
  return padT + plotH - (Number(v) / maxV.value) * plotH
}

// 4 等分网格（含 0 线共 5 条）
const grids = computed(() => {
  const out = []
  for (let i = 0; i <= 4; i++) {
    const value = (maxV.value / 4) * i
    out.push({
      value: Math.round(value * 100) / 100,
      y: padT + plotH - (value / maxV.value) * plotH
    })
  }
  return out
})

// ---------- 柱状图 ----------
const barPoints = computed(() => props.series[0]?.points || [])

const barRects = computed(() => {
  const pts = barPoints.value
  const n = pts.length
  if (!n) return []
  const slot = plotW / n
  const w = Math.min(52, slot * 0.6)
  return pts.map((p, i) => {
    const v = Number(p.value) || 0
    const h = (v / maxV.value) * plotH
    return {
      x: padL + slot * i + (slot - w) / 2,
      y: padT + plotH - h,
      w,
      h: v > 0 ? Math.max(h, 3) : 0
    }
  })
})

function short(name) {
  const s = String(name || '')
  return s.length > 6 ? `${s.slice(0, 6)}…` : s
}

// ---------- 折线图 ----------
const lineLabels = computed(() => props.series[0]?.points.map(p => p.label) || [])

function xAt(i, n) {
  if (n <= 1) return padL + plotW / 2
  return padL + (plotW * i) / (n - 1)
}

// null 点断开：把每条线拆成若干连续段
const lineSegments = computed(() => {
  const n = lineLabels.value.length
  const segs = []
  props.series.forEach((ser, si) => {
    let cur = []
    ;(ser.points || []).forEach((p, i) => {
      if (p.value == null) {
        if (cur.length) { segs.push({ seriesIndex: si, pts: cur }); cur = [] }
      } else {
        cur.push({ x: xAt(i, n), y: yAt(p.value) })
      }
    })
    if (cur.length) segs.push({ seriesIndex: si, pts: cur })
  })
  return segs.filter(s => s.pts.length > 0)
})

// x 轴日期标签抽稀（最多约 8 个，MM-DD）
const xLabels = computed(() => {
  const labels = lineLabels.value
  const n = labels.length
  const step = Math.max(1, Math.ceil(n / 8))
  const out = []
  labels.forEach((label, i) => {
    if (i % step === 0 || i === n - 1) {
      out.push({ x: xAt(i, n), text: String(label).slice(5) })
    }
  })
  return out
})
</script>

<style scoped>
.pixel-chart {
  border: 3px solid var(--border);
  background: var(--panel);
  padding: 0.5rem;
}
.pixel-chart__legend {
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1rem;
  margin: 0 0 0.25rem 0;
  padding: 0 0.25rem;
}
.pixel-chart__legend-item {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text);
}
.pixel-chart__legend-swatch {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid var(--text);
}
.pixel-chart__svg {
  display: block;
  width: 100%;
  height: auto;
  font-family: 'ArkPixel', 'Courier New', monospace;
}
.pixel-chart__grid {
  stroke: var(--border);
  stroke-width: 1;
  opacity: 0.25;
  shape-rendering: crispEdges;
}
.pixel-chart__axis {
  font-size: 13px;
  font-weight: 700;
  fill: var(--ochre);
}
.pixel-chart__bar {
  fill: var(--accent);
  stroke: var(--text);
  stroke-width: 2;
  shape-rendering: crispEdges;
}
.pixel-chart__value {
  font-size: 13px;
  font-weight: 700;
  fill: var(--text);
}
.pixel-chart__line {
  fill: none;
  stroke-width: 3;
  stroke-linejoin: miter;
  stroke-linecap: square;
}
.pixel-chart__empty {
  padding: 2rem 1rem;
  text-align: center;
  color: var(--ochre);
  font-size: 1rem;
  font-weight: 700;
  border: 2px dashed var(--border);
  opacity: 0.6;
}
</style>
