import "server-only";

import { NextResponse } from "next/server";

type OriginGuardResult =
  | { ok: true }
  | { ok: false; response: NextResponse };

const STATE_CHANGING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function normalizeOrigin(value: string | null | undefined): string | null {
  const trimmed = value?.trim();

  if (!trimmed) {
    return null;
  }

  try {
    return new URL(trimmed).origin.toLowerCase();
  } catch {
    return null;
  }
}

function addConfiguredOrigin(origins: Set<string>, value: string | null | undefined) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return;
  }

  const withProtocol = trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
  const origin = normalizeOrigin(withProtocol);

  if (origin) {
    origins.add(origin);
  }
}

function isProductionRuntime(): boolean {
  return process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production";
}

function getAllowedOrigins(request: Request): Set<string> {
  const origins = new Set<string>();

  if (!isProductionRuntime()) {
    const requestOrigin = normalizeOrigin(request.url);
    if (requestOrigin) {
      origins.add(requestOrigin);
    }
  }

  addConfiguredOrigin(origins, process.env.NEXT_PUBLIC_APP_URL);
  addConfiguredOrigin(origins, process.env.APP_URL);
  addConfiguredOrigin(origins, process.env.VERCEL_PROJECT_PRODUCTION_URL);
  addConfiguredOrigin(origins, process.env.VERCEL_URL);

  origins.add("https://urdatlas.com");
  origins.add("https://www.urdatlas.com");

  return origins;
}

function publicOriginGuardDetail(detail: string): string {
  if (isProductionRuntime()) {
    return "origin_not_allowed";
  }

  return detail;
}

function originGuardError(detail: string) {
  return NextResponse.json(
    {
      code: "origin_not_allowed",
      message: "Request origin is not allowed.",
      detail: publicOriginGuardDetail(detail),
    },
    {
      status: 403,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

export function validateSameOriginRequest(request: Request): OriginGuardResult {
  const method = request.method.toUpperCase();

  if (!STATE_CHANGING_METHODS.has(method)) {
    return { ok: true };
  }

  const allowedOrigins = getAllowedOrigins(request);
  const origin = normalizeOrigin(request.headers.get("origin"));

  if (origin) {
    if (allowedOrigins.has(origin)) {
      return { ok: true };
    }

    return {
      ok: false,
      response: originGuardError(`Origin '${origin}' is not allowed for ${method}.`),
    };
  }

  const refererOrigin = normalizeOrigin(request.headers.get("referer"));

  if (refererOrigin && allowedOrigins.has(refererOrigin)) {
    return { ok: true };
  }

  return {
    ok: false,
    response: originGuardError(`Missing trusted Origin/Referer for ${method}.`),
  };
}
