import { flushPromises, mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

const clientMocks = vi.hoisted(() => ({ listRecipes: vi.fn(), deleteRecipe: vi.fn() }));
vi.mock("../api/client", () => clientMocks);

import RecipeListView from "./RecipeListView.vue";

const recipeA = {
  id: "r1",
  name: "Recipe A",
  bean_origin: "Ethiopia",
  dose_g: 20,
  water_ml: 300,
  water_temp_c: 92,
  grind_size: "medium",
  total_time_sec: null,
  notes: null,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

const recipeB = {
  ...recipeA,
  id: "r2",
  name: "Recipe B",
  bean_origin: null,
  grind_size: null,
};

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/", component: RecipeListView },
      { path: "/recipes/new", component: { template: "<div>new</div>" } },
      { path: "/recipes/:id", component: { template: "<div>detail</div>" } },
      { path: "/recipes/:id/brew", component: { template: "<div>brew</div>" } },
    ],
  });
}

async function mountView() {
  const router = makeRouter();
  await router.push("/");
  await router.isReady();
  const wrapper = mount(RecipeListView, { global: { plugins: [router] } });
  await flushPromises();
  return wrapper;
}

describe("RecipeListView.vue", () => {
  let confirmSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    clientMocks.listRecipes.mockReset();
    clientMocks.deleteRecipe.mockReset();
    confirmSpy = vi.spyOn(window, "confirm");
  });

  it("shows the empty-state message when there are no recipes", async () => {
    clientMocks.listRecipes.mockResolvedValue([]);
    const wrapper = await mountView();
    expect(wrapper.text()).toContain("まだレシピがありません");
  });

  it("renders a card per recipe, showing bean_origin/grind_size only when present", async () => {
    clientMocks.listRecipes.mockResolvedValue([recipeA, recipeB]);
    const wrapper = await mountView();
    const cards = wrapper.findAll(".card");
    expect(cards).toHaveLength(2);
    expect(cards[0].text()).toContain("Ethiopia");
    expect(cards[0].text()).toContain("medium");
    expect(cards[1].text()).not.toContain("Ethiopia");
  });

  it("does not call deleteRecipe when confirm is cancelled", async () => {
    confirmSpy.mockReturnValue(false);
    clientMocks.listRecipes.mockResolvedValue([recipeA]);
    const wrapper = await mountView();
    await wrapper.find(".btn-danger").trigger("click");
    expect(clientMocks.deleteRecipe).not.toHaveBeenCalled();
  });

  it("deletes then fully reloads the list (not an optimistic removal) when confirmed", async () => {
    confirmSpy.mockReturnValue(true);
    clientMocks.listRecipes.mockResolvedValue([recipeA]);
    clientMocks.deleteRecipe.mockResolvedValue(undefined);
    const wrapper = await mountView();
    expect(clientMocks.listRecipes).toHaveBeenCalledTimes(1);

    await wrapper.find(".btn-danger").trigger("click");
    await flushPromises();

    expect(clientMocks.deleteRecipe).toHaveBeenCalledWith("r1");
    expect(clientMocks.listRecipes).toHaveBeenCalledTimes(2);
  });
});
