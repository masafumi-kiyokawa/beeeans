import { flushPromises, mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

const clientMocks = vi.hoisted(() => ({
  getRecipe: vi.fn(),
  listBrewLogs: vi.fn(),
  deleteRecipe: vi.fn(),
}));
vi.mock("../api/client", () => clientMocks);

import RecipeDetailView from "./RecipeDetailView.vue";
import BrewLogCard from "../components/BrewLogCard.vue";
import PourStepEditor from "../components/PourStepEditor.vue";

const recipe = {
  id: "r1",
  name: "Recipe A",
  bean_origin: "Ethiopia",
  dose_g: 20,
  water_ml: 300,
  water_temp_c: 92,
  grind_size: "medium",
  total_time_sec: 180,
  notes: "notes here",
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
  pour_steps: [],
};

const log = {
  id: "l1",
  recipe_id: "r1",
  brewed_at: "2026-01-01T09:00:00.000Z",
  rating: 4,
  notes: null,
  created_at: "2026-01-01T09:00:00.000Z",
};

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/", component: { template: "<div>home</div>" } },
      { path: "/recipes/:id", component: RecipeDetailView, props: true },
      { path: "/recipes/:id/edit", component: { template: "<div>edit</div>" } },
      { path: "/recipes/:id/brew", component: { template: "<div>brew</div>" } },
      { path: "/logs/new", component: { template: "<div>log-new</div>" } },
    ],
  });
}

async function mountView(id = "r1") {
  const router = makeRouter();
  await router.push(`/recipes/${id}`);
  await router.isReady();
  const wrapper = mount(RecipeDetailView, {
    props: { id },
    global: { plugins: [router] },
    shallow: true,
  });
  await flushPromises();
  return { wrapper, router };
}

describe("RecipeDetailView.vue", () => {
  let confirmSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    clientMocks.getRecipe.mockReset().mockResolvedValue(recipe);
    clientMocks.listBrewLogs.mockReset().mockResolvedValue([log]);
    clientMocks.deleteRecipe.mockReset();
    confirmSpy = vi.spyOn(window, "confirm");
  });

  it("fetches the recipe and its brew logs by id on mount", async () => {
    const { wrapper } = await mountView("r1");
    expect(clientMocks.getRecipe).toHaveBeenCalledWith("r1");
    expect(clientMocks.listBrewLogs).toHaveBeenCalledWith("r1");
    expect(wrapper.text()).toContain("Recipe A");
  });

  it("shows conditional fields (bean_origin/grind_size/total_time_sec/notes) only when present", async () => {
    const { wrapper } = await mountView();
    expect(wrapper.text()).toContain("Ethiopia");
    expect(wrapper.text()).toContain("medium");
    expect(wrapper.text()).toContain("180");
    expect(wrapper.text()).toContain("notes here");
  });

  it("shows the empty-state message when there are no brew logs", async () => {
    clientMocks.listBrewLogs.mockResolvedValue([]);
    const { wrapper } = await mountView();
    expect(wrapper.text()).toContain("まだログがありません。");
  });

  it("passes recipe.id (from the fetched recipe) as PourStepEditor's recipe-id prop", async () => {
    const { wrapper } = await mountView();
    expect(wrapper.findComponent(PourStepEditor).props("recipeId")).toBe(recipe.id);
  });

  it("wires PourStepEditor's recipe-id from the fetched recipe.id, not the raw route id prop", async () => {
    clientMocks.getRecipe.mockResolvedValue({ ...recipe, id: "different-id" });
    const { wrapper } = await mountView("r1");
    expect(wrapper.findComponent(PourStepEditor).props("recipeId")).toBe("different-id");
  });

  it("reloads the recipe and logs when a BrewLogCard emits deleted", async () => {
    const { wrapper } = await mountView();
    expect(clientMocks.getRecipe).toHaveBeenCalledTimes(1);
    await wrapper.findComponent(BrewLogCard).vm.$emit("deleted");
    await flushPromises();
    expect(clientMocks.getRecipe).toHaveBeenCalledTimes(2);
    expect(clientMocks.listBrewLogs).toHaveBeenCalledTimes(2);
  });

  it("does not call deleteRecipe when the delete confirm is cancelled", async () => {
    confirmSpy.mockReturnValue(false);
    const { wrapper } = await mountView();
    await wrapper.find(".btn-danger").trigger("click");
    expect(clientMocks.deleteRecipe).not.toHaveBeenCalled();
  });

  it("deletes then navigates to / (unlike RecipeListView's in-place reload) when confirmed", async () => {
    confirmSpy.mockReturnValue(true);
    clientMocks.deleteRecipe.mockResolvedValue(undefined);
    const { wrapper, router } = await mountView();
    const push = vi.spyOn(router, "push");
    await wrapper.find(".btn-danger").trigger("click");
    await flushPromises();
    expect(clientMocks.deleteRecipe).toHaveBeenCalledWith("r1");
    expect(push).toHaveBeenCalledWith("/");
  });

  // EXPECTED TO FAIL until RecipeDetailView adds a watch(() => props.id, load) --
  // see CLAUDE.md/plan decision #6. There is currently no reactivity wiring for
  // props.id changing without a full remount, which this test treats as the
  // expected (spec-level) behavior rather than the current, undocumented gap.
  it("reloads the recipe and logs when props.id changes without remounting", async () => {
    const { wrapper } = await mountView("r1");
    expect(clientMocks.getRecipe).toHaveBeenCalledTimes(1);

    clientMocks.getRecipe.mockResolvedValue({ ...recipe, id: "r2", name: "Recipe B" });
    clientMocks.listBrewLogs.mockResolvedValue([]);
    await wrapper.setProps({ id: "r2" });
    await flushPromises();

    expect(clientMocks.getRecipe).toHaveBeenCalledWith("r2");
    expect(wrapper.text()).toContain("Recipe B");
  });
});
