import { flushPromises, mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

const clientMocks = vi.hoisted(() => ({
  createBean: vi.fn(),
  getBean: vi.fn(),
  updateBean: vi.fn(),
}));
vi.mock("../api/client", () => clientMocks);

import BeanFormView from "./BeanFormView.vue";

const existingBean = {
  id: "b1",
  name: "Existing",
  origin: null,
  roaster: null,
  roast_level: null,
  roast_date: null,
  purchase_url: null,
  notes: null,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/beans", component: { template: "<div>list</div>" } },
      { path: "/beans/new", component: BeanFormView },
      { path: "/beans/:id/edit", component: BeanFormView, props: true },
    ],
  });
}

async function mountCreate() {
  const router = makeRouter();
  await router.push("/beans/new");
  await router.isReady();
  const wrapper = mount(BeanFormView, { global: { plugins: [router] } });
  await flushPromises();
  return { wrapper, router };
}

async function mountEdit(id = "b1") {
  const router = makeRouter();
  await router.push(`/beans/${id}/edit`);
  await router.isReady();
  const wrapper = mount(BeanFormView, { global: { plugins: [router] } });
  await flushPromises();
  return { wrapper, router };
}

describe("BeanFormView.vue", () => {
  beforeEach(() => {
    clientMocks.createBean.mockReset();
    clientMocks.getBean.mockReset().mockResolvedValue(existingBean);
    clientMocks.updateBean.mockReset();
  });

  it("reads route.params.id itself to decide create vs edit", async () => {
    const { wrapper: createWrapper } = await mountCreate();
    expect(createWrapper.text()).toContain("新規の豆");
    expect(clientMocks.getBean).not.toHaveBeenCalled();

    const { wrapper: editWrapper } = await mountEdit("b1");
    expect(editWrapper.text()).toContain("豆を編集");
    expect(clientMocks.getBean).toHaveBeenCalledWith("b1");
  });

  it("submits createBean with the entered fields and navigates to /beans", async () => {
    clientMocks.createBean.mockResolvedValue({ ...existingBean, id: "new-id" });
    const { wrapper, router } = await mountCreate();
    const push = vi.spyOn(router, "push");
    await wrapper.find("#name").setValue("New Bean");
    await wrapper.find("#purchase-url").setValue("https://shop.example.com/item/1");
    await wrapper.find("form").trigger("submit");
    await flushPromises();

    expect(clientMocks.createBean).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "New Bean",
        purchase_url: "https://shop.example.com/item/1",
      }),
    );
    expect(push).toHaveBeenCalledWith("/beans");
  });

  it("rejects a javascript: purchase_url client-side without calling createBean (XSS defense)", async () => {
    const { wrapper } = await mountCreate();
    await wrapper.find("#name").setValue("New Bean");
    await wrapper.find("#purchase-url").setValue("javascript:alert(1)");
    await wrapper.find("form").trigger("submit");
    await flushPromises();

    expect(clientMocks.createBean).not.toHaveBeenCalled();
    expect(wrapper.find(".form-error").exists()).toBe(true);
  });

  it("rejects a loopback/private-host purchase_url client-side (SSRF defense-in-depth)", async () => {
    const { wrapper } = await mountCreate();
    await wrapper.find("#name").setValue("New Bean");
    await wrapper.find("#purchase-url").setValue("http://169.254.169.254/latest/meta-data/");
    await wrapper.find("form").trigger("submit");
    await flushPromises();

    expect(clientMocks.createBean).not.toHaveBeenCalled();
    expect(wrapper.find(".form-error").exists()).toBe(true);
  });

  it("converts an empty purchase_url to null on submit", async () => {
    clientMocks.createBean.mockResolvedValue({ ...existingBean, id: "new-id" });
    const { wrapper } = await mountCreate();
    await wrapper.find("#name").setValue("New Bean");
    await wrapper.find("form").trigger("submit");
    await flushPromises();

    expect(clientMocks.createBean).toHaveBeenCalledWith(
      expect.objectContaining({ purchase_url: null }),
    );
  });

  it("submits updateBean and navigates to /beans on edit", async () => {
    clientMocks.updateBean.mockResolvedValue(existingBean);
    const { wrapper, router } = await mountEdit();
    const push = vi.spyOn(router, "push");
    await wrapper.find("form").trigger("submit");
    await flushPromises();

    expect(clientMocks.updateBean).toHaveBeenCalledWith(
      "b1",
      expect.objectContaining({ origin: null, roaster: null, notes: null }),
    );
    expect(push).toHaveBeenCalledWith("/beans");
  });
});
