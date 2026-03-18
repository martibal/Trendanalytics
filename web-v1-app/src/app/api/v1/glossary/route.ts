// src/app/api/v1/glossary/route.ts
import { NextResponse } from "next/server";
import { readDatasetManifest } from "@/lib/dataset";
import { currentDataSource, readStorageObject } from "@/lib/storage";

export const revalidate = 300;

type GlossaryEntry = {
  key?: string;
  label?: string;
  category?: string;
  basic?: string;
  advanced?: string;
};

type RawGlossaryModule =
  | GlossaryEntry[]
  | Record<string, GlossaryEntry | string | unknown>;

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

    if (!json) {
      return null;
    }

    return json as T;
  } catch {
    return null;
  }
}

function normalizeEntry(key: string, value: unknown): GlossaryEntry | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;

  return {
    key,
    label: typeof record.label === "string" ? record.label : key,
    category: typeof record.category === "string" ? record.category : "general",
    basic: typeof record.basic === "string" ? record.basic : undefined,
    advanced: typeof record.advanced === "string" ? record.advanced : undefined,
  };
}

function extractEntries(raw: RawGlossaryModule | null): GlossaryEntry[] {
  if (!raw) return [];

  if (Array.isArray(raw)) {
    return raw
      .filter((entry): entry is GlossaryEntry => !!entry && typeof entry === "object")
      .map((entry) => ({
        key: typeof entry.key === "string" ? entry.key : "",
        label: typeof entry.label === "string" ? entry.label : entry.key ?? "",
        category: typeof entry.category === "string" ? entry.category : "general",
        basic: typeof entry.basic === "string" ? entry.basic : undefined,
        advanced: typeof entry.advanced === "string" ? entry.advanced : undefined,
      }))
      .filter((entry) => entry.key.length > 0);
  }

  const entries: GlossaryEntry[] = [];

  for (const [key, value] of Object.entries(raw)) {
    const normalized = normalizeEntry(key, value);
    if (normalized) entries.push(normalized);
  }

  return entries.sort((a, b) => {
    const ac = (a.category ?? "").localeCompare(b.category ?? "");
    if (ac !== 0) return ac;
    return (a.label ?? a.key ?? "").localeCompare(b.label ?? b.key ?? "");
  });
}

export async function GET() {
  const dataset = await readDatasetManifest();

  const publishedEntries =
    (await readPublishedJson<GlossaryEntry[]>("data/published/v1/glossary/index.json")) ?? null;

  let entries = Array.isArray(publishedEntries) ? publishedEntries : [];

  if (entries.length === 0) {
    const importedModule = (await import("@/data/glossary")) as Record<string, unknown>;
    const rawGlossary = (importedModule.default ??
      importedModule.glossary ??
      importedModule) as RawGlossaryModule;

    entries = extractEntries(rawGlossary);
  }

  return NextResponse.json(
    {
      ok: true,
      generated_at_utc: new Date().toISOString(),
      data_source: currentDataSource(),
      dataset: dataset
        ? {
            version: dataset.version ?? null,
            published_at: dataset.published_at ?? null,
            methodology_version: dataset.methodology_version ?? null,
          }
        : null,
      entry_count: entries.length,
      entries,
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=300",
      },
    }
  );
}