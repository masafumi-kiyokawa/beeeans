import { flushPromises, mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

const clientMocks = vi.hoisted(() => ({ listBrewLogs: vi.fn(), listRecipes: vi.fn() }));
vi.mock("../api/client", () => clientMocks);

import BrewLogListView from "./BrewLogListView.vue";
import BrewLogCard from "../components/BrewLogCard.vue";

const recipeA = {
  id: "r1",
  name: "Recipe A",
  dose_g: 20,
  water_ml: 300,
  water_temp_c: 92,
  grind_size: null,
  total_time_sec: null,
  notes: null,
  created_at: "x",
  updated_at: "x",
};

const log = {
  id: "l1",
  recipe_id: "r1",
  recipe_name: "Recipe A",
  brewed_at: "2026-01-01T09:00:00.000Z",
  rating: 4,
  notes: null,
  created_at: "x",
};

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/logs", component: BrewLogListView },
      { path: "/logs/new", component: { template: "<div>new</div>" } },
    ],
  });
}

async function mountView(query = "") {
  const router = makeRouter();
  await router.push(`/logs${query}`);
  await router.isReady();
  const wrapper = mount(BrewLogListView, { global: { plugins: [router] }, shallow: true });
  await flushPromises();
  return { wrapper, router };
}

describe("BrewLogListView.vue", () => {
  beforeEach(() => {
    clientMocks.listBrewLogs.mockReset().mockResolvedValue([log]);
    clientMocks.listRecipes.mockReset().mockResolvedValue([recipeA]);
  });

  it("initializes selectedRecipeId from route.query.recipe_id", async () => {
    const { wrapper } = await mountView("?recipe_id=r1");
    const select = wrapper.find("select").element as HTMLSelectElement;
    expect(select.value).toBe("r1");
    expect(clientMocks.listBrewLogs).toHaveBeenCalledWith("r1");
  });

  it("defaults selectedRecipeId to empty string when no query param is present", async () => {
    const { wrapper } = await mountView();
    const select = wrapper.find("select").element as HTMLSelectElement;
    expect(select.value).toBe("");
  });

  it("calls load() exactly once on mount (the non-immediate watcher does not double-fire)", async () => {
    await mountView();
    expect(clientMocks.listBrewLogs).toHaveBeenCalledTimes(1);
  });

  it("passes undefined (not an empty string) to listBrewLogs when no recipe is selected", async () => {
    await mountView();
    expect(clientMocks.listBrewLogs).toHaveBeenCalledWith(undefined);
  });

  it("changing the recipe filter updates the query via router.replace and reloads", async () => {
    const { wrapper, router } = await mountView();
    const replace = vi.spyOn(router, "replace");

    await wrapper.find("select").setValue("r1");
    await flushPromises();

    expect(replace).toHaveBeenCalledWith({ query: { recipe_id: "r1" } });
    expect(clientMocks.listBrewLogs).toHaveBeenCalledTimes(2);
    expect(clientMocks.listBrewLogs).toHaveBeenLastCalledWith("r1");
  });

  it("clearing the recipe filter back to 'all' replaces with an empty query object (no recipe_id key)", async () => {
    const { wrapper, router } = await mountView("?recipe_id=r1");
    const replace = vi.spyOn(router, "replace");

    await wrapper.find("select").setValue("");
    await flushPromises();

    expect(replace).toHaveBeenCalledWith({ query: {} });
  });

  it("renders BrewLogCard with show-recipe-name truthy", async () => {
    const { wrapper } = await mountView();
    expect(wrapper.findComponent(BrewLogCard).props("showRecipeName")).toBe(true);
  });

  it("shows the empty-state message when there are no logs", async () => {
    clientMocks.listBrewLogs.mockResolvedValue([]);
    const { wrapper } = await mountView();
    expect(wrapper.text()).toContain("まだログがありません。");
  });
});
