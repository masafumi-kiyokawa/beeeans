import { ref } from "vue";
import { authClient } from "./authClient";
import { fullSync } from "../sync/orchestrator";
import type { UserOut } from "../types";

export const currentUser = ref<UserOut | null>(null);

export async function refreshCurrentUser(): Promise<void> {
  const { data } = await authClient.getSession();
  currentUser.value = data?.user ?? null;
  if (currentUser.value) await fullSync();
}

export async function login(email: string, password: string): Promise<void> {
  const { data, error } = await authClient.signIn.email({ email, password });
  if (error) throw new Error(error.message ?? "ログインに失敗しました。");
  currentUser.value = data.user;
  await fullSync();
}

export async function register(email: string, password: string): Promise<void> {
  // better-auth requires a `name`; this app has no separate name field, so the
  // email doubles as the display name (not surfaced anywhere but the account record).
  const { data, error } = await authClient.signUp.email({ email, password, name: email });
  if (error) throw new Error(error.message ?? "登録に失敗しました。");
  currentUser.value = data.user;
  await fullSync();
}

export async function logout(): Promise<void> {
  await authClient.signOut();
  currentUser.value = null;
}
