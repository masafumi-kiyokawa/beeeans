<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { currentUser, logout, refreshCurrentUser } from "./auth/session";

const router = useRouter();
const navOpen = ref(false);

onMounted(refreshCurrentUser);

async function onLogout() {
  navOpen.value = false;
  await logout();
  router.push("/");
}
</script>

<template>
  <div class="app-shell">
    <header class="app-header">
      <h1 class="app-title">beans</h1>
      <button
        class="app-nav-toggle"
        type="button"
        :aria-expanded="navOpen"
        aria-controls="app-nav"
        aria-label="メニューを開く"
        @click="navOpen = !navOpen"
      >
        ☰
      </button>
      <nav id="app-nav" class="app-nav" :class="{ open: navOpen }">
        <RouterLink to="/" @click="navOpen = false">レシピ</RouterLink>
        <RouterLink to="/beans" @click="navOpen = false">豆</RouterLink>
        <RouterLink to="/logs" @click="navOpen = false">抽出ログ</RouterLink>
        <template v-if="currentUser">
          <span class="muted">{{ currentUser.email }}</span>
          <a href="#" @click.prevent="onLogout">ログアウト</a>
        </template>
        <template v-else>
          <RouterLink to="/login" @click="navOpen = false">ログイン</RouterLink>
          <RouterLink to="/register" @click="navOpen = false">新規登録</RouterLink>
        </template>
      </nav>
    </header>
    <main class="app-main">
      <RouterView />
    </main>
  </div>
</template>
