import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

const clientMocks = vi.hoisted(() => ({
  createPourStep: vi.fn(),
  deletePourStep: vi.fn(),
  listPourSteps: vi.fn(),
  updatePourStep: vi.fn(),
}));
vi.mock("../api/client", () => clientMocks);

import PourStepEditor from "./PourStepEditor.vue";

const steps = [
  {
    id: "s1",
    recipe_id: "r1",
    step_order: 0,
    target_time_sec: 30,
    cumulative_water_ml: 60,
    notes: null,
  },
  {
    id: "s2",
    recipe_id: "r1",
    step_order: 1,
    target_time_sec: 75,
    cumulative_water_ml: 150,
    notes: null,
  },
  {
    id: "s3",
    recipe_id: "r1",
    step_order: 2,
    target_time_sec: 150,
    cumulative_water_ml: 300,
    notes: null,
  },
];

async function mountEditor(initialSteps: typeof steps = steps) {
  clientMocks.listPourSteps.mockResolvedValue(initialSteps);
  const wrapper = mount(PourStepEditor, { props: { recipeId: "r1" } });
  await flushPromises();
  return wrapper;
}

describe("PourStepEditor.vue", () => {
  let confirmSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    clientMocks.createPourStep.mockReset();
    clientMocks.deletePourStep.mockReset();
    clientMocks.listPourSteps.mockReset();
    clientMocks.updatePourStep.mockReset();
    confirmSpy = vi.spyOn(window, "confirm");
  });

  describe("previousCumulative / stepDelta (via rendered view-mode deltas)", () => {
    it("computes each step's per-step delta relative to the previous step's cumulative values", async () => {
      const wrapper = await mountEditor();
      const rows = wrapper.findAll(".step-row:not(.step-row-header)");
      // step 0: delta = {time: 30, water: 60} (baseline zero)
      expect(rows[0].text()).toContain("0:30");
      expect(rows[0].text()).toContain("60ml");
      // step 1: delta = {time: 45, water: 90}
      expect(rows[1].text()).toContain("0:45");
      expect(rows[1].text()).toContain("90ml");
      // step 2: delta = {time: 75, water: 150}
      expect(rows[2].text()).toContain("1:15");
      expect(rows[2].text()).toContain("150ml");
    });
  });

  describe("validateStepInput (via addStep)", () => {
    it("rejects a negative time delta without calling the API", async () => {
      const wrapper = await mountEditor();
      await wrapper.find("input[placeholder='秒']").setValue(-1);
      await wrapper.find("input[placeholder='ml']").setValue(10);
      await wrapper.find(".form-row .btn").trigger("click");

      expect(clientMocks.createPourStep).not.toHaveBeenCalled();
      expect(wrapper.text()).toContain("ステップ時間は0以上の値を入力してください。");
    });

    it("accepts a time delta of exactly 0, but rejects a water delta of exactly 0", async () => {
      const wrapper = await mountEditor();
      // newStep defaults to {time_delta_sec: 0, water_delta_ml: 0}; 0 water is invalid
      await wrapper.find(".form-row .btn").trigger("click");

      expect(clientMocks.createPourStep).not.toHaveBeenCalled();
      expect(wrapper.text()).toContain("ステップ湯量は0より大きい値を入力してください。");
    });
  });

  describe("addStep", () => {
    it("computes cumulative values from the last existing step's baseline and resets the form on success", async () => {
      clientMocks.createPourStep.mockResolvedValue({
        id: "s4",
        recipe_id: "r1",
        step_order: 3,
        target_time_sec: 170,
        cumulative_water_ml: 340,
        notes: null,
      });
      const wrapper = await mountEditor();
      await wrapper.find("input[placeholder='秒']").setValue(20);
      await wrapper.find("input[placeholder='ml']").setValue(40);
      await wrapper.find(".form-row .btn").trigger("click");
      await flushPromises();

      expect(clientMocks.createPourStep).toHaveBeenCalledWith("r1", {
        target_time_sec: 170,
        cumulative_water_ml: 340,
        notes: null,
      });
      expect(clientMocks.listPourSteps).toHaveBeenCalledTimes(2); // initial + reload after add
      expect((wrapper.find("input[placeholder='秒']").element as HTMLInputElement).value).toBe("0");
    });

    it("uses a zero baseline when there are no existing steps", async () => {
      clientMocks.createPourStep.mockResolvedValue({
        id: "s1",
        recipe_id: "r1",
        step_order: 0,
        target_time_sec: 30,
        cumulative_water_ml: 60,
        notes: null,
      });
      const wrapper = await mountEditor([]);
      await wrapper.find("input[placeholder='秒']").setValue(30);
      await wrapper.find("input[placeholder='ml']").setValue(60);
      await wrapper.find(".form-row .btn").trigger("click");
      await flushPromises();

      expect(clientMocks.createPourStep).toHaveBeenCalledWith("r1", {
        target_time_sec: 30,
        cumulative_water_ml: 60,
        notes: null,
      });
    });

    it("does not allow a second concurrent addStep call while one is already saving", async () => {
      let resolveCreate!: (v: unknown) => void;
      clientMocks.createPourStep.mockReturnValue(
        new Promise((resolve) => {
          resolveCreate = resolve;
        }),
      );
      const wrapper = await mountEditor();
      await wrapper.find("input[placeholder='ml']").setValue(40);
      const addBtn = wrapper.find(".form-row .btn");
      await addBtn.trigger("click");
      await addBtn.trigger("click");

      expect(clientMocks.createPourStep).toHaveBeenCalledTimes(1);
      resolveCreate({
        id: "s4",
        recipe_id: "r1",
        step_order: 3,
        target_time_sec: 0,
        cumulative_water_ml: 0,
        notes: null,
      });
      await flushPromises();
    });
  });

  describe("startEdit / saveEdit", () => {
    it("startEdit populates the edit form with the step's delta values, not its raw cumulative values", async () => {
      const wrapper = await mountEditor();
      const rows = wrapper.findAll(".step-row:not(.step-row-header)");
      await rows[1]
        .findAll("button")
        .find((b) => b.text() === "編集")!
        .trigger("click");

      const timeInput = wrapper.find("input[title='ステップ時間(秒)']").element as HTMLInputElement;
      const waterInput = wrapper.find("input[title='ステップ湯量(ml)']")
        .element as HTMLInputElement;
      expect(timeInput.value).toBe("45"); // delta, not the raw target_time_sec of 75
      expect(waterInput.value).toBe("90"); // delta, not the raw cumulative_water_ml of 150
    });

    it("saveEdit recomputes cumulative values from the edited step's own baseline (same index, not steps.length)", async () => {
      clientMocks.updatePourStep.mockResolvedValue({
        ...steps[1],
        target_time_sec: 80,
        cumulative_water_ml: 160,
      });
      const wrapper = await mountEditor();
      const rows = wrapper.findAll(".step-row:not(.step-row-header)");
      await rows[1]
        .findAll("button")
        .find((b) => b.text() === "編集")!
        .trigger("click");

      await wrapper.find("input[title='ステップ時間(秒)']").setValue(50);
      await wrapper.find("input[title='ステップ湯量(ml)']").setValue(100);
      await wrapper
        .findAll("button")
        .find((b) => b.text() === "保存")!
        .trigger("click");

      // baseline for index 1 is previousCumulative(1) = step 0's {time: 30, water: 60}.
      // notes is null (not "") because saveEdit sends `editForm.notes || null`, and
      // startEdit populated editForm.notes as "" from the original step's null notes.
      expect(clientMocks.updatePourStep).toHaveBeenCalledWith("r1", "s2", {
        target_time_sec: 80,
        cumulative_water_ml: 160,
        notes: null,
      });
    });

    it("cancelEdit exits edit mode without calling the API", async () => {
      const wrapper = await mountEditor();
      const rows = wrapper.findAll(".step-row:not(.step-row-header)");
      await rows[0]
        .findAll("button")
        .find((b) => b.text() === "編集")!
        .trigger("click");
      await wrapper
        .findAll("button")
        .find((b) => b.text() === "取消")!
        .trigger("click");

      expect(clientMocks.updatePourStep).not.toHaveBeenCalled();
      expect(wrapper.find("input[title='ステップ時間(秒)']").exists()).toBe(false);
    });
  });

  describe("removeStep", () => {
    it("does not call deletePourStep when confirm is cancelled", async () => {
      confirmSpy.mockReturnValue(false);
      const wrapper = await mountEditor();
      const rows = wrapper.findAll(".step-row:not(.step-row-header)");
      await rows[0]
        .findAll("button")
        .find((b) => b.text() === "削除")!
        .trigger("click");
      expect(clientMocks.deletePourStep).not.toHaveBeenCalled();
    });

    it("has no saving guard: two rapid confirmed deletes both reach the API", async () => {
      confirmSpy.mockReturnValue(true);
      clientMocks.deletePourStep.mockReturnValue(new Promise(() => {})); // never resolves
      const wrapper = await mountEditor();
      const rows = wrapper.findAll(".step-row:not(.step-row-header)");
      const deleteBtn = rows[0].findAll("button").find((b) => b.text() === "削除")!;
      await deleteBtn.trigger("click");
      await deleteBtn.trigger("click");
      expect(clientMocks.deletePourStep).toHaveBeenCalledTimes(2);
    });
  });
});
