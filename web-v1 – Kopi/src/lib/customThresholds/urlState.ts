// src/lib/customThresholds/urlState.ts
// Optional-but-recommended helper for sharing custom threshold overrides via URL.
// SSR-safe: does not touch window/document.
// Defensive parsing: safe JSON parse + light shape checks.
//
// Design:
// - encodeOverridesToQuery(overrides) -> string (base64url of JSON)
// - decodeOverridesFromQuery(q) -> overrides | null
//
// Notes:
// - This file intentionally does NOT enforce full schema validation.
//   The mergeThresholdConfig() function should remain the canonical normalizer.
// - We keep output deterministic by stable-stringifying keys before encoding.

import type { ThresholdConfigOverridesV1 } from "./schema";

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

/** Deterministic JSON stringify with sorted keys (stable encoding). */
function stableStringify(value: unknown): string {
  const seen = new WeakSet<object>();

  const walk = (v: unknown): unknown => {
    if (v === null) return null;

    const t = typeof v;
    if (t === "string" || t === "number" || t === "boolean") return v;
    if (t === "undefined") return null;

    if (Array.isArray(v)) return v.map(walk);

    if (t === "object") {
      const obj = v as object;
      if (seen.has(obj)) return "[circular]";
      seen.add(obj);

      const rec = v as Record<string, unknown>;
      const out: Record<string, unknown> = {};
      for (const k of Object.keys(rec).sort()) out[k] = walk(rec[k]);
      return out;
    }

    return String(v);
  };

  return JSON.stringify(walk(value));
}

/**
 * Minimal base64url encoding that works in Node and browsers.
 * - Node: Buffer
 * - Browser: btoa (via TextEncoder + binary string)
 */
function base64UrlEncodeUtf8(input: string): string {
  // Node path (Next.js build / SSR / tooling). Avoid `any` and avoid importing Buffer directly.
  const g = globalThis as unknown as {
    Buffer?: {
      from: (data: string, encoding: "utf8") => { toString: (encoding: "base64") => string };
    };
  };

  if (g.Buffer && typeof g.Buffer.from === "function") {
    return g.Buffer.from(input, "utf8")
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/g, "");
  }

  // Browser path
  const bytes = new TextEncoder().encode(input);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  const b64 = btoa(binary);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecodeUtf8(input: string): string | null {
  const g = globalThis as unknown as {
    Buffer?: {
      from: (data: string, encoding: "base64") => { toString: (encoding: "utf8") => string };
    };
  };

  const b64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64 + "===".slice((b64.length + 3) % 4);

  if (g.Buffer && typeof g.Buffer.from === "function") {
    try {
      return g.Buffer.from(padded, "base64").toString("utf8");
    } catch {
      return null;
    }
  }

  try {
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

/**
 * Light schema check: accept only the v1 override shape fragments we expect.
 * Anything else => null (defensive).
 */
function sanitizeOverridesLight(raw: unknown): ThresholdConfigOverridesV1 | null {
  const rec = asRecord(raw);
  if (!rec) return null;

  const out: ThresholdConfigOverridesV1 = {};

  // version optional; only accept "v1" if present
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
    type BandKey = "high" | "extreme_high" | "low" | "extreme_low";
    type BandPatch = { pct?: number; z?: number };

    const bandOut: Partial<Record<BandKey, BandPatch>> = {};

    const pick = (k: BandKey) => {
      const b = asRecord(band[k]);
      if (!b) return;

      const patch: BandPatch = {};
      if (isFiniteNumber(b.pct)) patch.pct = b.pct;
      if (isFiniteNumber(b.z)) patch.z = b.z;

      if (Object.keys(patch).length) bandOut[k] = patch;
    };

    pick("high");
    pick("extreme_high");
    pick("low");
    pick("extreme_low");

    if (Object.keys(bandOut).length) out.band = bandOut as ThresholdConfigOverridesV1["band"];
  }

  return out;
}

/**
 * Encodes overrides into a query-safe string.
 * You can use it like:
 *   const q = encodeOverridesToQuery(overrides)
 *   ?overrides=<q>
 */
export function encodeOverridesToQuery(overrides: ThresholdConfigOverridesV1): string {
  const payload = stableStringify(overrides ?? {});
  return base64UrlEncodeUtf8(payload);
}

/**
 * Decodes overrides from a query param.
 * Returns null if invalid/unparseable.
 */
export function decodeOverridesFromQuery(q: string | null | undefined): ThresholdConfigOverridesV1 | null {
  if (!q || typeof q !== "string") return null;
  const raw = base64UrlDecodeUtf8(q.trim());
  if (!raw) return null;

  const parsed = safeParseJson<unknown>(raw);
  if (parsed === null) return null;

  return sanitizeOverridesLight(parsed);
}