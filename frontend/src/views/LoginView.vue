<script setup lang="ts">
import { reactive, ref } from "vue";
import { useRouter } from "vue-router";
import { login } from "../auth/session";
import SectionHeader from "../components/SectionHeader.vue";

const router = useRouter();

const form = reactive({ email: "", password: "" });
const errorMessage = ref<string | null>(null);
const saving = ref(false);

function describeError(e: unknown, fallback: string) {
  return e instanceof Error ? e.message : fallback;
}

async function onSubmit() {
  errorMessage.value = null;
  saving.value = true;
  try {
    await login(form.email, form.password);
    router.push("/");
  } catch (e) {
    errorMessage.value = describeError(e, "ログインに失敗しました。");
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div>
    <SectionHeader title="ログイン" />
    <p v-if="errorMessage" class="form-error">{{ errorMessage }}</p>
    <form class="card" @submit.prevent="onSubmit">
      <div class="form-row">
        <label for="email">メールアドレス</label>
        <input id="email" v-model="form.email" type="email" required />
      </div>
      <div class="form-row">
        <label for="password">パスワード</label>
        <input id="password" v-model="form.password" type="password" required />
      </div>
      <div class="btn-row btn-row-center">
        <button class="btn" type="submit" :disabled="saving">
          {{ saving ? "ログイン中..." : "ログイン" }}
        </button>
        <RouterLink class="btn btn-secondary" to="/register">新規登録はこちら</RouterLink>
      </div>
    </form>
  </div>
</template>
