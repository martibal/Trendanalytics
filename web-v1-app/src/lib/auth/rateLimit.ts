// src/lib/auth/rateLimit.ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import type { SubscriptionTier } from "@/lib/auth/entitlements";

export type RateLimitTier = Extract<SubscriptionTier, "basic" | "pro">;

export type RateLimitDecision = {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
  retryAfter: number | null;
  tier: RateLimitTier;
  source: "upstash" | "memory" | "fail_closed";
};

export type DailyApiQuotaDecision = {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
  retryAfter: number | null;
  tier: RateLimitTier;
  source: "upstash" | "memory" | "fail_closed";
};

type MemoryWindow = {
  count: number;
  resetAt: number;
};

const WINDOW_MS = 60_000;
const BASIC_LIMIT = 60;
const PRO_LIMIT = 300;
const FAIL_CLOSED_RETRY_AFTER_SECONDS = 60;
const BASIC_DAILY_QUOTA = Number.parseInt(process.env.BASIC_DAILY_API_QUOTA ?? "500", 10);
const PRO_DAILY_QUOTA = Number.parseInt(process.env.PRO_DAILY_API_QUOTA ?? "5000", 10);

const memoryStore = new Map<string, MemoryWindow>();
const dailyQuotaMemoryStore = new Map<string, MemoryWindow>();

function getLimitForTier(tier: RateLimitTier): number {
  return tier === "pro" ? PRO_LIMIT : BASIC_LIMIT;
}

function getDailyQuotaForTier(tier: RateLimitTier): number {
  const value = tier === "pro" ? PRO_DAILY_QUOTA : BASIC_DAILY_QUOTA;

  if (!Number.isFinite(value) || value <= 0) {
    return tier === "pro" ? 5_000 : 500;
  }

  return Math.floor(value);
}

function getUtcDayToken(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

function getNextUtcMidnightMs(nowMs = Date.now()): number {
  const now = new Date(nowMs);
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0);
}

function getSecondsUntilNextUtcMidnight(nowMs = Date.now()): number {
  return Math.max(1, Math.ceil((getNextUtcMidnightMs(nowMs) - nowMs) / 1000));
}

function isProductionRuntime(): boolean {
  return process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production";
}

function buildFailClosedDecision(tier: RateLimitTier): RateLimitDecision {
  const now = Date.now();
  const reset = now + FAIL_CLOSED_RETRY_AFTER_SECONDS * 1000;

  return {
    success: false,
    limit: 0,
    remaining: 0,
    reset,
    retryAfter: FAIL_CLOSED_RETRY_AFTER_SECONDS,
    tier,
    source: "fail_closed",
  };
}

function getRedisClient(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return null;
  }

  return new Redis({
    url,
    token,
  });
}

function getRatelimiter(tier: RateLimitTier): Ratelimit | null {
  const redis = getRedisClient();

  if (!redis) {
    return null;
  }

  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(getLimitForTier(tier), "60 s"),
    analytics: false,
    prefix: `ta:rl:${tier}`,
  });
}

function getMemoryKey(accountId: string, tier: RateLimitTier): string {
  return `${tier}:${accountId}`;
}

function cleanupMemoryStore(now: number) {
  for (const [key, value] of memoryStore.entries()) {
    if (value.resetAt <= now) {
      memoryStore.delete(key);
    }
  }

  for (const [key, value] of dailyQuotaMemoryStore.entries()) {
    if (value.resetAt <= now) {
      dailyQuotaMemoryStore.delete(key);
    }
  }
}

function applyMemoryRateLimit(accountId: string, tier: RateLimitTier): RateLimitDecision {
  const now = Date.now();
  cleanupMemoryStore(now);

  const limit = getLimitForTier(tier);
  const key = getMemoryKey(accountId, tier);
  const existing = memoryStore.get(key);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + WINDOW_MS;

    memoryStore.set(key, {
      count: 1,
      resetAt,
    });

    return {
      success: true,
      limit,
      remaining: limit - 1,
      reset: resetAt,
      retryAfter: null,
      tier,
      source: "memory",
    };
  }

  if (existing.count >= limit) {
    const retryAfterMs = Math.max(0, existing.resetAt - now);
    const retryAfter = Math.max(1, Math.ceil(retryAfterMs / 1000));

    return {
      success: false,
      limit,
      remaining: 0,
      reset: existing.resetAt,
      retryAfter,
      tier,
      source: "memory",
    };
  }

  existing.count += 1;
  memoryStore.set(key, existing);

  return {
    success: true,
    limit,
    remaining: Math.max(0, limit - existing.count),
    reset: existing.resetAt,
    retryAfter: null,
    tier,
    source: "memory",
  };
}

async function applyUpstashRateLimit(accountId: string, tier: RateLimitTier): Promise<RateLimitDecision> {
  const ratelimit = getRatelimiter(tier);

  if (!ratelimit) {
    if (isProductionRuntime()) {
      console.error("[rateLimit] production rate-limit backend is not configured; failing closed", {
        tier,
      });

      return buildFailClosedDecision(tier);
    }

    return applyMemoryRateLimit(accountId, tier);
  }

  try {
    const result = await ratelimit.limit(accountId);
    const reset = typeof result.reset === "number" ? result.reset : Date.now() + WINDOW_MS;
    const retryAfter = result.success ? null : Math.max(1, Math.ceil((reset - Date.now()) / 1000));

    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset,
      retryAfter,
      tier,
      source: "upstash",
    };
  } catch (error) {
    console.error("[rateLimit] rate-limit backend failed", {
      tier,
      error: error instanceof Error ? error.message : String(error),
    });

    if (isProductionRuntime()) {
      return buildFailClosedDecision(tier);
    }

    return applyMemoryRateLimit(accountId, tier);
  }
}

function buildDailyQuotaFailClosedDecision(tier: RateLimitTier): DailyApiQuotaDecision {
  const now = Date.now();
  const reset = now + FAIL_CLOSED_RETRY_AFTER_SECONDS * 1000;

  return {
    success: false,
    limit: 0,
    remaining: 0,
    reset,
    retryAfter: FAIL_CLOSED_RETRY_AFTER_SECONDS,
    tier,
    source: "fail_closed",
  };
}

function buildDailyQuotaMemoryKey(accountId: string, apiKeyId: string, tier: RateLimitTier): string {
  return `${getUtcDayToken()}:${tier}:${accountId}:${apiKeyId}`;
}

function applyMemoryDailyQuota(
  accountId: string,
  apiKeyId: string,
  tier: RateLimitTier
): DailyApiQuotaDecision {
  const now = Date.now();
  cleanupMemoryStore(now);

  const limit = getDailyQuotaForTier(tier);
  const resetAt = getNextUtcMidnightMs(now);
  const key = buildDailyQuotaMemoryKey(accountId, apiKeyId, tier);
  const existing = dailyQuotaMemoryStore.get(key);

  if (!existing || existing.resetAt <= now) {
    dailyQuotaMemoryStore.set(key, {
      count: 1,
      resetAt,
    });

    return {
      success: true,
      limit,
      remaining: limit - 1,
      reset: resetAt,
      retryAfter: null,
      tier,
      source: "memory",
    };
  }

  if (existing.count >= limit) {
    const retryAfter = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));

    return {
      success: false,
      limit,
      remaining: 0,
      reset: existing.resetAt,
      retryAfter,
      tier,
      source: "memory",
    };
  }

  existing.count += 1;
  dailyQuotaMemoryStore.set(key, existing);

  return {
    success: true,
    limit,
    remaining: Math.max(0, limit - existing.count),
    reset: existing.resetAt,
    retryAfter: null,
    tier,
    source: "memory",
  };
}

async function applyUpstashDailyQuota(
  accountId: string,
  apiKeyId: string,
  tier: RateLimitTier
): Promise<DailyApiQuotaDecision> {
  const redis = getRedisClient();

  if (!redis) {
    if (isProductionRuntime()) {
      console.error("[rateLimit] production daily quota backend is not configured; failing closed", {
        tier,
      });

      return buildDailyQuotaFailClosedDecision(tier);
    }

    return applyMemoryDailyQuota(accountId, apiKeyId, tier);
  }

  const now = Date.now();
  const reset = getNextUtcMidnightMs(now);
  const ttlSeconds = getSecondsUntilNextUtcMidnight(now);
  const limit = getDailyQuotaForTier(tier);
  const day = getUtcDayToken(new Date(now));
  const key = `ta:quota:${day}:${tier}:${accountId}:${apiKeyId}`;

  try {
    const count = await redis.incr(key);

    if (count === 1) {
      await redis.expire(key, ttlSeconds);
    }

    const remaining = Math.max(0, limit - count);
    const retryAfter = count > limit ? Math.max(1, Math.ceil((reset - now) / 1000)) : null;

    return {
      success: count <= limit,
      limit,
      remaining,
      reset,
      retryAfter,
      tier,
      source: "upstash",
    };
  } catch (error) {
    console.error("[rateLimit] daily quota backend failed", {
      tier,
      error: error instanceof Error ? error.message : String(error),
    });

    if (isProductionRuntime()) {
      return buildDailyQuotaFailClosedDecision(tier);
    }

    return applyMemoryDailyQuota(accountId, apiKeyId, tier);
  }
}

export async function enforceDailyApiQuota(
  accountId: string,
  apiKeyId: string,
  tier: RateLimitTier
): Promise<DailyApiQuotaDecision> {
  return applyUpstashDailyQuota(accountId, apiKeyId, tier);
}

export function buildDailyQuotaHeaders(decision: DailyApiQuotaDecision): Record<string, string> {
  const headers: Record<string, string> = {
    "X-DailyQuota-Limit": String(decision.limit),
    "X-DailyQuota-Remaining": String(decision.remaining),
    "X-DailyQuota-Reset": String(Math.floor(decision.reset / 1000)),
  };

  if (!decision.success && decision.retryAfter !== null) {
    headers["Retry-After"] = String(decision.retryAfter);
  }

  return headers;
}

export async function enforceAccountRateLimit(
  accountId: string,
  tier: RateLimitTier
): Promise<RateLimitDecision> {
  return applyUpstashRateLimit(accountId, tier);
}

export function buildRateLimitHeaders(decision: RateLimitDecision): Record<string, string> {
  const headers: Record<string, string> = {
    "X-RateLimit-Limit": String(decision.limit),
    "X-RateLimit-Remaining": String(decision.remaining),
    "X-RateLimit-Reset": String(Math.floor(decision.reset / 1000)),
  };

  if (!decision.success && decision.retryAfter !== null) {
    headers["Retry-After"] = String(decision.retryAfter);
  }

  return headers;
}
