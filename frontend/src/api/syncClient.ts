import type { Bean, BrewLog, PourStep, Recipe } from "../types";

const BASE_URL = import.meta.env.VITE_API_BASE_URL as string;

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${options.method ?? "GET"} ${path} failed: ${res.status} ${body}`);
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return res.json() as Promise<T>;
}

export interface SyncPushPayload {
  recipes: Recipe[];
  recipes_deleted: string[];
  pour_steps: PourStep[];
  pour_steps_deleted: string[];
  brew_logs: BrewLog[];
  brew_logs_deleted: string[];
  beans: Bean[];
  beans_deleted: string[];
}

export interface SyncPushResult {
  recipes_upserted: number;
  recipes_deleted: number;
  pour_steps_upserted: number;
  pour_steps_deleted: number;
  brew_logs_upserted: number;
  brew_logs_deleted: number;
  beans_upserted: number;
  beans_deleted: number;
}

export interface SyncPullResult {
  recipes: Recipe[];
  pour_steps: PourStep[];
  brew_logs: BrewLog[];
  beans: Bean[];
}

export const pushSync = (payload: SyncPushPayload) =>
  request<SyncPushResult>("/sync/push", { method: "POST", body: JSON.stringify(payload) });

export const pullSync = () => request<SyncPullResult>("/sync/pull");
