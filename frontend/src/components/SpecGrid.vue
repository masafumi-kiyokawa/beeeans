<script setup lang="ts">
defineProps<{ items: { label: string; value: string }[] }>();
</script>

<template>
  <div class="grid-12">
    <div class="spec-cell" v-for="item in items" :key="item.label">
      <div>{{ item.label }}</div>
      <div>{{ item.value }}</div>
    </div>
  </div>
</template>
