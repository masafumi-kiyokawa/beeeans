<script setup lang="ts">
import { onMounted, ref } from "vue";
import { deleteBean, listBeans } from "../api/client";
import type { Bean } from "../types";
import { isSafePurchaseUrl } from "../utils/url";

const beans = ref<Bean[]>([]);
const loading = ref(true);

async function load() {
  loading.value = true;
  beans.value = await listBeans();
  loading.value = false;
}

async function onDelete(bean: Bean) {
  if (!confirm(`「${bean.name}」を削除しますか？`)) return;
  await deleteBean(bean.id);
  await load();
}

// Defense-in-depth: only render purchase_url as a clickable link when it still
// passes the same http/https + non-private-host check enforced on save (see
// frontend/src/utils/url.ts). Never render it via v-html.
function safeUrl(bean: Bean): string | null {
  return bean.purchase_url && isSafePurchaseUrl(bean.purchase_url) ? bean.purchase_url : null;
}

onMounted(load);
</script>

<template>
  <div>
    <div class="section-title">
      <h2>豆一覧</h2>
      <RouterLink class="btn" to="/beans/new">新規の豆</RouterLink>
    </div>

    <p v-if="loading" class="muted">読み込み中...</p>
    <p v-else-if="beans.length === 0" class="empty-state">
      まだ豆が登録されていません。「新規の豆」から作成してください。
    </p>

    <div v-else class="card-list">
      <div v-for="bean in beans" :key="bean.id" class="card">
        <div class="section-title">
          <strong>{{ bean.name }}</strong>
        </div>
        <p class="muted" v-if="bean.origin || bean.roaster">
          {{ [bean.origin, bean.roaster].filter(Boolean).join(" / ") }}
        </p>
        <p class="muted" v-if="bean.roast_level || bean.roast_date">
          <template v-if="bean.roast_level">{{ bean.roast_level }}</template>
          <template v-if="bean.roast_date"> / 焙煎日 {{ bean.roast_date.slice(0, 10) }}</template>
        </p>
        <p v-if="bean.purchase_url">
          <a v-if="safeUrl(bean)" :href="safeUrl(bean)!" target="_blank" rel="noopener noreferrer"
            >購入ページを開く</a
          >
          <span v-else class="muted">購入元URLが無効なため表示できません</span>
        </p>
        <p class="muted" v-if="bean.notes">{{ bean.notes }}</p>
        <div class="btn-row">
          <RouterLink class="btn btn-secondary" :to="`/beans/${bean.id}/edit`">編集</RouterLink>
          <button class="btn btn-danger" @click="onDelete(bean)">削除</button>
        </div>
      </div>
    </div>
  </div>
</template>
