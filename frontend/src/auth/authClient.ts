import { createAuthClient } from "better-auth/vue";

const baseURL = import.meta.env.VITE_AUTH_BASE_URL as string;

export const authClient = createAuthClient({ baseURL });
