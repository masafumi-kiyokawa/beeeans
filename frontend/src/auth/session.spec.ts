import { beforeEach, describe, expect, it, vi } from "vitest";

const authClientMocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  signIn: { email: vi.fn() },
  signUp: { email: vi.fn() },
  signOut: vi.fn(),
}));
vi.mock("./authClient", () => ({ authClient: authClientMocks }));

const orchestratorMocks = vi.hoisted(() => ({ fullSync: vi.fn() }));
vi.mock("../sync/orchestrator", () => orchestratorMocks);

async function freshSession() {
  vi.resetModules();
  return import("./session");
}

const user = { id: "u1", email: "a@example.com", createdAt: new Date("2026-01-01T00:00:00.000Z") };

describe("auth/session", () => {
  beforeEach(() => {
    authClientMocks.getSession.mockReset();
    authClientMocks.signIn.email.mockReset();
    authClientMocks.signUp.email.mockReset();
    authClientMocks.signOut.mockReset();
    orchestratorMocks.fullSync.mockReset().mockResolvedValue(undefined);
  });

  describe("refreshCurrentUser", () => {
    it("sets currentUser from the session and runs fullSync when a session exists", async () => {
      authClientMocks.getSession.mockResolvedValue({ data: { user } });
      const { refreshCurrentUser, currentUser } = await freshSession();
      await refreshCurrentUser();
      expect(currentUser.value).toEqual(user);
      expect(orchestratorMocks.fullSync).toHaveBeenCalledTimes(1);
    });

    it("sets currentUser to null and does not call fullSync when there is no session", async () => {
      authClientMocks.getSession.mockResolvedValue({ data: null });
      const { refreshCurrentUser, currentUser } = await freshSession();
      await refreshCurrentUser();
      expect(currentUser.value).toBeNull();
      expect(orchestratorMocks.fullSync).not.toHaveBeenCalled();
    });
  });

  describe("login", () => {
    it("sets currentUser then awaits fullSync on success", async () => {
      authClientMocks.signIn.email.mockResolvedValue({ data: { user }, error: null });
      const { login, currentUser } = await freshSession();
      await login("a@example.com", "secret");
      expect(authClientMocks.signIn.email).toHaveBeenCalledWith({
        email: "a@example.com",
        password: "secret",
      });
      expect(currentUser.value).toEqual(user);
      expect(orchestratorMocks.fullSync).toHaveBeenCalledTimes(1);
    });

    it("throws an Error using better-auth's error message and does not set currentUser or call fullSync", async () => {
      authClientMocks.signIn.email.mockResolvedValue({
        data: null,
        error: { message: "invalid credentials" },
      });
      const { login, currentUser } = await freshSession();
      await expect(login("a@example.com", "wrong")).rejects.toThrow("invalid credentials");
      expect(currentUser.value).toBeNull();
      expect(orchestratorMocks.fullSync).not.toHaveBeenCalled();
    });

    it("falls back to the Japanese default message when better-auth's error has no message", async () => {
      authClientMocks.signIn.email.mockResolvedValue({ data: null, error: {} });
      const { login } = await freshSession();
      await expect(login("a@example.com", "wrong")).rejects.toThrow("ログインに失敗しました。");
    });
  });

  describe("register", () => {
    it("sends the email as both email and name, sets currentUser, then awaits fullSync on success", async () => {
      authClientMocks.signUp.email.mockResolvedValue({ data: { user }, error: null });
      const { register, currentUser } = await freshSession();
      await register("a@example.com", "secret");
      expect(authClientMocks.signUp.email).toHaveBeenCalledWith({
        email: "a@example.com",
        password: "secret",
        name: "a@example.com",
      });
      expect(currentUser.value).toEqual(user);
      expect(orchestratorMocks.fullSync).toHaveBeenCalledTimes(1);
    });

    it("throws an Error using better-auth's error message and does not set currentUser", async () => {
      authClientMocks.signUp.email.mockResolvedValue({
        data: null,
        error: { message: "email taken" },
      });
      const { register, currentUser } = await freshSession();
      await expect(register("a@example.com", "secret")).rejects.toThrow("email taken");
      expect(currentUser.value).toBeNull();
    });

    it("falls back to the Japanese default message when better-auth's error has no message", async () => {
      authClientMocks.signUp.email.mockResolvedValue({ data: null, error: {} });
      const { register } = await freshSession();
      await expect(register("a@example.com", "secret")).rejects.toThrow("登録に失敗しました。");
    });
  });

  describe("logout", () => {
    it("clears currentUser after signOut resolves", async () => {
      authClientMocks.signIn.email.mockResolvedValue({ data: { user }, error: null });
      authClientMocks.signOut.mockResolvedValue(undefined);
      const { login, logout, currentUser } = await freshSession();
      await login("a@example.com", "secret");
      await logout();
      expect(currentUser.value).toBeNull();
    });

    it("propagates the rejection uncaught and leaves currentUser unchanged when signOut fails", async () => {
      authClientMocks.signIn.email.mockResolvedValue({ data: { user }, error: null });
      authClientMocks.signOut.mockRejectedValue(new Error("network error"));
      const { login, logout, currentUser } = await freshSession();
      await login("a@example.com", "secret");
      await expect(logout()).rejects.toThrow("network error");
      expect(currentUser.value).toEqual(user);
    });
  });
});
