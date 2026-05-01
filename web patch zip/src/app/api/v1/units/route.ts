// src/app/api/v1/units/route.ts
import { NextResponse } from "next/server";
import { CHAIN_LIST } from "@/config/chains";
import { readDatasetManifest } from "@/lib/dataset";
import { currentDataSource } from "@/lib/storage";

export const revalidate = 300;

type UnitLeaf = string;

type NormalizedUnitsPayload = {
  [chainOrScope: string]: {
    [metric: string]: UnitLeaf;
  };
};

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function normalizeUnitsObject(input: unknown): NormalizedUnitsPayload {
  if (!isPlainRecord(input)) {
    return {};
  }

  const normalized: NormalizedUnitsPayload = {};

  for (const [outerKey, outerValue] of Object.entries(input)) {
    if (!isPlainRecord(outerValue)) {
      continue;
    }

    const metricMap: Record<string, string> = {};

    for (const [metricKey, metricValue] of Object.entries(outerValue)) {
      if (typeof metricValue === "string" && metricValue.trim().length > 0) {
        metricMap[metricKey] = metricValue;
      }
    }

    if (Object.keys(metricMap).length > 0) {
      normalized[outerKey] = metricMap;
    }
  }

  return normalized;
}

function buildKnownChains() {
  return CHAIN_LIST.map((chain) => ({
    chain: chain.id,
    name: chain.name,
    label: chain.label,
  }));
}

export async function GET() {
  const dataset = await readDatasetManifest();

  const importedModule = (await import("@/config/units")) as Record<string, unknown>;

  const rawUnits =
    importedModule.UNITS ??
    importedModule.units ??
    importedModule.default ??
    null;

  const normalizedUnits = normalizeUnitsObject(rawUnits);

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
      known_chains: buildKnownChains(),
      group_count: Object.keys(normalizedUnits).length,
      units: normalizedUnits,
      traceability: {
        source_mode: "config_module",
        source_module: "@/config/units",
        canonical_contract: {
          descriptive_only: true,
          published_units_route: true,
          runtime_repair: false,
        },
      },
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=300",
      },
    }
  );
}