/**
 * @jest-environment node
 */

import fs from "fs";
import os from "os";
import path from "path";

describe("auditLog", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("creates a request id when none exists in headers", async () => {
    const mod = await import("@/lib/auditLog");
    const headers = new Headers();

    const requestId = mod.getOrCreateRequestId(headers);

    expect(typeof requestId).toBe("string");
    expect(requestId.length).toBeGreaterThan(10);
  });

  it("reuses x-request-id header when present", async () => {
    const mod = await import("@/lib/auditLog");
    const headers = new Headers({
      "x-request-id": "req_existing_123",
    });

    const requestId = mod.getOrCreateRequestId(headers);

    expect(requestId).toBe("req_existing_123");
  });

  it("falls back to x-correlation-id when x-request-id is absent", async () => {
    const mod = await import("@/lib/auditLog");
    const headers = new Headers({
      "x-correlation-id": "corr_456",
    });

    const requestId = mod.getOrCreateRequestId(headers);

    expect(requestId).toBe("corr_456");
  });

  it("maps latency into expected buckets", async () => {
    const mod = await import("@/lib/auditLog");

    expect(mod.getLatencyBucket(1000, 1020)).toBe("lt_50ms");
    expect(mod.getLatencyBucket(1000, 1100)).toBe("50_200ms");
    expect(mod.getLatencyBucket(1000, 1500)).toBe("200_1000ms");
    expect(mod.getLatencyBucket(1000, 2500)).toBe("gte_1000ms");
  });

  it("writes an audit entry to disk and console fallback path stays non-throwing", async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "audit-log-test-"));
    process.env.AUDIT_LOG_DIR = tempDir;

    const infoSpy = jest.spyOn(console, "info").mockImplementation(() => {});

    const mod = await import("@/lib/auditLog");

    await mod.logApiEvent({
      requestId: "req_test_1",
      eventType: "file_served",
      path: "/api/v1/files/meta/bitcoin/latest.json",
      method: "GET",
      statusCode: 200,
      startedAtMs: 1000,
      endedAtMs: 1120,
      accountId: "acct_1",
      keyId: "key_1",
      detail: "served_ok",
      chain: "bitcoin",
      genre: "meta",
      window: "latest",
    });

    const logPath = path.join(tempDir, "audit.log");
    expect(fs.existsSync(logPath)).toBe(true);

    const raw = fs.readFileSync(logPath, "utf8").trim();
    expect(raw.length).toBeGreaterThan(0);

    const parsed = JSON.parse(raw);
    expect(parsed.request_id).toBe("req_test_1");
    expect(parsed.event_type).toBe("file_served");
    expect(parsed.path).toBe("/api/v1/files/meta/bitcoin/latest.json");
    expect(parsed.method).toBe("GET");
    expect(parsed.status_code).toBe(200);
    expect(parsed.latency_bucket).toBe("50_200ms");
    expect(parsed.account_id).toBe("acct_1");
    expect(parsed.key_id).toBe("key_1");
    expect(parsed.chain).toBe("bitcoin");
    expect(parsed.genre).toBe("meta");
    expect(parsed.window).toBe("latest");

    expect(infoSpy).toHaveBeenCalled();

    infoSpy.mockRestore();
  });

  it("sanitizes long and blank fields", async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "audit-log-test-"));
    process.env.AUDIT_LOG_DIR = tempDir;

    const infoSpy = jest.spyOn(console, "info").mockImplementation(() => {});

    const mod = await import("@/lib/auditLog");

    await mod.logApiEvent({
      requestId: "req_test_2",
      eventType: "entitlement_forbidden",
      path: "/api/v1/files/meta/ethereum/latest.json",
      method: "GET",
      statusCode: 403,
      startedAtMs: 0,
      endedAtMs: 2500,
      accountId: "   ",
      keyId: "key_" + "x".repeat(300),
      detail: "d".repeat(300),
      chain: "ethereum",
      genre: "meta",
      window: "latest",
    });

    const logPath = path.join(tempDir, "audit.log");
    const raw = fs.readFileSync(logPath, "utf8").trim();
    const parsed = JSON.parse(raw);

    expect(parsed.account_id).toBeNull();
    expect(parsed.key_id.length).toBeLessThanOrEqual(256);
    expect(parsed.detail.length).toBeLessThanOrEqual(256);
    expect(parsed.latency_bucket).toBe("gte_1000ms");

    infoSpy.mockRestore();
  });
});