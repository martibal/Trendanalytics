import { readStorageObject } from "@/lib/storage";
import type { SiteBriefBundle } from "@/lib/briefs/types";

import "server-only";

function arrayBufferToUtf8(buffer: ArrayBuffer): string {
  return new TextDecoder("utf-8").decode(new Uint8Array(buffer));
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function loadSiteBriefBundle(): Promise<SiteBriefBundle | null> {
  const result = await readStorageObject("data/published/v1/briefs/site/latest.json");

  if (!result) return null;

  try {
    const json = JSON.parse(arrayBufferToUtf8(result.body)) as unknown;

    if (!isObject(json)) return null;
    if (json.schema !== "urd_atlas.site_briefs_bundle.v1") return null;
    if (!Array.isArray(json.chains)) return null;
    if (!Array.isArray(json.series_30d)) return null;

    return json as SiteBriefBundle;
  } catch {
    return null;
  }
}
