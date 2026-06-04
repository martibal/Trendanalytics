// src/app/api/v1/files/[...path]/route.ts
import path from "path";
import { NextResponse } from "next/server";

import { validateRequestApiKey, buildAuthErrorResponseBody } from "@/lib/auth/validateToken";
import { touchPersistedApiKeyLastUsedAt } from "@/lib/auth/apiKeys";
import {
  evaluateFileEntitlement,
  isWindowToken,
  type FileGenre,
  type WindowToken,
} from "@/lib/auth/entitlements";
import {
  buildDailyQuotaHeaders,
  buildRateLimitHeaders,
  enforceAccountRateLimit,
  enforceDailyApiQuota,
} from "@/lib/auth/rateLimit";
import { readStorageObject } from "@/lib/storage";
import type { ChainId } from "@/config/chains";
import { getOrCreateRequestId, logApiEvent } from "@/lib/auditLog";
import { enforcePreAuthRateLimit } from "@/lib/security/preAuthRateLimit";

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

const ALLOWED_GENRES: FileGenre[] = ["gold", "meta", "derived", "briefs"];
const ALLOWED_CHAINS: ChainId[] = ["bitcoin", "ethereum", "arbitrum", "base"];

function isFileGenre(value: string): value is FileGenre {
  return ALLOWED_GENRES.includes(value as FileGenre);
}

function isChainId(value: string): value is ChainId {
  return ALLOWED_CHAINS.includes(value as ChainId);
}

type ParsedFilePath = {
  genre: FileGenre;
  chain: ChainId;
  windowTail: string[];
  storageSegments: string[];
};

function storageTailFromWindowTail(tail: string[]): string[] | null {
  if (tail.length === 1 && tail[0] === "latest.json") {
    return ["latest.json"];
  }

  if (tail.length === 2) {
    const [windowRaw, filename] = tail;

    if (filename === "latest.json" && isWindowToken(windowRaw) && windowRaw !== "latest") {
      return [`last${windowRaw}.json`];
    }
  }

  return null;
}

function parseFilePathSegments(segments: string[]): ParsedFilePath | null {
  const [genreRaw] = segments;

  if (!genreRaw || !isFileGenre(genreRaw)) {
    return null;
  }

  if (genreRaw === "briefs") {
    // Briefs are published under briefs/chains/<chain>/latest.json.
    // Site-level and cross-chain brief bundles remain public data artifacts
    // and are not routed through the per-chain subscriber entitlement gate.
    if (segments.length !== 4 || segments[1] !== "chains") {
      return null;
    }

    const chainRaw = segments[2];
    if (!isChainId(chainRaw)) {
      return null;
    }

    return {
      genre: genreRaw,
      chain: chainRaw,
      windowTail: segments.slice(3),
      storageSegments: segments,
    };
  }

  if (segments.length !== 3 && segments.length !== 4) {
    return null;
  }

  const chainRaw = segments[1];
  if (!isChainId(chainRaw)) {
    return null;
  }

  const windowTail = segments.slice(2);
  const storageTail = storageTailFromWindowTail(windowTail);

  return {
    genre: genreRaw,
    chain: chainRaw,
    windowTail,
    storageSegments: storageTail ? [genreRaw, chainRaw, ...storageTail] : segments,
  };
}
function withRequestId(
  requestId: string,
  extraHeaders?: Record<string, string>
): Record<string, string> {
  return {
    ...(extraHeaders ?? {}),
    "X-Request-Id": requestId,
  };
}

function publicFileErrorDetail(
  status: number,
  code: "unauthenticated" | "forbidden" | "not_found" | "server_error" | "rate_limited",
  detail?: string
): string | null {
  if (process.env.NODE_ENV !== "production" && process.env.VERCEL_ENV !== "production") {
    return detail ?? null;
  }

  if (status === 404 || code === "not_found") {
    return "not_found";
  }

  if (status === 403 || code === "forbidden") {
    return "forbidden";
  }

  if (status === 401 || code === "unauthenticated") {
    return "unauthenticated";
  }

  if (status === 429 || code === "rate_limited") {
    return "rate_limited";
  }

  return "server_error";
}
function jsonError(
  requestId: string,
  status: number,
  code: "unauthenticated" | "forbidden" | "not_found" | "server_error" | "rate_limited",
  message: string,
  detail?: string,
  extraHeaders?: Record<string, string>
) {
  return NextResponse.json(
    {
      code,
      message,
      detail: publicFileErrorDetail(status, code, detail),
    },
    {
      status,
      headers: withRequestId(requestId, extraHeaders),
    }
  );
}

function sanitizeSegments(segments: string[]): string[] | null {
  if (!Array.isArray(segments) || segments.length < 3) {
    return null;
  }

  for (const segment of segments) {
    if (!segment || segment.includes("..") || segment.includes("\\") || segment.includes("\0")) {
      return null;
    }
  }

  return segments;
}

function inferWindowFromTail(tail: string[]): WindowToken | null {
  if (tail.length === 1 && tail[0] === "latest.json") {
    return "latest";
  }

  if (tail.length === 2) {
    const [windowRaw, filename] = tail;

    if (filename === "latest.json" && isWindowToken(windowRaw) && windowRaw !== "latest") {
      return windowRaw;
    }
  }

  return null;
}

function buildStoragePath(storageSegments: string[]): string {
  return path.posix.join("data", "published", "v1", ...storageSegments);
}

export async function GET(request: Request, context: RouteContext) {
  const startedAtMs = Date.now();
  const requestId = getOrCreateRequestId(request.headers);
  const preAuthRateLimit = await enforcePreAuthRateLimit(request, "file-api", requestId);

  if (!preAuthRateLimit.ok) {
    await logApiEvent({
      requestId,
      eventType: "rate_limited",
      path: new URL(request.url).pathname,
      method: request.method,
      statusCode: 429,
      startedAtMs,
      detail: preAuthRateLimit.detail,
    });

    return preAuthRateLimit.response;
  }

  let accountId: string | null = null;
  let keyId: string | null = null;
  let genre: string | null = null;
  let chain: string | null = null;
  let window: string | null = null;

  try {
    const authResult = await validateRequestApiKey(request);

    if (!authResult.ok) {
      await logApiEvent({
        requestId,
        eventType: "auth_failed",
        path: new URL(request.url).pathname,
        method: request.method,
        statusCode: authResult.code === "unauthenticated" ? 401 : 403,
        startedAtMs,
        detail: authResult.detail,
      });

      return NextResponse.json(buildAuthErrorResponseBody(authResult), {
        status: authResult.code === "unauthenticated" ? 401 : 403,
        headers: withRequestId(requestId),
      });
    }

    accountId = authResult.accountId;
    keyId = authResult.keyId;

    const rateLimitHeaders: Record<string, string> = {};

    if (authResult.entitlement.tier === "basic" || authResult.entitlement.tier === "pro") {
      const rateLimitDecision = await enforceAccountRateLimit(
        authResult.accountId,
        authResult.entitlement.tier
      );

      Object.assign(rateLimitHeaders, buildRateLimitHeaders(rateLimitDecision));

      if (!rateLimitDecision.success) {
        await logApiEvent({
          requestId,
          eventType: "rate_limited",
          path: new URL(request.url).pathname,
          method: request.method,
          statusCode: 429,
          startedAtMs,
          accountId,
          keyId,
          detail: "Too many authenticated file requests for the current billing tier.",
        });

        return jsonError(
          requestId,
          429,
          "rate_limited",
          "Rate limit exceeded.",
          "Too many authenticated file requests for the current billing tier.",
          rateLimitHeaders
        );
      }

      const quotaDecision = await enforceDailyApiQuota(
        authResult.accountId,
        authResult.keyId,
        authResult.entitlement.tier
      );

      Object.assign(rateLimitHeaders, buildDailyQuotaHeaders(quotaDecision));

      if (!quotaDecision.success) {
        await logApiEvent({
          requestId,
          eventType: "rate_limited",
          path: new URL(request.url).pathname,
          method: request.method,
          statusCode: 429,
          startedAtMs,
          accountId,
          keyId,
          detail: "Daily API quota exceeded for the current billing tier.",
        });

        return jsonError(
          requestId,
          429,
          "rate_limited",
          "Daily API quota exceeded.",
          "Daily API quota exceeded for the current billing tier.",
          rateLimitHeaders
        );
      }
    }

    const resolved = await context.params;
    const segments = sanitizeSegments(resolved.path);

    if (!segments) {
      return jsonError(
        requestId,
        404,
        "not_found",
        "File path does not exist.",
        "invalid_path_shape",
        Object.keys(rateLimitHeaders).length > 0 ? rateLimitHeaders : undefined
      );
    }

    const parsedPath = parseFilePathSegments(segments);

    if (!parsedPath) {
      return jsonError(
        requestId,
        404,
        "not_found",
        "File path does not exist.",
        "unknown_genre_chain_or_brief_scope",
        Object.keys(rateLimitHeaders).length > 0 ? rateLimitHeaders : undefined
      );
    }

    genre = parsedPath.genre;
    chain = parsedPath.chain;

    const inferredWindow = inferWindowFromTail(parsedPath.windowTail);
    window = inferredWindow;

    if (!inferredWindow) {
      await logApiEvent({
        requestId,
        eventType: "entitlement_forbidden",
        path: new URL(request.url).pathname,
        method: request.method,
        statusCode: 403,
        startedAtMs,
        accountId,
        keyId,
        detail: "window_could_not_be_inferred",
        chain,
        genre,
      });

      return jsonError(
        requestId,
        403,
        "forbidden",
        "Request exceeds entitlement scope.",
        "window_could_not_be_inferred",
        Object.keys(rateLimitHeaders).length > 0 ? rateLimitHeaders : undefined
      );
    }

    const url = new URL(request.url);
    const startDate = url.searchParams.get("start");
    const endDate = url.searchParams.get("end");

    const decision = evaluateFileEntitlement(authResult.entitlement, {
      genre: parsedPath.genre,
      chain: parsedPath.chain,
      window: inferredWindow,
      startDate,
      endDate,
    });

    if (!decision.ok) {
      await logApiEvent({
        requestId,
        eventType: "entitlement_forbidden",
        path: url.pathname,
        method: request.method,
        statusCode: 403,
        startedAtMs,
        accountId,
        keyId,
        detail: decision.code,
        chain,
        genre,
        window,
      });

      return jsonError(
        requestId,
        403,
        "forbidden",
        "Request exceeds entitlement scope.",
        decision.code,
        Object.keys(rateLimitHeaders).length > 0 ? rateLimitHeaders : undefined
      );
    }

    const storagePath = buildStoragePath(parsedPath.storageSegments);
    const file = await readStorageObject(storagePath);

    if (!file) {
      return jsonError(
        requestId,
        404,
        "not_found",
        "File path does not exist.",
        storagePath,
        Object.keys(rateLimitHeaders).length > 0 ? rateLimitHeaders : undefined
      );
    }

    await logApiEvent({
      requestId,
      eventType: "file_served",
      path: url.pathname,
      method: request.method,
      statusCode: 200,
      startedAtMs,
      accountId,
      keyId,
      chain,
      genre,
      window,
    });


    await touchPersistedApiKeyLastUsedAt(authResult.keyId, authResult.record.lastUsedAt);

    return new NextResponse(file.body, {
      status: 200,
      headers: {
        ...withRequestId(requestId, rateLimitHeaders),
        "Content-Type": file.contentType,
        "Content-Length": String(file.contentLength),
        "Cache-Control": "private, no-store",
        "X-Entitlement-Tier": authResult.entitlement.tier,
        "X-Entitlement-Window": inferredWindow,
        ...(file.etag ? { ETag: file.etag } : {}),
        ...(file.lastModified ? { "Last-Modified": file.lastModified } : {}),
      },
    });
  } catch (error) {
    const detail =
      error instanceof Error ? error.message : "Unhandled file delivery route error.";

    await logApiEvent({
      requestId,
      eventType: "server_error",
      path: new URL(request.url).pathname,
      method: request.method,
      statusCode: 500,
      startedAtMs,
      accountId,
      keyId,
      detail,
      chain,
      genre,
      window,
    });

    return jsonError(
      requestId,
      500,
      "server_error",
      "File delivery failed due to an internal error.",
      detail
    );
  }
}
