<script setup lang="ts">
import { reactive, ref } from "vue";
import { useRouter } from "vue-router";
import { register } from "../auth/session";

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
    await register(form.email, form.password);
    router.push("/");
  } catch (e) {
    errorMessage.value = describeError(e, "登録に失敗しました。");
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div>
    <h2>新規登録</h2>
    <p v-if="errorMessage" class="form-error">{{ errorMessage }}</p>
    <form class="card" @submit.prevent="onSubmit">
      <div class="form-row">
        <label for="email">メールアドレス</label>
        <input id="email" v-model="form.email" type="email" required />
      </div>
      <div class="form-row">
        <label for="password">パスワード（8文字以上）</label>
        <input id="password" v-model="form.password" type="password" minlength="8" required />
      </div>
      <div class="btn-row btn-row-center">
        <button class="btn" type="submit" :disabled="saving">
          {{ saving ? "登録中..." : "登録" }}
        </button>
        <RouterLink class="btn btn-secondary" to="/login">ログインはこちら</RouterLink>
      </div>
    </form>
  </div>
</template>
