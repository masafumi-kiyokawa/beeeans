import { flushPromises, mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

const sessionMocks = vi.hoisted(() => ({ register: vi.fn() }));
vi.mock("../auth/session", () => sessionMocks);

import RegisterView from "./RegisterView.vue";

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/", component: { template: "<div>home</div>" } },
      { path: "/login", component: { template: "<div>login</div>" } },
      { path: "/register", component: RegisterView },
    ],
  });
}

async function mountView() {
  const router = makeRouter();
  await router.push("/register");
  await router.isReady();
  const wrapper = mount(RegisterView, { global: { plugins: [router] } });
  return { wrapper, router };
}

describe("RegisterView.vue", () => {
  beforeEach(() => {
    sessionMocks.register.mockReset();
  });

  it("navigates to / on successful registration", async () => {
    sessionMocks.register.mockResolvedValue(undefined);
    const { wrapper, router } = await mountView();
    const push = vi.spyOn(router, "push");
    await wrapper.find("#email").setValue("a@example.com");
    await wrapper.find("#password").setValue("longsecret");
    await wrapper.find("form").trigger("submit");
    await flushPromises();

    expect(sessionMocks.register).toHaveBeenCalledWith("a@example.com", "longsecret");
    expect(push).toHaveBeenCalledWith("/");
    expect(wrapper.find(".form-error").exists()).toBe(false);
  });

  it("shows the Error's message when register rejects with an Error", async () => {
    sessionMocks.register.mockRejectedValue(new Error("email already registered"));
    const { wrapper } = await mountView();
    await wrapper.find("form").trigger("submit");
    await flushPromises();

    expect(wrapper.find(".form-error").text()).toBe("email already registered");
  });

  it("shows the fallback message when register rejects with a non-Error value", async () => {
    sessionMocks.register.mockRejectedValue("oops");
    const { wrapper } = await mountView();
    await wrapper.find("form").trigger("submit");
    await flushPromises();

    expect(wrapper.find(".form-error").text()).toBe("登録に失敗しました。");
  });

  it("marks the password field with minlength=8 (presentational HTML5 constraint only)", async () => {
    // jsdom does not enforce HTML5 constraint validation the way a real browser
    // does, so this only asserts the attribute is present, not that it blocks
    // submission of a shorter password.
    const { wrapper } = await mountView();
    expect(wrapper.find("#password").attributes("minlength")).toBe("8");
  });

  it("disables the submit button and shows the in-progress label while saving", async () => {
    let resolveRegister!: () => void;
    sessionMocks.register.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveRegister = resolve;
      }),
    );
    const { wrapper } = await mountView();

    await wrapper.find("form").trigger("submit");
    expect(wrapper.find("button[type='submit']").attributes("disabled")).toBeDefined();
    expect(wrapper.find("button[type='submit']").text()).toBe("登録中...");

    resolveRegister();
    await flushPromises();

    expect(wrapper.find("button[type='submit']").attributes("disabled")).toBeUndefined();
    expect(wrapper.find("button[type='submit']").text()).toBe("登録");
  });
});
