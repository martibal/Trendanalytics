import Link from "next/link";
import { notFound } from "next/navigation";

import MetricLineChart, { type MetricPoint } from "@/components/MetricLineChart";
import RegimeBadge from "@/components/RegimeBadge";
import ChainIcon from "@/components/ChainIcon";
import ScoreGauge from "@/components/ui/ScoreGauge";
import StalenessBar from "@/components/ui/StalenessBar";
import WindowSelector from "@/components/ui/WindowSelector";
import ExplainModal from "@/components/ExplainModal";
import { getChainConfig, type ChainId } from "@/config/chains";
import { getUnitLabel } from "@/config/units";
import { readStorageObject } from "@/lib/storage";
import {
  asOfExplanation,
  chartHowToReadExplanation,
  chartWhyShownExplanation,
  confidenceExplanation,
  determinismExplanation,
  driverMetricExplanation,
  driversOverviewExplanation,
  driverStatExplanation,
  lagExplanation,
  regimeExplanation,
  scorecardAxisExplanation,
  scorecardOverviewExplanation,
} from "@/lib/chains/pageExplanations";

import PageHero from "@/components/site/PageHero";
import { UrdContainer, UrdPage } from "@/components/site/UrdDesignSystem";

import "server-only";

type Driver = {
  axis?: "demand" | "friction" | "capacity" | string;
  metric?: string;
  trend?: string;
  z_robust?: number;
  pct_90d?: number;
  momentum_7d_vs_30d?: number;
  current?: number;
};

type MetaLatest = {
  chain?: string;
  date?: string;
  updated_through?: string;

  status?: { label?: string; one_liner?: string; color?: string };

  confidence?: {
    confidence_score?: number;
    date?: string;
    lag_days_vs_utc_today?: number;
    missing?: boolean;
  };

  regime?: {
    label?: string;
    asof_date?: string;
    determinism_hash?: string;
    window_days?: number;
    drivers?: Driver[];
  };

  scorecard?: {
    asof_date?: string;
    window_days?: number;
    confidence_score?: number;
    notes?: { interpretation?: string };
    dimensions?: {
      demand?: {
        score?: number;
        level?: string;
        coverage_factor?: number;
        effective_confidence?: number;
      };
      friction?: {
        score?: number;
        level?: string;
        coverage_factor?: number;
        effective_confidence?: number;
      };
      capacity?: {
        score?: number;
        level?: string;
        coverage_factor?: number;
        effective_confidence?: number;
      };
    };
  };

  profile?: {
    id?: string;
    label?: string;
    note?: string;
    hidden_metrics?: string[];
    type?: string;
  };

  [k: string]: unknown;
};

type DerivedRow = {
  chain?: string;
  date?: string;
  derived?: {
    metrics?: Record<string, unknown>;
    meta_confidence?: { confidence_score?: number };
    context_blocks?: unknown[];
  };
};

type GoldRow = Record<string, unknown> & { date?: string; chain?: string };

type ChainPageSearchParams = {
  level?: string;
  window?: string;
};

async function readPublishedJson<T>(storagePath: string): Promise<T | null> {
  const result = await readStorageObject(storagePath);

  if (!result) return null;

  try {
    const raw = new TextDecoder("utf-8").decode(new Uint8Array(result.body));
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function InlineCode({ children }: { children: string }) {
  return <code className="rounded border border-[var(--urd-border)] bg-[var(--urd-raised)] px-1 py-0.5 text-[var(--urd-text-strong)]">{children}</code>;
}

function fmtDate(d?: string) {
  return d ?? "—";
}

function confidenceBand(v?: number) {
  if (typeof v !== "number") return "—";
  if (v >= 0.7) return "Good";
  if (v >= 0.4) return "Caution";
  return "Degraded";
}

function pillClass(kind: "neutral" | "good" | "warn" | "bad") {
  const base =
    "rounded-full border px-2.5 py-1 text-xs font-medium tracking-[0.02em]";
  if (kind === "good") {
    return `${base} border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200`;
  }
  if (kind === "warn") {
    return `${base} border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-200`;
  }
  if (kind === "bad") {
    return `${base} border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-200`;
  }
  return `${base} border-[var(--urd-border-soft)] bg-[var(--urd-raised)] text-[var(--urd-text-strong)]`;
}

function confidencePill(v?: number) {
  const b = confidenceBand(v);
  if (b === "Good") return pillClass("good");
  if (b === "Caution") return pillClass("warn");
  if (b === "Degraded") return pillClass("bad");
  return pillClass("neutral");
}

function confidenceNotice(v?: number) {
  const band = confidenceBand(v);

  if (band === "Caution") {
    return {
      tone: "caution" as const,
      title: "Reduced confidence",
      body:
        "Confidence is reduced due to limited history or missing components. Published scores are pulled toward neutral to reduce over-interpretation, while the canonical regime label remains visible.",
    };
  }

  if (band === "Degraded") {
    return {
      tone: "degraded" as const,
      title: "Degraded confidence",
      body:
        "Confidence is below the canonical threshold. The current state should be treated as UNKNOWN/DEGRADED, while the latest available data remains visible for traceability.",
    };
  }

  return null;
}

function confidenceNoticeClass(tone: "caution" | "degraded") {
  return tone === "degraded"
    ? "border-[var(--urd-border-soft)] bg-[#e7f1fb] text-slate-50"
    : "border-amber-400 bg-amber-50 text-[#8a5b00]";
}

function confidenceNoticeMetaClass(tone: "caution" | "degraded") {
  return tone === "degraded" ? "text-[var(--urd-text-body)]" : "text-[#8a5b00]";
}

function fmtNum(v?: number, digits = 3) {
  if (typeof v !== "number" || Number.isNaN(v)) return "—";
  return v.toFixed(digits);
}

function fmtScore100(v?: number) {
  if (typeof v !== "number" || Number.isNaN(v)) return "—";
  return v.toFixed(0);
}

function fmtPct0to100(v?: number) {
  if (typeof v !== "number" || Number.isNaN(v)) return "—";
  return `${v.toFixed(1)}%`;
}

function sortDrivers(drivers: Driver[]) {
  return [...drivers].sort((a, b) => {
    const za = Math.abs(a.z_robust ?? 0);
    const zb = Math.abs(b.z_robust ?? 0);
    return zb - za;
  });
}

function guessMetricKeysForChain(chain: string): string[] {
  switch (chain) {
    case "bitcoin":
      return [
        "tx_count_daily",
        "median_tx_fee_native",
        "avg_block_time_sec",
        "block_count_daily",
      ];
    default:
      return [
        "tx_count_daily",
        "unique_active_addresses",
        "gas_utilization_pct",
        "failed_tx_rate",
        "median_gas_price",
        "median_fee_native",
      ];
  }
}

function toNumberOrNull(v: unknown): number | null {
  if (typeof v === "number") return Number.isNaN(v) ? null : v;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function asRecord(v: unknown): Record<string, unknown> | null {
  if (!v || typeof v !== "object") return null;
  if (Array.isArray(v)) return null;
  return v as Record<string, unknown>;
}

function parseIsoDayToUtcMs(d: unknown): number | null {
  if (typeof d !== "string") return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return null;
  const [y, m, day] = d.split("-").map((x) => Number(x));
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(day)) {
    return null;
  }
  return Date.UTC(y, m - 1, day);
}

function utcMsToIsoDay(ms: number): string {
  const d = new Date(ms);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function buildDerivedByDate(rows: DerivedRow[]) {
  const m = new Map<string, DerivedRow>();
  for (const r of rows) {
    if (typeof r.date === "string") m.set(r.date, r);
  }
  return m;
}

function buildGoldByDate(rows: GoldRow[]) {
  const m = new Map<string, GoldRow>();
  for (const r of rows) {
    if (typeof r.date === "string") m.set(r.date, r);
  }
  return m;
}

function maxDateMsFromRows<T extends { date?: string }>(rows: T[]): number | null {
  let max: number | null = null;
  for (const r of rows) {
    const ms = parseIsoDayToUtcMs(r.date);
    if (typeof ms !== "number") continue;
    if (max === null || ms > max) max = ms;
  }
  return max;
}

function computeBoundsFromMax(maxMs: number, days: number) {
  const minMs = maxMs - (days - 1) * 24 * 60 * 60 * 1000;
  return { minMs, maxMs };
}

function listDays(bounds: { minMs: number; maxMs: number }): string[] {
  const out: string[] = [];
  for (let ms = bounds.minMs; ms <= bounds.maxMs; ms += 24 * 60 * 60 * 1000) {
    out.push(utcMsToIsoDay(ms));
  }
  return out;
}

function readGoldMetric(row: GoldRow | undefined, metric: string): number | null {
  if (!row) return null;

  const direct = toNumberOrNull(row[metric]);
  if (direct !== null) return direct;

  const nestedCandidates: unknown[] = [];

  const metrics = asRecord(row.metrics);
  if (metrics) nestedCandidates.push(metrics[metric]);

  const gold = asRecord(row.gold);
  const goldMetrics = gold ? asRecord(gold.metrics) : null;
  if (goldMetrics) nestedCandidates.push(goldMetrics[metric]);

  const features = asRecord(row.features);
  if (features) nestedCandidates.push(features[metric]);

  const data = asRecord(row.data);
  if (data) nestedCandidates.push(data[metric]);

  const values = asRecord(row.values);
  if (values) nestedCandidates.push(values[metric]);

  for (const v of nestedCandidates) {
    const n = toNumberOrNull(v);
    if (n !== null) return n;
  }

  return null;
}

function buildChartDataDense(params: {
  bounds: { minMs: number; maxMs: number };
  derivedByDate: Map<string, DerivedRow>;
  goldByDate: Map<string, GoldRow>;
  metric: string;
}): MetricPoint[] {
  const { bounds, derivedByDate, goldByDate, metric } = params;
  const ma7Key = `${metric}__ma7`;
  const ma30Key = `${metric}__ma30`;

  const points: MetricPoint[] = [];
  for (let ms = bounds.minMs; ms <= bounds.maxMs; ms += 24 * 60 * 60 * 1000) {
    const date = utcMsToIsoDay(ms);
    const drow = derivedByDate.get(date);
    const metrics: Record<string, unknown> = drow?.derived?.metrics ?? {};
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

function normalizeWindow(q?: string): 30 | 90 | 180 | 365 {
  const n = Number(q);
  if (n === 30 || n === 90 || n === 180 || n === 365) return n;
  return 365;
}

export default async function ChainPage({
  params,
  searchParams,
}: {
  params: Promise<{ chain: string }>;
  searchParams?: Promise<ChainPageSearchParams>;
}) {
  const { chain } = await params;
  if (!chain) return notFound();

  const cfg = getChainConfig(chain as ChainId);
  if (!cfg) return notFound();

  const chainId = cfg.id;

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const requestedWindow = normalizeWindow(resolvedSearchParams?.window);
  const effectiveWindowDays = requestedWindow;

  const metaPath = `meta/${chainId}/latest.json`;
  const goldPath = `gold/${chainId}/last${effectiveWindowDays}d.json`;
  const derivedPath = `derived/${chainId}/last${effectiveWindowDays}d.json`;

  const [meta, goldPayload, derivedPayload] = await Promise.all([
    readPublishedJson<MetaLatest>(metaPath),
    readPublishedJson<GoldRow[] | { rows?: GoldRow[] }>(goldPath),
    readPublishedJson<DerivedRow[] | { rows?: DerivedRow[] }>(derivedPath),
  ]);

  if (!meta) return notFound();

  const goldRows = Array.isArray(goldPayload)
    ? goldPayload
    : Array.isArray(goldPayload?.rows)
      ? goldPayload.rows
      : [];
  const derivedRows = Array.isArray(derivedPayload)
    ? derivedPayload
    : Array.isArray(derivedPayload?.rows)
      ? derivedPayload.rows
      : [];

  const maxDerived = maxDateMsFromRows(derivedRows);
  const maxGold = maxDateMsFromRows(goldRows);
  const maxFromMeta = parseIsoDayToUtcMs(
    meta.updated_through ??
      meta.regime?.asof_date ??
      meta.scorecard?.asof_date ??
      meta.date
  );
  const maxMs = maxDerived ?? maxGold ?? maxFromMeta;
  if (maxMs === null) return notFound();

  const bounds = computeBoundsFromMax(maxMs, effectiveWindowDays);
  const dayList = listDays(bounds);

  const derivedByDate = buildDerivedByDate(derivedRows);
  const goldByDate = buildGoldByDate(goldRows);

  const missingDays = dayList.filter(
    (d) => !derivedByDate.has(d) || !goldByDate.has(d)
  );
  if (missingDays.length > 0) {
    const dailyResults = await Promise.all(
      missingDays.map(async (d) => {
        const [dr, gr] = await Promise.all([
          derivedByDate.has(d)
            ? Promise.resolve(null)
            : readPublishedJson<DerivedRow>(`derived/${chainId}/${d}.json`),
          goldByDate.has(d)
            ? Promise.resolve(null)
            : readPublishedJson<GoldRow>(`gold/${chainId}/${d}.json`),
        ]);
        return { date: d, derived: dr, gold: gr };
      })
    );
    for (const { date, derived: dr, gold: gr } of dailyResults) {
      if (dr && typeof dr.date === "string") derivedByDate.set(date, dr);
      if (gr && typeof (gr as GoldRow).date === "string") {
        goldByDate.set(date, gr as GoldRow);
      }
    }
  }

  const displayName = meta.profile?.label ?? cfg.name;
  const asOf =
    meta.updated_through ??
    meta.regime?.asof_date ??
    meta.scorecard?.asof_date ??
    meta.date ??
    meta.confidence?.date;

  const regimeLabel = meta.status?.label ?? meta.regime?.label ?? "UNKNOWN";
  const oneLiner = meta.status?.one_liner;

  const conf = meta.confidence?.confidence_score;
  const confBand = confidenceBand(conf);
  const confNotice = confidenceNotice(conf);

  const driversAll = Array.isArray(meta.regime?.drivers)
    ? sortDrivers(meta.regime.drivers)
    : [];
  const whn = driversAll.slice(0, 5);

  const dims = meta.scorecard?.dimensions;

  const hidden = new Set(
    (meta.profile?.hidden_metrics ?? cfg.hiddenMetrics ?? []).map(String)
  );
  const driverMetrics = driversAll
    .map((d) => d.metric)
    .filter((m): m is string => typeof m === "string");
  const defaults = guessMetricKeysForChain(chainId);

  const candidates = Array.from(new Set([...driverMetrics, ...defaults]))
    .filter((m) => !hidden.has(m))
    .slice(0, 4);

  const charts = candidates
    .filter((metric) => {
      const ma7Key = `${metric}__ma7`;
      const ma30Key = `${metric}__ma30`;
      for (const d of dayList) {
        const row = derivedByDate.get(d);
        const m = row?.derived?.metrics;
        const grow = goldByDate.get(d);
        if (m && (ma7Key in m || ma30Key in m)) return true;
        if (readGoldMetric(grow, metric) !== null) return true;
      }
      return false;
    })
    .map((metric) => ({
      metric,
      unitLabel: getUnitLabel(chainId, metric) ?? undefined,
      data: buildChartDataDense({ bounds, derivedByDate, goldByDate, metric }),
    }));

  const windowOptions = [
    {
      key: "30",
      label: "30d",
      href: `/chains/${chainId}?window=30`,
    },
    {
      key: "90",
      label: "90d",
      href: `/chains/${chainId}?window=90`,
    },
    {
      key: "180",
      label: "180d",
      href: `/chains/${chainId}?window=180`,
    },
    {
      key: "365",
      label: "365d",
      href: `/chains/${chainId}?window=365`,
    },
  ];

  return (
    <UrdPage>
      <PageHero
        eyebrow="Chain analysis"
        title="Chains"
        summary="Per-chain descriptive regime classification, freshness, confidence, scorecard dimensions, drivers, and metric history."
      />

      <UrdContainer className="py-10">
      <StalenessBar
        chain={chainId}
        lagDays={meta.confidence?.lag_days_vs_utc_today}
        asOfDate={asOf}
        confidenceScore={conf}
        className="mb-6"
      />

      {confNotice ? (
        <section
          className={[
            "mb-6 rounded-2xl border px-4 py-4 text-sm shadow-sm",
            confidenceNoticeClass(confNotice.tone),
          ].join(" ")}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="font-medium text-[var(--urd-text-strong)]">{confNotice.title}</div>
              <p className={`mt-1 max-w-3xl ${confidenceNoticeMetaClass(confNotice.tone)}`}>
                {confNotice.body}
              </p>
            </div>
            <div className={`text-xs ${confidenceNoticeMetaClass(confNotice.tone)}`}>
              Source: <InlineCode>confidence.confidence_score</InlineCode>
              {typeof conf === "number" ? (
                <>
                  {" "}· Current value{" "}
                  <span className="font-medium text-[var(--urd-text-strong)]">{conf.toFixed(3)}</span>
                </>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      <header className="mb-8 space-y-6 rounded-3xl border border-[var(--urd-border-soft)] bg-[var(--urd-panel)] p-8 shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_14px_34px_rgba(15,47,91,0.08)]">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="rounded-3xl border border-[var(--urd-border-soft)] bg-[var(--urd-panel)] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_14px_34px_rgba(15,47,91,0.08)]">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <ChainIcon
                    chain={chainId}
                    className="h-10 w-10 text-base"
                    label={`${displayName} icon`}
                  />
                  <div className="min-w-0">
                    <h1 className="truncate text-3xl font-semibold">{displayName}</h1>
                    <div className="mt-1 text-sm text-[var(--urd-text-body)]">{cfg.subtitle}</div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
                  <span className="text-[var(--urd-text-body)]">As of:</span>
                  <span className="font-medium">{fmtDate(asOf)}</span>
                  {typeof meta.confidence?.lag_days_vs_utc_today === "number" ? (
                    <span className="text-[var(--urd-text-body)]">
                      (lag: {meta.confidence.lag_days_vs_utc_today}d)
                    </span>
                  ) : null}
                  <span className="text-[var(--urd-text-body)]">·</span>
                  <Link
                    href={`/chains/${chainId}/history`}
                    className="text-[var(--urd-text-body)] hover:text-[var(--urd-text-strong)] hover:underline"
                  >
                    View history
                  </Link>
                </div>
              </div>

              <div className="shrink-0">
                <RegimeBadge label={regimeLabel} statusColor={meta.status?.color} />
              </div>
            </div>

            {oneLiner ? (
              <div className="mt-5 rounded-xl border bg-[var(--urd-raised)]/20 p-4 text-sm">
                <div className="text-xs font-medium uppercase tracking-[0.12em] text-[var(--urd-text-body)]">
                  Current summary
                </div>
                <div className="mt-2 font-medium leading-6 text-[var(--urd-text-strong)]">{oneLiner}</div>
              </div>
            ) : null}

            <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-[var(--urd-text-body)]">
              <Link href="/methodology" className="hover:text-[var(--urd-text-strong)] hover:underline">
                Methodology
              </Link>
              <span>·</span>
              <Link href="/glossary" className="hover:text-[var(--urd-text-strong)] hover:underline">
                Glossary
              </Link>
              <span>·</span>
              <Link href="/thresholds" className="hover:text-[var(--urd-text-strong)] hover:underline">
                Thresholds
              </Link>
            </div>
          </section>

          <aside className="rounded-2xl border p-5 shadow-sm">
            <div className="text-xs font-medium uppercase tracking-[0.12em] text-[var(--urd-text-body)]">
              How to use this page
            </div>
            <p className="mt-3 text-sm leading-6 text-[var(--urd-text-body)]">
              Read the page in this order: freshness and confidence first, then the
              regime card, then charts, then scorecard and drivers. Open the
              individual <span className="font-medium text-[var(--urd-text-strong)]">More</span> buttons
              whenever you want Basic or Advanced explanation in a larger popup.
            </p>
          </aside>
        </div>

        <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-3xl border border-[var(--urd-border-soft)] bg-[var(--urd-panel)] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_14px_34px_rgba(15,47,91,0.08)]">
            <div className="text-sm text-[var(--urd-text-body)]">Published regime</div>
            <div className="mt-4">
              <RegimeBadge label={regimeLabel} statusColor={meta.status?.color} />
            </div>
            <div className="mt-4">
              <ExplainModal content={regimeExplanation(regimeLabel)} />
            </div>
          </div>

          <div className="rounded-3xl border border-[var(--urd-border-soft)] bg-[var(--urd-panel)] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_14px_34px_rgba(15,47,91,0.08)]">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm text-[var(--urd-text-body)]">Confidence</div>
              <span className={confidencePill(conf)}>{confBand}</span>
            </div>
            <div className="mt-4 text-3xl font-semibold">
              {typeof conf === "number" ? conf.toFixed(3) : "—"}
            </div>
            <div className="mt-2 text-xs text-[var(--urd-text-body)]">
              Data quality and label support should be read as evidence strength, not forecast certainty.
            </div>
            <div className="mt-4">
              <ExplainModal content={confidenceExplanation(confBand)} />
            </div>
          </div>

          <div className="rounded-3xl border border-[var(--urd-border-soft)] bg-[var(--urd-panel)] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_14px_34px_rgba(15,47,91,0.08)]">
            <div className="text-sm text-[var(--urd-text-body)]">Data as of</div>
            <div className="mt-4 text-3xl font-semibold">{fmtDate(asOf)}</div>
            <div className="mt-2 text-xs text-[var(--urd-text-body)]">
              Check this before interpreting any label too strongly.
            </div>
            <div className="mt-4">
              <ExplainModal content={asOfExplanation(fmtDate(asOf))} />
            </div>
          </div>

          <div className="rounded-3xl border border-[var(--urd-border-soft)] bg-[var(--urd-panel)] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_14px_34px_rgba(15,47,91,0.08)]">
            <div className="text-sm text-[var(--urd-text-body)]">Observed lag</div>
            <div className="mt-4 text-3xl font-semibold">
              {typeof meta.confidence?.lag_days_vs_utc_today === "number" ? `${meta.confidence.lag_days_vs_utc_today}d` : "—"}
            </div>
            <div className="mt-2 text-xs text-[var(--urd-text-body)]">
              Freshness is shown separately from confidence.
            </div>
            <div className="mt-4">
              <ExplainModal content={lagExplanation(meta.confidence?.lag_days_vs_utc_today)} />
            </div>
          </div>

          <div className="rounded-3xl border border-[var(--urd-border-soft)] bg-[var(--urd-panel)] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_14px_34px_rgba(15,47,91,0.08)]">
            <div className="text-sm text-[var(--urd-text-body)]">Determinism</div>
            <div className="mt-4 break-all text-base font-semibold">
              {meta.regime?.determinism_hash ?? "—"}
            </div>
            <div className="mt-2 text-xs text-[var(--urd-text-body)]">
              Window days: {meta.regime?.window_days ?? meta.scorecard?.window_days ?? "—"}
            </div>
            <div className="mt-4">
              <ExplainModal
                content={determinismExplanation(meta.regime?.window_days ?? meta.scorecard?.window_days)}
              />
            </div>
          </div>
        </section>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-[var(--urd-border-soft)] bg-[var(--urd-raised)] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium">Scorecard</div>
                <div className="mt-1 text-sm text-[var(--urd-text-body)]">
                  Decomposes the current state into Demand, Friction, and Capacity.
                </div>
              </div>
              <ExplainModal content={scorecardOverviewExplanation(chainId)} />
            </div>
          </div>

          <div className="rounded-xl border border-[var(--urd-border-soft)] bg-[var(--urd-raised)] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium">Drivers</div>
                <div className="mt-1 text-sm text-[var(--urd-text-body)]">
                  Metric-level evidence underneath the visible regime label.
                </div>
              </div>
              <ExplainModal content={driversOverviewExplanation(chainId)} />
            </div>
          </div>
        </div>

        <details className="rounded-xl border border-[var(--urd-border-soft)] bg-[var(--urd-raised)] p-4">
          <summary className="cursor-pointer select-none">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm font-medium">Data contract & traceability</div>
              <div className="text-xs text-[var(--urd-text-body)]">Advanced context</div>
            </div>
          </summary>

          <div className="mt-3 grid gap-1 text-sm text-[var(--urd-text-body)]">
            <div>
              <span className="font-medium text-[var(--urd-text-strong)]">Published context:</span>{" "}
              Artifact semantics are defined publicly in Methodology, Provenance &amp; Revisions, and the schema reference.
            </div>
            <div>
              <span className="font-medium text-[var(--urd-text-strong)]">Meta artifact:</span>{" "}
              <InlineCode>{metaPath}</InlineCode>
            </div>
            <div>
              <span className="font-medium text-[var(--urd-text-strong)]">Gold artifact:</span>{" "}
              <InlineCode>{goldPath}</InlineCode>
            </div>
            <div>
              <span className="font-medium text-[var(--urd-text-strong)]">Derived artifact:</span>{" "}
              <InlineCode>{derivedPath}</InlineCode>
            </div>
          </div>
        </details>
      </header>

      <section className="mt-10">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-medium">Trends (raw + MA)</h2>
          <WindowSelector
            activeKey={String(requestedWindow)}
            options={windowOptions}
            ariaLabel="Chart window selector"
          />
        </div>

        {!derivedPayload ? (
          <div className="rounded-xl border p-6 text-sm text-[var(--urd-text-body)]">
            No derived source found at <InlineCode>{derivedPath}</InlineCode>.
          </div>
        ) : charts.length === 0 ? (
          <div className="rounded-xl border p-6 text-sm text-[var(--urd-text-body)]">
            Derived loaded from <InlineCode>{derivedPath}</InlineCode>, but no
            chartable series were found for the selected metrics.
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {charts.map((c) => (
              <div key={c.metric} className="space-y-3">
                <MetricLineChart
                  title={c.metric}
                  subtitle={`MA: ${derivedPath} · Raw: ${goldPath} · Window: ${utcMsToIsoDay(
                    bounds.minMs
                  )} → ${utcMsToIsoDay(bounds.maxMs)} (${effectiveWindowDays} calendar days)`}
                  unitLabel={c.unitLabel}
                  data={c.data}
                  windowDays={effectiveWindowDays}
                />
                <div className="flex flex-wrap gap-2">
                  <ExplainModal
                    content={chartHowToReadExplanation(c.metric, effectiveWindowDays, c.unitLabel)}
                    buttonLabel="How to read"
                  />
                  <ExplainModal
                    content={chartWhyShownExplanation(c.metric, chainId)}
                    buttonLabel="Why shown"
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-3 text-xs text-[var(--urd-text-body)]">
          Source contract: canonical window bundle first. If a published window bundle is
          incomplete, canonical daily files may supplement missing dates for traceability.
        </div>
      </section>

      <section className="mt-10">
        <h2 className="mb-3 text-lg font-medium">What’s happening now</h2>

        {whn.length === 0 ? (
          <div className="rounded-xl border p-6 text-sm text-[var(--urd-text-body)]">
            No drivers found in <InlineCode>regime.drivers[]</InlineCode>.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {whn.map((d, i) => (
              <div key={`${d.metric ?? "driver"}-${i}`} className="rounded-xl border p-6 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm text-[var(--urd-text-body)]">{d.axis ?? "—"}</div>
                  <div className="text-xs text-[var(--urd-text-body)]">z={fmtNum(d.z_robust, 2)}</div>
                </div>

                <div className="mt-2 text-lg font-semibold">{d.metric ?? "—"}</div>

                <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-[var(--urd-text-body)]">Trend</div>
                    <div className="font-medium">{d.trend ?? "—"}</div>
                  </div>

                  <div>
                    <div className="text-[var(--urd-text-body)]">90d percentile</div>
                    <div className="font-medium">{fmtPct0to100(d.pct_90d)}</div>
                  </div>

                  <div>
                    <div className="text-[var(--urd-text-body)]">Momentum (7d vs 30d)</div>
                    <div className="font-medium">{fmtNum(d.momentum_7d_vs_30d, 3)}</div>
                  </div>

                  <div>
                    <div className="text-[var(--urd-text-body)]">Current</div>
                    <div className="font-medium">
                      {typeof d.current === "number" ? String(d.current) : "—"}
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {d.metric ? (
                    <ExplainModal
                      content={driverMetricExplanation(d.metric, d.axis)}
                      buttonLabel="Metric"
                    />
                  ) : null}
                  {d.metric ? (
                    <ExplainModal
                      content={driverStatExplanation("z_robust", d.metric)}
                      buttonLabel="z-score"
                    />
                  ) : null}
                  {d.metric ? (
                    <ExplainModal
                      content={driverStatExplanation("pct_90d", d.metric)}
                      buttonLabel="Percentile"
                    />
                  ) : null}
                  {d.metric ? (
                    <ExplainModal
                      content={driverStatExplanation("momentum_7d_vs_30d", d.metric)}
                      buttonLabel="Momentum"
                    />
                  ) : null}
                  {d.metric ? (
                    <ExplainModal
                      content={driverStatExplanation("current", d.metric)}
                      buttonLabel="Current"
                    />
                  ) : null}
                </div>

                <div className="mt-3 text-xs text-[var(--urd-text-body)]">
                  Source: <InlineCode>{`meta/${chainId}/latest.json`}</InlineCode> →{" "}
                  <InlineCode>regime.drivers[]</InlineCode>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="mb-3 text-lg font-medium">Scorecard</h2>

        {!dims ? (
          <div className="rounded-xl border p-6 text-sm text-[var(--urd-text-body)]">
            No scorecard dimensions found in <InlineCode>scorecard.dimensions</InlineCode>.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { key: "demand", label: "Demand", dim: dims.demand },
              { key: "friction", label: "Friction", dim: dims.friction },
              { key: "capacity", label: "Capacity", dim: dims.capacity },
            ].map(({ key, label, dim }) => {
              const score =
                typeof dim?.score === "number" && Number.isFinite(dim.score)
                  ? dim.score
                  : null;
              const levelLabel = dim?.level ?? "—";

              return (
                <div key={key} className="rounded-xl border p-6 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm text-[var(--urd-text-body)]">{label}</div>
                    <span className={pillClass("neutral")}>{levelLabel}</span>
                  </div>

                  <div className="mt-4 flex items-center justify-center">
                    {score === null ? (
                      <div className="text-sm text-[var(--urd-text-body)]">Score not available</div>
                    ) : (
                      <ScoreGauge score={score} label={label} note={String(levelLabel)} />
                    )}
                  </div>

                  <div className="mt-3 text-center text-2xl font-semibold">
                    {fmtScore100(dim?.score)}
                    <span className="ml-2 text-sm font-normal text-[var(--urd-text-body)]">/ 100</span>
                  </div>

                  <div className="mt-3 text-xs text-[var(--urd-text-body)]">
                    Source: <InlineCode>{`scorecard.dimensions.${key}.score`}</InlineCode>
                  </div>

                  <div className="mt-3 text-xs text-[var(--urd-text-body)]">
                    Coverage: {fmtNum(dim?.coverage_factor, 3)} · Effective conf:{" "}
                    {fmtNum(dim?.effective_confidence, 3)}
                  </div>

                  <div className="mt-4">
                    <ExplainModal content={scorecardAxisExplanation(key)} />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {meta.scorecard?.notes?.interpretation ? (
          <div className="mt-4 rounded-xl border p-5 text-sm text-[var(--urd-text-body)]">
            <div className="font-medium text-[var(--urd-text-strong)]">Interpretation note (published)</div>
            <div className="mt-2">{meta.scorecard.notes.interpretation}</div>
          </div>
        ) : null}
      </section>

      <section className="mt-10">
        <h2 className="mb-3 text-lg font-medium">Drivers</h2>

        {driversAll.length === 0 ? (
          <div className="rounded-xl border p-6 text-sm text-[var(--urd-text-body)]">
            No drivers found in <InlineCode>regime.drivers[]</InlineCode>.
          </div>
        ) : (
          <div className="rounded-xl border">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-[var(--urd-panel-strong)] text-left text-[var(--urd-text-body)]">
                  <tr>
                    <th className="px-4 py-3">Axis</th>
                    <th className="px-4 py-3">Metric</th>
                    <th className="px-4 py-3">Trend</th>
                    <th className="px-4 py-3">z_robust</th>
                    <th className="px-4 py-3">pct_90d</th>
                    <th className="px-4 py-3">mom (7d vs 30d)</th>
                    <th className="px-4 py-3">Current</th>
                  </tr>
                </thead>
                <tbody>
                  {driversAll.map((d, i) => (
                    <tr key={`${d.metric ?? "driver"}-${i}`} className="border-b last:border-b-0">
                      <td className="px-4 py-3">{d.axis ?? "—"}</td>
                      <td className="px-4 py-3 font-medium">{d.metric ?? "—"}</td>
                      <td className="px-4 py-3">{d.trend ?? "—"}</td>
                      <td className="px-4 py-3">{fmtNum(d.z_robust, 2)}</td>
                      <td className="px-4 py-3">{fmtPct0to100(d.pct_90d)}</td>
                      <td className="px-4 py-3">{fmtNum(d.momentum_7d_vs_30d, 3)}</td>
                      <td className="px-4 py-3">
                        {typeof d.current === "number" ? String(d.current) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="border-t px-4 py-3 text-xs text-[var(--urd-text-body)]">
              Source: <InlineCode>{`meta/${chainId}/latest.json`}</InlineCode> →{" "}
              <InlineCode>regime.drivers[]</InlineCode>
            </div>
          </div>
        )}
      </section>

      {meta.profile?.note ? (
        <section className="mt-10 rounded-xl border p-6">
          <div className="text-sm text-[var(--urd-text-body)]">Chain profile note (published)</div>
          <div className="mt-2 text-sm">{meta.profile.note}</div>
        </section>
      ) : null}

      <section className="mt-10 rounded-xl border p-6 text-xs text-[var(--urd-text-body)]">
        <div className="font-medium text-[var(--urd-text-strong)]">Runtime data contract</div>
        <ul className="mt-2 list-disc pl-5">
          <li>
            Published artifact contract
          </li>
          <li>
            Meta path: <InlineCode>{metaPath}</InlineCode>
          </li>
          <li>
            Gold path: <InlineCode>{goldPath}</InlineCode>
          </li>
          <li>
            Derived path: <InlineCode>{derivedPath}</InlineCode>
          </li>
          <li>Canonical window bundle first</li>
          <li>Daily-file supplementation only when a published window bundle is incomplete</li>
        </ul>
      </section>
      </UrdContainer>
    </UrdPage>
  );
}
