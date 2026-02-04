// src/app/chains/[chain]/ChainClient.tsx
"use client";

import React, { useMemo, useState } from "react";
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

const PUBLISHED_BASE = "/data/published/v1";

type HeroChartSpec = {
  id: string;
  title: string;
  genre: "gold" | "meta" | "derived";
  window_days: number;
  x: string;
  y: string;
  format?: "int" | "float" | "pct";
  hint_basic?: string;
  hint_advanced?: string;
  source_file: string | null;
};

type LandingHeroFile = {
  dataset_id: string;
  revision_id: number;
  computed_at_utc: string;
  chain: string;
  windows_supported: number[];
  asof: Record<string, string>;
  hero: {
    headline: string;
    charts: HeroChartSpec[];
    notes: string[];
  };
};

type Row = Record<string, any> & { date: string };

function toNumberOrNull(x: any): number | null {
  if (typeof x === "number" && Number.isFinite(x)) return x;
  if (typeof x === "string") {
    const n = Number(x);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function rollingMean(values: Array<number | null>, window: number): Array<number | null> {
  const out: Array<number | null> = new Array(values.length).fill(null);
  const q: Array<number | null> = [];
  let sum = 0;
  let cnt = 0;

  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    q.push(v);
    if (v !== null) {
      sum += v;
      cnt += 1;
    }
    if (q.length > window) {
      const removed = q.shift()!;
      if (removed !== null) {
        sum -= removed;
        cnt -= 1;
      }
    }
    if (q.length === window) out[i] = cnt > 0 ? sum / cnt : null;
  }
  return out;
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

const fetcher = async (url: string) => {
  const r: any = await fetchJsonLenient(url);
  if (r && typeof r === "object") {
    if (r.error) throw new Error(typeof r.error === "string" ? r.error : JSON.stringify(r.error));
    if (r.data !== undefined) return r.data;
  }
  return r;
};

function capitalize(s: string) {
  return s ? s.slice(0, 1).toUpperCase() + s.slice(1) : s;
}

export default function ChainClient({ chain, hero }: { chain: string; hero: LandingHeroFile }) {
  // Pick a small, high-signal set for the chain page (still fast to parse visually)
  // You can tune this list later.
  const preferred = ["tx_count_daily", "median_tx_fee_native", "avg_block_time_sec"];
  const charts = (hero.hero?.charts || [])
    .filter((c) => preferred.includes(c.id))
    .slice(0, 3);

  const [activeChartId, setActiveChartId] = useState(charts[0]?.id || "");

  const active = charts.find((c) => c.id === activeChartId) || charts[0];

  const sourceRel = active?.source_file || null;

  const { data: raw, error } = useSWR<Row[]>(
    sourceRel ? `${PUBLISHED_BASE}/${sourceRel}` : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  const series = useMemo(() => {
    const rows = Array.isArray(raw) ? raw : [];
    const yKey = active?.y;
    if (!yKey || rows.length === 0) return [];

    const ys = rows.map((r) => toNumberOrNull(r[yKey]));
    const sma7 = rollingMean(ys, 7);
    const sma30 = rollingMean(ys, 30);

    return rows.map((r, i) => ({
      ...r,
      __y: ys[i],
      __sma7: sma7[i],
      __sma30: sma30[i],
    }));
  }, [raw, active?.y]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold">{capitalize(chain)}</h1>
            <p className="mt-2 text-white/70">
              Full diagnostics and methodology, built from published gold/meta/derived artifacts.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/80">
            <div className="text-white/60">Dataset</div>
            <div className="font-mono text-xs">{hero.dataset_id} · rev {hero.revision_id}</div>
            <div className="mt-2 text-white/60">Computed (UTC)</div>
            <div className="font-mono text-xs">{hero.computed_at_utc}</div>
            <div className="mt-2 text-white/60">As-of (gold)</div>
            <div className="font-mono text-xs">{hero.asof?.gold || "—"}</div>
          </div>
        </div>
      </div>

      {/* Chart picker */}
      <div className="flex flex-wrap gap-2">
        {charts.map((c) => (
          <button
            key={c.id}
            onClick={() => setActiveChartId(c.id)}
            className={[
              "rounded-full border px-3 py-1 text-xs",
              c.id === (active?.id || "")
                ? "border-white/25 bg-white/10 text-white"
                : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10",
            ].join(" ")}
          >
            {c.title}
          </button>
        ))}
      </div>

      {/* Main signature chart */}
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-white/60">
              {capitalize(chain)} · last {active?.window_days ?? 90}d · {active?.genre ?? "gold"}
            </div>
            <div className="mt-1 text-xl font-semibold">{active?.title || "Chart"}</div>
            <div className="mt-1 text-sm text-white/65">{active?.hint_basic || ""}</div>

            <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-white/70">
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">Daily</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">SMA 7</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">SMA 30</span>
            </div>
          </div>

          <div className="text-xs text-white/55">window</div>
        </div>

        <div className="mt-4 h-[320px] w-full">
          {error ? (
            <div className="grid h-full place-items-center text-sm text-red-200">
              Failed to load chart data: {(error as any)?.message || String(error)}
            </div>
          ) : series.length === 0 ? (
            <div className="grid h-full place-items-center text-sm text-white/60">
              No data yet.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ left: 8, right: 8, top: 8, bottom: 0 }}>
                <defs>
                  <linearGradient id={`fill_${chain}_${active?.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgba(217,70,239,0.55)" />
                    <stop offset="100%" stopColor="rgba(217,70,239,0.02)" />
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="4 6" opacity={0.12} />
                <XAxis
                  dataKey={active?.x || "date"}
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
                  tickFormatter={(v) => formatCompact(Number(v), active?.format)}
                />
                <Tooltip
                  content={({ active: a, payload, label }) => {
                    if (!a || !payload || payload.length === 0) return null;
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
                            <span>{formatCompact(daily, active?.format)}</span>
                          </div>
                          <div className="flex justify-between gap-6">
                            <span className="text-white/70">SMA 7</span>
                            <span>{formatCompact(sma7, active?.format)}</span>
                          </div>
                          <div className="flex justify-between gap-6">
                            <span className="text-white/70">SMA 30</span>
                            <span>{formatCompact(sma30, active?.format)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  }}
                />

                {/* Daily (filled) */}
                <Area
                  type="monotone"
                  dataKey="__y"
                  stroke="rgba(217,70,239,0.95)"
                  strokeWidth={2}
                  fill={`url(#fill_${chain}_${active?.id})`}
                  dot={false}
                  isAnimationActive={false}
                />

                {/* SMA 7 */}
                <Area
                  type="monotone"
                  dataKey="__sma7"
                  stroke="rgba(168,85,247,0.95)"
                  strokeWidth={2}
                  fill="rgba(0,0,0,0)"
                  dot={false}
                  isAnimationActive={false}
                />

                {/* SMA 30 */}
                <Area
                  type="monotone"
                  dataKey="__sma30"
                  stroke="rgba(59,130,246,0.85)"
                  strokeWidth={2}
                  fill="rgba(0,0,0,0)"
                  dot={false}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="mt-3 text-xs text-white/55">
          {hero.hero?.headline || "Network activity & execution conditions"}
        </div>
      </div>
    </div>
  );
}