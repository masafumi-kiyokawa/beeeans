<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { getRecipe } from "../api/client";
import type { RecipeDetail } from "../types";

const props = defineProps<{ id: string }>();

const recipe = ref<RecipeDetail | null>(null);
const loading = ref(true);

const elapsed = ref(0);
const running = ref(false);
const triggeredStepIds = ref(new Set<string>());
let intervalId: number | undefined;

onMounted(async () => {
  recipe.value = await getRecipe(props.id);
  loading.value = false;
});

onUnmounted(() => {
  if (intervalId !== undefined) window.clearInterval(intervalId);
});

function formatTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function playBeep() {
  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
  const ctx = new AudioCtx();
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = "sine";
  oscillator.frequency.value = 880;
  gain.gain.setValueAtTime(0.2, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start();
  oscillator.stop(ctx.currentTime + 0.4);
}

function tick() {
  elapsed.value += 1;
  if (!recipe.value) return;
  for (const step of recipe.value.pour_steps) {
    if (step.target_time_sec <= elapsed.value && !triggeredStepIds.value.has(step.id)) {
      triggeredStepIds.value.add(step.id);
      playBeep();
    }
  }
}

function start() {
  if (running.value) return;
  running.value = true;
  intervalId = window.setInterval(tick, 1000);
}

function pause() {
  running.value = false;
  if (intervalId !== undefined) window.clearInterval(intervalId);
}

function reset() {
  pause();
  elapsed.value = 0;
  triggeredStepIds.value = new Set();
}

const allTriggered = computed(() => {
  if (!recipe.value || recipe.value.pour_steps.length === 0) return false;
  return recipe.value.pour_steps.every((s) => triggeredStepIds.value.has(s.id));
});

const currentStepIndex = computed(() => {
  if (!recipe.value) return -1;
  return recipe.value.pour_steps.findIndex((step) => !triggeredStepIds.value.has(step.id));
});
</script>

<template>
  <div v-if="loading" class="muted">読み込み中...</div>
  <div v-else-if="recipe">
    <h2>{{ recipe.name }} — タイマー</h2>

    <div class="timer-display">{{ formatTime(elapsed) }}</div>

    <div class="btn-row btn-row-center">
      <button class="btn" v-if="!running" @click="start">開始</button>
      <button class="btn btn-secondary" v-else @click="pause">一時停止</button>
      <button class="btn btn-secondary" @click="reset">リセット</button>
    </div>

    <div class="card">
      <div
        v-for="(step, index) in recipe.pour_steps"
        :key="step.id"
        class="step-row"
        :class="{
          current: index === currentStepIndex,
          done: triggeredStepIds.has(step.id),
        }"
      >
        <span>{{ index + 1 }}</span>
        <span>{{ formatTime(step.target_time_sec) }}</span>
        <span>{{ step.cumulative_water_ml }}ml</span>
        <span class="muted">{{ step.notes }}</span>
        <span>{{ triggeredStepIds.has(step.id) ? "✓" : "" }}</span>
      </div>
    </div>

    <div v-if="allTriggered" class="btn-row stack-top">
      <RouterLink class="btn" :to="`/logs/new?recipe_id=${recipe.id}`">ログを記録</RouterLink>
    </div>
  </div>
</template>
