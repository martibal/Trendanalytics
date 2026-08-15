/**
 * @jest-environment node
 */

const authMocks = {
  validateRequestApiKey: jest.fn(),
  buildAuthErrorResponseBody: jest.fn(),
};

const rateLimitMocks = {
  enforceAccountRateLimit: jest.fn(),
  buildRateLimitHeaders: jest.fn(),
  enforceDailyApiQuota: jest.fn(),
  buildDailyQuotaHeaders: jest.fn(),
};
const entitlementMocks = {
  evaluateFileEntitlement: jest.fn(),
};

const storageMocks = {
  readStorageObject: jest.fn(),
  currentDataSource: jest.fn(),
};

const auditMocks = {
  getOrCreateRequestId: jest.fn(),
  logApiEvent: jest.fn(),
};
const apiKeyMocks = {
  touchPersistedApiKeyLastUsedAt: jest.fn(),
};

jest.mock("@/lib/auth/validateToken", () => ({
  validateRequestApiKey: (...args: unknown[]) => authMocks.validateRequestApiKey(...args),
  buildAuthErrorResponseBody: (...args: unknown[]) => authMocks.buildAuthErrorResponseBody(...args),
}));

jest.mock("@/lib/auth/apiKeys", () => ({
  touchPersistedApiKeyLastUsedAt: (...args: unknown[]) =>
    apiKeyMocks.touchPersistedApiKeyLastUsedAt(...args),
}));

jest.mock("@/lib/auth/rateLimit", () => ({
  enforceAccountRateLimit: (...args: unknown[]) => rateLimitMocks.enforceAccountRateLimit(...args),
  buildRateLimitHeaders: (...args: unknown[]) => rateLimitMocks.buildRateLimitHeaders(...args),
  enforceDailyApiQuota: (...args: unknown[]) => rateLimitMocks.enforceDailyApiQuota(...args),
  buildDailyQuotaHeaders: (...args: unknown[]) => rateLimitMocks.buildDailyQuotaHeaders(...args),
}));
jest.mock("@/lib/auth/entitlements", () => ({
  evaluateFileEntitlement: (...args: unknown[]) => entitlementMocks.evaluateFileEntitlement(...args),
  isWindowToken: (value: string) =>
    value === "latest" ||
    value === "7d" ||
    value === "30d" ||
    value === "90d" ||
    value === "180d" ||
    value === "365d",
}));

jest.mock("@/lib/storage", () => ({
  readStorageObject: (...args: unknown[]) => storageMocks.readStorageObject(...args),
  currentDataSource: (...args: unknown[]) => storageMocks.currentDataSource(...args),
}));

jest.mock("@/lib/auditLog", () => ({
  getOrCreateRequestId: (...args: unknown[]) => auditMocks.getOrCreateRequestId(...args),
  logApiEvent: (...args: unknown[]) => auditMocks.logApiEvent(...args),
}));

describe("GET /api/v1/files/[...path]", () => {
  let GET: (
    request: Request,
    context: { params: Promise<{ path: string[] }> }
  ) => Promise<Response>;

  beforeAll(async () => {
    const mod = await import("@/app/api/v1/files/[...path]/route");
    GET = mod.GET;
  });

  beforeEach(() => {
    jest.clearAllMocks();

    auditMocks.getOrCreateRequestId.mockReturnValue("req_test_123");
    storageMocks.currentDataSource.mockReturnValue("local");
    rateLimitMocks.buildRateLimitHeaders.mockReturnValue({});
    rateLimitMocks.enforceDailyApiQuota.mockResolvedValue({
      success: true,
      limit: 5000,
      remaining: 4999,
      reset: 123456,
      retryAfter: null,
      tier: "pro",
      source: "memory",
    });
    rateLimitMocks.buildDailyQuotaHeaders.mockReturnValue({});
    auditMocks.logApiEvent.mockResolvedValue(undefined);
    apiKeyMocks.touchPersistedApiKeyLastUsedAt.mockResolvedValue(undefined);
    authMocks.buildAuthErrorResponseBody.mockReturnValue({
      code: "unauthenticated",
      message: "Missing API key.",
      detail: "missing_api_key",
    });
  });

  function makeRequest(url: string) {
    return new Request(url, { method: "GET" });
  }

  function makeContext(pathParts: string[]) {
    return {
      params: Promise.resolve({ path: pathParts }),
    };
  }

  function mockSuccessfulRateLimit() {
    rateLimitMocks.enforceAccountRateLimit.mockResolvedValue({
      success: true,
      limit: 1000,
      remaining: 999,
      reset: 123456,
    });
  }

  function mockStorageJson(body = '{"ok":true}') {
    const bodyBytes = new TextEncoder().encode(body);
    storageMocks.readStorageObject.mockResolvedValue({
      body: bodyBytes,
      contentType: "application/json; charset=utf-8",
      contentLength: bodyBytes.byteLength,
      etag: '"etag123"',
      lastModified: "2026-03-19T20:00:00.000Z",
      source: "local",
    });
  }

  it("returns auth failure with X-Request-Id and logs auth_failed", async () => {
    authMocks.validateRequestApiKey.mockResolvedValue({
      ok: false,
      code: "unauthenticated",
      detail: "missing_api_key",
    });

    const response = await GET(
      makeRequest("http://localhost:3000/api/v1/files/meta/bitcoin/latest.json"),
      makeContext(["meta", "bitcoin", "latest.json"])
    );

    const body = await response.json();

    expect(response.status).toBe(401);
    expect(response.headers.get("X-Request-Id")).toBe("req_test_123");
    expect(body).toEqual({
      code: "unauthenticated",
      message: "Missing API key.",
      detail: "missing_api_key",
    });

    expect(auditMocks.logApiEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId: "req_test_123",
        eventType: "auth_failed",
        statusCode: 401,
        detail: "missing_api_key",
      })
    );
  });

  it("returns 429 and logs rate_limited", async () => {
    authMocks.validateRequestApiKey.mockResolvedValue({
      ok: true,
      accountId: "acct_1",
      keyId: "key_1",
      keyPrefix: "ta_live",
      record: { lastUsedAt: null },
      entitlement: { tier: "basic" },
    });

    rateLimitMocks.enforceAccountRateLimit.mockResolvedValue({
      success: false,
      limit: 100,
      remaining: 0,
      reset: 123456,
    });

    rateLimitMocks.buildRateLimitHeaders.mockReturnValue({
      "X-RateLimit-Limit": "100",
      "X-RateLimit-Remaining": "0",
      "X-RateLimit-Reset": "123456",
    });

    const response = await GET(
      makeRequest("http://localhost:3000/api/v1/files/meta/bitcoin/latest.json"),
      makeContext(["meta", "bitcoin", "latest.json"])
    );

    const body = await response.json();

    expect(response.status).toBe(429);
    expect(response.headers.get("X-Request-Id")).toBe("req_test_123");
    expect(response.headers.get("X-RateLimit-Limit")).toBe("100");
    expect(body.code).toBe("rate_limited");

    expect(auditMocks.logApiEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId: "req_test_123",
        eventType: "rate_limited",
        accountId: "acct_1",
        keyId: "key_1",
        statusCode: 429,
      })
    );
  });

  it("returns 403 and logs entitlement_forbidden when entitlement check fails", async () => {
    authMocks.validateRequestApiKey.mockResolvedValue({
      ok: true,
      accountId: "acct_1",
      keyId: "key_1",
      keyPrefix: "ta_live",
      record: { lastUsedAt: null },
      entitlement: { tier: "pro" },
    });

    mockSuccessfulRateLimit();

    entitlementMocks.evaluateFileEntitlement.mockReturnValue({
      ok: false,
      code: "chain_not_entitled",
    });

    const response = await GET(
      makeRequest("http://localhost:3000/api/v1/files/meta/bitcoin/latest.json"),
      makeContext(["meta", "bitcoin", "latest.json"])
    );

    const body = await response.json();

    expect(response.status).toBe(403);
    expect(response.headers.get("X-Request-Id")).toBe("req_test_123");
    expect(body.code).toBe("forbidden");
    expect(body.detail).toBe("chain_not_entitled");

    expect(auditMocks.logApiEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId: "req_test_123",
        eventType: "entitlement_forbidden",
        accountId: "acct_1",
        keyId: "key_1",
        chain: "bitcoin",
        genre: "meta",
        window: "latest",
        statusCode: 403,
        detail: "chain_not_entitled",
      })
    );
  });

  it("returns file content and logs file_served", async () => {
    authMocks.validateRequestApiKey.mockResolvedValue({
      ok: true,
      accountId: "acct_1",
      keyId: "key_1",
      keyPrefix: "ta_live",
      record: { lastUsedAt: null },
      entitlement: { tier: "pro" },
    });

    mockSuccessfulRateLimit();
    entitlementMocks.evaluateFileEntitlement.mockReturnValue({ ok: true });
    mockStorageJson();

    const response = await GET(
      makeRequest("http://localhost:3000/api/v1/files/meta/bitcoin/latest.json"),
      makeContext(["meta", "bitcoin", "latest.json"])
    );

    const text = await response.text();

    expect(response.status).toBe(200);
    expect(text).toBe('{"ok":true}');
    expect(response.headers.get("X-Request-Id")).toBe("req_test_123");
    expect(response.headers.get("X-Account-Id")).toBeNull();
    expect(response.headers.get("X-API-Key-Prefix")).toBeNull();
    expect(response.headers.get("X-Entitlement-Window")).toBe("latest");
    expect(response.headers.get("X-Entitlement-Tier")).toBe("pro");

    expect(auditMocks.logApiEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId: "req_test_123",
        eventType: "file_served",
        accountId: "acct_1",
        keyId: "key_1",
        chain: "bitcoin",
        genre: "meta",
        window: "latest",
        statusCode: 200,
      })
    );

    expect(apiKeyMocks.touchPersistedApiKeyLastUsedAt).toHaveBeenCalledWith(
      "key_1",
      null
    );
  });

  it("lets Pro with historyUnlocked read the full-history manifest", async () => {
    authMocks.validateRequestApiKey.mockResolvedValue({
      ok: true,
      accountId: "acct_pro",
      keyId: "key_pro",
      keyPrefix: "ta_live",
      record: { lastUsedAt: null },
      entitlement: {
        tier: "pro",
        status: "active",
        entitledChain: null,
        historyUnlocked: true,
      },
    });

    mockSuccessfulRateLimit();
    mockStorageJson('{"available_days":["2024-12-01","2026-08-14"]}');

    const response = await GET(
      makeRequest("http://localhost:3000/api/v1/files/meta/ethereum/manifest.json"),
      makeContext(["meta", "ethereum", "manifest.json"])
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("X-Entitlement-Window")).toBe("full_history");
    expect(storageMocks.readStorageObject).toHaveBeenCalledWith(
      "data/published/v1/meta/ethereum/manifest.json"
    );
    expect(entitlementMocks.evaluateFileEntitlement).not.toHaveBeenCalled();
  });

  it("lets Pro with historyUnlocked read any published historical day file", async () => {
    authMocks.validateRequestApiKey.mockResolvedValue({
      ok: true,
      accountId: "acct_pro",
      keyId: "key_pro",
      keyPrefix: "ta_live",
      record: { lastUsedAt: null },
      entitlement: {
        tier: "pro",
        status: "active",
        entitledChain: null,
        historyUnlocked: true,
      },
    });

    mockSuccessfulRateLimit();
    mockStorageJson('{"date":"2024-12-01"}');

    const response = await GET(
      makeRequest("http://localhost:3000/api/v1/files/meta/bitcoin/2024-12-01.json"),
      makeContext(["meta", "bitcoin", "2024-12-01.json"])
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("X-Entitlement-Window")).toBe("full_history");
    expect(storageMocks.readStorageObject).toHaveBeenCalledWith(
      "data/published/v1/meta/bitcoin/2024-12-01.json"
    );
  });

  it("keeps Basic subscribers out of manifest and day-file full-history routes", async () => {
    authMocks.validateRequestApiKey.mockResolvedValue({
      ok: true,
      accountId: "acct_basic",
      keyId: "key_basic",
      keyPrefix: "ta_live",
      record: { lastUsedAt: null },
      entitlement: {
        tier: "basic",
        status: "active",
        entitledChain: "ethereum",
        historyUnlocked: false,
      },
    });

    mockSuccessfulRateLimit();

    const response = await GET(
      makeRequest("http://localhost:3000/api/v1/files/meta/ethereum/manifest.json"),
      makeContext(["meta", "ethereum", "manifest.json"])
    );

    const body = await response.json();
    expect(response.status).toBe(403);
    expect(body.code).toBe("forbidden");
    expect(body.detail).toBe("full_history_requires_pro");
    expect(storageMocks.readStorageObject).not.toHaveBeenCalled();
  });

  it("returns 500 and logs server_error when storage throws", async () => {
    authMocks.validateRequestApiKey.mockResolvedValue({
      ok: true,
      accountId: "acct_1",
      keyId: "key_1",
      keyPrefix: "ta_live",
      record: { lastUsedAt: null },
      entitlement: { tier: "pro" },
    });

    mockSuccessfulRateLimit();
    entitlementMocks.evaluateFileEntitlement.mockReturnValue({ ok: true });
    storageMocks.readStorageObject.mockRejectedValue(new Error("storage exploded"));

    const response = await GET(
      makeRequest("http://localhost:3000/api/v1/files/meta/bitcoin/latest.json"),
      makeContext(["meta", "bitcoin", "latest.json"])
    );

    const body = await response.json();

    expect(response.status).toBe(500);
    expect(response.headers.get("X-Request-Id")).toBe("req_test_123");
    expect(body.code).toBe("server_error");
    expect(body.detail).toBe("storage exploded");

    expect(auditMocks.logApiEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId: "req_test_123",
        eventType: "server_error",
        accountId: "acct_1",
        keyId: "key_1",
        chain: "bitcoin",
        genre: "meta",
        window: "latest",
        statusCode: 500,
        detail: "storage exploded",
      })
    );
  });
});
