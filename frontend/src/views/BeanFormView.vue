<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { createBean, getBean, updateBean } from "../api/client";
import SectionHeader from "../components/SectionHeader.vue";
import { isSafePurchaseUrl } from "../utils/url";

const route = useRoute();
const router = useRouter();

const beanId = computed(() => {
  const id = route.params.id;
  return id ? String(id) : null;
});
const isEdit = computed(() => beanId.value !== null);

const form = reactive({
  name: "",
  origin: "",
  roaster: "",
  roast_level: "",
  roast_date: "",
  purchase_url: "",
  notes: "",
});

const saving = ref(false);
const error = ref("");

onMounted(async () => {
  if (beanId.value !== null) {
    const bean = await getBean(beanId.value);
    form.name = bean.name;
    form.origin = bean.origin ?? "";
    form.roaster = bean.roaster ?? "";
    form.roast_level = bean.roast_level ?? "";
    form.roast_date = bean.roast_date ? bean.roast_date.slice(0, 10) : "";
    form.purchase_url = bean.purchase_url ?? "";
    form.notes = bean.notes ?? "";
  }
});

async function onSubmit() {
  error.value = "";
  const purchaseUrl = form.purchase_url.trim();
  if (purchaseUrl && !isSafePurchaseUrl(purchaseUrl)) {
    error.value =
      "購入元URLはhttp(s)から始まる外部URLを入力してください(ローカル/プライベートアドレスは使用できません)。";
    return;
  }
  saving.value = true;
  const payload = {
    name: form.name,
    origin: form.origin || null,
    roaster: form.roaster || null,
    roast_level: form.roast_level || null,
    roast_date: form.roast_date ? new Date(form.roast_date).toISOString() : null,
    purchase_url: purchaseUrl || null,
    notes: form.notes || null,
  };
  try {
    if (isEdit.value && beanId.value !== null) {
      await updateBean(beanId.value, payload);
    } else {
      await createBean(payload);
    }
    router.push("/beans");
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div>
    <SectionHeader :title="isEdit ? '豆を編集' : '新規の豆'" />
    <form class="card" @submit.prevent="onSubmit">
      <div class="form-row">
        <label for="name">豆の名前</label>
        <input id="name" v-model="form.name" required />
      </div>
      <div class="form-grid">
        <div class="form-row">
          <label for="origin">産地</label>
          <input id="origin" v-model="form.origin" placeholder="例: エチオピア イルガチェフェ" />
        </div>
        <div class="form-row">
          <label for="roaster">焙煎所・購入店</label>
          <input id="roaster" v-model="form.roaster" />
        </div>
        <div class="form-row">
          <label for="roast-level">焙煎度</label>
          <input id="roast-level" v-model="form.roast_level" placeholder="例: 中煎り" />
        </div>
        <div class="form-row">
          <label for="roast-date">焙煎日</label>
          <input id="roast-date" v-model="form.roast_date" type="date" />
        </div>
      </div>
      <div class="form-row">
        <label for="purchase-url">購入元URL</label>
        <input
          id="purchase-url"
          v-model="form.purchase_url"
          type="url"
          placeholder="https://example.com/products/..."
        />
      </div>
      <div class="form-row">
        <label for="notes">メモ</label>
        <textarea id="notes" v-model="form.notes" rows="3"></textarea>
      </div>
      <p v-if="error" class="form-error">{{ error }}</p>
      <div class="btn-row">
        <button class="btn" type="submit" :disabled="saving">
          {{ saving ? "保存中..." : "保存" }}
        </button>
        <RouterLink class="btn btn-secondary" to="/beans">キャンセル</RouterLink>
      </div>
    </form>
  </div>
</template>
