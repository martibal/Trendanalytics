"use client";

import Link from "next/link";
import useSWR from "swr";
import React, { useMemo, useRef, useState, type ReactNode } from "react";

import type { ChainId } from "@/lib/types";
import { useLandingHero } from "@/lib/data";
import { useDatasetIndex } from "@/hooks/useDatasetIndex";

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
  a: string;
  b: string;
  stroke: string;
  glow: string;
  ma7: string;
  ma30: string;
};

function paletteFor(_chain: ChainId): Palette {
  return {
    a: "rgb(var(--chart-ma30) / 0.18)",
    b: "rgb(var(--chart-ma7) / 0.08)",
    stroke: "rgb(var(--chart-daily) / 0.70)",
    glow: "rgb(var(--chart-ma30) / 0.85)",
    ma7: "rgb(var(--chart-ma7) / 0.92)",
    ma30: "rgb(var(--chart-ma30) / 0.95)",
  };
}

function safeNum(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

async function fetchJson(url: string): Promise<any> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function fetchJsonOrNull(url: string): Promise<any | null> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

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

function formatSignedPct(p: number | null) {
  if (p === null) return "—";
  const s = (p * 100).toFixed(1);
  return `${p >= 0 ? "+" : ""}${s}%`;
}

function chainTagline(chain: ChainId) {
  switch (chain) {
    case "bitcoin":
      return "Settlement-first demand and baseline network health.";
    case "ethereum":
      return "Execution demand vs capacity (utilization + failures).";
    case "arbitrum":
      return "L2 throughput + participation with reliability context.";
    case "base":
      return "L2 scale and intensity (throughput + users).";
    default:
      return "Chain overview.";
  }
}

function chainAccent(chain: ChainId): string {
  switch (chain) {
    case "bitcoin":
      return "255 153 51";
    case "ethereum":
      return "170 160 255";
    case "arbitrum":
      return "84 196 255";
    case "base":
      return "80 150 255";
    default:
      return "140 140 160";
  }
}

function pickHeroSignature(chain: ChainId): { y: string; title: string } {
  switch (chain) {
    case "bitcoin":
      return { y: "value_transferred_native", title: "Value transferred (native)" };
    case "ethereum":
      return { y: "gas_utilization_pct", title: "Gas utilization (%)" };
    case "arbitrum":
      return { y: "tx_count_daily", title: "Daily transactions" };
    case "base":
      return { y: "tx_count_daily", title: "Daily transactions" };
    default:
      return { y: "tx_count_daily", title: "Daily transactions" };
  }
}

function fmtNum(v: number, digits = 2) {
  if (!Number.isFinite(v)) return "—";
  return v.toFixed(digits);
}

function HeroPill(props: { children: ReactNode; tone?: "neutral" | "warn" }) {
  const tone = props.tone ?? "neutral";
  return (
    <span
      className={[
        "inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold",
        tone === "warn"
          ? "border-ui-warn/25 bg-ui-warn/10 text-ui-warn"
          : "border-ui-border/15 bg-ui-bg/10 text-ui-muted",
      ].join(" ")}
    >
      {props.children}
    </span>
  );
}

function WindowToggle(props: { windows: number[]; active: number; onChange: (n: number) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      {props.windows.map((w) => {
        const active = w === props.active;
        return (
          <button
            key={w}
            type="button"
            onClick={() => props.onChange(w)}
            className={[
              "rounded-full border px-3 py-1 text-[11px] font-semibold transition",
              active
                ? "border-ui-border/25 bg-ui-bg/20 text-ui-text"
                : "border-ui-border/12 bg-ui-bg/10 text-ui-muted hover:bg-ui-bg/15",
            ].join(" ")}
          >
            {w}d
          </button>
        );
      })}
    </div>
  );
}

type DivergenceBadge = {
  label: string;
  tone: "neutral" | "warn";
  kind: "near" | "watch" | "diverging";
  detail: string;
  relDiff: number | null;
  streakDays: number | null;
};

function computeDivergenceBadge(series: SeriesPoint[]): DivergenceBadge {
  const n = series.length;
  if (n < 2) {
    return {
      label: "No signal",
      tone: "neutral",
      kind: "near",
      detail: "Not enough points to compare MA7 vs MA30.",
      relDiff: null,
      streakDays: null,
    };
  }

  const last = series[n - 1];
  const m7 = last.ma7;
  const m30 = last.ma30;

  if (m7 === null || m30 === null || !Number.isFinite(m7) || !Number.isFinite(m30) || m30 === 0) {
    return {
      label: "No MA overlap",
      tone: "neutral",
      kind: "near",
      detail: "MA windows do not fully overlap in the selected window.",
      relDiff: null,
      streakDays: null,
    };
  }

  const rel = (m7 - m30) / Math.abs(m30);

  const sign = m7 >= m30 ? 1 : -1;
  let streak = 0;
  for (let i = n - 1; i >= 0; i--) {
    const a = series[i].ma7;
    const b = series[i].ma30;
    if (a === null || b === null || !Number.isFinite(a) || !Number.isFinite(b)) break;
    const s = a >= b ? 1 : -1;
    if (s !== sign) break;
    streak += 1;
  }

  const abs = Math.abs(rel);
  if (abs >= 0.25) {
    return {
      label: "Diverging",
      tone: "warn",
      kind: "diverging",
      detail: "MA7 is far from MA30 (strong short-term divergence vs baseline).",
      relDiff: rel,
      streakDays: streak,
    };
  }
  if (abs >= 0.12) {
    return {
      label: "Watch",
      tone: "neutral",
      kind: "watch",
      detail: "MA7 is meaningfully different from MA30 (possible regime transition).",
      relDiff: rel,
      streakDays: streak,
    };
  }
  return {
    label: "Aligned",
    tone: "neutral",
    kind: "near",
    detail: "MA7 and MA30 are close (short-term signal aligned with baseline).",
    relDiff: rel,
    streakDays: streak,
  };
}

type MetaGateStatus = "ok" | "insufficient_data" | "degraded" | "unknown";

type MetaGate = {
  status: MetaGateStatus;
  confidence: number | null;
  threshold: number;
  reason: string;
};

function computeMetaGate(meta: any, threshold: number): MetaGate {
  const confidence = safeNum(meta?.confidence?.confidence_score);
  const t = typeof threshold === "number" && Number.isFinite(threshold) ? threshold : 0.4;

  if (confidence === null) {
    return { status: "unknown", confidence: null, threshold: t, reason: "META confidence_score is missing." };
  }

  if (confidence < t) {
    return {
      status: "insufficient_data",
      confidence,
      threshold: t,
      reason: "META confidence_score is below the gating threshold.",
    };
  }

  const dq = meta?.confidence?.data_quality;
  const dqFlag =
    typeof dq === "string"
      ? dq.toLowerCase()
      : typeof meta?.confidence?.quality_flag === "string"
        ? meta.confidence.quality_flag.toLowerCase()
        : null;

  if (dqFlag && (dqFlag.includes("degrad") || dqFlag.includes("warn"))) {
    return { status: "degraded", confidence, threshold: t, reason: "META indicates degraded data quality." };
  }

  return { status: "ok", confidence, threshold: t, reason: "Confidence gate passed." };
}

function gateReasonLabel(g: MetaGate) {
  switch (g.status) {
    case "ok":
      return "confidence is above threshold";
    case "insufficient_data":
      return "confidence is below threshold";
    case "degraded":
      return "data quality is degraded";
    case "unknown":
    default:
      return "confidence is missing/unknown";
  }
}

type HeadlineVerdict =
  | { verdict: "NOISE"; canonicalLabel: string | null; why: string }
  | { verdict: "REGIME_CHANGE"; canonicalLabel: string | null; why: string }
  | { verdict: "INSUFFICIENT_DATA"; canonicalLabel: string | null; why: string };

function verdictFromMeta(meta: any, gate: MetaGate): HeadlineVerdict {
  const canonicalLabel = typeof meta?.regime?.label === "string" ? meta.regime.label : null;

  if (gate.status !== "ok") {
    return { verdict: "INSUFFICIENT_DATA", canonicalLabel, why: `Confidence gate not OK (${gate.status}).` };
  }

  const shift = meta?.regime?.is_regime_shift;
  const isShift = typeof shift === "boolean" ? shift : false;

  if (isShift) {
    return { verdict: "REGIME_CHANGE", canonicalLabel, why: "META indicates a regime shift (rule-based)." };
  }

  return { verdict: "NOISE", canonicalLabel, why: "META indicates no regime shift (rule-based)." };
}

function verdictLabel(v: HeadlineVerdict["verdict"]) {
  switch (v) {
    case "REGIME_CHANGE":
      return "Structural shift";
    case "NOISE":
      return "Mostly noise";
    case "INSUFFICIENT_DATA":
    default:
      return "Insufficient data";
  }
}

function verdictTone(v: HeadlineVerdict["verdict"]): "neutral" | "warn" {
  return v === "INSUFFICIENT_DATA" ? "warn" : "neutral";
}

function readMetaDrivers(meta: any): any[] {
  const d = meta?.regime?.drivers;
  if (Array.isArray(d)) return d;
  const d2 = meta?.regime?.driver_signals;
  if (Array.isArray(d2)) return d2;
  return [];
}

function driverSnippet(x: any) {
  const metric = typeof x?.metric === "string" ? x.metric : typeof x?.name === "string" ? x.name : null;
  const tag = typeof x?.tag === "string" ? x.tag : typeof x?.label === "string" ? x.label : null;
  const score = safeNum(x?.score);
  if (!metric && !tag) return "";
  const parts: string[] = [];
  parts.push(metric ?? tag ?? "driver");
  if (tag && metric && tag !== metric) parts.push(tag);
  if (score !== null) parts.push(`score ${fmtNum(score, 2)}`);
  return parts.join(": ");
}

function microInsight(args: { div: DivergenceBadge; dailyVs7: number | null; pct: number | null; z: number | null }) {
  const parts: string[] = [];
  parts.push(args.div.detail);

  if (args.dailyVs7 !== null && Number.isFinite(args.dailyVs7)) {
    const abs = Math.abs(args.dailyVs7);
    if (abs >= 0.2) parts.push(`daily is ${formatSignedPct(args.dailyVs7)} vs MA7`);
  }

  if (args.pct !== null) parts.push(`high percentile in-window - ${args.pct}th`);
  if (args.z !== null) {
    const abs = Math.abs(args.z);
    if (abs >= 2.0) parts.push("extreme deviation");
    else if (abs >= 1.0) parts.push("mild deviation");
  }

  return parts.join("; ") + ".";
}

function normalizeShared(vals: (number | null)[]) {
  return normalize(vals);
}

function pathShared(vals: (number | null)[], w: number, h: number, pad: number, min: number, max: number) {
  return pathForSeries(vals, w, h, pad, min, max).d;
}

function areaShared(vals: (number | null)[], w: number, h: number, pad: number, min: number, max: number) {
  return areaUnderSeries(vals, w, h, pad, min, max).d;
}

export function ChainHeroCard(props: { chain: ChainId }) {
  const chain = props.chain;

  const { data: hero, isLoading: heroLoading } = useLandingHero(chain);

  const signature = useMemo(() => pickHeroSignature(chain), [chain]);
  const ds = useDatasetIndex() as any;
  const index = ds?.index ?? ds?.data ?? ds ?? null;

  const windows = useMemo(() => [30, 90, 180, 365], []);
  const [active, setActiveWindow] = useState<number>(180);

  const ACC = chainAccent(chain);

  const goldLatest = useMemo(() => {
    const c = index?.chains?.[chain];
    const latest = c?.gold?.latest ?? c?.derived?.latest ?? c?.meta?.latest ?? null;
    return typeof latest === "string" && isValidISODate(latest) ? latest : null;
  }, [chain, index]);

  const endDate = useMemo(() => (goldLatest ? goldLatest : (hero as any)?.asof?.gold ?? null), [goldLatest, hero]);
  const end = typeof endDate === "string" && isValidISODate(endDate) ? endDate : null;

  const start = useMemo(() => {
    if (!end) return null;
    const d = new Date(end + "T00:00:00Z");
    if (Number.isNaN(d.getTime())) return null;
    const ms = d.getTime() - (active - 1) * 24 * 60 * 60 * 1000;
    const s = new Date(ms);
    const yy = s.getUTCFullYear();
    const mm = String(s.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(s.getUTCDate()).padStart(2, "0");
    return `${yy}-${mm}-${dd}`;
  }, [end, active]);

  const seriesUrl = useMemo(() => {
    if (!start || !end) return null;
    return `/api/series?chain=${chain}&metric=${signature.y}&start=${start}&end=${end}`;
  }, [chain, end, signature.y, start]);

  const summaryUrl = useMemo(() => {
    if (!start || !end) return null;
    return `/api/summary?chain=${chain}&metric=${signature.y}&start=${start}&end=${end}`;
  }, [chain, end, signature.y, start]);

  // ✅ SWR typing fix: stable fetchers; key null disables fetch automatically.
  const { data: seriesRes, isLoading: goldLoading } = useSWR<any>(
    seriesUrl ?? null,
    (url: string) => fetchJsonOrNull(url),
    { revalidateOnFocus: false }
  );

  const { data: summaryRes, isLoading: summaryLoading } = useSWR<SummaryResponse | null>(
    summaryUrl ?? null,
    (url: string) => fetchJsonOrNull(url) as Promise<SummaryResponse | null>,
    { revalidateOnFocus: false }
  );

  const series = useMemo<SeriesPoint[]>(() => {
    const rows = Array.isArray(seriesRes?.rows) ? seriesRes.rows : [];
    const out: SeriesPoint[] = [];
    for (const r of rows) {
      const date = typeof r?.date === "string" ? r.date : null;
      if (!date) continue;
      out.push({
        date,
        daily: safeNum(r?.daily),
        ma7: safeNum(r?.ma7),
        ma30: safeNum(r?.ma30),
      });
    }
    return out;
  }, [seriesRes]);

  const activeSeries = useMemo(() => series, [series]);

  const dailyVals = useMemo(() => activeSeries.map((r) => r.daily), [activeSeries]);
  const ma7Vals = useMemo(() => activeSeries.map((r) => r.ma7), [activeSeries]);
  const ma30Vals = useMemo(() => activeSeries.map((r) => r.ma30), [activeSeries]);

  const divBadge = useMemo(() => computeDivergenceBadge(activeSeries), [activeSeries]);
  const pal = useMemo(() => paletteFor(chain), [chain]);

  const lastRead = useMemo(() => {
    const last = summaryRes?.current?.daily ?? null;
    const m7 = summaryRes?.current?.ma7 ?? null;
    const pct = summaryRes?.level?.percentile ?? null;

    const dailyVs7 =
      last !== null && m7 !== null && typeof last === "number" && typeof m7 === "number" && m7 !== 0
        ? (last - m7) / Math.abs(m7)
        : null;

    const pctInt = pct !== null && typeof pct === "number" && Number.isFinite(pct) ? Math.round(pct) : null;

    return { dailyVs7, pct: pctInt, z: null as number | null };
  }, [summaryRes]);

  const metaGate = useMemo(() => computeMetaGate((hero as any)?.meta, (hero as any)?.threshold?.gating ?? 0.4), [hero]);
  const headlineVerdict = useMemo(() => verdictFromMeta((hero as any)?.meta, metaGate), [hero, metaGate]);
  const headlineTone = useMemo(() => (headlineVerdict.verdict === "INSUFFICIENT_DATA" ? "warn" : "neutral"), [headlineVerdict.verdict]);

  const whyDrivers = useMemo(() => {
    const d = readMetaDrivers((hero as any)?.meta);
    if (!d.length) return "—";
    const top = d.slice(0, 2).map(driverSnippet).filter(Boolean);
    return top.length ? top.join(" · ") : "—";
  }, [hero]);

  const W = 680;
  const H = 240;
  const PAD = 22;

  const sharedMM = useMemo(() => {
    const xs = [...dailyVals, ...ma7Vals, ...ma30Vals];
    const { min, max } = normalizeShared(xs);
    return { min, max };
  }, [dailyVals, ma7Vals, ma30Vals]);

  const min = sharedMM.min;
  const max = sharedMM.max;

  const dDaily = pathShared(dailyVals, W, H, PAD, min, max);
  const dMa7 = pathShared(ma7Vals, W, H, PAD, min, max);
  const dMa30 = pathShared(ma30Vals, W, H, PAD, min, max);
  const dArea = areaShared(ma30Vals, W, H, PAD, min, max);

  const hasAny = !!(dDaily || dMa7 || dMa30);

  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const n = series.length;
  const dx = n <= 1 ? 0 : (W - PAD * 2) / (n - 1);

  function onMove(e: React.MouseEvent) {
    if (!wrapRef.current || n <= 0) return;
    const rect = wrapRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const t = rect.width > 0 ? x / rect.width : 0;
    const raw = PAD + t * (W - PAD * 2);
    const i = Math.round((raw - PAD) / dx);
    setHoverIdx(Math.max(0, Math.min(n - 1, i)));
  }

  function onLeave() {
    setHoverIdx(null);
  }

  const hover = hoverIdx === null ? null : series[hoverIdx];
  const xHover = hoverIdx === null ? null : PAD + hoverIdx * dx;

  const insight = microInsight({
    div: divBadge,
    dailyVs7: lastRead?.dailyVs7 ?? null,
    pct: lastRead?.pct ?? null,
    z: null,
  });

  const windowsLabel = useMemo(() => {
    const s = series.length ? series[0].date : null;
    const e = series.length ? series[series.length - 1].date : null;
    if (!s || !e) return `${active}d`;
    return `${s} → ${e}`;
  }, [series, active]);

  return (
    <div className="group">
      <div
        className={[
          "ui-card ui-lift p-6 md:p-7",
          "border border-ui-border/12",
          "shadow-[0_0_0_1px_rgb(var(--border)/0.10),0_28px_90px_rgb(0_0_0/0.55)]",
        ].join(" ")}
        style={{
          background:
            `radial-gradient(900px 420px at 18% 0%, rgb(${ACC} / 0.22), transparent 60%),` +
            `radial-gradient(700px 360px at 88% 30%, rgb(${ACC} / 0.10), transparent 55%),` +
            `linear-gradient(180deg, rgb(var(--bg) / 0.35), rgb(var(--bg) / 0.10))`,
        }}
      >
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <div>
                <div className="text-2xl font-semibold text-ui-text">{titleChain(chain)}</div>
                <div className="mt-1 text-sm text-ui-muted">{chainTagline(chain)}</div>
              </div>

              <span className="hidden md:inline-flex h-9 w-[1px] bg-ui-border/15" aria-hidden="true" />

              <div className="flex flex-wrap items-center gap-2">
                <HeroPill>Price-agnostic</HeroPill>
                <HeroPill>Updated daily</HeroPill>

                <HeroPill tone={verdictTone(headlineVerdict.verdict)}>{`Verdict: ${verdictLabel(headlineVerdict.verdict)}`}</HeroPill>

                {headlineVerdict.canonicalLabel ? (
                  <HeroPill tone={headlineTone}>{`Regime: ${headlineVerdict.canonicalLabel}`}</HeroPill>
                ) : (
                  <HeroPill>Regime: —</HeroPill>
                )}

                <HeroPill tone={metaGate.status === "ok" ? "neutral" : "warn"}>
                  {`Confidence: ${metaGate.confidence !== null ? fmtNum(metaGate.confidence, 3) : "—"}`}
                </HeroPill>

                <HeroPill tone={metaGate.status === "ok" ? "neutral" : "warn"}>{`Gate: ${String(metaGate.status).toUpperCase()}`}</HeroPill>

                <HeroPill tone={metaGate.status === "ok" ? "neutral" : "warn"}>{`Threshold used: ${fmtNum(metaGate.threshold, 2)}`}</HeroPill>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-ui-border/10 bg-ui-bg/10 px-4 py-3 text-sm text-ui-muted shadow-[0_0_0_1px_rgb(var(--border)/0.08),0_16px_55px_rgb(0_0_0/0.32)]">
              <span className="font-semibold text-ui-text">What we see:</span>{" "}
              <span className="text-ui-text">{insight}</span>
            </div>

            <div className="mt-2 text-xs text-ui-faint leading-relaxed">
              Why (META drivers): <span className="text-ui-muted">{whyDrivers}</span>
            </div>

            {metaGate.status !== "ok" ? (
              <div className="mt-3 text-xs text-ui-faint leading-relaxed">
                Gate note: headline regime is shown as <span className="font-semibold text-ui-muted">UNKNOWN/DEGRADED</span> because{" "}
                <span className="font-semibold text-ui-muted">{gateReasonLabel(metaGate)}</span>.
              </div>
            ) : null}
          </div>

          <div className="flex items-center justify-between gap-3 md:flex-col md:items-end md:justify-start">
            {heroLoading ? (
              <div className="text-xs text-ui-faint">Loading…</div>
            ) : (
              <WindowToggle windows={windows} active={active} onChange={setActiveWindow} />
            )}
            <div className="text-[11px] text-ui-faint">
              as-of (gold): <span className="text-ui-muted">{(hero as any)?.asof?.gold ?? "—"}</span>
            </div>
          </div>
        </div>

        <div className="mt-5 rounded-[22px] border border-ui-border/10 bg-ui-bg/10 p-4 shadow-[0_0_0_1px_rgb(var(--border)/0.08),0_24px_70px_rgb(0_0_0/0.40)]">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-ui-text">
                Chart: <span className="text-ui-muted">{signature.title}</span>{" "}
                <span className="text-ui-faint font-normal">({signature.y})</span>
              </div>
              <div className="mt-1 text-[12px] text-ui-muted">
                Read it as <span className="text-ui-text">Daily</span> (noise) vs <span className="text-ui-text">MA7</span> vs{" "}
                <span className="text-ui-text">MA30</span>.
              </div>
            </div>

            <div className="text-[11px] text-ui-faint">
              Window: <span className="text-ui-muted">{active}d</span>
            </div>
          </div>

          <div className="mt-3 rounded-2xl border border-ui-border/10 bg-ui-bg/10 p-3">
            {heroLoading || goldLoading ? (
              <div className="flex h-[210px] items-center justify-center text-sm text-ui-faint">Loading…</div>
            ) : !hasAny ? (
              <div className="flex h-[210px] items-center justify-center text-sm text-ui-faint">No chart data.</div>
            ) : (
              <div ref={wrapRef} className="relative select-none" onMouseMove={onMove} onMouseLeave={onLeave}>
                <svg viewBox={`0 0 ${W} ${H}`} className="h-[210px] w-full">
                  <defs>
                    <linearGradient id={`area-${chain}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={pal.a} />
                      <stop offset="100%" stopColor={pal.b} />
                    </linearGradient>
                  </defs>

                  <path d={dArea} fill={`url(#area-${chain})`} />

                  <path d={dDaily} fill="none" stroke={pal.stroke} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />

                  <path d={dMa7} fill="none" stroke="rgb(0 0 0 / 0.45)" strokeWidth="6" strokeLinecap="round" opacity="0.55" />
                  <path d={dMa7} fill="none" stroke={pal.ma7} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

                  <path d={dMa30} fill="none" stroke="rgb(0 0 0 / 0.45)" strokeWidth="6.6" strokeLinecap="round" opacity="0.55" />
                  <path d={dMa30} fill="none" stroke={pal.ma30} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />

                  {hover && xHover !== null ? (
                    <>
                      <line x1={xHover} y1={PAD} x2={xHover} y2={H - PAD} stroke="rgb(var(--border) / 0.18)" strokeWidth="2" />
                      <circle
                        cx={xHover}
                        cy={hover.ma7 !== null && Number.isFinite(hover.ma7) ? mapY(hover.ma7, min, max, H, PAD) : H - PAD}
                        r="6"
                        fill={pal.ma7}
                      />
                      <circle
                        cx={xHover}
                        cy={hover.ma30 !== null && Number.isFinite(hover.ma30) ? mapY(hover.ma30, min, max, H, PAD) : H - PAD}
                        r="6"
                        fill={pal.ma30}
                      />
                    </>
                  ) : null}
                </svg>
              </div>
            )}
          </div>

          <div className="mt-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <HeroPill tone={divBadge.tone}>{divBadge.label}</HeroPill>
              {divBadge.relDiff != null && Number.isFinite(divBadge.relDiff) ? (
                <HeroPill tone={divBadge.tone}>MA7 vs MA30: {formatSignedPct(divBadge.relDiff)}</HeroPill>
              ) : null}
              {divBadge.kind !== "near" && divBadge.streakDays != null ? (
                <HeroPill tone={divBadge.tone}>streak: {divBadge.streakDays}d</HeroPill>
              ) : null}

              {lastRead?.pct != null ? <HeroPill>Percentile: p{lastRead.pct}</HeroPill> : null}
            </div>

            <div className="text-[11px] text-ui-faint">
              Window: <span className="text-ui-muted">{windowsLabel}</span> · {summaryLoading ? "Loading…" : "summary ready"}
            </div>
          </div>
        </div>

        {/* web6 §4.1: CTA links including direct TrustSection entry */}
        <div className="mt-5 flex items-center justify-between">
          <div className="flex flex-wrap items-center gap-3 text-xs text-ui-faint">
            <Link
              href={`/chains/${chain}`}
              className="rounded-full border border-ui-border/15 bg-ui-bg/10 px-3 py-1 font-semibold text-ui-muted hover:bg-ui-bg/15"
            >
              Open dashboard
            </Link>
            <Link
              href={`/chains/${chain}#trust`}
              className="rounded-full border border-ui-border/15 bg-ui-bg/10 px-3 py-1 font-semibold text-ui-muted hover:bg-ui-bg/15"
            >
              View history
            </Link>
          </div>
          <div className="text-xs text-ui-faint">Descriptive only</div>
        </div>
      </div>
    </div>
  );
}