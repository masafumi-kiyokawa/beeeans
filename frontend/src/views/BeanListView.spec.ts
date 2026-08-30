import { flushPromises, mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

const clientMocks = vi.hoisted(() => ({ listBeans: vi.fn(), deleteBean: vi.fn() }));
vi.mock("../api/client", () => clientMocks);

import BeanListView from "./BeanListView.vue";

const beanA = {
  id: "b1",
  name: "Bean A",
  origin: "Ethiopia",
  roaster: "Roaster A",
  roast_level: "中煎り",
  roast_date: "2026-01-01T00:00:00.000Z",
  purchase_url: "https://shop.example.com/products/bean-a",
  notes: "tasty",
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

const beanBUnsafeUrl = {
  ...beanA,
  id: "b2",
  name: "Bean B",
  purchase_url: "javascript:alert(1)",
};

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/beans", component: BeanListView },
      { path: "/beans/new", component: { template: "<div>new</div>" } },
      { path: "/beans/:id/edit", component: { template: "<div>edit</div>" } },
    ],
  });
}

async function mountView() {
  const router = makeRouter();
  await router.push("/beans");
  await router.isReady();
  const wrapper = mount(BeanListView, { global: { plugins: [router] } });
  await flushPromises();
  return wrapper;
}

describe("BeanListView.vue", () => {
  let confirmSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    clientMocks.listBeans.mockReset();
    clientMocks.deleteBean.mockReset();
    confirmSpy = vi.spyOn(window, "confirm");
  });

  it("shows the empty-state message when there are no beans", async () => {
    clientMocks.listBeans.mockResolvedValue([]);
    const wrapper = await mountView();
    expect(wrapper.text()).toContain("まだ豆が登録されていません");
  });

  it("renders a card per bean", async () => {
    clientMocks.listBeans.mockResolvedValue([beanA]);
    const wrapper = await mountView();
    const cards = wrapper.findAll(".card");
    expect(cards).toHaveLength(1);
    expect(cards[0].text()).toContain("Bean A");
    expect(cards[0].text()).toContain("Ethiopia");
    expect(cards[0].text()).toContain("Roaster A");
  });

  it("renders a safe http(s) purchase_url as a clickable link with noopener/noreferrer", async () => {
    clientMocks.listBeans.mockResolvedValue([beanA]);
    const wrapper = await mountView();
    const link = wrapper.find("a[target='_blank']");
    expect(link.exists()).toBe(true);
    expect(link.attributes("href")).toBe(beanA.purchase_url);
    expect(link.attributes("rel")).toBe("noopener noreferrer");
  });

  it("never renders an unsafe purchase_url (e.g. javascript:) as a link (XSS defense-in-depth)", async () => {
    clientMocks.listBeans.mockResolvedValue([beanBUnsafeUrl]);
    const wrapper = await mountView();
    expect(wrapper.find("a[target='_blank']").exists()).toBe(false);
    expect(wrapper.html()).not.toContain("javascript:alert(1)");
    expect(wrapper.text()).toContain("購入元URLが無効なため表示できません");
  });

  it("does not call deleteBean when confirm is cancelled", async () => {
    confirmSpy.mockReturnValue(false);
    clientMocks.listBeans.mockResolvedValue([beanA]);
    const wrapper = await mountView();
    await wrapper.find(".btn-danger").trigger("click");
    expect(clientMocks.deleteBean).not.toHaveBeenCalled();
  });

  it("deletes then fully reloads the list when confirmed", async () => {
    confirmSpy.mockReturnValue(true);
    clientMocks.listBeans.mockResolvedValue([beanA]);
    clientMocks.deleteBean.mockResolvedValue(undefined);
    const wrapper = await mountView();
    expect(clientMocks.listBeans).toHaveBeenCalledTimes(1);

    await wrapper.find(".btn-danger").trigger("click");
    await flushPromises();

    expect(clientMocks.deleteBean).toHaveBeenCalledWith("b1");
    expect(clientMocks.listBeans).toHaveBeenCalledTimes(2);
  });
});
