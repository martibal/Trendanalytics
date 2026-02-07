"use client";

import React, { useEffect, useMemo, useState } from "react";
import { MetricTriLineChart } from "@/components/charts/MetricTriLineChart";

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
  }, [seriesUrl, summaryUrl]);

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

  const title = props.title ?? toTitle(props.metric);
  const subtitle = props.subtitle ?? "Daily, MA7, MA30 with deterministic context (no prices).";

  const nonNull = series?.coverage?.nonNull_ratio ?? null;
  const isLowCoverage = nonNull !== null && nonNull < 0.7;
  const missingCount = series?.coverage?.missing_days?.length ?? 0;

  const methodologyHref = props.methodologyHref ?? `/methodology#${props.chain}-${props.metric}`;
  const wikiHref = props.wikiHref ?? `/wiki#${props.metric}`;

  const latestDate = series?.rows?.length ? series.rows[series.rows.length - 1]?.date : null;

  // Raw exports (daily + window + manifest)
  const rawGoldDailyHref =
    latestDate ? buildUrl("/api/export/daily", { chain: props.chain, genre: "gold", date: latestDate }) : null;
  const rawDerivedDailyHref =
    latestDate ? buildUrl("/api/export/daily", { chain: props.chain, genre: "derived", date: latestDate }) : null;
  const rawMetaDailyHref =
    latestDate ? buildUrl("/api/export/daily", { chain: props.chain, genre: "meta", date: latestDate }) : null;

  const rawGoldWindowHref = buildUrl("/api/export/window", { chain: props.chain, genre: "gold", window: "365" });
  const rawDerivedWindowHref = buildUrl("/api/export/window", { chain: props.chain, genre: "derived", window: "365" });
  const rawMetaWindowHref = buildUrl("/api/export/window", { chain: props.chain, genre: "meta", window: "365" });

  const rawGoldManifestHref = buildUrl("/api/export/manifest", { chain: props.chain, genre: "gold" });
  const rawDerivedManifestHref = buildUrl("/api/export/manifest", { chain: props.chain, genre: "derived" });
  const rawMetaManifestHref = buildUrl("/api/export/manifest", { chain: props.chain, genre: "meta" });

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-sm backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-white">{title}</div>
          <div className="mt-0.5 text-xs text-white/60">{subtitle}</div>

          <div className="mt-3 flex flex-wrap gap-2">
            {missingCount > 0 ? (
              <Chip label="missing days" value={`${missingCount}`} tone="warn" />
            ) : (
              <Chip label="missing days" value="0" />
            )}

            {nonNull !== null ? (
              <Chip label="non-null" value={`${(nonNull * 100).toFixed(1)}%`} tone={isLowCoverage ? "warn" : "neutral"} />
            ) : (
              <Chip label="non-null" value="—" />
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-1 text-[11px] text-white/60">
          <div>
            Window: <span className="text-white/80 tabular-nums">{props.start}</span> →{" "}
            <span className="text-white/80 tabular-nums">{series?.end ?? "—"}</span>
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
        <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-white/70">
          Loading metric…
        </div>
      ) : err ? (
        <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          Failed to load: {err}
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
          <div className="mt-4 h-[240px] w-full">
            <MetricTriLineChart data={triData} />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-xl border border-white/10 bg-black/20 p-3">
              <div className="text-[11px] uppercase tracking-wide text-white/50">Latest</div>
              <div className="mt-1 text-sm font-semibold text-white tabular-nums">{fmtCompact(summary?.current?.daily)}</div>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/20 p-3">
              <div className="text-[11px] uppercase tracking-wide text-white/50">MA7</div>
              <div className="mt-1 text-sm font-semibold text-white tabular-nums">{fmtCompact(summary?.current?.ma7)}</div>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/20 p-3">
              <div className="text-[11px] uppercase tracking-wide text-white/50">MA30</div>
              <div className="mt-1 text-sm font-semibold text-white tabular-nums">{fmtCompact(summary?.current?.ma30)}</div>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/20 p-3">
              <div className="text-[11px] uppercase tracking-wide text-white/50">Context</div>
              <div className="mt-1 text-sm font-semibold text-white">
                {summary ? `${summary.level.label} · ${summary.trend.strength} ${summary.trend.label}` : "—"}
              </div>
            </div>
          </div>

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