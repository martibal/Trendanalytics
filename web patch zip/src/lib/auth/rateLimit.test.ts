// src/lib/auth/rateLimit.test.ts
jest.mock("@upstash/redis", () => ({
  Redis: jest.fn(),
}));

jest.mock("@upstash/ratelimit", () => {
  class MockRatelimit {
    public static slidingWindow = jest.fn((limit: number, window: string) => ({
      kind: "slidingWindow",
      limit,
      window,
    }));

    public limit = jest.fn(async () => ({
      success: true,
      limit: 60,
      remaining: 59,
      reset: Date.now() + 60_000,
    }));

    constructor() {}
  }

  return {
    Ratelimit: MockRatelimit,
  };
});

import {
  buildRateLimitHeaders,
  enforceAccountRateLimit,
  type RateLimitDecision,
} from "@/lib/auth/rateLimit";

describe("auth/rateLimit", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.restoreAllMocks();
    process.env.UPSTASH_REDIS_REST_URL = "";
    process.env.UPSTASH_REDIS_REST_TOKEN = "";
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("falls back to memory mode when Upstash credentials are missing", async () => {
    const now = 1_700_000_000_000;
    jest.spyOn(Date, "now").mockReturnValue(now);

    const decision = await enforceAccountRateLimit(
      `acct-memory-fallback-${now}`,
      "basic"
    );

    expect(decision.success).toBe(true);
    expect(decision.limit).toBe(60);
    expect(decision.remaining).toBe(59);
    expect(decision.retryAfter).toBeNull();
    expect(decision.tier).toBe("basic");
    expect(decision.source).toBe("memory");
    expect(decision.reset).toBe(now + 60_000);
  });

  it("uses the pro limit in memory mode", async () => {
    const now = 1_700_000_100_000;
    jest.spyOn(Date, "now").mockReturnValue(now);

    const decision = await enforceAccountRateLimit(
      `acct-pro-limit-${now}`,
      "pro"
    );

    expect(decision.success).toBe(true);
    expect(decision.limit).toBe(300);
    expect(decision.remaining).toBe(299);
    expect(decision.retryAfter).toBeNull();
    expect(decision.tier).toBe("pro");
    expect(decision.source).toBe("memory");
    expect(decision.reset).toBe(now + 60_000);
  });

  it("counts repeated requests inside the same memory window", async () => {
    const now = 1_700_000_200_000;
    jest.spyOn(Date, "now").mockReturnValue(now);

    const accountId = `acct-same-window-${now}`;

    const first = await enforceAccountRateLimit(accountId, "basic");
    const second = await enforceAccountRateLimit(accountId, "basic");
    const third = await enforceAccountRateLimit(accountId, "basic");

    expect(first.success).toBe(true);
    expect(first.remaining).toBe(59);

    expect(second.success).toBe(true);
    expect(second.remaining).toBe(58);

    expect(third.success).toBe(true);
    expect(third.remaining).toBe(57);

    expect(first.reset).toBe(second.reset);
    expect(second.reset).toBe(third.reset);
  });

  it("returns a blocked decision with Retry-After when the basic memory limit is exceeded", async () => {
    const now = 1_700_000_300_000;
    jest.spyOn(Date, "now").mockReturnValue(now);

    const accountId = `acct-basic-exhaust-${now}`;
    let lastDecision: RateLimitDecision | null = null;

    for (let i = 0; i < 60; i += 1) {
      lastDecision = await enforceAccountRateLimit(accountId, "basic");
    }

    expect(lastDecision).not.toBeNull();
    expect(lastDecision?.success).toBe(true);
    expect(lastDecision?.remaining).toBe(0);

    const blocked = await enforceAccountRateLimit(accountId, "basic");

    expect(blocked.success).toBe(false);
    expect(blocked.limit).toBe(60);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfter).toBe(60);
    expect(blocked.tier).toBe("basic");
    expect(blocked.source).toBe("memory");
    expect(blocked.reset).toBe(now + 60_000);
  });

  it("opens a new memory window after reset time passes", async () => {
    const start = 1_700_000_400_000;
    const dateNowSpy = jest.spyOn(Date, "now");

    dateNowSpy.mockReturnValue(start);

    const accountId = `acct-window-reset-${start}`;

    for (let i = 0; i < 60; i += 1) {
      await enforceAccountRateLimit(accountId, "basic");
    }

    const blocked = await enforceAccountRateLimit(accountId, "basic");
    expect(blocked.success).toBe(false);
    expect(blocked.retryAfter).toBe(60);

    dateNowSpy.mockReturnValue(start + 60_001);

    const reopened = await enforceAccountRateLimit(accountId, "basic");

    expect(reopened.success).toBe(true);
    expect(reopened.limit).toBe(60);
    expect(reopened.remaining).toBe(59);
    expect(reopened.retryAfter).toBeNull();
    expect(reopened.source).toBe("memory");
    expect(reopened.reset).toBe(start + 60_001 + 60_000);
  });

  it("isolates counters by tier for the same account id", async () => {
    const now = 1_700_000_500_000;
    jest.spyOn(Date, "now").mockReturnValue(now);

    const accountId = `acct-tier-isolation-${now}`;

    const basicFirst = await enforceAccountRateLimit(accountId, "basic");
    const proFirst = await enforceAccountRateLimit(accountId, "pro");

    expect(basicFirst.limit).toBe(60);
    expect(basicFirst.remaining).toBe(59);
    expect(basicFirst.source).toBe("memory");

    expect(proFirst.limit).toBe(300);
    expect(proFirst.remaining).toBe(299);
    expect(proFirst.source).toBe("memory");
  });

  it("builds standard rate limit headers for successful decisions", () => {
    const headers = buildRateLimitHeaders({
      success: true,
      limit: 60,
      remaining: 42,
      reset: 1_700_000_600_000,
      retryAfter: null,
      tier: "basic",
      source: "memory",
    });

    expect(headers).toEqual({
      "X-RateLimit-Limit": "60",
      "X-RateLimit-Remaining": "42",
      "X-RateLimit-Reset": String(Math.floor(1_700_000_600_000 / 1000)),
    });
  });

  it("adds Retry-After for blocked decisions", () => {
    const headers = buildRateLimitHeaders({
      success: false,
      limit: 300,
      remaining: 0,
      reset: 1_700_000_700_000,
      retryAfter: 12,
      tier: "pro",
      source: "memory",
    });

    expect(headers).toEqual({
      "X-RateLimit-Limit": "300",
      "X-RateLimit-Remaining": "0",
      "X-RateLimit-Reset": String(Math.floor(1_700_000_700_000 / 1000)),
      "Retry-After": "12",
    });
  });
});