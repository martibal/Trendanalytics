// src/app/api/v1/files/[...path]/route.ts
import path from "path";
import { NextResponse } from "next/server";

import { validateRequestApiKey, buildAuthErrorResponseBody } from "@/lib/auth/validateToken";
import {
  evaluateFileEntitlement,
  isWindowToken,
  type FileGenre,
  type WindowToken,
} from "@/lib/auth/entitlements";
import { buildRateLimitHeaders, enforceAccountRateLimit } from "@/lib/auth/rateLimit";
import { currentDataSource, readStorageObject } from "@/lib/storage";
import type { ChainId } from "@/config/chains";

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

const ALLOWED_GENRES: FileGenre[] = ["gold", "meta", "derived"];
const ALLOWED_CHAINS: ChainId[] = ["bitcoin", "ethereum", "arbitrum", "base"];

function isFileGenre(value: string): value is FileGenre {
  return ALLOWED_GENRES.includes(value as FileGenre);
}

function isChainId(value: string): value is ChainId {
  return ALLOWED_CHAINS.includes(value as ChainId);
}

function jsonError(
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
      detail: detail ?? null,
    },
    {
      status,
      headers: extraHeaders,
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
  if (tail.length === 0) return null;

  const first = tail[0];
  if (isWindowToken(first)) {
    return first;
  }

  if (tail.length === 1 && tail[0] === "latest.json") {
    return "latest";
  }

  return null;
}

function buildStoragePath(segments: string[]): string {
  return path.posix.join("data", "published", "v1", ...segments);
}

export async function GET(request: Request, context: RouteContext) {
  const authResult = await validateRequestApiKey(request);

  if (!authResult.ok) {
    return NextResponse.json(buildAuthErrorResponseBody(authResult), {
      status: authResult.code === "unauthenticated" ? 401 : 403,
    });
  }

  const rateLimitHeaders: Record<string, string> = {};

  if (authResult.entitlement.tier === "basic" || authResult.entitlement.tier === "pro") {
    const rateLimitDecision = await enforceAccountRateLimit(
      authResult.accountId,
      authResult.entitlement.tier
    );

    Object.assign(rateLimitHeaders, buildRateLimitHeaders(rateLimitDecision));

    if (!rateLimitDecision.success) {
      return jsonError(
        429,
        "rate_limited",
        "Rate limit exceeded.",
        "Too many authenticated file requests for the current billing tier.",
        rateLimitHeaders
      );
    }
  }

  const resolved = await context.params;
  const segments = sanitizeSegments(resolved.path);

  if (!segments) {
    return jsonError(
      404,
      "not_found",
      "File path does not exist.",
      "invalid_path_shape",
      Object.keys(rateLimitHeaders).length > 0 ? rateLimitHeaders : undefined
    );
  }

  const [genreRaw, chainRaw, ...tail] = segments;

  if (!isFileGenre(genreRaw) || !isChainId(chainRaw)) {
    return jsonError(
      404,
      "not_found",
      "File path does not exist.",
      "unknown_genre_or_chain",
      Object.keys(rateLimitHeaders).length > 0 ? rateLimitHeaders : undefined
    );
  }

  const window = inferWindowFromTail(tail);

  if (!window) {
    return jsonError(
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
    genre: genreRaw,
    chain: chainRaw,
    window,
    startDate,
    endDate,
  });

  if (!decision.ok) {
    return jsonError(
      403,
      "forbidden",
      "Request exceeds entitlement scope.",
      decision.code,
      Object.keys(rateLimitHeaders).length > 0 ? rateLimitHeaders : undefined
    );
  }

  const storagePath = buildStoragePath(segments);
  const file = await readStorageObject(storagePath);

  if (!file) {
    return jsonError(
      404,
      "not_found",
      "File path does not exist.",
      storagePath,
      Object.keys(rateLimitHeaders).length > 0 ? rateLimitHeaders : undefined
    );
  }

  return new NextResponse(file.body, {
    status: 200,
    headers: {
      ...rateLimitHeaders,
      "Content-Type": file.contentType,
      "Content-Length": String(file.contentLength),
      "Cache-Control": "private, no-store",
      "X-Account-Id": authResult.accountId,
      "X-API-Key-Prefix": authResult.keyPrefix,
      "X-Entitlement-Tier": authResult.entitlement.tier,
      "X-Entitlement-Window": window,
      "X-Data-Source": currentDataSource(),
      "X-Storage-Backend": file.source,
      ...(file.etag ? { ETag: file.etag } : {}),
      ...(file.lastModified ? { "Last-Modified": file.lastModified } : {}),
    },
  });
}