import { flushPromises, mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

const sessionMocks = vi.hoisted(() => ({ login: vi.fn() }));
vi.mock("../auth/session", () => sessionMocks);

import LoginView from "./LoginView.vue";

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/", component: { template: "<div>home</div>" } },
      { path: "/login", component: LoginView },
      { path: "/register", component: { template: "<div>register</div>" } },
    ],
  });
}

async function mountView() {
  const router = makeRouter();
  await router.push("/login");
  await router.isReady();
  const wrapper = mount(LoginView, { global: { plugins: [router] } });
  return { wrapper, router };
}

describe("LoginView.vue", () => {
  beforeEach(() => {
    sessionMocks.login.mockReset();
  });

  it("navigates to / on successful login", async () => {
    sessionMocks.login.mockResolvedValue(undefined);
    const { wrapper, router } = await mountView();
    const push = vi.spyOn(router, "push");
    await wrapper.find("#email").setValue("a@example.com");
    await wrapper.find("#password").setValue("secret");
    await wrapper.find("form").trigger("submit");
    await flushPromises();

    expect(sessionMocks.login).toHaveBeenCalledWith("a@example.com", "secret");
    expect(push).toHaveBeenCalledWith("/");
    expect(wrapper.find(".form-error").exists()).toBe(false);
  });

  it("shows the Error's message when login rejects with an Error", async () => {
    sessionMocks.login.mockRejectedValue(new Error("invalid credentials"));
    const { wrapper } = await mountView();
    await wrapper.find("form").trigger("submit");
    await flushPromises();

    expect(wrapper.find(".form-error").text()).toBe("invalid credentials");
  });

  it("shows the fallback message when login rejects with a non-Error value", async () => {
    sessionMocks.login.mockRejectedValue("oops");
    const { wrapper } = await mountView();
    await wrapper.find("form").trigger("submit");
    await flushPromises();

    expect(wrapper.find(".form-error").text()).toBe("ログインに失敗しました。");
  });

  it("disables the submit button and shows the in-progress label while saving", async () => {
    let resolveLogin!: () => void;
    sessionMocks.login.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveLogin = resolve;
      }),
    );
    const { wrapper } = await mountView();

    await wrapper.find("form").trigger("submit");
    expect(wrapper.find("button[type='submit']").attributes("disabled")).toBeDefined();
    expect(wrapper.find("button[type='submit']").text()).toBe("ログイン中...");

    resolveLogin();
    await flushPromises();

    expect(wrapper.find("button[type='submit']").attributes("disabled")).toBeUndefined();
    expect(wrapper.find("button[type='submit']").text()).toBe("ログイン");
  });
});
