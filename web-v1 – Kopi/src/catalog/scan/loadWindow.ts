// web-v1/src/catalog/scan/loadWindow.ts
//
// Robust loader for published dataset window files such as:
//   /data/published/v1/gold/<chain>/last365d.json
//
// Design goals:
// - Strictly consume published/v1 only.
// - No silent fallback.
// - Explicit, typed error surfaces.
// - Cache hygiene: no-store for internal tooling.
// - Robust JSON parsing (optionally sanitizes NaN/Infinity tokens -> null).
//
// NOTE: Sanitization is OFF by default for published/v1 because it should be valid JSON.
// You can enable it to harden the catalog against accidental invalid payloads.

import type { Chain, Genre } from "../decisions/productDecisions";

export type DataClientErrorCode =
  | "BAD_URL"
  | "NETWORK_ERROR"
  | "HTTP_ERROR"
  | "INVALID_JSON"
  | "EMPTY_BODY";

export class DataClientError extends Error {
  public readonly code: DataClientErrorCode;
  public readonly url: string;
  public readonly http_status?: number;

  constructor(args: { code: DataClientErrorCode; url: string; message: string; http_status?: number }) {
    super(args.message);
    this.name = "DataClientError";
    this.code = args.code;
    this.url = args.url;
    this.http_status = args.http_status;
  }
}

export type LoadWindowOptions = {
  baseUrl: string; // e.g. "/data/published/v1"
  genre: Genre; // "gold" | "meta" | "derived"
  chain: Chain; // "bitcoin" | "ethereum" | "arbitrum" | "base"
  windowDays: number; // e.g. 7,30,90,180,365

  // Internal tooling: avoid caching old drafts.
  cache?: RequestCache; // default: "no-store"

  // If true, sanitize invalid JSON tokens (NaN/Infinity) in response text before parsing.
  // Default: false.
  sanitizeInvalidJsonTokens?: boolean;

  // If provided, appended as query param to help bust caches.
  // Example: dataset_id or `${dataset_id}.${revision_id}`
  cacheBuster?: string;
};

export function buildWindowUrl(opts: Pick<LoadWindowOptions, "baseUrl" | "genre" | "chain" | "windowDays" | "cacheBuster">): string {
  const base = (opts.baseUrl || "").trim();
  if (!base) {
    throw new DataClientError({
      code: "BAD_URL",
      url: base,
      message: "DATA baseUrl is empty. Expected something like '/data/published/v1'.",
    });
  }

  const normalizedBase = base.endsWith("/") ? base.slice(0, -1) : base;
  const path = `${normalizedBase}/${opts.genre}/${opts.chain}/last${opts.windowDays}d.json`;

  if (!opts.cacheBuster) return path;

  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}d=${encodeURIComponent(opts.cacheBuster)}`;
}

export async function loadWindow<T = unknown>(opts: LoadWindowOptions): Promise<T> {
  const url = buildWindowUrl(opts);

  let res: Response;
  try {
    res = await fetch(url, {
      method: "GET",
      cache: opts.cache ?? "no-store",
      headers: {
        // Encourage explicit freshness; not all servers honor this, but it helps in dev.
        "Cache-Control": "no-store",
        Pragma: "no-cache",
      },
    });
  } catch (err) {
    throw new DataClientError({
      code: "NETWORK_ERROR",
      url,
      message: `Network error while fetching window file: ${String(err)}`,
    });
  }

  if (!res.ok) {
    throw new DataClientError({
      code: "HTTP_ERROR",
      url,
      http_status: res.status,
      message: `HTTP ${res.status} while fetching window file.`,
    });
  }

  // Use text() so we can optionally sanitize before JSON.parse
  let text: string;
  try {
    text = await res.text();
  } catch (err) {
    throw new DataClientError({
      code: "NETWORK_ERROR",
      url,
      message: `Failed to read response body: ${String(err)}`,
    });
  }

  if (!text || !text.trim()) {
    throw new DataClientError({
      code: "EMPTY_BODY",
      url,
      message: "Window file response body was empty.",
    });
  }

  const payload = opts.sanitizeInvalidJsonTokens ? sanitizeJsonText(text) : text;

  try {
    return JSON.parse(payload) as T;
  } catch (err) {
    throw new DataClientError({
      code: "INVALID_JSON",
      url,
      message: `Invalid JSON in window file. ${String(err)}`,
    });
  }
}

/**
 * Sanitizes common invalid JSON tokens emitted by some pipelines:
 * - NaN, Infinity, -Infinity  => null
 *
 * IMPORTANT:
 * - This is a last-resort safety net for internal tools.
 * - Published/v1 SHOULD be valid JSON; prefer fixing upstream instead.
 */
export function sanitizeJsonText(input: string): string {
  // Replace tokens that appear as standalone values (roughly).
  // This avoids touching legitimate strings that contain "NaN" etc.
  //
  // We target:
  //   : NaN
  //   : Infinity
  //   : -Infinity
  //   , NaN
  // etc.
  //
  // Note: This is heuristic, but sufficient for preventing runtime breaks.
  return input
    .replace(/:\s*NaN\b/g, ": null")
    .replace(/:\s*Infinity\b/g, ": null")
    .replace(/:\s*-Infinity\b/g, ": null")
    .replace(/,\s*NaN\b/g, ", null")
    .replace(/,\s*Infinity\b/g, ", null")
    .replace(/,\s*-Infinity\b/g, ", null");
}
