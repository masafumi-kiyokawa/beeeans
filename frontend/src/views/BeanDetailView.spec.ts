import { flushPromises, mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

const clientMocks = vi.hoisted(() => ({
  getBean: vi.fn(),
  listRecipes: vi.fn(),
  deleteBean: vi.fn(),
}));
vi.mock("../api/client", () => clientMocks);

import BeanDetailView from "./BeanDetailView.vue";

const bean = {
  id: "b1",
  name: "Ethiopia Yirgacheffe",
  origin: "Ethiopia",
  roaster: "Roaster A",
  roast_level: "中煎り",
  roast_date: "2026-01-01T00:00:00.000Z",
  purchase_url: "https://shop.example.com/products/bean-a",
  notes: "floral",
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

const recipeUsingBean = {
  id: "r1",
  name: "Morning Cup",
  bean_id: "b1",
  dose_g: 20,
  water_ml: 300,
  water_temp_c: 92,
  grind_size: null,
  total_time_sec: null,
  notes: null,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

const recipeUsingOtherBean = { ...recipeUsingBean, id: "r2", name: "Other Cup", bean_id: "b2" };

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/beans", component: { template: "<div>list</div>" } },
      { path: "/beans/:id", component: BeanDetailView, props: true },
      { path: "/beans/:id/edit", component: { template: "<div>edit</div>" } },
      { path: "/recipes/new", component: { template: "<div>new</div>" } },
      { path: "/recipes/:id", component: { template: "<div>detail</div>" } },
      { path: "/recipes/:id/edit", component: { template: "<div>edit</div>" } },
    ],
  });
}

async function mountView(id = "b1") {
  const router = makeRouter();
  await router.push(`/beans/${id}`);
  await router.isReady();
  const wrapper = mount(BeanDetailView, { props: { id }, global: { plugins: [router] } });
  await flushPromises();
  return { wrapper, router };
}

describe("BeanDetailView.vue", () => {
  let confirmSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    clientMocks.getBean.mockReset().mockResolvedValue(bean);
    clientMocks.listRecipes.mockReset().mockResolvedValue([recipeUsingBean, recipeUsingOtherBean]);
    clientMocks.deleteBean.mockReset();
    confirmSpy = vi.spyOn(window, "confirm");
  });

  it("fetches the bean by id on mount and shows its fields", async () => {
    const { wrapper } = await mountView("b1");
    expect(clientMocks.getBean).toHaveBeenCalledWith("b1");
    expect(wrapper.text()).toContain("Ethiopia Yirgacheffe");
    expect(wrapper.text()).toContain("Roaster A");
  });

  it("only lists recipes whose bean_id matches this bean", async () => {
    const { wrapper } = await mountView("b1");
    expect(wrapper.text()).toContain("Morning Cup");
    expect(wrapper.text()).not.toContain("Other Cup");
  });

  it("shows the empty-state message when no recipe uses this bean", async () => {
    clientMocks.listRecipes.mockResolvedValue([recipeUsingOtherBean]);
    const { wrapper } = await mountView("b1");
    expect(wrapper.text()).toContain("この豆を使うレシピはまだありません。");
  });

  it("links the new-recipe button with this bean's id as a query param", async () => {
    const { wrapper } = await mountView("b1");
    const newRecipeLink = wrapper.findAll("a").find((a) => a.text() === "新規レシピ");
    expect(newRecipeLink?.attributes("href")).toBe("/recipes/new?bean_id=b1");
  });

  it("does not call deleteBean when confirm is cancelled", async () => {
    confirmSpy.mockReturnValue(false);
    const { wrapper } = await mountView();
    await wrapper.find(".btn-danger").trigger("click");
    expect(clientMocks.deleteBean).not.toHaveBeenCalled();
  });

  it("deletes then navigates to /beans when confirmed", async () => {
    confirmSpy.mockReturnValue(true);
    clientMocks.deleteBean.mockResolvedValue(undefined);
    const { wrapper, router } = await mountView();
    const push = vi.spyOn(router, "push");
    await wrapper.find(".btn-danger").trigger("click");
    await flushPromises();
    expect(clientMocks.deleteBean).toHaveBeenCalledWith("b1");
    expect(push).toHaveBeenCalledWith("/beans");
  });
});
