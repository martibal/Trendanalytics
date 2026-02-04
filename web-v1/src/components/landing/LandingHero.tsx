"use client";

import React from "react";
import Link from "next/link";
import useSWR from "swr";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

import { fetchJsonLenient } from "@/lib/fetchJson";

/**
 * Published contract (pipeline -> web):
 * - /data/published/v1/landing/index.json
 * - /data/published/v1/landing/<chain>/hero.json
 * - /data/published/v1/<genre>/<chain>/lastXd.json (gold windows)
 */

type LandingIndex = {
  dataset_id: string;
  revision_id: number;
  computed_at_utc: string;
  chains: string[];
  genres: string[];
  windows_supported: number[];
  cards: Array<{
    chain: string;
    hero_file: string; // e.g. "landing/ethereum/hero.json"
    asof: Record<string, string>;
  }>;
  schema_version: string;
};

type HeroChartSpec = {
  id: string;
  title: string;
  genre: "gold" | "meta" | "derived";
  window_days: number; // usually 90 for landing
  x: string; // "date"
  y: string; // e.g. "tx_count_daily"
  format?: "int" | "float" | "pct";
  hint_basic?: string;
  hint_advanced?: string;
  source_file: string | null; // e.g. "gold/ethereum/last90d.json"
};

type LandingHeroFile = {
  dataset_id: string;
  revision_id: number;
  computed_at_utc: string;
  chain: string;
  windows_supported: number[];
  asof: Record<string, string>;
  files: Record<
    string,
    {
      manifest: string | null;
      latest: string | null;
      windows: Record<string, string>; // keys are "7","30","90","180","365" -> paths
    }
  >;
  hero: {
    headline: string;
    charts: HeroChartSpec[];
    notes: string[];
  };
};

type Row = Record<string, any> & { date: string };

type Point = Row & {
  __y: number | null;
  __sma7: number | null;
  __sma30: number | null;
};

const PUBLISHED_BASE = "/data/published/v1";

const fetcher = async (url: string) => {
  const r: any = await fetchJsonLenient(url);
  if (r && typeof r === "object") {
    if (r.error) throw new Error(typeof r.error === "string" ? r.error : JSON.stringify(r.error));
    if (r.data !== undefined) return r.data;
  }
  return r;
};

// ---------- helpers ----------

function toNumberOrNull(x: any): number | null {
  if (typeof x === "number" && Number.isFinite(x)) return x;
  if (typeof x === "string") {
    const n = Number(x);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function sortByDateAsc(rows: Row[]): Row[] {
  // date is "YYYY-MM-DD" so lexical sort works, but we still do explicit.
  return [...rows].sort((a, b) => String(a.date).localeCompare(String(b.date)));
}

/**
 * Strict SMA: requires full window; returns null until i >= window-1.
 * (We will supply pre-history from a longer context file so viewport doesn't start with nulls.)
 */
function smaStrict(values: Array<number | null>, window: number): Array<number | null> {
  const out = new Array<number | null>(values.length).fill(null);
  let sum = 0;
  let valid = 0;

  // rolling queue of last `window` values
  const q: Array<number | null> = [];

  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    q.push(v);
    if (v !== null) {
      sum += v;
      valid += 1;
    }

    if (q.length > window) {
      const removed = q.shift()!;
      if (removed !== null) {
        sum -= removed;
        valid -= 1;
      }
    }

    if (q.length === window) {
      // If any nulls, we still compute mean of available values inside the window,
      // but if everything is null, keep null.
      out[i] = valid > 0 ? sum / valid : null;
    }
  }

  return out;
}

/**
 * Build SMA maps from a long context series, then attach to viewport rows by date.
 */
function buildSeriesWithContext(params: {
  viewportRows: Row[];
  contextRows: Row[];
  yKey: string;
}): Point[] {
  const viewport = sortByDateAsc(params.viewportRows);
  const context = sortByDateAsc(params.contextRows);

  if (viewport.length === 0) return [];

  const ys = context.map((r) => toNumberOrNull(r[params.yKey]));
  const sma7 = smaStrict(ys, 7);
  const sma30 = smaStrict(ys, 30);

  // date -> sma
  const m7 = new Map<string, number | null>();
  const m30 = new Map<string, number | null>();
  for (let i = 0; i < context.length; i++) {
    const d = String(context[i].date);
    m7.set(d, sma7[i]);
    m30.set(d, sma30[i]);
  }

  return viewport.map((r) => {
    const d = String(r.date);
    const y = toNumberOrNull(r[params.yKey]);
    return {
      ...r,
      __y: y,
      __sma7: m7.has(d) ? (m7.get(d) ?? null) : null,
      __sma30: m30.has(d) ? (m30.get(d) ?? null) : null,
    };
  });
}

function formatCompact(n: number | null, mode: "int" | "float" | "pct" | undefined): string {
  if (n === null || !Number.isFinite(n)) return "—";
  if (mode === "pct") return `${(n * 100).toFixed(2)}%`;
  if (mode === "int") return Math.round(n).toLocaleString();

  const abs = Math.abs(n);
  if (abs >= 1000) return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (abs >= 1) return n.toLocaleString(undefined, { maximumFractionDigits: 6 });
  return n.toPrecision(6);
}

function capitalize(s: string): string {
  if (!s) return s;
  return s.slice(0, 1).toUpperCase() + s.slice(1);
}

// ---------- child component (safe to use hooks) ----------

function ChainCard(props: {
  chain: string;
  hero: LandingHeroFile;
  chart: HeroChartSpec | undefined;
  sourcesByPath: Record<string, any> | undefined;
}) {
  const { chain, hero, chart, sourcesByPath } = props;
  const [viewportDays, setViewportDays] = React.useState<90 | 365>(90);

  // Choose viewport source:
  // - Prefer gold windows from hero.files (authoritative)
  // - Fallback to chart.source_file
  const goldWindows = hero.files?.gold?.windows || {};
  const viewportRel =
    (viewportDays === 90 ? goldWindows["90"] : goldWindows["365"]) || chart?.source_file || null;

  // Choose context source for SMA warm-up:
  // - Prefer gold/last365d if available
  // - Else fallback to viewport
  const contextRel = goldWindows["365"] || viewportRel;

  const viewportRaw = viewportRel ? sourcesByPath?.[viewportRel] : null;
  const contextRaw = contextRel ? sourcesByPath?.[contextRel] : null;

  const viewportRows: Row[] = Array.isArray(viewportRaw) ? (viewportRaw as Row[]) : [];
  const contextRows: Row[] = Array.isArray(contextRaw) ? (contextRaw as Row[]) : [];

  const yKey = chart?.y;
  const xKey = chart?.x || "date";

  const series = React.useMemo(() => {
    if (!yKey) return [];
    if (viewportRows.length === 0) return [];
    // If context is missing, degrade gracefully to viewport-only SMA
    const ctx = contextRows.length > 0 ? contextRows : viewportRows;
    return buildSeriesWithContext({ viewportRows, contextRows: ctx, yKey });
  }, [yKey, viewportRows, contextRows]);

  const asofGold = hero.asof?.gold || "";
  const windows = hero.windows_supported?.join(", ") || "";

  const badge = (label: string) => (
    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">{label}</span>
  );

  return (
    <div className="rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.03)]">
      <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div className="min-w-[260px]">
          <div className="text-2xl font-semibold text-white">{capitalize(chain)}</div>
          <div className="mt-1 text-xs text-white/60">
            As-of (gold): {asofGold || "—"} · windows: {windows || "—"}
          </div>

          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setViewportDays(90)}
              className={
                "rounded-xl border px-3 py-2 text-sm " +
                (viewportDays === 90
                  ? "border-white/20 bg-white/10 text-white"
                  : "border-white/10 bg-white/5 text-white/80 hover:bg-white/10")
              }
            >
              90d
            </button>
            <button
              type="button"
              onClick={() => setViewportDays(365)}
              className={
                "rounded-xl border px-3 py-2 text-sm " +
                (viewportDays === 365
                  ? "border-white/20 bg-white/10 text-white"
                  : "border-white/10 bg-white/5 text-white/80 hover:bg-white/10")
              }
            >
              365d
            </button>
          </div>

          <div className="mt-3">
            <Link
              href={`/chains/${chain}`}
              className="inline-flex items-center rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white/90 hover:bg-white/10"
            >
              Open full chain dashboard →
            </Link>
          </div>

          <div className="mt-4 text-xs text-white/55">
            {hero.hero?.notes?.[0] || "Descriptive only (no prices, no forecasts)."}
          </div>

          <div className="mt-4 text-[11px] text-white/40">
            viewport: {viewportRel || "—"}
            <br />
            context: {contextRel || "—"}
          </div>
        </div>

        <div className="flex-1">
          <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-white/60">
                  {capitalize(chain)} · last {viewportDays}d
                </div>
                <div className="mt-1 text-lg font-semibold text-white">{chart?.title || "Signature trend"}</div>
                <div className="mt-1 text-sm text-white/65">{chart?.hint_basic || ""}</div>

                <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-white/70">
                  {badge("Daily")}
                  {badge("SMA 7")}
                  {badge("SMA 30")}
                  {contextRel && contextRel !== viewportRel ? badge("SMA from 365d context") : null}
                </div>
              </div>

              <div className="text-xs text-white/55">window</div>
            </div>

            <div className="mt-3 h-[280px] w-full">
              {series.length === 0 ? (
                <div className="grid h-full place-items-center text-sm text-white/60">
                  Failed to load chart data
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={series} margin={{ left: 8, right: 8, top: 8, bottom: 0 }}>
                    <defs>
                      <linearGradient id={`fill_${chain}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="rgba(217,70,239,0.55)" />
                        <stop offset="100%" stopColor="rgba(217,70,239,0.02)" />
                      </linearGradient>
                      <linearGradient id={`fillWarm_${chain}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="rgba(245,158,11,0.30)" />
                        <stop offset="100%" stopColor="rgba(245,158,11,0.01)" />
                      </linearGradient>
                    </defs>

                    <CartesianGrid strokeDasharray="4 6" opacity={0.12} />
                    <XAxis
                      dataKey={xKey}
                      tickFormatter={(v) => String(v)}
                      stroke="rgba(255,255,255,0.35)"
                      tick={{ fill: "rgba(255,255,255,0.55)", fontSize: 11 }}
                      axisLine={{ stroke: "rgba(255,255,255,0.18)" }}
                      tickLine={{ stroke: "rgba(255,255,255,0.18)" }}
                      minTickGap={18}
                    />
                    <YAxis
                      stroke="rgba(255,255,255,0.35)"
                      tick={{ fill: "rgba(255,255,255,0.55)", fontSize: 11 }}
                      axisLine={{ stroke: "rgba(255,255,255,0.18)" }}
                      tickLine={{ stroke: "rgba(255,255,255,0.18)" }}
                      tickFormatter={(v) => formatCompact(Number(v), chart?.format)}
                    />

                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload || payload.length === 0) return null;
                        const p = payload[0]?.payload as any;

                        const daily = toNumberOrNull(p.__y);
                        const sma7 = toNumberOrNull(p.__sma7);
                        const sma30 = toNumberOrNull(p.__sma30);

                        return (
                          <div className="rounded-xl border border-white/10 bg-black/80 p-3 text-xs text-white/90 backdrop-blur">
                            <div className="text-white/70">{String(label)}</div>
                            <div className="mt-2 space-y-1">
                              <div className="flex justify-between gap-6">
                                <span className="text-white/70">Daily</span>
                                <span>{formatCompact(daily, chart?.format)}</span>
                              </div>
                              <div className="flex justify-between gap-6">
                                <span className="text-white/70">SMA 7</span>
                                <span>{formatCompact(sma7, chart?.format)}</span>
                              </div>
                              <div className="flex justify-between gap-6">
                                <span className="text-white/70">SMA 30</span>
                                <span>{formatCompact(sma30, chart?.format)}</span>
                              </div>
                            </div>
                          </div>
                        );
                      }}
                    />

                    {/* Daily (filled, signature) */}
                    <Area
                      type="monotone"
                      dataKey="__y"
                      stroke="rgba(217,70,239,0.95)"
                      strokeWidth={2.2}
                      fill={`url(#fill_${chain})`}
                      dot={false}
                      isAnimationActive={false}
                    />

                    {/* SMA 7 */}
                    <Area
                      type="monotone"
                      dataKey="__sma7"
                      stroke="rgba(245,158,11,0.95)"
                      strokeWidth={2.2}
                      fill="rgba(0,0,0,0)"
                      dot={false}
                      isAnimationActive={false}
                    />

                    {/* SMA 30 */}
                    <Area
                      type="monotone"
                      dataKey="__sma30"
                      stroke="rgba(59,130,246,0.90)"
                      strokeWidth={2.2}
                      fill="rgba(0,0,0,0)"
                      dot={false}
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="mt-2 text-xs text-white/50">Hover to inspect exact values.</div>
          </div>

          <div className="mt-3 text-xs text-white/55">
            {hero.hero?.headline || "Network activity & execution conditions"}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- main component ----------

export function LandingHero() {
  const {
    data: landingIndex,
    error: landingIndexErr,
    isLoading: landingIndexLoading,
  } = useSWR<LandingIndex>(`${PUBLISHED_BASE}/landing/index.json`, fetcher, {
    revalidateOnFocus: false,
  });

  const heroKey = landingIndex ? ["landing-heroes", landingIndex.dataset_id, landingIndex.revision_id] : null;

  const {
    data: heroesByChain,
    error: heroesErr,
    isLoading: heroesLoading,
  } = useSWR<Record<string, LandingHeroFile>>(
    heroKey as any,
    async () => {
      const idx = landingIndex!;
      const pairs = await Promise.all(
        (idx.cards || []).map(async (c) => {
          const heroUrl = `${PUBLISHED_BASE}/${c.hero_file}`;
          const hero = (await fetcher(heroUrl)) as LandingHeroFile;
          return [c.chain, hero] as const;
        })
      );
      return Object.fromEntries(pairs);
    },
    { revalidateOnFocus: false }
  );

  // Bulk-fetch all required sources:
  // - any hero chart source_file
  // - PLUS gold windows 90 and 365 for SMA warm-up + viewport toggles
  const sourcesKey =
    heroesByChain && landingIndex
      ? ["landing-sources", landingIndex.dataset_id, landingIndex.revision_id]
      : null;

  const {
    data: sourcesByPath,
    error: sourcesErr,
    isLoading: sourcesLoading,
  } = useSWR<Record<string, any>>(
    sourcesKey as any,
    async () => {
      const heroes = heroesByChain!;
      const uniq = new Set<string>();

      Object.values(heroes).forEach((h) => {
        // chart sources
        (h.hero?.charts || []).forEach((ch) => {
          if (ch.source_file) uniq.add(ch.source_file);
        });

        // gold windows for viewport + SMA context
        const gw = h.files?.gold?.windows || {};
        if (gw["90"]) uniq.add(gw["90"]);
        if (gw["365"]) uniq.add(gw["365"]);
      });

      const entries = await Promise.all(
        Array.from(uniq).map(async (rel) => {
          const url = `${PUBLISHED_BASE}/${rel}`;
          const data = await fetcher(url);
          return [rel, data] as const;
        })
      );

      return Object.fromEntries(entries);
    },
    { revalidateOnFocus: false }
  );

  const anyError = landingIndexErr || heroesErr || sourcesErr;

  if (landingIndexLoading || heroesLoading || sourcesLoading) {
    return (
      <div className="w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
        Loading landing…
      </div>
    );
  }

  if (anyError || !landingIndex || !heroesByChain) {
    const msg =
      (anyError as any)?.message ||
      "Failed to load landing index/hero files. Verify published dataset exists under web public folder.";
    return (
      <div className="w-full rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
        {msg}
      </div>
    );
  }

  const chains = landingIndex.chains || [];

  return (
    <div className="space-y-8">
      {/* Premium header slab */}
      <div className="rounded-[28px] border border-white/10 bg-gradient-to-r from-fuchsia-500/15 via-white/5 to-cyan-500/15 p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.03)]">
        <div className="text-xs text-white/60">
          Dataset: {landingIndex.dataset_id} · Revision: {landingIndex.revision_id}
        </div>
        <div className="mt-2 text-3xl font-semibold text-white">
          Chain diagnostics built for context — not price spikes.
        </div>
        <div className="mt-2 max-w-3xl text-sm text-white/70">
          First impression stays tight, but the lines are computed using long-history context so SMA signals don’t “start late”.
          Click a chain to open full diagnostics (gold/meta/derived).
        </div>
      </div>

      <div className="grid gap-6">
        {chains.map((chain) => {
          const hero = heroesByChain[chain];
          if (!hero) return null;

          const chart = (hero.hero?.charts || [])[0]; // keep landing tight: 1 signature metric per chain
          return (
            <ChainCard
              key={chain}
              chain={chain}
              hero={hero}
              chart={chart}
              sourcesByPath={sourcesByPath}
            />
          );
        })}
      </div>
    </div>
  );
}

export default LandingHero;