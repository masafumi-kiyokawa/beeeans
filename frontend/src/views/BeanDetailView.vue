<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { deleteBean, getBean, listRecipes } from "../api/client";
import type { Bean, Recipe } from "../types";
import { isSafePurchaseUrl } from "../utils/url";
import { beanSpecItems, recipeSpecItems } from "../utils/specItems";
import SectionHeader from "../components/SectionHeader.vue";
import AsyncListShell from "../components/AsyncListShell.vue";
import SpecList from "../components/SpecList.vue";

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
    <SectionHeader :title="bean.name">
      <template #actions>
        <div class="btn-row">
          <RouterLink class="btn btn-secondary" :to="`/beans/${bean.id}/edit`">編集</RouterLink>
          <button class="btn btn-danger" @click="onDelete">削除</button>
        </div>
      </template>
    </SectionHeader>

    <div class="card">
      <SpecList
        v-if="bean.origin || bean.roaster || bean.roast_level || bean.roast_date"
        :items="beanSpecItems(bean)"
      />
      <p v-if="bean.purchase_url">
        <a v-if="safeUrl" :href="safeUrl" target="_blank" rel="noopener noreferrer"
          >購入ページを開く</a
        >
        <span v-else class="muted">購入元URLが無効なため表示できません</span>
      </p>
      <p v-if="bean.notes">{{ bean.notes }}</p>
    </div>

    <SectionHeader title="このコーヒー豆を使うレシピ">
      <template #actions>
        <RouterLink class="btn" :to="`/recipes/new?bean_id=${bean.id}`">新規レシピ</RouterLink>
      </template>
    </SectionHeader>
    <AsyncListShell :is-empty="recipes.length === 0">
      <template #empty>この豆を使うレシピはまだありません。</template>
      <div v-for="recipe in recipes" :key="recipe.id" class="card">
        <SectionHeader>
          <RouterLink :to="`/recipes/${recipe.id}`"
            ><strong>{{ recipe.name }}</strong></RouterLink
          >
        </SectionHeader>
        <SpecList :items="recipeSpecItems(recipe)" />
        <div class="btn-row">
          <RouterLink class="btn btn-secondary" :to="`/recipes/${recipe.id}`">詳細</RouterLink>
          <RouterLink class="btn btn-secondary" :to="`/recipes/${recipe.id}/edit`">編集</RouterLink>
        </div>
      </div>
    </AsyncListShell>
  </div>
</template>
