<script setup lang="ts">
import { deleteBrewLog } from "../api/client";
import type { BrewLog, BrewLogWithRecipeName } from "../types";
import SectionHeader from "./SectionHeader.vue";

const props = defineProps<{
  log: BrewLog | BrewLogWithRecipeName;
  showRecipeName?: boolean;
}>();

const emit = defineEmits<{ deleted: [] }>();

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function onDelete() {
  if (!confirm("このログを削除しますか？")) return;
  await deleteBrewLog(props.log.id);
  emit("deleted");
}

function isWithRecipeName(log: BrewLog | BrewLogWithRecipeName): log is BrewLogWithRecipeName {
  return "recipe_name" in log;
}
</script>

<template>
  <div class="card">
    <SectionHeader>
      <div>
        <strong v-if="showRecipeName && isWithRecipeName(log)">{{ log.recipe_name }}</strong>
        <span class="muted">{{ formatDate(log.brewed_at) }}</span>
      </div>
      <template #actions>
        <span class="rating-stars" role="img" :aria-label="`評価 5段階中${log.rating}`">
          <span v-for="n in 5" :key="n" :class="{ active: n <= log.rating }" aria-hidden="true"
            >★</span
          >
        </span>
      </template>
    </SectionHeader>
    <p v-if="log.notes">{{ log.notes }}</p>
    <div class="btn-row">
      <RouterLink class="btn btn-secondary" :to="`/logs/${log.id}/edit`">編集</RouterLink>
      <button class="btn btn-danger" @click="onDelete">削除</button>
    </div>
  </div>
</template>
