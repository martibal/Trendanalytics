import { NextResponse } from "next/server";

import { readStorageObject } from "@/lib/storage";

type JsonRecord = Record<string, unknown>;
type SampleBand = "high_confidence" | "low_confidence";
type SampleChain = "ethereum" | "arbitrum";
type ArtifactName = "meta" | "gold" | "derived" | "briefs";

type SampleDefinition = {
  chain: SampleChain;
  band: SampleBand;
  date: string;
};

type ArtifactDefinition = {
  name: ArtifactName;
  path: (chain: SampleChain, date: string) => string;
};

type ZipEntry = {
  name: string;
  data: Uint8Array;
};

const DATE_RANGE = { start: "2026-07-03", end: "2026-07-16" } as const;
const RANGE_CHAINS: readonly SampleChain[] = ["ethereum", "arbitrum"] as const;

const SAMPLES: readonly SampleDefinition[] = [
  { chain: "ethereum", band: "high_confidence", date: "2026-07-01" },
  { chain: "ethereum", band: "low_confidence", date: "2026-05-22" },
] as const;

const ARTIFACTS: readonly ArtifactDefinition[] = [
  { name: "meta", path: (chain, date) => `data/published/v1/meta/${chain}/${date}.json` },
  { name: "gold", path: (chain, date) => `data/published/v1/gold/${chain}/${date}.json` },
  { name: "derived", path: (chain, date) => `data/published/v1/derived/${chain}/${date}.json` },
  { name: "briefs", path: (chain, date) => `data/published/v1/briefs/chains/${chain}/${date}.json` },
] as const;

const QUICKSTART = `from pathlib import Path
import pandas as pd

folder = Path(__file__).resolve().parent
files = sorted(folder.glob("*_2026-07-03_to_2026-07-16_meta.csv"))
meta = pd.concat([pd.read_csv(path) for path in files], ignore_index=True)

customer = meta[["date", "chain"]].copy()
# Replace this with your own metric — this is a synthetic example
customer["customer_model_error"] = [0.08 + (i % 7) * 0.035 for i in range(len(customer))]

joined = customer.merge(
    meta[["date", "chain", "status.label"]],
    on=["date", "chain"],
    how="left",
    validate="one_to_one",
)
joined["high_customer_metric"] = joined["customer_model_error"] >= joined["customer_model_error"].median()
joined["network_bucket"] = joined["status.label"].where(
    joined["status.label"].isin(["HEATING", "CONGESTED"]), "STABLE/CHEAP"
)
joined.loc[joined["status.label"].isin(["HEATING", "CONGESTED"]), "network_bucket"] = "HEATING/CONGESTED"

summary = pd.crosstab(joined["high_customer_metric"], joined["network_bucket"], normalize="index")
print("Share of days by network-state bucket, conditional on synthetic customer metric:\n")
print((summary * 100).round(1).astype(str) + "%")
`;

const FIELD_GUIDE = `# Urd Atlas sample pack — Meta field guide

This file mirrors the full published Meta record — the same object Urd Atlas serves via the API. Most workflows only need a handful of these fields.

| Field | Meaning |
| --- | --- |
| \`chain\` | Canonical chain identifier used as part of the join key. |
| \`date\` | Observation date used as part of the join key. |
| \`status.label\` | Published network-state label for the day. |
| \`status.one_liner\` | Short evidence-based description of the published state. |
| \`confidence.confidence_score\` | Combined evidence-strength score used for the published row. |
| \`confidence.data_quality_score\` | Data completeness, density, history and freshness component. |
| \`confidence.label_confidence_score\` | Strength and separation of evidence supporting the candidate label. |
| \`regime.drivers\` | JSON-encoded list of the strongest informative evidence behind the regime. |
| \`regime.axes\` | Demand, friction and capacity evidence bands/trends used by the regime engine. |
| \`regime.determinism_hash\` | Hash anchor for reproducing and checking the deterministic classification. |
| \`scorecard.dimensions\` | Scored demand, friction and capacity dimensions for the day. |
| \`publish_confidence.eligible\` | Whether the row cleared the publication confidence gate. |
| \`methodology_version\` | Methodology version attached to the published record. |
| \`publish_lag_days_policy\` | Canonical publication-lag policy for the chain. |
| \`profile.id\` | Chain-specific evidence profile used by the methodology. |

Full field reference: https://urdatlas.com/methodology/fields
`;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function extractRows(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (!isRecord(value)) return [value];

  for (const key of ["rows", "data", "items", "records"] as const) {
    if (Array.isArray(value[key])) return value[key] as unknown[];
  }

  return [value];
}

function flattenRecord(
  value: unknown,
  prefix = "",
  target: Record<string, string | number | boolean | null> = {},
): Record<string, string | number | boolean | null> {
  if (value == null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    if (prefix) target[prefix] = value == null ? null : value;
    return target;
  }

  if (Array.isArray(value)) {
    if (prefix) target[prefix] = JSON.stringify(value);
    return target;
  }

  if (isRecord(value)) {
    for (const [key, nested] of Object.entries(value)) {
      const nextPrefix = prefix ? `${prefix}.${key}` : key;
      flattenRecord(nested, nextPrefix, target);
    }
    return target;
  }

  if (prefix) target[prefix] = String(value);
  return target;
}

function csvCell(value: string | number | boolean | null | undefined): string {
  if (value == null) return "";
  const raw = String(value);
  if (/[",\n\r]/.test(raw)) return `"${raw.replace(/"/g, '""')}"`;
  return raw;
}

function jsonToCsv(value: unknown): string {
  const rows = extractRows(value).map((row) => flattenRecord(row));
  const headers: string[] = [];
  const seen = new Set<string>();

  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (!seen.has(key)) {
        seen.add(key);
        headers.push(key);
      }
    }
  }

  if (headers.length === 0) return "value\n";

  return [
    headers.map(csvCell).join(","),
    ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(",")),
  ].join("\n");
}

function datesInclusive(start: string, end: string): string[] {
  const dates: string[] = [];
  const cursor = new Date(`${start}T00:00:00Z`);
  const last = new Date(`${end}T00:00:00Z`);
  while (cursor <= last) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

function writeUint16(target: Uint8Array, offset: number, value: number): void {
  target[offset] = value & 0xff;
  target[offset + 1] = (value >>> 8) & 0xff;
}

function writeUint32(target: Uint8Array, offset: number, value: number): void {
  target[offset] = value & 0xff;
  target[offset + 1] = (value >>> 8) & 0xff;
  target[offset + 2] = (value >>> 16) & 0xff;
  target[offset + 3] = (value >>> 24) & 0xff;
}

const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = (c & 1) !== 0 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc = CRC32_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function concatBytes(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }
  return result;
}

function buildZip(entries: ZipEntry[]): Uint8Array {
  const encoder = new TextEncoder();
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let localOffset = 0;

  for (const entry of entries) {
    const name = encoder.encode(entry.name);
    const checksum = crc32(entry.data);
    const local = new Uint8Array(30 + name.length + entry.data.length);

    writeUint32(local, 0, 0x04034b50);
    writeUint16(local, 4, 20);
    writeUint16(local, 6, 0x0800);
    writeUint16(local, 8, 0);
    writeUint16(local, 10, 0);
    writeUint16(local, 12, 0);
    writeUint32(local, 14, checksum);
    writeUint32(local, 18, entry.data.length);
    writeUint32(local, 22, entry.data.length);
    writeUint16(local, 26, name.length);
    writeUint16(local, 28, 0);
    local.set(name, 30);
    local.set(entry.data, 30 + name.length);
    localParts.push(local);

    const central = new Uint8Array(46 + name.length);
    writeUint32(central, 0, 0x02014b50);
    writeUint16(central, 4, 20);
    writeUint16(central, 6, 20);
    writeUint16(central, 8, 0x0800);
    writeUint16(central, 10, 0);
    writeUint16(central, 12, 0);
    writeUint16(central, 14, 0);
    writeUint32(central, 16, checksum);
    writeUint32(central, 20, entry.data.length);
    writeUint32(central, 24, entry.data.length);
    writeUint16(central, 28, name.length);
    writeUint16(central, 30, 0);
    writeUint16(central, 32, 0);
    writeUint16(central, 34, 0);
    writeUint16(central, 36, 0);
    writeUint32(central, 38, 0);
    writeUint32(central, 42, localOffset);
    central.set(name, 46);
    centralParts.push(central);

    localOffset += local.length;
  }

  const locals = concatBytes(localParts);
  const centralDirectory = concatBytes(centralParts);
  const end = new Uint8Array(22);

  writeUint32(end, 0, 0x06054b50);
  writeUint16(end, 4, 0);
  writeUint16(end, 6, 0);
  writeUint16(end, 8, entries.length);
  writeUint16(end, 10, entries.length);
  writeUint32(end, 12, centralDirectory.length);
  writeUint32(end, 16, locals.length);
  writeUint16(end, 20, 0);

  return concatBytes([locals, centralDirectory, end]);
}

async function readJson(storagePath: string): Promise<unknown> {
  const file = await readStorageObject(storagePath);
  if (!file) throw new Error(`Missing sample source: ${storagePath}`);
  return JSON.parse(new TextDecoder("utf-8").decode(new Uint8Array(file.body)));
}

export async function GET() {
  try {
    const encoder = new TextEncoder();
    const entries: ZipEntry[] = [];
    const periodDates = datesInclusive(DATE_RANGE.start, DATE_RANGE.end);

    if (periodDates.length !== 14) throw new Error("Sample DATE_RANGE must contain exactly 14 days");

    for (const chain of RANGE_CHAINS) {
      for (const artifact of ARTIFACTS) {
        const payloads = await Promise.all(periodDates.map((date) => readJson(artifact.path(chain, date))));
        entries.push({
          name: `${chain}_${DATE_RANGE.start}_to_${DATE_RANGE.end}_${artifact.name}.csv`,
          data: encoder.encode(jsonToCsv(payloads)),
        });
      }
    }

    for (const sample of SAMPLES) {
      for (const artifact of ARTIFACTS) {
        const payload = await readJson(artifact.path(sample.chain, sample.date));
        entries.push({
          name: `${sample.chain}_${sample.band}_${sample.date}_${artifact.name}.csv`,
          data: encoder.encode(jsonToCsv(payload)),
        });
      }
    }

    entries.push({ name: "quickstart.py", data: encoder.encode(QUICKSTART) });
    entries.push({ name: "FIELD_GUIDE.md", data: encoder.encode(FIELD_GUIDE) });

    const zip = buildZip(entries);
    const body = zip.buffer.slice(zip.byteOffset, zip.byteOffset + zip.byteLength) as ArrayBuffer;

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": 'attachment; filename="urd-atlas-free-sample-pack.zip"',
        "Content-Length": String(zip.byteLength),
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Failed to build free sample pack", error);
    return NextResponse.json(
      {
        code: "sample_pack_unavailable",
        message: "The free sample pack is temporarily unavailable.",
      },
      {
        status: 503,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
