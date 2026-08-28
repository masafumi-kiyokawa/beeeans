import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BrewLog, PourStep, Recipe } from "../types";

type StoreName = "recipes" | "pourSteps" | "brewLogs";

const dbState = vi.hoisted(() => ({
  recipes: [] as Recipe[],
  pourSteps: [] as PourStep[],
  brewLogs: [] as BrewLog[],
  puts: { recipes: [] as unknown[], pourSteps: [] as unknown[], brewLogs: [] as unknown[] },
}));

const dbMock = vi.hoisted(() => ({
  getAll: vi.fn((store: StoreName) => Promise.resolve(dbState[store])),
  transaction: vi.fn(() => ({
    objectStore: (store: StoreName) => ({
      put: (value: unknown) => {
        dbState.puts[store].push(value);
      },
    }),
    done: Promise.resolve(),
  })),
}));

vi.mock("../storage/db", () => ({ getDb: vi.fn().mockResolvedValue(dbMock) }));

const syncMocks = vi.hoisted(() => ({
  pushSync: vi.fn(),
  pullSync: vi.fn(),
}));
vi.mock("../api/syncClient", () => syncMocks);

async function freshOrchestrator() {
  vi.resetModules();
  return import("./orchestrator");
}

const emptyPushResult = {
  recipes_upserted: 0,
  recipes_deleted: 0,
  pour_steps_upserted: 0,
  pour_steps_deleted: 0,
  brew_logs_upserted: 0,
  brew_logs_deleted: 0,
};

const emptyPullResult = { recipes: [], pour_steps: [], brew_logs: [] };

describe("sync/orchestrator", () => {
  beforeEach(() => {
    dbState.recipes = [];
    dbState.pourSteps = [];
    dbState.brewLogs = [];
    dbState.puts = { recipes: [], pourSteps: [], brewLogs: [] };
    syncMocks.pushSync.mockReset().mockResolvedValue(emptyPushResult);
    syncMocks.pullSync.mockReset().mockResolvedValue(emptyPullResult);
  });

  describe("EMPTY payload reuse", () => {
    it("pushSingleRecipe sends only the recipes field populated", async () => {
      const { pushSingleRecipe } = await freshOrchestrator();
      const recipe = { id: "r1" } as Recipe;
      pushSingleRecipe(recipe);
      await vi.waitFor(() => expect(syncMocks.pushSync).toHaveBeenCalled());
      expect(syncMocks.pushSync).toHaveBeenCalledWith({
        recipes: [recipe],
        recipes_deleted: [],
        pour_steps: [],
        pour_steps_deleted: [],
        brew_logs: [],
        brew_logs_deleted: [],
      });
    });

    it("pushRecipeWithSteps sends recipes and pour_steps populated together", async () => {
      const { pushRecipeWithSteps } = await freshOrchestrator();
      const recipe = { id: "r1" } as Recipe;
      const steps = [{ id: "s1" } as PourStep];
      pushRecipeWithSteps(recipe, steps);
      await vi.waitFor(() => expect(syncMocks.pushSync).toHaveBeenCalled());
      expect(syncMocks.pushSync).toHaveBeenCalledWith({
        recipes: [recipe],
        recipes_deleted: [],
        pour_steps: steps,
        pour_steps_deleted: [],
        brew_logs: [],
        brew_logs_deleted: [],
      });
    });

    it("pushDeletedRecipe sends only recipes_deleted populated", async () => {
      const { pushDeletedRecipe } = await freshOrchestrator();
      pushDeletedRecipe("r1");
      await vi.waitFor(() => expect(syncMocks.pushSync).toHaveBeenCalled());
      expect(syncMocks.pushSync).toHaveBeenCalledWith({
        recipes: [],
        recipes_deleted: ["r1"],
        pour_steps: [],
        pour_steps_deleted: [],
        brew_logs: [],
        brew_logs_deleted: [],
      });
    });

    it("pushSinglePourStep/pushDeletedPourStep/pushSingleBrewLog/pushDeletedBrewLog each populate only their own field", async () => {
      const { pushSinglePourStep, pushDeletedPourStep, pushSingleBrewLog, pushDeletedBrewLog } =
        await freshOrchestrator();

      pushSinglePourStep({ id: "s1" } as PourStep);
      pushDeletedPourStep("s1");
      pushSingleBrewLog({ id: "l1" } as BrewLog);
      pushDeletedBrewLog("l1");

      await vi.waitFor(() => expect(syncMocks.pushSync).toHaveBeenCalledTimes(4));
      const payloads = syncMocks.pushSync.mock.calls.map((call) => call[0]);
      expect(payloads[0]).toMatchObject({ pour_steps: [{ id: "s1" }] });
      expect(payloads[1]).toMatchObject({ pour_steps_deleted: ["s1"] });
      expect(payloads[2]).toMatchObject({ brew_logs: [{ id: "l1" }] });
      expect(payloads[3]).toMatchObject({ brew_logs_deleted: ["l1"] });
    });
  });

  describe("bestEffort error swallowing", () => {
    it("does not throw synchronously, and does not produce an unhandled rejection, when pushSync rejects", async () => {
      const { pushSingleRecipe } = await freshOrchestrator();
      syncMocks.pushSync.mockRejectedValueOnce(new Error("network down"));
      expect(() => pushSingleRecipe({ id: "r1" } as Recipe)).not.toThrow();
      await vi.waitFor(() => expect(syncMocks.pushSync).toHaveBeenCalled());
      // Flush microtasks so the internal .catch() has a chance to run; if it
      // didn't swallow the rejection, this would surface as an unhandled rejection.
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  });

  describe("fullSync", () => {
    it("pushes the full local dataset, then pulls and persists the server snapshot", async () => {
      dbState.recipes = [{ id: "r1" } as Recipe];
      dbState.pourSteps = [{ id: "s1" } as PourStep];
      dbState.brewLogs = [{ id: "l1" } as BrewLog];
      const pulledRecipe = { id: "r2" } as Recipe;
      syncMocks.pullSync.mockResolvedValue({
        recipes: [pulledRecipe],
        pour_steps: [],
        brew_logs: [],
      });

      const { fullSync } = await freshOrchestrator();
      await fullSync();

      expect(syncMocks.pushSync).toHaveBeenCalledWith({
        recipes: dbState.recipes,
        recipes_deleted: [],
        pour_steps: dbState.pourSteps,
        pour_steps_deleted: [],
        brew_logs: dbState.brewLogs,
        brew_logs_deleted: [],
      });
      expect(syncMocks.pullSync).toHaveBeenCalledTimes(1);
      expect(dbState.puts.recipes).toEqual([pulledRecipe]);
    });

    it("never attempts the pull when the push fails, and resolves without throwing", async () => {
      syncMocks.pushSync.mockRejectedValueOnce(new Error("push failed"));
      const { fullSync } = await freshOrchestrator();
      await expect(fullSync()).resolves.toBeUndefined();
      expect(syncMocks.pullSync).not.toHaveBeenCalled();
    });

    it("swallows a pull failure and resolves without throwing", async () => {
      syncMocks.pullSync.mockRejectedValueOnce(new Error("pull failed"));
      const { fullSync } = await freshOrchestrator();
      await expect(fullSync()).resolves.toBeUndefined();
      expect(syncMocks.pushSync).toHaveBeenCalledTimes(1);
    });
  });
});
