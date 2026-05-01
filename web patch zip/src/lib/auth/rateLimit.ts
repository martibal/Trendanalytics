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
  source: "upstash" | "memory";
};

type MemoryWindow = {
  count: number;
  resetAt: number;
};

const WINDOW_MS = 60_000;
const BASIC_LIMIT = 60;
const PRO_LIMIT = 300;

const memoryStore = new Map<string, MemoryWindow>();

function getLimitForTier(tier: RateLimitTier): number {
  return tier === "pro" ? PRO_LIMIT : BASIC_LIMIT;
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
    return applyMemoryRateLimit(accountId, tier);
  }

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