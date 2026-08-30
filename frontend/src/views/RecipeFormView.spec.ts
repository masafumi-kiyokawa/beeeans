import { flushPromises, mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

const clientMocks = vi.hoisted(() => ({
  createRecipe: vi.fn(),
  getRecipe: vi.fn(),
  updateRecipe: vi.fn(),
}));
vi.mock("../api/client", () => clientMocks);

import RecipeFormView from "./RecipeFormView.vue";

const existingRecipe = {
  id: "r1",
  name: "Existing",
  bean_origin: null,
  dose_g: 18,
  water_ml: 280,
  water_temp_c: 90,
  grind_size: null,
  total_time_sec: 150,
  notes: null,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
  pour_steps: [],
};

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/", component: { template: "<div>home</div>" } },
      { path: "/recipes/new", component: RecipeFormView },
      { path: "/recipes/:id", component: { template: "<div>detail</div>" } },
      { path: "/recipes/:id/edit", component: RecipeFormView, props: true },
    ],
  });
}

async function mountCreate() {
  const router = makeRouter();
  await router.push("/recipes/new");
  await router.isReady();
  const wrapper = mount(RecipeFormView, { global: { plugins: [router] } });
  await flushPromises();
  return { wrapper, router };
}

async function mountEdit(id = "r1") {
  const router = makeRouter();
  await router.push(`/recipes/${id}/edit`);
  await router.isReady();
  const wrapper = mount(RecipeFormView, { global: { plugins: [router] } });
  await flushPromises();
  return { wrapper, router };
}

describe("RecipeFormView.vue", () => {
  beforeEach(() => {
    clientMocks.createRecipe.mockReset();
    clientMocks.getRecipe.mockReset().mockResolvedValue(existingRecipe);
    clientMocks.updateRecipe.mockReset();
    localStorage.clear();
  });

  it("reads route.params.id itself (not via a prop) to decide create vs edit", async () => {
    const { wrapper: createWrapper } = await mountCreate();
    expect(createWrapper.text()).toContain("新規レシピ");
    expect(clientMocks.getRecipe).not.toHaveBeenCalled();

    const { wrapper: editWrapper } = await mountEdit("r1");
    expect(editWrapper.text()).toContain("レシピを編集");
    expect(clientMocks.getRecipe).toHaveBeenCalledWith("r1");
  });

  it("defaults dose_g/water_ml/water_temp_c/total_time_sec in create mode", async () => {
    const { wrapper } = await mountCreate();
    expect((wrapper.find("#dose").element as HTMLInputElement).value).toBe("20");
    expect((wrapper.find("#water").element as HTMLInputElement).value).toBe("300");
    expect((wrapper.find("#temp").element as HTMLInputElement).value).toBe("92");
    expect((wrapper.find("#total-time").element as HTMLInputElement).value).toBe("");
  });

  it("submits createRecipe with the entered fields and navigates to /recipes/:newId", async () => {
    clientMocks.createRecipe.mockResolvedValue({ ...existingRecipe, id: "new-id" });
    const { wrapper, router } = await mountCreate();
    const push = vi.spyOn(router, "push");
    await wrapper.find("#name").setValue("New Recipe");
    await wrapper.find("form").trigger("submit");
    await flushPromises();

    expect(clientMocks.createRecipe).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "New Recipe",
        bean_origin: null,
        grind_size: null,
        notes: null,
      }),
    );
    expect(push).toHaveBeenCalledWith("/recipes/new-id");
  });

  it("saves the submitted values to localStorage as 'last input' after a successful create", async () => {
    clientMocks.createRecipe.mockResolvedValue({ ...existingRecipe, id: "new-id" });
    const { wrapper } = await mountCreate();
    await wrapper.find("#name").setValue("Remembered Recipe");
    await wrapper.find("#origin").setValue("Ethiopia");
    await wrapper.find("form").trigger("submit");
    await flushPromises();

    const saved = JSON.parse(localStorage.getItem("beans:last-recipe-input") ?? "null");
    expect(saved).toMatchObject({ name: "Remembered Recipe", bean_origin: "Ethiopia", dose_g: 20 });
  });

  it("pre-fills a new create-mode form with the last saved input", async () => {
    localStorage.setItem(
      "beans:last-recipe-input",
      JSON.stringify({
        name: "Remembered Recipe",
        bean_origin: "Ethiopia",
        dose_g: 18,
        water_ml: 280,
        water_temp_c: 90,
        grind_size: "中細挽き",
        total_time_sec: 150,
        notes: "memo",
      }),
    );
    const { wrapper } = await mountCreate();

    expect((wrapper.find("#name").element as HTMLInputElement).value).toBe("Remembered Recipe");
    expect((wrapper.find("#origin").element as HTMLInputElement).value).toBe("Ethiopia");
    expect((wrapper.find("#dose").element as HTMLInputElement).value).toBe("18");
    expect((wrapper.find("#water").element as HTMLInputElement).value).toBe("280");
  });

  it("does not apply saved 'last input' to an edit-mode form", async () => {
    localStorage.setItem(
      "beans:last-recipe-input",
      JSON.stringify({
        name: "Remembered Recipe",
        bean_origin: "Ethiopia",
        dose_g: 18,
        water_ml: 280,
        water_temp_c: 90,
        grind_size: "中細挽き",
        total_time_sec: 150,
        notes: "memo",
      }),
    );
    const { wrapper } = await mountEdit();

    expect((wrapper.find("#name").element as HTMLInputElement).value).toBe("Existing");
  });

  it("converts null bean_origin/grind_size/notes to empty strings when populating the edit form", async () => {
    const { wrapper } = await mountEdit();
    expect((wrapper.find("#origin").element as HTMLInputElement).value).toBe("");
    expect((wrapper.find("#grind").element as HTMLInputElement).value).toBe("");
    expect((wrapper.find("#notes").element as HTMLTextAreaElement).value).toBe("");
    expect((wrapper.find("#name").element as HTMLInputElement).value).toBe("Existing");
  });

  it("converts empty strings back to null on submit and navigates to /recipes/:id", async () => {
    clientMocks.updateRecipe.mockResolvedValue(existingRecipe);
    const { wrapper, router } = await mountEdit();
    const push = vi.spyOn(router, "push");
    await wrapper.find("form").trigger("submit");
    await flushPromises();

    expect(clientMocks.updateRecipe).toHaveBeenCalledWith(
      "r1",
      expect.objectContaining({ bean_origin: null, grind_size: null, notes: null }),
    );
    expect(push).toHaveBeenCalledWith("/recipes/r1");
  });

  it("has no try/catch around submit: a rejection propagates and no error banner is rendered", async () => {
    clientMocks.createRecipe.mockRejectedValue(new Error("save failed"));
    const router = makeRouter();
    await router.push("/recipes/new");
    await router.isReady();
    const wrapper = mount(RecipeFormView, {
      global: { plugins: [router], config: { errorHandler: () => {} } },
    });
    await flushPromises();
    await wrapper.find("form").trigger("submit");
    await flushPromises();

    expect(wrapper.find(".form-error").exists()).toBe(false);
    expect(wrapper.find("button[type='submit']").attributes("disabled")).toBeUndefined();
  });
});
