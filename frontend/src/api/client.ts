import { getDb } from "../storage/db";
import { currentUser } from "../auth/session";
import {
  pushDeletedBean,
  pushDeletedBrewLog,
  pushDeletedPourStep,
  pushDeletedRecipe,
  pushRecipeWithSteps,
  pushSingleBean,
  pushSingleBrewLog,
  pushSinglePourStep,
  pushSingleRecipe,
} from "../sync/orchestrator";
import type {
  Bean,
  BeanInput,
  BrewLog,
  BrewLogInput,
  BrewLogWithRecipeName,
  PourStep,
  PourStepCreate,
  PourStepUpdate,
  Recipe,
  RecipeDetail,
  RecipeInput,
} from "../types";

function newId() {
  return crypto.randomUUID();
}

function nowIso() {
  return new Date().toISOString();
}

async function getPourStepsForRecipe(recipeId: string): Promise<PourStep[]> {
  const db = await getDb();
  const steps = await db.getAllFromIndex("pourSteps", "by-recipe", recipeId);
  return steps.sort((a, b) => a.step_order - b.step_order || a.id.localeCompare(b.id));
}

// Recipes
export async function listRecipes(): Promise<Recipe[]> {
  const db = await getDb();
  const recipes = await db.getAll("recipes");
  return recipes.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function getRecipe(id: string): Promise<RecipeDetail> {
  const db = await getDb();
  const recipe = await db.get("recipes", id);
  if (!recipe) throw new Error(`GET /recipes/${id} failed: 404 Recipe not found`);
  const pour_steps = await getPourStepsForRecipe(id);
  return { ...recipe, pour_steps };
}

export async function createRecipe(
  data: RecipeInput & { pour_steps?: PourStepCreate[] },
): Promise<RecipeDetail> {
  const db = await getDb();
  const { pour_steps: stepsInput, ...recipeFields } = data;
  const timestamp = nowIso();
  const recipe: Recipe = {
    id: newId(),
    name: recipeFields.name,
    bean_id: recipeFields.bean_id ?? null,
    dose_g: recipeFields.dose_g,
    water_ml: recipeFields.water_ml,
    water_temp_c: recipeFields.water_temp_c,
    grind_size: recipeFields.grind_size ?? null,
    total_time_sec: recipeFields.total_time_sec ?? null,
    notes: recipeFields.notes ?? null,
    created_at: timestamp,
    updated_at: timestamp,
  };
  const pour_steps: PourStep[] = (stepsInput ?? []).map((step, index) => ({
    id: newId(),
    recipe_id: recipe.id,
    step_order: step.step_order ?? index,
    target_time_sec: step.target_time_sec,
    cumulative_water_ml: step.cumulative_water_ml,
    notes: step.notes ?? null,
  }));
  const tx = db.transaction(["recipes", "pourSteps"], "readwrite");
  await tx.objectStore("recipes").add(recipe);
  for (const step of pour_steps) {
    await tx.objectStore("pourSteps").add(step);
  }
  await tx.done;
  if (currentUser.value) pushRecipeWithSteps(recipe, pour_steps);
  return { ...recipe, pour_steps };
}

export async function updateRecipe(id: string, data: Partial<RecipeInput>): Promise<RecipeDetail> {
  const db = await getDb();
  const existing = await db.get("recipes", id);
  if (!existing) throw new Error(`PUT /recipes/${id} failed: 404 Recipe not found`);
  const updated: Recipe = { ...existing, ...data, updated_at: nowIso() };
  await db.put("recipes", updated);
  if (currentUser.value) pushSingleRecipe(updated);
  const pour_steps = await getPourStepsForRecipe(id);
  return { ...updated, pour_steps };
}

export async function deleteRecipe(id: string): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(["recipes", "pourSteps", "brewLogs"], "readwrite");
  await tx.objectStore("recipes").delete(id);
  const stepKeys = await tx.objectStore("pourSteps").index("by-recipe").getAllKeys(id);
  for (const key of stepKeys) await tx.objectStore("pourSteps").delete(key);
  const logKeys = await tx.objectStore("brewLogs").index("by-recipe").getAllKeys(id);
  for (const key of logKeys) await tx.objectStore("brewLogs").delete(key);
  await tx.done;
  if (currentUser.value) pushDeletedRecipe(id);
}

// Pour steps
export async function listPourSteps(recipeId: string): Promise<PourStep[]> {
  return getPourStepsForRecipe(recipeId);
}

export async function createPourStep(recipeId: string, data: PourStepCreate): Promise<PourStep> {
  const db = await getDb();
  let stepOrder = data.step_order ?? null;
  if (stepOrder == null) {
    const existing = await getPourStepsForRecipe(recipeId);
    stepOrder = existing.length > 0 ? Math.max(...existing.map((s) => s.step_order)) + 1 : 0;
  }
  const step: PourStep = {
    id: newId(),
    recipe_id: recipeId,
    step_order: stepOrder,
    target_time_sec: data.target_time_sec,
    cumulative_water_ml: data.cumulative_water_ml,
    notes: data.notes ?? null,
  };
  await db.add("pourSteps", step);
  if (currentUser.value) pushSinglePourStep(step);
  return step;
}

export async function updatePourStep(
  recipeId: string,
  stepId: string,
  data: PourStepUpdate,
): Promise<PourStep> {
  const db = await getDb();
  const existing = await db.get("pourSteps", stepId);
  if (!existing || existing.recipe_id !== recipeId) {
    throw new Error(
      `PUT /recipes/${recipeId}/pour-steps/${stepId} failed: 404 Pour step not found`,
    );
  }
  const updated: PourStep = { ...existing, ...data };
  await db.put("pourSteps", updated);
  if (currentUser.value) pushSinglePourStep(updated);
  return updated;
}

export async function deletePourStep(recipeId: string, stepId: string): Promise<void> {
  const db = await getDb();
  const existing = await db.get("pourSteps", stepId);
  if (!existing || existing.recipe_id !== recipeId) return;
  await db.delete("pourSteps", stepId);
  if (currentUser.value) pushDeletedPourStep(stepId);
}

// Brew logs
export async function listBrewLogs(recipeId?: string): Promise<BrewLogWithRecipeName[]> {
  const db = await getDb();
  const logs = recipeId
    ? await db.getAllFromIndex("brewLogs", "by-recipe", recipeId)
    : await db.getAll("brewLogs");
  const recipes = await db.getAll("recipes");
  const nameById = new Map(recipes.map((r) => [r.id, r.name]));
  return logs
    .map((log) => ({ ...log, recipe_name: nameById.get(log.recipe_id) ?? "" }))
    .sort((a, b) => b.brewed_at.localeCompare(a.brewed_at));
}

export async function getBrewLog(id: string): Promise<BrewLog> {
  const db = await getDb();
  const log = await db.get("brewLogs", id);
  if (!log) throw new Error(`GET /brew-logs/${id} failed: 404 Brew log not found`);
  return log;
}

export async function createBrewLog(data: BrewLogInput): Promise<BrewLog> {
  const db = await getDb();
  const recipe = await db.get("recipes", data.recipe_id);
  if (!recipe) throw new Error(`POST /brew-logs failed: 404 Recipe not found`);
  const log: BrewLog = {
    id: newId(),
    recipe_id: data.recipe_id,
    brewed_at: data.brewed_at,
    rating: data.rating,
    notes: data.notes ?? null,
    created_at: nowIso(),
  };
  await db.add("brewLogs", log);
  if (currentUser.value) pushSingleBrewLog(log);
  return log;
}

export async function updateBrewLog(id: string, data: Partial<BrewLogInput>): Promise<BrewLog> {
  const db = await getDb();
  const existing = await db.get("brewLogs", id);
  if (!existing) throw new Error(`PUT /brew-logs/${id} failed: 404 Brew log not found`);
  const updated: BrewLog = { ...existing, ...data };
  await db.put("brewLogs", updated);
  if (currentUser.value) pushSingleBrewLog(updated);
  return updated;
}

export async function deleteBrewLog(id: string): Promise<void> {
  const db = await getDb();
  await db.delete("brewLogs", id);
  if (currentUser.value) pushDeletedBrewLog(id);
}

// Beans
export async function listBeans(): Promise<Bean[]> {
  const db = await getDb();
  const beans = await db.getAll("beans");
  return beans.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function getBean(id: string): Promise<Bean> {
  const db = await getDb();
  const bean = await db.get("beans", id);
  if (!bean) throw new Error(`GET /beans/${id} failed: 404 Bean not found`);
  return bean;
}

export async function createBean(data: BeanInput): Promise<Bean> {
  const db = await getDb();
  const timestamp = nowIso();
  const bean: Bean = {
    id: newId(),
    name: data.name,
    origin: data.origin ?? null,
    roaster: data.roaster ?? null,
    roast_level: data.roast_level ?? null,
    roast_date: data.roast_date ?? null,
    purchase_url: data.purchase_url ?? null,
    notes: data.notes ?? null,
    created_at: timestamp,
    updated_at: timestamp,
  };
  await db.add("beans", bean);
  if (currentUser.value) pushSingleBean(bean);
  return bean;
}

export async function updateBean(id: string, data: Partial<BeanInput>): Promise<Bean> {
  const db = await getDb();
  const existing = await db.get("beans", id);
  if (!existing) throw new Error(`PUT /beans/${id} failed: 404 Bean not found`);
  const updated: Bean = { ...existing, ...data, updated_at: nowIso() };
  await db.put("beans", updated);
  if (currentUser.value) pushSingleBean(updated);
  return updated;
}

export async function deleteBean(id: string): Promise<void> {
  const db = await getDb();
  // IndexedDB has no FK cascade, so unlink any recipes referencing this bean
  // ourselves (the server does the equivalent via bean.id's ON DELETE SET
  // NULL, but that never fires here since sync deletes are soft-deletes).
  const linkedRecipes = await db.getAllFromIndex("recipes", "by-bean", id);
  const tx = db.transaction(["beans", "recipes"], "readwrite");
  await tx.objectStore("beans").delete(id);
  for (const recipe of linkedRecipes) {
    await tx.objectStore("recipes").put({ ...recipe, bean_id: null });
  }
  await tx.done;
  if (currentUser.value) {
    pushDeletedBean(id);
    for (const recipe of linkedRecipes) pushSingleRecipe({ ...recipe, bean_id: null });
  }
}
