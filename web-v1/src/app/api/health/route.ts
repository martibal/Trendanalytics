import { NextResponse } from "next/server";
import path from "path";
import { promises as fs } from "fs";

type Chain = "bitcoin" | "ethereum" | "arbitrum" | "base";
type Genre = "gold" | "meta" | "derived";

const CHAINS: Chain[] = ["bitcoin", "ethereum", "arbitrum", "base"];
const GENRES: Genre[] = ["gold", "meta", "derived"];

function isValidISODate(s: any): s is string {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

async function readJsonSafe(filePath: string): Promise<any | null> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Health must be tolerant: meta/latest.json is not a simple {date, rows} structure.
 * We extract a "best effort" date from multiple possible locations.
 */
function extractBestDate(obj: any): string | null {
  if (!obj) return null;

  // Common simple case (gold/latest.json, derived/latest.json, and your fixed meta/latest.json)
  if (isValidISODate(obj.date)) return obj.date;

  // Sometimes manifests or other objects use asof/updated_through
  if (isValidISODate(obj.asof)) return obj.asof;
  if (isValidISODate(obj.updated_through)) return obj.updated_through;

  // Meta payload: often has nested "regime.asof_date" or "scorecard.asof_date" etc.
  if (isValidISODate(obj?.regime?.asof_date)) return obj.regime.asof_date;
  if (isValidISODate(obj?.scorecard?.asof_date)) return obj.scorecard.asof_date;
  if (isValidISODate(obj?.confidence?.date)) return obj.confidence.date;
  if (isValidISODate(obj?.gold_status?.features_last_date)) return obj.gold_status.features_last_date;

  return null;
}

function parseRevisionId(v: any): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

export async function GET() {
  const root = path.join(process.cwd(), "public", "data", "published", "v1");

  const problems: Array<{ level: "error" | "warn"; code: string; detail: string }> = [];
  const info: any = {};

  // 1) dataset.json (global contract)
  const datasetPath = path.join(root, "dataset.json");
  const dataset = await readJsonSafe(datasetPath);

  const dataset_id: string | null = typeof dataset?.dataset_id === "string" ? dataset.dataset_id : null;
  const revision_id: number | null = parseRevisionId(dataset?.revision_id);

  info.dataset = {
    dataset_id,
    revision_id,
    computed_at_utc: typeof dataset?.computed_at_utc === "string" ? dataset.computed_at_utc : null,
    methodology_version: typeof dataset?.methodology_version === "string" ? dataset.methodology_version : null,
  };

  if (!dataset) {
    problems.push({ level: "error", code: "DATASET_MISSING", detail: `Missing or unreadable dataset.json at ${datasetPath}` });
  } else {
    if (!dataset_id) problems.push({ level: "error", code: "DATASET_ID_MISSING", detail: "dataset.json missing dataset_id" });
    if (revision_id === null) problems.push({ level: "error", code: "REVISION_ID_INVALID", detail: "dataset.json revision_id missing/invalid (expected number)" });
  }

  // 2) per genre/chain: manifest + latest
  const checks: any[] = [];

  for (const genre of GENRES) {
    for (const chain of CHAINS) {
      const manifestPath = path.join(root, genre, chain, "manifest.json");
      const latestPath = path.join(root, genre, chain, "latest.json");

      const manifest = await readJsonSafe(manifestPath);
      const latest = await readJsonSafe(latestPath);

      const manifestAsof: string | null = isValidISODate(manifest?.asof)
        ? manifest.asof
        : null;

      const latestDate: string | null = extractBestDate(latest);

      const okManifest = !!manifest && !!manifestAsof;
      const okLatest = !!latest && !!latestDate;

      // Record details for UI/debugging
      checks.push({
        genre,
        chain,
        manifest: {
          ok: okManifest,
          asof: manifestAsof,
          path: manifestPath,
        },
        latest: {
          ok: okLatest,
          date: latestDate,
          path: latestPath,
        },
        // strict alignment check when we have both dates
        aligned: okManifest && okLatest ? manifestAsof === latestDate : null,
      });

      // Errors/warnings
      if (!manifest) {
        problems.push({ level: "error", code: "MANIFEST_MISSING", detail: `Missing ${genre}/${chain}/manifest.json` });
      } else if (!manifestAsof) {
        problems.push({ level: "error", code: "MANIFEST_ASOF_INVALID", detail: `Invalid/missing asof in ${genre}/${chain}/manifest.json` });
      }

      if (!latest) {
        problems.push({ level: "warn", code: "LATEST_MISSING", detail: `Missing ${genre}/${chain}/latest.json` });
      } else if (!latestDate) {
        problems.push({ level: "warn", code: "LATEST_DATE_MISSING", detail: `Could not extract date from ${genre}/${chain}/latest.json` });
      }

      // If both present, prefer them to match (this is the common reason health turns red)
      if (okManifest && okLatest && manifestAsof !== latestDate) {
        problems.push({
          level: "warn",
          code: "LATEST_DATE_MISMATCH",
          detail: `${genre}/${chain}: manifest.asof=${manifestAsof} but latest.date=${latestDate}`,
        });
      }
    }
  }

  info.checks = checks;

  const hasError = problems.some((p) => p.level === "error");
  const status = hasError ? 500 : 200;

  return NextResponse.json(
    {
      ok: !hasError,
      problems,
      info,
    },
    { status }
  );
}