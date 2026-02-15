"use client";

import Link from "next/link";
import useSWR from "swr";
import { useMemo, useRef, useState } from "react";

import type { ChainId } from "@/lib/types";
import { useLandingHero } from "@/lib/data";

function titleChain(chain: ChainId) {
  switch (chain) {
    case "bitcoin":
      return "Bitcoin";
    case "ethereum":
      return "Ethereum";
    case "arbitrum":
      return "Arbitrum";
    case "base":
      return "Base";
    default:
      return String(chain);
  }
}

type Palette = {
  a: string; // area top
  b: string; // area bottom
  stroke: string; // daily
  glow: string; // hover dot stroke
  ma7: string; // MA7 color
  ma30: string; // MA30 color
};

function paletteFor(_chain: ChainId): Palette {
  // Web2: controlled, semantically stable palette across chains.
  // - Daily: subtle (noise)
  // - MA7: secondary accent (short-term regime)
  // - MA30: primary accent (structural baseline)
  // Chain identity should come from labels and badges, not chart colors.
  return {
    a: "rgb(var(--chart-ma30) / 0.18)",
    b: "rgb(var(--chart-ma7) / 0.08)",
    stroke: "rgb(var(--chart-daily) / 0.70)",
    glow: "rgb(var(--chart-ma30) / 0.85)",
    ma7: "rgb(var(--chart-ma7) / 0.92)",
    ma30: "rgb(var(--chart-ma30) / 0.95)",
  };
}

function safeNum(v: any): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

const fetcherOrNull = async <T,>(url: string): Promise<T | null> => {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
};

type GoldDailyRow = Record<string, any> & { date: string };

type SeriesPoint = {
  date: string;
  daily: number | null;
  ma7: number | null;
  ma30: number | null;
};

type SummaryResponse = {
  chain: ChainId;
  metric: string;
  start: string;
  end: string;
  current: { daily: number | null; ma7: number | null; ma30: number | null };
  period: { mean_daily: number | null; median_daily: number | null; stdev_daily: number | null };
  level: { percentile: number | null };
};

function isValidISODate(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function normalize(vals: (number | null)[]) {
  const xs = vals.filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  if (!xs.length) return { min: 0, max: 1 };
  let min = xs[0],
    max = xs[0];
  for (const v of xs) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  if (min === max) return { min: min - 1, max: max + 1 };
  return { min, max };
}

function mapY(v: number, min: number, max: number, h: number, pad: number) {
  const t = (v - min) / (max - min);
  return pad + (1 - t) * (h - pad * 2);
}

function pathForSeries(vals: (number | null)[], w: number, h: number, pad = 22, min?: number, max?: number) {
  const mm = min !== undefined && max !== undefined ? { min, max } : normalize(vals);
  const { min: mn, max: mx } = mm;

  const n = vals.length;
  if (!n) return { d: "", min: mn, max: mx };
  const dx = n <= 1 ? 0 : (w - pad * 2) / (n - 1);

  let d = "";
  let started = false;
  for (let i = 0; i < n; i++) {
    const x = pad + i * dx;
    const v = vals[i];
    if (typeof v !== "number" || !Number.isFinite(v)) {
      started = false;
      continue;
    }
    const y = mapY(v, mn, mx, h, pad);
    if (!started) {
      d += `M ${x.toFixed(2)} ${y.toFixed(2)} `;
      started = true;
    } else {
      d += `L ${x.toFixed(2)} ${y.toFixed(2)} `;
    }
  }
  return { d: d.trim(), min: mn, max: mx };
}

function areaUnderSeries(vals: (number | null)[], w: number, h: number, pad = 22, min?: number, max?: number) {
  const mm = min !== undefined && max !== undefined ? { min, max } : normalize(vals);
  const { min: mn, max: mx } = mm;

  const n = vals.length;
  if (!n) return { d: "", min: mn, max: mx };
  const dx = n <= 1 ? 0 : (w - pad * 2) / (n - 1);

  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i < n; i++) {
    const v = vals[i];
    if (typeof v !== "number" || !Number.isFinite(v)) continue;
    const x = pad + i * dx;
    const y = mapY(v, mn, mx, h, pad);
    pts.push({ x, y });
  }
  if (!pts.length) return { d: "", min: mn, max: mx };

  let d = `M ${pts[0].x.toFixed(2)} ${(h - pad).toFixed(2)} `;
  for (const p of pts) d += `L ${p.x.toFixed(2)} ${p.y.toFixed(2)} `;
  d += `L ${pts[pts.length - 1].x.toFixed(2)} ${(h - pad).toFixed(2)} Z`;
  return { d, min: mn, max: mx };
}

/**
 * Rolling mean with "full window" requirement.
 * We compute MA on a LONG base series, then slice to the displayed window.
 * This keeps MA7/MA30 visible across the chosen window (no front-gap truncation).
 */
function rollingMean(vals: (number | null)[], win: number): (number | null)[] {
  const out: (number | null)[] = new Array(vals.length).fill(null);
  if (win <= 1) return vals.slice();

  let sum = 0;
  let count = 0;
  const q: (number | null)[] = [];

  for (let i = 0; i < vals.length; i++) {
    const v = vals[i];
    q.push(v);

    if (typeof v === "number" && Number.isFinite(v)) {
      sum += v;
      count += 1;
    }

    if (q.length > win) {
      const old = q.shift()!;
      if (typeof old === "number" && Number.isFinite(old)) {
        sum -= old;
        count -= 1;
      }
    }

    if (q.length === win && count === win) out[i] = sum / win;
  }

  return out;
}

function formatCompactInt(v: number | null) {
  if (v === null) return "—";
  const abs = Math.abs(v);
  if (abs >= 1e9) return `${(v / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${(v / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${(v / 1e3).toFixed(1)}k`;
  return `${Math.round(v)}`;
}

function formatSignedPct(p: number | null) {
  if (p === null) return "—";
  const s = (p * 100).toFixed(1);
  return `${p >= 0 ? "+" : ""}${s}%`;
}

function fmtZ(z: number | null) {
  if (z === null || !Number.isFinite(z)) return "—";
  const s = z.toFixed(2);
  return z >= 0 ? `+${s}` : s;
}

function zLabel(z: number | null) {
  if (z === null || !Number.isFinite(z)) return null;
  const a = Math.abs(z);
  if (a >= 3) return "rare";
  if (a >= 2) return "unusual";
  if (a >= 1) return "somewhat unusual";
  return "typical";
}

function percentileRank(values: number[], x: number) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  let lo = 0;
  let hi = sorted.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (sorted[mid] <= x) lo = mid + 1;
    else hi = mid;
  }
  const rank = lo / sorted.length; // fraction <= x
  return Math.max(0, Math.min(1, rank));
}

function computeSnapshot(series: SeriesPoint[]) {
  const xs = series
    .map((p) => p.ma30 ?? p.ma7 ?? p.daily)
    .filter((v): v is number => typeof v === "number" && Number.isFinite(v));

  if (xs.length < 12) {
    return {
      headline: "Not enough usable data for a stable snapshot.",
      detail: "This window contains too many missing points.",
    };
  }

  const first = xs[0];
  const last = xs[xs.length - 1];
  const rel = first !== 0 ? (last - first) / Math.abs(first) : 0;

  let trend = "flat";
  if (rel > 0.06) trend = "rising";
  if (rel < -0.06) trend = "falling";

  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  const varr = xs.reduce((a, b) => a + (b - mean) * (b - mean), 0) / Math.max(1, xs.length - 1);
  const stdev = Math.sqrt(varr);
  const cv = mean !== 0 ? stdev / Math.abs(mean) : 0;

  let stability = "stable";
  if (cv > 0.25) stability = "variable";
  if (cv > 0.45) stability = "highly variable";

  return {
    headline: `Activity looks ${trend} with ${stability} day-to-day variation.`,
    detail: "Descriptive snapshot only. Click through for full context and additional metrics.",
  };
}

function WindowToggle(props: { windows: number[]; active: number; onChange: (w: number) => void }) {
  const preferredOrder = [30, 90, 180, 365, 7];
  const ordered = [...props.windows].sort((a, b) => preferredOrder.indexOf(a) - preferredOrder.indexOf(b));

  return (
    <div className="flex flex-wrap gap-2">
      {ordered.map((w) => {
        const isActive = w === props.active;
        return (
          <button
            key={w}
            type="button"
            onClick={(e) => {
              e.preventDefault();
              props.onChange(w);
            }}
            className={[
              "rounded-full border px-3 py-1 text-[11px] font-semibold transition",
              isActive
                ? "border-ui-border/30 bg-ui-bg/20 text-ui-text"
                : "border-ui-border/15 bg-ui-bg/10 text-ui-muted hover:border-ui-border/25 hover:text-ui-text",
            ].join(" ")}
          >
            {w}d
          </button>
        );
      })}
    </div>
  );
}

function niceTicks(min: number, max: number, n = 2) {
  if (!Number.isFinite(min) || !Number.isFinite(max) || min === max) return [min, max];
  const span = max - min;
  const step = span / (n + 1);
  const ticks: number[] = [];
  for (let i = 0; i <= n + 1; i++) ticks.push(min + step * i);
  return ticks;
}

function pctWord(p: number) {
  const abs = Math.abs(p);
  if (abs < 0.02) return "about normal";
  if (abs < 0.06) return p > 0 ? "slightly above" : "slightly below";
  if (abs < 0.14) return p > 0 ? "above" : "below";
  return p > 0 ? "well above" : "well below";
}

type RegimeBadge = {
  kind: "near" | "persistent_above" | "persistent_below" | "transient_above" | "transient_below" | "insufficient";
  relDiff: number | null;
  streakDays: number | null;
  label: string;
  detail: string;
  tone: "neutral" | "warn";
};

function computeRegimeBadge(points: SeriesPoint[]): RegimeBadge {
  const threshold = 0.08;
  const minStreak = 5;
  const lookbackMax = 21;

  if (!Array.isArray(points) || points.length < 2) {
    return {
      kind: "insufficient",
      relDiff: null,
      streakDays: null,
      label: "Regime: —",
      detail: "Not enough usable MA7/MA30 points.",
      tone: "neutral",
    };
  }

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
      label: "Regime: —",
      detail: "MA7/MA30 missing at end of window.",
      tone: "neutral",
    };
  }

  const latest = points[latestIdx];
  const ma7 = latest.ma7 as number;
  const ma30 = latest.ma30 as number;
  if (ma30 === 0 || !Number.isFinite(ma7) || !Number.isFinite(ma30)) {
    return {
      kind: "insufficient",
      relDiff: null,
      streakDays: null,
      label: "Regime: —",
      detail: "Could not compute stable MA7/MA30 divergence.",
      tone: "neutral",
    };
  }

  const relDiff = (ma7 - ma30) / Math.abs(ma30);
  if (!Number.isFinite(relDiff)) {
    return {
      kind: "insufficient",
      relDiff: null,
      streakDays: null,
      label: "Regime: —",
      detail: "Could not compute stable MA7/MA30 divergence.",
      tone: "neutral",
    };
  }

  const absRel = Math.abs(relDiff);
  const sign = relDiff === 0 ? 0 : relDiff > 0 ? 1 : -1;

  if (absRel < threshold) {
    return {
      kind: "near",
      relDiff,
      streakDays: 0,
      label: "Regime: near baseline",
      detail: "MA7 is close to MA30 (short-term aligned with structural baseline).",
      tone: "neutral",
    };
  }

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

  const pct = Math.round(absRel * 1000) / 10;
  const dir = sign >= 0 ? "above" : "below";

  if (streak >= minStreak) {
    return {
      kind: sign >= 0 ? "persistent_above" : "persistent_below",
      relDiff,
      streakDays: streak,
      label: `Regime: persistently ${dir}`,
      detail: `MA7 is ~${pct}% ${dir} MA30 for ${streak} consecutive days.`,
      tone: "warn",
    };
  }

  return {
    kind: sign >= 0 ? "transient_above" : "transient_below",
    relDiff,
    streakDays: streak,
    label: `Regime: ${dir} (not persistent)`,
    detail: `MA7 is ~${pct}% ${dir} MA30, but not sustained (streak: ${streak}d).`,
    tone: "neutral",
  };
}

function HeroPill(props: { children: React.ReactNode; tone?: "neutral" | "warn" }) {
  const tone = props.tone ?? "neutral";
  const cls =
    tone === "warn"
      ? "border-ui-border bg-[rgb(var(--bad)/0.10)] text-ui-text"
      : "border-ui-border/15 bg-ui-bg/10 text-ui-muted";

  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold ${cls}`}>{props.children}</span>
  );
}

export function ChainHeroCard({ chain }: { chain: ChainId }) {
  const pal = paletteFor(chain);
  const { data: hero, isLoading: heroLoading } = useLandingHero(chain);

  const windows = useMemo<number[]>(() => {
    const w = (hero as any)?.windows_supported ?? (hero as any)?.windows_available;
    const arr = Array.isArray(w) ? w : [90];
    return [...new Set(arr.filter((x) => typeof x === "number" && x > 0))];
  }, [hero]);

  const defaultWindow = useMemo<number>(() => {
    const fromHero = (hero as any)?.default_window_days;
    if (typeof fromHero === "number" && fromHero > 0) return fromHero;
    return windows.includes(90) ? 90 : windows[0] ?? 90;
  }, [hero, windows]);

  const [activeWindow, setActiveWindow] = useState<number | null>(null);

  const active = useMemo(() => {
    const wanted = activeWindow ?? defaultWindow;
    if (typeof wanted === "number" && windows.includes(wanted)) return wanted;
    return defaultWindow;
  }, [activeWindow, defaultWindow, windows]);

  const signature = useMemo(() => {
    const first = (hero as any)?.hero?.charts?.[0] ?? null;
    const y = typeof first?.y === "string" ? first.y : "tx_count_daily";
    const title = typeof first?.title === "string" ? first.title : "Daily transactions";
    return { y, title };
  }, [hero]);

  // Long base window for MA computation (chain-page behavior).
  const baseWindowForMA = useMemo(() => {
    if (windows.includes(365)) return 365;
    if (windows.includes(180)) return 180;
    if (windows.includes(90)) return 90;
    if (windows.includes(active)) return active;
    return Math.max(active, 90);
  }, [windows, active]);

  const baseGoldUrl = useMemo(() => {
    return `/data/published/v1/gold/${chain}/last${baseWindowForMA}d.json`;
  }, [chain, baseWindowForMA]);

  const { data: baseGoldRows, isLoading: goldLoading } = useSWR<GoldDailyRow[] | null>(baseGoldUrl, fetcherOrNull, {
    revalidateOnFocus: false,
  });

  const series: SeriesPoint[] = useMemo(() => {
    const rows = Array.isArray(baseGoldRows) ? baseGoldRows : [];
    if (!rows.length) return [];

    const dailyAll = rows.map((r) => safeNum((r as any)?.[signature.y]));
    const ma7All = rollingMean(dailyAll, 7);
    const ma30All = rollingMean(dailyAll, 30);

    const start = Math.max(0, rows.length - active);
    const rowsSlice = rows.slice(start);

    return rowsSlice.map((r, i) => {
      const j = start + i;
      return {
        date: String((r as any)?.date ?? ""),
        daily: dailyAll[j] ?? null,
        ma7: ma7All[j] ?? null,
        ma30: ma30All[j] ?? null,
      };
    });
  }, [baseGoldRows, signature.y, active]);

  const startISO = useMemo(() => (series.length ? series[0].date : null), [series]);
  const endISO = useMemo(() => (series.length ? series[series.length - 1].date : null), [series]);

  const summaryUrl = useMemo(() => {
    if (!startISO || !endISO || !isValidISODate(startISO) || !isValidISODate(endISO)) return null;
    return `/api/summary?chain=${chain}&metric=${encodeURIComponent(signature.y)}&start=${startISO}&end=${endISO}`;
  }, [chain, signature.y, startISO, endISO]);

  const { data: summary, isLoading: summaryLoading } = useSWR<SummaryResponse | null>(summaryUrl, fetcherOrNull, {
    revalidateOnFocus: false,
  });

  const snapshot = useMemo(() => computeSnapshot(series), [series]);
  const regimeBadge = useMemo(() => computeRegimeBadge(series), [series]);

  const lastRead = useMemo(() => {
    const lastIdx = series.length - 1;
    if (lastIdx < 0) return null;
    const last = series[lastIdx];
    if (!last?.date) return null;

    const d = last.daily;
    const m7 = last.ma7;
    const m30 = last.ma30;

    const dailyVs7 = d !== null && m7 !== null && m7 !== 0 ? (d - m7) / Math.abs(m7) : null;
    const ma7Vs30 = m7 !== null && m30 !== null && m30 !== 0 ? (m7 - m30) / Math.abs(m30) : null;

    // Percentile: prefer summary.level.percentile, fallback to local rank.
    const summaryPct = summary?.level?.percentile;
    const pctFromSummary =
      typeof summaryPct === "number" && Number.isFinite(summaryPct) ? Math.round(Math.max(0, Math.min(1, summaryPct)) * 100) : null;

    const dailyVals = series
      .map((p) => p.daily)
      .filter((v): v is number => typeof v === "number" && Number.isFinite(v));

    const pctLocal = d !== null ? percentileRank(dailyVals, d) : null;
    const pctFromLocal = pctLocal === null ? null : Math.round(pctLocal * 100);

    const pct = pctFromSummary ?? pctFromLocal;

    // Z-score: from summary period stats (descriptive abnormality context).
    const mu = summary?.period?.mean_daily ?? null;
    const sd = summary?.period?.stdev_daily ?? null;
    const z =
      d !== null && mu !== null && sd !== null && Number.isFinite(d) && Number.isFinite(mu) && Number.isFinite(sd) && sd !== 0
        ? (d - mu) / sd
        : null;

    // Landing-friendly “meaning” in plain language (A1/B2).
    const dailyMeaning =
      dailyVs7 === null
        ? "Daily shows actual day-to-day activity (can be noisy)."
        : `Daily is ${pctWord(dailyVs7)} the last-week normal (MA7).`;

    const regimeMeaning =
      ma7Vs30 === null
        ? "MA7 shows the short-term regime; MA30 shows the structural baseline."
        : `MA7 is ${pctWord(ma7Vs30)} the 30-day baseline (MA30).`;

    const pctMeaning =
      pct === null
        ? "Percentile shows where today sits vs other days in the selected window."
        : `Percentile: today is higher than about ${pct}% of days in this window.`;

    const zMeaning =
      z === null ? "Z-score expresses how far today is from the window mean (in standard deviation units)." : `Z-score is ${zLabel(z)} for this window.`;

    return {
      date: last.date,
      daily: d,
      ma7: m7,
      ma30: m30,
      dailyVs7,
      ma7Vs30,
      pct,
      z,
      dailyMeaning,
      regimeMeaning,
      pctMeaning,
      zMeaning,
    };
  }, [series, summary]);

  // Chart layout
  const W = 1700;
  const H = 520;
  const INNER_PAD = 28;

  const dailyVals = series.map((p) => p.daily);
  const ma7Vals = series.map((p) => p.ma7);
  const ma30Vals = series.map((p) => p.ma30);

  const unifiedVals = [...dailyVals, ...ma7Vals, ...ma30Vals];
  const { min, max } = normalize(unifiedVals);

  const area = areaUnderSeries(ma30Vals, W, H, INNER_PAD, min, max);
  const dailyLine = pathForSeries(dailyVals, W, H, INNER_PAD, min, max);
  const ma7Line = pathForSeries(ma7Vals, W, H, INNER_PAD, min, max);
  const ma30Line = pathForSeries(ma30Vals, W, H, INNER_PAD, min, max);

  const hasAny = !!(dailyLine.d || ma7Line.d || ma30Line.d);

  // Hover
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const n = series.length;
  const dx = n <= 1 ? 0 : (W - INNER_PAD * 2) / (n - 1);

  function onMove(e: React.MouseEvent) {
    if (!wrapRef.current || n <= 0) return;
    const rect = wrapRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const t = x / rect.width;
    const raw = INNER_PAD + t * (W - INNER_PAD * 2);
    const i = Math.round((raw - INNER_PAD) / dx);
    setHoverIdx(Math.max(0, Math.min(n - 1, i)));
  }

  function onLeave() {
    setHoverIdx(null);
  }

  const hover = hoverIdx === null ? null : series[hoverIdx];
  const xHover = hoverIdx === null ? null : INNER_PAD + hoverIdx * dx;
  const tooltipLeftPct = hoverIdx === null || n <= 1 ? 50 : (hoverIdx / (n - 1)) * 100;

  const gradId = `grad-hero-${chain}`;
  const glowId = `glow-hero-${chain}`;

  const xLeft = series[0]?.date ?? "";
  const xMid = series[Math.floor((series.length - 1) / 2)]?.date ?? "";
  const xRight = series[series.length - 1]?.date ?? "";

  const yTicks = useMemo(() => niceTicks(min, max, 2), [min, max]);

  return (
    <Link href={`/chains/${chain}`} className="group block">
      <div className="ui-card ui-lift p-7">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-xl font-semibold text-ui-text">{titleChain(chain)}</div>
            <div className="mt-1 text-xs text-ui-faint">
              Window: <span className="text-ui-muted">{active}d</span> · Click for full dashboard →
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              <HeroPill tone={regimeBadge.tone === "warn" ? "warn" : "neutral"}>{regimeBadge.label}</HeroPill>
              {regimeBadge.relDiff != null && Number.isFinite(regimeBadge.relDiff) ? (
                <HeroPill tone={regimeBadge.tone === "warn" ? "warn" : "neutral"}>
                  MA7 vs MA30: {formatSignedPct(regimeBadge.relDiff)}
                </HeroPill>
              ) : null}
              {regimeBadge.kind !== "near" && regimeBadge.streakDays != null ? (
                <HeroPill tone={regimeBadge.tone === "warn" ? "warn" : "neutral"}>streak: {regimeBadge.streakDays}d</HeroPill>
              ) : null}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {heroLoading ? (
              <div className="text-xs text-ui-faint">Loading…</div>
            ) : (
              <WindowToggle windows={windows} active={active} onChange={setActiveWindow} />
            )}
          </div>
        </div>

        {/* GRAPH BOX (centerpiece) */}
        <div className="mt-5 rounded-[28px] border border-ui-border/15 bg-ui-bg/10 p-4">
          {heroLoading || goldLoading ? (
            <div className="flex h-[460px] items-center justify-center text-sm text-ui-faint">Loading chart…</div>
          ) : !hasAny ? (
            <div className="flex h-[460px] items-center justify-center rounded-2xl border border-ui-border bg-ui-bg/20 text-sm text-ui-faint">
              No usable series for this window.
            </div>
          ) : (
            <div ref={wrapRef} className="relative" onMouseMove={onMove} onMouseEnter={onMove} onMouseLeave={onLeave}>
              {hover ? (
                <div
                  className="pointer-events-none absolute top-3 z-10 rounded-2xl border border-ui-border/10 bg-ui-bg/80 px-4 py-3 text-[12px] text-ui-text backdrop-blur"
                  style={{
                    left: `clamp(12px, ${tooltipLeftPct}%, calc(100% - 300px))`,
                    width: 290,
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-semibold">{hover.date}</div>
                    <div className="text-ui-muted">{signature.title}</div>
                  </div>

                  <div className="mt-2 grid grid-cols-3 gap-2">
                    <div>
                      <div className="text-[11px] text-ui-faint">Daily</div>
                      <div className="text-base font-semibold">{formatCompactInt(hover.daily)}</div>
                    </div>
                    <div>
                      <div className="text-[11px] text-ui-faint">MA7</div>
                      <div className="text-base font-semibold">{formatCompactInt(hover.ma7)}</div>
                    </div>
                    <div>
                      <div className="text-[11px] text-ui-faint">MA30</div>
                      <div className="text-base font-semibold">{formatCompactInt(hover.ma30)}</div>
                    </div>
                  </div>
                </div>
              ) : null}

              <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 420 }}>
                <defs>
                  <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor={pal.a} />
                    <stop offset="100%" stopColor={pal.b} />
                  </linearGradient>

                  <filter id={glowId} x="-40%" y="-40%" width="180%" height="180%">
                    <feGaussianBlur stdDeviation="7" result="coloredBlur" />
                    <feMerge>
                      <feMergeNode in="coloredBlur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                <rect
                  x={INNER_PAD}
                  y={INNER_PAD}
                  width={W - INNER_PAD * 2}
                  height={H - INNER_PAD * 2}
                  fill="rgb(var(--surface) / 0.35)"
                  stroke="rgb(var(--border) / 0.10)"
                  rx="22"
                />

                {/* Y grid + labels */}
                <g>
                  {yTicks.map((tv, i) => {
                    const y = mapY(tv, min, max, H, INNER_PAD);
                    return (
                      <g key={`${tv}-${i}`}>
                        <line x1={INNER_PAD} y1={y} x2={W - INNER_PAD} y2={y} stroke="rgb(var(--border) / 0.10)" />
                        <text
                          x={INNER_PAD - 12}
                          y={y + 4}
                          textAnchor="end"
                          fontSize="12"
                          fill="rgb(var(--text-faint) / 0.95)"
                        >
                          {formatCompactInt(tv)}
                        </text>
                      </g>
                    );
                  })}
                </g>

                {/* MA30 area (baseline fill) */}
                {area.d ? <path d={area.d} fill={`url(#${gradId})`} opacity="0.92" /> : null}

                {/* Daily line */}
                {dailyLine.d ? (
                  <path
                    d={dailyLine.d}
                    fill="none"
                    stroke={pal.stroke}
                    strokeWidth="2.8"
                    filter={`url(#${glowId})`}
                    opacity="0.85"
                    strokeLinecap="round"
                  />
                ) : null}

                {/* MA7 (solid) */}
                {ma7Line.d ? (
                  <>
                    <path
                      d={ma7Line.d}
                      fill="none"
                      stroke="rgb(0 0 0 / 0.45)"
                      strokeWidth="7.2"
                      strokeLinecap="round"
                      opacity="0.55"
                    />
                    <path d={ma7Line.d} fill="none" stroke={pal.ma7} strokeWidth="3.9" strokeLinecap="round" />
                  </>
                ) : null}

                {/* MA30 (baseline) */}
                {ma30Line.d ? (
                  <>
                    <path
                      d={ma30Line.d}
                      fill="none"
                      stroke="rgb(0 0 0 / 0.45)"
                      strokeWidth="6.8"
                      strokeLinecap="round"
                      opacity="0.50"
                    />
                    <path d={ma30Line.d} fill="none" stroke={pal.ma30} strokeWidth="3.4" strokeLinecap="round" opacity="1" />
                  </>
                ) : null}

                {/* X labels */}
                <g>
                  <text x={INNER_PAD} y={H - 10} fontSize="12" fill="rgb(var(--text-faint) / 0.95)">
                    {xLeft}
                  </text>
                  <text x={W / 2} y={H - 10} textAnchor="middle" fontSize="12" fill="rgb(var(--text-faint) / 0.95)">
                    {xMid}
                  </text>
                  <text x={W - INNER_PAD} y={H - 10} textAnchor="end" fontSize="12" fill="rgb(var(--text-faint) / 0.95)">
                    {xRight}
                  </text>
                </g>

                {/* Hover crosshair + dot */}
                {xHover !== null && hover ? (
                  <g>
                    <line x1={xHover} y1={INNER_PAD} x2={xHover} y2={H - INNER_PAD} stroke="rgb(var(--border) / 0.22)" />
                    {(() => {
                      const v = hover.daily ?? hover.ma7 ?? hover.ma30;
                      if (typeof v !== "number" || !Number.isFinite(v)) return null;
                      const y = mapY(v, min, max, H, INNER_PAD);
                      return <circle cx={xHover} cy={y} r={8} fill="rgb(var(--bg) / 0.90)" stroke={pal.glow} strokeWidth={2.6} />;
                    })()}
                  </g>
                ) : null}
              </svg>

              {/* Legend (quick decoding) */}
              <div className="mt-2 flex flex-wrap items-center justify-between gap-3 text-[11px] text-ui-faint">
                <span>Hover to inspect exact values.</span>
                <div className="flex flex-wrap items-center gap-4">
                  <div className="inline-flex items-center gap-2">
                    <span className="inline-block h-[2px] w-6 rounded-full" style={{ background: pal.stroke }} />
                    <span className="text-ui-muted">Daily (actual)</span>
                  </div>
                  <div className="inline-flex items-center gap-2">
                    <span className="inline-block h-[3px] w-6 rounded-full" style={{ background: pal.ma7 }} />
                    <span className="text-ui-muted">MA7 (short-term)</span>
                  </div>
                  <div className="inline-flex items-center gap-2">
                    <span className="inline-block h-[3px] w-6 rounded-full" style={{ background: pal.ma30 }} />
                    <span className="text-ui-muted">MA30 (baseline)</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* METRICS BOX (supports the graph; explicit percentile + mini z-score) */}
        <div className="mt-4 rounded-[28px] border border-ui-border/12 bg-ui-bg/10 p-5">
          {lastRead ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-[11px] text-ui-faint">
                  Latest: <span className="text-ui-muted">{lastRead.date}</span>
                </div>
                <div className="text-[11px] text-ui-faint">
                  Context source:{" "}
                  <span className="text-ui-muted">{summaryLoading ? "loading…" : summary ? "summary API" : "local fallback"}</span>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
                <div className="rounded-2xl border border-ui-border/10 bg-ui-bg/15 px-4 py-3">
                  <div className="text-[11px] text-ui-faint">Daily</div>
                  <div className="mt-1 text-base font-semibold text-ui-text">{formatCompactInt(lastRead.daily)}</div>
                  <div className="mt-1 text-[11px] text-ui-faint">
                    {lastRead.dailyVs7 === null ? (
                      <>Compared to MA7: —</>
                    ) : (
                      <>{formatSignedPct(lastRead.dailyVs7)} vs MA7 (last-week normal)</>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-ui-border/10 bg-ui-bg/15 px-4 py-3">
                  <div className="text-[11px] text-ui-faint">MA7</div>
                  <div className="mt-1 text-base font-semibold text-ui-text">{formatCompactInt(lastRead.ma7)}</div>
                  <div className="mt-1 text-[11px] text-ui-faint">Short-term regime</div>
                </div>

                <div className="rounded-2xl border border-ui-border/10 bg-ui-bg/15 px-4 py-3">
                  <div className="text-[11px] text-ui-faint">MA30</div>
                  <div className="mt-1 text-base font-semibold text-ui-text">{formatCompactInt(lastRead.ma30)}</div>
                  <div className="mt-1 text-[11px] text-ui-faint">Structural baseline</div>
                </div>

                <div className="rounded-2xl border border-ui-border/10 bg-ui-bg/15 px-4 py-3">
                  <div className="text-[11px] text-ui-faint">Percentile</div>
                  <div className="mt-1 text-base font-semibold text-ui-text">{lastRead.pct === null ? "—" : `${lastRead.pct}th`}</div>
                  <div className="mt-1 text-[11px] text-ui-faint">Historical placement (window)</div>
                </div>

                <div className="rounded-2xl border border-ui-border/10 bg-ui-bg/15 px-4 py-3">
                  <div className="text-[11px] text-ui-faint">Z-score</div>
                  <div className="mt-1 text-base font-semibold text-ui-text">{fmtZ(lastRead.z)}</div>
                  <div className="mt-1 text-[11px] text-ui-faint">{lastRead.zMeaning}</div>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-ui-border/10 bg-ui-bg/12 px-4 py-3">
                <div className="text-xs font-semibold text-ui-text">Plain-English interpretation</div>
                <ul className="mt-2 space-y-1 text-[12px] text-ui-muted">
                  <li>
                    <span className="font-semibold text-ui-text">Regime</span>: short-term (MA7) vs structural baseline (MA30).{" "}
                    <span className="text-ui-text">{regimeBadge.detail}</span>
                  </li>
                  <li>
                    <span className="font-semibold text-ui-text">Daily</span>: actual day’s activity (can be noisy).{" "}
                    <span className="text-ui-text">{lastRead.dailyMeaning}</span>
                  </li>
                  <li>
                    <span className="font-semibold text-ui-text">MA7</span>: short-term regime (last 7 days).{" "}
                    <span className="text-ui-text">{lastRead.regimeMeaning}</span>
                  </li>
                  <li>
                    <span className="font-semibold text-ui-text">MA30</span>: structural baseline (last 30 days).
                  </li>
                  <li>
                    <span className="font-semibold text-ui-text">Percentile</span>: distribution context (not a forecast).{" "}
                    <span className="text-ui-text">{lastRead.pctMeaning}</span>
                  </li>
                  <li>
                    <span className="font-semibold text-ui-text">Z-score</span>: standardized abnormality context (not a forecast).{" "}
                    <span className="text-ui-text">
                      {lastRead.z === null ? "Z is unavailable (insufficient variance/sample)." : `|z| suggests ${zLabel(lastRead.z)} deviation.`}
                    </span>
                  </li>
                </ul>
                <div className="mt-2 text-[11px] text-ui-faint">Descriptive only · No prices · No advice</div>
              </div>
            </>
          ) : (
            <div className="text-sm text-ui-faint">No latest read available for this window.</div>
          )}
        </div>

        <div className="mt-5">
          <div className="text-sm font-semibold text-ui-text">Snapshot summary</div>
          <p className="mt-2 text-sm text-ui-muted">{snapshot.headline}</p>
          <p className="mt-1 text-xs text-ui-faint">{snapshot.detail}</p>
        </div>

        <div className="mt-4 text-[11px] text-ui-faint">
          as-of: <span className="text-ui-muted">{(hero as any)?.asof?.gold ?? "—"}</span>
        </div>
      </div>
    </Link>
  );
}