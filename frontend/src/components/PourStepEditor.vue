<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import { createPourStep, deletePourStep, listPourSteps, updatePourStep } from "../api/client";
import type { PourStep } from "../types";

const props = defineProps<{ recipeId: string }>();

const steps = ref<PourStep[]>([]);
const loading = ref(true);
const editingId = ref<string | null>(null);
const editForm = reactive({ time_delta_sec: 0, water_delta_ml: 0, notes: "" });
const errorMessage = ref<string | null>(null);
const saving = ref(false);

const newStep = reactive({ time_delta_sec: 0, water_delta_ml: 0, notes: "" });

async function load() {
  loading.value = true;
  steps.value = await listPourSteps(props.recipeId);
  loading.value = false;
}

onMounted(load);

function formatTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// 各ステップは累積値(target_time_sec / cumulative_water_ml)でDBに保存されるため、
// 直前ステップとの差分がそのステップ単体の時間・湯量になる。
function previousCumulative(index: number) {
  const prev = steps.value[index - 1];
  return prev
    ? { time: prev.target_time_sec, water: prev.cumulative_water_ml }
    : { time: 0, water: 0 };
}

function stepDelta(step: PourStep, index: number) {
  const prev = previousCumulative(index);
  return {
    time: step.target_time_sec - prev.time,
    water: step.cumulative_water_ml - prev.water,
  };
}

function validateStepInput(input: { time_delta_sec: number; water_delta_ml: number }) {
  if (!Number.isFinite(input.time_delta_sec) || input.time_delta_sec < 0) {
    return "ステップ時間は0以上の値を入力してください。";
  }
  if (!Number.isFinite(input.water_delta_ml) || input.water_delta_ml <= 0) {
    return "ステップ湯量は0より大きい値を入力してください。";
  }
  return null;
}

function describeError(e: unknown, fallback: string) {
  return e instanceof Error ? e.message : fallback;
}

async function addStep() {
  errorMessage.value = validateStepInput(newStep);
  if (errorMessage.value) return;
  if (saving.value) return;
  saving.value = true;
  try {
    const prev = previousCumulative(steps.value.length);
    await createPourStep(props.recipeId, {
      target_time_sec: prev.time + newStep.time_delta_sec,
      cumulative_water_ml: prev.water + newStep.water_delta_ml,
      notes: newStep.notes || null,
    });
    newStep.time_delta_sec = 0;
    newStep.water_delta_ml = 0;
    newStep.notes = "";
    await load();
  } catch (e) {
    errorMessage.value = describeError(e, "ステップの追加に失敗しました。");
  } finally {
    saving.value = false;
  }
}

function startEdit(step: PourStep, index: number) {
  errorMessage.value = null;
  editingId.value = step.id;
  const delta = stepDelta(step, index);
  editForm.time_delta_sec = delta.time;
  editForm.water_delta_ml = delta.water;
  editForm.notes = step.notes ?? "";
}

function cancelEdit() {
  errorMessage.value = null;
  editingId.value = null;
}

async function saveEdit(step: PourStep, index: number) {
  errorMessage.value = validateStepInput(editForm);
  if (errorMessage.value) return;
  if (saving.value) return;
  saving.value = true;
  try {
    const prev = previousCumulative(index);
    await updatePourStep(props.recipeId, step.id, {
      target_time_sec: prev.time + editForm.time_delta_sec,
      cumulative_water_ml: prev.water + editForm.water_delta_ml,
      notes: editForm.notes || null,
    });
    editingId.value = null;
    await load();
  } catch (e) {
    errorMessage.value = describeError(e, "ステップの保存に失敗しました。");
  } finally {
    saving.value = false;
  }
}

async function removeStep(step: PourStep) {
  if (!confirm("このステップを削除しますか？")) return;
  errorMessage.value = null;
  try {
    await deletePourStep(props.recipeId, step.id);
    await load();
  } catch (e) {
    errorMessage.value = describeError(e, "ステップの削除に失敗しました。");
  }
}
</script>

<template>
  <div>
    <p v-if="errorMessage" class="form-error">{{ errorMessage }}</p>
    <div class="step-row step-row-header">
      <span>#</span>
      <span>ステップ時間（秒）</span>
      <span>ステップ湯量（ml）</span>
      <span>メモ</span>
      <span>操作</span>
    </div>
    <p v-if="loading" class="muted">読み込み中...</p>
    <template v-else>
      <p v-if="steps.length === 0" class="empty-state">まだ注湯ステップがありません。</p>
      <div v-for="(step, index) in steps" :key="step.id" class="step-row">
        <template v-if="editingId === step.id">
          <span>{{ index + 1 }}</span>
          <div>
            <input
              v-model.number="editForm.time_delta_sec"
              type="number"
              min="0"
              title="ステップ時間(秒)"
            />
            <small class="step-sub"
              >累計
              {{ formatTime(previousCumulative(index).time + editForm.time_delta_sec) }}</small
            >
          </div>
          <div>
            <input
              v-model.number="editForm.water_delta_ml"
              type="number"
              min="0.1"
              step="0.1"
              title="ステップ湯量(ml)"
            />
            <small class="step-sub"
              >累計 {{ previousCumulative(index).water + editForm.water_delta_ml }}ml</small
            >
          </div>
          <input v-model="editForm.notes" placeholder="メモ" />
          <div class="btn-row">
            <button class="btn" :disabled="saving" @click="saveEdit(step, index)">保存</button>
            <button class="btn btn-secondary" @click="cancelEdit">取消</button>
          </div>
        </template>
        <template v-else>
          <span>{{ index + 1 }}</span>
          <span>
            {{ formatTime(stepDelta(step, index).time) }}
            <small class="step-sub">累計 {{ formatTime(step.target_time_sec) }}</small>
          </span>
          <span>
            {{ stepDelta(step, index).water }}ml
            <small class="step-sub">累計 {{ step.cumulative_water_ml }}ml</small>
          </span>
          <span class="muted">{{ step.notes }}</span>
          <div class="btn-row">
            <button class="btn btn-secondary" @click="startEdit(step, index)">編集</button>
            <button class="btn btn-danger" @click="removeStep(step)">削除</button>
          </div>
        </template>
      </div>
    </template>

    <div class="form-row stack-top">
      <label id="add-step-label">ステップを追加</label>
      <div class="step-row" role="group" aria-labelledby="add-step-label">
        <span>-</span>
        <div>
          <input v-model.number="newStep.time_delta_sec" type="number" min="0" placeholder="秒" />
          <small class="step-sub"
            >累計
            {{ formatTime(previousCumulative(steps.length).time + newStep.time_delta_sec) }}</small
          >
        </div>
        <div>
          <input
            v-model.number="newStep.water_delta_ml"
            type="number"
            min="0.1"
            step="0.1"
            placeholder="ml"
          />
          <small class="step-sub"
            >累計 {{ previousCumulative(steps.length).water + newStep.water_delta_ml }}ml</small
          >
        </div>
        <input v-model="newStep.notes" placeholder="メモ（任意）" />
        <button class="btn" :disabled="saving" @click="addStep">追加</button>
      </div>
    </div>
  </div>
</template>
