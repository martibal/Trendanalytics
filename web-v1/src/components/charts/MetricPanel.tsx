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
      ? "border-amber-400/25 bg-amber-400/10 text-amber-100"
      : "border-white/10 bg-black/20 text-white/80";

  return (
    <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] ${cls}`}>
      <span className="text-white/60">{props.label}</span>
      <span className="font-mono tabular-nums">{props.value}</span>
    </div>
  );
}

function PercentileCopy({ p }: { p: number | null | undefined }) {
  if (p == null || !Number.isFinite(p)) return <span>—</span>;
  const pct = Math.max(0, Math.min(100, Math.round(p)));
  const below = 100 - pct;
  return (
    <span className="text-white/70">
      Today ranks in the <span className="font-semibold text-white">{pct}th</span> percentile{" "}
      <span className="text-white/60">(lower than ~{below}% of days in this window)</span>.
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
  const subtitle = props.subtitle ?? (metricEntry ? metricEntry.doc.why.basic : "Undocumented metric (no catalog entry).");

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

  const zLatest = (zFromSeries != null && Number.isFinite(zFromSeries)) ? zFromSeries : zFallback;
  const zText = zLabel(zLatest);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-sm backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-white">{title}</div>
          <div className="mt-0.5 text-xs text-white/60">{subtitle}</div>

          <div className="mt-3 flex flex-wrap gap-2">
            {missingCount > 0 ? <Chip label="missing days" value={`${missingCount}`} tone="warn" /> : <Chip label="missing days" value="0" />}

            {nonNull !== null ? (
              <Chip label="non-null" value={`${(nonNull * 100).toFixed(1)}%`} tone={isLowCoverage ? "warn" : "neutral"} />
            ) : (
              <Chip label="non-null" value="—" tone={err ? "warn" : "neutral"} />
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-1 text-[11px] text-white/60">
          <div>
            Window: <span className="text-white/80 tabular-nums">{props.start}</span> →{" "}
            <span className="text-white/80 tabular-nums">{series?.end ?? props.end ?? "—"}</span>
          </div>
          <div>
            As-of: <span className="text-white/80 tabular-nums">{series?.freshness?.asof ?? "—"}</span>{" "}
            <span className="text-white/50">(lag {series?.freshness?.lag_days ?? "—"}d)</span>
          </div>
          <div>
            Coverage:{" "}
            <span className="text-white/80 tabular-nums">
              {series ? `${series.coverage.present_days}/${series.coverage.expected_days}` : "—"}
            </span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-white/70">Loading metric…</div>
      ) : err ? (
        <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          {err}
          <div className="mt-2 text-xs text-red-200/80">
            This metric is blocked by the documentation guardrail. Add it to <span className="font-mono">METRIC_CATALOG</span> before exposing it.
          </div>
        </div>
      ) : props.hideIfLowCoverage && isLowCoverage ? (
        <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4">
          <div className="text-sm font-semibold text-white">Hidden due to insufficient coverage</div>
          <div className="mt-2 text-xs text-white/60">
            This metric is hidden because the selected window has{" "}
            <span className="font-mono text-white/75">{((nonNull ?? 0) * 100).toFixed(1)}%</span> non-null values
            (threshold: <span className="font-mono text-white/75">70%</span>). Missing days are not interpolated.
          </div>
          <div className="mt-2 text-xs text-white/60">
            See:{" "}
            <a className="underline underline-offset-4 hover:text-white" href="/notables#data-quality">
              Notables policy (data quality)
            </a>
          </div>
        </div>
      ) : (
        <>
          {/* Taller chart (was 240px) */}
          <div className="mt-4 h-[320px] w-full">
            <MetricTriLineChart data={triData} height={320} />
          </div>

          {/* Context tiles (now 5, responsive) */}
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
            <div className="rounded-xl border border-white/10 bg-black/20 p-3">
              <div className="text-[11px] uppercase tracking-wide text-white/50">Latest</div>
              <div className="mt-1 text-sm font-semibold text-white tabular-nums">{fmtCompact(summary?.current?.daily)}</div>
              <div className="mt-1 text-[11px] text-white/55">Observed latest day (can be noisy).</div>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/20 p-3">
              <div className="text-[11px] uppercase tracking-wide text-white/50">MA7</div>
              <div className="mt-1 text-sm font-semibold text-white tabular-nums">{fmtCompact(summary?.current?.ma7)}</div>
              <div className="mt-1 text-[11px] text-white/55">Short-term baseline (last week).</div>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/20 p-3">
              <div className="text-[11px] uppercase tracking-wide text-white/50">MA30</div>
              <div className="mt-1 text-sm font-semibold text-white tabular-nums">{fmtCompact(summary?.current?.ma30)}</div>
              <div className="mt-1 text-[11px] text-white/55">Structural baseline (last month).</div>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/20 p-3">
              <div className="text-[11px] uppercase tracking-wide text-white/50">Percentile (historical)</div>
              <div className="mt-1 text-sm font-semibold text-white tabular-nums">{pctInt == null ? "—" : `${pctInt}%`}</div>
              <div className="mt-1 text-[11px] text-white/55">Where today ranks in this window.</div>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/20 p-3">
              <div className="text-[11px] uppercase tracking-wide text-white/50">Z-score (context)</div>
              <div className="mt-1 text-sm font-semibold text-white tabular-nums">{fmtZ(zLatest)}</div>
              <div className="mt-1 text-[11px] text-white/55">{zText ?? "Standardized distance from mean."}</div>
            </div>
          </div>

          {/* Percentile explanation */}
          <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3">
            <div className="text-[11px] uppercase tracking-wide text-white/50">What “percentile” means</div>
            <div className="mt-1 text-sm">
              <PercentileCopy p={pctInt} />
            </div>

            <details className="mt-3">
              <summary className="cursor-pointer select-none text-xs font-semibold text-white/80">
                Advanced definition
              </summary>
              <div className="mt-2 text-xs text-white/70 leading-relaxed">
                Percentile ranks today’s <span className="text-white/85">daily</span> value among{" "}
                <span className="text-white/85">non-null daily</span> values in the selected window. It is distribution context —{" "}
                <span className="text-white/85">not a forecast</span>.
              </div>
            </details>
          </div>

          {/* Z-score explanation */}
          <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3">
            <div className="text-[11px] uppercase tracking-wide text-white/50">What “z-score” means</div>
            <div className="mt-1 text-sm text-white/70">
              Z-score tells you how far today is from the window’s average in <span className="text-white/85">standard deviation units</span>.
              <span className="ml-2 text-white/60">Rule of thumb: |z|≈1 typical, |z|≈2 unusual, |z|≥3 rare.</span>
            </div>

            <details className="mt-3">
              <summary className="cursor-pointer select-none text-xs font-semibold text-white/80">
                Advanced definition
              </summary>
              <div className="mt-2 text-xs text-white/70 leading-relaxed">
                z = (x − μ) / σ, where x is today’s daily value, μ is the mean of non-null daily values in the selected window,
                and σ is the standard deviation. If σ is ~0 or sample is too small, z is null. This is context, not causality or prediction.
              </div>
            </details>
          </div>

          {/* Interpretation */}
          <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3">
            <div className="text-[11px] uppercase tracking-wide text-white/50">Basic</div>
            <div className="mt-1 text-sm text-white/85">{summary?.interpretation?.basic ?? "—"}</div>

            <details className="mt-3">
              <summary className="cursor-pointer select-none text-xs font-semibold text-white/80">Advanced details</summary>
              <div className="mt-2 space-y-1 text-xs text-white/70">
                {(summary?.interpretation?.advanced ?? []).map((b, i) => (
                  <div key={i} className="leading-relaxed">
                    • {b}
                  </div>
                ))}

                {(summary?.caveats?.length ?? 0) > 0 ? (
                  <div className="mt-2 rounded-lg border border-white/10 bg-white/5 p-2">
                    <div className="text-[11px] uppercase tracking-wide text-white/50">Data notes</div>
                    <div className="mt-1 space-y-1">
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
          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-white/70">
            <a className="underline underline-offset-2 hover:text-white" href={methodologyHref}>
              Methodology
            </a>
            <a className="underline underline-offset-2 hover:text-white" href={wikiHref}>
              Wiki
            </a>

            {rawGoldDailyHref ? (
              <a className="underline underline-offset-2 hover:text-white" href={rawGoldDailyHref} target="_blank" rel="noreferrer">
                Raw gold (daily)
              </a>
            ) : null}
            {rawDerivedDailyHref ? (
              <a className="underline underline-offset-2 hover:text-white" href={rawDerivedDailyHref} target="_blank" rel="noreferrer">
                Raw derived (daily)
              </a>
            ) : null}
            {rawMetaDailyHref ? (
              <a className="underline underline-offset-2 hover:text-white" href={rawMetaDailyHref} target="_blank" rel="noreferrer">
                Raw meta (daily)
              </a>
            ) : null}

            <a className="underline underline-offset-2 hover:text-white" href={rawGoldWindowHref} target="_blank" rel="noreferrer">
              Raw gold (last365d)
            </a>
            <a className="underline underline-offset-2 hover:text-white" href={rawDerivedWindowHref} target="_blank" rel="noreferrer">
              Raw derived (last365d)
            </a>
            <a className="underline underline-offset-2 hover:text-white" href={rawMetaWindowHref} target="_blank" rel="noreferrer">
              Raw meta (last365d)
            </a>

            <a className="underline underline-offset-2 hover:text-white" href={rawGoldManifestHref} target="_blank" rel="noreferrer">
              Manifest (gold)
            </a>
            <a className="underline underline-offset-2 hover:text-white" href={rawDerivedManifestHref} target="_blank" rel="noreferrer">
              Manifest (derived)
            </a>
            <a className="underline underline-offset-2 hover:text-white" href={rawMetaManifestHref} target="_blank" rel="noreferrer">
              Manifest (meta)
            </a>

            <span className="ml-auto text-[11px] text-white/50">
              dataset: {series?.dataset_id ?? "—"} / rev: {series?.revision_id ?? "—"}
            </span>
          </div>
        </>
      )}
    </div>
  );
}