import "server-only";

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";

type PreAuthRateLimitSource = "upstash" | "memory" | "fail_closed";

type PreAuthRateLimitSuccess = {
  ok: true;
  source: PreAuthRateLimitSource;
  limit: number;
  remaining: number;
  reset: number;
};

type PreAuthRateLimitFailure = {
  ok: false;
  source: PreAuthRateLimitSource;
  limit: number;
  remaining: number;
  reset: number;
  retryAfter: number;
  detail: string;
  response: NextResponse;
};

export type PreAuthRateLimitDecision = PreAuthRateLimitSuccess | PreAuthRateLimitFailure;

type MemoryWindow = {
  count: number;
  resetAt: number;
};

const WINDOW_MS = 60_000;
const DEFAULT_PREAUTH_LIMIT_PER_MINUTE = 600;
const SCOPE_DEFAULT_LIMITS_PER_MINUTE: Record<string, number> = {
  "checkout-api": 30,
  "keys-api": 30,
  "stripe-webhook": 120,
  "public-read-api": 120,
  "file-api": 300,
};
const FAIL_CLOSED_RETRY_AFTER_SECONDS = 60;

const memoryStore = new Map<string, MemoryWindow>();

function isProductionRuntime(): boolean {
  return process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production";
}

function envKeyForScope(scope: string): string {
  const normalized = scope
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return normalized ? `PREAUTH_RATE_LIMIT_${normalized}_PER_MINUTE` : "PREAUTH_RATE_LIMIT_PER_MINUTE";
}

function parsePositiveInteger(value: string | undefined, fallback: number): number {
  const parsed = value ? Number.parseInt(value, 10) : fallback;

  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return parsed;
}

function getLimit(scope: string): number {
  const scopedRaw = process.env[envKeyForScope(scope)]?.trim();
  const globalRaw = process.env.PREAUTH_RATE_LIMIT_PER_MINUTE?.trim();
  const scopeDefault = SCOPE_DEFAULT_LIMITS_PER_MINUTE[scope] ?? DEFAULT_PREAUTH_LIMIT_PER_MINUTE;

  if (scopedRaw) {
    return parsePositiveInteger(scopedRaw, scopeDefault);
  }

  if (globalRaw) {
    return parsePositiveInteger(globalRaw, scopeDefault);
  }

  return scopeDefault;
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

function getRatelimiter(scope: string, limit: number): Ratelimit | null {
  const redis = getRedisClient();

  if (!redis) {
    return null;
  }

  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, "60 s"),
    analytics: false,
    prefix: `ta:rl:preauth:${scope}`,
  });
}

function firstHeaderValue(value: string | null): string | null {
  const first = value?.split(",")[0]?.trim();

  return first || null;
}

function getClientIp(request: Request): string {
  return (
    firstHeaderValue(request.headers.get("x-forwarded-for")) ??
    firstHeaderValue(request.headers.get("x-real-ip")) ??
    firstHeaderValue(request.headers.get("cf-connecting-ip")) ??
    "unknown"
  );
}

function cleanupMemoryStore(now: number) {
  for (const [key, value] of memoryStore.entries()) {
    if (value.resetAt <= now) {
      memoryStore.delete(key);
    }
  }
}

function buildHeaders(params: {
  limit: number;
  remaining: number;
  reset: number;
  retryAfter?: number | null;
  requestId?: string | null;
}): Record<string, string> {
  return {
    ...(params.requestId ? { "X-Request-Id": params.requestId } : {}),
    "X-RateLimit-Limit": String(params.limit),
    "X-RateLimit-Remaining": String(params.remaining),
    "X-RateLimit-Reset": String(Math.floor(params.reset / 1000)),
    ...(params.retryAfter ? { "Retry-After": String(params.retryAfter) } : {}),
    "Cache-Control": "no-store",
  };
}

function buildRateLimitedResponse(params: {
  detail: string;
  limit: number;
  reset: number;
  retryAfter: number;
  requestId?: string | null;
}) {
  return NextResponse.json(
    {
      code: "rate_limited",
      message: "Too many API requests.",
      detail: params.detail,
    },
    {
      status: 429,
      headers: buildHeaders({
        limit: params.limit,
        remaining: 0,
        reset: params.reset,
        retryAfter: params.retryAfter,
        requestId: params.requestId,
      }),
    }
  );
}

function buildFailClosedDecision(scope: string, requestId?: string | null): PreAuthRateLimitFailure {
  const now = Date.now();
  const reset = now + FAIL_CLOSED_RETRY_AFTER_SECONDS * 1000;
  const detail = `Pre-auth rate-limit backend is not configured for scope '${scope}'.`;

  return {
    ok: false,
    source: "fail_closed",
    limit: 0,
    remaining: 0,
    reset,
    retryAfter: FAIL_CLOSED_RETRY_AFTER_SECONDS,
    detail,
    response: buildRateLimitedResponse({
      detail,
      limit: 0,
      reset,
      retryAfter: FAIL_CLOSED_RETRY_AFTER_SECONDS,
      requestId,
    }),
  };
}

function applyMemoryRateLimit(
  key: string,
  scope: string,
  limit: number,
  requestId?: string | null
): PreAuthRateLimitDecision {
  const now = Date.now();
  cleanupMemoryStore(now);

  const memoryKey = `${scope}:${key}`;
  const existing = memoryStore.get(memoryKey);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + WINDOW_MS;

    memoryStore.set(memoryKey, {
      count: 1,
      resetAt,
    });

    return {
      ok: true,
      source: "memory",
      limit,
      remaining: limit - 1,
      reset: resetAt,
    };
  }

  if (existing.count >= limit) {
    const retryAfter = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
    const detail = `Pre-auth rate limit exceeded for scope '${scope}'.`;

    return {
      ok: false,
      source: "memory",
      limit,
      remaining: 0,
      reset: existing.resetAt,
      retryAfter,
      detail,
      response: buildRateLimitedResponse({
        detail,
        limit,
        reset: existing.resetAt,
        retryAfter,
        requestId,
      }),
    };
  }

  existing.count += 1;
  memoryStore.set(memoryKey, existing);

  return {
    ok: true,
    source: "memory",
    limit,
    remaining: Math.max(0, limit - existing.count),
    reset: existing.resetAt,
  };
}

export async function enforcePreAuthRateLimit(
  request: Request,
  scope: string,
  requestId?: string | null
): Promise<PreAuthRateLimitDecision> {
  const limit = getLimit(scope);
  const key = getClientIp(request);
  const ratelimit = getRatelimiter(scope, limit);

  if (!ratelimit) {
    if (isProductionRuntime()) {
      console.error("[preAuthRateLimit] production pre-auth rate-limit backend missing; failing closed", {
        scope,
      });

      return buildFailClosedDecision(scope, requestId);
    }

    return applyMemoryRateLimit(key, scope, limit, requestId);
  }

  try {
    const result = await ratelimit.limit(key);
    const reset = typeof result.reset === "number" ? result.reset : Date.now() + WINDOW_MS;
    const retryAfter = result.success ? 0 : Math.max(1, Math.ceil((reset - Date.now()) / 1000));

    if (!result.success) {
      const detail = `Pre-auth rate limit exceeded for scope '${scope}'.`;

      return {
        ok: false,
        source: "upstash",
        limit: result.limit,
        remaining: result.remaining,
        reset,
        retryAfter,
        detail,
        response: buildRateLimitedResponse({
          detail,
          limit: result.limit,
          reset,
          retryAfter,
          requestId,
        }),
      };
    }

    return {
      ok: true,
      source: "upstash",
      limit: result.limit,
      remaining: result.remaining,
      reset,
    };
  } catch (error) {
    console.error("[preAuthRateLimit] backend failed", {
      scope,
      error: error instanceof Error ? error.message : String(error),
    });

    if (isProductionRuntime()) {
      return buildFailClosedDecision(scope, requestId);
    }

    return applyMemoryRateLimit(key, scope, limit, requestId);
  }
}
