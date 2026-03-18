// src/app/api/regime/custom/route.ts
import { NextRequest, NextResponse } from "next/server";
import path from "path";
import * as fs from "fs/promises";
import crypto from "crypto";

import type { MetaFile } from "@/lib/types";

import type { ThresholdConfigOverridesV1 } from "@/lib/customThresholds/schema";
import { mergeThresholdConfig } from "@/lib/customThresholds/merge";
import { THRESHOLD_CONFIG_DEFAULT_V1 } from "@/lib/customThresholds/defaults";
import { evaluateCustomRegime } from "@/lib/customThresholds/evaluate";

type ChainId = "bitcoin" | "ethereum" | "arbitrum" | "base";
const CHAINS: ChainId[] = ["bitcoin", "ethereum", "arbitrum", "base"];

/* ----------------------------- small utilities ---------------------------- */

function jsonResponse(obj: unknown, init?: ResponseInit) {
  return new NextResponse(JSON.stringify(obj, null, 2), {
    status: init?.status ?? 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...(init?.headers ?? {}),
    },
  });
}

function badRequest(message: string, details?: unknown) {
  return jsonResponse(
    {
      ok: false,
      error: "bad_request",
      message,
      details: details ?? null,
    },
    { status: 400 }
  );
}

function notFound(message: string) {
  return jsonResponse(
    {
      ok: false,
      error: "not_found",
      message,
    },
    { status: 404 }
  );
}

function internalError(message: string, details?: unknown) {
  return jsonResponse(
    {
      ok: false,
      error: "internal_error",
      message,
      details: details ?? null,
    },
    { status: 500 }
  );
}

function normalizeChain(input: string | null): ChainId | null {
  if (!input) return null;
  const v = input.toLowerCase().trim();
  return (CHAINS as readonly string[]).includes(v) ? (v as ChainId) : null;
}

function normalizeDate(input: string | null): string | null {
  if (!input) return null;
  const v = input.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  return v;
}

function asRecord(v: unknown): Record<string, unknown> | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  return v as Record<string, unknown>;
}

function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

function safeParseJson<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/* ----------------------- deterministic hashing helpers -------------------- */

function stableStringify(value: unknown): string {
  // Deterministic JSON stringify (sorted keys) for hashing.
  const seen = new WeakSet<object>();

  const walk = (v: any): any => {
    if (v === null) return null;

    const t = typeof v;
    if (t === "string" || t === "number" || t === "boolean") return v;
    if (t === "undefined") return null;

    if (Array.isArray(v)) return v.map(walk);

    if (t === "object") {
      if (seen.has(v)) return "[circular]";
      seen.add(v);

      const out: Record<string, any> = {};
      for (const k of Object.keys(v).sort()) out[k] = walk(v[k]);
      return out;
    }

    return String(v);
  };

  return JSON.stringify(walk(value));
}

function sha256Hex(payload: string): string {
  return crypto.createHash("sha256").update(payload).digest("hex");
}

/* --------------------------- file/path resolution ------------------------- */

function publishedRoot(): string {
  // public/data/published/v1/...
  return path.join(process.cwd(), "public", "data", "published", "v1");
}

function metaPath(chain: ChainId, date: string | null): string {
  const file = date ? `${date}.json` : "latest.json";
  return path.join(publishedRoot(), "meta", chain, file);
}

async function readJsonFile(p: string): Promise<any> {
  const raw = await fs.readFile(p, "utf-8");
  const j = safeParseJson<any>(raw);
  if (j === null) throw new Error(`Invalid JSON in ${p}`);
  return j;
}

/* ------------------------------ META helpers ------------------------------ */

function extractAsOf(meta: any): string | null {
  const a = meta?.regime?.asof_date;
  if (typeof a === "string" && a.length) return a;
  const b = meta?.asof;
  if (typeof b === "string" && b.length) return b;
  const c = meta?.updated_through;
  if (typeof c === "string" && c.length) return c;
  return null;
}

function safeGetConfidence(meta: any): number | null {
  const v = meta?.confidence?.confidence_score;
  return isFiniteNumber(v) ? v : null;
}

function safeGetPipelineDeterminismHash(meta: any): string | null {
  const v = meta?.regime?.determinism_hash;
  return typeof v === "string" && v.length ? v : null;
}

function computeFallbackCanonicalHash(args: {
  chain: ChainId;
  dateRequested: string;
  asof: string | null;
  meta: any;
}): string {
  // If pipeline didn't emit determinism_hash, we compute a deterministic identity
  // from stable, high-signal parts of META.
  const payload = stableStringify({
    schema_version: "canonical_identity.v1",
    chain: args.chain,
    date_requested: args.dateRequested,
    asof: args.asof,
    regime: args.meta?.regime ?? null,
    confidence: args.meta?.confidence ?? null,
    missing: args.meta?.missing ?? null,
  });
  return sha256Hex(payload);
}

function safeCustomLabel(custom: any): string | null {
  const a = custom?.label;
  if (typeof a === "string" && a.length) return a;
  const b = custom?.regime_label;
  if (typeof b === "string" && b.length) return b;
  const c = custom?.regime?.label;
  if (typeof c === "string" && c.length) return c;
  return null;
}

function computeCustomIdentityHash(args: {
  chain: ChainId;
  dateRequested: string;
  asof: string | null;
  canonicalHash: string;
  effectiveConfig: unknown;
  overrides: unknown;
  custom: unknown;
}): string {
  const payload = stableStringify({
    schema_version: "custom_identity.v1",
    chain: args.chain,
    date_requested: args.dateRequested,
    asof: args.asof,
    canonical_hash: args.canonicalHash,
    effective_threshold_config: args.effectiveConfig,
    overrides: args.overrides,
    custom: args.custom,
  });
  return sha256Hex(payload);
}

/* --------------------------- overrides sanitation -------------------------- */

function sanitizeOverrides(raw: unknown): ThresholdConfigOverridesV1 {
  // Light defensive sanitation; mergeThresholdConfig() does the real normalization.
  const rec = asRecord(raw);
  if (!rec) return {};

  const out: ThresholdConfigOverridesV1 = {};

  if (rec.version === "v1") out.version = "v1";

  const gate = asRecord(rec.gate);
  if (gate) {
    const ct = gate.confidence_threshold;
    if (isFiniteNumber(ct)) out.gate = { confidence_threshold: ct };
  }

  const trend = asRecord(rec.trend);
  if (trend) {
    const eps = trend.eps;
    if (isFiniteNumber(eps)) out.trend = { eps };
  }

  const band = asRecord(rec.band);
  if (band) {
    const bandOut: any = {};

    const pick = (k: "high" | "extreme_high" | "low" | "extreme_low") => {
      const b = asRecord((band as any)[k]);
      if (!b) return;

      const patch: any = {};
      if (isFiniteNumber(b.pct)) patch.pct = b.pct;
      if (isFiniteNumber(b.z)) patch.z = b.z;

      if (Object.keys(patch).length) bandOut[k] = patch;
    };

    pick("high");
    pick("extreme_high");
    pick("low");
    pick("extreme_low");

    if (Object.keys(bandOut).length) out.band = bandOut;
  }

  return out;
}

/* ---------------------------------- GET ---------------------------------- */
/**
 * GET /api/regime/custom?chain=ethereum&date=YYYY-MM-DD
 * Uses defaults only (no overrides). date can be omitted (=> latest).
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const chain = normalizeChain(url.searchParams.get("chain"));
  const date = normalizeDate(url.searchParams.get("date"));

  if (!chain) return badRequest(`Invalid or missing "chain". Supported: ${CHAINS.join(", ")}.`);

  const p = metaPath(chain, date);

  try {
    const meta = (await readJsonFile(p)) as MetaFile;

    const asof = extractAsOf(meta as any);
    const dateRequested = date ?? "latest";

    const pipelineHash = safeGetPipelineDeterminismHash(meta as any);
    const canonicalHash = pipelineHash ?? computeFallbackCanonicalHash({ chain, dateRequested, asof, meta: meta as any });
    const determinismHash = pipelineHash ?? canonicalHash;

    const overrides: ThresholdConfigOverridesV1 = {};
    const effective = mergeThresholdConfig(overrides, THRESHOLD_CONFIG_DEFAULT_V1);

    const custom = evaluateCustomRegime({
      meta,
      overrides,
      baseConfig: THRESHOLD_CONFIG_DEFAULT_V1,
    });

    const customHash = computeCustomIdentityHash({
      chain,
      dateRequested,
      asof,
      canonicalHash,
      effectiveConfig: effective,
      overrides,
      custom,
    });

    const confidence = safeGetConfidence(meta as any);
    const customLabel = safeCustomLabel(custom);

    return jsonResponse({
      ok: true,
      chain,
      date_requested: dateRequested,
      asof,
      canonical: {
        label: (meta as any)?.regime?.label ?? null,
        ruleset_id: (meta as any)?.regime?.ruleset_id ?? null,
        window_days: (meta as any)?.regime?.window_days ?? null,
        determinism_hash: determinismHash,
      },
      identity: {
        canonical_hash: canonicalHash,
        custom_hash: customHash,
      },
      confidence: {
        confidence_score: confidence,
        threshold_used: effective.gate.confidence_threshold,
      },
      threshold_config: {
        effective,
        overrides,
      },
      custom: {
        ...(typeof custom === "object" && custom ? custom : { value: custom }),
        label: customLabel,
        identity_hash: customHash,
      },
    });
  } catch (e: any) {
    if (e && (e.code === "ENOENT" || String(e?.message ?? "").includes("ENOENT"))) {
      return notFound(`Published meta file not found for ${chain} (${date ?? "latest"}).`);
    }
    return internalError("Failed to compute custom regime.", String(e?.message ?? e));
  }
}

/* ---------------------------------- POST --------------------------------- */
/**
 * POST /api/regime/custom?chain=ethereum&date=YYYY-MM-DD
 * Body:
 * { "config": { ... overrides ... } }
 */
export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  const chain = normalizeChain(url.searchParams.get("chain"));
  const date = normalizeDate(url.searchParams.get("date"));

  if (!chain) return badRequest(`Invalid or missing "chain". Supported: ${CHAINS.join(", ")}.`);

  let body: unknown = null;
  try {
    body = await req.json();
  } catch {
    body = null;
  }

  const bodyRec = asRecord(body);
  const rawConfig = bodyRec ? bodyRec["config"] : null;

  const overrides = sanitizeOverrides(rawConfig);
  const effective = mergeThresholdConfig(overrides, THRESHOLD_CONFIG_DEFAULT_V1);

  const p = metaPath(chain, date);

  try {
    const meta = (await readJsonFile(p)) as MetaFile;

    const asof = extractAsOf(meta as any);
    const dateRequested = date ?? "latest";

    const pipelineHash = safeGetPipelineDeterminismHash(meta as any);
    const canonicalHash = pipelineHash ?? computeFallbackCanonicalHash({ chain, dateRequested, asof, meta: meta as any });
    const determinismHash = pipelineHash ?? canonicalHash;

    const custom = evaluateCustomRegime({
      meta,
      overrides,
      baseConfig: THRESHOLD_CONFIG_DEFAULT_V1,
    });

    const customHash = computeCustomIdentityHash({
      chain,
      dateRequested,
      asof,
      canonicalHash,
      effectiveConfig: effective,
      overrides,
      custom,
    });

    const confidence = safeGetConfidence(meta as any);
    const customLabel = safeCustomLabel(custom);

    return jsonResponse({
      ok: true,
      chain,
      date_requested: dateRequested,
      asof,
      canonical: {
        label: (meta as any)?.regime?.label ?? null,
        ruleset_id: (meta as any)?.regime?.ruleset_id ?? null,
        window_days: (meta as any)?.regime?.window_days ?? null,
        determinism_hash: determinismHash,
      },
      identity: {
        canonical_hash: canonicalHash,
        custom_hash: customHash,
      },
      confidence: {
        confidence_score: confidence,
        threshold_used: effective.gate.confidence_threshold,
      },
      threshold_config: {
        effective,
        overrides,
      },
      custom: {
        ...(typeof custom === "object" && custom ? custom : { value: custom }),
        label: customLabel,
        identity_hash: customHash,
      },
    });
  } catch (e: any) {
    if (e && (e.code === "ENOENT" || String(e?.message ?? "").includes("ENOENT"))) {
      return notFound(`Published meta file not found for ${chain} (${date ?? "latest"}).`);
    }
    return internalError("Failed to compute custom regime.", String(e?.message ?? e));
  }
}