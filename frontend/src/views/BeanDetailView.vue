<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { deleteBean, getBean, listRecipes } from "../api/client";
import type { Bean, Recipe } from "../types";
import { isSafePurchaseUrl } from "../utils/url";

const props = defineProps<{ id: string }>();
const router = useRouter();

const bean = ref<Bean | null>(null);
const recipes = ref<Recipe[]>([]);
const loading = ref(true);

const safeUrl = computed(() => {
  const url = bean.value?.purchase_url;
  return url && isSafePurchaseUrl(url) ? url : null;
});

async function load() {
  loading.value = true;
  bean.value = await getBean(props.id);
  const allRecipes = await listRecipes();
  recipes.value = allRecipes.filter((r) => r.bean_id === props.id);
  loading.value = false;
}

onMounted(load);

async function onDelete() {
  if (!bean.value) return;
  if (!confirm(`「${bean.value.name}」を削除しますか？`)) return;
  await deleteBean(bean.value.id);
  router.push("/beans");
}
</script>

<template>
  <div v-if="loading" class="muted">読み込み中...</div>
  <div v-else-if="bean">
    <div class="section-title">
      <h2>{{ bean.name }}</h2>
      <div class="btn-row">
        <RouterLink class="btn btn-secondary" :to="`/beans/${bean.id}/edit`">編集</RouterLink>
        <button class="btn btn-danger" @click="onDelete">削除</button>
      </div>
    </div>

    <div class="card">
      <p class="muted" v-if="bean.origin || bean.roaster">
        {{ [bean.origin, bean.roaster].filter(Boolean).join(" / ") }}
      </p>
      <p class="muted" v-if="bean.roast_level || bean.roast_date">
        <template v-if="bean.roast_level">{{ bean.roast_level }}</template>
        <template v-if="bean.roast_date"> / 焙煎日 {{ bean.roast_date.slice(0, 10) }}</template>
      </p>
      <p v-if="bean.purchase_url">
        <a v-if="safeUrl" :href="safeUrl" target="_blank" rel="noopener noreferrer"
          >購入ページを開く</a
        >
        <span v-else class="muted">購入元URLが無効なため表示できません</span>
      </p>
      <p v-if="bean.notes">{{ bean.notes }}</p>
    </div>

    <div class="section-title">
      <h2>このコーヒー豆を使うレシピ</h2>
      <RouterLink class="btn" :to="`/recipes/new?bean_id=${bean.id}`">新規レシピ</RouterLink>
    </div>
    <p v-if="recipes.length === 0" class="empty-state">この豆を使うレシピはまだありません。</p>
    <div v-else class="card-list">
      <div v-for="recipe in recipes" :key="recipe.id" class="card">
        <div class="section-title">
          <RouterLink :to="`/recipes/${recipe.id}`"
            ><strong>{{ recipe.name }}</strong></RouterLink
          >
        </div>
        <p class="muted">
          豆 {{ recipe.dose_g }}g / 湯 {{ recipe.water_ml }}ml / {{ recipe.water_temp_c }}℃
        </p>
        <div class="btn-row">
          <RouterLink class="btn btn-secondary" :to="`/recipes/${recipe.id}`">詳細</RouterLink>
          <RouterLink class="btn btn-secondary" :to="`/recipes/${recipe.id}/edit`">編集</RouterLink>
        </div>
      </div>
    </div>
  </div>
</template>
