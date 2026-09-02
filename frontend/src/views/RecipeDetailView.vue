<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { deleteRecipe, getBean, getRecipe, listBrewLogs } from "../api/client";
import type { Bean, BrewLog, RecipeDetail } from "../types";
import PourStepEditor from "../components/PourStepEditor.vue";
import BrewLogCard from "../components/BrewLogCard.vue";
import SectionHeader from "../components/SectionHeader.vue";

const props = defineProps<{ id: string }>();
const router = useRouter();

const recipe = ref<RecipeDetail | null>(null);
const logs = ref<BrewLog[]>([]);
const bean = ref<Bean | null>(null);
const loading = ref(true);

async function load() {
  loading.value = true;
  recipe.value = await getRecipe(props.id);
  logs.value = await listBrewLogs(props.id);
  bean.value = recipe.value.bean_id ? await getBean(recipe.value.bean_id).catch(() => null) : null;
  loading.value = false;
}

onMounted(load);

async function onDelete() {
  if (!recipe.value) return;
  if (
    !confirm(
      `「${recipe.value.name}」を削除しますか？関連する注湯ステップと抽出ログも削除されます。`,
    )
  ) {
    return;
  }
  await deleteRecipe(recipe.value.id);
  router.push("/");
}
</script>

<template>
  <div v-if="loading" class="muted">読み込み中...</div>
  <div v-else-if="recipe">
    <SectionHeader :title="recipe.name">
      <template #actions>
        <div class="btn-row">
          <RouterLink class="btn" :to="`/recipes/${recipe.id}/brew`">タイマー開始</RouterLink>
          <RouterLink class="btn btn-secondary" :to="`/logs/new?recipe_id=${recipe.id}`"
            >ログを記録</RouterLink
          >
          <RouterLink class="btn btn-secondary" :to="`/recipes/${recipe.id}/edit`">編集</RouterLink>
          <button class="btn btn-danger" @click="onDelete">削除</button>
        </div>
      </template>
    </SectionHeader>

    <div class="card">
      <p v-if="bean" class="muted">
        使用した豆: <RouterLink :to="`/beans/${bean.id}`">{{ bean.name }}</RouterLink>
      </p>
      <p>
        豆 {{ recipe.dose_g }}g / 湯 {{ recipe.water_ml }}ml / {{ recipe.water_temp_c }}℃
        <template v-if="recipe.grind_size"> / 挽き目 {{ recipe.grind_size }}</template>
        <template v-if="recipe.total_time_sec"> / 総時間 {{ recipe.total_time_sec }}秒</template>
      </p>
      <p v-if="recipe.notes">{{ recipe.notes }}</p>
    </div>

    <SectionHeader title="注湯ステップ" />
    <div class="card">
      <PourStepEditor :recipe-id="recipe.id" />
    </div>

    <SectionHeader title="抽出ログ" />
    <p v-if="logs.length === 0" class="empty-state">まだログがありません。</p>
    <div v-else class="card-list">
      <BrewLogCard v-for="log in logs" :key="log.id" :log="log" @deleted="load" />
    </div>
  </div>
</template>
