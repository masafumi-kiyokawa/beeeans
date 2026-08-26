import type { UserOut } from "../types";

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

export const registerUser = (data: { email: string; password: string }) =>
  request<UserOut>("/auth/register", { method: "POST", body: JSON.stringify(data) });

export const loginUser = (data: { email: string; password: string }) =>
  request<UserOut>("/auth/login", { method: "POST", body: JSON.stringify(data) });

export const logoutUser = () => request<void>("/auth/logout", { method: "POST" });

export const fetchCurrentUser = () => request<UserOut>("/auth/me");
