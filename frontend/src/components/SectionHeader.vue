<script setup lang="ts">
defineProps<{ title?: string }>();
</script>

<template>
  <div class="section-title">
    <h2 v-if="title">{{ title }}</h2>
    <slot v-else />
    <slot name="actions" />
  </div>
</template>
