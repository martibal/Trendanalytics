// src/lib/dataset.ts

import "server-only";

import { readStorageObject } from "@/lib/storage";

export type DatasetManifest = {
  version?: string;
  published_at?: string;
  methodology_version?: string;
  chains?: string[];
  notes?: string;

  dataset_id?: string;
  computed_at_utc?: string;
  supported_chains?: string[];

  [k: string]: unknown;
};

function arrayBufferToUtf8(buffer: ArrayBuffer): string {
  return new TextDecoder("utf-8").decode(new Uint8Array(buffer));
}

async function readPublishedJson<T>(storagePath: string): Promise<T | null> {
  const result = await readStorageObject(storagePath);

  if (!result) {
    return null;
  }

  try {
    const raw = arrayBufferToUtf8(result.body);
    const json = JSON.parse(raw);

    if (!json || typeof json !== "object") {
      return null;
    }

    return json as T;
  } catch {
    return null;
  }
}

function normalizeDatasetManifest(input: DatasetManifest): DatasetManifest {
  return {
    ...input,
    version:
      typeof input.version === "string"
        ? input.version
        : typeof input.dataset_id === "string"
          ? input.dataset_id
          : undefined,
    published_at:
      typeof input.published_at === "string"
        ? input.published_at
        : typeof input.computed_at_utc === "string"
          ? input.computed_at_utc
          : undefined,
    chains:
      Array.isArray(input.chains)
        ? input.chains
        : Array.isArray(input.supported_chains)
          ? input.supported_chains
          : undefined,
  };
}

/**
 * Reads the published dataset manifest:
 *
 * data/published/v1/dataset.json
 *
 * Governance rules:
 * - read-only contract
 * - no interpretation
 * - no fallback computation
 */
export async function readDatasetManifest(): Promise<DatasetManifest | null> {
  const raw = await readPublishedJson<DatasetManifest>(
    "data/published/v1/dataset.json"
  );

  if (!raw) {
    return null;
  }

  return normalizeDatasetManifest(raw);
}