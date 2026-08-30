import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SyncPushPayload } from "./syncClient";

const TEST_BASE_URL = "http://localhost:8000/api";

interface MockResponseOptions {
  json?: unknown;
  status?: number;
  text?: string;
}

function mockResponse({ json, status = 200, text = "" }: MockResponseOptions = {}) {
  return {
    ok: status < 400,
    status,
    json: vi.fn().mockResolvedValue(json),
    text: vi.fn().mockResolvedValue(text),
  };
}

async function freshSyncClient() {
  vi.resetModules();
  vi.stubEnv("VITE_API_BASE_URL", TEST_BASE_URL);
  return import("./syncClient");
}

const emptyPayload: SyncPushPayload = {
  recipes: [],
  recipes_deleted: [],
  pour_steps: [],
  pour_steps_deleted: [],
  brew_logs: [],
  brew_logs_deleted: [],
  beans: [],
  beans_deleted: [],
};

const emptyPushResult = {
  recipes_upserted: 0,
  recipes_deleted: 0,
  pour_steps_upserted: 0,
  pour_steps_deleted: 0,
  brew_logs_upserted: 0,
  brew_logs_deleted: 0,
  beans_upserted: 0,
  beans_deleted: 0,
};

describe("api/syncClient", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  // syncClient.ts owns its own `request()` helper (it no longer delegates to a
  // shared authClient module, which was removed when auth moved to better-auth),
  // so its credentials/header/status-code branching is verified here directly.
  describe("the internal request() helper (exercised via pushSync/pullSync)", () => {
    it("sends credentials: include and a JSON content-type header", async () => {
      const { pullSync } = await freshSyncClient();
      vi.mocked(fetch).mockResolvedValue(
        mockResponse({ json: { recipes: [], pour_steps: [], brew_logs: [] } }) as never,
      );
      await pullSync();
      const [, init] = vi.mocked(fetch).mock.calls[0];
      expect(init?.credentials).toBe("include");
      expect(init?.headers).toEqual({ "Content-Type": "application/json" });
    });

    it("throws an Error with method/path/status/body text on a non-ok response", async () => {
      const { pushSync } = await freshSyncClient();
      vi.mocked(fetch).mockResolvedValue(mockResponse({ status: 500, text: "boom" }) as never);
      await expect(pushSync(emptyPayload)).rejects.toThrow("POST /sync/push failed: 500 boom");
    });

    it("defaults the method to GET in the error message when none was specified", async () => {
      const { pullSync } = await freshSyncClient();
      vi.mocked(fetch).mockResolvedValue(mockResponse({ status: 500, text: "boom" }) as never);
      await expect(pullSync()).rejects.toThrow("GET /sync/pull failed: 500 boom");
    });

    it("resolves to undefined without calling .json() when status is 204", async () => {
      const { pullSync } = await freshSyncClient();
      const res = mockResponse({ status: 204 });
      vi.mocked(fetch).mockResolvedValue(res as never);
      const result = await pullSync();
      expect(result).toBeUndefined();
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe("pushSync", () => {
    it("POSTs the exact payload as JSON to /sync/push", async () => {
      const { pushSync } = await freshSyncClient();
      vi.mocked(fetch).mockResolvedValue(mockResponse({ json: emptyPushResult }) as never);
      await pushSync(emptyPayload);
      const [url, init] = vi.mocked(fetch).mock.calls[0];
      expect(url).toBe(`${TEST_BASE_URL}/sync/push`);
      expect(init?.method).toBe("POST");
      expect(JSON.parse(init?.body as string)).toEqual(emptyPayload);
    });

    it("returns the parsed SyncPushResult untouched", async () => {
      const { pushSync } = await freshSyncClient();
      const result = {
        recipes_upserted: 1,
        recipes_deleted: 2,
        pour_steps_upserted: 3,
        pour_steps_deleted: 4,
        brew_logs_upserted: 5,
        brew_logs_deleted: 6,
        beans_upserted: 7,
        beans_deleted: 8,
      };
      vi.mocked(fetch).mockResolvedValue(mockResponse({ json: result }) as never);
      expect(await pushSync(emptyPayload)).toEqual(result);
    });
  });

  describe("pullSync", () => {
    it("GETs /sync/pull", async () => {
      const { pullSync } = await freshSyncClient();
      vi.mocked(fetch).mockResolvedValue(
        mockResponse({ json: { recipes: [], pour_steps: [], brew_logs: [] } }) as never,
      );
      await pullSync();
      const [url, init] = vi.mocked(fetch).mock.calls[0];
      expect(url).toBe(`${TEST_BASE_URL}/sync/pull`);
      expect(init?.method).toBeUndefined();
    });

    it("returns the recipes/pour_steps/brew_logs arrays untouched", async () => {
      const { pullSync } = await freshSyncClient();
      const result = {
        recipes: [{ id: "r1" }],
        pour_steps: [{ id: "s1" }],
        brew_logs: [{ id: "l1" }],
      };
      vi.mocked(fetch).mockResolvedValue(mockResponse({ json: result }) as never);
      expect(await pullSync()).toEqual(result);
    });
  });
});
