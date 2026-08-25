<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import {
  createPourStep,
  deletePourStep,
  listPourSteps,
  updatePourStep,
} from '../api/client'
import type { PourStep } from '../types'

const props = defineProps<{ recipeId: number }>()

const steps = ref<PourStep[]>([])
const loading = ref(true)
const editingId = ref<number | null>(null)
const editForm = reactive({ target_time_sec: 0, cumulative_water_ml: 0, notes: '' })
const errorMessage = ref<string | null>(null)

const newStep = reactive({ target_time_sec: 0, cumulative_water_ml: 0, notes: '' })

async function load() {
  loading.value = true
  steps.value = await listPourSteps(props.recipeId)
  loading.value = false
}

onMounted(load)

function formatTime(sec: number) {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function validateStepInput(input: { target_time_sec: number; cumulative_water_ml: number }) {
  if (!Number.isFinite(input.target_time_sec)) return '目標時間を入力してください。'
  if (!Number.isFinite(input.cumulative_water_ml) || input.cumulative_water_ml <= 0) {
    return '累積湯量は0より大きい値を入力してください。'
  }
  return null
}

function describeError(e: unknown, fallback: string) {
  return e instanceof Error ? e.message : fallback
}

async function addStep() {
  errorMessage.value = validateStepInput(newStep)
  if (errorMessage.value) return
  try {
    await createPourStep(props.recipeId, {
      target_time_sec: newStep.target_time_sec,
      cumulative_water_ml: newStep.cumulative_water_ml,
      notes: newStep.notes || null,
    })
    newStep.target_time_sec = 0
    newStep.cumulative_water_ml = 0
    newStep.notes = ''
    await load()
  } catch (e) {
    errorMessage.value = describeError(e, 'ステップの追加に失敗しました。')
  }
}

function startEdit(step: PourStep) {
  errorMessage.value = null
  editingId.value = step.id
  editForm.target_time_sec = step.target_time_sec
  editForm.cumulative_water_ml = step.cumulative_water_ml
  editForm.notes = step.notes ?? ''
}

function cancelEdit() {
  errorMessage.value = null
  editingId.value = null
}

async function saveEdit(step: PourStep) {
  errorMessage.value = validateStepInput(editForm)
  if (errorMessage.value) return
  try {
    await updatePourStep(props.recipeId, step.id, {
      target_time_sec: editForm.target_time_sec,
      cumulative_water_ml: editForm.cumulative_water_ml,
      notes: editForm.notes || null,
    })
    editingId.value = null
    await load()
  } catch (e) {
    errorMessage.value = describeError(e, 'ステップの保存に失敗しました。')
  }
}

async function removeStep(step: PourStep) {
  if (!confirm('このステップを削除しますか？')) return
  errorMessage.value = null
  try {
    await deletePourStep(props.recipeId, step.id)
    await load()
  } catch (e) {
    errorMessage.value = describeError(e, 'ステップの削除に失敗しました。')
  }
}

async function moveStep(index: number, direction: -1 | 1) {
  const target = steps.value[index + direction]
  const current = steps.value[index]
  if (!target || !current) return
  errorMessage.value = null
  try {
    const currentOrder = current.step_order
    const targetOrder = target.step_order
    await updatePourStep(props.recipeId, current.id, { step_order: targetOrder })
    await updatePourStep(props.recipeId, target.id, { step_order: currentOrder })
    await load()
  } catch (e) {
    errorMessage.value = describeError(e, 'ステップの並べ替えに失敗しました。')
  }
}
</script>

<template>
  <div>
    <p v-if="errorMessage" class="form-error">{{ errorMessage }}</p>
    <div class="step-row step-row-header">
      <span>#</span>
      <span>目標時間（秒）</span>
      <span>累積湯量（ml）</span>
      <span>メモ</span>
      <span>操作</span>
    </div>
    <p v-if="loading" class="muted">読み込み中...</p>
    <template v-else>
      <p v-if="steps.length === 0" class="empty-state">まだ注湯ステップがありません。</p>
      <div v-for="(step, index) in steps" :key="step.id" class="step-row">
        <template v-if="editingId === step.id">
          <span>{{ index + 1 }}</span>
          <input v-model.number="editForm.target_time_sec" type="number" min="0" title="目標時間(秒)" />
          <input
            v-model.number="editForm.cumulative_water_ml"
            type="number"
            min="0.1"
            step="0.1"
            title="累積湯量(ml)"
          />
          <input v-model="editForm.notes" placeholder="メモ" />
          <div class="btn-row">
            <button class="btn" @click="saveEdit(step)">保存</button>
            <button class="btn btn-secondary" @click="cancelEdit">取消</button>
          </div>
        </template>
        <template v-else>
          <span>{{ index + 1 }}</span>
          <span>{{ formatTime(step.target_time_sec) }}</span>
          <span>{{ step.cumulative_water_ml }}ml</span>
          <span class="muted">{{ step.notes }}</span>
          <div class="btn-row">
            <button class="btn btn-secondary" :disabled="index === 0" @click="moveStep(index, -1)">↑</button>
            <button
              class="btn btn-secondary"
              :disabled="index === steps.length - 1"
              @click="moveStep(index, 1)"
            >
              ↓
            </button>
            <button class="btn btn-secondary" @click="startEdit(step)">編集</button>
            <button class="btn btn-danger" @click="removeStep(step)">削除</button>
          </div>
        </template>
      </div>
    </template>

    <div class="form-row" style="margin-top: 1rem">
      <label>ステップを追加</label>
      <div class="step-row">
        <span>-</span>
        <input v-model.number="newStep.target_time_sec" type="number" min="0" placeholder="秒" />
        <input
          v-model.number="newStep.cumulative_water_ml"
          type="number"
          min="0.1"
          step="0.1"
          placeholder="累積ml"
        />
        <input v-model="newStep.notes" placeholder="メモ（任意）" />
        <button class="btn" @click="addStep">追加</button>
      </div>
    </div>
  </div>
</template>
