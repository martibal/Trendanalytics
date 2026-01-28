// web-v1/src/catalog/scan/loadDataset.ts
//
// Robust loader for the published dataset bootstrap file:
//   /data/published/v1/dataset.json
//
// Design goals:
// - Strictly consume published/v1 only.
// - No silent fallback.
// - Explicit error surfaces.
// - Cache hygiene: no-store for internal tooling.
// - Optional cache-buster query param.

import { DataClientError } from "./loadWindow";

export type LoadDatasetOptions = {
  baseUrl: string; // e.g. "/data/published/v1"
  cache?: RequestCache; // default: "no-store"
  // If provided, appended as query param (?d=...) to help bust caches
  cacheBuster?: string;
};

export function buildDatasetUrl(opts: Pick<LoadDatasetOptions, "baseUrl" | "cacheBuster">): string {
  const base = (opts.baseUrl || "").trim();
  if (!base) {
    throw new DataClientError({
      code: "BAD_URL",
      url: base,
      message: "DATA baseUrl is empty. Expected something like '/data/published/v1'.",
    });
  }

  const normalizedBase = base.endsWith("/") ? base.slice(0, -1) : base;
  const path = `${normalizedBase}/dataset.json`;

  if (!opts.cacheBuster) return path;

  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}d=${encodeURIComponent(opts.cacheBuster)}`;
}

export async function loadDataset<T = unknown>(opts: LoadDatasetOptions): Promise<T> {
  const url = buildDatasetUrl(opts);

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
      message: `Network error while fetching dataset.json: ${String(err)}`,
    });
  }

  if (!res.ok) {
    throw new DataClientError({
      code: "HTTP_ERROR",
      url,
      http_status: res.status,
      message: `HTTP ${res.status} while fetching dataset.json.`,
    });
  }

  let text: string;
  try {
    text = await res.text();
  } catch (err) {
    throw new DataClientError({
      code: "NETWORK_ERROR",
      url,
      message: `Failed to read dataset.json response body: ${String(err)}`,
    });
  }

  if (!text || !text.trim()) {
    throw new DataClientError({
      code: "EMPTY_BODY",
      url,
      message: "dataset.json response body was empty.",
    });
  }

  try {
    return JSON.parse(text) as T;
  } catch (err) {
    throw new DataClientError({
      code: "INVALID_JSON",
      url,
      message: `Invalid JSON in dataset.json. ${String(err)}`,
    });
  }
}
