<script setup lang="ts">
import { onMounted } from "vue";
import { useRouter } from "vue-router";
import { currentUser, logout, refreshCurrentUser } from "./auth/session";

const router = useRouter();

onMounted(refreshCurrentUser);

async function onLogout() {
  await logout();
  router.push("/");
}
</script>

<template>
  <div class="app-shell">
    <header class="app-header">
      <h1 class="app-title">beans</h1>
      <nav class="app-nav">
        <RouterLink to="/">レシピ</RouterLink>
        <RouterLink to="/beans">豆</RouterLink>
        <RouterLink to="/logs">抽出ログ</RouterLink>
        <template v-if="currentUser">
          <span class="muted">{{ currentUser.email }}</span>
          <a href="#" @click.prevent="onLogout">ログアウト</a>
        </template>
        <template v-else>
          <RouterLink to="/login">ログイン</RouterLink>
          <RouterLink to="/register">新規登録</RouterLink>
        </template>
      </nav>
    </header>
    <main class="app-main">
      <RouterView />
    </main>
  </div>
</template>
