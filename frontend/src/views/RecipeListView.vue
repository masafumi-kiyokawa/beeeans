<script setup lang="ts">
import { onMounted, ref } from "vue";
import { deleteRecipe, listRecipes } from "../api/client";
import type { Recipe } from "../types";

const recipes = ref<Recipe[]>([]);
const loading = ref(true);

async function load() {
  loading.value = true;
  recipes.value = await listRecipes();
  loading.value = false;
}

async function onDelete(recipe: Recipe) {
  if (
    !confirm(`「${recipe.name}」を削除しますか？関連する注湯ステップと抽出ログも削除されます。`)
  ) {
    return;
  }
  await deleteRecipe(recipe.id);
  await load();
}

onMounted(load);
</script>

<template>
  <div>
    <div class="section-title">
      <h2>レシピ一覧</h2>
      <RouterLink class="btn" to="/recipes/new">新規レシピ</RouterLink>
    </div>

    <p v-if="loading" class="muted">読み込み中...</p>
    <p v-else-if="recipes.length === 0" class="empty-state">
      まだレシピがありません。「新規レシピ」から作成してください。
    </p>

    <div v-else class="card-list">
      <div v-for="recipe in recipes" :key="recipe.id" class="card">
        <div class="section-title" style="margin-top: 0">
          <RouterLink :to="`/recipes/${recipe.id}`"
            ><strong>{{ recipe.name }}</strong></RouterLink
          >
        </div>
        <p class="muted" v-if="recipe.bean_origin">{{ recipe.bean_origin }}</p>
        <p class="muted">
          豆 {{ recipe.dose_g }}g / 湯 {{ recipe.water_ml }}ml / {{ recipe.water_temp_c }}℃
          <template v-if="recipe.grind_size"> / 挽き目 {{ recipe.grind_size }}</template>
        </p>
        <div class="btn-row">
          <RouterLink class="btn btn-secondary" :to="`/recipes/${recipe.id}`">詳細</RouterLink>
          <RouterLink class="btn btn-secondary" :to="`/recipes/${recipe.id}/brew`"
            >タイマー</RouterLink
          >
          <button class="btn btn-danger" @click="onDelete(recipe)">削除</button>
        </div>
      </div>
    </div>
  </div>
</template>
