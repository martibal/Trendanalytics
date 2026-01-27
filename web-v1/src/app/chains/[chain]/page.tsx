"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  type Chain,
  CHAINS,
  getChainProfile,
  metricTitleForChain,
  metricUnitForChain,
  metricFormatForChain,
  metricExplainForChain,
} from "@/lib/metricRegistry";

type Row = Record<string, any>;

function baseUrl(): string {
  return (process.env.NEXT_PUBLIC_DATA_BASE_URL || "/data/published/v1").replace(/\/$/, "");
}

function isSupportedChain(x: string): x is Chain {
  return x === "bitcoin" || x === "ethereum" || x === "arbitrum" || x === "base";
}

function toUtcDayNumber(yyyyMmDd: string): number | null {
  if (typeof yyyyMmDd !== "string") return null;
  const s = yyyyMmDd.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const t = Date.parse(`${s}T00:00:00Z`);
  if (!Number.isFinite(t)) return null;
  return Math.floor(t / (1000 * 60 * 60 * 24));
}

function fromUtcDayNumber(day: number): Date {
  return new Date(day * 24 * 60 * 60 * 1000);
}

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function toNumberOrNull(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function median(values: number[]): number | null {
  if (!values.length) return null;
  const a = values.slice().sort((x, y) => x - y);
  const mid = Math.floor(a.length / 2);
  if (a.length % 2 === 1) return a[mid];
  return (a[mid - 1] + a[mid]) / 2;
}

function percentileRank(sorted: number[], x: number): number {
  if (!sorted.length) return 0;
  let lo = 0;
  let hi = sorted.length;
  while (lo < hi) {
    const m = Math.floor((lo + hi) / 2);
    if (sorted[m] <= x) lo = m + 1;
    else hi = m;
  }
  return lo / sorted.length;
}

function iqr(sorted: number[]): { q1: number; q3: number; iqr: number } | null {
  if (sorted.length < 4) return null;
  const q = (p: number) => {
    const idx = (sorted.length - 1) * p;
    const lo = Math.floor(idx);
    const hi = Math.ceil(idx);
    if (lo === hi) return sorted[lo];
    const w = idx - lo;
    return sorted[lo] * (1 - w) + sorted[hi] * w;
  };
  const q1 = q(0.25);
  const q3 = q(0.75);
  return { q1, q3, iqr: q3 - q1 };
}

function formatValue(chain: Chain, metricKey: string, value: number | null): string {
  const unit = metricUnitForChain(chain, metricKey);
  const fmt = metricFormatForChain(chain, metricKey);

  if (value === null) return "n/a";

  if (unit === "pct") {
    const pctIsFraction = fmt?.pctIsFraction ?? true;
    const decimals = fmt?.decimals ?? 2;
    const v = pctIsFraction ? value * 100 : value;
    return `${v.toFixed(decimals)}%`;
  }

  const decimals =
    fmt?.decimals ??
    (unit === "count" ? 0 : unit === "sec" ? 2 : unit === "native" ? 6 : 2);

  const fixed = value.toFixed(decimals);
  const [a, b] = fixed.split(".");
  const grouped = a.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return b ? `${grouped}.${b}` : grouped;
}

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${path}`);
  return (await res.json()) as T;
}

// --- Weekly aggregation: median per week (Mon–Sun) ---

function mondayOfUtcDate(d: Date): Date {
  const day = d.getUTCDay();
  const diffToMonday = (day + 6) % 7;
  const m = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  m.setUTCDate(m.getUTCDate() - diffToMonday);
  return m;
}

function weekKeyFromYmd(yyyyMmDd: string): string | null {
  const n = toUtcDayNumber(yyyyMmDd);
  if (n === null) return null;
  const d = fromUtcDayNumber(n);
  const mon = mondayOfUtcDate(d);
  return ymd(mon);
}

type WeeklyPoint = {
  weekStart: string;
  value: number | null;
  n: number;
};

function buildWeeklyMedianSeries(rows: Row[], metricKey: string, weeksBack: number): WeeklyPoint[] {
  const buckets = new Map<string, number[]>();
  for (const r of rows) {
    const ds = typeof r.date === "string" ? r.date : "";
    const wk = weekKeyFromYmd(ds);
    if (!wk) continue;
    const v = toNumberOrNull(r?.[metricKey]);
    if (v === null) continue;
    const arr = buckets.get(wk) ?? [];
    arr.push(v);
    buckets.set(wk, arr);
  }

  const lastDateStr = (() => {
    const ds = rows.length && typeof rows[rows.length - 1].date === "string" ? rows[rows.length - 1].date : null;
    if (ds && toUtcDayNumber(ds) !== null) return ds;
    let best: string | null = null;
    let bestN: number | null = null;
    for (const r of rows) {
      const d = typeof r.date === "string" ? r.date : "";
      const dn = toUtcDayNumber(d);
      if (dn === null) continue;
      if (bestN === null || dn > bestN) {
        bestN = dn;
        best = d;
      }
    }
    return best;
  })();

  if (!lastDateStr) return [];
  const lastWeek = weekKeyFromYmd(lastDateStr);
  if (!lastWeek) return [];

  const lastWeekDay = toUtcDayNumber(lastWeek)!;
  const out: WeeklyPoint[] = [];
  for (let i = weeksBack - 1; i >= 0; i--) {
    const weekStartDay = lastWeekDay - i * 7;
    const wk = ymd(fromUtcDayNumber(weekStartDay));
    const arr = buckets.get(wk) ?? [];
    out.push({ weekStart: wk, value: median(arr), n: arr.length });
  }
  return out;
}

function sparklinePoints(values: Array<number | null>, width = 900, height = 140): string {
  const nums = values.filter((v): v is number => v !== null);
  if (nums.length < 2) return "";
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const range = max - min || 1;

  const coords: string[] = [];
  const n = values.length;
  for (let i = 0; i < n; i++) {
    const v = values[i];
    if (v === null) continue;
    const x = (i / (n - 1)) * width;
    const y = height - ((v - min) / range) * height;
    coords.push(`${x.toFixed(2)},${y.toFixed(2)}`);
  }
  return coords.join(" ");
}

// --- Scan-friendly Notables A: one-line status + persistence ---

type Status = "Elevated" | "Typical" | "Depressed" | "Missing";

function classifyByPercentile(p: number | null): "low" | "mid" | "high" | null {
  if (p === null) return null;
  if (p <= 0.1) return "low";
  if (p >= 0.9) return "high";
  return "mid";
}

function classifyByIqrUnits(x: number | null): "low" | "mid" | "high" | null {
  if (x === null) return null;
  if (x <= -1.0) return "low";
  if (x >= 1.0) return "high";
  return "mid";
}

function persistenceCountLastK(classes: Array<"low" | "mid" | "high" | null>, k: number): number {
  if (!classes.length) return 0;
  const tail = classes[classes.length - 1];
  if (tail !== "low" && tail !== "high") return 0;
  let c = 0;
  for (let i = classes.length - 1; i >= 0 && c < k; i--) {
    if (classes[i] === tail) c++;
    else break;
  }
  return c;
}

function statusFromExtreme(extreme: "low" | "high" | null, latestWeekly: number | null): Status {
  if (latestWeekly === null) return "Missing";
  if (extreme === "high") return "Elevated";
  if (extreme === "low") return "Depressed";
  return "Typical";
}

export default function ChainPage() {
  const params = useParams<{ chain: string }>();
  const router = useRouter();

  const chainParam = String(params?.chain ?? "");
  const chain: Chain = isSupportedChain(chainParam) ? chainParam : "ethereum";
  const profile = getChainProfile(chain);

  const SHOW_DEBUG = process.env.NEXT_PUBLIC_INTERNAL_DEBUG === "1";

  const [explainMode, setExplainMode] = useState<"basic" | "advanced">("basic");
  const [rows, setRows] = useState<Row[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setErr(null);
    (async () => {
      try {
        const data = await fetchJson<Row[]>(`${baseUrl()}/gold/${chain}/last365d.json`);
        if (!alive) return;
        setRows(Array.isArray(data) ? data : []);
      } catch (e: any) {
        if (!alive) return;
        setErr(e?.message ?? String(e));
        setRows([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, [chain]);

  const nowUtc = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const lastDate = useMemo(() => {
    if (!rows.length) return "n/a";
    const d = typeof rows[rows.length - 1].date === "string" ? rows[rows.length - 1].date : null;
    return d && toUtcDayNumber(d) !== null ? d : "n/a";
  }, [rows]);

  const metricCards = useMemo(() => {
    const weeksBack = 52;

    return profile.primaryMetrics.map((metricKey) => {
      const title = metricTitleForChain(chain, metricKey);
      const unit = metricUnitForChain(chain, metricKey);
      const explain = metricExplainForChain(chain, metricKey);

      const weekly = buildWeeklyMedianSeries(rows, metricKey, weeksBack);
      const weeklyVals = weekly.map((p) => p.value).filter((v): v is number => v !== null);
      const sorted = weeklyVals.slice().sort((a, b) => a - b);

      const latestDaily = rows.length ? toNumberOrNull(rows[rows.length - 1]?.[metricKey]) : null;
      const latestWeekly = weekly.length ? weekly[weekly.length - 1].value : null;

      const band = iqr(sorted);
      const weekMedian52 = median(sorted);

      const pct = latestWeekly === null || !sorted.length ? null : percentileRank(sorted, latestWeekly);
      const pctText = pct === null ? "n/a" : `${Math.round(pct * 100)}th`;

      const iqrUnits =
        latestWeekly === null || !band || band.iqr === 0 || weekMedian52 === null
          ? null
          : (latestWeekly - weekMedian52) / band.iqr;

      const clsP = classifyByPercentile(pct);
      const clsI = classifyByIqrUnits(iqrUnits);

      const extreme =
        clsP === "low" || clsI === "low" ? "low" : clsP === "high" || clsI === "high" ? "high" : null;

      // persistence over last 8 weeks in the same extreme zone
      const pctSeries: Array<"low" | "mid" | "high" | null> = [];
      const iqrSeries: Array<"low" | "mid" | "high" | null> = [];

      for (const w of weekly) {
        if (w.value === null || !sorted.length) {
          pctSeries.push(null);
        } else {
          const pr = percentileRank(sorted, w.value);
          pctSeries.push(classifyByPercentile(pr));
        }

        if (weekMedian52 === null || !band || band.iqr === 0 || w.value === null) {
          iqrSeries.push(null);
        } else {
          const u = (w.value - weekMedian52) / band.iqr;
          iqrSeries.push(classifyByIqrUnits(u));
        }
      }

      const persistence = Math.max(persistenceCountLastK(pctSeries, 8), persistenceCountLastK(iqrSeries, 8));

      const status = statusFromExtreme(extreme, latestWeekly);
      const statusDetail =
        status === "Missing"
          ? "No current weekly value."
          : status === "Typical"
          ? "Within typical range relative to the past year."
          : `${status} relative to the past year${persistence >= 2 ? ` (persistent ${persistence} weeks)` : ""}.`;

      const sparkPoints = sparklinePoints(weekly.map((p) => p.value));

      return {
        metricKey,
        title,
        unit,
        explain,
        weekly,
        latestDaily,
        latestWeekly,
        band,
        weekMedian52,
        pct,
        pctText,
        iqrUnits,
        persistence,
        status,
        statusDetail,
        sparkPoints,
      };
    });
  }, [chain, profile.primaryMetrics, rows]);

  const chainContext = explainMode === "basic" ? profile.interpretation.basic : profile.interpretation.advanced;

  return (
    <main className="mx-auto max-w-6xl p-6 space-y-6">
      <header className="space-y-2">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">
              {profile.label} <span className="opacity-70 text-base">· chain overview</span>
            </h1>
            <p className="text-sm opacity-80">
              Descriptive trends only. Source: <code>{baseUrl()}</code> · last date in window:{" "}
              <span className="font-mono">{lastDate}</span> · today (UTC): <span className="font-mono">{nowUtc}</span>
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <label className="text-sm">
              <div className="opacity-70 mb-1">chain</div>
              <select
                className="border rounded-lg px-2 py-1 text-sm"
                value={chain}
                onChange={(e) => {
                  const next = e.target.value;
                  if (isSupportedChain(next)) router.push(`/chains/${next}`);
                }}
              >
                {Object.keys(CHAINS).map((c) => {
                  const cc = c as Chain;
                  return (
                    <option key={cc} value={cc}>
                      {CHAINS[cc].label}
                    </option>
                  );
                })}
              </select>
            </label>

            <label className="text-sm">
              <div className="opacity-70 mb-1">explain</div>
              <select
                className="border rounded-lg px-2 py-1 text-sm"
                value={explainMode}
                onChange={(e) => setExplainMode(e.target.value as "basic" | "advanced")}
              >
                <option value="basic">Basic</option>
                <option value="advanced">Advanced</option>
              </select>
            </label>
          </div>
        </div>

        <section className="rounded-2xl border p-4 space-y-2">
          <div className="text-sm font-medium">Chain interpretation context ({explainMode})</div>
          <p className="text-sm opacity-80">{chainContext}</p>
        </section>
      </header>

      {err ? (
        <section className="rounded-2xl border p-4">
          <div className="text-sm font-medium text-red-600">Failed to load gold/last365d.json</div>
          <pre className="text-xs mt-2 whitespace-pre-wrap font-mono opacity-80">{err}</pre>
        </section>
      ) : null}

      <section className="space-y-4">
        {metricCards.map((m) => {
          const latestDailyText = formatValue(chain, m.metricKey, m.latestDaily);
          const latestWeeklyText = formatValue(chain, m.metricKey, m.latestWeekly);
          const medianText = formatValue(chain, m.metricKey, m.weekMedian52);
          const q1Text = formatValue(chain, m.metricKey, m.band?.q1 ?? null);
          const q3Text = formatValue(chain, m.metricKey, m.band?.q3 ?? null);

          return (
            <div key={m.metricKey} className="rounded-2xl border p-4 space-y-3">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <div className="text-lg font-semibold">{m.title}</div>
                  <div className="text-xs opacity-70 font-mono">{m.metricKey}</div>
                </div>

                <div className="text-xs opacity-80">
                  unit: <span className="font-mono">{m.unit}</span> · weekly view:{" "}
                  <span className="font-mono">median (52w)</span>
                </div>
              </div>

              {/* Scan-friendly status */}
              <div className="rounded-xl border p-3">
                <div className="text-sm font-medium">Status</div>
                <div className="text-sm opacity-80 mt-1">
                  <span className="font-semibold">{m.status}</span>: {m.statusDetail}
                </div>

                {explainMode === "advanced" ? (
                  <div className="text-xs opacity-80 mt-2">
                    Evidence: percentile <span className="font-mono">{m.pctText}</span> · IQR-units{" "}
                    <span className="font-mono">{m.iqrUnits === null ? "n/a" : m.iqrUnits.toFixed(2)}</span> · persistence{" "}
                    <span className="font-mono">{m.persistence}</span> weeks
                  </div>
                ) : null}

                {SHOW_DEBUG ? (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs font-medium opacity-70">debug</summary>
                    <pre className="text-xs overflow-auto max-h-40 bg-black/5 rounded-lg p-2 mt-2">
                      {JSON.stringify(
                        {
                          pct: m.pct,
                          iqrUnits: m.iqrUnits,
                          persistence: m.persistence,
                          band: m.band,
                          weekMedian52: m.weekMedian52,
                        },
                        null,
                        2
                      )}
                    </pre>
                  </details>
                ) : null}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="rounded-xl border p-3">
                  <div className="text-xs opacity-70">Latest (daily)</div>
                  <div className="text-xl font-semibold font-mono">{latestDailyText}</div>
                </div>

                <div className="rounded-xl border p-3">
                  <div className="text-xs opacity-70">Latest (weekly median)</div>
                  <div className="text-xl font-semibold font-mono">{latestWeeklyText}</div>
                </div>

                <div className="rounded-xl border p-3">
                  <div className="text-xs opacity-70">52-week context (weekly medians)</div>
                  <div className="text-sm opacity-80 mt-1">
                    median: <span className="font-mono">{medianText}</span>
                  </div>
                  <div className="text-sm opacity-80">
                    IQR (Q1–Q3): <span className="font-mono">{q1Text}</span> –{" "}
                    <span className="font-mono">{q3Text}</span>
                  </div>
                  <div className="text-sm opacity-80">
                    percentile (latest week): <span className="font-mono">{m.pctText}</span>
                  </div>
                  <div className="text-sm opacity-80">
                    distance vs median (IQR units):{" "}
                    <span className="font-mono">{m.iqrUnits === null ? "n/a" : m.iqrUnits.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {m.explain ? (
                <div className="rounded-xl border p-3">
                  <div className="text-sm font-medium">Explanation ({explainMode})</div>
                  <p className="text-sm opacity-80 mt-1">
                    {explainMode === "basic" ? m.explain.basic : m.explain.advanced}
                  </p>
                </div>
              ) : null}

              <div className="rounded-xl border p-3">
                <div className="text-sm font-medium mb-2">Weekly median series (last 52 weeks)</div>
                <div className="overflow-x-auto">
                  <svg viewBox="0 0 900 140" width="900" height="140" className="block">
                    <polyline fill="none" stroke="currentColor" strokeWidth="2" points={m.sparkPoints} opacity="0.9" />
                  </svg>
                </div>

                {SHOW_DEBUG ? (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs font-medium">show weekly points (debug)</summary>
                    <pre className="text-xs overflow-auto max-h-64 bg-black/5 rounded-lg p-2 mt-2">
                      {JSON.stringify(m.weekly, null, 2)}
                    </pre>
                  </details>
                ) : null}
              </div>
            </div>
          );
        })}
      </section>
    </main>
  );
}
