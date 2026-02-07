"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MetricTriLineChart } from "@/components/charts/MetricTriLineChart";

type Chain = "bitcoin" | "ethereum" | "arbitrum" | "base";

type ManifestResponse = {
  dataset_id: string | null;
  revision_id: number | string | null;
  chain: Chain;
  genre: "gold" | "meta" | "derived";
  manifest: {
    asof?: string;
    available_days?: string[];
    windows_supported?: number[];
    [k: string]: any;
  };
};

type SeriesRow = {
  date: string;
  daily: number | null;
  ma7: number | null;
  ma30: number | null;
  confidence: number | null;
  z: number | null;
  percentile: number | null;
};

type SeriesResponse = {
  dataset_id: string | null;
  revision_id: number | null;
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
  revision_id: number | null;
  chain: Chain;
  metric: string;
  start: string;
  end: string;
  trend?: { label: "Rising" | "Falling" | "Flat"; strength: "Weak" | "Moderate" | "Strong" };
  volatility?: { label: "Stable" | "Variable" | "Highly variable" };
  level?: { label: "Low" | "Typical" | "Elevated" | "Extreme" };
  caveats?: string[];
  interpretation?: { basic: string; advanced: string[] };
};

type CardState = {
  loading: boolean;
  error: string | null;
  metricUsed: string;
  series: SeriesResponse | null;
  summary: SummaryResponse | null;
  asofResolved: string | null; // used for raw exports + end date
};

const CHAINS: Chain[] = ["bitcoin", "ethereum", "arbitrum", "base"];

function chainName(c: Chain) {
  return c.slice(0, 1).toUpperCase() + c.slice(1);
}

function signatureMetricPrimary(c: Chain): string {
  if (c === "ethereum") return "gas_utilization_pct";
  return "tx_count_daily";
}

function signatureMetricFallback(_c: Chain): string {
  return "tx_count_daily";
}

function isValidISODate(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function toISODateUTC(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function subtractDaysISO(isoEnd: string, days: number): string {
  const [y, m, d] = isoEnd.split("-").map((v) => parseInt(v, 10));
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() - days);
  return toISODateUTC(dt);
}

function lagLabel(chain: Chain, lagDays: number | null): string {
  if (chain === "arbitrum" || chain === "base") return "Delayed feed (≈ 1 week)";
  if (lagDays !== null && lagDays <= 2) return "Near-real-time (daily)";
  if (lagDays !== null) return `Delayed feed (lag ${lagDays}d)`;
  return "Freshness unknown";
}

function fmtPct0to1(x: number | null): string {
  if (x === null || !Number.isFinite(x)) return "—";
  return `${(x * 100).toFixed(0)}%`;
}

function buildUrl(pathname: string, params: Record<string, string>) {
  const sp = new URLSearchParams(params);
  return `${pathname}?${sp.toString()}`;
}

async function fetchJson<T>(url: string): Promise<T> {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`${url} HTTP ${r.status}`);
  return (await r.json()) as T;
}

function resolveAsofFromManifest(man: ManifestResponse): string {
  const asof = man?.manifest?.asof;
  if (typeof asof === "string" && isValidISODate(asof)) return asof;

  const days = man?.manifest?.available_days;
  const last = Array.isArray(days) && days.length ? days[days.length - 1] : null;
  if (typeof last === "string" && isValidISODate(last)) return last;

  return toISODateUTC(new Date());
}

function chipOrDash(v: unknown): string {
  if (typeof v === "string" && v.trim() !== "") return v;
  return "—";
}

export default function LandingHero() {
  const [state, setState] = useState<Record<Chain, CardState>>(() => {
    const init: Record<Chain, CardState> = {
      bitcoin: { loading: true, error: null, metricUsed: signatureMetricPrimary("bitcoin"), series: null, summary: null, asofResolved: null },
      ethereum: { loading: true, error: null, metricUsed: signatureMetricPrimary("ethereum"), series: null, summary: null, asofResolved: null },
      arbitrum: { loading: true, error: null, metricUsed: signatureMetricPrimary("arbitrum"), series: null, summary: null, asofResolved: null },
      base: { loading: true, error: null, metricUsed: signatureMetricPrimary("base"), series: null, summary: null, asofResolved: null },
    };
    return init;
  });

  useEffect(() => {
    let cancelled = false;

    async function loadChain(chain: Chain) {
      const primary = signatureMetricPrimary(chain);
      const fallback = signatureMetricFallback(chain);

      async function getManifestGold() {
        const mUrl = buildUrl("/api/export/manifest", { chain, genre: "gold" });
        return fetchJson<ManifestResponse>(mUrl);
      }

      async function load(metric: string, asof: string) {
        const start = subtractDaysISO(asof, 90);
        const seriesUrl = buildUrl("/api/series", { chain, metric, start, end: asof });
        const summaryUrl = buildUrl("/api/summary", { chain, metric, start, end: asof });

        // If summary fails but series works, we still want charts.
        const [series, summary] = await Promise.all([
          fetchJson<SeriesResponse>(seriesUrl),
          fetchJson<SummaryResponse>(summaryUrl).catch(() => null as any),
        ]);

        return { series, summary: (summary as SummaryResponse | null) ?? null, start, end: asof };
      }

      try {
        const manifest = await getManifestGold();
        const asof = resolveAsofFromManifest(manifest);

        const primaryRes = await load(primary, asof);

        // Ethereum: if signature metric is too sparse, fall back.
        if (chain === "ethereum") {
          const nonNull = primaryRes.series?.coverage?.nonNull_ratio ?? 0;
          if (nonNull < 0.5 && primary !== fallback) {
            const fbRes = await load(fallback, asof);
            if (!cancelled) {
              setState((prev) => ({
                ...prev,
                [chain]: {
                  loading: false,
                  error: null,
                  metricUsed: fallback,
                  series: fbRes.series,
                  summary: fbRes.summary,
                  asofResolved: asof,
                },
              }));
            }
            return;
          }
        }

        if (!cancelled) {
          setState((prev) => ({
            ...prev,
            [chain]: {
              loading: false,
              error: null,
              metricUsed: primary,
              series: primaryRes.series,
              summary: primaryRes.summary,
              asofResolved: asof,
            },
          }));
        }
      } catch (e: any) {
        if (!cancelled) {
          setState((prev) => ({
            ...prev,
            [chain]: {
              ...prev[chain],
              loading: false,
              error: e?.message || "Failed to load",
              series: null,
              summary: null,
              asofResolved: null,
            },
          }));
        }
      }
    }

    for (const c of CHAINS) loadChain(c);

    return () => {
      cancelled = true;
    };
  }, []);

  const cards = useMemo(() => {
    return CHAINS.map((chain) => {
      const s = state[chain];
      const series = s.series;
      const summary = s.summary;

      const latestRow = series?.rows?.length ? series.rows[series.rows.length - 1] : null;
      const confidenceLatest = latestRow?.confidence ?? null;

      const lagDays = series?.freshness?.lag_days ?? null;
      const asof = s.asofResolved ?? series?.freshness?.asof ?? "—";

      const datasetId = series?.dataset_id ?? "—";
      const revisionId = series?.revision_id ?? "—";

      const triData =
        series?.rows?.map((r) => ({
          date: r.date,
          daily: r.daily,
          ma7: r.ma7,
          ma30: r.ma30,
        })) ?? [];

      const topCaveat = summary?.caveats?.[0] ?? null;

      // Robust chips (never blank)
      const chipLevel = chipOrDash(summary?.level?.label);
      const chipTrend = summary?.trend ? `${chipOrDash(summary.trend.label)} · ${chipOrDash(summary.trend.strength)}` : "—";
      const chipStability = chipOrDash(summary?.volatility?.label);

      const basic = summary?.interpretation?.basic ?? "—";
      const note =
        topCaveat ??
        (summary ? null : series ? "Summary not available (chart is still valid)." : null);

      // Raw exports (gold)
      const rawDaily =
        s.asofResolved && s.asofResolved !== "—"
          ? buildUrl("/api/export/daily", { chain, genre: "gold", date: s.asofResolved })
          : null;
      const rawWindow = buildUrl("/api/export/window", { chain, genre: "gold", window: "365" });
      const rawManifest = buildUrl("/api/export/manifest", { chain, genre: "gold" });

      return {
        chain,
        loading: s.loading,
        error: s.error,
        metricUsed: s.metricUsed,
        triData,
        asof,
        lagDays,
        lagText: lagLabel(chain, lagDays),
        confidenceLatest,
        datasetId,
        revisionId,
        chipLevel,
        chipTrend,
        chipStability,
        basic,
        note,
        rawDaily,
        rawWindow,
        rawManifest,
      };
    });
  }, [state]);

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-semibold text-white">Blockchain trend context</h1>
        <p className="text-sm text-white/70">
          Descriptive, price-agnostic analytics across Bitcoin, Ethereum, Arbitrum, and Base. Every metric is auditable (dataset + revision).
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {cards.map((c) => (
          <div key={c.chain} className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-sm backdrop-blur">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-lg font-semibold text-white">{chainName(c.chain)}</div>
                <div className="mt-1 text-xs text-white/60">
                  Signature metric: <span className="text-white/80">{c.metricUsed}</span>
                </div>
              </div>

              <div className="text-right text-[11px] text-white/60">
                <div>
                  as-of <span className="font-mono text-white/80">{c.asof}</span>
                </div>
                <div className="text-white/50">{c.lagText}</div>
                <div className="mt-1 inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-2 py-1">
                  <span className="text-white/60">confidence</span>
                  <span className="font-mono text-white/85">{fmtPct0to1(c.confidenceLatest)}</span>
                </div>
                <div className="mt-1 font-mono text-[10px] text-white/45">
                  {c.datasetId} · rev {c.revisionId}
                </div>
              </div>
            </div>

            {c.loading ? (
              <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/70">Loading…</div>
            ) : c.error ? (
              <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
                Failed to load: {c.error}
              </div>
            ) : (
              <>
                <div className="mt-4 h-[160px] w-full">
                  <MetricTriLineChart data={c.triData} />
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                    <div className="text-[10px] uppercase tracking-wide text-white/50">Level</div>
                    <div className="mt-0.5 text-xs font-semibold text-white">{c.chipLevel}</div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                    <div className="text-[10px] uppercase tracking-wide text-white/50">Trend</div>
                    <div className="mt-0.5 text-xs font-semibold text-white">{c.chipTrend}</div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                    <div className="text-[10px] uppercase tracking-wide text-white/50">Stability</div>
                    <div className="mt-0.5 text-xs font-semibold text-white">{c.chipStability}</div>
                  </div>
                </div>

                <div className="mt-4 text-sm text-white/85">{c.basic}</div>
                {c.note ? <div className="mt-2 text-xs text-white/60">Data notes: {c.note}</div> : null}

                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-white/70">
                  <span className="text-white/50">Raw exports:</span>
                  {c.rawDaily ? (
                    <a className="underline underline-offset-4 hover:text-white" href={c.rawDaily} target="_blank" rel="noreferrer">
                      gold daily (as-of)
                    </a>
                  ) : (
                    <span className="text-white/40">gold daily (as-of)</span>
                  )}
                  <a className="underline underline-offset-4 hover:text-white" href={c.rawWindow} target="_blank" rel="noreferrer">
                    gold last365d
                  </a>
                  <a className="underline underline-offset-4 hover:text-white" href={c.rawManifest} target="_blank" rel="noreferrer">
                    gold manifest
                  </a>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <Link href={`/chains/${c.chain}`} className="text-xs font-semibold text-white underline underline-offset-4 hover:text-white/90">
                    Open chain dashboard →
                  </Link>
                  <div className="text-[10px] text-white/45">No prices · No forecasts · Descriptive only</div>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}