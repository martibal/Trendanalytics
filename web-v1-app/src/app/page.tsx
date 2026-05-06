import React, { type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";


import { CHAIN_LIST, type ChainId } from "@/config/chains";
import { readDatasetManifest, type DatasetManifest } from "@/lib/dataset";
import { computeHistoryDepthDays } from "@/lib/historyDepth";
import {
  confidenceBand,
  confidenceChipClass,
  fmtConfidence,
  fmtDate,
  rowTakeaway,
  statusChipClass,
  type SurfaceRowDisplay,
} from "@/lib/landingSurface";
import { readStorageObject } from "@/lib/storage";
import { cx, urd } from "@/components/site/UrdDesignSystem";
import HeroJsonPeek from "@/components/landing/HeroJsonPeek";
import WhoThisIsFor from "@/components/landing/WhoThisIsFor";

import "server-only";

const WHITEPAPER_HREF = "/whitepaper/Urd_Atlas_Whitepaper.pdf";

type LandingApiChain = {
  chain?: string;
  label?: string;
  name?: string;
  status_label?: string;
  confidence_score?: number | null;
  lag_days?: number | null;
  as_of?: string | null;
};

type LandingApiResponse =
  | { chains?: LandingApiChain[] }
  | { items?: LandingApiChain[] }
  | { data?: LandingApiChain[] };

type StatusApiRow = {
  chain: string;
  name: string;
  label: string;
  as_of: string | null;
  display_asof?: string | null;
  regime_asof?: string | null;
  lag_days: number | null;
  status: "ok" | "warn" | "fail" | "unknown";
  published_regime: string | null;
  confidence_score: number | null;
  expected_delay_days: number;
};

type StatusApiResponse = {
  ok: boolean;
  generated_at_utc: string;
  chains?: StatusApiRow[];
};

type LandingHero = {
  chain?: string;
  display_asof?: string;
  regime_asof?: string;
  asof?: {
    display?: string;
    latest_available?: string;
    gold?: string;
    derived?: string;
    meta?: string;
    meta_actual?: string;
    regime?: string;
  };
};

type MetaLatest = {
  date?: string;
  updated_through?: string;
  confidence?: {
    lag_days_vs_utc_today?: number;
    confidence_score?: number;
  };
  status?: { label?: string };
  regime?: { asof_date?: string };
};

type MetaDriver = {
  axis?: string;
  metric?: string;
  trend?: string;
  z_robust?: number | null;
  pct_90d?: number | null;
  momentum_7d_vs_30d?: number | null;
  current?: number | null;
};

type DerivedLatest = Record<string, unknown>;

type PrimaryChangeDisplay = {
  label: string;
  value: string;
  tone: "up" | "down" | "flat" | "limited";
};

function arrayBufferToUtf8(buffer: ArrayBuffer): string {
  return new TextDecoder("utf-8").decode(new Uint8Array(buffer));
}

async function readPublishedJson<T>(storagePath: string): Promise<T | null> {
  const result = await readStorageObject(storagePath);
  if (!result) return null;

  try {
    const raw = arrayBufferToUtf8(result.body);
    const json = JSON.parse(raw);
    if (!json || typeof json !== "object") return null;
    return json as T;
  } catch {
    return null;
  }
}

function extractLandingChains(payload: LandingApiResponse | null): LandingApiChain[] {
  if (!payload) return [];
  if (Array.isArray((payload as { chains?: LandingApiChain[] }).chains)) {
    return (payload as { chains?: LandingApiChain[] }).chains ?? [];
  }
  if (Array.isArray((payload as { items?: LandingApiChain[] }).items)) {
    return (payload as { items?: LandingApiChain[] }).items ?? [];
  }
  if (Array.isArray((payload as { data?: LandingApiChain[] }).data)) {
    return (payload as { data?: LandingApiChain[] }).data ?? [];
  }
  return [];
}

function parseIsoDayToUtcMs(date?: string): number | null {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const [y, m, d] = date.split("-").map(Number);
  const ms = Date.UTC(y, m - 1, d);
  return Number.isFinite(ms) ? ms : null;
}

function utcTodayMs(): number {
  const now = new Date();
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
}

function lagDaysFromIsoDay(date?: string): number | null {
  const asOfMs = parseIsoDayToUtcMs(date);
  if (asOfMs === null) return null;
  const diff = utcTodayMs() - asOfMs;
  return Math.max(0, Math.floor(diff / 86400000));
}

function expectedDelayDays(chain: ChainId): number {
  return chain === "arbitrum" || chain === "base" ? 7 : 1;
}

function heroDisplayAsOf(hero?: LandingHero | null): string | null {
  return (
    hero?.display_asof ??
    hero?.asof?.display ??
    hero?.asof?.latest_available ??
    hero?.asof?.gold ??
    hero?.asof?.derived ??
    hero?.asof?.meta ??
    null
  );
}

function heroRegimeAsOf(hero?: LandingHero | null): string | null {
  return hero?.regime_asof ?? hero?.asof?.regime ?? hero?.asof?.meta_actual ?? null;
}

async function buildLandingHeroMap(): Promise<Map<string, LandingHero | null>> {
  const heroes = await Promise.all(
    CHAIN_LIST.map(async (chain) => {
      const hero = await readPublishedJson<LandingHero>(`data/published/v1/landing/${chain.id}/hero.json`);
      return [chain.id, hero] as const;
    }),
  );

  return new Map(heroes);
}

function classifyStatus(params: {
  chain: ChainId;
  lagDays: number | null;
  asOf: string | null;
}): StatusApiRow["status"] {
  const { chain, lagDays, asOf } = params;
  if (!asOf || lagDays === null) return "unknown";
  const expected = expectedDelayDays(chain);
  if (lagDays <= expected) return "ok";
  if (lagDays <= expected + 2) return "warn";
  return "fail";
}

function withLandingHero(row: StatusApiRow, hero?: LandingHero | null): StatusApiRow {
  const displayAsOf = heroDisplayAsOf(hero);
  const regimeAsOf = heroRegimeAsOf(hero);
  const finalAsOf = displayAsOf ?? row.display_asof ?? row.as_of ?? null;
  const finalLag = displayAsOf ? lagDaysFromIsoDay(displayAsOf) : row.lag_days;

  return {
    ...row,
    as_of: finalAsOf,
    display_asof: displayAsOf ?? row.display_asof ?? null,
    regime_asof: regimeAsOf ?? row.regime_asof ?? null,
    lag_days: finalLag,
    status: classifyStatus({
      chain: row.chain as ChainId,
      lagDays: finalLag,
      asOf: finalAsOf,
    }),
  };
}

async function buildMetaFallbackRows(): Promise<StatusApiRow[]> {
  return Promise.all(
    CHAIN_LIST.map(async (chain) => {
      const meta = await readPublishedJson<MetaLatest>(`data/published/v1/meta/${chain.id}/latest.json`);
      const asOf = meta?.date ?? meta?.updated_through ?? meta?.regime?.asof_date ?? null;
      const lagDays =
        typeof meta?.confidence?.lag_days_vs_utc_today === "number"
          ? meta.confidence.lag_days_vs_utc_today
          : lagDaysFromIsoDay(asOf ?? undefined);

      return {
        chain: chain.id,
        name: chain.name,
        label: chain.label,
        as_of: asOf,
        display_asof: null,
        regime_asof: meta?.regime?.asof_date ?? null,
        lag_days: lagDays,
        status: classifyStatus({ chain: chain.id, lagDays, asOf }),
        published_regime: meta?.status?.label ?? null,
        confidence_score:
          typeof meta?.confidence?.confidence_score === "number"
            ? meta.confidence.confidence_score
            : null,
        expected_delay_days: expectedDelayDays(chain.id),
      };
    }),
  );
}

async function buildPrimaryChangeMap(): Promise<Map<string, PrimaryChangeDisplay>> {
  const entries = await Promise.all(
    CHAIN_LIST.map(async (chain) => {
      const [meta, derived] = await Promise.all([
        readPublishedJson<MetaLatest>(`data/published/v1/meta/${chain.id}/latest.json`),
        readPublishedJson<DerivedLatest>(`data/published/v1/derived/${chain.id}/latest.json`),
      ]);

      const confidenceScore =
        typeof meta?.confidence?.confidence_score === "number" ? meta.confidence.confidence_score : null;

      return [
        chain.id,
        buildPrimaryChangeDisplay({
          chainId: chain.id,
          meta,
          derived,
          confidenceScore,
        }),
      ] as const;
    }),
  );

  return new Map(entries);
}

function statusText(status: StatusApiRow["status"]) {
  if (status === "ok") return "OK";
  if (status === "warn") return "WARN";
  if (status === "fail") return "FAIL";
  return "UNKNOWN";
}

function toSurfaceRowDisplay(row: StatusApiRow): SurfaceRowDisplay {
  const band = confidenceBand(row.confidence_score);

  return {
    chain: row.chain,
    href: `/chains/${row.chain}`,
    label: row.label,
    name: row.name,
    status: row.status,
    statusText: statusText(row.status),
    statusClass: statusChipClass(row.status),
    statusTooltip: "",
    publishedRegime: row.published_regime,
    publishedRegimeTooltip: "",
    confidenceValue: fmtConfidence(row.confidence_score),
    confidenceBand: band,
    confidenceClass: confidenceChipClass(band),
    confidenceTooltip: "",
    asOf: fmtDate(row.display_asof ?? row.as_of),
    asOfTooltip: "",
    lagValue: row.lag_days !== null ? `${row.lag_days}d` : "—",
    lagTooltip: "",
    takeaway: rowTakeaway({
      status: row.status,
      publishedRegime: row.published_regime,
      confidenceScore: row.confidence_score,
    }),
  };
}

function formatDataLoad(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Oslo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  return `${formatter.format(date)} Oslo time`;
}

function shellClassName(extra?: string) {
  return `w-full px-5 sm:px-7 lg:px-10 2xl:px-16 ${extra ?? ""}`.trim();
}

function SectionShell(props: {
  children: ReactNode;
  className?: string;
  widthClassName?: string;
}) {
  return (
    <div className={shellClassName(props.className)}>
      <div className={props.widthClassName ?? "w-full"}>{props.children}</div>
    </div>
  );
}

function numericConfidence(row: SurfaceRowDisplay): number | null {
  const raw = Number.parseFloat(row.confidenceValue);
  if (!Number.isFinite(raw)) return null;
  if (raw > 1) return Math.max(0, Math.min(100, Math.round(raw)));
  return Math.max(0, Math.min(100, Math.round(raw * 100)));
}

function shortDisplayDate(value: string): string {
  if (!value || value === "—") return "Updated —";
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return `Updated ${value}`;
  return `Data updated through ${new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(parsed)}`;
}

function regimeTextClass(regime: string | null | undefined): string {
  const value = (regime ?? "").toUpperCase();
  if (value === "STABLE") return "text-[#1f8a68]";
  if (value === "HEATING") return "text-[#b96a2a]";
  if (value === "CONGESTED") return "text-[#b35353]";
  if (value === "CHEAP") return "text-blue-600";
  return "text-slate-500";
}

function prettyRegime(regime: string | null | undefined): string {
  return (regime ?? "UNKNOWN").toUpperCase();
}


type PrimaryDriverLike = {
  label?: string;
  value?: string;
  tone?: "up" | "down" | "flat" | "limited";
};

function confidenceVisualState(confidence: number | null) {
  if (confidence === null) {
    return {
      valueClass: "text-slate-500",
      noteClass: "text-slate-500",
      note: "Confidence unavailable. Use the chain page for full context.",
    };
  }

  if (confidence >= 70) {
    return {
      valueClass: "text-emerald-600",
      noteClass: "text-emerald-700",
      note: "High confidence. Low need for manual cross-check.",
    };
  }

  if (confidence >= 55) {
    return {
      valueClass: "text-amber-500",
      noteClass: "text-amber-700",
      note: "Usable confidence. A quick cross-check is recommended.",
    };
  }

  if (confidence >= 40) {
    return {
      valueClass: "text-orange-500",
      noteClass: "text-orange-700",
      note: "Caution. Verify against the chain page before relying on this signal.",
    };
  }

  return {
    valueClass: "text-rose-600",
    noteClass: "text-rose-700",
    note: "Degraded confidence. Treat this as tentative and cross-check carefully.",
  };
}

function primaryDriverValueClass(tone?: PrimaryDriverLike["tone"]) {
  if (tone === "up") return "text-emerald-600";
  if (tone === "down") return "text-rose-600";
  if (tone === "limited") return "text-amber-700";
  return "text-slate-600";
}

function splitPrimaryDriverValue(value?: string): { name: string; change: string } {
  const safeValue = value?.trim();
  if (!safeValue) return { name: "No clear driver", change: "—" };

  const vsIndex = safeValue.search(/\s[+-]?\d+(?:\.\d+)?%?\s+vs\s+/i);
  if (vsIndex > 0) {
    return {
      name: safeValue.slice(0, vsIndex).trim(),
      change: safeValue.slice(vsIndex).trim(),
    };
  }

  const percentileIndex = safeValue.search(/\s\d+(?:st|nd|rd|th)\s+pct\.?$/i);
  if (percentileIndex > 0) {
    return {
      name: safeValue.slice(0, percentileIndex).trim(),
      change: safeValue.slice(percentileIndex).trim(),
    };
  }

  const highVsIndex = safeValue.search(/\shigh\s+vs\s+/i);
  if (highVsIndex > 0) {
    return {
      name: safeValue.slice(0, highVsIndex).trim(),
      change: safeValue.slice(highVsIndex).trim(),
    };
  }

  const lowVsIndex = safeValue.search(/\slow\s+vs\s+/i);
  if (lowVsIndex > 0) {
    return {
      name: safeValue.slice(0, lowVsIndex).trim(),
      change: safeValue.slice(lowVsIndex).trim(),
    };
  }

  const elevatedIndex = safeValue.search(/\selevated$/i);
  if (elevatedIndex > 0) {
    return {
      name: safeValue.slice(0, elevatedIndex).trim(),
      change: "elevated",
    };
  }

  const depressedIndex = safeValue.search(/\sdepressed$/i);
  if (depressedIndex > 0) {
    return {
      name: safeValue.slice(0, depressedIndex).trim(),
      change: "depressed",
    };
  }

  return {
    name: safeValue,
    change: "current driver",
  };
}

function numericFromUnknown(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function formatSignedPercent(value: number): string {
  const rounded = Math.round(value);
  if (rounded > 0) return `+${rounded}%`;
  return `${rounded}%`;
}

function metricDisplayName(metric: string): string {
  const normalized = metric.toLowerCase();

  const labels: Record<string, string> = {
    tx_count_daily: "Activity",
    unique_active_addresses: "Active addresses",
    median_fee_native: "Fees",
    median_tx_fee_native: "Fees",
    failed_tx_rate: "Failure rate",
    gas_utilization_pct: "Gas utilization",
    median_gas_price: "Gas price",
    avg_block_time_sec: "Block time",
    block_count_daily: "Block count",
  };

  return labels[normalized] ?? normalized.replaceAll("_", " ");
}


function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function metricLookupKeys(metric: string): string[] {
  const normalized = metric.toLowerCase();

  const aliases: Record<string, string[]> = {
    tx_count_daily: ["tx_count_daily", "transaction_count", "transactions_daily"],
    unique_active_addresses: ["unique_active_addresses", "active_addresses", "daily_active_addresses"],
    median_fee_native: ["median_fee_native", "median_tx_fee_native"],
    median_tx_fee_native: ["median_tx_fee_native", "median_fee_native"],
    failed_tx_rate: ["failed_tx_rate", "failure_rate", "failed_transaction_rate"],
    gas_utilization_pct: ["gas_utilization_pct", "gas_utilization", "gas_used_ratio"],
    median_gas_price: ["median_gas_price", "gas_price_median"],
    avg_block_time_sec: ["avg_block_time_sec", "block_time_sec", "average_block_time_sec"],
    block_count_daily: ["block_count_daily", "blocks_daily"],
  };

  return Array.from(new Set([normalized, ...(aliases[normalized] ?? [])]));
}

function derivedContainers(derived: DerivedLatest | null): Record<string, unknown>[] {
  if (!derived) return [];

  const root = asRecord(derived);
  if (!root) return [];

  return [
    root,
    asRecord(root.metrics),
    asRecord(root.values),
    asRecord(root.derived),
    asRecord(root.data),
  ].filter((item): item is Record<string, unknown> => item !== null);
}

function readDerivedMetricNumber(
  derived: DerivedLatest | null,
  metric: string,
  suffix: "ma7" | "ma30",
): number | null {
  const containers = derivedContainers(derived);
  const metrics = metricLookupKeys(metric);

  const suffixKeys =
    suffix === "ma7"
      ? ["ma7", "ma_7", "rolling_7d", "rolling7"]
      : ["ma30", "ma_30", "rolling_30d", "rolling30"];

  for (const container of containers) {
    for (const metricKey of metrics) {
      const flatKeys =
        suffix === "ma7"
          ? [`${metricKey}__ma7`, `${metricKey}_ma7`, `${metricKey}__rolling_7d`]
          : [`${metricKey}__ma30`, `${metricKey}_ma30`, `${metricKey}__rolling_30d`];

      for (const flatKey of flatKeys) {
        const value = numericFromUnknown(container[flatKey]);
        if (value !== null) return value;
      }

      const nested = asRecord(container[metricKey]);
      if (nested) {
        for (const suffixKey of suffixKeys) {
          const value = numericFromUnknown(nested[suffixKey]);
          if (value !== null) return value;
        }
      }
    }
  }

  return null;
}

function normalizePercentile(value: number): number {
  if (!Number.isFinite(value)) return 50;

  // Supports both 0..1 and 0..100 percentile formats.
  const percentile = value <= 1 ? value * 100 : value;

  return Math.max(0, Math.min(100, Math.round(percentile)));
}

function driverPercentileText(metric: string, pct_90d: number): PrimaryChangeDisplay {
  const percentile = normalizePercentile(pct_90d);
  const metricName = metricDisplayName(metric);

  if (percentile >= 95) {
    return {
      label: "Primary driver",
      value: `${metricName} high vs 90d`,
      tone: "up",
    };
  }

  if (percentile >= 70) {
    return {
      label: "Primary driver",
      value: `${metricName} ${percentile}th pct.`,
      tone: "up",
    };
  }

  if (percentile <= 5) {
    return {
      label: "Primary driver",
      value: `${metricName} low vs 90d`,
      tone: "down",
    };
  }

  if (percentile <= 30) {
    return {
      label: "Primary driver",
      value: `${metricName} ${percentile}th pct.`,
      tone: "down",
    };
  }

  return {
    label: "Primary driver",
    value: `${metricName} central range`,
    tone: "flat",
  };
}

function driverZScoreText(metric: string, zRobust: number): PrimaryChangeDisplay {
  const metricName = metricDisplayName(metric);

  if (zRobust >= 1) {
    return {
      label: "Primary driver",
      value: `${metricName} elevated`,
      tone: "up",
    };
  }

  if (zRobust <= -1) {
    return {
      label: "Primary driver",
      value: `${metricName} depressed`,
      tone: "down",
    };
  }

  return {
    label: "Primary driver",
    value: `${metricName} near baseline`,
    tone: "flat",
  };
}

function excludedPrimaryChangeMetrics(chainId: ChainId): Set<string> {
  const globallyExcluded = [
    "avg_block_time_sec",
    "block_time_sec",
    "average_block_time_sec",
    "block_count_daily",
    "blocks_daily",
  ];

  if (chainId === "base") {
    return new Set([
      ...globallyExcluded,
    ]);
  }

  return new Set(globallyExcluded);
}

function choosePrimaryDrivers(chainId: ChainId, meta: MetaLatest | null): MetaDriver[] {
  const rawDrivers = (meta as { regime?: { drivers?: unknown } } | null)?.regime?.drivers;
  if (!Array.isArray(rawDrivers)) return [];

  const excluded = excludedPrimaryChangeMetrics(chainId);

  const drivers = rawDrivers.filter(
    (driver): driver is MetaDriver =>
      !!driver &&
      typeof driver === "object" &&
      typeof (driver as MetaDriver).metric === "string" &&
      !excluded.has(((driver as MetaDriver).metric as string).toLowerCase()),
  );

  return [...drivers].sort((a, b) => {
    const aZ = Math.abs(a.z_robust ?? 0);
    const bZ = Math.abs(b.z_robust ?? 0);

    if (bZ !== aZ) return bZ - aZ;

    const aPct =
      typeof a.pct_90d === "number"
        ? Math.abs(normalizePercentile(a.pct_90d) - 50)
        : 0;

    const bPct =
      typeof b.pct_90d === "number"
        ? Math.abs(normalizePercentile(b.pct_90d) - 50)
        : 0;

    return bPct - aPct;
  });
}

function buildPrimaryChangeDisplay(params: {
  chainId: ChainId;
  meta: MetaLatest | null;
  derived: DerivedLatest | null;
  confidenceScore: number | null;
}): PrimaryChangeDisplay {
  const { chainId, meta, derived, confidenceScore } = params;

  if (confidenceScore !== null && confidenceScore < 0.4) {
    return {
      label: "Primary driver",
      value: "Coverage-limited signal",
      tone: "limited",
    };
  }

  const drivers = choosePrimaryDrivers(chainId, meta);

  if (drivers.length === 0) {
    return {
      label: "Primary driver",
      value: "No clear driver",
      tone: "limited",
    };
  }

  // First pass: prefer actual MA7 vs MA30 movement when available and material.
  for (const driver of drivers) {
    const metric = driver.metric;
    if (!metric) continue;

    const ma7 = readDerivedMetricNumber(derived, metric, "ma7");
    const ma30 = readDerivedMetricNumber(derived, metric, "ma30");

    if (ma7 !== null && ma30 !== null && ma30 !== 0) {
      const changePct = ((ma7 - ma30) / Math.abs(ma30)) * 100;
      const absChange = Math.abs(changePct);

      if (absChange >= 0.75) {
        return {
          label: "Primary driver",
          value: `${metricDisplayName(metric)} ${formatSignedPercent(changePct)} vs 30d`,
          tone: changePct > 0 ? "up" : "down",
        };
      }
    }

    if (typeof driver.momentum_7d_vs_30d === "number" && Number.isFinite(driver.momentum_7d_vs_30d)) {
      const changePct = driver.momentum_7d_vs_30d * 100;
      const absChange = Math.abs(changePct);

      if (absChange >= 0.75) {
        return {
          label: "Primary driver",
          value: `${metricDisplayName(metric)} ${formatSignedPercent(changePct)} vs 30d`,
          tone: changePct > 0 ? "up" : "down",
        };
      }
    }
  }

  // Second pass: if MA movement is not material, show historical position.
  // This prevents Base from showing "No material 7d shift" when the driver is
  // still meaningfully high/low in the distribution.
  for (const driver of drivers) {
    const metric = driver.metric;
    if (!metric) continue;

    if (typeof driver.pct_90d === "number" && Number.isFinite(driver.pct_90d)) {
      const percentile = normalizePercentile(driver.pct_90d);

      if (percentile >= 70 || percentile <= 30) {
        return driverPercentileText(metric, driver.pct_90d);
      }
    }
  }

  // Third pass: use robust z-score if percentile is not available/extreme.
  for (const driver of drivers) {
    const metric = driver.metric;
    if (!metric) continue;

    if (typeof driver.z_robust === "number" && Number.isFinite(driver.z_robust)) {
      if (Math.abs(driver.z_robust) >= 1) {
        return driverZScoreText(metric, driver.z_robust);
      }
    }
  }

  // Final fallback: still show the model-selected driver, but without pretending
  // that there is a material 7d-vs-30d change.
  const fallback = drivers[0];

  return {
    label: "Primary driver",
    value: fallback.metric
      ? `${metricDisplayName(fallback.metric)} ${fallback.trend ?? "driver"}`
      : "No clear driver",
    tone: "flat",
  };
}

function primaryChangeToneClass(tone: PrimaryChangeDisplay["tone"]): string {
  if (tone === "up") return "text-blue-700";
  if (tone === "down") return "text-sky-700";
  if (tone === "limited") return "text-amber-700";
  return "text-[#557099]";
}

function ChainLogo({ chain }: { chain: string }) {
  if (chain === "ethereum") {
    return (
      <span
        className="relative inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#eef3fb] shadow-[inset_0_0_0_1px_rgba(15,23,42,0.06)]"
        aria-hidden="true"
      >
        <svg viewBox="0 0 34 34" className="h-8 w-8">
          <path d="M17 2.5 8.5 17.1 17 22.2l8.5-5.1L17 2.5Z" fill="#2b374c" />
          <path d="M17 2.5v19.7l8.5-5.1L17 2.5Z" fill="#61708b" />
          <path d="m8.5 18.8 8.5 12.7 8.5-12.7-8.5 5.1-8.5-5.1Z" fill="#202b3e" />
          <path d="M17 23.9v7.6l8.5-12.7-8.5 5.1Z" fill="#56647d" />
        </svg>
      </span>
    );
  }

  if (chain === "arbitrum") {
    return (
      <span
        className="relative inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#eef3fb] shadow-[inset_0_0_0_1px_rgba(15,23,42,0.06)]"
        aria-hidden="true"
      >
        <svg viewBox="0 0 34 34" className="h-9 w-9">
          <path d="m17 2.8 12.3 7.1v14.2L17 31.2 4.7 24.1V9.9L17 2.8Z" fill="#15263d" />
          <path d="M9.6 23.5 18.7 7.7h3.6l-9.1 15.8H9.6Z" fill="#69a7ff" />
          <path d="M16.2 25.8 24 12.3h3.4l-7.8 13.5h-3.4Z" fill="#ffffff" opacity="0.86" />
          <path d="m6.8 11.2 2.7-1.6v14.8l-2.7-1.5V11.2Z" fill="#8dbbff" opacity="0.55" />
        </svg>
      </span>
    );
  }

  if (chain === "base") {
    return (
      <span
        className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#eef3fb] shadow-[inset_0_0_0_1px_rgba(15,23,42,0.06)]"
        aria-hidden="true"
      >
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#1b66ff]">
          <span className="h-3.5 w-3.5 rounded-full bg-white" />
        </span>
      </span>
    );
  }

  return (
    <span
      className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#f7931a] text-[26px] font-black text-white shadow-[0_10px_22px_rgba(247,147,26,0.24)]"
      aria-hidden="true"
    >
      ₿
    </span>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
      <path
        d="M8 12h8m0 0-3.2-3.2M16 12l-3.2 3.2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MiniIcon({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] border border-blue-500/25 bg-blue-500/8 text-blue-600">
      {children}
    </span>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path
        d="M7 3v3M17 3v3M5 9h14M6.5 5.5h11A1.5 1.5 0 0 1 19 7v11a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 18V7a1.5 1.5 0 0 1 1.5-1.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path d="M9 13h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function TriangleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path d="m12 4 8.5 15h-17L12 4Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M12 10v4m0 3h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function ApiIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path
        d="M8 8 4 12l4 4M16 8l4 4-4 4M13.5 5.5l-3 13"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path
        d="M12 3.8 18.5 6v5.6c0 4.1-2.6 7.1-6.5 8.6-3.9-1.5-6.5-4.5-6.5-8.6V6L12 3.8Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="m9.5 12.1 1.7 1.7 3.6-4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StatusCard({
  row,
  primaryDriver,
  primaryChange,
}: {
  row: SurfaceRowDisplay;
  primaryDriver?: PrimaryDriverLike;
  primaryChange?: PrimaryDriverLike;
}) {
  const confidence = numericConfidence(row);
  const regime = prettyRegime(row.publishedRegime);
  const confidenceState = confidenceVisualState(confidence);

  const displayedPrimaryDriver = primaryDriver ?? primaryChange ?? null;

  return (
    <Link href={row.href} className={urd.landingChainCard}>
      <span className={urd.landingChainCardGlow} />
      <span className={urd.landingChainCardOrb} />
      <span className={urd.landingChainCardSheen} />

      <div className={urd.landingChainCardContent}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <ChainLogo chain={row.chain} />
            <div className="min-w-0 pt-0.5">
              <div className="text-[21px] font-black tracking-[-0.04em] text-[#071d3b] drop-shadow-[0_1px_0_rgba(255,255,255,0.9)]">
                {row.name}
              </div>
              <div
                className={`mt-1.5 text-[13px] font-black uppercase tracking-[0.08em] ${regimeTextClass(
                  row.publishedRegime
                )}`}
              >
                {regime}
              </div>
            </div>
          </div>

          {displayedPrimaryDriver ? (
            <div className={urd.landingChainDriverPanel}>
              <div className="text-[11px] font-black uppercase tracking-[0.13em] text-[#082247]">
                {displayedPrimaryDriver.label ?? "Primary driver"}
              </div>

              <div
                className={`mt-1 text-[15px] font-black leading-[1.14] ${primaryDriverValueClass(
                  displayedPrimaryDriver.tone
                )}`}
              >
                {splitPrimaryDriverValue(displayedPrimaryDriver.value).name}
              </div>

              <div
                className={`mt-0.5 text-[15px] font-black leading-[1.14] ${primaryDriverValueClass(
                  displayedPrimaryDriver.tone
                )}`}
              >
                {splitPrimaryDriverValue(displayedPrimaryDriver.value).change}
              </div>
            </div>
          ) : null}
        </div>

        <div className={urd.landingChainConfidencePanel}>
          <div className="flex items-center justify-between gap-3">
            <div className="text-[12px] font-black uppercase tracking-[0.13em] text-[#4f6f96]">
              Confidence
            </div>
            <div
              className={cx(
                "rounded-full border border-white/70 bg-white/54 px-2.5 py-1 text-[13px] font-black leading-none shadow-[0_6px_14px_rgba(8,34,71,0.08)]",
                confidenceState.valueClass,
              )}
            >
              {confidence !== null ? `${confidence}%` : "—"}
            </div>
          </div>
          <div className={`mt-3 text-[12px] font-semibold leading-5 ${confidenceState.noteClass}`}>
            {confidenceState.note}
          </div>
        </div>

        <div className={urd.landingChainFooter}>
          <span>{shortDisplayDate(row.asOf).replace("Updated ", "Data updated through ")}</span>
          <span className="text-[#0a55c2] transition group-hover:translate-x-0.5">
            <ArrowIcon />
          </span>
        </div>
      </div>
    </Link>
  );
}


type BuyerDecision = {
  question: string;
  answer: string;
  bullets: string[];
};

const BUYER_DECISIONS: BuyerDecision[] = [
  {
    question: "Why a category at all?",
    answer:
      "A raw number forces the reader to do the interpretation work every time. A regime category is the interpretation, applied by a documented rule and available as a stable join key.",
    bullets: [
      "Numbers require interpretation every time. Categories are the interpretation, already done.",
      "A category is reproducible between people; a raw score alone is not.",
      "A backtest, research note, and LP report can all refer to an Ethereum CONGESTED day and mean the same thing.",
      "The category does not hide the evidence: drivers, z-scores, percentiles, confidence, and freshness remain exposed.",
    ],
  },
  {
    question: "Why daily resolution instead of hourly or weekly?",
    answer:
      "A regime state that lasts 15 minutes is not a regime. Daily publication is frequent enough to be operationally useful and slow enough that each label has substance beyond transient spikes.",
    bullets: [
      "Sub-daily signals often capture noise with a timestamp; daily labels mark events that persisted through a publication cycle.",
      "A CONGESTED day is a day, not a 15-minute spike.",
      "Weekly labels would be too slow for many risk and research workflows that need to react within the same work week.",
      "Daily cadence is the compromise: timely enough to use, conservative enough to avoid naming every spike.",
    ],
  },
  {
    question: "Why these four chains?",
    answer:
      "BTC, ETH, ARB, and BASE were chosen to cover distinct on-chain topologies while preserving a comparable schema and chain-specific rulesets.",
    bullets: [
      "Bitcoin represents a UTXO settlement chain where fee pressure and confirmation pacing are primary stress signals.",
      "Ethereum represents an EVM L1 where gas utilization and friction are central state variables.",
      "Arbitrum and Base provide two L2 surfaces for studying L2 versus L1 divergence under a shared reference schema.",
      "New chains should be added only when they can be calibrated with the same level of methodological control.",
    ],
  },
  {
    question: "Why 90 and 365 days of history?",
    answer:
      "History length is an analytical capability boundary, not a pricing decoration. Ninety days is enough to verify whether a strategy splits meaningfully by regime. Three hundred sixty-five days is the minimum useful surface for most regime-conditioned modelling.",
    bullets: [
      "90 days is enough for basic regime segmentation and pre-purchase validation.",
      "365 days captures seasonality, regime transitions, and cross-chain divergence better than a short window.",
      "30 days is usually too short to contain enough regime changes to serve as evidence.",
      "Longer history can be layered in when a workflow requires deeper archival backtesting.",
    ],
  },
  {
    question: "Why JSON instead of only dashboards, charts, or prose?",
    answer:
      "The product is an input to your existing analytical systems, not a replacement workspace. JSON lets Urd Atlas become a column in your own dataset instead of another tool your team must log into.",
    bullets: [
      "You own the files and can integrate them into your own database, backtests, notebooks, or reports.",
      "Charts are useful for inspection; JSON is what working analysts and engineers can automate.",
      "A regime label can be joined to returns, flows, internal risk flags, or research datasets.",
      "Chain pages exist for human inspection, but the subscriber product is the structured reference data.",
    ],
  },
  {
    question: "Why a confidence gate, and why 0.40?",
    answer:
      "UNKNOWN/DEGRADED is not an excuse for weak data; it is an explicit refusal to publish a named state when the evidence surface is not strong enough. The 0.40 gate is the minimum evidence threshold for a named classification to pass through.",
    bullets: [
      "Urd Atlas does not publish a confident-looking label when the data does not support one.",
      "0.40 is not a statement that raw data is wrong; it is a named-state publication threshold.",
      "Low-confidence days remain machine-readable instead of being smoothed away.",
      "A backtest can filter on confidence_score >= threshold in one place instead of manually repairing labels later.",
    ],
  },
];

function BuyerDecisionSection() {
  return (
    <section className="relative bg-[linear-gradient(180deg,#f5f9ff_0%,#eaf5ff_100%)] py-12">
      <SectionShell>
        <div className="max-w-[960px]">
          <div className="text-[13px] font-black uppercase tracking-[0.14em] text-[#1d5fce]">
            Product choices
          </div>
          <h2 className="mt-3 text-[34px] font-black leading-tight tracking-[-0.04em] text-[#0d2447] sm:text-[40px]">
            Why we made the decisions we made
          </h2>
          <p className="mt-4 max-w-[860px] text-[17px] font-semibold leading-8 text-[#37547b]">
            Every product is a sequence of choices. These are ours, and the reasoning behind each one.
          </p>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          {BUYER_DECISIONS.map((item, index) => (
            <details
              key={item.question}
              className="group rounded-[24px] border border-[#b8d8ff]/80 bg-white/82 p-0 shadow-[0_18px_55px_rgba(13,36,71,0.08)] backdrop-blur transition open:bg-white open:shadow-[0_24px_72px_rgba(13,36,71,0.12)]"
            >
              <summary className="flex cursor-pointer list-none items-start gap-4 px-5 py-5 marker:hidden sm:px-6 [&::-webkit-details-marker]:hidden">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#2f7cff]/24 bg-[#2f7cff]/10 text-[13px] font-black text-[#1d5fce]">
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[18px] font-black leading-6 tracking-[-0.02em] text-[#0d2447]">
                    {item.question}
                  </span>
                  <span className="mt-2 block text-[14px] font-semibold leading-6 text-[#557099]">
                    {item.answer}
                  </span>
                </span>
                <span className="mt-1 text-[20px] font-black leading-none text-[#2f7cff] transition group-open:rotate-45">
                  +
                </span>
              </summary>

              <div className="border-t border-[#cfe4fb] px-5 pb-5 pt-4 sm:px-6">
                <ul className="grid gap-3 text-[14px] font-semibold leading-6 text-[#37547b]">
                  {item.bullets.map((bullet) => (
                    <li key={bullet} className="flex gap-3">
                      <span className="mt-[0.55rem] h-1.5 w-1.5 shrink-0 rounded-full bg-[#2f7cff]" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </details>
          ))}
        </div>
      </SectionShell>
    </section>
  );
}


const WORKFLOW_IMAGES = [
  {
    title: "Start with the data you already have",
    src: "/landing-workflows/urd-atlas-workflow-1.png",
    alt:
      "Example existing dataset with price, strategy, and risk fields before Urd Atlas regime context is joined.",
  },
  {
    title: "Join in daily Urd Atlas regime data",
    src: "/landing-workflows/urd-atlas-workflow-2.png",
    alt:
      "Example dataset after joining Urd Atlas regime, confidence, and evidence fields by date and chain.",
  },
  {
    title: "Segment, filter, and report by regime",
    src: "/landing-workflows/urd-atlas-workflow-3.png",
    alt:
      "Example downstream analysis using Urd Atlas regime labels to segment, filter, and report by network conditions.",
  },
];

const REGIME_STATES = [
  {
    label: "STABLE",
    tone: "border-emerald-300 bg-emerald-50 text-emerald-800",
    description:
      "The network is behaving as expected. Activity, fees, and capacity are within normal range for this chain.",
  },
  {
    label: "HEATING",
    tone: "border-amber-300 bg-amber-50 text-amber-900",
    description:
      "Demand is rising above normal and showing directional momentum. The network is warming up.",
  },
  {
    label: "CONGESTED",
    tone: "border-rose-300 bg-rose-50 text-rose-800",
    description:
      "The network is under significant pressure. Fees and capacity are elevated beyond typical levels.",
  },
  {
    label: "CHEAP",
    tone: "border-cyan-300 bg-cyan-50 text-cyan-800",
    description:
      "Both fees and capacity pressure are low. Quiet conditions relative to recent history.",
  },
  {
    label: "UNKNOWN/DEGRADED",
    tone: "border-slate-300 bg-slate-50 text-slate-800",
    description:
      "The data was not strong enough to support a confident label that day. Urd Atlas publishes this explicitly instead of forcing a classification.",
  },
];

const ANALYST_QUESTIONS = [
  {
    question: "What is a regime label?",
    answer:
      "A regime label is a daily name for the network condition of a chain. It turns a set of activity, fee, capacity, confidence, and driver fields into a stable category that can be joined to your own data.",
  },
  {
    question: "Compared to what is something normal?",
    answer:
      "Each chain is compared to its own recent history. Ethereum is not judged against Bitcoin, and Base is not judged against Ethereum. The label is chain-relative, not price-relative.",
  },
  {
    question: "I already have price data. What does this add?",
    answer:
      "Price data tells you what the market paid. Urd Atlas tells you what kind of network day it was when that happened. That gives you a second dimension for research, backtests, monitoring, and reporting.",
  },
  {
    question: "Can I build this myself with Glassnode or Dune?",
    answer:
      "You can build parts of it if you maintain the ingestion, normalization, thresholds, label rules, confidence gate, versioning, and verification surface yourself. Urd Atlas sells that maintained reference layer directly as daily JSON.",
  },
  {
    question: "How do I know the thresholds are trustworthy?",
    answer:
      "The thresholds are published, the methodology is versioned, and every named label is tied to evidence fields and a determinism hash. You do not have to accept the label alone; the supporting fields are shipped with it.",
  },
  {
    question: "Yesterday's data — is that not outdated?",
    answer:
      "This is not an intraday trading feed. It is daily reference data for regime context. The point is to classify the day as a whole, not react to every short-lived spike.",
  },
  {
    question: "What about the seven-day delay on ARB and BASE?",
    answer:
      "The delay is exposed rather than hidden. ARB and BASE are useful for historical, cross-chain, and regime-conditioned analysis, but their freshness status should be checked before operational use.",
  },
  {
    question: "What is a confidence score?",
    answer:
      "Confidence measures how strongly the available evidence supports the published label. If confidence is too low, Urd Atlas publishes UNKNOWN/DEGRADED instead of pretending the label is stronger than the data supports.",
  },
];

function RegimeDefinitionLine() {
  return (
    <div className="mt-8 text-center">
      <p className="mx-auto max-w-[1320px] text-[20px] font-black leading-8 tracking-[-0.02em] text-white sm:text-[24px] sm:leading-9">
        A regime is a simple answer to one question: is this blockchain behaving normally right now, or has something meaningfully shifted?
        <span className="text-cyan-200"> Not the price — the network itself.</span>
      </p>
    </div>
  );
}

function WorkflowUseCaseSection() {
  return (
    <div id="workflow-use-case" className="relative px-4 pb-8 pt-2 sm:px-6 lg:px-8 2xl:px-10">
      <div className="mx-auto max-w-[1680px]">
        <div className="max-w-[1120px]">
          <h2 className="text-[36px] font-black leading-tight tracking-[-0.04em] text-white sm:text-[46px]">
            A regime column for the data you already have.
          </h2>
          <p className="mt-4 max-w-[980px] text-[18px] font-semibold leading-8 text-white/76">
            Your data tells you what happened. Urd Atlas tells you what kind of day it was when it happened — and that context changes what you can learn from your own data.
          </p>
        </div>

        <div className="mt-8 flex flex-col items-center gap-2 text-center">
          <div className="text-[13px] font-black uppercase tracking-[0.14em] text-cyan-300">
            Example downstream workflow
          </div>
          <div className="text-[12px] font-bold uppercase tracking-[0.13em] text-cyan-200/62">
            Illustrative example. Hypothetical data.
          </div>
        </div>

        <div className="mt-6 grid gap-5 xl:grid-cols-2 2xl:grid-cols-3">
          {WORKFLOW_IMAGES.map((item, index) => (
            <figure key={item.src} className="overflow-hidden">
              <a
                href={`#workflow-image-${index + 1}`}
                className="group block"
                aria-label={`${item.title}. Click to open a larger preview.`}
              >
                <div className="relative aspect-[4/3] w-full rounded-[28px] bg-[#06182d] shadow-[0_30px_88px_rgba(0,0,0,0.48)] ring-1 ring-white/8">
                  <Image
                    src={item.src}
                    alt={item.alt}
                    fill
                    sizes="(min-width: 1800px) 520px, (min-width: 1536px) 31vw, (min-width: 1280px) 46vw, 100vw"
                    className="object-contain p-1 transition duration-300 group-hover:scale-[1.01]"
                  />
                  <div className="absolute inset-x-4 bottom-4 inline-flex w-fit items-center rounded-full border border-white/25 bg-[#031329]/82 px-3 py-1 text-[11px] font-black uppercase tracking-[0.11em] text-white shadow-[0_10px_30px_rgba(0,0,0,0.28)]">
                    Click to enlarge
                  </div>
                </div>
              </a>
              <figcaption className="flex items-start gap-3 px-1 py-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#2f7cff] text-[14px] font-black text-white">
                  {index + 1}
                </span>
                <span className="pt-1 text-[15px] font-black leading-5 text-white">
                  {item.title}
                </span>
              </figcaption>
            </figure>
          ))}
        </div>

        <RegimeDefinitionLine />

      </div>

      {WORKFLOW_IMAGES.map((item, index) => (
          <div
            key={`${item.src}-modal`}
            id={`workflow-image-${index + 1}`}
            className="pointer-events-none fixed inset-0 z-[120] flex items-center justify-center bg-[#031329]/0 p-4 opacity-0 transition duration-200 target:pointer-events-auto target:bg-[#031329]/78 target:opacity-100"
          >
            <a
              href="#workflow-use-case"
              aria-label="Close enlarged workflow image"
              className="absolute inset-0 block"
            />
            <div className="relative z-[1] w-full max-w-[1280px] overflow-hidden rounded-[28px] border border-white/18 bg-[#071a31] shadow-[0_36px_120px_rgba(0,0,0,0.48)]">
              <div className="flex items-center justify-between gap-4 border-b border-white/12 px-5 py-4 sm:px-6">
                <div>
                  <div className="text-[12px] font-black uppercase tracking-[0.13em] text-cyan-200/82">
                    Workflow example {index + 1}
                  </div>
                  <div className="mt-1 text-[18px] font-black leading-6 tracking-[-0.02em] text-white">
                    {item.title}
                  </div>
                </div>
                <a
                  href="#workflow-use-case"
                  className="inline-flex h-10 items-center justify-center rounded-full border border-white/18 bg-white/8 px-4 text-[12px] font-black uppercase tracking-[0.1em] text-white transition hover:bg-white/14"
                >
                  Close
                </a>
              </div>
              <div className="relative aspect-[16/10] w-full bg-[#06182d]">
                <Image
                  src={item.src}
                  alt={item.alt}
                  fill
                  sizes="100vw"
                  className="object-contain"
                />
              </div>
            </div>
          </div>
        ))}
    </div>
  );
}

function RegimeStatesSection() {
  return (
    <section className="relative bg-[linear-gradient(180deg,#f5f9ff_0%,#eaf5ff_100%)] py-12">
      <SectionShell>
        <div className="max-w-[960px]">
          <div className="text-[13px] font-black uppercase tracking-[0.14em] text-[#1d5fce]">
            Regime vocabulary
          </div>
          <h2 className="mt-3 text-[34px] font-black leading-tight tracking-[-0.04em] text-[#0d2447] sm:text-[40px]">
            What kind of day was it?
          </h2>
          <p className="mt-4 max-w-[860px] text-[17px] font-semibold leading-8 text-[#37547b]">
            Each daily label is a plain-language name for how the network behaved relative to its own recent history.
          </p>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-5">
          {REGIME_STATES.map((state) => (
            <div
              key={state.label}
              className="rounded-[24px] border border-[#b8d8ff]/80 bg-white/82 p-5 shadow-[0_18px_55px_rgba(13,36,71,0.08)] backdrop-blur"
            >
              <div className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.11em] ${state.tone}`}>
                {state.label}
              </div>
              <p className="mt-4 text-[14px] font-semibold leading-6 text-[#37547b]">
                {state.description}
              </p>
            </div>
          ))}
        </div>

        <p className="mt-6 rounded-[22px] border border-[#b8d8ff]/70 bg-white/74 px-5 py-4 text-[15px] font-bold leading-7 text-[#0d2447] shadow-[0_16px_45px_rgba(13,36,71,0.07)]">
          All states are chain-relative — compared to that chain&apos;s own recent history, not to other chains or to price.
        </p>
      </SectionShell>
    </section>
  );
}

function DailyResolutionSection() {
  return (
    <section className="relative bg-[#eaf5ff] py-8">
      <SectionShell>
        <div className="rounded-[28px] border border-[#b8d8ff] bg-white/82 p-6 shadow-[0_18px_55px_rgba(13,36,71,0.08)] backdrop-blur md:p-7">
          <div className="text-[13px] font-black uppercase tracking-[0.14em] text-[#1d5fce]">
            Why daily?
          </div>
          <p className="mt-3 max-w-[980px] text-[18px] font-semibold leading-8 text-[#37547b]">
            Regime does not change in an hour. A CONGESTED day is a day — not a 15-minute spike. Daily resolution is frequent enough to be operationally useful and slow enough that each label has substance beyond transient noise. If you need sub-hourly data for intraday trading, this is not the right product.
          </p>
        </div>
      </SectionShell>
    </section>
  );
}

function AnalystQuestionsSection() {
  return (
    <section className="relative bg-[linear-gradient(180deg,#eaf5ff_0%,#f5f9ff_100%)] py-12">
      <SectionShell>
        <div className="max-w-[960px]">
          <div className="text-[13px] font-black uppercase tracking-[0.14em] text-[#1d5fce]">
            Buyer questions
          </div>
          <h2 className="mt-3 text-[34px] font-black leading-tight tracking-[-0.04em] text-[#0d2447] sm:text-[40px]">
            Questions analysts ask before subscribing
          </h2>
          <p className="mt-4 max-w-[820px] text-[17px] font-semibold leading-8 text-[#37547b]">
            Direct answers to the objections that matter before you add an external regime layer to your own workflow.
          </p>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          {ANALYST_QUESTIONS.map((item) => (
            <details
              key={item.question}
              className="group rounded-[24px] border border-[#b8d8ff]/80 bg-white/82 p-0 shadow-[0_18px_55px_rgba(13,36,71,0.08)] backdrop-blur transition open:bg-white open:shadow-[0_24px_72px_rgba(13,36,71,0.12)]"
            >
              <summary className="flex cursor-pointer list-none items-start gap-4 px-5 py-5 marker:hidden sm:px-6 [&::-webkit-details-marker]:hidden">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#2f7cff]/24 bg-[#2f7cff]/10 text-[18px] font-black leading-none text-[#1d5fce]">
                  ?
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[18px] font-black leading-6 tracking-[-0.02em] text-[#0d2447]">
                    {item.question}
                  </span>
                  <span className="mt-2 block text-[14px] font-semibold leading-6 text-[#557099]">
                    {item.answer}
                  </span>
                </span>
                <span className="mt-1 text-[20px] font-black leading-none text-[#2f7cff] transition group-open:rotate-45">
                  +
                </span>
              </summary>
            </details>
          ))}
        </div>
      </SectionShell>
    </section>
  );
}


type JsonLayerTone = "gold" | "meta" | "derived";
type JsonExampleConfidence = "high" | "degraded";
type JsonExampleKey = `${JsonLayerTone}_${JsonExampleConfidence}`;

type JsonExampleFile = {
  code: string;
  sourcePath: string;
  chain: string | null;
  date: string | null;
  confidenceScore: number | null;
};

type JsonExampleCodeMap = Record<JsonExampleKey, JsonExampleFile>;

type MetaManifest = {
  available_days?: unknown;
  available_dates?: unknown;
  dates?: unknown;
  latest?: unknown;
};

type ConfidenceCandidate = {
  chain: ChainId;
  date: string;
  score: number;
};

const JSON_LAYER_TONES: JsonLayerTone[] = ["gold", "meta", "derived"];
const EXAMPLE_SCAN_DAYS = 420;

function asPlainRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function getNestedValue(source: unknown, pathParts: readonly string[]): unknown {
  let current: unknown = source;

  for (const part of pathParts) {
    const record = asPlainRecord(current);
    if (!record) return undefined;
    current = record[part];
  }

  return current;
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }

  return null;
}

function normalizeConfidenceToPercent(score: number | null): number | null {
  if (score === null || !Number.isFinite(score)) return null;
  const percent = Math.abs(score) <= 1 ? score * 100 : score;
  return Math.max(0, Math.min(100, percent));
}

function formatExampleConfidence(score: number | null): string {
  const percent = normalizeConfidenceToPercent(score);
  if (percent === null) return "—";
  return `${Math.round(percent)}%`;
}

function extractConfidenceScore(meta: unknown): number | null {
  const candidates: unknown[] = [
    getNestedValue(meta, ["confidence", "confidence_score"]),
    getNestedValue(meta, ["confidence", "score"]),
    getNestedValue(meta, ["confidence_score"]),
    getNestedValue(meta, ["scorecard", "confidence_score"]),
    getNestedValue(meta, ["publish_confidence", "confidence_score"]),
    getNestedValue(meta, ["publish_confidence", "score"]),
  ];

  for (const candidate of candidates) {
    const parsed = toFiniteNumber(candidate);
    if (parsed !== null) return parsed;
  }

  return null;
}

function extractIsoDateFromJson(json: unknown): string | null {
  if (typeof json === "string" && /^\d{4}-\d{2}-\d{2}$/.test(json)) {
    return json;
  }

  const candidates: unknown[] = [
    getNestedValue(json, ["date"]),
    getNestedValue(json, ["as_of"]),
    getNestedValue(json, ["updated_through"]),
    getNestedValue(json, ["regime", "asof_date"]),
    getNestedValue(json, ["asof", "display"]),
    getNestedValue(json, ["asof", "latest_available"]),
    getNestedValue(json, ["latest", "date"]),
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(candidate)) {
      return candidate;
    }
  }

  return null;
}

function extractManifestDates(manifest: MetaManifest | null): string[] {
  if (!manifest) return [];

  const rawDates =
    (Array.isArray(manifest.available_days) && manifest.available_days) ||
    (Array.isArray(manifest.available_dates) && manifest.available_dates) ||
    (Array.isArray(manifest.dates) && manifest.dates) ||
    [];

  const dateSet = new Set<string>();

  for (const value of rawDates) {
    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      dateSet.add(value);
    }
  }

  const latestDate = extractIsoDateFromJson(manifest.latest);
  if (latestDate) dateSet.add(latestDate);

  return Array.from(dateSet).sort();
}

async function readMetaCandidateDates(chain: ChainId): Promise<string[]> {
  const manifest = await readPublishedJson<MetaManifest>(`data/published/v1/meta/${chain}/manifest.json`);
  const manifestDates = extractManifestDates(manifest);

  if (manifestDates.length > 0) {
    return manifestDates.slice(-EXAMPLE_SCAN_DAYS);
  }

  const latest = await readPublishedJson<unknown>(`data/published/v1/meta/${chain}/latest.json`);
  const latestDate = extractIsoDateFromJson(latest);
  return latestDate ? [latestDate] : [];
}

function publishedLayerPath(layer: JsonLayerTone, candidate: ConfidenceCandidate): string {
  return `data/published/v1/${layer}/${candidate.chain}/${candidate.date}.json`;
}

async function hasAllLayerFiles(candidate: ConfidenceCandidate): Promise<boolean> {
  const checks = await Promise.all(
    JSON_LAYER_TONES.map((layer) => readStorageObject(publishedLayerPath(layer, candidate))),
  );

  return checks.every(Boolean);
}

async function buildConfidenceCandidates(): Promise<ConfidenceCandidate[]> {
  const nested = await Promise.all(
    CHAIN_LIST.map(async (chain) => {
      const dates = await readMetaCandidateDates(chain.id);
      const candidates = await Promise.all(
        dates.map(async (date) => {
          const meta = await readPublishedJson<unknown>(`data/published/v1/meta/${chain.id}/${date}.json`);
          const score = extractConfidenceScore(meta);

          if (score === null) return null;

          return {
            chain: chain.id,
            date,
            score,
          } satisfies ConfidenceCandidate;
        }),
      );

      const readableCandidates = candidates.filter(
        (candidate): candidate is ConfidenceCandidate => candidate !== null,
      );

      if (readableCandidates.length > 0) {
        return readableCandidates;
      }

      const latest = await readPublishedJson<unknown>(`data/published/v1/meta/${chain.id}/latest.json`);
      const latestScore = extractConfidenceScore(latest);
      const latestDate = extractIsoDateFromJson(latest);

      if (latestScore === null || !latestDate) {
        return [];
      }

      return [
        {
          chain: chain.id,
          date: latestDate,
          score: latestScore,
        } satisfies ConfidenceCandidate,
      ];
    }),
  );

  return nested.flat();
}

async function selectConfidenceCandidate(
  candidates: ConfidenceCandidate[],
  confidence: JsonExampleConfidence,
): Promise<ConfidenceCandidate | null> {
  const sorted = [...candidates].sort((a, b) =>
    confidence === "high" ? b.score - a.score : a.score - b.score,
  );

  for (const candidate of sorted) {
    if (await hasAllLayerFiles(candidate)) {
      return candidate;
    }
  }

  return sorted[0] ?? null;
}

function unavailableExample(params: {
  layer: JsonLayerTone;
  confidence: JsonExampleConfidence;
  candidate: ConfidenceCandidate | null;
  sourcePath: string;
  reason: string;
}): JsonExampleFile {
  return {
    sourcePath: `/${params.sourcePath}`,
    chain: params.candidate?.chain ?? null,
    date: params.candidate?.date ?? null,
    confidenceScore: params.candidate?.score ?? null,
    code: JSON.stringify(
      {
        error: "json_example_unavailable",
        layer: params.layer,
        confidence_example: params.confidence,
        selected_chain: params.candidate?.chain ?? null,
        selected_date: params.candidate?.date ?? null,
        selected_meta_confidence_score: params.candidate?.score ?? null,
        attempted_source_path: `/${params.sourcePath}`,
        reason: params.reason,
      },
      null,
      2,
    ),
  };
}

async function readExampleFileForCandidate(
  layer: JsonLayerTone,
  confidence: JsonExampleConfidence,
  candidate: ConfidenceCandidate | null,
): Promise<JsonExampleFile> {
  if (!candidate) {
    return unavailableExample({
      layer,
      confidence,
      candidate,
      sourcePath: `data/published/v1/${layer}/<chain>/<date>.json`,
      reason: "No Meta files with readable confidence_score were found.",
    });
  }

  const sourcePath = publishedLayerPath(layer, candidate);
  const result = await readStorageObject(sourcePath);

  if (!result) {
    return unavailableExample({
      layer,
      confidence,
      candidate,
      sourcePath,
      reason: "The selected Meta confidence date exists, but the matching layer file was not found.",
    });
  }

  try {
    const raw = arrayBufferToUtf8(result.body);
    const parsed: unknown = JSON.parse(raw);

    return {
      code: JSON.stringify(parsed, null, 2),
      sourcePath: `/${sourcePath}`,
      chain: candidate.chain,
      date: candidate.date,
      confidenceScore: candidate.score,
    };
  } catch {
    return unavailableExample({
      layer,
      confidence,
      candidate,
      sourcePath,
      reason: "The selected layer file exists, but it is not valid JSON.",
    });
  }
}

async function buildJsonExampleCodeMap(): Promise<JsonExampleCodeMap> {
  const candidates = await buildConfidenceCandidates();
  const highCandidate = await selectConfidenceCandidate(candidates, "high");
  const degradedCandidate = await selectConfidenceCandidate(candidates, "degraded");

  const [goldHigh, goldDegraded, metaHigh, metaDegraded, derivedHigh, derivedDegraded] =
    await Promise.all([
      readExampleFileForCandidate("gold", "high", highCandidate),
      readExampleFileForCandidate("gold", "degraded", degradedCandidate),
      readExampleFileForCandidate("meta", "high", highCandidate),
      readExampleFileForCandidate("meta", "degraded", degradedCandidate),
      readExampleFileForCandidate("derived", "high", highCandidate),
      readExampleFileForCandidate("derived", "degraded", degradedCandidate),
    ]);

  return {
    gold_high: goldHigh,
    gold_degraded: goldDegraded,
    meta_high: metaHigh,
    meta_degraded: metaDegraded,
    derived_high: derivedHigh,
    derived_degraded: derivedDegraded,
  };
}

function jsonLayerToneClasses(tone: JsonLayerTone) {
  if (tone === "gold") {
    return {
      card: "border-yellow-300/24 bg-[#031329] shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_22px_60px_rgba(3,19,41,0.24)]",
      badge: "border-yellow-300/35 bg-yellow-300/10 text-yellow-200",
      title: "text-yellow-200",
      bullet: "text-yellow-300",
    };
  }

  if (tone === "meta") {
    return {
      card: "border-cyan-300/24 bg-[#031329] shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_22px_60px_rgba(3,19,41,0.24)]",
      badge: "border-cyan-300/35 bg-cyan-300/10 text-cyan-200",
      title: "text-cyan-200",
      bullet: "text-cyan-300",
    };
  }

  return {
    card: "border-emerald-300/24 bg-[#031329] shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_22px_60px_rgba(3,19,41,0.24)]",
    badge: "border-emerald-300/35 bg-emerald-300/10 text-emerald-200",
    title: "text-emerald-200",
    bullet: "text-emerald-300",
  };
}

function JsonLayerCard(props: {
  tone: JsonLayerTone;
  title: string;
  subtitle: string;
  description: string;
}) {
  const tone = jsonLayerToneClasses(props.tone);

  return (
    <div className={`rounded-[14px] border p-4 ${tone.card}`}>
      <div className={`inline-flex rounded-full border px-3 py-1 text-[12px] font-black ${tone.badge}`}>
        {props.title}
      </div>

      <div className="mt-4 text-[12px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        {props.subtitle}
      </div>

      <p className="mt-3 text-[14px] font-semibold leading-7 text-slate-200">
        {props.description}
      </p>
    </div>
  );
}

function JsonExamplePickerModal() {
  const layers: Array<{
    tone: JsonLayerTone;
    title: string;
    description: string;
  }> = [
    {
      tone: "gold",
      title: "Gold",
      description: "Daily observation data for the selected chain and date.",
    },
    {
      tone: "meta",
      title: "Meta",
      description: "Regime label, confidence, freshness, and driver context for downstream analysis.",
    },
    {
      tone: "derived",
      title: "Derived",
      description: "Deterministic rolling baselines and trend context built from Gold.",
    },
  ];

  return (
    <div
      id="json-example-picker"
      className="fixed inset-0 z-[100] hidden items-center justify-center bg-[#020817]/82 px-5 py-8 backdrop-blur-sm [&:target]:flex"
    >
      <a href="#close-json-example" className="absolute inset-0" aria-label="Close JSON example picker" />

      <section className="relative w-full max-w-[1040px] rounded-[26px] border border-white/12 bg-[#061426] p-6 text-white shadow-[0_32px_120px_rgba(0,0,0,0.56)] sm:p-8">
        <div className="flex items-start justify-between gap-5">
          <div>
            <div className="inline-flex rounded-full border border-cyan-300/35 bg-cyan-300/10 px-4 py-1.5 text-[13px] font-black uppercase tracking-[0.14em] text-cyan-200">
              Historical JSON examples
            </div>
            <h3 className="mt-5 max-w-[760px] text-[34px] font-black tracking-[-0.045em] text-white">
              Inspect real Gold, Derived, and Meta reference files before you read the full page.
            </h3>
            <p className="mt-3 max-w-[760px] text-[15px] font-semibold leading-7 text-slate-300">
              Choose a reference layer and then compare a high-confidence example with a low-confidence / degraded example.
              These are read from the published JSON archive, not hardcoded demo snippets.
            </p>
          </div>

          <a
            href="#close-json-example"
            className="inline-flex h-10 shrink-0 items-center justify-center rounded-full border border-white/12 px-4 text-[13px] font-black text-white transition hover:bg-white/8"
          >
            Close
          </a>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          {layers.map((layer) => {
            const tone = jsonLayerToneClasses(layer.tone);

            return (
              <div key={layer.tone} className={`rounded-[20px] border p-5 ${tone.card}`}>
                <div className={`inline-flex rounded-full border px-3 py-1 text-[12px] font-black ${tone.badge}`}>
                  {layer.title}
                </div>
                <h4 className={`mt-4 text-[26px] font-black tracking-[-0.035em] ${tone.title}`}>
                  {layer.title}
                </h4>
                <p className="mt-2 min-h-[54px] text-[14px] font-semibold leading-6 text-slate-300">
                  {layer.description}
                </p>

                <div className="mt-5 grid gap-3">
                  <a
                    href={`#json-${layer.tone}-high`}
                    className="inline-flex h-11 items-center justify-between rounded-full border border-cyan-300/35 bg-cyan-300/12 px-4 text-[13px] font-black text-cyan-100 transition hover:bg-cyan-300/18"
                  >
                    High confidence
                    <span aria-hidden="true">→</span>
                  </a>
                  <a
                    href={`#json-${layer.tone}-degraded`}
                    className="inline-flex h-11 items-center justify-between rounded-full border border-amber-300/40 bg-amber-300/12 px-4 text-[13px] font-black text-amber-100 transition hover:bg-amber-300/18"
                  >
                    Low confidence / degraded
                    <span aria-hidden="true">→</span>
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function JsonExampleModal(props: {
  tone: JsonLayerTone;
  confidence: JsonExampleConfidence;
  title: string;
  subtitle: string;
  example: JsonExampleFile;
}) {
  const tone = jsonLayerToneClasses(props.tone);
  const isDegraded = props.confidence === "degraded";

  return (
    <div
      id={`json-${props.tone}-${props.confidence}`}
      className="fixed inset-0 z-[100] hidden items-center justify-center bg-[#020817]/82 px-5 py-8 backdrop-blur-sm [&:target]:flex"
    >
      <a href="#close-json-example" className="absolute inset-0" aria-label="Close JSON example" />

      <section className="relative w-full max-w-[980px] rounded-[26px] border border-white/12 bg-[#061426] p-6 shadow-[0_32px_120px_rgba(0,0,0,0.56)] sm:p-8">
        <div className="flex items-start justify-between gap-5">
          <div>
            <div className={`inline-flex rounded-full border px-4 py-1.5 text-[13px] font-black ${tone.badge}`}>
              {props.title}
            </div>

            <h3 className={`mt-5 text-[34px] font-black tracking-[-0.045em] ${tone.title}`}>
              {isDegraded ? "Low confidence / degraded" : "High confidence"} {props.title} example
            </h3>

            <p className="mt-2 max-w-[720px] text-[15px] leading-7 text-slate-400">
              {props.subtitle}
            </p>

            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-[12px] font-semibold text-slate-400">
          
              <span>Chain/date: <span className="text-slate-200">{props.example.chain ?? "—"} / {props.example.date ?? "—"}</span></span>
              <span>Meta confidence: <span className="text-slate-200">{formatExampleConfidence(props.example.confidenceScore)}</span></span>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <a
                href={`#json-${props.tone}-high`}
                className={`inline-flex h-10 items-center rounded-full border px-4 text-[13px] font-black transition ${
                  props.confidence === "high"
                    ? "border-cyan-300/40 bg-cyan-300/14 text-cyan-100"
                    : "border-white/12 text-slate-300 hover:bg-white/8"
                }`}
              >
                High confidence example
              </a>

              <a
                href={`#json-${props.tone}-degraded`}
                className={`inline-flex h-10 items-center rounded-full border px-4 text-[13px] font-black transition ${
                  props.confidence === "degraded"
                    ? "border-amber-300/45 bg-amber-300/12 text-amber-100"
                    : "border-white/12 text-slate-300 hover:bg-white/8"
                }`}
              >
                Low confidence / degraded example
              </a>
            </div>
          </div>

          <a
            href="#close-json-example"
            className="inline-flex h-10 shrink-0 items-center justify-center rounded-full border border-white/12 px-4 text-[13px] font-black text-white transition hover:bg-white/8"
          >
            Close
          </a>
        </div>

        <pre className="mt-7 max-h-[62vh] overflow-auto rounded-[18px] border border-white/10 bg-[#020b18] p-5 font-mono text-[13px] leading-7 text-slate-100">
          <code>{props.example.code}</code>
        </pre>
      </section>
    </div>
  );
}

function FeaturePill(props: { icon: ReactNode; title: string; note: string }) {
  return (       
    <div className="grid min-w-0 grid-cols-[46px_minmax(0,1fr)] gap-4 border-r border-[#cbdced] px-5 py-4 last:border-r-0">
     <MiniIcon>{props.icon}</MiniIcon>
      <div className="min-w-0">
        <div className="text-[17px] font-extrabold text-[#0d2447]">{props.title}</div>
        <div className="mt-1.5 text-[14px] font-medium leading-5 text-[#536e99]">{props.note}</div>
      </div>
    </div>
  );
}

function StepItem(props: { number: string; title: string; note: string }) {
  return (
    <div className="relative grid grid-cols-[68px_minmax(0,1fr)] gap-5 text-left">
      <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-[34px] font-semibold text-blue-600">
        {props.number}
      </span>
      <div>
        <div className="text-[20px] font-extrabold text-[#0d2447]">{props.title}</div>
        <div className="mt-2 text-[18px] leading-7 text-[#557099]">{props.note}</div>
      </div>
    </div>
  );
}

function PlanCard(props: {
  tone: "free" | "basic" | "pro";
  name: string;
  price: string;
  pill: string;
  headline: string;
  body: string;
  bestFor: string;
  href: string;
  cta: string;
  badge?: string;
}) {
  const isFeatured = Boolean(props.badge);

  const cardClass = isFeatured
    ? "border border-[#2f7cff]/55 bg-[linear-gradient(145deg,rgba(20,42,86,0.98)_0%,rgba(36,82,156,0.92)_42%,rgba(20,42,86,0.98)_100%)] shadow-[inset_0_1px_0_rgba(140,180,255,0.28),inset_0_-1px_0_rgba(255,255,255,0.05),0_28px_70px_rgba(8,40,100,0.42)]"
    : "border border-[#89a9d1]/28 bg-[linear-gradient(145deg,rgba(22,34,54,0.96)_0%,rgba(55,78,112,0.88)_40%,rgba(30,47,73,0.96)_72%,rgba(18,29,47,0.98)_100%)] shadow-[inset_0_1px_0_rgba(210,230,255,0.18),inset_0_-1px_0_rgba(255,255,255,0.03),0_22px_60px_rgba(3,14,32,0.32)]";

  const pillClass =
    "border border-[#b8d1f0]/22 bg-[linear-gradient(180deg,rgba(210,228,248,0.14)_0%,rgba(150,181,214,0.08)_100%)] text-[#e3efff] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]";

  const buttonClass = isFeatured
    ? "border border-white/30 bg-white text-[#0d2447] shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_10px_24px_rgba(255,255,255,0.18)] hover:bg-[#eaf3fb]"
    : "border border-[#9fc1ea]/30 bg-[linear-gradient(180deg,rgba(176,205,236,0.16)_0%,rgba(107,146,191,0.12)_100%)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] hover:bg-[linear-gradient(180deg,rgba(176,205,236,0.22)_0%,rgba(107,146,191,0.16)_100%)]";

  return (
    <article className={`relative flex min-h-[405px] flex-col rounded-[28px] p-8 ${cardClass}`}>
      {props.badge ? (
        <div className="absolute -top-3 left-7 inline-flex rounded-full border border-[#2f7cff]/45 bg-[#2f7cff] px-3.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white shadow-[0_8px_18px_rgba(47,124,255,0.42)]">
          {props.badge}
        </div>
      ) : null}

      <div className="flex items-start justify-between gap-5">
        <h3 className="text-[15px] font-black uppercase tracking-[0.22em] text-white">
          {props.name}
        </h3>
        <div className={`rounded-full px-4 py-1.5 text-[12px] font-black ${pillClass}`}>
          {props.pill}
        </div>
      </div>

      <div className="mt-5 text-[46px] font-black leading-none tracking-[-0.055em] text-white">
        {props.price}
      </div>

      <p className="mt-7 text-[19px] font-black leading-7 text-white">
        {props.headline}
      </p>

      <p className="mt-4 max-w-[460px] text-[16px] font-medium leading-7 text-[#eef5ff]">
        {props.body}
      </p>

      <p className="mt-auto pt-8 text-[16px] leading-7 text-[#bfd2ea]">
        {props.bestFor}
      </p>

      <Link
        href={props.href}
        className={`mt-7 inline-flex h-[52px] w-fit items-center justify-center rounded-full px-7 text-[15px] font-black transition ${buttonClass}`}
      >
        {props.cta}
      </Link>
    </article>
  );
}

export default async function HomePage() {
  const dataset: DatasetManifest | null = await readDatasetManifest();

  const [
    landingPayload,
    statusPayload,
    metaFallbackRows,
    historyDepthDays,
    landingHeroMap,
    jsonExampleCodeMap,
    primaryChangeMap,
  ] = await Promise.all([
    readPublishedJson<LandingApiResponse>("data/published/v1/landing/index.json"),
    readPublishedJson<StatusApiResponse>("data/published/v1/status/index.json"),
    buildMetaFallbackRows(),
    computeHistoryDepthDays().catch(() => null),
    buildLandingHeroMap(),
    buildJsonExampleCodeMap(),
    buildPrimaryChangeMap(),
  ]);

  const landingChains = extractLandingChains(landingPayload);
  const statusRows =
    Array.isArray(statusPayload?.chains) && statusPayload.chains.length > 0
      ? statusPayload.chains.map((row) => withLandingHero(row, landingHeroMap.get(row.chain)))
      : [];

  const landingFallbackRows: StatusApiRow[] = CHAIN_LIST.map((chain) => {
    const landing = landingChains.find((row) => row.chain === chain.id);
    const hero = landingHeroMap.get(chain.id);
    const displayAsOf = heroDisplayAsOf(hero);
    const asOf = displayAsOf ?? landing?.as_of ?? null;
    const lagDays =
      displayAsOf !== null
        ? lagDaysFromIsoDay(asOf ?? undefined)
        : landing?.lag_days ?? lagDaysFromIsoDay(asOf ?? undefined);

    return {
      chain: chain.id,
      name: landing?.name ?? chain.name,
      label: landing?.label ?? chain.label,
      as_of: asOf,
      display_asof: displayAsOf,
      regime_asof: heroRegimeAsOf(hero),
      lag_days: lagDays,
      status: classifyStatus({ chain: chain.id, lagDays, asOf }),
      published_regime: landing?.status_label ?? null,
      confidence_score: landing?.confidence_score ?? null,
      expected_delay_days: expectedDelayDays(chain.id),
    };
  });

  const normalizedMetaFallbackRows = metaFallbackRows.map((row) =>
    withLandingHero(row, landingHeroMap.get(row.chain)),
  );

  const rows =
    statusRows.length > 0
      ? statusRows
      : metaFallbackRows.some(
          (row) =>
            row.published_regime !== null ||
            row.confidence_score !== null ||
            row.as_of !== null ||
            row.lag_days !== null,
        )
      ? normalizedMetaFallbackRows
      : landingFallbackRows;

  const displayRows = rows.map(toSurfaceRowDisplay);
  const publishedDays =
    typeof historyDepthDays === "number" && Number.isFinite(historyDepthDays)
      ? historyDepthDays.toLocaleString("en-GB")
      : "412";
  const lastDataLoad =
    formatDataLoad(statusPayload?.generated_at_utc) ?? formatDataLoad(dataset?.published_at ?? null) ?? "Updated daily";

  return (
    <main className="min-h-screen bg-[#edf6ff] text-[#0a1d3a]">
      <section className="relative isolate overflow-hidden bg-[#031329] text-white">
        <div className="relative z-20 border-b border-white/8 bg-[#031329]/96 px-4 py-2 text-center text-[14px] font-semibold leading-6 text-white/82">
          Three subscription levels: Free, Single Chain $49/mo, and Research $149/mo.{" "}
          <a
            href="#pricing"
            className="font-extrabold text-blue-300 underline decoration-blue-300/40 underline-offset-4 hover:text-blue-200"
          >
            Click for more
          </a>
          <span className="mx-2 text-white/35">·</span>
          <a
            href={WHITEPAPER_HREF}
            download
            className="font-extrabold text-cyan-200 underline decoration-cyan-200/40 underline-offset-4 hover:text-white"
          >
            Download whitepaper
          </a>
          .
        </div>
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_8%,rgba(44,109,255,0.12),transparent_28%),linear-gradient(180deg,#031329_0%,#041327_100%)]" />

          <div className="pointer-events-none absolute right-[4%] top-[86px] hidden lg:block">
            <div className="relative h-[250px] w-[250px] opacity-[0.24] xl:h-[360px] xl:w-[360px]">
              <Image
                src="/web-bilder/ygg-transparent.png"
                alt=""
                fill
                sizes="(min-width: 1280px) 360px, 250px"
                className="object-contain"
                priority
              />
            </div>
          </div>

        <SectionShell className="relative pb-6 pt-[78px] md:pb-8 md:pt-[90px] lg:pb-6 lg:pt-[96px]">

            <div className="max-w-[820px]">
              <h1 className="max-w-[820px] text-[48px] font-black leading-[0.98] tracking-[-0.055em] text-white sm:text-[54px] lg:text-[62px]">
                Separate blockchain noise
                <span className="block text-[#2f7cff]">from structural change.</span>
              </h1>
              <p className="mt-6 max-w-[820px] text-[19px] font-semibold leading-7 text-white/88 sm:text-[20px]">
                A daily regime label for your blockchain data. JSON. Versioned. Hash-anchored. Joins on date and chain.
              </p>
            <div className="mt-7 flex flex-wrap gap-3">


              <Link
                href="/methodology"
                className="inline-flex h-12 min-w-[240px] items-center justify-center rounded-[8px] bg-blue-600 px-6 text-[14px] font-extrabold text-white shadow-[0_14px_30px_rgba(37,99,235,0.32)] transition hover:bg-blue-700"
              >
                Methodology & JSON fields →
              </Link>
              <Link
                href="/api-docs"
                className="inline-flex h-12 min-w-[170px] items-center justify-center rounded-[8px] bg-blue-600 px-6 text-[14px] font-extrabold text-white shadow-[0_14px_30px_rgba(37,99,235,0.32)] transition hover:bg-blue-700"
              >
                View API Docs
              </Link>
              <Link
                href="/api-docs/samples"
                className="inline-flex h-12 min-w-[190px] items-center justify-center rounded-[8px] border border-blue-300/45 bg-white/8 px-6 text-[14px] font-extrabold text-blue-100 shadow-[0_14px_30px_rgba(3,19,41,0.22)] transition hover:bg-white/14 hover:text-white"
              >
                Open sample pack →
              </Link>
            </div>

          </div>
        </SectionShell>

        <WorkflowUseCaseSection />
      </section>

        <HeroJsonPeek />

        <RegimeStatesSection />

        <DailyResolutionSection />

        <section className="relative bg-[linear-gradient(180deg,#eaf5ff_0%,#f5f9ff_100%)] py-10">
          <SectionShell>
            <div className="flex items-start justify-between gap-6">
              <div>
                <div className="text-[13px] font-black uppercase tracking-[0.12em] text-[#0d2447]">
                  Today&apos;s published labels
                </div>
                <p className="mt-1 text-[14px] font-medium leading-5 text-[#557099]">
                  Published by the latest pipeline run. Click any chain card to open the full chain view and history.
                </p>
              </div>

              <p className="shrink-0 pt-0.5 text-right text-[13px] font-medium leading-5 text-[#7187a8]">
                Last data load: {lastDataLoad}
              </p>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {displayRows.slice(0, 4).map((row) => (
                <StatusCard
                  key={row.chain}
                  row={row}
                  primaryChange={primaryChangeMap.get(row.chain)}
                />
              ))}
            </div>
          </SectionShell>
        </section>

        <BuyerDecisionSection />

        <AnalystQuestionsSection />

        <WhoThisIsFor />

      <section className="relative bg-[linear-gradient(180deg,#eaf5ff_0%,#f5f9ff_58%,#eef6ff_100%)] pb-0 pt-10">
        <SectionShell>




            <div
              id="json-layers"
              className="mt-16 scroll-mt-20 px-0 py-0 text-[#0d2447]"
            >
            <div className="max-w-[1200px]">
              <h2 className="text-[34px] font-black leading-tight tracking-[-0.04em] text-[#0d2447]">
                Reference data delivered as JSON
              </h2>
              <p className="mt-4 max-w-[980px] text-[17px] font-medium leading-8 text-[#37547b]">
                Each chain is published as three compact reference layers with distinct roles: Gold observations, Derived transforms, and Meta regime and confidence context.
              </p>
            </div>

            <div className="mt-8 grid gap-5 lg:grid-cols-3">
              <JsonLayerCard
                tone="gold"
                title="Gold"
                subtitle="Raw observations"
                description="Gold is built around factual daily on-chain metrics: activity, fees, utilization, friction, and network usage."
              />

              <JsonLayerCard
                tone="meta"
                title="Meta"
                subtitle="Regime reference layer"
                description="Meta is the reference layer for the published regime label, confidence score, freshness, and the drivers explaining why the label fired."
              />

              <JsonLayerCard
                tone="derived"
                title="Derived"
                subtitle="Trend baselines"
                description="Derived is built around moving averages and relative-position metrics that separate short-term noise from structural change."
              />
            </div>

            <div className="mt-8 rounded-[28px] border border-[#9cc7ff]/60 bg-[linear-gradient(135deg,rgba(255,255,255,0.92)_0%,rgba(234,245,255,0.86)_52%,rgba(218,237,255,0.80)_100%)] p-6 shadow-[0_22px_70px_rgba(13,36,71,0.12)] backdrop-blur md:p-7 lg:grid lg:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)] lg:items-center lg:gap-8">
              <div>
                <div className="inline-flex rounded-full border border-[#2f7cff]/22 bg-[#2f7cff]/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-[#1d5fce]">
                  Public sample pack
                </div>
                <h3 className="mt-4 max-w-[760px] text-[28px] font-black leading-tight tracking-[-0.035em] text-[#0d2447]">
                  Test it against your own data before you subscribe.
                </h3>
                <p className="mt-3 max-w-[820px] text-[16px] font-semibold leading-7 text-[#37547b]">
                  We cannot prove our thresholds are the only right ones. What we can prove is that they are consistent, published, and that every named label we publish is verifiable against its determinism hash. Download the sample pack, run the verification script, and join it against your own historical data. That is the only honest way to know whether this is useful for you.
                </p>
              </div>

              <div className="mt-6 rounded-[22px] border border-[#c7dcf5] bg-white/82 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.65),0_12px_34px_rgba(13,36,71,0.08)] lg:mt-0">
                <div className="grid gap-2 text-[13px] font-bold leading-5 text-[#48688f]">
                  <div className="flex items-center justify-between gap-4 rounded-[14px] bg-[#edf6ff] px-4 py-3">
                    <span>Gold / Derived / Meta</span>
                    <span className="text-[#0d2447]">real JSON</span>
                  </div>
                  <div className="flex items-center justify-between gap-4 rounded-[14px] bg-[#edf6ff] px-4 py-3">
                    <span>High + degraded examples</span>
                    <span className="text-[#0d2447]">pre-purchase</span>
                  </div>
                  <div className="flex items-center justify-between gap-4 rounded-[14px] bg-[#edf6ff] px-4 py-3">
                    <span>Verification-ready fields</span>
                    <span className="text-[#0d2447]">audit path</span>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                  <Link
                    href="/api-docs/samples"
                    className="inline-flex h-11 items-center justify-center rounded-full bg-[#2f7cff] px-5 text-[13px] font-black text-white shadow-[0_14px_34px_rgba(47,124,255,0.24)] transition hover:-translate-y-0.5 hover:bg-[#2368dd]"
                  >
                    Open sample pack →
                  </Link>
                  <a
                    href="#json-example-picker"
                    className="inline-flex h-11 items-center justify-center rounded-full border border-[#2f7cff]/25 bg-white px-5 text-[13px] font-black text-[#1d5fce] transition hover:-translate-y-0.5 hover:bg-[#eef6ff]"
                  >
                    View examples →
                  </a>
                </div>
              </div>
            </div>

            <div
              id="json-after-example"
              className="mt-8 scroll-mt-24 rounded-[22px] border border-[#b8d8ff] bg-white/76 px-5 py-4 shadow-[0_18px_55px_rgba(13,36,71,0.10)] backdrop-blur sm:flex sm:items-center sm:justify-between sm:gap-6"
            >
              <p className="text-[15px] font-extrabold leading-7 text-[#0d2447]">
                This is what subscribers receive every day.
              </p>
              <a
                href="#pricing"
                className="mt-3 inline-flex h-11 items-center justify-center rounded-full border border-[#2f7cff]/25 bg-[#2f7cff] px-5 text-[13px] font-black text-white shadow-[0_14px_34px_rgba(47,124,255,0.24)] transition hover:-translate-y-0.5 hover:bg-[#2368dd] sm:mt-0"
              >
                See plans →
              </a>
            </div>
          </div>

          <JsonExamplePickerModal />

          <JsonExampleModal
            tone="gold"
            confidence="high"
            title="Gold"
            subtitle="Gold is factual daily data. This example uses the date selected from the highest readable Meta confidence score."
            example={jsonExampleCodeMap.gold_high}
          />
          

          <JsonExampleModal
            tone="gold"
            confidence="degraded"
            title="Gold"
            subtitle="Gold remains factual. This example uses the date selected from the lowest readable Meta confidence score."
            example={jsonExampleCodeMap.gold_degraded}
          />

          <JsonExampleModal
            tone="meta"
            confidence="high"
            title="Meta"
            subtitle="Meta directly carries confidence, regime, freshness, and driver context. This example is selected from the highest readable confidence score."
            example={jsonExampleCodeMap.meta_high}
          />
          <JsonExampleModal
            tone="meta"
            confidence="degraded"
            title="Meta"
            subtitle="This degraded Meta example is selected from the lowest readable confidence score, so users can inspect caveats and weaker evidence directly."
            example={jsonExampleCodeMap.meta_degraded}
          />

          <JsonExampleModal
            tone="derived"
            confidence="high"
            title="Derived"
            subtitle="Derived fields are calculated from Gold. This example uses the same high-confidence chain/date selected from Meta."
            example={jsonExampleCodeMap.derived_high}
          />
          <JsonExampleModal
            tone="derived"
            confidence="degraded"
            title="Derived"
            subtitle="This degraded Derived example uses the same low-confidence chain/date selected from Meta."
            example={jsonExampleCodeMap.derived_degraded}
          />

          <div className="mt-14 px-2 text-center">
            <h2 className="text-[26px] font-black tracking-[-0.02em] text-[#0d2447]">
              Get started in 3 easy steps
            </h2>
            <div className="mx-auto mt-7 grid max-w-[900px] gap-6 md:grid-cols-3 md:gap-8">
              <StepItem number="1" title="Choose a plan" note="Pick the right plan for your needs" />
              <StepItem number="2" title="Get API access" note="Instant access to the JSON API" />
              <StepItem number="3" title="Pull JSON" note="Integrate and start building" />
            </div>
          </div>

          <div className="mt-14 -mx-5 bg-[#031329] px-5 py-10 sm:-mx-7 sm:px-7 lg:-mx-10 lg:px-10 2xl:-mx-16 2xl:px-16">
            <div id="pricing" className="mx-auto w-full">
              <div className="grid gap-7 xl:grid-cols-3">
                <PlanCard
                  tone="free"
                  name="Free"
                  price="$0"
                  pill="Public surface"
                  headline="Full web surface — no API access."
                  body="Track record, status, methodology, glossary, thresholds, and schema reference. The same published reference data subscribers receive — readable on-site, not downloadable."
                  bestFor="Best for: exploring the product before subscribing."
                  href="/status"
                  cta="Open public surface →"
                />
                <PlanCard
                  tone="basic"
                  name="Single Chain"
                  price="$49/mo"
                  pill="1 chain · 90d · JSON"
                  headline="One chain. API access. 90-day history."
                  body="Daily on-chain reference data for one chain of your choice — BTC, ETH, ARB, or BASE. Gold, Derived, and Meta JSON delivered via authenticated API."
                  bestFor="Best for: independent analysts validating the dataset against one chain."
                  href="/api/v1/checkout?plan=basic"
                  cta="Start Single Chain →"
                />
                <PlanCard
                  tone="pro"
                  name="Research"
                  price="$149/mo"
                  pill="4 chains · 365d · JSON"
                  headline="All four chains. API access. 365-day history."
                  body="Daily on-chain reference data across BTC, ETH, ARB, and BASE. Gold, Derived, and Meta JSON delivered via authenticated API. Standard Research includes 365 days of subscriber API history. The public track record may be longer because it reflects the full published archive."
                  bestFor="Best for: multi-chain research, backtesting, and production pipelines."
                  href="/api/v1/checkout?plan=pro"
                  cta="Start Research →"
              
                />
              </div>
            </div>

          </div>

        </SectionShell>
      </section>
    </main>
  );
}