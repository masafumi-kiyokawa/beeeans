<script setup lang="ts">
defineProps<{ loading?: boolean; isEmpty: boolean }>();
</script>

<template>
  <p v-if="loading" class="muted">読み込み中...</p>
  <p v-else-if="isEmpty" class="empty-state"><slot name="empty" /></p>
  <div v-else class="card-list"><slot /></div>
</template>
