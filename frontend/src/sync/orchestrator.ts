import { getDb } from "../storage/db";
import { pullSync, pushSync, type SyncPushPayload } from "../api/syncClient";
import type { Bean, BrewLog, PourStep, Recipe } from "../types";

const EMPTY: SyncPushPayload = {
  recipes: [],
  recipes_deleted: [],
  pour_steps: [],
  pour_steps_deleted: [],
  brew_logs: [],
  brew_logs_deleted: [],
  beans: [],
  beans_deleted: [],
};

function bestEffort(fn: () => Promise<unknown>): void {
  fn().catch(() => {});
}

async function pushLocalDataset(): Promise<void> {
  const db = await getDb();
  const [recipes, pour_steps, brew_logs, beans] = await Promise.all([
    db.getAll("recipes"),
    db.getAll("pourSteps"),
    db.getAll("brewLogs"),
    db.getAll("beans"),
  ]);
  await pushSync({ ...EMPTY, recipes, pour_steps, brew_logs, beans });
}

async function pullServerDataset(): Promise<void> {
  const result = await pullSync();
  const db = await getDb();
  const tx = db.transaction(["recipes", "pourSteps", "brewLogs", "beans"], "readwrite");
  await Promise.all([
    ...result.recipes.map((r) => tx.objectStore("recipes").put(r)),
    ...result.pour_steps.map((s) => tx.objectStore("pourSteps").put(s)),
    ...result.brew_logs.map((l) => tx.objectStore("brewLogs").put(l)),
    ...result.beans.map((b) => tx.objectStore("beans").put(b)),
  ]);
  await tx.done;
}

// Push must run before pull, otherwise pre-existing local-only data would be
// clobbered by an overwrite-from-pull before it ever reaches the server.
export async function fullSync(): Promise<void> {
  try {
    await pushLocalDataset();
  } catch {
    return;
  }
  try {
    await pullServerDataset();
  } catch {
    // best-effort; local IndexedDB stays authoritative for the UI
  }
}

export function pushSingleRecipe(recipe: Recipe): void {
  bestEffort(() => pushSync({ ...EMPTY, recipes: [recipe] }));
}

export function pushRecipeWithSteps(recipe: Recipe, steps: PourStep[]): void {
  bestEffort(() => pushSync({ ...EMPTY, recipes: [recipe], pour_steps: steps }));
}

export function pushDeletedRecipe(id: string): void {
  bestEffort(() => pushSync({ ...EMPTY, recipes_deleted: [id] }));
}

export function pushSinglePourStep(step: PourStep): void {
  bestEffort(() => pushSync({ ...EMPTY, pour_steps: [step] }));
}

export function pushDeletedPourStep(id: string): void {
  bestEffort(() => pushSync({ ...EMPTY, pour_steps_deleted: [id] }));
}

export function pushSingleBrewLog(log: BrewLog): void {
  bestEffort(() => pushSync({ ...EMPTY, brew_logs: [log] }));
}

export function pushDeletedBrewLog(id: string): void {
  bestEffort(() => pushSync({ ...EMPTY, brew_logs_deleted: [id] }));
}

export function pushSingleBean(bean: Bean): void {
  bestEffort(() => pushSync({ ...EMPTY, beans: [bean] }));
}

export function pushDeletedBean(id: string): void {
  bestEffort(() => pushSync({ ...EMPTY, beans_deleted: [id] }));
}
