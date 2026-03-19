/**
 * @jest-environment node
 */

import type { Mock } from "jest-mock";

const validateRequestApiKeyMock = jest.fn();
const buildAuthErrorResponseBodyMock = jest.fn();
const enforceAccountRateLimitMock = jest.fn();
const buildRateLimitHeadersMock = jest.fn();
const evaluateFileEntitlementMock = jest.fn();
const readStorageObjectMock = jest.fn();
const currentDataSourceMock = jest.fn();
const getOrCreateRequestIdMock = jest.fn();
const logApiEventMock = jest.fn();

jest.mock("@/lib/auth/validateToken", () => ({
  validateRequestApiKey: (...args: unknown[]) => validateRequestApiKeyMock(...args),
  buildAuthErrorResponseBody: (...args: unknown[]) => buildAuthErrorResponseBodyMock(...args),
}));

jest.mock("@/lib/auth/rateLimit", () => ({
  enforceAccountRateLimit: (...args: unknown[]) => enforceAccountRateLimitMock(...args),
  buildRateLimitHeaders: (...args: unknown[]) => buildRateLimitHeadersMock(...args),
}));

jest.mock("@/lib/auth/entitlements", () => ({
  evaluateFileEntitlement: (...args: unknown[]) => evaluateFileEntitlementMock(...args),
  isWindowToken: (value: string) =>
    value === "latest" ||
    value === "7d" ||
    value === "30d" ||
    value === "90d" ||
    value === "180d" ||
    value === "365d",
}));

jest.mock("@/lib/storage", () => ({
  readStorageObject: (...args: unknown[]) => readStorageObjectMock(...args),
  currentDataSource: (...args: unknown[]) => currentDataSourceMock(...args),
}));

jest.mock("@/lib/auditLog", () => ({
  getOrCreateRequestId: (...args: unknown[]) => getOrCreateRequestIdMock(...args),
  logApiEvent: (...args: unknown[]) => logApiEventMock(...args),
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

    getOrCreateRequestIdMock.mockReturnValue("req_test_123");
    currentDataSourceMock.mockReturnValue("local");
    buildRateLimitHeadersMock.mockReturnValue({});
    logApiEventMock.mockResolvedValue(undefined);
    buildAuthErrorResponseBodyMock.mockReturnValue({
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

  it("returns auth failure with X-Request-Id and logs auth_failed", async () => {
    validateRequestApiKeyMock.mockResolvedValue({
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

    expect(logApiEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId: "req_test_123",
        eventType: "auth_failed",
        statusCode: 401,
        detail: "missing_api_key",
      })
    );
  });

  it("returns 429 and logs rate_limited", async () => {
    validateRequestApiKeyMock.mockResolvedValue({
      ok: true,
      accountId: "acct_1",
      keyId: "key_1",
      keyPrefix: "ta_live",
      entitlement: {
        tier: "basic",
      },
    });

    enforceAccountRateLimitMock.mockResolvedValue({
      success: false,
      limit: 100,
      remaining: 0,
      reset: 123456,
    });

    buildRateLimitHeadersMock.mockReturnValue({
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

    expect(logApiEventMock).toHaveBeenCalledWith(
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
    validateRequestApiKeyMock.mockResolvedValue({
      ok: true,
      accountId: "acct_1",
      keyId: "key_1",
      keyPrefix: "ta_live",
      entitlement: {
        tier: "pro",
      },
    });

    enforceAccountRateLimitMock.mockResolvedValue({
      success: true,
      limit: 1000,
      remaining: 999,
      reset: 123456,
    });

    evaluateFileEntitlementMock.mockReturnValue({
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

    expect(logApiEventMock).toHaveBeenCalledWith(
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
    validateRequestApiKeyMock.mockResolvedValue({
      ok: true,
      accountId: "acct_1",
      keyId: "key_1",
      keyPrefix: "ta_live",
      entitlement: {
        tier: "pro",
      },
    });

    enforceAccountRateLimitMock.mockResolvedValue({
      success: true,
      limit: 1000,
      remaining: 999,
      reset: 123456,
    });

    evaluateFileEntitlementMock.mockReturnValue({
      ok: true,
    });

    const bodyBytes = new TextEncoder().encode('{"ok":true}');

    readStorageObjectMock.mockResolvedValue({
      body: bodyBytes,
      contentType: "application/json; charset=utf-8",
      contentLength: bodyBytes.byteLength,
      etag: '"etag123"',
      lastModified: "2026-03-19T20:00:00.000Z",
      source: "local",
    });

    const response = await GET(
      makeRequest("http://localhost:3000/api/v1/files/meta/bitcoin/latest.json"),
      makeContext(["meta", "bitcoin", "latest.json"])
    );

    const text = await response.text();

    expect(response.status).toBe(200);
    expect(text).toBe('{"ok":true}');
    expect(response.headers.get("X-Request-Id")).toBe("req_test_123");
    expect(response.headers.get("X-Account-Id")).toBe("acct_1");
    expect(response.headers.get("X-API-Key-Prefix")).toBe("ta_live");
    expect(response.headers.get("X-Entitlement-Window")).toBe("latest");
    expect(response.headers.get("X-Data-Source")).toBe("local");
    expect(response.headers.get("X-Storage-Backend")).toBe("local");

    expect(logApiEventMock).toHaveBeenCalledWith(
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
  });

  it("returns 500 and logs server_error when storage throws", async () => {
    validateRequestApiKeyMock.mockResolvedValue({
      ok: true,
      accountId: "acct_1",
      keyId: "key_1",
      keyPrefix: "ta_live",
      entitlement: {
        tier: "pro",
      },
    });

    enforceAccountRateLimitMock.mockResolvedValue({
      success: true,
      limit: 1000,
      remaining: 999,
      reset: 123456,
    });

    evaluateFileEntitlementMock.mockReturnValue({
      ok: true,
    });

    readStorageObjectMock.mockRejectedValue(new Error("storage exploded"));

    const response = await GET(
      makeRequest("http://localhost:3000/api/v1/files/meta/bitcoin/latest.json"),
      makeContext(["meta", "bitcoin", "latest.json"])
    );

    const body = await response.json();

    expect(response.status).toBe(500);
    expect(response.headers.get("X-Request-Id")).toBe("req_test_123");
    expect(body.code).toBe("server_error");
    expect(body.detail).toBe("storage exploded");

    expect(logApiEventMock).toHaveBeenCalledWith(
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