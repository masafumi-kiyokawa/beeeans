import { and, eq, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { Hono } from "hono";
import { z } from "zod";
import { createAuth } from "../auth";
import * as schema from "../db/schema";
import { isSafePurchaseUrl } from "../lib/url";

type Database = ReturnType<typeof drizzle<typeof schema>>;

// Field lists mirror the frontend's IndexedDB-backed Recipe/PourStep/BrewLog types
// (and the now-retired backend/app/schemas.py Sync* models) exactly, so the client
// can push/pull without reshaping. `id` is always the resource's client-generated
// UUID (stored server-side as `publicId`, with no server-side default — unlike
// better-auth's own ids, the client always supplies it). A PourStep/BrewLog's
// `recipe_id` is always the parent Recipe's `id` (its `publicId`), never its
// internal integer id, per .claude/skills/secure-resource-access/SKILL.md.

const recipeSyncItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  bean_origin: z.string().nullable().optional(),
  dose_g: z.number().positive(),
  water_ml: z.number().positive(),
  water_temp_c: z.number().positive(),
  grind_size: z.string().nullable().optional(),
  total_time_sec: z.number().int().nonnegative().nullable().optional(),
  notes: z.string().nullable().optional(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

const pourStepSyncItemSchema = z.object({
  id: z.string(),
  recipe_id: z.string(),
  step_order: z.number().int(),
  target_time_sec: z.number().int().nonnegative(),
  cumulative_water_ml: z.number().positive(),
  notes: z.string().nullable().optional(),
});

const brewLogSyncItemSchema = z.object({
  id: z.string(),
  recipe_id: z.string(),
  brewed_at: z.coerce.date(),
  rating: z.number().int().min(1).max(5),
  notes: z.string().nullable().optional(),
  created_at: z.coerce.date(),
});

// purchase_url is validated against isSafePurchaseUrl (http/https only, no
// credentials, no loopback/private/link-local host) as defense-in-depth --
// see worker/src/lib/url.ts for the full rationale (this app never fetches
// the URL server-side, so there is no live SSRF surface today).
const beanSyncItemSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(200),
  origin: z.string().max(200).nullable().optional(),
  roaster: z.string().max(200).nullable().optional(),
  roast_level: z.string().max(100).nullable().optional(),
  roast_date: z.coerce.date().nullable().optional(),
  purchase_url: z
    .string()
    .max(2048)
    .refine(isSafePurchaseUrl, { message: "purchase_url must be a safe http(s) URL" })
    .nullable()
    .optional(),
  notes: z.string().nullable().optional(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

const syncPushRequestSchema = z.object({
  recipes: z.array(recipeSyncItemSchema).default([]),
  recipes_deleted: z.array(z.string()).default([]),
  pour_steps: z.array(pourStepSyncItemSchema).default([]),
  pour_steps_deleted: z.array(z.string()).default([]),
  brew_logs: z.array(brewLogSyncItemSchema).default([]),
  brew_logs_deleted: z.array(z.string()).default([]),
  beans: z.array(beanSyncItemSchema).default([]),
  beans_deleted: z.array(z.string()).default([]),
});

type RecipeSyncItem = z.infer<typeof recipeSyncItemSchema>;
type PourStepSyncItem = z.infer<typeof pourStepSyncItemSchema>;
type BrewLogSyncItem = z.infer<typeof brewLogSyncItemSchema>;
type BeanSyncItem = z.infer<typeof beanSyncItemSchema>;

async function upsertRecipe(db: Database, userId: string, item: RecipeSyncItem): Promise<boolean> {
  const existing = await db.query.recipe.findFirst({
    where: and(eq(schema.recipe.publicId, item.id), eq(schema.recipe.userId, userId)),
  });
  const data = {
    name: item.name,
    beanOrigin: item.bean_origin ?? null,
    doseG: item.dose_g,
    waterMl: item.water_ml,
    waterTempC: item.water_temp_c,
    grindSize: item.grind_size ?? null,
    totalTimeSec: item.total_time_sec ?? null,
    notes: item.notes ?? null,
    updatedAt: item.updated_at,
  };
  if (!existing) {
    await db.insert(schema.recipe).values({
      publicId: item.id,
      userId,
      createdAt: item.created_at,
      ...data,
    });
    return true;
  }
  await db.update(schema.recipe).set(data).where(eq(schema.recipe.id, existing.id));
  return false;
}

async function upsertPourStep(
  db: Database,
  userId: string,
  item: PourStepSyncItem,
): Promise<boolean | null> {
  const parent = await db.query.recipe.findFirst({
    where: and(eq(schema.recipe.publicId, item.recipe_id), eq(schema.recipe.userId, userId)),
  });
  if (!parent) return null;
  const existing = await db.query.pourStep.findFirst({
    where: and(eq(schema.pourStep.publicId, item.id), eq(schema.pourStep.recipeId, parent.id)),
  });
  const data = {
    stepOrder: item.step_order,
    targetTimeSec: item.target_time_sec,
    cumulativeWaterMl: item.cumulative_water_ml,
    notes: item.notes ?? null,
  };
  if (!existing) {
    await db.insert(schema.pourStep).values({ publicId: item.id, recipeId: parent.id, ...data });
    return true;
  }
  await db.update(schema.pourStep).set(data).where(eq(schema.pourStep.id, existing.id));
  return false;
}

async function upsertBrewLog(
  db: Database,
  userId: string,
  item: BrewLogSyncItem,
): Promise<boolean | null> {
  const parent = await db.query.recipe.findFirst({
    where: and(eq(schema.recipe.publicId, item.recipe_id), eq(schema.recipe.userId, userId)),
  });
  if (!parent) return null;
  const existing = await db.query.brewLog.findFirst({
    where: and(eq(schema.brewLog.publicId, item.id), eq(schema.brewLog.recipeId, parent.id)),
  });
  const data = {
    brewedAt: item.brewed_at,
    rating: item.rating,
    notes: item.notes ?? null,
  };
  if (!existing) {
    await db.insert(schema.brewLog).values({
      publicId: item.id,
      recipeId: parent.id,
      createdAt: item.created_at,
      ...data,
    });
    return true;
  }
  await db.update(schema.brewLog).set(data).where(eq(schema.brewLog.id, existing.id));
  return false;
}

async function upsertBean(db: Database, userId: string, item: BeanSyncItem): Promise<boolean> {
  const existing = await db.query.bean.findFirst({
    where: and(eq(schema.bean.publicId, item.id), eq(schema.bean.userId, userId)),
  });
  const data = {
    name: item.name,
    origin: item.origin ?? null,
    roaster: item.roaster ?? null,
    roastLevel: item.roast_level ?? null,
    roastDate: item.roast_date ?? null,
    purchaseUrl: item.purchase_url ?? null,
    notes: item.notes ?? null,
    updatedAt: item.updated_at,
  };
  if (!existing) {
    await db.insert(schema.bean).values({
      publicId: item.id,
      userId,
      createdAt: item.created_at,
      ...data,
    });
    return true;
  }
  await db.update(schema.bean).set(data).where(eq(schema.bean.id, existing.id));
  return false;
}

async function softDeleteBean(db: Database, userId: string, publicId: string): Promise<boolean> {
  const existing = await db.query.bean.findFirst({
    where: and(eq(schema.bean.publicId, publicId), eq(schema.bean.userId, userId)),
  });
  if (!existing) return false;
  await db
    .update(schema.bean)
    .set({ deletedAt: new Date() })
    .where(eq(schema.bean.id, existing.id));
  return true;
}

async function softDeleteRecipe(db: Database, userId: string, publicId: string): Promise<boolean> {
  const existing = await db.query.recipe.findFirst({
    where: and(eq(schema.recipe.publicId, publicId), eq(schema.recipe.userId, userId)),
  });
  if (!existing) return false;
  const now = new Date();
  await db.update(schema.recipe).set({ deletedAt: now }).where(eq(schema.recipe.id, existing.id));
  await db
    .update(schema.pourStep)
    .set({ deletedAt: now })
    .where(eq(schema.pourStep.recipeId, existing.id));
  await db
    .update(schema.brewLog)
    .set({ deletedAt: now })
    .where(eq(schema.brewLog.recipeId, existing.id));
  return true;
}

async function softDeletePourStep(
  db: Database,
  userId: string,
  publicId: string,
): Promise<boolean> {
  const existing = await db
    .select({ id: schema.pourStep.id })
    .from(schema.pourStep)
    .innerJoin(schema.recipe, eq(schema.pourStep.recipeId, schema.recipe.id))
    .where(and(eq(schema.pourStep.publicId, publicId), eq(schema.recipe.userId, userId)))
    .get();
  if (!existing) return false;
  await db
    .update(schema.pourStep)
    .set({ deletedAt: new Date() })
    .where(eq(schema.pourStep.id, existing.id));
  return true;
}

async function softDeleteBrewLog(db: Database, userId: string, publicId: string): Promise<boolean> {
  const existing = await db
    .select({ id: schema.brewLog.id })
    .from(schema.brewLog)
    .innerJoin(schema.recipe, eq(schema.brewLog.recipeId, schema.recipe.id))
    .where(and(eq(schema.brewLog.publicId, publicId), eq(schema.recipe.userId, userId)))
    .get();
  if (!existing) return false;
  await db
    .update(schema.brewLog)
    .set({ deletedAt: new Date() })
    .where(eq(schema.brewLog.id, existing.id));
  return true;
}

export const syncApp = new Hono<{ Bindings: Env; Variables: { userId: string } }>();

syncApp.use("*", async (c, next) => {
  const session = await createAuth(c.env).api.getSession({ headers: c.req.raw.headers });
  if (!session) return c.json({ message: "Not authenticated" }, 401);
  c.set("userId", session.user.id);
  await next();
});

syncApp.post("/push", async (c) => {
  const payload = syncPushRequestSchema.parse(await c.req.json());
  const userId = c.get("userId");
  const db = drizzle(c.env.DB, { schema });

  let beansUpserted = 0;
  for (const item of payload.beans) {
    if (await upsertBean(db, userId, item)) beansUpserted++;
  }
  let beansDeleted = 0;
  for (const publicId of payload.beans_deleted) {
    if (await softDeleteBean(db, userId, publicId)) beansDeleted++;
  }
  let recipesUpserted = 0;
  for (const item of payload.recipes) {
    if (await upsertRecipe(db, userId, item)) recipesUpserted++;
  }
  let pourStepsUpserted = 0;
  for (const item of payload.pour_steps) {
    if (await upsertPourStep(db, userId, item)) pourStepsUpserted++;
  }
  let brewLogsUpserted = 0;
  for (const item of payload.brew_logs) {
    if (await upsertBrewLog(db, userId, item)) brewLogsUpserted++;
  }
  let pourStepsDeleted = 0;
  for (const publicId of payload.pour_steps_deleted) {
    if (await softDeletePourStep(db, userId, publicId)) pourStepsDeleted++;
  }
  let brewLogsDeleted = 0;
  for (const publicId of payload.brew_logs_deleted) {
    if (await softDeleteBrewLog(db, userId, publicId)) brewLogsDeleted++;
  }
  let recipesDeleted = 0;
  for (const publicId of payload.recipes_deleted) {
    if (await softDeleteRecipe(db, userId, publicId)) recipesDeleted++;
  }

  return c.json({
    recipes_upserted: recipesUpserted,
    recipes_deleted: recipesDeleted,
    pour_steps_upserted: pourStepsUpserted,
    pour_steps_deleted: pourStepsDeleted,
    brew_logs_upserted: brewLogsUpserted,
    brew_logs_deleted: brewLogsDeleted,
    beans_upserted: beansUpserted,
    beans_deleted: beansDeleted,
  });
});

syncApp.get("/pull", async (c) => {
  const userId = c.get("userId");
  const db = drizzle(c.env.DB, { schema });

  const beans = await db.query.bean.findMany({
    where: and(eq(schema.bean.userId, userId), isNull(schema.bean.deletedAt)),
  });
  const recipes = await db.query.recipe.findMany({
    where: and(eq(schema.recipe.userId, userId), isNull(schema.recipe.deletedAt)),
  });
  const pourSteps = await db
    .select({
      id: schema.pourStep.publicId,
      recipe_id: schema.recipe.publicId,
      step_order: schema.pourStep.stepOrder,
      target_time_sec: schema.pourStep.targetTimeSec,
      cumulative_water_ml: schema.pourStep.cumulativeWaterMl,
      notes: schema.pourStep.notes,
    })
    .from(schema.pourStep)
    .innerJoin(schema.recipe, eq(schema.pourStep.recipeId, schema.recipe.id))
    .where(
      and(
        eq(schema.recipe.userId, userId),
        isNull(schema.recipe.deletedAt),
        isNull(schema.pourStep.deletedAt),
      ),
    );
  const brewLogs = await db
    .select({
      id: schema.brewLog.publicId,
      recipe_id: schema.recipe.publicId,
      brewed_at: schema.brewLog.brewedAt,
      rating: schema.brewLog.rating,
      notes: schema.brewLog.notes,
      created_at: schema.brewLog.createdAt,
    })
    .from(schema.brewLog)
    .innerJoin(schema.recipe, eq(schema.brewLog.recipeId, schema.recipe.id))
    .where(
      and(
        eq(schema.recipe.userId, userId),
        isNull(schema.recipe.deletedAt),
        isNull(schema.brewLog.deletedAt),
      ),
    );

  return c.json({
    recipes: recipes.map((r) => ({
      id: r.publicId,
      name: r.name,
      bean_origin: r.beanOrigin,
      dose_g: r.doseG,
      water_ml: r.waterMl,
      water_temp_c: r.waterTempC,
      grind_size: r.grindSize,
      total_time_sec: r.totalTimeSec,
      notes: r.notes,
      created_at: r.createdAt,
      updated_at: r.updatedAt,
    })),
    pour_steps: pourSteps,
    brew_logs: brewLogs,
    beans: beans.map((b) => ({
      id: b.publicId,
      name: b.name,
      origin: b.origin,
      roaster: b.roaster,
      roast_level: b.roastLevel,
      roast_date: b.roastDate,
      purchase_url: b.purchaseUrl,
      notes: b.notes,
      created_at: b.createdAt,
      updated_at: b.updatedAt,
    })),
  });
});
