// src/app/api/v1/samples/[...path]/route.ts
import path from "path";
import { NextResponse } from "next/server";

import { readStorageObject } from "@/lib/storage";
import { enforcePreAuthRateLimit } from "@/lib/security/preAuthRateLimit";
import type { ChainId } from "@/config/chains";

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

type SampleGenre = "gold" | "derived" | "meta" | "briefs";

const ALLOWED_GENRES: SampleGenre[] = ["gold", "derived", "meta", "briefs"];
const ALLOWED_CHAINS: ChainId[] = ["bitcoin", "ethereum", "arbitrum", "base"];

function isSampleGenre(value: string): value is SampleGenre {
  return ALLOWED_GENRES.includes(value as SampleGenre);
}

function isChainId(value: string): value is ChainId {
  return ALLOWED_CHAINS.includes(value as ChainId);
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

function parseSampleSegments(segments: string[]): string[] | null {
  const [genre] = segments;

  if (!genre || !isSampleGenre(genre)) {
    return null;
  }

  if (genre === "briefs") {
    if (segments.length !== 4 || segments[1] !== "chains") {
      return null;
    }

    if (!isChainId(segments[2]) || segments[3] !== "latest.json") {
      return null;
    }

    return segments;
  }

  if (segments.length !== 3) {
    return null;
  }

  if (!isChainId(segments[1]) || segments[2] !== "latest.json") {
    return null;
  }

  return segments;
}

function jsonError(status: number, code: string, message: string) {
  return NextResponse.json(
    {
      ok: false,
      code,
      message,
    },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

export async function GET(request: Request, context: RouteContext) {
  const preAuthRateLimit = await enforcePreAuthRateLimit(request, "public-read-api");

  if (!preAuthRateLimit.ok) {
    return preAuthRateLimit.response;
  }

  const resolved = await context.params;
  const sanitized = sanitizeSegments(resolved.path);
  const parsed = sanitized ? parseSampleSegments(sanitized) : null;

  if (!parsed) {
    return jsonError(404, "not_found", "Sample file path does not exist.");
  }

  const storagePath = path.posix.join("data", "published", "v1", ...parsed);
  const file = await readStorageObject(storagePath);

  if (!file) {
    return jsonError(404, "not_found", "Sample file is not currently published.");
  }

  return new NextResponse(file.body, {
    status: 200,
    headers: {
      "Content-Type": file.contentType || "application/json; charset=utf-8",
      "Content-Length": String(file.contentLength),
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=300",
      ...(file.etag ? { ETag: file.etag } : {}),
      ...(file.lastModified ? { "Last-Modified": file.lastModified } : {}),
    },
  });
}
