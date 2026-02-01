"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import type { ChainId } from "@/lib/types";
import { chooseBundleDate, useBundle, fetchDerivedSeries, fetchGoldSeries, buildDateRangeISO } from "@/lib/data";

import { RegimeBadge } from "@/components/ui/RegimeBadge";
import { MetricTriLineChart } from "@/components/charts/MetricTriLineChart";

import { pickDefaultMetricKeyForChain, getMetricLabel } from "@/lib/registry/metricRegistry";

import {
  resolveTriSeriesKeys,
  buildTriSeries,
  countTriCoverage,
  type DerivedSeriesRow,
  type TriSeriesPoint,
} from "@/lib/series/triSeries";

function chainDisplayName(chain: ChainId) {
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

function chainPrimer(chain: ChainId) {
  // Short, non-controversial primers. (No price, no advice.)
  switch (chain) {
    case "bitcoin":
      return "Settlement-focused L1. Interpreting activity often depends on fee pressure and block-space usage.";
    case "ethereum":
      return "General-purpose L1. Friction and activity often show up via fees, throughput, and value transfer dynamics.";
    case "arbitrum":
      return "Ethereum L2. Activity/fees can reflect rollup usage; some metrics can be structurally sparse or batch-driven.";
    case "base":
      return "Ethereum L2. Similar rollup dynamics: watch activity/fees/throughput with awareness of L2-specific quirks.";
    default:
      return "Chain overview.";
  }
}

function safeTrend(x: any) {
  const v = String(x ?? "—");
  // keep it short in cards
  if (v.length > 18) return v.slice(0, 18) + "…";
  return v;
}

function buildHighlights(meta: any): string[] {
  const out: string[] = [];

  const label = meta?.regime?.label;
  if (label) out.push(`Regime: ${String(label)}`);

  const axes = meta?.regime?.axes;
  const demand = axes?.demand?.trend;
  const friction = axes?.friction?.trend;
  const capacity = axes?.capacity?.trend;

  // If present, this is the “no-reading required” part.
  if (demand != null || friction != null || capacity != null) {
    out.push(`Axes: Demand ${safeTrend(demand)} · Friction ${safeTrend(friction)} · Capacity ${safeTrend(capacity)}`);
  }

  const conf = meta?.confidence?.confidence_score;
  if (typeof conf === "number" && Number.isFinite(conf)) {
    out.push(`Confidence (7d): ${conf.toFixed(2)}`);
  }

  const lag = meta?.publish_lag_days_policy;
  if (typeof lag === "number" && Number.isFinite(lag)) {
    out.push(`Lag policy: ${lag} day(s)`);
  }

  const updated = meta?.updated_through;
  if (typeof updated === "string" && updated.length) {
    out.push(`Updated through: ${updated}`);
  }

  return out.slice(0, 3);
}

export function ChainSnapshotCard(props: { chain: ChainId; metaAsof?: string; derivedAsof?: string; goldAsof?: string }) {
  const { chain, metaAsof, derivedAsof, goldAsof } = props;

  const bundleDate = useMemo(() => {
    return chooseBundleDate({ metaAsof, derivedAsof, goldAsof }) ?? metaAsof ?? derivedAsof ?? goldAsof ?? null;
  }, [metaAsof, derivedAsof, goldAsof]);

  const { data: bundle, isLoading: bundleLoading } = useBundle(chain, bundleDate ?? undefined);
  const meta = (bundle as any)?.meta ?? null;

  const regimeLabel = meta?.regime?.label ?? null;

  // Use derivedAsof as end-of-window because derived is what provides MA7/MA30.
  const chartDates = useMemo(() => {
    if (!derivedAsof) return [];
    return buildDateRangeISO(derivedAsof, 120);
  }, [derivedAsof]);

  const [rows, setRows] = useState<DerivedSeriesRow[]>([]);
  const [rowsLoading, setRowsLoading] = useState(false);
  const [triSeries, setTriSeries] = useState<TriSeriesPoint[]>([]);
  const [metricKey, setMetricKey] = useState<string>("tx_count_daily");

  // Fetch merged rows (derived + gold daily) for a compact preview chart.
  useEffect(() => {
    let alive = true;

    async function run() {
      if (!derivedAsof || chartDates.length === 0) {
        setRows([]);
        return;
      }

      setRowsLoading(true);

      const [derivedRaw, goldRaw] = await Promise.all([
        fetchDerivedSeries(chain, chartDates),
        fetchGoldSeries(chain, chartDates),
      ]);
      if (!alive) return;

      const derivedByDate = new Map<string, Record<string, number | null | undefined>>();
      for (const r of derivedRaw) derivedByDate.set(r.date, r.metrics ?? {});

      // gold can contain nulls; keep only finite numbers
      const goldByDate = new Map<string, Record<string, number>>();
      for (const r of goldRaw) {
        const clean: Record<string, number> = {};
        for (const [k, v] of Object.entries(r.metrics ?? {})) {
          if (typeof v === "number" && Number.isFinite(v)) clean[k] = v;
        }
        goldByDate.set(r.date, clean);
      }

      const merged: DerivedSeriesRow[] = chartDates.map((date) => {
        const d = derivedByDate.get(date) ?? {};
        const g = goldByDate.get(date) ?? {};
        return { date, metrics: { ...d, ...g } };
      });

      // Determine available keys to pick a chain-appropriate default metric.
      const keySet = new Set<string>();
      for (const r of merged) {
        for (const [k, v] of Object.entries(r.metrics ?? {})) {
          if (typeof v === "number" && Number.isFinite(v)) keySet.add(k);
        }
      }
      const keysSorted = Array.from(keySet).sort();
      const nextDefault = pickDefaultMetricKeyForChain(chain, keysSorted);
      setMetricKey(nextDefault);

      setRows(merged);
      setRowsLoading(false);
    }

    run();
    return () => {
      alive = false;
    };
  }, [chain, derivedAsof, chartDates]);

  // Build tri-series for selected default metric
  useEffect(() => {
    if (!rows || rows.length === 0) {
      setTriSeries([]);
      return;
    }

    // Build availableKeys from the window rows (cheap + robust)
    const available = new Set<string>();
    for (const r of rows) {
      for (const [k, v] of Object.entries(r.metrics ?? {})) {
        if (typeof v === "number" && Number.isFinite(v)) available.add(k);
      }
    }

    const keys = resolveTriSeriesKeys({ requestedKey: metricKey, availableKeys: available });
    const built = buildTriSeries({ rows, keys });
    const cov = countTriCoverage(built);

    if (cov.daily + cov.ma7 + cov.ma30 === 0) {
      setTriSeries([]);
      return;
    }

    setTriSeries(built);
  }, [rows, metricKey]);

  const metricLabel = useMemo(() => getMetricLabel(metricKey), [metricKey]);
  const displayName = useMemo(() => chainDisplayName(chain), [chain]);
  const primerText = useMemo(() => chainPrimer(chain), [chain]);
  const highlights = useMemo(() => buildHighlights(meta), [meta]);

  return (
    <div className="rounded-2xl border border-ui-border bg-ui-surface p-4 shadow-sm transition hover:bg-ui-surface2">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-ui-text">{displayName}</div>
          <div className="mt-1 text-[11px] text-ui-muted">
            Snapshot: <span className="text-ui-text">{bundleDate ?? "—"}</span>
          </div>
        </div>
        {regimeLabel ? <RegimeBadge label={regimeLabel} /> : null}
      </div>

      {/* Primer (short, pedagogical) */}
      <div className="mt-3 text-xs text-ui-text">{primerText}</div>

      {/* Default trend */}
      <div className="mt-4">
        <div className="text-[11px] text-ui-muted">Default trend</div>
        <div className="mt-1 text-xs text-ui-text">{metricLabel}</div>

        {/* IMPORTANT: explicit height so recharts ResponsiveContainer can render */}
        <div className="mt-2 h-28 min-h-[112px] w-full">
          {bundleLoading || rowsLoading ? (
            <div className="flex h-full items-center justify-center text-xs text-ui-muted">Loading…</div>
          ) : triSeries.length === 0 ? (
            <div className="flex h-full items-center justify-center text-xs text-ui-muted">No chart data.</div>
          ) : (
            <MetricTriLineChart data={triSeries} />
          )}
        </div>
      </div>

      {/* Highlights (2–3 bullets) */}
      <div className="mt-3 space-y-1">
        {highlights.length === 0 ? (
          <div className="text-xs text-ui-faint">No snapshot highlights available.</div>
        ) : (
          highlights.map((h, i) => (
            <div key={i} className="text-xs text-ui-text">
              • {h}
            </div>
          ))
        )}
      </div>

      <div className="mt-4">
        <Link
          href={`/chains/${chain}`}
          className="inline-flex items-center rounded-xl border border-ui-border bg-ui-surface2 px-3 py-2 text-xs text-ui-text hover:bg-ui-surface focus:outline-none focus:ring-2 focus:ring-ui-accent/30"
        >
          Open diagnostics
        </Link>
      </div>
    </div>
  );
}
