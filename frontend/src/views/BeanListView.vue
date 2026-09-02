<script setup lang="ts">
import { onMounted, ref } from "vue";
import { deleteBean, listBeans } from "../api/client";
import type { Bean } from "../types";
import { isSafePurchaseUrl } from "../utils/url";
import { beanSpecItems } from "../utils/specItems";
import SectionHeader from "../components/SectionHeader.vue";
import AsyncListShell from "../components/AsyncListShell.vue";
import SpecGrid from "../components/SpecGrid.vue";

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
    <SectionHeader title="豆一覧">
      <template #actions>
        <RouterLink class="btn" to="/beans/new">新規の豆</RouterLink>
      </template>
    </SectionHeader>

    <AsyncListShell :loading="loading" :is-empty="beans.length === 0">
      <template #empty>まだ豆が登録されていません。「新規の豆」から作成してください。</template>
      <div v-for="bean in beans" :key="bean.id" class="card">
        <SectionHeader>
          <strong>{{ bean.name }}</strong>
        </SectionHeader>
        <SpecGrid
          v-if="bean.origin || bean.roaster || bean.roast_level || bean.roast_date"
          :items="beanSpecItems(bean)"
        />
        <p v-if="bean.purchase_url">
          <a v-if="safeUrl(bean)" :href="safeUrl(bean)!" target="_blank" rel="noopener noreferrer"
            >購入ページを開く</a
          >
          <span v-else class="muted">購入元URLが無効なため表示できません</span>
        </p>
        <p class="muted" v-if="bean.notes">{{ bean.notes }}</p>
        <div class="btn-row">
          <RouterLink class="btn btn-secondary" :to="`/beans/${bean.id}`">詳細</RouterLink>
          <RouterLink class="btn btn-secondary" :to="`/beans/${bean.id}/edit`">編集</RouterLink>
          <button class="btn btn-danger" @click="onDelete(bean)">削除</button>
        </div>
      </div>
    </AsyncListShell>
  </div>
</template>
