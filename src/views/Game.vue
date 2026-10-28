<template>
  <div class="game">
    <PixelWindow title="抽卡小游戏" icon="♠">
      <div class="draw-game">
        <p class="draw-game__intro">一副 54 张的扑克牌，点一下按钮，随机抽一张看看今天的运气。</p>

        <!-- 牌桌 -->
        <div class="draw-game__stage">
          <div class="card-slot">
            <transition name="card-flip" mode="out-in">
              <div
                v-if="current"
                :key="current.drawId"
                class="poker-card"
                :class="{
                  'poker-card--red': current.color === 'red',
                  'poker-card--joker': current.joker
                }"
              >
                <template v-if="current.joker">
                  <span class="poker-card__corner">JOKER</span>
                  <span class="poker-card__joker">🃏</span>
                  <span class="poker-card__corner poker-card__corner--bottom">
                    {{ current.rank }}
                  </span>
                </template>
                <template v-else>
                  <span class="poker-card__corner">
                    {{ current.rank }}<br />{{ current.suit }}
                  </span>
                  <span class="poker-card__center">{{ current.suit }}</span>
                  <span class="poker-card__corner poker-card__corner--bottom">
                    {{ current.rank }}<br />{{ current.suit }}
                  </span>
                </template>
              </div>
              <div v-else class="poker-card poker-card--back">
                <span class="poker-card__back-pattern">?</span>
                <span class="poker-card__back-label">点击抽卡</span>
              </div>
            </transition>
          </div>
        </div>

        <!-- 结果文字 -->
        <p class="draw-game__result">
          <template v-if="current">
            抽到
            <span class="draw-game__result-name">{{ current.joker ? current.rank : `${current.suit} ${current.rank}` }}</span>
          </template>
          <template v-else>牌堆已准备好，试试手气吧</template>
        </p>

        <!-- 操作 -->
        <div class="draw-game__actions">
          <button class="pixel-btn pixel-btn--confirm draw-game__draw-btn" @click="draw">
            抽 一 张
          </button>
          <button class="pixel-btn" @click="resetDeck">重新洗牌</button>
        </div>

        <!-- 统计 -->
        <div class="draw-game__stats">
          <span>剩余 {{ deck.length }} 张</span>
          <span>已抽 {{ drawCount }} 次</span>
        </div>

        <!-- 最近抽到的牌 -->
        <div v-if="history.length" class="draw-game__history">
          <h4 class="draw-game__history-title">最近抽到</h4>
          <ul class="history-list">
            <li
              v-for="card in history"
              :key="card.drawId"
              class="history-list__item"
              :class="{ 'history-list__item--red': card.color === 'red' }"
            >
              <span>{{ card.joker ? '🃏' : card.suit }}</span>
              <span>{{ card.joker ? card.rank : card.rank }}</span>
            </li>
          </ul>
        </div>
      </div>
    </PixelWindow>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import PixelWindow from '@/components/PixelWindow.vue'

const SUITS = [
  { key: 'spade', symbol: '♠', color: 'black' },
  { key: 'heart', symbol: '♥', color: 'red' },
  { key: 'club', symbol: '♣', color: 'black' },
  { key: 'diamond', symbol: '♦', color: 'red' }
]
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']

/** 生成完整 54 张牌（52 张 + 大小王） */
function buildDeck() {
  const deck = []
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({
        id: `${suit.key}-${rank}`,
        rank,
        suit: suit.symbol,
        color: suit.color,
        joker: false
      })
    }
  }
  deck.push({ id: 'joker-small', rank: '小王', suit: '★', color: 'black', joker: true })
  deck.push({ id: 'joker-big', rank: '大王', suit: '★', color: 'red', joker: true })
  return deck
}

const deck = ref(buildDeck())
const current = ref(null)
const history = ref([])
const drawCount = ref(0)
let drawSeq = 0

/** 取 [0, max) 的随机整数（优先用加密随机数） */
function randomInt(max) {
  if (max <= 0) return 0
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const buf = new Uint32Array(1)
    crypto.getRandomValues(buf)
    return buf[0] % max
  }
  return Math.floor(Math.random() * max)
}

function draw() {
  if (deck.value.length === 0) {
    deck.value = buildDeck()
  }
  const idx = randomInt(deck.value.length)
  const card = deck.value[idx]
  deck.value.splice(idx, 1)

  drawSeq += 1
  drawCount.value += 1
  const picked = { ...card, drawId: `${card.id}-${drawSeq}` }

  current.value = picked
  history.value = [picked, ...history.value].slice(0, 8)
}

function resetDeck() {
  deck.value = buildDeck()
  current.value = null
  history.value = []
  drawCount.value = 0
  drawSeq = 0
}
</script>

<style scoped>
.game {
  max-width: 720px;
  margin: 0 auto;
}
.draw-game {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.9rem;
  padding: 0.5rem 0 1rem;
}
.draw-game__intro {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--ochre);
  text-align: center;
}
.draw-game__stage {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 320px;
}
.card-slot {
  position: relative;
  width: 200px;
  height: 280px;
}
.poker-card {
  position: relative;
  width: 100%;
  height: 100%;
  border: 5px solid var(--text);
  border-radius: 10px;
  background: #f7f4e9;
  color: #16130e;
  box-shadow: 6px 6px 0 var(--shadow);
  display: flex;
  align-items: center;
  justify-content: center;
  user-select: none;
}
.poker-card--red {
  color: #c8231f;
}
.poker-card__corner {
  position: absolute;
  top: 10px;
  left: 10px;
  font-size: 1.2rem;
  font-weight: 700;
  line-height: 1.1;
  text-align: center;
}
.poker-card__corner--bottom {
  top: auto;
  left: auto;
  bottom: 10px;
  right: 10px;
  transform: rotate(180deg);
}
.poker-card__center {
  font-size: 5rem;
  line-height: 1;
}
.poker-card__joker {
  font-size: 5rem;
  line-height: 1;
}
.poker-card--back {
  flex-direction: column;
  gap: 0.5rem;
  border-color: var(--border);
  background:
    repeating-linear-gradient(
      45deg,
      var(--panel) 0,
      var(--panel) 10px,
      var(--bg) 10px,
      var(--bg) 20px
    );
  color: var(--ochre);
}
.poker-card__back-pattern {
  font-size: 4rem;
  font-weight: 700;
}
.poker-card__back-label {
  font-size: 1.05rem;
  font-weight: 700;
}
.draw-game__result {
  font-size: 1.15rem;
  font-weight: 700;
  min-height: 1.6rem;
  text-align: center;
}
.draw-game__result-name {
  color: var(--accent);
  font-size: 1.35rem;
}
.draw-game__actions {
  display: flex;
  gap: 0.6rem;
  flex-wrap: wrap;
  justify-content: center;
}
.draw-game__draw-btn {
  font-size: 1.3rem;
  font-weight: 700;
  padding: 0.7rem 2rem;
  letter-spacing: 2px;
}
.draw-game__stats {
  display: flex;
  gap: 1.5rem;
  font-size: 1rem;
  font-weight: 700;
  color: var(--ochre);
}
.draw-game__history {
  width: 100%;
  border-top: 2px dashed var(--border);
  padding-top: 0.75rem;
}
.draw-game__history-title {
  font-size: 1.05rem;
  font-weight: 700;
  margin-bottom: 0.4rem;
}
.history-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}
.history-list__item {
  display: flex;
  align-items: center;
  gap: 0.2rem;
  border: 2px solid var(--border);
  background: var(--bg);
  padding: 0.2rem 0.5rem;
  font-size: 1rem;
  font-weight: 700;
}
.history-list__item--red {
  color: var(--accent);
}
/* 翻牌动画 */
.card-flip-enter-active {
  transition: transform 0.28s ease, opacity 0.28s ease;
}
.card-flip-leave-active {
  transition: transform 0.15s ease, opacity 0.15s ease;
  position: absolute;
}
.card-flip-enter-from {
  transform: rotateY(90deg) scale(0.9);
  opacity: 0;
}
.card-flip-leave-to {
  transform: rotateY(-90deg) scale(0.9);
  opacity: 0;
}
@media (max-width: 768px) {
  .card-slot {
    width: 160px;
    height: 224px;
  }
  .poker-card__center,
  .poker-card__joker {
    font-size: 4rem;
  }
  .draw-game__draw-btn {
    width: 100%;
    padding: 0.8rem 1rem;
  }
  .draw-game__stage {
    min-height: 260px;
  }
}
</style>
