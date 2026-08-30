import { flushPromises, mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const clientMocks = vi.hoisted(() => ({
  createBrewLog: vi.fn(),
  getBrewLog: vi.fn(),
  listRecipes: vi.fn(),
  updateBrewLog: vi.fn(),
}));
vi.mock("../api/client", () => clientMocks);

import BrewLogFormView from "./BrewLogFormView.vue";

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
const recipeB = { ...recipeA, id: "r2", name: "Recipe B" };

const existingLog = {
  id: "l1",
  recipe_id: "r2",
  brewed_at: "2026-01-15T03:30:00.000Z",
  rating: 5,
  notes: "great cup",
  created_at: "2026-01-15T03:30:00.000Z",
};

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/logs", component: { template: "<div>logs</div>" } },
      { path: "/logs/new", component: BrewLogFormView },
      { path: "/logs/:id/edit", component: BrewLogFormView, props: true },
    ],
  });
}

async function mountCreate(query = "") {
  const router = makeRouter();
  await router.push(`/logs/new${query}`);
  await router.isReady();
  const wrapper = mount(BrewLogFormView, { global: { plugins: [router] } });
  await flushPromises();
  return { wrapper, router };
}

async function mountEdit(id = "l1") {
  const router = makeRouter();
  await router.push(`/logs/${id}/edit`);
  await router.isReady();
  const wrapper = mount(BrewLogFormView, { global: { plugins: [router] } });
  await flushPromises();
  return { wrapper, router };
}

describe("BrewLogFormView.vue", () => {
  beforeEach(() => {
    clientMocks.createBrewLog.mockReset();
    clientMocks.getBrewLog.mockReset().mockResolvedValue(existingLog);
    clientMocks.listRecipes.mockReset().mockResolvedValue([recipeA, recipeB]);
    clientMocks.updateBrewLog.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("defaults brewed_at to a local-time datetime-local string (YYYY-MM-DDTHH:mm)", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-10T12:34:00.000Z"));
    const { wrapper } = await mountCreate();
    const value = (wrapper.find("#brewed-at").element as HTMLInputElement).value;
    expect(value).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
  });

  it("defaults rating to 3 and notes to empty string in create mode", async () => {
    const { wrapper } = await mountCreate();
    const stars = wrapper.findAll(".rating-stars button");
    expect(stars.filter((s) => s.classes().includes("active"))).toHaveLength(3);
    expect((wrapper.find("#notes").element as HTMLTextAreaElement).value).toBe("");
  });

  it("seeds recipe_id from the recipe_id query param when present", async () => {
    const { wrapper } = await mountCreate("?recipe_id=r2");
    expect((wrapper.find("#recipe").element as HTMLSelectElement).value).toBe("r2");
  });

  it("defaults recipe_id to the first fetched recipe only when no query param was given", async () => {
    const { wrapper } = await mountCreate();
    expect((wrapper.find("#recipe").element as HTMLSelectElement).value).toBe(String(recipeA.id));
  });

  it("populates the edit form from getBrewLog, converting brewed_at from UTC to local", async () => {
    const { wrapper } = await mountEdit();
    expect(clientMocks.getBrewLog).toHaveBeenCalledWith("l1");
    expect((wrapper.find("#recipe").element as HTMLSelectElement).value).toBe("r2");
    expect((wrapper.find("#notes").element as HTMLTextAreaElement).value).toBe("great cup");
    const stars = wrapper.findAll(".rating-stars button");
    expect(stars.filter((s) => s.classes().includes("active"))).toHaveLength(5);
    const brewedAtValue = (wrapper.find("#brewed-at").element as HTMLInputElement).value;
    expect(brewedAtValue).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
  });

  it("submits createBrewLog with a UTC brewed_at and notes normalized to null when empty, then navigates", async () => {
    clientMocks.createBrewLog.mockResolvedValue({ id: "new-log" });
    const { wrapper, router } = await mountCreate("?recipe_id=r2");
    const push = vi.spyOn(router, "push");
    await wrapper.find("form").trigger("submit");
    await flushPromises();

    expect(clientMocks.createBrewLog).toHaveBeenCalledWith(
      expect.objectContaining({ recipe_id: "r2", notes: null }),
    );
    const payload = clientMocks.createBrewLog.mock.calls[0][0];
    expect(() => new Date(payload.brewed_at).toISOString()).not.toThrow();
    expect(push).toHaveBeenCalledWith("/logs?recipe_id=r2");
  });

  it("submits updateBrewLog in edit mode and navigates to the same /logs?recipe_id= destination as create", async () => {
    clientMocks.updateBrewLog.mockResolvedValue(existingLog);
    const { wrapper, router } = await mountEdit();
    const push = vi.spyOn(router, "push");
    await wrapper.find("form").trigger("submit");
    await flushPromises();

    expect(clientMocks.updateBrewLog).toHaveBeenCalledWith(
      "l1",
      expect.objectContaining({ recipe_id: "r2" }),
    );
    expect(push).toHaveBeenCalledWith("/logs?recipe_id=r2");
  });

  it("has no try/catch around submit: a rejection propagates and no error banner is rendered", async () => {
    clientMocks.createBrewLog.mockRejectedValue(new Error("save failed"));
    const router = makeRouter();
    await router.push("/logs/new?recipe_id=r1");
    await router.isReady();
    const wrapper = mount(BrewLogFormView, {
      global: { plugins: [router], config: { errorHandler: () => {} } },
    });
    await flushPromises();
    await wrapper.find("form").trigger("submit");
    await flushPromises();

    expect(wrapper.find(".form-error").exists()).toBe(false);
    expect(wrapper.find("button[type='submit']").attributes("disabled")).toBeUndefined();
  });

  it("sets rating to the clicked star's absolute value, not incrementally", async () => {
    const { wrapper } = await mountCreate();
    const stars = wrapper.findAll(".rating-stars button");

    await stars[1].trigger("click"); // n = 2
    expect(
      wrapper.findAll(".rating-stars button").filter((s) => s.classes().includes("active")),
    ).toHaveLength(2);

    await stars[4].trigger("click"); // n = 5
    expect(
      wrapper.findAll(".rating-stars button").filter((s) => s.classes().includes("active")),
    ).toHaveLength(5);

    await stars[0].trigger("click"); // n = 1
    expect(
      wrapper.findAll(".rating-stars button").filter((s) => s.classes().includes("active")),
    ).toHaveLength(1);
  });
});
