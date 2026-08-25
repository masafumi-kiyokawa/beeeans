<script setup lang="ts">
</script>

<template>
  <div class="app-shell">
    <header class="app-header">
      <h1 class="app-title">beans</h1>
      <nav class="app-nav">
        <RouterLink to="/">レシピ</RouterLink>
        <RouterLink to="/logs">抽出ログ</RouterLink>
      </nav>
    </header>
    <main class="app-main">
      <RouterView />
    </main>
  </div>
</template>
