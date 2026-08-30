import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Recipe } from "../types";

async function freshDb() {
  vi.resetModules();
  const mod = await import("./db");
  return mod.getDb();
}

describe("storage/db", () => {
  beforeEach(() => {
    // A fresh IDBFactory per test gives full isolation without needing to
    // delete/close the previous test's "beans" database (deleteDatabase would
    // block forever while that test's own connection is still open).
    vi.stubGlobal("indexedDB", new IDBFactory());
  });

  it("returns the same db instance on repeated calls (singleton)", async () => {
    vi.resetModules();
    const { getDb } = await import("./db");
    const first = await getDb();
    const second = await getDb();
    expect(first).toBe(second);
  });

  it("creates recipes/pourSteps/brewLogs object stores keyed by id", async () => {
    const db = await freshDb();
    expect(Array.from(db.objectStoreNames)).toEqual(
      expect.arrayContaining(["recipes", "pourSteps", "brewLogs"]),
    );
  });

  it("exposes a by-recipe index on pourSteps and brewLogs", async () => {
    const db = await freshDb();
    const stepTx = db.transaction("pourSteps", "readonly");
    expect(Array.from(stepTx.objectStore("pourSteps").indexNames)).toContain("by-recipe");
    const logTx = db.transaction("brewLogs", "readonly");
    expect(Array.from(logTx.objectStore("brewLogs").indexNames)).toContain("by-recipe");
  });

  it("exposes a by-bean index on recipes", async () => {
    const db = await freshDb();
    const tx = db.transaction("recipes", "readonly");
    expect(Array.from(tx.objectStore("recipes").indexNames)).toContain("by-bean");
  });

  it("finds recipes by bean_id via the by-bean index", async () => {
    const db = await freshDb();
    await db.add("recipes", {
      id: "r1",
      name: "Linked",
      bean_origin: null,
      bean_id: "b1",
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
      id: "r2",
      name: "Unlinked",
      bean_origin: null,
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
    const results = await db.getAllFromIndex("recipes", "by-bean", "b1");
    expect(results.map((r) => r.id)).toEqual(["r1"]);
  });

  it("supports put/get/delete round-trip on recipes", async () => {
    const db = await freshDb();
    const recipe: Recipe = {
      id: "r1",
      name: "Test",
      bean_origin: null,
      bean_id: null,
      dose_g: 20,
      water_ml: 300,
      water_temp_c: 92,
      grind_size: null,
      total_time_sec: null,
      notes: null,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    };
    await db.put("recipes", recipe);
    expect(await db.get("recipes", "r1")).toEqual(recipe);
    await db.delete("recipes", "r1");
    expect(await db.get("recipes", "r1")).toBeUndefined();
  });

  it("finds pourSteps by recipe_id via the by-recipe index", async () => {
    const db = await freshDb();
    await db.add("pourSteps", {
      id: "s1",
      recipe_id: "r1",
      step_order: 0,
      target_time_sec: 30,
      cumulative_water_ml: 60,
      notes: null,
    });
    await db.add("pourSteps", {
      id: "s2",
      recipe_id: "r2",
      step_order: 0,
      target_time_sec: 30,
      cumulative_water_ml: 60,
      notes: null,
    });
    const results = await db.getAllFromIndex("pourSteps", "by-recipe", "r1");
    expect(results.map((s) => s.id)).toEqual(["s1"]);
  });
});
