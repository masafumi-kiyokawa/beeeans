<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { createRecipe, getRecipe, updateRecipe } from "../api/client";
import { loadLastRecipeInput, saveLastRecipeInput } from "../storage/lastRecipeInput";

const route = useRoute();
const router = useRouter();

const recipeId = computed(() => {
  const id = route.params.id;
  return id ? String(id) : null;
});
const isEdit = computed(() => recipeId.value !== null);

const form = reactive({
  name: "",
  bean_origin: "",
  dose_g: 20,
  water_ml: 300,
  water_temp_c: 92,
  grind_size: "",
  total_time_sec: null as number | null,
  notes: "",
});

const saving = ref(false);

onMounted(async () => {
  if (recipeId.value !== null) {
    const recipe = await getRecipe(recipeId.value);
    form.name = recipe.name;
    form.bean_origin = recipe.bean_origin ?? "";
    form.dose_g = recipe.dose_g;
    form.water_ml = recipe.water_ml;
    form.water_temp_c = recipe.water_temp_c;
    form.grind_size = recipe.grind_size ?? "";
    form.total_time_sec = recipe.total_time_sec;
    form.notes = recipe.notes ?? "";
  } else {
    const lastInput = loadLastRecipeInput();
    if (lastInput) {
      form.name = lastInput.name;
      form.bean_origin = lastInput.bean_origin;
      form.dose_g = lastInput.dose_g;
      form.water_ml = lastInput.water_ml;
      form.water_temp_c = lastInput.water_temp_c;
      form.grind_size = lastInput.grind_size;
      form.total_time_sec = lastInput.total_time_sec;
      form.notes = lastInput.notes;
    }
  }
});

async function onSubmit() {
  saving.value = true;
  const payload = {
    name: form.name,
    bean_origin: form.bean_origin || null,
    dose_g: form.dose_g,
    water_ml: form.water_ml,
    water_temp_c: form.water_temp_c,
    grind_size: form.grind_size || null,
    total_time_sec: form.total_time_sec,
    notes: form.notes || null,
  };
  try {
    if (isEdit.value && recipeId.value !== null) {
      await updateRecipe(recipeId.value, payload);
      router.push(`/recipes/${recipeId.value}`);
    } else {
      const recipe = await createRecipe(payload);
      saveLastRecipeInput({
        name: form.name,
        bean_origin: form.bean_origin,
        dose_g: form.dose_g,
        water_ml: form.water_ml,
        water_temp_c: form.water_temp_c,
        grind_size: form.grind_size,
        total_time_sec: form.total_time_sec,
        notes: form.notes,
      });
      router.push(`/recipes/${recipe.id}`);
    }
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div>
    <h2>{{ isEdit ? "レシピを編集" : "新規レシピ" }}</h2>
    <form class="card" @submit.prevent="onSubmit">
      <div class="form-row">
        <label for="name">レシピ名</label>
        <input id="name" v-model="form.name" required />
      </div>
      <div class="form-row">
        <label for="origin">豆の産地・銘柄</label>
        <input id="origin" v-model="form.bean_origin" placeholder="例: エチオピア イルガチェフェ" />
      </div>
      <div class="form-grid">
        <div class="form-row">
          <label for="dose">豆の量 (g)</label>
          <input id="dose" v-model.number="form.dose_g" type="number" step="0.1" min="0" required />
        </div>
        <div class="form-row">
          <label for="water">湯量 (ml)</label>
          <input
            id="water"
            v-model.number="form.water_ml"
            type="number"
            step="1"
            min="0"
            required
          />
        </div>
        <div class="form-row">
          <label for="temp">湯温 (℃)</label>
          <input
            id="temp"
            v-model.number="form.water_temp_c"
            type="number"
            step="0.5"
            min="0"
            required
          />
        </div>
        <div class="form-row">
          <label for="grind">挽き目</label>
          <input id="grind" v-model="form.grind_size" placeholder="例: 中細挽き" />
        </div>
        <div class="form-row">
          <label for="total-time">総抽出時間 (秒)</label>
          <input
            id="total-time"
            v-model.number="form.total_time_sec"
            type="number"
            step="1"
            min="0"
          />
        </div>
      </div>
      <div class="form-row">
        <label for="notes">メモ</label>
        <textarea id="notes" v-model="form.notes" rows="3"></textarea>
      </div>
      <div class="btn-row">
        <button class="btn" type="submit" :disabled="saving">
          {{ saving ? "保存中..." : "保存" }}
        </button>
        <RouterLink class="btn btn-secondary" :to="isEdit ? `/recipes/${recipeId}` : '/'"
          >キャンセル</RouterLink
        >
      </div>
    </form>
  </div>
</template>
