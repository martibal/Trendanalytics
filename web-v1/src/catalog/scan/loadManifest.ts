// web-v1/src/catalog/scan/loadManifest.ts
//
// Robust loader for per-chain per-genre manifest file:
//   /data/published/v1/<genre>/<chain>/manifest.json
//
// Design goals:
// - Strictly consume published/v1 only.
// - No silent fallback.
// - Explicit error surfaces.
// - Cache hygiene: no-store for internal tooling.
// - Optional cache-buster query param.

import type { Chain, Genre } from "../decisions/productDecisions";
import { DataClientError } from "./loadWindow";

export type LoadManifestOptions = {
  baseUrl: string; // e.g. "/data/published/v1"
  genre: Genre; // "gold" | "meta" | "derived"
  chain: Chain; // "bitcoin" | "ethereum" | "arbitrum" | "base"
  cache?: RequestCache; // default: "no-store"
  // If provided, appended as query param (?d=...) to help bust caches
  cacheBuster?: string;
};

export function buildManifestUrl(opts: Pick<LoadManifestOptions, "baseUrl" | "genre" | "chain" | "cacheBuster">): string {
  const base = (opts.baseUrl || "").trim();
  if (!base) {
    throw new DataClientError({
      code: "BAD_URL",
      url: base,
      message: "DATA baseUrl is empty. Expected something like '/data/published/v1'.",
    });
  }

  const normalizedBase = base.endsWith("/") ? base.slice(0, -1) : base;
  const path = `${normalizedBase}/${opts.genre}/${opts.chain}/manifest.json`;

  if (!opts.cacheBuster) return path;

  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}d=${encodeURIComponent(opts.cacheBuster)}`;
}

export async function loadManifest<T = unknown>(opts: LoadManifestOptions): Promise<T> {
  const url = buildManifestUrl(opts);

  let res: Response;
  try {
    res = await fetch(url, {
      method: "GET",
      cache: opts.cache ?? "no-store",
      headers: {
        "Cache-Control": "no-store",
        Pragma: "no-cache",
      },
    });
  } catch (err) {
    throw new DataClientError({
      code: "NETWORK_ERROR",
      url,
      message: `Network error while fetching manifest.json (${opts.genre}/${opts.chain}): ${String(err)}`,
    });
  }

  if (!res.ok) {
    throw new DataClientError({
      code: "HTTP_ERROR",
      url,
      http_status: res.status,
      message: `HTTP ${res.status} while fetching manifest.json (${opts.genre}/${opts.chain}).`,
    });
  }

  let text: string;
  try {
    text = await res.text();
  } catch (err) {
    throw new DataClientError({
      code: "NETWORK_ERROR",
      url,
      message: `Failed to read manifest.json response body (${opts.genre}/${opts.chain}): ${String(err)}`,
    });
  }

  if (!text || !text.trim()) {
    throw new DataClientError({
      code: "EMPTY_BODY",
      url,
      message: `manifest.json response body was empty (${opts.genre}/${opts.chain}).`,
    });
  }

  try {
    return JSON.parse(text) as T;
  } catch (err) {
    throw new DataClientError({
      code: "INVALID_JSON",
      url,
      message: `Invalid JSON in manifest.json (${opts.genre}/${opts.chain}). ${String(err)}`,
    });
  }
}
