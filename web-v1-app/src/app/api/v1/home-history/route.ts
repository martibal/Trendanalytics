import { NextResponse } from "next/server";

import { readStorageObject } from "@/lib/storage";

export const revalidate = 300;

type MetaRow = {
  date?: string;
  updated_through?: string;
  status?: { label?: string };
  regime?: { label?: string; asof_date?: string };
  confidence?: { confidence_score?: number };
};

const CHAINS = ["bitcoin", "ethereum", "arbitrum", "base"] as const;
const ALLOWED = new Set(["STABLE", "HEATING", "CONGESTED", "CHEAP", "UNKNOWN/DEGRADED"]);

function decode(buffer: ArrayBuffer) {
  return new TextDecoder("utf-8").decode(new Uint8Array(buffer));
}

function extractRows(value: unknown): MetaRow[] {
  if (Array.isArray(value)) return value.filter((row): row is MetaRow => Boolean(row) && typeof row === "object");
  if (!value || typeof value !== "object") return [];
  const candidate = value as { rows?: unknown; data?: unknown; items?: unknown; records?: unknown };
  for (const maybe of [candidate.rows, candidate.data, candidate.items, candidate.records]) {
    if (Array.isArray(maybe)) return maybe.filter((row): row is MetaRow => Boolean(row) && typeof row === "object");
  }
  return [];
}

async function readRows(chain: string) {
  for (const windowName of ["last90d", "last180d", "last365d"]) {
    const result = await readStorageObject(`data/published/v1/meta/${chain}/${windowName}.json`);
    if (!result) continue;
    try {
      const parsed = JSON.parse(decode(result.body));
      const rows = extractRows(parsed);
      if (rows.length) return rows;
    } catch {
      // Try the next published window.
    }
  }
  return [];
}

function normalizedLabel(row: MetaRow) {
  const raw = (row.status?.label ?? row.regime?.label ?? "UNKNOWN/DEGRADED").toUpperCase();
  return ALLOWED.has(raw) ? raw : "UNKNOWN/DEGRADED";
}

function dateOf(row: MetaRow) {
  return row.date ?? row.updated_through ?? row.regime?.asof_date ?? "";
}

export async function GET() {
  const entries = await Promise.all(
    CHAINS.map(async (chain) => {
      const rows = await readRows(chain);
      return [
        chain,
        rows
          .map((row) => ({
            date: dateOf(row),
            label: normalizedLabel(row),
            confidence: typeof row.confidence?.confidence_score === "number" ? row.confidence.confidence_score : null,
          }))
          .filter((row) => /^\d{4}-\d{2}-\d{2}$/.test(row.date))
          .sort((a, b) => a.date.localeCompare(b.date))
          .slice(-90),
      ] as const;
    })
  );

  return NextResponse.json(
    { chains: Object.fromEntries(entries) },
    { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } }
  );
}
