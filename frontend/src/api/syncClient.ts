import { request } from "./authClient";
import type { BrewLog, PourStep, Recipe } from "../types";

export interface SyncPushPayload {
  recipes: Recipe[];
  recipes_deleted: string[];
  pour_steps: PourStep[];
  pour_steps_deleted: string[];
  brew_logs: BrewLog[];
  brew_logs_deleted: string[];
}

export interface SyncPushResult {
  recipes_upserted: number;
  recipes_deleted: number;
  pour_steps_upserted: number;
  pour_steps_deleted: number;
  brew_logs_upserted: number;
  brew_logs_deleted: number;
}

export interface SyncPullResult {
  recipes: Recipe[];
  pour_steps: PourStep[];
  brew_logs: BrewLog[];
}

export const pushSync = (payload: SyncPushPayload) =>
  request<SyncPushResult>("/sync/push", { method: "POST", body: JSON.stringify(payload) });

export const pullSync = () => request<SyncPullResult>("/sync/pull");
