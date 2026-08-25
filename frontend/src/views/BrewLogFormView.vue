<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { createBrewLog, getBrewLog, listRecipes, updateBrewLog } from '../api/client'
import type { Recipe } from '../types'

const route = useRoute()
const router = useRouter()

const logId = computed(() => {
  const id = route.params.id
  return id ? Number(id) : null
})
const isEdit = computed(() => logId.value !== null)

const recipes = ref<Recipe[]>([])
const saving = ref(false)

function nowLocal() {
  const d = new Date()
  d.setSeconds(0, 0)
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}

const form = reactive({
  recipe_id: (route.query.recipe_id as string) ?? '',
  brewed_at: nowLocal(),
  rating: 3,
  notes: '',
})

onMounted(async () => {
  recipes.value = await listRecipes()
  if (logId.value !== null) {
    const log = await getBrewLog(logId.value)
    form.recipe_id = String(log.recipe_id)
    const d = new Date(log.brewed_at)
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
    form.brewed_at = d.toISOString().slice(0, 16)
    form.rating = log.rating
    form.notes = log.notes ?? ''
  } else if (!form.recipe_id && recipes.value.length > 0) {
    form.recipe_id = String(recipes.value[0].id)
  }
})

async function onSubmit() {
  saving.value = true
  const payload = {
    recipe_id: Number(form.recipe_id),
    brewed_at: new Date(form.brewed_at).toISOString(),
    rating: form.rating,
    notes: form.notes || null,
  }
  try {
    if (isEdit.value && logId.value !== null) {
      await updateBrewLog(logId.value, payload)
    } else {
      await createBrewLog(payload)
    }
    router.push(`/logs?recipe_id=${form.recipe_id}`)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div>
    <h2>{{ isEdit ? 'ログを編集' : 'ログを記録' }}</h2>
    <form class="card" @submit.prevent="onSubmit">
      <div class="form-row">
        <label for="recipe">レシピ</label>
        <select id="recipe" v-model="form.recipe_id" required>
          <option v-for="r in recipes" :key="r.id" :value="String(r.id)">{{ r.name }}</option>
        </select>
      </div>
      <div class="form-row">
        <label for="brewed-at">抽出日時</label>
        <input id="brewed-at" v-model="form.brewed_at" type="datetime-local" required />
      </div>
      <div class="form-row">
        <label>評価</label>
        <span class="rating-stars">
          <button
            v-for="n in 5"
            :key="n"
            type="button"
            :class="{ active: n <= form.rating }"
            @click="form.rating = n"
          >
            ★
          </button>
        </span>
      </div>
      <div class="form-row">
        <label for="notes">テイスティングメモ</label>
        <textarea id="notes" v-model="form.notes" rows="4" placeholder="味・香り・気づいたことなど"></textarea>
      </div>
      <div class="btn-row">
        <button class="btn" type="submit" :disabled="saving">{{ saving ? '保存中...' : '保存' }}</button>
        <RouterLink class="btn btn-secondary" to="/logs">キャンセル</RouterLink>
      </div>
    </form>
  </div>
</template>
