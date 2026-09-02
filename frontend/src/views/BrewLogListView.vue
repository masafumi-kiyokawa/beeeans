<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { listBrewLogs, listRecipes } from "../api/client";
import type { BrewLogWithRecipeName, Recipe } from "../types";
import BrewLogCard from "../components/BrewLogCard.vue";
import SectionHeader from "../components/SectionHeader.vue";

const route = useRoute();
const router = useRouter();

const logs = ref<BrewLogWithRecipeName[]>([]);
const recipes = ref<Recipe[]>([]);
const loading = ref(true);
const selectedRecipeId = ref<string>((route.query.recipe_id as string) ?? "");

async function load() {
  loading.value = true;
  const recipeId = selectedRecipeId.value || undefined;
  logs.value = await listBrewLogs(recipeId);
  loading.value = false;
}

onMounted(async () => {
  recipes.value = await listRecipes();
  await load();
});

watch(selectedRecipeId, (value) => {
  router.replace({ query: value ? { recipe_id: value } : {} });
  load();
});
</script>

<template>
  <div>
    <SectionHeader title="抽出ログ">
      <template #actions>
        <RouterLink class="btn" to="/logs/new">ログを記録</RouterLink>
      </template>
    </SectionHeader>

    <div class="form-row form-row-narrow">
      <label for="recipe-filter">レシピで絞り込み</label>
      <select id="recipe-filter" v-model="selectedRecipeId">
        <option value="">すべて</option>
        <option v-for="r in recipes" :key="r.id" :value="String(r.id)">{{ r.name }}</option>
      </select>
    </div>

    <p v-if="loading" class="muted">読み込み中...</p>
    <p v-else-if="logs.length === 0" class="empty-state">まだログがありません。</p>
    <div v-else class="card-list">
      <BrewLogCard v-for="log in logs" :key="log.id" :log="log" show-recipe-name @deleted="load" />
    </div>
  </div>
</template>
