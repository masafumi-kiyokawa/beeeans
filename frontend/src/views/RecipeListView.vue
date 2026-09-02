<script setup lang="ts">
import { onMounted, ref } from "vue";
import { deleteRecipe, listBeans, listRecipes } from "../api/client";
import type { Recipe } from "../types";
import SectionHeader from "../components/SectionHeader.vue";
import AsyncListShell from "../components/AsyncListShell.vue";

const recipes = ref<Recipe[]>([]);
const beanNameById = ref(new Map<string, string>());
const loading = ref(true);

async function load() {
  loading.value = true;
  const [loadedRecipes, beans] = await Promise.all([listRecipes(), listBeans()]);
  recipes.value = loadedRecipes;
  beanNameById.value = new Map(beans.map((b) => [b.id, b.name]));
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
    <SectionHeader title="レシピ一覧">
      <template #actions>
        <RouterLink class="btn" to="/recipes/new">新規レシピ</RouterLink>
      </template>
    </SectionHeader>

    <AsyncListShell :loading="loading" :is-empty="recipes.length === 0">
      <template #empty>まだレシピがありません。「新規レシピ」から作成してください。</template>
      <div v-for="recipe in recipes" :key="recipe.id" class="card">
        <SectionHeader>
          <RouterLink :to="`/recipes/${recipe.id}`"
            ><strong>{{ recipe.name }}</strong></RouterLink
          >
        </SectionHeader>
        <p class="muted" v-if="recipe.bean_id && beanNameById.get(recipe.bean_id)">
          {{ beanNameById.get(recipe.bean_id) }}
        </p>
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
    </AsyncListShell>
  </div>
</template>
