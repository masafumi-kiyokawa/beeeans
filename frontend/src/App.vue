<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { currentUser, logout, refreshCurrentUser } from "./auth/session";

const route = useRoute();
const router = useRouter();
const navOpen = ref(false);

const isRecipesActive = computed(() => route.path === "/" || route.path.startsWith("/recipes"));
const isBeansActive = computed(() => route.path.startsWith("/beans"));
const isLogsActive = computed(() => route.path.startsWith("/logs"));

onMounted(refreshCurrentUser);

async function onLogout() {
  navOpen.value = false;
  await logout();
  router.push("/");
}
</script>

<template>
  <div class="app-shell grid-12">
    <header class="app-header">
      <h1 class="app-title">beans</h1>
      <button
        class="app-nav-toggle btn btn-secondary"
        type="button"
        :aria-expanded="navOpen"
        aria-controls="app-nav"
        :aria-label="navOpen ? 'メニューを閉じる' : 'メニューを開く'"
        @click="navOpen = !navOpen"
      >
        ☰
      </button>
      <nav id="app-nav" class="app-nav" :class="{ open: navOpen }">
        <RouterLink to="/" :class="{ active: isRecipesActive }" @click="navOpen = false"
          >レシピ</RouterLink
        >
        <RouterLink to="/beans" :class="{ active: isBeansActive }" @click="navOpen = false"
          >豆</RouterLink
        >
        <RouterLink to="/logs" :class="{ active: isLogsActive }" @click="navOpen = false"
          >抽出ログ</RouterLink
        >
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
