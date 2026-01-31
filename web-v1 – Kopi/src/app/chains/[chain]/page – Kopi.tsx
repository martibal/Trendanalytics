// web-v1/src/app/chains/[chain]/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import MetricChart from "@/components/MetricChart";
import {
  type MetricKey,
  metricExplainForChain,
  metricFormatForChain,
  metricTitleForChain,
  metricUnitForChain,
  orderedMetricKeysForChain,
  CHAINS,
} from "@/lib/metricRegistry";

type Chain = "bitcoin" | "ethereum" | "arbitrum" | "base";
type ExplainMode = "Basic" | "Advanced";

type Dataset = {
  dataset_id: string;
  revision_id: number;
  computed_at_utc: string;
  windows_supported: number[];
  supported_chains: Chain[];
  notes?: string[];
};

type GoldRow = {
  chain: string;
  date: string; // YYYY-MM-DD
  [k: string]: any;
};

type GoldManifest = {
  asof?: string; // YYYY-MM-DD
  available_days?: number;
};

type MetaLatest = {
  updated_through?: string; // YYYY-MM-DD
  publish_lag_days_policy?: number;
  confidence?: {
    confidence_score?: number;
    lag_days_vs_utc_today?: number;
    date?: string;
  };
  profile?: {
    hidden_metrics?: string[];
  };
};


const DATA_BASE = process.env.NEXT_PUBLIC_DATA_BASE_URL || "/data/published/v1";

// ---------- small utils ----------
function isChain(x: any): x is Chain {
  return x === "bitcoin" || x === "ethereum" || x === "arbitrum" || x === "base";
}

function toNumberOrNull(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function fmtDateUtc(d: string): string {
  return d;
}

function ymdNowUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysBetweenUtcYmd(a: string, b: string): number {
  const da = Date.parse(`${a}T00:00:00Z`);
  const db = Date.parse(`${b}T00:00:00Z`);
  if (!Number.isFinite(da) || !Number.isFinite(db)) return 0;
  return Math.max(0, Math.round((db - da) / 86400000));
}

function safeKeys(row: Record<string, any> | null | undefined): string[] {
  return Object.keys(row ?? {}).filter((k) => k !== "chain" && k !== "date");
}


type MetricCard = {
  key: MetricKey;
  title: string;
  unit: "count" | "sec" | "native" | "pct" | "unknown";
  basic: string;
  advanced: string;
  format?: {
    decimals?: number;
    pctIsFraction?: boolean;
  };
};

function buildMetricCards(chain: Chain, keysInData: string[]): MetricCard[] {
  const ordered = orderedMetricKeysForChain(chain, keysInData as MetricKey[]);
  return ordered.map((key) => {
    const explain = metricExplainForChain(chain, key);
    return {
      key,
      title: metricTitleForChain(chain, key),
      unit: metricUnitForChain(chain, key),
      basic: explain?.basic ?? "",
      advanced: explain?.advanced ?? explain?.basic ?? "",
      format: metricFormatForChain(chain, key),
    };
  });
}

function median(nums: number[]): number | null {
  if (!nums.length) return null;
  const a = [...nums].sort((x, y) => x - y);
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}

function percentileRank(sortedAsc: number[], x: number): number {
  // sorted ascending, returns 0..100
  if (!sortedAsc.length) return NaN;
  let lo = 0;
  let hi = sortedAsc.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (sortedAsc[mid] <= x) lo = mid + 1;
    else hi = mid;
  }
  return (lo / sortedAsc.length) * 100;
}

function weekKeyFromDate(yyyyMmDd: string): string {
  // Stable 7d buckets (UTC). Not ISO week, intentionally simple and deterministic.
  const t = Date.parse(`${yyyyMmDd}T00:00:00Z`);
  const day = Math.floor(t / (1000 * 60 * 60 * 24));
  const week = Math.floor(day / 7);
  return String(week);
}

function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0;
  return Math.min(1, Math.max(0, x));
}

// ---------- shared UI helpers ----------

type Band = "lower" | "mid" | "upper";

function bandFromPercentile(p: number): Band {
  if (!Number.isFinite(p)) return "mid";
  if (p < 33.3333) return "lower";
  if (p > 66.6667) return "upper";
  return "mid";
}

function bandLabel(b: Band): string {
  if (b === "lower") return "lower historical range";
  if (b === "upper") return "upper historical range";
  return "near long-term average";
}

function MiniBand({ p }: { p: number }) {
  const left = `${clamp01(p / 100) * 100}%`;
  return (
    <div className="mt-1">
      <div className="flex items-center justify-between text-[11px] text-white/50">
        <span>Low</span>
        <span>Mid</span>
        <span>High</span>
      </div>
      <div className="relative mt-1 h-2 rounded-full border border-white/10 bg-black/30">
        <div className="absolute left-1/3 top-0 h-full w-px bg-white/15" />
        <div className="absolute left-2/3 top-0 h-full w-px bg-white/15" />
        <div
          className="absolute top-[-3px] h-4 w-2 -translate-x-1/2 rounded-sm border border-white/20 bg-white/10"
          style={{ left }}
          title={`Historical percentile: ${Number.isFinite(p) ? p.toFixed(1) : "n/a"}`}
        />
      </div>
    </div>
  );
}

// ---------- weekly series helpers ----------
type WeeklyPoint = {
  weekKey: string;
  startDate: string;
  endDate: string;
  nDays: number;
  value: number;
};

function buildWeeklyMedianSeries(rows: GoldRow[] | null, metricKey: string): WeeklyPoint[] {
  if (!rows?.length) return [];

  const byWeek = new Map<string, { dates: string[]; values: number[] }>();
  for (const r of rows) {
    const d = String(r.date ?? "");
    if (!d) continue;
    const v = toNumberOrNull(r[metricKey]);
    if (v === null) continue;

    const wk = weekKeyFromDate(d);
    const cur = byWeek.get(wk) ?? { dates: [], values: [] };
    cur.dates.push(d);
    cur.values.push(v);
    byWeek.set(wk, cur);
  }

  const points: WeeklyPoint[] = [];
  for (const [weekKey, g] of byWeek.entries()) {
    const m = median(g.values);
    if (m === null) continue;
    const dates = [...g.dates].sort();
    points.push({
      weekKey,
      startDate: dates[0],
      endDate: dates[dates.length - 1],
      nDays: dates.length,
      value: m,
    });
  }

  points.sort((a, b) => Number(a.weekKey) - Number(b.weekKey));
  return points;
}

function pickLatestCompleteishWeek(points: WeeklyPoint[]): WeeklyPoint | null {
  for (let i = points.length - 1; i >= 0; i--) {
    if (points[i].nDays >= 5) return points[i];
  }
  return null;
}

function computePercentileOf(points: WeeklyPoint[], current: WeeklyPoint): number {
  const vals = points.map((p) => p.value).filter((x) => Number.isFinite(x));
  const sorted = [...vals].sort((a, b) => a - b);
  if (!sorted.length) return NaN;
  return percentileRank(sorted, current.value);
}

function countTrailingSameLabel(labels: { weekKey: string; label: string }[]): number {
  if (!labels.length) return 0;
  const last = labels[labels.length - 1].label;
  let n = 0;
  for (let i = labels.length - 1; i >= 0; i--) {
    if (labels[i].label !== last) break;
    n++;
  }
  return n;
}

// ---------- Activity Regime + Notables ----------
type ActivityRegimeModel = {
  isVisible: boolean;

  tx: {
    current: WeeklyPoint;
    percentile: number; // 0..100
    band: Band;
  };
  addr: {
    current: WeeklyPoint;
    percentile: number; // 0..100
    band: Band;
  };

  persistedWeeks: number; // >=3 to show
  statement: string; // basic main statement
};

type NotableKind =
  | "participation_divergence"
  | "activity_compression"
  | "activity_expansion"
  | "short_term_deviation";

type NotableModel = {
  kind: NotableKind;
  title: string;
  basic: string;
  persistedWeeks: number;
  score: number;
  advanced: {
    metrics: string[];
    reference: string;
    method: string;
    duration: string;
    alternatives: string[];
  };
};

function oneLineRegimeStatement(txBand: Band, addrBand: Band): string {
  if (txBand === addrBand) {
    if (txBand === "upper") return "Activity is currently elevated relative to its own history.";
    if (txBand === "lower") return "Activity is currently subdued relative to its own history.";
    return "Activity is currently near its long-term average relative to its own history.";
  }

  if (txBand === "upper" && (addrBand === "mid" || addrBand === "lower")) {
    return "Activity is currently elevated relative to its own history, with participation closer to its long-term average.";
  }
  if (addrBand === "upper" && (txBand === "mid" || txBand === "lower")) {
    return "Participation is currently elevated relative to its own history, while transaction activity is closer to its long-term average.";
  }
  if (txBand === "lower" && (addrBand === "mid" || addrBand === "upper")) {
    return "Transaction activity is currently subdued relative to its own history, while participation is closer to its long-term average.";
  }
  if (addrBand === "lower" && (txBand === "mid" || txBand === "upper")) {
    return "Participation is currently subdued relative to its own history, while transaction activity is closer to its long-term average.";
  }
  return "Activity shows a mixed structure relative to its own history.";
}

function computePersistenceRegimeLabels(
  txSeries: WeeklyPoint[],
  addrSeries: WeeklyPoint[],
  maxLookback = 24
): { labels: { weekKey: string; label: string }[] } {
  const addrByWeek = new Map(addrSeries.map((p) => [p.weekKey, p]));
  const txByWeek = new Map(txSeries.map((p) => [p.weekKey, p]));

  const weeks = Array.from(
    new Set([...txSeries.map((p) => p.weekKey), ...addrSeries.map((p) => p.weekKey)])
  ).sort((a, b) => Number(a) - Number(b));

  const labels: { weekKey: string; label: string }[] = [];
  for (let i = Math.max(0, weeks.length - maxLookback); i < weeks.length; i++) {
    const wk = weeks[i];
    const tx = txByWeek.get(wk);
    const ad = addrByWeek.get(wk);
    if (!tx || !ad) continue;
    if (tx.nDays < 5 || ad.nDays < 5) continue;

    const txHist = txSeries.filter((p) => Number(p.weekKey) <= Number(wk));
    const adHist = addrSeries.filter((p) => Number(p.weekKey) <= Number(wk));
    const txPct = computePercentileOf(txHist, tx);
    const adPct = computePercentileOf(adHist, ad);
    const txBand = bandFromPercentile(txPct);
    const adBand = bandFromPercentile(adPct);

    const label = `${txBand}|${adBand}`;
    labels.push({ weekKey: wk, label });
  }

  return { labels };
}

function computeActivityRegime(rows: GoldRow[] | null): { regime: ActivityRegimeModel | null; notables: NotableModel[] } {
  const txSeries = buildWeeklyMedianSeries(rows, "tx_count_daily");
  const addrSeries = buildWeeklyMedianSeries(rows, "unique_active_addresses");

  const txCur = pickLatestCompleteishWeek(txSeries);
  const adCur = pickLatestCompleteishWeek(addrSeries);
  if (!txCur || !adCur) return { regime: null, notables: [] };

  const txPct = computePercentileOf(txSeries, txCur);
  const adPct = computePercentileOf(addrSeries, adCur);
  const txBand = bandFromPercentile(txPct);
  const adBand = bandFromPercentile(adPct);

  const { labels } = computePersistenceRegimeLabels(txSeries, addrSeries, 24);
  const persistedWeeks = countTrailingSameLabel(labels);

  const statement = oneLineRegimeStatement(txBand, adBand);

  const regime: ActivityRegimeModel = {
    isVisible: persistedWeeks >= 3,
    tx: { current: txCur, percentile: txPct, band: txBand },
    addr: { current: adCur, percentile: adPct, band: adBand },
    persistedWeeks,
    statement,
  };

  const notables: NotableModel[] = [];
  if (!regime.isVisible) return { regime, notables };

  const addrByWeek = new Map(addrSeries.map((p) => [p.weekKey, p]));
  const txByWeek = new Map(txSeries.map((p) => [p.weekKey, p]));
  const commonWeeks = Array.from(
    new Set(txSeries.map((p) => p.weekKey).filter((wk) => addrByWeek.has(wk)))
  ).sort((a, b) => Number(a) - Number(b));

  const ratioSeries: { weekKey: string; ratio: number }[] = [];
  for (const wk of commonWeeks) {
    const tx = txByWeek.get(wk)!;
    const ad = addrByWeek.get(wk)!;
    if (tx.nDays < 5 || ad.nDays < 5) continue;
    if (ad.value <= 0) continue;
    ratioSeries.push({ weekKey: wk, ratio: tx.value / ad.value });
  }

  const ratioVals = ratioSeries.map((x) => x.ratio).filter((x) => Number.isFinite(x));
  const ratioSorted = [...ratioVals].sort((a, b) => a - b);

  const lastWk = labels.length ? labels[labels.length - 1].weekKey : null;
  if (!lastWk) return { regime, notables };

  const divergenceNow = Math.abs(txPct - adPct);
  if (divergenceNow >= 25) {
    notables.push({
      kind: "participation_divergence",
      title: "Participation divergence",
      basic:
        "Address participation has diverged from transaction activity, relative to their own historical relationship.",
      persistedWeeks: Math.min(persistedWeeks, 12),
      score: divergenceNow,
      advanced: {
        metrics: ["tx_count_daily", "unique_active_addresses"],
        reference: `Weekly distribution since ${txSeries[0]?.startDate ?? "start of available history"}`,
        method:
          "Compare percentile positions of weekly transaction activity vs weekly address participation within their own historical distributions.",
        duration: `Observed alongside the current activity regime (persisted ${persistedWeeks} weeks).`,
        alternatives: ["Application batching", "Exchange or bridge behavior", "Wallet/address pattern changes"],
      },
    });
  }

  const ratioNowEntry = ratioSeries.find((x) => x.weekKey === lastWk) ?? ratioSeries[ratioSeries.length - 1];
  if (ratioNowEntry && ratioSorted.length >= 20) {
    const ratioPct = percentileRank(ratioSorted, ratioNowEntry.ratio);
    const ratioSide = (p: number) => (p >= 80 ? "high" : p <= 20 ? "low" : "mid");
    const last2 = ratioSeries.slice(-2);
    const last2Pcts = last2.map((r) => percentileRank(ratioSorted, r.ratio));
    const persisted2 = last2Pcts.length === 2 && ratioSide(last2Pcts[0]) === ratioSide(last2Pcts[1]);

    if (ratioPct >= 80 && persisted2) {
      notables.push({
        kind: "activity_compression",
        title: "Activity compression",
        basic: "Transaction activity is more concentrated across fewer addresses than is typical for this activity regime.",
        persistedWeeks: 2,
        score: ratioPct,
        advanced: {
          metrics: ["tx_count_daily", "unique_active_addresses"],
          reference: `Weekly distribution since ${txSeries[0]?.startDate ?? "start of available history"}`,
          method:
            "Assess the weekly ratio of transactions to active addresses and place it within its own historical percentile distribution.",
          duration: "Persisted for at least 2 weeks.",
          alternatives: ["Application batching", "Contract-mediated activity", "Exchange consolidation patterns"],
        },
      });
    } else if (ratioPct <= 20 && persisted2) {
      notables.push({
        kind: "activity_expansion",
        title: "Activity expansion",
        basic: "Address participation has broadened while overall transaction activity remains stable, relative to recent history.",
        persistedWeeks: 2,
        score: 100 - ratioPct,
        advanced: {
          metrics: ["tx_count_daily", "unique_active_addresses"],
          reference: `Weekly distribution since ${txSeries[0]?.startDate ?? "start of available history"}`,
          method:
            "Assess the weekly ratio of transactions to active addresses and place it within its own historical percentile distribution (low ratio implies broader participation per unit activity).",
          duration: "Persisted for at least 2 weeks.",
          alternatives: ["Wallet/address behavior shifts", "Application mix changes", "Bridge or onboarding campaigns"],
        },
      });
    } else {
      if ((ratioPct >= 90 || ratioPct <= 10) && !persisted2) {
        notables.push({
          kind: "short_term_deviation",
          title: "Short-term deviation (bounded)",
          basic:
            "The activity-to-participation relationship briefly moved outside its recent historical range, without persistence.",
          persistedWeeks: 1,
          score: Math.max(ratioPct, 100 - ratioPct),
          advanced: {
            metrics: ["tx_count_daily", "unique_active_addresses"],
            reference: `Weekly distribution since ${txSeries[0]?.startDate ?? "start of available history"}`,
            method:
              "Check whether the weekly transactions-per-active-address ratio is in an extreme historical percentile, and whether that extremeness persists for at least 2 weeks.",
            duration: "Observed for 1 week without persistence.",
            alternatives: ["Single-week event effects", "Batching cadence changes", "Sampling/missingness artifacts"],
          },
        });
      }
    }
  }

  notables.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.kind.localeCompare(b.kind);
  });

  return { regime, notables: notables.slice(0, 2) };
}

// ---------- Fee / Capacity Regime + Notables ----------
type FeeCapacityRegimeModel = {
  isVisible: boolean;

  fee: {
    current: WeeklyPoint;
    percentile: number; // 0..100
    band: Band;
  };
  util: {
    current: WeeklyPoint;
    percentile: number; // 0..100
    band: Band;
  };

  persistedWeeks: number;
  statement: string;
};

type FeeNotableKind = "fee_util_divergence" | "short_term_fee_deviation";

type FeeNotableModel = {
  kind: FeeNotableKind;
  title: string;
  basic: string;
  persistedWeeks: number;
  score: number;
  advanced: {
    metrics: string[];
    reference: string;
    method: string;
    duration: string;
    alternatives: string[];
  };
};

function oneLineFeeCapacityStatement(feeBand: Band, utilBand: Band): string {
  if (feeBand === utilBand) {
    if (feeBand === "upper") return "Fees and capacity usage are currently elevated relative to their own history.";
    if (feeBand === "lower") return "Fees and capacity usage are currently subdued relative to their own history.";
    return "Fees and capacity usage are currently near their long-term average relative to their own history.";
  }

  if (feeBand === "upper" && (utilBand === "mid" || utilBand === "lower")) {
    return "Fees are currently elevated relative to their own history, while capacity usage is closer to its long-term average.";
  }
  if (utilBand === "upper" && (feeBand === "mid" || feeBand === "lower")) {
    return "Capacity usage is currently elevated relative to its own history, while fees are closer to their long-term average.";
  }
  if (feeBand === "lower" && (utilBand === "mid" || utilBand === "upper")) {
    return "Fees are currently subdued relative to their own history, while capacity usage is closer to its long-term average.";
  }
  if (utilBand === "lower" && (feeBand === "mid" || feeBand === "upper")) {
    return "Capacity usage is currently subdued relative to its own history, while fees are closer to their long-term average.";
  }
  return "Fees and capacity usage show a mixed structure relative to their own history.";
}

function computePersistenceBandPair(
  aSeries: WeeklyPoint[],
  bSeries: WeeklyPoint[],
  maxLookback = 24
): { labels: { weekKey: string; label: string }[] } {
  const aByWeek = new Map(aSeries.map((p) => [p.weekKey, p]));
  const bByWeek = new Map(bSeries.map((p) => [p.weekKey, p]));
  const weeks = Array.from(new Set([...aSeries.map((p) => p.weekKey), ...bSeries.map((p) => p.weekKey)])).sort(
    (x, y) => Number(x) - Number(y)
  );

  const labels: { weekKey: string; label: string }[] = [];
  for (let i = Math.max(0, weeks.length - maxLookback); i < weeks.length; i++) {
    const wk = weeks[i];
    const a = aByWeek.get(wk);
    const b = bByWeek.get(wk);
    if (!a || !b) continue;
    if (a.nDays < 5 || b.nDays < 5) continue;

    const aHist = aSeries.filter((p) => Number(p.weekKey) <= Number(wk));
    const bHist = bSeries.filter((p) => Number(p.weekKey) <= Number(wk));
    const aPct = computePercentileOf(aHist, a);
    const bPct = computePercentileOf(bHist, b);

    const aBand = bandFromPercentile(aPct);
    const bBand = bandFromPercentile(bPct);
    labels.push({ weekKey: wk, label: `${aBand}|${bBand}` });
  }

  return { labels };
}

function computeFeeCapacityRegime(rows: GoldRow[] | null): { regime: FeeCapacityRegimeModel | null; notables: FeeNotableModel[] } {
  const feeSeries = buildWeeklyMedianSeries(rows, "median_tx_fee_native");
  const utilSeries = buildWeeklyMedianSeries(rows, "gas_utilization_pct");

  // Coverage guard (last ~6 weeks): avoid notables when one input is effectively missing.
  const last6Fee = feeSeries.slice(-6);
  const last6Util = utilSeries.slice(-6);
  const feeOk = last6Fee.filter((p) => p.nDays >= 5).length >= 4;
  const utilOk = last6Util.filter((p) => p.nDays >= 5).length >= 4;
  const coverageOk = feeOk && utilOk;

  const feeCur = pickLatestCompleteishWeek(feeSeries);
  const utilCur = pickLatestCompleteishWeek(utilSeries);
  if (!feeCur || !utilCur) return { regime: null, notables: [] };

  const feePct = computePercentileOf(feeSeries, feeCur);
  const utilPct = computePercentileOf(utilSeries, utilCur);

  const feeBand = bandFromPercentile(feePct);
  const utilBand = bandFromPercentile(utilPct);

  const { labels } = computePersistenceBandPair(feeSeries, utilSeries, 24);
  const persistedWeeks = countTrailingSameLabel(labels);

  const regime: FeeCapacityRegimeModel = {
    isVisible: persistedWeeks >= 3,
    fee: { current: feeCur, percentile: feePct, band: feeBand },
    util: { current: utilCur, percentile: utilPct, band: utilBand },
    persistedWeeks,
    statement: oneLineFeeCapacityStatement(feeBand, utilBand),
  };

  const notables: FeeNotableModel[] = [];
  if (!regime.isVisible) return { regime, notables };

  // If coverage is weak, show regime but do not produce notables.
  if (!coverageOk) return { regime, notables };

  const divergence = Math.abs(feePct - utilPct);
  if (Number.isFinite(divergence) && divergence >= 25) {
    notables.push({
      kind: "fee_util_divergence",
      title: "Fee–capacity divergence",
      basic: "Fees and capacity usage have diverged relative to their own historical relationship.",
      persistedWeeks: Math.min(persistedWeeks, 12),
      score: divergence,
      advanced: {
        metrics: ["median_tx_fee_native", "gas_utilization_pct"],
        reference: `Weekly distribution since ${feeSeries[0]?.startDate ?? "start of available history"}`,
        method:
          "Compare percentile positions of weekly median fees vs weekly gas utilization within their own historical distributions.",
        duration: `Observed alongside the current fee/capacity regime (persisted ${persistedWeeks} weeks).`,
        alternatives: [
          "Changes in transaction composition (more/less gas-heavy activity)",
          "Fee-market dynamics independent of utilization",
          "Data aggregation or unit/scale artifacts",
        ],
      },
    });
  }

  if (feePct >= 90 || feePct <= 10) {
    notables.push({
      kind: "short_term_fee_deviation",
      title: "Short-term fee deviation (bounded)",
      basic: "Median fees briefly moved outside their recent historical range, without indicating a regime shift.",
      persistedWeeks: 1,
      score: Math.max(feePct, 100 - feePct),
      advanced: {
        metrics: ["median_tx_fee_native"],
        reference: `Weekly distribution since ${feeSeries[0]?.startDate ?? "start of available history"}`,
        method:
          "Identify whether the current weekly median fee sits in an extreme historical percentile band while the fee/capacity regime remains stable via persistence rules.",
        duration: "Observed for the latest week (bounded; not persistent as a regime change).",
        alternatives: ["Short-lived congestion episodes", "Fee-market parameter changes", "Sampling/missingness artifacts"],
      },
    });
  }

  notables.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.kind.localeCompare(b.kind);
  });

  return { regime, notables: notables.slice(0, 2) };
}

// ---------- Page ----------
export default function ChainPage() {
  const params = useParams();
  const router = useRouter();

  const routeChain = useMemo(() => {
    const c = params?.chain;
    return isChain(c) ? c : "ethereum";
  }, [params]);

  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [goldLatest, setGoldLatest] = useState<Record<string, any> | null>(null);
  const [goldWindow, setGoldWindow] = useState<GoldRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [goldManifest, setGoldManifest] = useState<GoldManifest | null>(null);
  const [metaLatest, setMetaLatest] = useState<MetaLatest | null>(null);

  const [mode, setMode] = useState<ExplainMode>("Basic");

  // Activity regime UI state
  const [showActivityDetails, setShowActivityDetails] = useState<boolean>(false);
  const [openNotableDetails, setOpenNotableDetails] = useState<Record<string, boolean>>({});

  // Fee / Capacity regime UI state
  const [showFeeDetails, setShowFeeDetails] = useState<boolean>(false);
  const [openFeeNotableDetails, setOpenFeeNotableDetails] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setErr(null);

        const dsResp = await fetch(`${DATA_BASE}/dataset.json`, { cache: "no-store" });
        const ds = (await dsResp.json()) as Dataset;
        if (cancelled) return;
        setDataset(ds);

        const chosen =
          (ds.windows_supported?.includes(365) ? 365 : Math.max(...(ds.windows_supported ?? [365]))) || 365;

        const fetchOptionalJson = async (url: string) => {
          try {
            const r = await fetch(url, { cache: "no-store" });
            if (!r.ok) return null;
            return await r.json();
          } catch {
            return null;
          }
        };

        const [latestResp, windowResp, manifestJson, metaLatestJson] = await Promise.all([
          fetch(`${DATA_BASE}/gold/${routeChain}/latest.json`, { cache: "no-store" }),
          fetch(`${DATA_BASE}/gold/${routeChain}/last${chosen}d.json`, { cache: "no-store" }),
          fetchOptionalJson(`${DATA_BASE}/gold/${routeChain}/manifest.json`),
          fetchOptionalJson(`${DATA_BASE}/meta/${routeChain}/latest.json`),
        ]);

        const latestJson = await latestResp.json();
        const windowJson = await windowResp.json();

        if (cancelled) return;
        setGoldLatest(latestJson ?? null);
        setGoldWindow(Array.isArray(windowJson) ? (windowJson as GoldRow[]) : null);
        setGoldManifest((manifestJson ?? null) as GoldManifest | null);
        setMetaLatest((metaLatestJson ?? null) as MetaLatest | null);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (!cancelled) setErr(msg);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [routeChain]);

  const latestDate = useMemo(() => {
    if (!goldLatest) return null;
    const d = typeof goldLatest.date === "string" ? goldLatest.date : null;
    return d ?? null;
  }, [goldLatest]);

  const latestKeys = useMemo(() => safeKeys(goldLatest), [goldLatest]);

  const expectedLagPolicy = routeChain === "bitcoin" || routeChain === "ethereum" ? 1 : 7;

  const publishLagPolicy = useMemo(() => {
    const fromMeta = toNumberOrNull(metaLatest?.publish_lag_days_policy);
    return fromMeta ?? expectedLagPolicy;
  }, [metaLatest, expectedLagPolicy]);

  const updatedThrough = useMemo(() => {
    const u = metaLatest?.updated_through;
    if (typeof u === "string" && u.length >= 10) return u.slice(0, 10);
    return latestDate;
  }, [metaLatest, latestDate]);

  const lagDays = useMemo(() => {
    if (!updatedThrough) return null;
    return daysBetweenUtcYmd(updatedThrough, ymdNowUtc());
  }, [updatedThrough]);

  const confidenceScore = useMemo(() => {
    return toNumberOrNull(metaLatest?.confidence?.confidence_score);
  }, [metaLatest]);

  const coverageDays = useMemo(() => {
    const m = toNumberOrNull(goldManifest?.available_days);
    if (m !== null) return m;
    return goldWindow?.length ?? null;
  }, [goldManifest, goldWindow]);

  const isStale = lagDays !== null && lagDays > publishLagPolicy + 2;
  const isLowConfidence = confidenceScore !== null && confidenceScore < 0.5;
  const isLowCoverage = coverageDays !== null && coverageDays < 120;
  const isGated = isStale || isLowConfidence || isLowCoverage;

  // Regime models
  const activity = useMemo(() => computeActivityRegime(goldWindow), [goldWindow]);
  const activityRegime = activity.regime;
  const activityNotables = activity.notables;

  const feeCap = useMemo(() => computeFeeCapacityRegime(goldWindow), [goldWindow]);
  const feeCapRegime = feeCap.regime;
  const feeCapNotables = feeCap.notables;

  // EVM-only: Fee/Capacity is not applicable on Bitcoin
  const isEvmChain = routeChain !== "bitcoin";

  // Visible metric charts by chain (registry-driven)
  const metricsVisible = useMemo(() => {
    const keysInData = goldWindow && goldWindow.length ? safeKeys(goldWindow[0]) : [];
    return buildMetricCards(routeChain, keysInData);
  }, [routeChain, goldWindow]);

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-wider text-white/50">Chain</div>
          <h1 className="mt-1 text-2xl font-semibold capitalize">{routeChain}</h1>
          <div className="mt-1 text-sm text-white/70">
            {mode === "Basic" ? CHAINS[routeChain].interpretation.basic : CHAINS[routeChain].interpretation.advanced}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            className={`rounded-full border px-3 py-1 text-xs ${
              mode === "Basic" ? "border-white/25 bg-white/10 text-white" : "border-white/10 bg-black/20 text-white/70"
            }`}
            onClick={() => setMode("Basic")}
            type="button"
          >
            Basic
          </button>
          <button
            className={`rounded-full border px-3 py-1 text-xs ${
              mode === "Advanced" ? "border-white/25 bg-white/10 text-white" : "border-white/10 bg-black/20 text-white/70"
            }`}
            onClick={() => setMode("Advanced")}
            type="button"
          >
            Advanced
          </button>

          <button
            className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-white/70"
            onClick={() => router.push("/")}
            type="button"
          >
            Home
          </button>
        </div>
      </div>

      {err ? (
        <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-white/90">
          Failed to load data: <span className="font-mono">{err}</span>
        </div>
      ) : null}

      {/* Dataset header */}
      <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div>
            <div className="text-xs uppercase tracking-wider text-white/50">dataset_id</div>
            <div className="mt-1 font-mono text-sm text-white/90">{dataset?.dataset_id ?? "—"}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-white/50">revision_id</div>
            <div className="mt-1 font-mono text-sm text-white/90">
              {typeof dataset?.revision_id === "number" ? dataset.revision_id : "—"}
            </div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-white/50">computed_at_utc</div>
            <div className="mt-1 font-mono text-sm text-white/90">{dataset?.computed_at_utc ?? "—"}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-white/50">latest (gold)</div>
            <div className="mt-1 font-mono text-sm text-white/90">
              {latestDate ? fmtDateUtc(latestDate) : "—"}
              {isStale ? (
                <span className="ml-2 rounded-full border border-white/10 bg-black/20 px-2 py-0.5 text-[11px] text-white/70">stale</span>
              ) : null}
            </div>
            <div className="mt-1 text-xs text-white/60">today: {ymdNowUtc()}</div>
          </div>
        </div>
      </div>

      {isGated ? (
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="text-sm font-semibold">WITHHELD / UNKNOWN</div>
          <div className="mt-1 text-xs text-white/70">
            Interpretive outputs (regimes + notables) are suppressed because at least one gating condition is active. Charts and the latest
            snapshot remain visible for inspection.
          </div>
          <ul className="mt-2 list-disc pl-5 text-xs text-white/70">
            {isStale ? (
              <li>
                Freshness: data appears stale vs publish lag policy (lag {lagDays ?? "?"}d, policy {publishLagPolicy}d, slack 2d).
              </li>
            ) : null}
            {isLowConfidence ? <li>Confidence: meta confidence is low (confidence_score {confidenceScore ?? "?"}).</li> : null}
            {isLowCoverage ? <li>Coverage: insufficient history for robust regime classification (coverage {coverageDays ?? "?"} days).</li> : null}
          </ul>
        </div>
      ) : null}

      {/* Activity Regime + Notables */}
      {activityRegime && activityRegime.isVisible ? (
        <div className="mt-6">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="text-lg font-semibold">Activity Regime</div>
                <div className="mt-2 text-sm text-white/85">{isGated ? "WITHHELD / UNKNOWN (insufficient freshness/confidence/coverage for interpretive output)." : activityRegime.statement}</div>
              </div>
              <div className="text-xs text-white/60">Descriptive only • Relative to own history • No forecasting</div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs uppercase tracking-wider text-white/50">Tx activity</div>
                  <div className="text-[11px] text-white/60">{bandLabel(activityRegime.tx.band)}</div>
                </div>
                <MiniBand p={activityRegime.tx.percentile} />
              </div>

              <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs uppercase tracking-wider text-white/50">Address participation</div>
                  <div className="text-[11px] text-white/60">{bandLabel(activityRegime.addr.band)}</div>
                </div>
                <MiniBand p={activityRegime.addr.percentile} />
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm text-white/80">Persisted for {activityRegime.persistedWeeks} weeks</div>

              <button
                type="button"
                className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-white/70 hover:border-white/20"
                onClick={() => setShowActivityDetails((v) => !v)}
              >
                {showActivityDetails ? "Hide details" : "Show details"}
              </button>
            </div>

            {showActivityDetails ? (
              <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div>
                    <div className="text-xs uppercase tracking-wider text-white/50">Metrics used</div>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-white/80">
                      <li>
                        <span className="font-mono">tx_count_daily</span> (weekly aggregated via median of daily values)
                      </li>
                      <li>
                        <span className="font-mono">unique_active_addresses</span> (weekly aggregated via median of daily values)
                      </li>
                    </ul>
                  </div>

                  <div>
                    <div className="text-xs uppercase tracking-wider text-white/50">Historical reference</div>
                    <div className="mt-2 text-sm text-white/80">
                      Distribution since start of available history in the selected window. Weekly aggregation uses stable 7-day UTC buckets.
                    </div>
                  </div>

                  <div>
                    <div className="text-xs uppercase tracking-wider text-white/50">Method</div>
                    <div className="mt-2 text-sm text-white/80">
                      We place the current weekly value into its own historical percentile distribution (0–100). A qualitative band (Low/Mid/High) is derived from the percentile for readability.
                    </div>
                    <div className="mt-2 text-sm text-white/80">
                      Persistence requires the same band-pair (tx band + participation band) for at least{" "}
                      <span className="font-mono">3</span> consecutive complete-ish weeks.
                    </div>
                  </div>

                  <div>
                    <div className="text-xs uppercase tracking-wider text-white/50">Interpretation boundaries</div>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-white/80">
                      <li>Addresses are not users (identity is not measured).</li>
                      <li>Activity is not economic value (no price framing).</li>
                      <li>No forecasting, no recommendations, no “signals”.</li>
                    </ul>
                  </div>

                  <div className="md:col-span-2">
                    <div className="text-xs uppercase tracking-wider text-white/50">Alternative explanations</div>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-white/80">
                      <li>Application batching or sequencing patterns.</li>
                      <li>Exchange or bridge behavior shifts.</li>
                      <li>Protocol/client changes affecting transaction composition.</li>
                    </ul>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {!isGated ? (
            <>
              {/* Notables under Activity regime */}
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="flex items-center justify-between gap-2">
              <div className="text-lg font-semibold">Notable observations</div>
              <div className="text-xs text-white/60">Max 2 • Descriptive only • Not regime shifts</div>
            </div>

            {activityNotables.length === 0 ? (
              <div className="mt-3 text-sm text-white/80">No notable deviations within the current activity regime.</div>
            ) : (
              <div className="mt-4 space-y-3">
                {activityNotables.map((n) => {
                  const isOpen = !!openNotableDetails[n.kind];
                  return (
                    <div key={n.kind} className="rounded-xl border border-white/10 bg-black/20 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <div className="text-sm font-semibold text-white/90">{n.title}</div>
                          <div className="mt-1 text-sm text-white/80">{n.basic}</div>
                          <div className="mt-2 text-xs text-white/60">Persisted: {n.persistedWeeks} week(s)</div>
                        </div>

                        <button
                          type="button"
                          className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-white/70 hover:border-white/20"
                          onClick={() =>
                            setOpenNotableDetails((m) => ({
                              ...m,
                              [n.kind]: !m[n.kind],
                            }))
                          }
                        >
                          {isOpen ? "Hide details" : "Show details"}
                        </button>
                      </div>

                      {isOpen ? (
                        <div className="mt-3 rounded-lg border border-white/10 bg-black/30 p-3">
                          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            <div>
                              <div className="text-xs uppercase tracking-wider text-white/50">Metrics</div>
                              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-white/80">
                                {n.advanced.metrics.map((m) => (
                                  <li key={m}>
                                    <span className="font-mono">{m}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div>
                              <div className="text-xs uppercase tracking-wider text-white/50">Reference</div>
                              <div className="mt-2 text-sm text-white/80">{n.advanced.reference}</div>
                            </div>
                            <div>
                              <div className="text-xs uppercase tracking-wider text-white/50">Method</div>
                              <div className="mt-2 text-sm text-white/80">{n.advanced.method}</div>
                            </div>
                            <div>
                              <div className="text-xs uppercase tracking-wider text-white/50">Duration</div>
                              <div className="mt-2 text-sm text-white/80">{n.advanced.duration}</div>
                            </div>
                            <div className="md:col-span-2">
                              <div className="text-xs uppercase tracking-wider text-white/50">Alternative explanations</div>
                              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-white/80">
                                {n.advanced.alternatives.map((a, i) => (
                                  <li key={i}>{a}</li>
                                ))}
                              </ul>
                            </div>
                            <div className="md:col-span-2 text-xs text-white/60">
                              Notables are descriptive deviations within an established regime. They are not regime changes and are not predictive.
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
              </div>
            </>
          ) : null}
        </div>
      ) : null}

      {/* Fee / Capacity Regime + Notables (EVM-only) */}
      {isEvmChain && feeCapRegime && feeCapRegime.isVisible ? (
        <div className="mt-6">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="text-lg font-semibold">Fee / Capacity Regime</div>
                <div className="mt-2 text-sm text-white/85">{isGated ? "WITHHELD / UNKNOWN (insufficient freshness/confidence/coverage for interpretive output)." : feeCapRegime.statement}</div>
              </div>
              <div className="text-xs text-white/60">Descriptive only • Relative to own history • No forecasting</div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs uppercase tracking-wider text-white/50">Median fees (native)</div>
                  <div className="text-[11px] text-white/60">{bandLabel(feeCapRegime.fee.band)}</div>
                </div>
                <MiniBand p={feeCapRegime.fee.percentile} />
              </div>

              <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs uppercase tracking-wider text-white/50">Capacity usage</div>
                  <div className="text-[11px] text-white/60">{bandLabel(feeCapRegime.util.band)}</div>
                </div>
                <MiniBand p={feeCapRegime.util.percentile} />
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm text-white/80">Persisted for {feeCapRegime.persistedWeeks} weeks</div>

              <button
                type="button"
                className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-white/70 hover:border-white/20"
                onClick={() => setShowFeeDetails((v) => !v)}
              >
                {showFeeDetails ? "Hide details" : "Show details"}
              </button>
            </div>

            {showFeeDetails ? (
              <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div>
                    <div className="text-xs uppercase tracking-wider text-white/50">Metrics used</div>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-white/80">
                      <li>
                        <span className="font-mono">median_tx_fee_native</span> (weekly aggregated via median of daily values)
                      </li>
                      <li>
                        <span className="font-mono">gas_utilization_pct</span> (weekly aggregated via median of daily values)
                      </li>
                    </ul>
                  </div>

                  <div>
                    <div className="text-xs uppercase tracking-wider text-white/50">Historical reference</div>
                    <div className="mt-2 text-sm text-white/80">
                      Distribution since start of available history in the selected window. Weekly aggregation uses stable 7-day UTC buckets.
                    </div>
                  </div>

                  <div>
                    <div className="text-xs uppercase tracking-wider text-white/50">Method</div>
                    <div className="mt-2 text-sm text-white/80">
                      We place the current weekly value into its own historical percentile distribution (0–100). A qualitative band (Low/Mid/High) is derived from the percentile for readability.
                    </div>
                    <div className="mt-2 text-sm text-white/80">
                      Persistence requires the same band-pair (fees band + capacity band) for at least{" "}
                      <span className="font-mono">3</span> consecutive complete-ish weeks.
                    </div>
                  </div>

                  <div>
                    <div className="text-xs uppercase tracking-wider text-white/50">Interpretation boundaries</div>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-white/80">
                      <li>Native fee units are chain-specific (sat/wei). No price framing is provided.</li>
                      <li>Capacity usage is descriptive context, not a performance score.</li>
                      <li>No forecasting, no recommendations, no “signals”.</li>
                    </ul>
                  </div>

                  <div className="md:col-span-2">
                    <div className="text-xs uppercase tracking-wider text-white/50">Alternative explanations</div>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-white/80">
                      <li>Transaction composition shifts (more/less gas-heavy activity).</li>
                      <li>Fee-market dynamics changing independent of utilization.</li>
                      <li>Data aggregation / unit-scale artifacts.</li>
                    </ul>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {!isGated ? (
            <>
              {/* Notables under Fee / Capacity regime */}
              <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-lg font-semibold">Notable observations</div>
                  <div className="text-xs text-white/60">Max 2 • Descriptive only • Not regime shifts</div>
                </div>

                {feeCapNotables.length === 0 ? (
                  <div className="mt-3 text-sm text-white/80">
                    No notable deviations within the current fee/capacity regime (or coverage is limited).
                  </div>
                ) : (
                  <div className="mt-4 space-y-3">
                    {feeCapNotables.map((n) => {
            const isOpen = !!openFeeNotableDetails[n.kind];
            return (
              <div key={n.kind} className="rounded-xl border border-white/10 bg-black/20 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold text-white/90">{n.title}</div>
                    <div className="mt-1 text-sm text-white/80">{n.basic}</div>
                    <div className="mt-2 text-xs text-white/60">Persisted: {n.persistedWeeks} week(s)</div>
                  </div>

                  <button
                    type="button"
                    className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-white/70 hover:border-white/20"
                    onClick={() =>
                      setOpenFeeNotableDetails((m) => ({
                        ...m,
                        [n.kind]: !m[n.kind],
                      }))
                    }
                  >
                    {isOpen ? "Hide details" : "Show details"}
                  </button>
                </div>

                {isOpen ? (
                  <div className="mt-3 rounded-lg border border-white/10 bg-black/30 p-3">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <div>
                        <div className="text-xs uppercase tracking-wider text-white/50">Metrics</div>
                        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-white/80">
                          {n.advanced.metrics.map((m) => (
                            <li key={m}>
                              <span className="font-mono">{m}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <div className="text-xs uppercase tracking-wider text-white/50">Reference</div>
                        <div className="mt-2 text-sm text-white/80">{n.advanced.reference}</div>
                      </div>

                      <div>
                        <div className="text-xs uppercase tracking-wider text-white/50">Method</div>
                        <div className="mt-2 text-sm text-white/80">{n.advanced.method}</div>
                      </div>

                      <div>
                        <div className="text-xs uppercase tracking-wider text-white/50">Duration</div>
                        <div className="mt-2 text-sm text-white/80">{n.advanced.duration}</div>
                      </div>

                      <div className="md:col-span-2">
                        <div className="text-xs uppercase tracking-wider text-white/50">Alternative explanations</div>
                        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-white/80">
                          {n.advanced.alternatives.map((a, i) => (
                            <li key={i}>{a}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="md:col-span-2 text-xs text-white/60">
                        Notables are descriptive deviations within an established regime. They are not regime changes and are not predictive.
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>
      ) : null}


      {/* Existing “latest” snapshot */}
      <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-lg font-semibold">Latest (gold)</div>
          <div className="text-xs text-white/60">
            Keys: <span className="font-mono">{latestKeys.length}</span>
          </div>
        </div>

        {!goldLatest ? (
          <div className="mt-3 text-sm text-white/80">No latest row loaded.</div>
        ) : (
          <div className="mt-4 overflow-auto rounded-xl border border-white/10">
            <table className="min-w-[900px] w-full text-left text-sm">
              <thead className="bg-black/30 text-xs text-white/70">
                <tr>
                  <th className="p-3 font-medium">key</th>
                  <th className="p-3 font-medium">value</th>
                </tr>
              </thead>
              <tbody>
                {latestKeys.map((k) => {
                  const v = goldLatest[k];
                  return (
                    <tr key={k} className="border-t border-white/5">
                      <td className="p-3 font-mono text-xs text-white/85">{k}</td>
                      <td className="p-3 font-mono text-xs text-white/85">
                        {typeof v === "number"
                          ? v
                          : typeof v === "string"
                          ? v
                          : v === null || v === undefined
                          ? "—"
                          : JSON.stringify(v)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

        )}
      </div>

      {/* Charts (filtered by chain) */}
      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        {metricsVisible.slice(0, 4).map((m) => (
          <div key={m.key} className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-sm font-semibold text-white/90">{m.title}</div>
                <div className="mt-1 text-sm text-white/70">{mode === "Basic" ? m.basic : m.advanced ?? m.basic}</div>
              </div>
            </div>

            <div className="mt-4">
              <MetricChart rows={goldWindow ?? []} metricKey={m.key} />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        {metricsVisible.slice(4).map((m) => (
          <div key={m.key} className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-sm font-semibold text-white/90">{m.title}</div>
                <div className="mt-1 text-sm text-white/70">{mode === "Basic" ? m.basic : m.advanced ?? m.basic}</div>
              </div>
            </div>

            <div className="mt-4">
              <MetricChart rows={goldWindow ?? []} metricKey={m.key} />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-10 text-xs text-white/50">
        Note: All content is descriptive and contextual. No price charts, no recommendations, no forecasting.
      </div>
    </div>
  );
}