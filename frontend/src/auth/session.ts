import { ref } from "vue";
import { fetchCurrentUser, loginUser, logoutUser, registerUser } from "../api/authClient";
import type { UserOut } from "../types";

export const currentUser = ref<UserOut | null>(null);

export async function refreshCurrentUser(): Promise<void> {
  try {
    currentUser.value = await fetchCurrentUser();
  } catch {
    currentUser.value = null;
  }
}

export async function login(email: string, password: string): Promise<void> {
  currentUser.value = await loginUser({ email, password });
}

export async function register(email: string, password: string): Promise<void> {
  currentUser.value = await registerUser({ email, password });
}

export async function logout(): Promise<void> {
  await logoutUser();
  currentUser.value = null;
}
