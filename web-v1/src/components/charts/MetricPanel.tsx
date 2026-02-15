"use client";

import React, { useEffect, useMemo, useState } from "react";
import { MetricTriLineChart } from "@/components/charts/MetricTriLineChart";
import { getMetric, metricLinks } from "@/lib/metrics/catalog";

type Chain = "bitcoin" | "ethereum" | "arbitrum" | "base";

type SeriesRow = {
  date: string;
  daily: number | null;
  ma7: number | null;
  ma30: number | null;
  confidence: number | null;
  z: number | null;
  percentile: number | null;
  ma_source?: "derived" | "fallback_computed";
};

type SeriesResponse = {
  dataset_id: string | null;
  revision_id: string | null;
  chain: Chain;
  metric: string;
  start: string;
  end: string;
  rows: SeriesRow[];
  coverage: {
    expected_days: number;
    present_days: number;
    missing_days: string[];
    nonNull_ratio: number;
  };
  freshness: {
    asof: string;
    lag_days: number;
  };
};

type SummaryResponse = {
  dataset_id: string | null;
  revision_id: string | null;
  chain: Chain;
  metric: string;
  start: string;
  end: string;
  current: { daily: number | null; ma7: number | null; ma30: number | null };
  period: { mean_daily: number | null; median_daily: number | null; stdev_daily: number | null };
  trend: { slope_ma30: number | null; label: "Rising" | "Falling" | "Flat"; strength: "Weak" | "Moderate" | "Strong" };
  volatility: { cv_daily: number | null; label: "Stable" | "Variable" | "Highly variable" };
  level: {
    label: "Low" | "Typical" | "Elevated" | "Extreme";
    method: "meta_percentile" | "last365_rank";
    reference: "historical";
    percentile: number | null;
  };
  confidence: { mean: number | null; latest: number | null };
  caveats: string[];
  interpretation: { basic: string; advanced: string[] };
};

type TriSeriesPoint = {
  date: string;
  daily: number | null;
  ma7: number | null;
  ma30: number | null;
  confidence?: number | null;
  z?: number | null;
  percentile?: number | null;
};

type RegimeContext = {
  kind: "near" | "persistent_above" | "persistent_below" | "transient_above" | "transient_below" | "insufficient";
  relDiff: number | null; // (ma7 - ma30)/|ma30|
  streakDays: number | null;
  headline: string;
  detail: string;
  tone: "neutral" | "warn";
};

function computeRegimeContext(points: TriSeriesPoint[]): RegimeContext {
  // Web2: "persistent vs transient" context is based on MA7 vs MA30 divergence.
  // This is descriptive: it flags sustained deviations from the structural baseline.
  //
  // Heuristics (stable + deterministic):
  // - threshold: absolute relative divergence needed to call it "meaningful"
  // - streak: consecutive end-of-window days sustaining that divergence with consistent sign
  const threshold = 0.08; // 8% of MA30
  const minStreak = 5; // days
  const lookbackMax = 21; // cap work; enough to detect persistence

  if (!Array.isArray(points) || points.length < 2) {
    return {
      kind: "insufficient",
      relDiff: null,
      streakDays: null,
      headline: "Regime context unavailable",
      detail: "Not enough usable MA7/MA30 points in this window.",
      tone: "neutral",
    };
  }

  // Find latest usable point.
  let latestIdx = -1;
  for (let i = points.length - 1; i >= 0; i--) {
    const p = points[i];
    if (typeof p?.ma7 === "number" && Number.isFinite(p.ma7) && typeof p?.ma30 === "number" && Number.isFinite(p.ma30)) {
      latestIdx = i;
      break;
    }
  }

  if (latestIdx < 0) {
    return {
      kind: "insufficient",
      relDiff: null,
      streakDays: null,
      headline: "Regime context unavailable",
      detail: "MA7/MA30 are missing for the latest part of this window.",
      tone: "neutral",
    };
  }

  const latest = points[latestIdx];
  const ma7 = latest.ma7 as number;
  const ma30 = latest.ma30 as number;

  if (ma30 === 0) {
    return {
      kind: "insufficient",
      relDiff: null,
      streakDays: null,
      headline: "Regime context unavailable",
      detail: "MA30 is ~0, so relative divergence is not stable.",
      tone: "neutral",
    };
  }

  const relDiff = (ma7 - ma30) / Math.abs(ma30);
  const sign = relDiff === 0 ? 0 : relDiff > 0 ? 1 : -1;
  const absRel = Math.abs(relDiff);

  if (!Number.isFinite(relDiff)) {
    return {
      kind: "insufficient",
      relDiff: null,
      streakDays: null,
      headline: "Regime context unavailable",
      detail: "Could not compute stable MA7/MA30 divergence.",
      tone: "neutral",
    };
  }

  if (absRel < threshold) {
    return {
      kind: "near",
      relDiff,
      streakDays: 0,
      headline: "Regime near baseline",
      detail: "MA7 is close to the structural baseline (MA30). Short-term and structural levels are aligned.",
      tone: "neutral",
    };
  }

  // Count consecutive days sustaining divergence with same sign.
  let streak = 0;
  const startIdx = Math.max(0, latestIdx - lookbackMax);
  for (let i = latestIdx; i >= startIdx; i--) {
    const p = points[i];
    const m7 = p?.ma7;
    const m30 = p?.ma30;
    if (typeof m7 !== "number" || !Number.isFinite(m7) || typeof m30 !== "number" || !Number.isFinite(m30) || m30 === 0) break;
    const rd = (m7 - m30) / Math.abs(m30);
    if (!Number.isFinite(rd)) break;
    const s = rd === 0 ? 0 : rd > 0 ? 1 : -1;
    if (s !== sign) break;
    if (Math.abs(rd) < threshold) break;
    streak += 1;
  }

  const pct = Math.round(absRel * 1000) / 10; // 1 decimal
  const dir = sign >= 0 ? "above" : "below";

  if (streak >= minStreak) {
    return {
      kind: sign >= 0 ? "persistent_above" : "persistent_below",
      relDiff,
      streakDays: streak,
      headline: `Persistent regime ${dir} baseline`,
      detail: `MA7 is ~${pct}% ${dir} MA30, sustained for ${streak} consecutive days (end of window).`,
      tone: "warn",
    };
  }

  return {
    kind: sign >= 0 ? "transient_above" : "transient_below",
    relDiff,
    streakDays: streak,
    headline: `Short-term ${dir} baseline (not yet persistent)`,
    detail: `MA7 is ~${pct}% ${dir} MA30, but the divergence is not sustained long enough to call persistent (streak: ${streak}d).`,
    tone: "neutral",
  };
}

function fmtCompact(x: unknown) {
  if (x == null) return "—";
  const n = Number(x);
  if (!Number.isFinite(n)) return "—";

  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  if (abs > 0 && abs < 1) return n.toFixed(6);
  return n.toFixed(2);
}

function buildUrl(path: string, params: Record<string, string | undefined>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v != null && v !== "") sp.set(k, v);
  }
  return `${path}?${sp.toString()}`;
}

function toTitle(metric: string) {
  return metric.replaceAll("_", " ");
}

function Chip(props: { label: string; value: string; tone?: "neutral" | "warn" }) {
  const tone = props.tone ?? "neutral";

  const cls =
    tone === "warn"
      ? "border-ui-border bg-[rgb(var(--bad)/0.10)] text-ui-text"
      : "border-ui-border bg-ui-bg/15 text-ui-muted";

  return (
    <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] ${cls}`}>
      <span className="text-ui-faint">{props.label}</span>
      <span className="font-mono tabular-nums text-ui-muted">{props.value}</span>
    </div>
  );
}

function PercentileCopy({ p }: { p: number | null | undefined }) {
  if (p == null || !Number.isFinite(p)) return <span className="text-ui-muted">—</span>;
  const pct = Math.max(0, Math.min(100, Math.round(p)));
  const below = 100 - pct;
  return (
    <span className="text-ui-muted">
      Today ranks in the <span className="font-semibold text-ui-text">{pct}th</span> percentile{" "}
      <span className="text-ui-faint">(lower than ~{below}% of days in this window)</span>.
    </span>
  );
}

function zLabel(z: number | null) {
  if (z == null || !Number.isFinite(z)) return null;
  const a = Math.abs(z);
  if (a >= 3) return "Extremely unusual";
  if (a >= 2) return "Very unusual";
  if (a >= 1) return "Somewhat unusual";
  return "Within typical range";
}

function fmtZ(z: number | null) {
  if (z == null || !Number.isFinite(z)) return "—";
  const s = z.toFixed(2);
  return z >= 0 ? `+${s}` : s;
}

export function MetricPanel(props: {
  chain: Chain;
  metric: string;
  start: string; // YYYY-MM-DD
  end?: string;

  title?: string;
  subtitle?: string;

  hideIfLowCoverage?: boolean;

  methodologyHref?: string;
  wikiHref?: string;
}) {
  const metricEntry = useMemo(() => getMetric(props.metric), [props.metric]);
  const isKnownMetric = Boolean(metricEntry);

  const [series, setSeries] = useState<SeriesResponse | null>(null);
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const seriesUrl = useMemo(() => {
    return buildUrl("/api/series", {
      chain: props.chain,
      metric: props.metric,
      start: props.start,
      end: props.end,
    });
  }, [props.chain, props.metric, props.start, props.end]);

  const summaryUrl = useMemo(() => {
    return buildUrl("/api/summary", {
      chain: props.chain,
      metric: props.metric,
      start: props.start,
      end: props.end,
    });
  }, [props.chain, props.metric, props.start, props.end]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!isKnownMetric) {
        setLoading(false);
        setSeries(null);
        setSummary(null);
        setErr(`Unknown/undocumented metric key: ${props.metric}`);
        return;
      }

      setLoading(true);
      setErr(null);

      try {
        const [sRes, uRes] = await Promise.all([fetch(seriesUrl), fetch(summaryUrl)]);
        if (!sRes.ok) throw new Error(`series HTTP ${sRes.status}`);
        if (!uRes.ok) throw new Error(`summary HTTP ${uRes.status}`);

        const sJson = (await sRes.json()) as SeriesResponse;
        const uJson = (await uRes.json()) as SummaryResponse;

        if (!cancelled) {
          setSeries(sJson);
          setSummary(uJson);
          setLoading(false);
        }
      } catch (e: any) {
        if (!cancelled) {
          setErr(e?.message || "Failed to load metric panel.");
          setSeries(null);
          setSummary(null);
          setLoading(false);
        }
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [seriesUrl, summaryUrl, isKnownMetric, props.metric]);

  const triData: TriSeriesPoint[] = useMemo(() => {
    const rows = series?.rows ?? [];
    return rows.map((r) => ({
      date: r.date,
      daily: r.daily,
      ma7: r.ma7,
      ma30: r.ma30,
      confidence: r.confidence,
      z: r.z,
      percentile: r.percentile,
    }));
  }, [series]);

  const title = props.title ?? (metricEntry ? metricEntry.label : toTitle(props.metric));
  const subtitle =
    props.subtitle ??
    (metricEntry ? metricEntry.doc?.why?.basic ?? "Descriptive metric panel (documentation incomplete)." : "Undocumented metric (no catalog entry).");

  const nonNull = series?.coverage?.nonNull_ratio ?? null;
  const isLowCoverage = nonNull !== null && nonNull < 0.7;
  const missingCount = series?.coverage?.missing_days?.length ?? 0;

  const catalogLinks = metricEntry
    ? metricLinks(metricEntry.key)
    : { methodologyHref: `/methodology#${props.metric}`, wikiHref: `/wiki#${props.metric}` };
  const methodologyHref = props.methodologyHref ?? catalogLinks.methodologyHref;
  const wikiHref = props.wikiHref ?? catalogLinks.wikiHref;

  const latestDate = series?.rows?.length ? series.rows[series.rows.length - 1]?.date : null;

  const rawGoldDailyHref = latestDate ? buildUrl("/api/export/daily", { chain: props.chain, genre: "gold", date: latestDate }) : null;
  const rawDerivedDailyHref = latestDate ? buildUrl("/api/export/daily", { chain: props.chain, genre: "derived", date: latestDate }) : null;
  const rawMetaDailyHref = latestDate ? buildUrl("/api/export/daily", { chain: props.chain, genre: "meta", date: latestDate }) : null;

  const rawGoldWindowHref = buildUrl("/api/export/window", { chain: props.chain, genre: "gold", window: "365" });
  const rawDerivedWindowHref = buildUrl("/api/export/window", { chain: props.chain, genre: "derived", window: "365" });
  const rawMetaWindowHref = buildUrl("/api/export/window", { chain: props.chain, genre: "meta", window: "365" });

  const rawGoldManifestHref = buildUrl("/api/export/manifest", { chain: props.chain, genre: "gold" });
  const rawDerivedManifestHref = buildUrl("/api/export/manifest", { chain: props.chain, genre: "derived" });
  const rawMetaManifestHref = buildUrl("/api/export/manifest", { chain: props.chain, genre: "meta" });

  const pct = summary?.level?.percentile;
  const pctInt = pct == null || !Number.isFinite(Number(pct)) ? null : Math.round(Number(pct));

  // Z-score: prefer last row z from series, else compute from summary period stats (display-only)
  const latestRow = series?.rows?.length ? series.rows[series.rows.length - 1] : null;
  const zFromSeries = latestRow?.z ?? null;

  const zFallback = useMemo(() => {
    const x = summary?.current?.daily;
    const mu = summary?.period?.mean_daily;
    const sd = summary?.period?.stdev_daily;
    if (x == null || mu == null || sd == null) return null;
    if (!Number.isFinite(x) || !Number.isFinite(mu) || !Number.isFinite(sd)) return null;
    if (sd === 0) return null;
    return (x - mu) / sd;
  }, [summary]);

  const zLatest = zFromSeries != null && Number.isFinite(zFromSeries) ? zFromSeries : zFallback;
  const zText = zLabel(zLatest);

  const regime = useMemo(() => computeRegimeContext(triData), [triData]);

  const regimeBadge = useMemo(() => {
    const rd = regime.relDiff;
    if (rd == null || !Number.isFinite(rd)) return "—";
    const pct = Math.round(Math.abs(rd) * 1000) / 10;
    const dir = rd >= 0 ? "above" : "below";
    return `MA7 ~${pct}% ${dir} MA30`;
  }, [regime.relDiff]);

  return (
    <div className="rounded-3xl border border-ui-border bg-ui-bg/15 p-6 ui-lift">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-ui-text">{title}</div>
          <div className="mt-0.5 text-xs text-ui-muted">{subtitle}</div>

          <div className="mt-3 flex flex-wrap gap-2">
            {missingCount > 0 ? (
              <Chip label="missing days" value={`${missingCount}`} tone="warn" />
            ) : (
              <Chip label="missing days" value="0" />
            )}

            {nonNull !== null ? (
              <Chip label="non-null" value={`${(nonNull * 100).toFixed(1)}%`} tone={isLowCoverage ? "warn" : "neutral"} />
            ) : (
              <Chip label="non-null" value="—" tone={err ? "warn" : "neutral"} />
            )}
          </div>
        </div>

        <div className="flex flex-col items-start gap-1 text-[11px] text-ui-faint md:items-end">
          <div>
            Window: <span className="font-mono text-ui-muted">{props.start}</span> →{" "}
            <span className="font-mono text-ui-muted">{series?.end ?? props.end ?? "—"}</span>
          </div>
          <div>
            As-of: <span className="font-mono text-ui-muted">{series?.freshness?.asof ?? "—"}</span>{" "}
            <span className="text-ui-faint">(lag {series?.freshness?.lag_days ?? "—"}d)</span>
          </div>
          <div>
            Coverage:{" "}
            <span className="font-mono text-ui-muted">
              {series ? `${series.coverage.present_days}/${series.coverage.expected_days}` : "—"}
            </span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="mt-4 rounded-2xl border border-ui-border bg-ui-bg/15 p-4 text-sm text-ui-muted">Loading metric…</div>
      ) : err ? (
        <div className="mt-4 rounded-2xl border border-ui-border bg-[rgb(var(--bad)/0.10)] p-4 text-sm text-ui-text">
          <div className="font-semibold text-[rgb(var(--bad)/0.95)]">Blocked: documentation guardrail</div>
          <div className="mt-2 text-ui-muted">{err}</div>
          <div className="mt-2 text-xs text-ui-faint">
            Add this metric to the catalog documentation before exposing it publicly.
          </div>
        </div>
      ) : props.hideIfLowCoverage && isLowCoverage ? (
        <div className="mt-4 rounded-2xl border border-ui-border bg-ui-bg/15 p-4">
          <div className="text-sm font-semibold text-ui-text">Hidden due to insufficient coverage</div>
          <div className="mt-2 text-xs text-ui-muted">
            This metric is hidden because the selected window has{" "}
            <span className="font-mono text-ui-text">{((nonNull ?? 0) * 100).toFixed(1)}%</span> non-null values
            (threshold: <span className="font-mono text-ui-text">70%</span>). Missing days are not interpolated.
          </div>
          <div className="mt-2 text-xs text-ui-muted">
            See:{" "}
            <a className="underline underline-offset-4 hover:text-ui-text" href="/notables#data-quality">
              Notables policy (data quality)
            </a>
          </div>
        </div>
      ) : (
        <>
          {/* Persistent vs transient regime context (web2) */}
          <div
            className={`mt-4 rounded-2xl border border-ui-border p-4 ${
              regime.tone === "warn" ? "bg-[rgb(var(--bad)/0.10)]" : "bg-ui-bg/15"
            }`}
          >
            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="text-[11px] uppercase tracking-wide text-ui-faint">Regime context</div>
                <div className="mt-1 text-sm font-semibold text-ui-text">{regime.headline}</div>
                <div className="mt-1 text-sm text-ui-muted">{regime.detail}</div>
                <div className="mt-2 text-xs text-ui-faint">
                  Based on MA7 vs MA30 divergence (short-term regime vs structural baseline). Descriptive only.
                </div>
              </div>

              <div className="mt-2 flex shrink-0 flex-wrap gap-2 md:mt-0 md:justify-end">
                <Chip label="MA7 vs MA30" value={regimeBadge} tone={regime.tone === "warn" ? "warn" : "neutral"} />
                {regime.streakDays != null ? (
                  <Chip
                    label="streak"
                    value={regime.kind === "near" ? "—" : `${regime.streakDays}d`}
                    tone={regime.tone === "warn" ? "warn" : "neutral"}
                  />
                ) : null}
              </div>
            </div>
          </div>

          {/* Taller chart (web2 readability) */}
          <div className="mt-4 h-[320px] w-full">
            <MetricTriLineChart data={triData} height={320} />
          </div>

          {/* Context tiles */}
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
            <div className="rounded-2xl border border-ui-border bg-ui-bg/15 p-3">
              <div className="text-[11px] uppercase tracking-wide text-ui-faint">Latest</div>
              <div className="mt-1 text-sm font-semibold text-ui-text tabular-nums">{fmtCompact(summary?.current?.daily)}</div>
              <div className="mt-1 text-[11px] text-ui-faint">Observed latest day (can be noisy).</div>
            </div>

            <div className="rounded-2xl border border-ui-border bg-ui-bg/15 p-3">
              <div className="text-[11px] uppercase tracking-wide text-ui-faint">MA7</div>
              <div className="mt-1 text-sm font-semibold text-ui-text tabular-nums">{fmtCompact(summary?.current?.ma7)}</div>
              <div className="mt-1 text-[11px] text-ui-faint">Short-term baseline (last week).</div>
            </div>

            <div className="rounded-2xl border border-ui-border bg-ui-bg/15 p-3">
              <div className="text-[11px] uppercase tracking-wide text-ui-faint">MA30</div>
              <div className="mt-1 text-sm font-semibold text-ui-text tabular-nums">{fmtCompact(summary?.current?.ma30)}</div>
              <div className="mt-1 text-[11px] text-ui-faint">Structural baseline (last month).</div>
            </div>

            <div className="rounded-2xl border border-ui-border bg-ui-bg/15 p-3">
              <div className="text-[11px] uppercase tracking-wide text-ui-faint">Percentile (historical)</div>
              <div className="mt-1 text-sm font-semibold text-ui-text tabular-nums">{pctInt == null ? "—" : `${pctInt}%`}</div>
              <div className="mt-1 text-[11px] text-ui-faint">Where today ranks in this window.</div>
            </div>

            <div className="rounded-2xl border border-ui-border bg-ui-bg/15 p-3">
              <div className="text-[11px] uppercase tracking-wide text-ui-faint">Z-score (context)</div>
              <div className="mt-1 text-sm font-semibold text-ui-text tabular-nums">{fmtZ(zLatest)}</div>
              <div className="mt-1 text-[11px] text-ui-faint">{zText ?? "Standardized distance from mean."}</div>
            </div>
          </div>

          {/* Percentile explanation */}
          <div className="mt-4 rounded-2xl border border-ui-border bg-ui-bg/15 p-4">
            <div className="text-[11px] uppercase tracking-wide text-ui-faint">What “percentile” means</div>
            <div className="mt-2 text-sm">
              <PercentileCopy p={pctInt} />
            </div>

            <details className="mt-3 rounded-2xl border border-ui-border bg-ui-bg/10 p-3">
              <summary className="cursor-pointer select-none text-xs font-semibold text-ui-text">Advanced definition</summary>
              <div className="mt-2 text-xs text-ui-muted leading-relaxed">
                Percentile ranks today’s <span className="text-ui-text">daily</span> value among{" "}
                <span className="text-ui-text">non-null daily</span> values in the selected window. It is distribution context —{" "}
                <span className="text-ui-text">not a forecast</span>.
              </div>
            </details>
          </div>

          {/* Z-score explanation */}
          <div className="mt-3 rounded-2xl border border-ui-border bg-ui-bg/15 p-4">
            <div className="text-[11px] uppercase tracking-wide text-ui-faint">What “z-score” means</div>
            <div className="mt-2 text-sm text-ui-muted">
              Z-score tells you how far today is from the window’s average in <span className="text-ui-text">standard deviation units</span>.
              <span className="ml-2 text-ui-faint">Rule of thumb: |z|≈1 typical, |z|≈2 unusual, |z|≥3 rare.</span>
            </div>

            <details className="mt-3 rounded-2xl border border-ui-border bg-ui-bg/10 p-3">
              <summary className="cursor-pointer select-none text-xs font-semibold text-ui-text">Advanced definition</summary>
              <div className="mt-2 text-xs text-ui-muted leading-relaxed">
                z = (x − μ) / σ, where x is today’s daily value, μ is the mean of non-null daily values in the selected window,
                and σ is the standard deviation. If σ is ~0 or sample is too small, z is null. This is context, not causality or prediction.
              </div>
            </details>
          </div>

          {/* Interpretation */}
          <div className="mt-4 rounded-2xl border border-ui-border bg-ui-bg/15 p-4">
            <div className="text-[11px] uppercase tracking-wide text-ui-faint">Basic</div>
            <div className="mt-2 text-sm text-ui-text">{summary?.interpretation?.basic ?? "—"}</div>

            <details className="mt-3 rounded-2xl border border-ui-border bg-ui-bg/10 p-3">
              <summary className="cursor-pointer select-none text-xs font-semibold text-ui-text">Advanced details</summary>
              <div className="mt-2 space-y-1 text-xs text-ui-muted">
                {(summary?.interpretation?.advanced ?? []).map((b, i) => (
                  <div key={i} className="leading-relaxed">
                    • {b}
                  </div>
                ))}

                {(summary?.caveats?.length ?? 0) > 0 ? (
                  <div className="mt-3 rounded-2xl border border-ui-border bg-ui-bg/10 p-3">
                    <div className="text-[11px] uppercase tracking-wide text-ui-faint">Data notes</div>
                    <div className="mt-2 space-y-1">
                      {summary!.caveats.map((c, i) => (
                        <div key={i}>- {c}</div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </details>
          </div>

          {/* Links */}
          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-ui-faint">
            <a className="underline underline-offset-2 hover:text-ui-text" href={methodologyHref}>
              Methodology
            </a>
            <a className="underline underline-offset-2 hover:text-ui-text" href={wikiHref}>
              Wiki
            </a>

            {rawGoldDailyHref ? (
              <a className="underline underline-offset-2 hover:text-ui-text" href={rawGoldDailyHref} target="_blank" rel="noreferrer">
                Raw gold (daily)
              </a>
            ) : null}
            {rawDerivedDailyHref ? (
              <a className="underline underline-offset-2 hover:text-ui-text" href={rawDerivedDailyHref} target="_blank" rel="noreferrer">
                Raw derived (daily)
              </a>
            ) : null}
            {rawMetaDailyHref ? (
              <a className="underline underline-offset-2 hover:text-ui-text" href={rawMetaDailyHref} target="_blank" rel="noreferrer">
                Raw meta (daily)
              </a>
            ) : null}

            <a className="underline underline-offset-2 hover:text-ui-text" href={rawGoldWindowHref} target="_blank" rel="noreferrer">
              Raw gold (last365d)
            </a>
            <a className="underline underline-offset-2 hover:text-ui-text" href={rawDerivedWindowHref} target="_blank" rel="noreferrer">
              Raw derived (last365d)
            </a>
            <a className="underline underline-offset-2 hover:text-ui-text" href={rawMetaWindowHref} target="_blank" rel="noreferrer">
              Raw meta (last365d)
            </a>

            <a className="underline underline-offset-2 hover:text-ui-text" href={rawGoldManifestHref} target="_blank" rel="noreferrer">
              Manifest (gold)
            </a>
            <a className="underline underline-offset-2 hover:text-ui-text" href={rawDerivedManifestHref} target="_blank" rel="noreferrer">
              Manifest (derived)
            </a>
            <a className="underline underline-offset-2 hover:text-ui-text" href={rawMetaManifestHref} target="_blank" rel="noreferrer">
              Manifest (meta)
            </a>

            <span className="ml-auto text-[11px] text-ui-faint">
              dataset: <span className="font-mono text-ui-muted">{series?.dataset_id ?? "—"}</span> / rev:{" "}
              <span className="font-mono text-ui-muted">{series?.revision_id ?? "—"}</span>
            </span>
          </div>
        </>
      )}
    </div>
  );
}