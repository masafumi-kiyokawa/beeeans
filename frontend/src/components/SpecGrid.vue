<script setup lang="ts">
defineProps<{ items: { label: string; value: string }[] }>();
</script>

<template>
  <dl class="grid-12 spec-grid">
    <div class="spec-cell" v-for="item in items" :key="item.label">
      <dt>{{ item.label }}</dt>
      <dd>{{ item.value }}</dd>
    </div>
  </dl>
</template>
