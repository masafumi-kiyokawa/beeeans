import { ref } from "vue";
import { fetchCurrentUser, loginUser, logoutUser, registerUser } from "../api/authClient";
import { fullSync } from "../sync/orchestrator";
import type { UserOut } from "../types";

export const currentUser = ref<UserOut | null>(null);

export async function refreshCurrentUser(): Promise<void> {
  try {
    currentUser.value = await fetchCurrentUser();
    await fullSync();
  } catch {
    currentUser.value = null;
  }
}

export async function login(email: string, password: string): Promise<void> {
  currentUser.value = await loginUser({ email, password });
  await fullSync();
}

export async function register(email: string, password: string): Promise<void> {
  currentUser.value = await registerUser({ email, password });
  await fullSync();
}

export async function logout(): Promise<void> {
  await logoutUser();
  currentUser.value = null;
}
