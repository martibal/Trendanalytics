// /src/lib/dataReaders.ts

import "server-only";

import { promises as fs } from "fs";
import path from "path";
import { z } from "zod";

/* ============================================================
   Types
============================================================ */

export type SupportedWindowDays = 30 | 90 | 180 | 365;

export type DerivedRow = {
  chain: string;
  date: string;
  derived?: {
    metrics?: Record<string, unknown>;
  };
};

export type GoldRow = {
  chain?: string;
  date?: string;
  [key: string]: unknown;
};

export type MetricPoint = {
  date: string;
  value: number | null;
  ma7: number | null;
  ma30: number | null;
};

/* ============================================================
   Zod schemas
============================================================ */

const UnknownRecordSchema = z.record(z.string(), z.unknown());

const DerivedRowSchema = z.object({
  chain: z.string(),
  date: z.string(),
  derived: z
    .object({
      metrics: UnknownRecordSchema.optional(),
    })
    .optional(),
});

const GoldRowSchema = z
  .object({
    chain: z.string().optional(),
    date: z.string().optional(),
  })
  .catchall(z.unknown());

/* ============================================================
   Safe object helpers (no any)
============================================================ */

function asRecord(v: unknown): Record<string, unknown> | null {
  if (!v || typeof v !== "object") return null;
  if (Array.isArray(v)) return null;
  return v as Record<string, unknown>;
}

function getRecordField(obj: Record<string, unknown> | null, key: string): unknown {
  if (!obj) return undefined;
  return obj[key];
}

/* ============================================================
   Date helpers (UTC-safe)
============================================================ */

export function parseIsoDayToUtcMs(date: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const [y, m, d] = date.split("-").map(Number);
  const ms = Date.UTC(y, m - 1, d);
  return Number.isFinite(ms) ? ms : null;
}

export function utcMsToIsoDay(ms: number): string {
  const d = new Date(ms);
  return d.toISOString().slice(0, 10);
}

/* ============================================================
   Window helpers
============================================================ */

export function normalizeWindowDays(value: unknown): SupportedWindowDays {
  const n = Number(value);
  if (n === 30 || n === 90 || n === 180 || n === 365) return n;
  return 365;
}

export function inferWindowDaysFromPath(p?: string | null): SupportedWindowDays {
  if (!p) return 365;

  const m = p.match(/last(\d+)d\.json$/i);
  if (m) {
    const n = Number(m[1]);
    if (n === 30 || n === 90 || n === 180 || n === 365) return n;
  }

  if (/latest\.json$/i.test(p)) return 30;

  return 365;
}

export function buildWindowPaths(
  base: string,
  genre: "gold" | "derived",
  chainId: string,
  selectedWindow: SupportedWindowDays
): string[] {
  const ordered = [selectedWindow, 365, 180, 90, 30]
    .filter((v, i, arr) => arr.indexOf(v) === i)
    .sort((a, b) => b - a);

  return [
    `${base}/${genre}/${chainId}/last${selectedWindow}d.json`,
    ...ordered
      .filter((v) => v !== selectedWindow)
      .map((v) => `${base}/${genre}/${chainId}/last${v}d.json`),
    `${base}/${genre}/${chainId}/last7d.json`,
    `${base}/${genre}/${chainId}/latest.json`,
  ];
}

/* ============================================================
   Numeric safety
============================================================ */

export function toNumberOrNull(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

/* ============================================================
   Validation helpers
============================================================ */

function validateDerivedRow(input: unknown): DerivedRow | null {
  const parsed = DerivedRowSchema.safeParse(input);
  if (!parsed.success) return null;
  return parsed.data;
}

function validateGoldRow(input: unknown): GoldRow | null {
  const parsed = GoldRowSchema.safeParse(input);
  if (!parsed.success) return null;
  return parsed.data;
}

/* ============================================================
   Derived (daily disk files)
============================================================ */

export async function readDerivedFromDailyFiles(
  chain: string,
  days: number
): Promise<{ rows: DerivedRow[]; source: string } | null> {
  try {
    const dir = path.join(process.cwd(), "public", "data", "published", "v1", "derived", chain);
    const entries = await fs.readdir(dir);

    const dateFiles = entries
      .filter((name) => /^\d{4}-\d{2}-\d{2}(\.json)?$/.test(name))
      .map((name) => {
        const date = name.replace(/\.json$/, "");
        const ms = parseIsoDayToUtcMs(date);
        return ms ? { name, date, ms } : null;
      })
      .filter((x): x is { name: string; date: string; ms: number } => !!x)
      .sort((a, b) => a.ms - b.ms);

    if (dateFiles.length === 0) return null;

    const maxMs = dateFiles[dateFiles.length - 1].ms;
    const minMs = maxMs - (days - 1) * 86400000;

    const wantDates = new Set<string>();
    for (let ms = minMs; ms <= maxMs; ms += 86400000) {
      wantDates.add(utcMsToIsoDay(ms));
    }

    const fileByDate = new Map<string, string>();
    for (const f of dateFiles) {
      if (wantDates.has(f.date)) fileByDate.set(f.date, f.name);
    }

    const rows: DerivedRow[] = [];
    const orderedDates = Array.from(wantDates).sort(
      (a, b) => (parseIsoDayToUtcMs(a) ?? 0) - (parseIsoDayToUtcMs(b) ?? 0)
    );

    for (const date of orderedDates) {
      const fname = fileByDate.get(date);
      if (!fname) continue;

      const full = path.join(dir, fname);
      const raw = await fs.readFile(full, "utf8");
      const json: unknown = JSON.parse(raw);

      const obj = asRecord(json);
      if (!obj) continue;

      const dateFromFile = getRecordField(obj, "date");
      const derivedObj = asRecord(getRecordField(obj, "derived"));
      const derivedMetrics = derivedObj ? asRecord(getRecordField(derivedObj, "metrics")) : null;

      // Some exporters may publish metrics at top-level; support that shape too.
      const topMetrics = asRecord(getRecordField(obj, "metrics"));
      const metrics = derivedMetrics ?? topMetrics ?? undefined;

      const candidate: DerivedRow = {
        chain,
        date: typeof dateFromFile === "string" ? dateFromFile : date,
        derived: metrics ? { metrics } : undefined,
      };

      const validated = validateDerivedRow(candidate);
      if (!validated) continue;

      rows.push(validated);
    }

    if (rows.length === 0) return null;

    return {
      rows,
      source: `disk:/public/data/published/v1/derived/${chain}/YYYY-MM-DD.json`,
    };
  } catch {
    return null;
  }
}

/* ============================================================
   Gold (daily disk files)
============================================================ */

export async function readGoldFromDailyFiles(
  chain: string,
  days: number
): Promise<{ rows: GoldRow[]; source: string } | null> {
  try {
    const dir = path.join(process.cwd(), "public", "data", "published", "v1", "gold", chain);
    const entries = await fs.readdir(dir);

    const dateFiles = entries
      .filter((name) => /^\d{4}-\d{2}-\d{2}(\.json)?$/.test(name))
      .map((name) => {
        const date = name.replace(/\.json$/, "");
        const ms = parseIsoDayToUtcMs(date);
        return ms ? { name, date, ms } : null;
      })
      .filter((x): x is { name: string; date: string; ms: number } => !!x)
      .sort((a, b) => a.ms - b.ms);

    if (dateFiles.length === 0) return null;

    const maxMs = dateFiles[dateFiles.length - 1].ms;
    const minMs = maxMs - (days - 1) * 86400000;

    const wantDates = new Set<string>();
    for (let ms = minMs; ms <= maxMs; ms += 86400000) {
      wantDates.add(utcMsToIsoDay(ms));
    }

    const fileByDate = new Map<string, string>();
    for (const f of dateFiles) {
      if (wantDates.has(f.date)) fileByDate.set(f.date, f.name);
    }

    const rows: GoldRow[] = [];
    const orderedDates = Array.from(wantDates).sort(
      (a, b) => (parseIsoDayToUtcMs(a) ?? 0) - (parseIsoDayToUtcMs(b) ?? 0)
    );

    for (const date of orderedDates) {
      const fname = fileByDate.get(date);
      if (!fname) continue;

      const full = path.join(dir, fname);
      const raw = await fs.readFile(full, "utf8");
      const json: unknown = JSON.parse(raw);

      const obj = asRecord(json);
      if (!obj) continue;

      const candidate: GoldRow = { ...obj };

      if (typeof candidate.chain !== "string") candidate.chain = chain;
      if (typeof candidate.date !== "string") candidate.date = date;

      const validated = validateGoldRow(candidate);
      if (!validated) continue;

      rows.push(validated);
    }

    if (rows.length === 0) return null;

    return {
      rows,
      source: `disk:/public/data/published/v1/gold/${chain}/YYYY-MM-DD.json`,
    };
  } catch {
    return null;
  }
}

/* ============================================================
   Gold metric resolver (no any)
============================================================ */

export function readGoldMetric(row: GoldRow | undefined, metric: string): number | null {
  if (!row) return null;

  // Direct key lookup (GoldRow has an index signature)
  const direct = toNumberOrNull(row[metric]);
  if (direct !== null) return direct;

  // Nested candidates (support common exporter shapes)
  const metrics = asRecord(row["metrics"]);
  const gold = asRecord(row["gold"]);
  const goldMetrics = gold ? asRecord(gold["metrics"]) : null;
  const features = asRecord(row["features"]);
  const data = asRecord(row["data"]);
  const values = asRecord(row["values"]);

  const nestedCandidates: unknown[] = [
    metrics ? metrics[metric] : undefined,
    goldMetrics ? goldMetrics[metric] : undefined,
    features ? features[metric] : undefined,
    data ? data[metric] : undefined,
    values ? values[metric] : undefined,
  ];

  for (const v of nestedCandidates) {
    const n = toNumberOrNull(v);
    if (n !== null) return n;
  }

  return null;
}

/* ============================================================
   Dense chart builder (deterministic)
============================================================ */

export function buildChartDataDense(params: {
  bounds: { minMs: number; maxMs: number };
  derivedByDate: Map<string, DerivedRow>;
  goldByDate: Map<string, GoldRow>;
  metric: string;
}): MetricPoint[] {
  const { bounds, derivedByDate, goldByDate, metric } = params;

  const ma7Key = `${metric}__ma7`;
  const ma30Key = `${metric}__ma30`;

  const points: MetricPoint[] = [];

  for (let ms = bounds.minMs; ms <= bounds.maxMs; ms += 86400000) {
    const date = utcMsToIsoDay(ms);

    const drow = derivedByDate.get(date);
    const metrics = drow?.derived?.metrics ?? {};

    const grow = goldByDate.get(date);

    points.push({
      date,
      value: readGoldMetric(grow, metric),
      ma7: toNumberOrNull(metrics[ma7Key]),
      ma30: toNumberOrNull(metrics[ma30Key]),
    });
  }

  return points;
}