import type { GlossaryEntry as CanonicalGlossaryEntry } from "@/data/glossary";
import { GLOSSARY_ENTRIES } from "@/data/glossary";
import { readStorageObject } from "@/lib/storage";

export type GlossaryApiEntry = {
  key?: string;
  label?: string;
  category?: string;
  basic?: string;
  advanced?: string;
  units?: string;
  sourcePath?: string;
  fieldPath?: string;
};

export type GlossaryResponse =
  | GlossaryApiEntry[]
  | {
      entries?: GlossaryApiEntry[];
      items?: GlossaryApiEntry[];
      data?: GlossaryApiEntry[];
    };

type RawGlossaryModule =
  | GlossaryApiEntry[]
  | Record<string, GlossaryApiEntry | string | unknown>;

function arrayBufferToUtf8(buffer: ArrayBuffer): string {
  return new TextDecoder("utf-8").decode(new Uint8Array(buffer));
}

async function readPublishedJson<T>(storagePath: string): Promise<T | null> {
  const result = await readStorageObject(storagePath);
  if (!result) return null;

  try {
    return JSON.parse(arrayBufferToUtf8(result.body)) as T;
  } catch {
    return null;
  }
}

function normalizeEntry(key: string, value: unknown): GlossaryApiEntry | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;

  return {
    key,
    label: typeof record.label === "string" ? record.label : key,
    category: typeof record.category === "string" ? record.category : "metadata",
    basic: typeof record.basic === "string" ? record.basic : undefined,
    advanced: typeof record.advanced === "string" ? record.advanced : undefined,
    units: typeof record.units === "string" ? record.units : undefined,
    sourcePath: typeof record.sourcePath === "string" ? record.sourcePath : undefined,
    fieldPath: typeof record.fieldPath === "string" ? record.fieldPath : undefined,
  };
}

function extractEntries(raw: RawGlossaryModule | null): GlossaryApiEntry[] {
  if (!raw) return [];

  if (Array.isArray(raw)) {
    return raw
      .filter((entry): entry is GlossaryApiEntry => !!entry && typeof entry === "object")
      .map((entry) => ({
        key: typeof entry.key === "string" ? entry.key : "",
        label: typeof entry.label === "string" ? entry.label : entry.key ?? "",
        category: typeof entry.category === "string" ? entry.category : "metadata",
        basic: typeof entry.basic === "string" ? entry.basic : undefined,
        advanced: typeof entry.advanced === "string" ? entry.advanced : undefined,
        units: typeof entry.units === "string" ? entry.units : undefined,
        sourcePath: typeof entry.sourcePath === "string" ? entry.sourcePath : undefined,
        fieldPath: typeof entry.fieldPath === "string" ? entry.fieldPath : undefined,
      }))
      .filter((entry) => (entry.key ?? "").length > 0);
  }

  const entries: GlossaryApiEntry[] = [];

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

export async function loadGlossaryApiEntries(): Promise<GlossaryApiEntry[]> {
  const publishedEntries =
    (await readPublishedJson<GlossaryApiEntry[]>("data/published/v1/glossary/index.json")) ??
    null;

  if (Array.isArray(publishedEntries) && publishedEntries.length > 0) {
    return publishedEntries;
  }

  return GLOSSARY_ENTRIES.map((entry) => ({
    key: entry.key,
    label: entry.label,
    category: entry.category,
    basic: entry.description.basic,
    advanced: entry.description.advanced,
    units: entry.units,
    sourcePath: entry.sourcePath,
    fieldPath: entry.fieldPath,
  }));
}

export function normalizeCategory(
  value?: string
): CanonicalGlossaryEntry["category"] {
  switch (value) {
    case "regime":
    case "confidence":
    case "scorecard":
    case "drivers":
    case "charts":
    case "freshness":
    case "metadata":
      return value;
    default:
      return "metadata";
  }
}

export function normalizeGlossaryEntries(
  entries: GlossaryApiEntry[]
): CanonicalGlossaryEntry[] {
  return entries
    .filter(
      (entry): entry is Required<Pick<GlossaryApiEntry, "key">> & GlossaryApiEntry =>
        typeof entry.key === "string" && entry.key.trim().length > 0
    )
    .map((entry) => ({
      key: entry.key,
      label: entry.label ?? entry.key,
      category: normalizeCategory(entry.category),
      description: {
        basic: entry.basic ?? "No basic explanation provided yet.",
        advanced: entry.advanced ?? "No advanced explanation provided yet.",
      },
      units: entry.units,
      sourcePath: entry.sourcePath,
      fieldPath: entry.fieldPath,
    }))
    .sort((a, b) => {
      const ac = a.category.localeCompare(b.category);
      if (ac !== 0) return ac;
      return a.label.localeCompare(b.label);
    });
}
