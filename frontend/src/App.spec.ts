import { flushPromises, mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./auth/session", async () => {
  const { ref } = await import("vue");
  return {
    currentUser: ref(null),
    logout: vi.fn().mockResolvedValue(undefined),
    refreshCurrentUser: vi.fn().mockResolvedValue(undefined),
  };
});

import App from "./App.vue";
import { currentUser, logout, refreshCurrentUser } from "./auth/session";

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/", component: { template: "<div>home</div>" } },
      { path: "/recipes/:id", component: { template: "<div>recipe detail</div>" } },
      { path: "/beans", component: { template: "<div>beans</div>" } },
      { path: "/logs", component: { template: "<div>logs</div>" } },
      { path: "/logs/new", component: { template: "<div>log new</div>" } },
      { path: "/login", component: { template: "<div>login</div>" } },
      { path: "/register", component: { template: "<div>register</div>" } },
    ],
  });
}

describe("App.vue", () => {
  beforeEach(() => {
    currentUser.value = null;
    vi.mocked(logout).mockClear();
    vi.mocked(refreshCurrentUser).mockClear();
  });

  it("calls refreshCurrentUser on mount", async () => {
    const router = makeRouter();
    await router.push("/");
    await router.isReady();
    mount(App, { global: { plugins: [router] } });
    expect(refreshCurrentUser).toHaveBeenCalledTimes(1);
  });

  it("always shows nav links to / and /logs regardless of auth state", async () => {
    const router = makeRouter();
    await router.push("/");
    await router.isReady();
    const wrapper = mount(App, { global: { plugins: [router] } });
    expect(wrapper.text()).toContain("レシピ");
    expect(wrapper.text()).toContain("抽出ログ");
  });

  it("shows login/register links and hides email/logout when logged out", async () => {
    const router = makeRouter();
    await router.push("/");
    await router.isReady();
    const wrapper = mount(App, { global: { plugins: [router] } });
    expect(wrapper.text()).toContain("ログイン");
    expect(wrapper.text()).toContain("新規登録");
    expect(wrapper.text()).not.toContain("ログアウト");
  });

  it("shows the user's email and a logout link when logged in", async () => {
    currentUser.value = {
      id: "u1",
      email: "a@example.com",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    };
    const router = makeRouter();
    await router.push("/");
    await router.isReady();
    const wrapper = mount(App, { global: { plugins: [router] } });
    expect(wrapper.text()).toContain("a@example.com");
    expect(wrapper.text()).toContain("ログアウト");
    expect(wrapper.text()).not.toContain("ログイン");
  });

  it("keeps the レシピ link marked active while on a nested recipe route", async () => {
    const router = makeRouter();
    await router.push("/recipes/r1");
    await router.isReady();
    const wrapper = mount(App, { global: { plugins: [router] } });
    const links = wrapper.findAll("a");
    const recipesLink = links.find((l) => l.text() === "レシピ");
    const logsLink = links.find((l) => l.text() === "抽出ログ");
    expect(recipesLink?.classes()).toContain("active");
    expect(logsLink?.classes()).not.toContain("active");
  });

  it("keeps the 抽出ログ link marked active while on /logs/new", async () => {
    const router = makeRouter();
    await router.push("/logs/new");
    await router.isReady();
    const wrapper = mount(App, { global: { plugins: [router] } });
    const logsLink = wrapper.findAll("a").find((l) => l.text() === "抽出ログ");
    expect(logsLink?.classes()).toContain("active");
  });

  it("toggle button's aria-label reflects the open/closed state", async () => {
    const router = makeRouter();
    await router.push("/");
    await router.isReady();
    const wrapper = mount(App, { global: { plugins: [router] } });
    const toggle = wrapper.find("button.app-nav-toggle");
    expect(toggle.attributes("aria-label")).toBe("メニューを開く");

    await toggle.trigger("click");
    expect(toggle.attributes("aria-label")).toBe("メニューを閉じる");
  });

  it("clicking logout calls logout() then navigates to /", async () => {
    currentUser.value = {
      id: "u1",
      email: "a@example.com",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    };
    const router = makeRouter();
    await router.push("/logs");
    await router.isReady();
    const wrapper = mount(App, { global: { plugins: [router] } });
    const push = vi.spyOn(router, "push");

    await wrapper.find("a[href='#']").trigger("click");
    await flushPromises();

    expect(logout).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith("/");
  });
});
