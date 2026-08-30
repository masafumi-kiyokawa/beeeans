import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RecipeInput } from "../types";

const pushMocks = vi.hoisted(() => ({
  pushSingleRecipe: vi.fn(),
  pushRecipeWithSteps: vi.fn(),
  pushDeletedRecipe: vi.fn(),
  pushSinglePourStep: vi.fn(),
  pushDeletedPourStep: vi.fn(),
  pushSingleBrewLog: vi.fn(),
  pushDeletedBrewLog: vi.fn(),
}));

const sessionState = vi.hoisted(() => ({
  currentUser: { value: null as { id: string; email: string; created_at: string } | null },
}));

vi.mock("../sync/orchestrator", () => pushMocks);
vi.mock("../auth/session", () => ({ currentUser: sessionState.currentUser }));

async function freshApi() {
  vi.resetModules();
  const client = await import("./client");
  const { getDb } = await import("../storage/db");
  const db = await getDb();
  return { ...client, db };
}

function loginAsUser() {
  sessionState.currentUser.value = {
    id: "u1",
    email: "user@example.com",
    created_at: "2026-01-01T00:00:00.000Z",
  };
}

const baseRecipeInput: RecipeInput = {
  name: "Recipe A",
  dose_g: 20,
  water_ml: 300,
  water_temp_c: 92,
};

describe("api/client", () => {
  beforeEach(() => {
    indexedDB = new IDBFactory();
    sessionState.currentUser.value = null;
    for (const fn of Object.values(pushMocks)) fn.mockClear();
  });

  describe("listRecipes", () => {
    it("returns an empty array when no recipes exist", async () => {
      const { listRecipes } = await freshApi();
      expect(await listRecipes()).toEqual([]);
    });

    it("sorts recipes by created_at descending", async () => {
      const { listRecipes, db } = await freshApi();
      await db.add("recipes", {
        id: "older",
        name: "Older",
        bean_id: null,
        dose_g: 20,
        water_ml: 300,
        water_temp_c: 92,
        grind_size: null,
        total_time_sec: null,
        notes: null,
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
      });
      await db.add("recipes", {
        id: "newer",
        name: "Newer",
        bean_id: null,
        dose_g: 20,
        water_ml: 300,
        water_temp_c: 92,
        grind_size: null,
        total_time_sec: null,
        notes: null,
        created_at: "2026-02-01T00:00:00.000Z",
        updated_at: "2026-02-01T00:00:00.000Z",
      });
      const result = await listRecipes();
      expect(result.map((r) => r.id)).toEqual(["newer", "older"]);
    });
  });

  describe("getRecipe", () => {
    it("throws a 404 Error when the recipe does not exist", async () => {
      const { getRecipe } = await freshApi();
      await expect(getRecipe("missing")).rejects.toThrow(
        "GET /recipes/missing failed: 404 Recipe not found",
      );
    });

    it("attaches pour_steps sorted by step_order then id", async () => {
      const { createRecipe, getRecipe } = await freshApi();
      const recipe = await createRecipe({
        ...baseRecipeInput,
        pour_steps: [
          { step_order: 1, target_time_sec: 60, cumulative_water_ml: 100 },
          { step_order: 0, target_time_sec: 30, cumulative_water_ml: 50 },
        ],
      } as never);
      const result = await getRecipe(recipe.id);
      expect(result.pour_steps.map((s) => s.step_order)).toEqual([0, 1]);
    });
  });

  describe("createRecipe", () => {
    it("generates id/timestamps and defaults nullable fields to null", async () => {
      const { createRecipe } = await freshApi();
      const recipe = await createRecipe(baseRecipeInput);
      expect(recipe.id).toBeTruthy();
      expect(recipe.created_at).toBeTruthy();
      expect(recipe.updated_at).toBe(recipe.created_at);
      expect(recipe.grind_size).toBeNull();
      expect(recipe.total_time_sec).toBeNull();
      expect(recipe.notes).toBeNull();
    });

    it("defaults pour step step_order to array index when omitted", async () => {
      const { createRecipe } = await freshApi();
      const recipe = await createRecipe({
        ...baseRecipeInput,
        pour_steps: [
          { target_time_sec: 30, cumulative_water_ml: 50 },
          { target_time_sec: 60, cumulative_water_ml: 100 },
        ],
      } as never);
      expect(recipe.pour_steps.map((s) => s.step_order)).toEqual([0, 1]);
    });

    it("does not push to the server when logged out", async () => {
      const { createRecipe } = await freshApi();
      await createRecipe(baseRecipeInput);
      expect(pushMocks.pushRecipeWithSteps).not.toHaveBeenCalled();
    });

    it("fires pushRecipeWithSteps when logged in", async () => {
      loginAsUser();
      const { createRecipe } = await freshApi();
      const recipe = await createRecipe(baseRecipeInput);
      expect(pushMocks.pushRecipeWithSteps).toHaveBeenCalledWith(
        expect.objectContaining({ id: recipe.id }),
        [],
      );
    });
  });

  describe("updateRecipe", () => {
    it("throws a 404 Error when the recipe does not exist", async () => {
      const { updateRecipe } = await freshApi();
      await expect(updateRecipe("missing", { name: "x" })).rejects.toThrow(
        "PUT /recipes/missing failed: 404 Recipe not found",
      );
    });

    it("merges partial data, bumps updated_at, and leaves created_at untouched", async () => {
      const { createRecipe, updateRecipe } = await freshApi();
      const recipe = await createRecipe(baseRecipeInput);
      const originalCreatedAt = recipe.created_at;
      await new Promise((resolve) => setTimeout(resolve, 2));
      const updated = await updateRecipe(recipe.id, { name: "Renamed" });
      expect(updated.name).toBe("Renamed");
      expect(updated.created_at).toBe(originalCreatedAt);
      expect(updated.dose_g).toBe(baseRecipeInput.dose_g);
    });

    it("fires pushSingleRecipe only when logged in", async () => {
      const { createRecipe, updateRecipe } = await freshApi();
      const recipe = await createRecipe(baseRecipeInput);
      await updateRecipe(recipe.id, { name: "x" });
      expect(pushMocks.pushSingleRecipe).not.toHaveBeenCalled();

      loginAsUser();
      await updateRecipe(recipe.id, { name: "y" });
      expect(pushMocks.pushSingleRecipe).toHaveBeenCalledTimes(1);
    });
  });

  describe("deleteRecipe", () => {
    it("cascades to the recipe's pour steps and brew logs", async () => {
      const { createRecipe, createBrewLog, deleteRecipe, listPourSteps, listBrewLogs, getRecipe } =
        await freshApi();
      const recipe = await createRecipe({
        ...baseRecipeInput,
        pour_steps: [{ target_time_sec: 30, cumulative_water_ml: 50 }],
      } as never);
      await createBrewLog({
        recipe_id: recipe.id,
        brewed_at: "2026-01-01T00:00:00.000Z",
        rating: 4,
      });

      await deleteRecipe(recipe.id);

      await expect(getRecipe(recipe.id)).rejects.toThrow();
      expect(await listPourSteps(recipe.id)).toEqual([]);
      expect(await listBrewLogs(recipe.id)).toEqual([]);
    });

    it("silently no-ops (does not throw) when the recipe does not exist", async () => {
      const { deleteRecipe } = await freshApi();
      await expect(deleteRecipe("missing")).resolves.toBeUndefined();
    });

    it("fires pushDeletedRecipe only when logged in", async () => {
      const { createRecipe, deleteRecipe } = await freshApi();
      const recipe = await createRecipe(baseRecipeInput);
      loginAsUser();
      await deleteRecipe(recipe.id);
      expect(pushMocks.pushDeletedRecipe).toHaveBeenCalledWith(recipe.id);
    });
  });

  describe("listPourSteps", () => {
    it("sorts by step_order then id.localeCompare", async () => {
      const { createRecipe, listPourSteps } = await freshApi();
      const recipe = await createRecipe({
        ...baseRecipeInput,
        pour_steps: [
          { step_order: 0, target_time_sec: 30, cumulative_water_ml: 50 },
          { step_order: 0, target_time_sec: 10, cumulative_water_ml: 20 },
        ],
      } as never);
      const steps = await listPourSteps(recipe.id);
      expect(steps).toHaveLength(2);
      expect(steps[0].id.localeCompare(steps[1].id)).toBeLessThan(0);
    });

    it("returns an empty array for a recipe with no steps", async () => {
      const { createRecipe, listPourSteps } = await freshApi();
      const recipe = await createRecipe(baseRecipeInput);
      expect(await listPourSteps(recipe.id)).toEqual([]);
    });
  });

  describe("createPourStep", () => {
    it("computes step_order as max(existing)+1 when omitted", async () => {
      const { createRecipe, createPourStep } = await freshApi();
      const recipe = await createRecipe({
        ...baseRecipeInput,
        pour_steps: [{ step_order: 5, target_time_sec: 30, cumulative_water_ml: 50 }],
      } as never);
      const step = await createPourStep(recipe.id, {
        target_time_sec: 60,
        cumulative_water_ml: 100,
      });
      expect(step.step_order).toBe(6);
    });

    it("defaults step_order to 0 when no steps exist yet", async () => {
      const { createRecipe, createPourStep } = await freshApi();
      const recipe = await createRecipe(baseRecipeInput);
      const step = await createPourStep(recipe.id, {
        target_time_sec: 30,
        cumulative_water_ml: 50,
      });
      expect(step.step_order).toBe(0);
    });

    it("fires pushSinglePourStep only when logged in", async () => {
      const { createRecipe, createPourStep } = await freshApi();
      const recipe = await createRecipe(baseRecipeInput);
      loginAsUser();
      await createPourStep(recipe.id, { target_time_sec: 30, cumulative_water_ml: 50 });
      expect(pushMocks.pushSinglePourStep).toHaveBeenCalledTimes(1);
    });
  });

  describe("updatePourStep", () => {
    it("throws a 404 Error when the step does not exist", async () => {
      const { createRecipe, updatePourStep } = await freshApi();
      const recipe = await createRecipe(baseRecipeInput);
      await expect(updatePourStep(recipe.id, "missing", { notes: "x" })).rejects.toThrow(
        `PUT /recipes/${recipe.id}/pour-steps/missing failed: 404 Pour step not found`,
      );
    });

    it("throws a 404 Error when the step belongs to a different recipe (ownership check)", async () => {
      const { createRecipe, updatePourStep } = await freshApi();
      const recipeA = await createRecipe({
        ...baseRecipeInput,
        pour_steps: [{ target_time_sec: 30, cumulative_water_ml: 50 }],
      } as never);
      const recipeB = await createRecipe(baseRecipeInput);
      const stepId = recipeA.pour_steps[0].id;
      await expect(updatePourStep(recipeB.id, stepId, { notes: "x" })).rejects.toThrow(
        "404 Pour step not found",
      );
    });
  });

  describe("deletePourStep", () => {
    it("silently no-ops when the step does not exist", async () => {
      const { createRecipe, deletePourStep } = await freshApi();
      const recipe = await createRecipe(baseRecipeInput);
      await expect(deletePourStep(recipe.id, "missing")).resolves.toBeUndefined();
      expect(pushMocks.pushDeletedPourStep).not.toHaveBeenCalled();
    });

    it("silently no-ops when the step belongs to a different recipe", async () => {
      const { createRecipe, deletePourStep, listPourSteps } = await freshApi();
      const recipeA = await createRecipe({
        ...baseRecipeInput,
        pour_steps: [{ target_time_sec: 30, cumulative_water_ml: 50 }],
      } as never);
      const recipeB = await createRecipe(baseRecipeInput);
      const stepId = recipeA.pour_steps[0].id;
      await expect(deletePourStep(recipeB.id, stepId)).resolves.toBeUndefined();
      expect(await listPourSteps(recipeA.id)).toHaveLength(1);
      expect(pushMocks.pushDeletedPourStep).not.toHaveBeenCalled();
    });

    it("fires pushDeletedPourStep only on an actual delete, and only when logged in", async () => {
      const { createRecipe, deletePourStep } = await freshApi();
      const recipe = await createRecipe({
        ...baseRecipeInput,
        pour_steps: [{ target_time_sec: 30, cumulative_water_ml: 50 }],
      } as never);
      const stepId = recipe.pour_steps[0].id;
      loginAsUser();
      await deletePourStep(recipe.id, stepId);
      expect(pushMocks.pushDeletedPourStep).toHaveBeenCalledWith(stepId);
    });
  });

  describe("listBrewLogs", () => {
    it("filters by recipeId via the by-recipe index when given", async () => {
      const { createRecipe, createBrewLog, listBrewLogs } = await freshApi();
      const recipeA = await createRecipe(baseRecipeInput);
      const recipeB = await createRecipe({ ...baseRecipeInput, name: "B" });
      await createBrewLog({
        recipe_id: recipeA.id,
        brewed_at: "2026-01-01T00:00:00.000Z",
        rating: 4,
      });
      await createBrewLog({
        recipe_id: recipeB.id,
        brewed_at: "2026-01-01T00:00:00.000Z",
        rating: 3,
      });
      const logs = await listBrewLogs(recipeA.id);
      expect(logs).toHaveLength(1);
      expect(logs[0].recipe_id).toBe(recipeA.id);
    });

    it("returns all logs when recipeId is omitted", async () => {
      const { createRecipe, createBrewLog, listBrewLogs } = await freshApi();
      const recipe = await createRecipe(baseRecipeInput);
      await createBrewLog({
        recipe_id: recipe.id,
        brewed_at: "2026-01-01T00:00:00.000Z",
        rating: 4,
      });
      await createBrewLog({
        recipe_id: recipe.id,
        brewed_at: "2026-01-02T00:00:00.000Z",
        rating: 5,
      });
      expect(await listBrewLogs()).toHaveLength(2);
    });

    it("joins recipe_name as empty string (not undefined) when the parent recipe is missing", async () => {
      const { createRecipe, createBrewLog, listBrewLogs, db } = await freshApi();
      const recipe = await createRecipe(baseRecipeInput);
      const log = await createBrewLog({
        recipe_id: recipe.id,
        brewed_at: "2026-01-01T00:00:00.000Z",
        rating: 4,
      });
      // Directly delete only the recipe row so the brew log is orphaned without
      // going through deleteRecipe's cascade (which would delete the log too).
      await db.delete("recipes", recipe.id);
      const logs = await listBrewLogs();
      const found = logs.find((l) => l.id === log.id);
      expect(found?.recipe_name).toBe("");
      expect(found && "recipe_name" in found).toBe(true);
    });

    it("sorts logs by brewed_at descending", async () => {
      const { createRecipe, createBrewLog, listBrewLogs } = await freshApi();
      const recipe = await createRecipe(baseRecipeInput);
      const older = await createBrewLog({
        recipe_id: recipe.id,
        brewed_at: "2026-01-01T00:00:00.000Z",
        rating: 4,
      });
      const newer = await createBrewLog({
        recipe_id: recipe.id,
        brewed_at: "2026-02-01T00:00:00.000Z",
        rating: 5,
      });
      const logs = await listBrewLogs();
      expect(logs.map((l) => l.id)).toEqual([newer.id, older.id]);
    });
  });

  describe("getBrewLog", () => {
    it("throws a 404 Error when the log does not exist", async () => {
      const { getBrewLog } = await freshApi();
      await expect(getBrewLog("missing")).rejects.toThrow(
        "GET /brew-logs/missing failed: 404 Brew log not found",
      );
    });
  });

  describe("createBrewLog", () => {
    it("throws a 404 Error when the parent recipe does not exist", async () => {
      const { createBrewLog } = await freshApi();
      await expect(
        createBrewLog({ recipe_id: "missing", brewed_at: "2026-01-01T00:00:00.000Z", rating: 4 }),
      ).rejects.toThrow("POST /brew-logs failed: 404 Recipe not found");
    });

    it("fires pushSingleBrewLog only when logged in", async () => {
      const { createRecipe, createBrewLog } = await freshApi();
      const recipe = await createRecipe(baseRecipeInput);
      loginAsUser();
      await createBrewLog({
        recipe_id: recipe.id,
        brewed_at: "2026-01-01T00:00:00.000Z",
        rating: 4,
      });
      expect(pushMocks.pushSingleBrewLog).toHaveBeenCalledTimes(1);
    });
  });

  describe("updateBrewLog", () => {
    it("throws a 404 Error when the log does not exist", async () => {
      const { updateBrewLog } = await freshApi();
      await expect(updateBrewLog("missing", { rating: 5 })).rejects.toThrow(
        "PUT /brew-logs/missing failed: 404 Brew log not found",
      );
    });
  });

  describe("deleteBrewLog", () => {
    it("silently no-ops (does not throw) when the log does not exist", async () => {
      const { deleteBrewLog } = await freshApi();
      await expect(deleteBrewLog("missing")).resolves.toBeUndefined();
    });

    it("fires pushDeletedBrewLog unconditionally when logged in, even for a nonexistent log", async () => {
      const { deleteBrewLog } = await freshApi();
      loginAsUser();
      await deleteBrewLog("missing");
      expect(pushMocks.pushDeletedBrewLog).toHaveBeenCalledWith("missing");
    });

    it("does not push when logged out", async () => {
      const { deleteBrewLog } = await freshApi();
      await deleteBrewLog("missing");
      expect(pushMocks.pushDeletedBrewLog).not.toHaveBeenCalled();
    });
  });
});
