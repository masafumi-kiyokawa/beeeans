<script setup lang="ts">
defineProps<{ items: { label: string; value: string }[] }>();
</script>

<template>
  <dl class="spec-list">
    <div class="spec-item" v-for="item in items" :key="item.label">
      <dt>{{ item.label }}</dt>
      <dd>{{ item.value }}</dd>
    </div>
  </dl>
</template>
