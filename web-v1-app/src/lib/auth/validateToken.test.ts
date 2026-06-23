// src/lib/auth/validateToken.test.ts
/**
 * @jest-environment node
 */

import type { ApiKeyRecord } from "@/lib/auth/apiKeys";
import type { EntitlementInput } from "@/lib/auth/entitlements";

const apiKeysMocks = {
  findPersistedApiKeyRecord: jest.fn(),
  loadDevelopmentApiKeys: jest.fn(),
  findApiKeyRecord: jest.fn(),
  getApiKeyDisplayRows: jest.fn(),
};

jest.mock("@/lib/auth/apiKeys", () => ({
  findPersistedApiKeyRecord: (...args: unknown[]) =>
    apiKeysMocks.findPersistedApiKeyRecord(...args),
  loadDevelopmentApiKeys: (...args: unknown[]) =>
    apiKeysMocks.loadDevelopmentApiKeys(...args),
  findApiKeyRecord: (...args: unknown[]) => apiKeysMocks.findApiKeyRecord(...args),
  getApiKeyDisplayRows: (...args: unknown[]) => apiKeysMocks.getApiKeyDisplayRows(...args),
}));

const ORIGINAL_ENV = {
  DEV_API_KEYS_JSON: process.env.DEV_API_KEYS_JSON,
  VERCEL_ENV: process.env.VERCEL_ENV,
};

function makeEntitlement(
  overrides?: Partial<EntitlementInput>
): EntitlementInput {
  return {
    tier: "basic",
    status: "active",
    entitledChain: null,
    historyUnlocked: false,
    ...overrides,
  };
}

function makeRecord(
  overrides?: Partial<ApiKeyRecord>
): ApiKeyRecord {
  return {
    keyId: "key_123",
    accountId: "acct_123",
    userId: "user_123",
    label: "Primary key",
    state: "ACTIVE",
    createdAt: "2026-03-22T10:00:00.000Z",
    lastUsedAt: null,
    prefix: "ta_live_1234",
    last4: "abcd",
    tokenHash: "deadbeef",
    entitlement: makeEntitlement(),
    ...overrides,
  };
}

describe("lib/auth/validateToken", () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();

    process.env.DEV_API_KEYS_JSON = "[]";
    delete process.env.VERCEL_ENV;

    apiKeysMocks.findPersistedApiKeyRecord.mockResolvedValue(null);
    apiKeysMocks.loadDevelopmentApiKeys.mockReturnValue([]);
    apiKeysMocks.findApiKeyRecord.mockReturnValue(null);
    apiKeysMocks.getApiKeyDisplayRows.mockReturnValue([]);
  });

  afterAll(() => {
    if (ORIGINAL_ENV.DEV_API_KEYS_JSON === undefined) {
      delete process.env.DEV_API_KEYS_JSON;
    } else {
      process.env.DEV_API_KEYS_JSON = ORIGINAL_ENV.DEV_API_KEYS_JSON;
    }

    if (ORIGINAL_ENV.VERCEL_ENV === undefined) {
      delete process.env.VERCEL_ENV;
    } else {
      process.env.VERCEL_ENV = ORIGINAL_ENV.VERCEL_ENV;
    }
  });

  it("returns unauthenticated when token is null", async () => {
    const mod = await import("@/lib/auth/validateToken");
    const result = await mod.validateApiKeyToken(null);

    expect(result).toEqual({
      ok: false,
      code: "unauthenticated",
      message: "Missing API key.",
      detail: "Provide X-API-Key header.",
    });

    expect(apiKeysMocks.findPersistedApiKeyRecord).not.toHaveBeenCalled();
    expect(apiKeysMocks.loadDevelopmentApiKeys).not.toHaveBeenCalled();
    expect(apiKeysMocks.findApiKeyRecord).not.toHaveBeenCalled();
  });

  it("returns unauthenticated when token is blank after trimming", async () => {
    const mod = await import("@/lib/auth/validateToken");
    const result = await mod.validateApiKeyToken("   ");

    expect(result).toEqual({
      ok: false,
      code: "unauthenticated",
      message: "Missing API key.",
      detail: "Provide X-API-Key header.",
    });

    expect(apiKeysMocks.findPersistedApiKeyRecord).not.toHaveBeenCalled();
    expect(apiKeysMocks.loadDevelopmentApiKeys).not.toHaveBeenCalled();
    expect(apiKeysMocks.findApiKeyRecord).not.toHaveBeenCalled();
  });

  it("prefers persisted DB-backed key lookup and does not fall back when a DB match exists", async () => {
    const persisted = makeRecord({
      keyId: "key_db",
      accountId: "acct_db",
      prefix: "ta_live_db12",
      last4: "db12",
      entitlement: makeEntitlement({
        tier: "pro",
        status: "active",
        entitledChain: null,
        historyUnlocked: true,
      }),
    });

    apiKeysMocks.findPersistedApiKeyRecord.mockResolvedValue(persisted);

    const mod = await import("@/lib/auth/validateToken");
    const result = await mod.validateApiKeyToken(" ta_live_secret_from_db ");

    expect(apiKeysMocks.findPersistedApiKeyRecord).toHaveBeenCalledWith(
      "ta_live_secret_from_db"
    );
    expect(apiKeysMocks.loadDevelopmentApiKeys).not.toHaveBeenCalled();
    expect(apiKeysMocks.findApiKeyRecord).not.toHaveBeenCalled();

    expect(result).toEqual({
      ok: true,
      accountId: "acct_db",
      userId: "user_123",
      keyId: "key_db",
      keyLabel: "Primary key",
      keyState: "ACTIVE",
      keyPrefix: "ta_live_db12",
      keyLast4: "db12",
      entitlement: persisted.entitlement,
      snapshot: {
        tier: "pro",
        status: "active",
        entitledChain: null,
        historyUnlocked: true,
        allowedChains: ["bitcoin", "ethereum", "arbitrum", "base"],
        allowedGenres: ["gold", "meta", "derived", "briefs"],
        allowedWindows: ["latest", "7d", "30d", "90d", "180d", "365d"],
        maxWindowDays: 365,
        historyDepthDays: null,
        fullHistory: true,
        customThresholdFeeds: true,
      },
      record: persisted,
    });
  });

  it("falls back to development JSON lookup when persisted DB lookup misses", async () => {
    const devRecord = makeRecord({
      keyId: "key_dev",
      accountId: "acct_dev",
      prefix: "ta_dev_abcd",
      last4: "cdef",
      entitlement: makeEntitlement({
        tier: "basic",
        status: "active",
        entitledChain: "ethereum",
        historyUnlocked: false,
      }),
    });

    apiKeysMocks.findPersistedApiKeyRecord.mockResolvedValue(null);
    apiKeysMocks.loadDevelopmentApiKeys.mockReturnValue([devRecord]);
    apiKeysMocks.findApiKeyRecord.mockReturnValue(devRecord);

    const mod = await import("@/lib/auth/validateToken");
    const result = await mod.validateApiKeyToken("ta_dev_secret");

    expect(apiKeysMocks.findPersistedApiKeyRecord).toHaveBeenCalledWith(
      "ta_dev_secret"
    );
    expect(apiKeysMocks.loadDevelopmentApiKeys).toHaveBeenCalledTimes(1);
    expect(apiKeysMocks.findApiKeyRecord).toHaveBeenCalledWith(
      "ta_dev_secret",
      [devRecord]
    );

    expect(result).toEqual({
      ok: true,
      accountId: "acct_dev",
      userId: "user_123",
      keyId: "key_dev",
      keyLabel: "Primary key",
      keyState: "ACTIVE",
      keyPrefix: "ta_dev_abcd",
      keyLast4: "cdef",
      entitlement: devRecord.entitlement,
      snapshot: {
        tier: "basic",
        status: "active",
        entitledChain: "ethereum",
        historyUnlocked: false,
        allowedChains: ["ethereum"],
        allowedGenres: ["gold", "meta", "derived", "briefs"],
        allowedWindows: ["latest", "7d", "30d", "90d"],
        maxWindowDays: 90,
        historyDepthDays: 90,
        fullHistory: false,
        customThresholdFeeds: false,
      },
      record: devRecord,
    });
  });

  it("returns unauthenticated when neither persisted nor development lookups match", async () => {
    apiKeysMocks.findPersistedApiKeyRecord.mockResolvedValue(null);
    apiKeysMocks.loadDevelopmentApiKeys.mockReturnValue([]);
    apiKeysMocks.findApiKeyRecord.mockReturnValue(null);

    const mod = await import("@/lib/auth/validateToken");
    const result = await mod.validateApiKeyToken("ta_missing");

    expect(result).toEqual({
      ok: false,
      code: "unauthenticated",
      message: "Invalid API key.",
      detail: "Token hash did not match any configured key.",
    });
  });

  it("returns unauthenticated for revoked keys", async () => {
    apiKeysMocks.findPersistedApiKeyRecord.mockResolvedValue(
      makeRecord({ state: "REVOKED" })
    );

    const mod = await import("@/lib/auth/validateToken");
    const result = await mod.validateApiKeyToken("ta_revoked");

    expect(result).toEqual({
      ok: false,
      code: "unauthenticated",
      message: "API key is revoked.",
      detail: "revoked_key",
    });
  });

  it("returns forbidden for suspended keys", async () => {
    apiKeysMocks.findPersistedApiKeyRecord.mockResolvedValue(
      makeRecord({ state: "SUSPENDED" })
    );

    const mod = await import("@/lib/auth/validateToken");
    const result = await mod.validateApiKeyToken("ta_suspended");

    expect(result).toEqual({
      ok: false,
      code: "forbidden",
      message: "API key is suspended.",
      detail: "suspended_key",
    });
  });

  it("returns forbidden for inactive subscriptions even when the key itself is active", async () => {
    apiKeysMocks.findPersistedApiKeyRecord.mockResolvedValue(
      makeRecord({
        state: "ACTIVE",
        entitlement: makeEntitlement({
          tier: "basic",
          status: "inactive",
          entitledChain: null,
        }),
      })
    );

    const mod = await import("@/lib/auth/validateToken");
    const result = await mod.validateApiKeyToken("ta_inactive_sub");

    expect(result).toEqual({
      ok: false,
      code: "forbidden",
      message: "Subscription is inactive.",
      detail: "inactive_subscription",
    });
  });

  it("reads x-api-key from request headers", async () => {
    const mod = await import("@/lib/auth/validateToken");

    const request = {
      headers: new Headers({
        "x-api-key": "ta_header_key",
      }),
    } as Request;

    expect(mod.getApiKeyFromRequest(request)).toBe("ta_header_key");
  });

  it("validates request headers through validateRequestApiKey", async () => {
    const persisted = makeRecord({
      keyId: "key_from_request",
      accountId: "acct_from_request",
      prefix: "ta_req_1234",
      last4: "1234",
    });

    apiKeysMocks.findPersistedApiKeyRecord.mockResolvedValue(persisted);

    const mod = await import("@/lib/auth/validateToken");

    const request = {
      headers: new Headers({
        "x-api-key": "ta_request_secret",
      }),
    } as Request;

    const result = await mod.validateRequestApiKey(request);

    expect(apiKeysMocks.findPersistedApiKeyRecord).toHaveBeenCalledWith(
      "ta_request_secret"
    );

    expect(result).toEqual({
      ok: true,
      accountId: "acct_from_request",
      userId: "user_123",
      keyId: "key_from_request",
      keyLabel: "Primary key",
      keyState: "ACTIVE",
      keyPrefix: "ta_req_1234",
      keyLast4: "1234",
      entitlement: persisted.entitlement,
      snapshot: {
        tier: "basic",
        status: "active",
        entitledChain: null,
        historyUnlocked: false,
        allowedChains: [],
        allowedGenres: ["gold", "meta", "derived", "briefs"],
        allowedWindows: ["latest", "7d", "30d", "90d"],
        maxWindowDays: 90,
        historyDepthDays: 90,
        fullHistory: false,
        customThresholdFeeds: false,
      },
      record: persisted,
    });
  });

  it("builds the stable auth error response body", async () => {
    const mod = await import("@/lib/auth/validateToken");

    expect(
      mod.buildAuthErrorResponseBody({
        ok: false,
        code: "forbidden",
        message: "API key is suspended.",
        detail: "suspended_key",
      })
    ).toEqual({
      code: "forbidden",
      message: "API key is suspended.",
      detail: "suspended_key",
    });
  });

  it("returns account API key display rows from the delegated helper", async () => {
    apiKeysMocks.getApiKeyDisplayRows.mockReturnValue([
      {
        id: "key_1",
        label: "Primary",
        prefix: "ta_live_abcd",
        last4: "abcd",
        status: "active",
        createdAt: "2026-03-21T10:00:00.000Z",
        lastUsedAt: null,
        tier: "basic",
        entitledChain: null,
        maxWindowDays: 30,
      },
    ]);

    const mod = await import("@/lib/auth/validateToken");

    expect(mod.getAccountApiKeyDisplayRows("acct_123")).toEqual([
      {
        id: "key_1",
        label: "Primary",
        prefix: "ta_live_abcd",
        last4: "abcd",
        status: "active",
        createdAt: "2026-03-21T10:00:00.000Z",
        lastUsedAt: null,
        tier: "basic",
        entitledChain: null,
        maxWindowDays: 30,
      },
    ]);

    expect(apiKeysMocks.getApiKeyDisplayRows).toHaveBeenCalledWith("acct_123");
  });
});