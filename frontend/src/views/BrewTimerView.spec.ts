import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const clientMocks = vi.hoisted(() => ({ getRecipe: vi.fn() }));
vi.mock("../api/client", () => clientMocks);

import BrewTimerView from "./BrewTimerView.vue";

class FakeOscillator {
  type = "sine";
  frequency = { value: 0 };
  connect = vi.fn();
  start = vi.fn();
  stop = vi.fn();
}

class FakeGain {
  gain = {
    setValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
  };
  connect = vi.fn();
}

class FakeAudioContext {
  currentTime = 0;
  destination = {};
  createOscillator = vi.fn(() => new FakeOscillator());
  createGain = vi.fn(() => new FakeGain());
}

const recipeWithSteps = {
  id: "r1",
  name: "V60",
  dose_g: 20,
  water_ml: 300,
  water_temp_c: 92,
  grind_size: null,
  total_time_sec: null,
  notes: null,
  created_at: "x",
  updated_at: "x",
  pour_steps: [
    {
      id: "s0",
      recipe_id: "r1",
      step_order: 0,
      target_time_sec: 0,
      cumulative_water_ml: 50,
      notes: null,
    },
    {
      id: "s1",
      recipe_id: "r1",
      step_order: 1,
      target_time_sec: 60,
      cumulative_water_ml: 150,
      notes: null,
    },
    {
      id: "s2",
      recipe_id: "r1",
      step_order: 2,
      target_time_sec: 120,
      cumulative_water_ml: 300,
      notes: null,
    },
  ],
};

function findButton(wrapper: VueWrapper, text: string) {
  const btn = wrapper.findAll("button").find((b) => b.text() === text);
  if (!btn) throw new Error(`button not found: ${text}`);
  return btn;
}

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/recipes/:id/brew", component: BrewTimerView, props: true },
      { path: "/logs/new", component: { template: "<div>new</div>" } },
    ],
  });
}

async function mountTimer(recipe: typeof recipeWithSteps = recipeWithSteps) {
  clientMocks.getRecipe.mockResolvedValue(recipe);
  const router = makeRouter();
  await router.push(`/recipes/${recipe.id}/brew`);
  await router.isReady();
  const wrapper = mount(BrewTimerView, { props: { id: recipe.id }, global: { plugins: [router] } });
  await flushPromises();
  return wrapper;
}

describe("BrewTimerView.vue", () => {
  beforeEach(() => {
    clientMocks.getRecipe.mockReset();
    vi.stubGlobal("AudioContext", FakeAudioContext);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("triggers a step exactly when target_time_sec <= elapsed, once per step", async () => {
    const wrapper = await mountTimer();
    await findButton(wrapper, "開始").trigger("click");

    await vi.advanceTimersByTimeAsync(1000); // elapsed = 1
    await flushPromises();
    const rows = wrapper.findAll(".step-row");
    expect(rows[0].text()).toContain("✓");
    expect(rows[1].text()).not.toContain("✓");
  });

  it("does not re-trigger an already-triggered step on later ticks", async () => {
    const wrapper = await mountTimer();
    await findButton(wrapper, "開始").trigger("click");
    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(1000); // elapsed = 2, s0 already triggered
    await flushPromises();
    const rows = wrapper.findAll(".step-row");
    expect(rows[0].text()).toContain("✓");
    expect(rows[1].text()).not.toContain("✓");
  });

  it("currentStepIndex is the first untriggered step, and only that step gets `current` (never `done`)", async () => {
    const wrapper = await mountTimer();
    await findButton(wrapper, "開始").trigger("click");
    await vi.advanceTimersByTimeAsync(60_000); // elapsed = 60: s0 and s1 triggered
    await flushPromises();

    const rows = wrapper.findAll(".step-row");
    expect(rows[0].classes()).toContain("done");
    expect(rows[0].classes()).not.toContain("current");
    expect(rows[1].classes()).toContain("done");
    expect(rows[1].classes()).not.toContain("current");
    expect(rows[2].classes()).toContain("current");
    expect(rows[2].classes()).not.toContain("done");
  });

  it("highlights the first (not-yet-triggered) step as `current` even before its target time is reached", async () => {
    const recipe = {
      ...recipeWithSteps,
      pour_steps: recipeWithSteps.pour_steps.map((s, i) =>
        i === 0 ? { ...s, target_time_sec: 10 } : s,
      ),
    };
    const wrapper = await mountTimer(recipe);
    await findButton(wrapper, "開始").trigger("click");
    await vi.advanceTimersByTimeAsync(1000); // elapsed = 1, before first step's target of 10
    await flushPromises();

    const rows = wrapper.findAll(".step-row");
    expect(rows[0].classes()).toContain("current");
    expect(rows[0].classes()).not.toContain("done");
    expect(rows.filter((r) => r.classes().includes("current"))).toHaveLength(1);
  });

  it("current advances to -1 (no `current` row) once every step has been triggered", async () => {
    const wrapper = await mountTimer();
    await findButton(wrapper, "開始").trigger("click");
    await vi.advanceTimersByTimeAsync(120_000); // elapsed = 120: every step triggered
    await flushPromises();

    const rows = wrapper.findAll(".step-row");
    expect(rows.every((r) => r.classes().includes("done"))).toBe(true);
    expect(rows.some((r) => r.classes().includes("current"))).toBe(false);
  });

  it("shows the 記録 link and marks all steps triggered once every step has fired", async () => {
    const wrapper = await mountTimer();
    await findButton(wrapper, "開始").trigger("click");
    await vi.advanceTimersByTimeAsync(120_000); // elapsed = 120: every step triggered
    await flushPromises();

    expect(wrapper.text()).toContain("ログを記録");
    const link = wrapper.find("a.btn");
    expect(link.attributes("href")).toBe("/logs/new?recipe_id=r1");
  });

  it("pause() stops elapsed from advancing further and does not clear triggered steps", async () => {
    const wrapper = await mountTimer();
    await findButton(wrapper, "開始").trigger("click");
    await vi.advanceTimersByTimeAsync(5000); // elapsed = 5
    await findButton(wrapper, "一時停止").trigger("click");
    const elapsedAtPause = wrapper.find(".timer-display").text();

    await vi.advanceTimersByTimeAsync(10_000);
    await flushPromises();

    expect(wrapper.find(".timer-display").text()).toBe(elapsedAtPause);
    // the step triggered before pause (s0, target 0) remains marked
    expect(wrapper.findAll(".step-row")[0].text()).toContain("✓");
  });

  it("reset() zeroes elapsed and clears triggered steps, allowing re-triggering after restart", async () => {
    const wrapper = await mountTimer();
    await findButton(wrapper, "開始").trigger("click");
    await vi.advanceTimersByTimeAsync(5000);
    await findButton(wrapper, "リセット").trigger("click");
    await flushPromises();

    expect(wrapper.find(".timer-display").text()).toBe("0:00");
    expect(wrapper.findAll(".step-row")[0].text()).not.toContain("✓");

    // restarting and re-crossing target 0 should re-trigger step s0 (and its beep)
    await findButton(wrapper, "開始").trigger("click");
    await vi.advanceTimersByTimeAsync(1000);
    await flushPromises();
    expect(wrapper.findAll(".step-row")[0].text()).toContain("✓");
  });

  it("formatTime produces m:ss with no hours rollover", async () => {
    const wrapper = await mountTimer();
    await findButton(wrapper, "開始").trigger("click");
    await vi.advanceTimersByTimeAsync(65_000); // 1:05
    expect(wrapper.find(".timer-display").text()).toBe("1:05");

    await vi.advanceTimersByTimeAsync((3661 - 65) * 1000); // 61:01, no hour component
    expect(wrapper.find(".timer-display").text()).toBe("61:01");
  }, 15000);

  it("clears the interval on unmount (no further ticks afterward)", async () => {
    const wrapper = await mountTimer();
    await findButton(wrapper, "開始").trigger("click");
    await vi.advanceTimersByTimeAsync(1000);
    const clearIntervalSpy = vi.spyOn(window, "clearInterval");

    wrapper.unmount();
    expect(clearIntervalSpy).toHaveBeenCalled();
  });
});
