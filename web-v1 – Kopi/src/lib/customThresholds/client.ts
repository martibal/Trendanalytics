// src/lib/customThresholds/client.ts
"use client";

import type { ChainId } from "@/lib/types";
import type { ThresholdConfigOverridesV1, ThresholdConfigV1 } from "./schema";
import type { CustomRegimeResult } from "./evaluate";

export type CustomRegimeApiOkResponse = {
  ok: true;
  chain: ChainId;
  date_requested: string; // "latest" or YYYY-MM-DD
  asof: string | null;

  canonical: {
    label: string | null;
    ruleset_id: string | null;
    window_days: number | null;
    determinism_hash: string | null;
  };

  identity: {
    canonical_hash: string | null;
    custom_hash: string;
  };

  confidence: {
    confidence_score: number | null;
    threshold_used: number;
  };

  threshold_config: {
    effective: ThresholdConfigV1;
    overrides: ThresholdConfigOverridesV1;
  };

  custom: CustomRegimeResult & {
    identity_hash: string;
  };
};

export type CustomRegimeApiErrorResponse = {
  ok: false;
  error: string;
  message: string;
  details?: unknown;
};

export type CustomRegimeApiResponse = CustomRegimeApiOkResponse | CustomRegimeApiErrorResponse;

function qs(params: Record<string, string | null | undefined>): string {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (typeof v === "string" && v.length) u.set(k, v);
  }
  const s = u.toString();
  return s ? `?${s}` : "";
}

async function readJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    // fallback: give caller something useful
    throw new Error(`Invalid JSON response (status=${res.status}): ${text.slice(0, 200)}`);
  }
}

/**
 * Fetch custom regime (defaults only) for a chain/date.
 * GET /api/regime/custom?chain=...&date=...
 */
export async function fetchCustomRegime(args: {
  chain: ChainId;
  date?: string | null;
}): Promise<CustomRegimeApiResponse> {
  const { chain, date } = args;
  const url = `/api/regime/custom${qs({ chain, date: date ?? null })}`;
  const res = await fetch(url, { method: "GET", cache: "no-store" });
  const json = await readJson<CustomRegimeApiResponse>(res);
  return json;
}

/**
 * Fetch custom regime using threshold overrides.
 * POST /api/regime/custom?chain=...&date=...
 * Body: { config: { ... overrides ... } }
 */
export async function postCustomRegime(args: {
  chain: ChainId;
  date?: string | null;
  config?: ThresholdConfigOverridesV1 | null;
}): Promise<CustomRegimeApiResponse> {
  const { chain, date, config } = args;
  const url = `/api/regime/custom${qs({ chain, date: date ?? null })}`;

  const res = await fetch(url, {
    method: "POST",
    cache: "no-store",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ config: config ?? {} }),
  });

  const json = await readJson<CustomRegimeApiResponse>(res);
  return json;
}