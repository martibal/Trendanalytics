// src/components/landing/ChainSnapshotCard.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

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

import { useDatasetIndex } from "@/hooks/useDatasetIndex";

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
  if (v.length > 18) return v.slice(0, 18) + "…";
  return v;
}

function normalizeLabel(label: unknown): string {
  return String(label ?? "").toUpperCase().trim();
}

function getConfidenceScore(meta: any): number | null {
  const v = meta?.confidence?.confidence_score;
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

type GateState = {
  status: "ok" | "unknown_degraded";
  reason: "ok" | "missing_meta_inputs" | "confidence_below_threshold";
  threshold: number;
  confidence: number | null;
};

function computeGate(meta: any, threshold: number): GateState {
  if (!meta) return { status: "unknown_degraded", reason: "missing_meta_inputs", threshold, confidence: null };
  const confidence = getConfidenceScore(meta);
  if (confidence === null) return { status: "unknown_degraded", reason: "missing_meta_inputs", threshold, confidence: null };
  if (confidence < threshold) return { status: "unknown_degraded", reason: "confidence_below_threshold", threshold, confidence };
  return { status: "ok", reason: "ok", threshold, confidence };
}

function gateReasonLabel(g: GateState): string {
  switch (g.reason) {
    case "ok":
      return "OK";
    case "missing_meta_inputs":
      return "Missing META inputs";
    case "confidence_below_threshold":
      return `Confidence < ${Math.round(g.threshold * 100)}%`;
    default:
      return "Gated";
  }
}

type Verdict = "LIKELY_NOISE" | "STRUCTURAL_SHIFT" | "INSUFFICIENT_DATA";

function verdictLabel(v: Verdict): string {
  if (v === "LIKELY_NOISE") return "Likely noise";
  if (v === "STRUCTURAL_SHIFT") return "Structural shift";
  return "Insufficient data";
}

function verdictTone(v: Verdict): string {
  if (v === "LIKELY_NOISE") return "border-ui-ok/25 bg-ui-ok/10 text-ui-ok";
  if (v === "STRUCTURAL_SHIFT") return "border-ui-warn/25 bg-ui-warn/10 text-ui-warn";
  return "border-ui-border bg-ui-bg/20 text-ui-muted";
}

function computeVerdict(meta: any, gate: GateState): { verdict: Verdict; reason: string } {
  // Deterministic, descriptive-only:
  // - If META missing or gated => insufficient data
  // - STABLE => likely noise
  // - HEATING/CONGESTED/CHEAP => structural shift
  // - otherwise => insufficient (unknown/degraded label)
  if (!meta) return { verdict: "INSUFFICIENT_DATA", reason: "META is unavailable." };
  if (meta?.missing) return { verdict: "INSUFFICIENT_DATA", reason: "META is marked missing for this chain/date." };
  if (gate.status !== "ok") return { verdict: "INSUFFICIENT_DATA", reason: gateReasonLabel(gate) };

  const label = normalizeLabel(meta?.regime?.label);
  if (label === "STABLE") {
    return {
      verdict: "LIKELY_NOISE",
      reason: "Canonical regime is stable (no persistent regime shift detected in the current window).",
    };
  }
  if (label === "HEATING" || label === "CONGESTED" || label === "CHEAP") {
    return {
      verdict: "STRUCTURAL_SHIFT",
      reason:
        "Canonical regime indicates a persistent shift (one or more axes are outside typical bands with supporting drivers).",
    };
  }
  return { verdict: "INSUFFICIENT_DATA", reason: "Regime label is not recognized or is degraded." };
}

function VerdictPill(props: { verdict: Verdict }) {
  const tone = verdictTone(props.verdict);
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold ${tone}`}
      title="Noise vs structural (derived from canonical regime + gating)"
    >
      <span className="text-ui-faint">Verdict</span>
      <span className="text-ui-text">{verdictLabel(props.verdict)}</span>
    </div>
  );
}

function buildHighlights(meta: any, effectiveRegimeLabel: string | null, gate: GateState): string[] {
  const out: string[] = [];

  if (effectiveRegimeLabel) out.push(`Regime: ${String(effectiveRegimeLabel)}`);

  const axes = meta?.regime?.axes;
  const demand = axes?.demand?.trend;
  const friction = axes?.friction?.trend;
  const capacity = axes?.capacity?.trend;

  if (demand != null || friction != null || capacity != null) {
    out.push(`Axes: Demand ${safeTrend(demand)} · Friction ${safeTrend(friction)} · Capacity ${safeTrend(capacity)}`);
  }

  const conf = getConfidenceScore(meta);
  if (typeof conf === "number") out.push(`Confidence (7d): ${conf.toFixed(2)}`);

  // If gated, surface the deterministic reason (descriptive only).
  if (gate.status !== "ok") out.push(`Gate: ${gateReasonLabel(gate)}`);

  return out.slice(0, 3);
}

function FactPill(props: { label: string; value: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-ui-border bg-ui-bg/15 px-3 py-1 text-[11px]">
      <span className="text-ui-faint">{props.label}</span>
      <span className="font-mono text-ui-muted">{props.value}</span>
    </div>
  );
}

function LegendDot(props: { rgbVar: "--chart-daily" | "--chart-ma7" | "--chart-ma30" }) {
  return (
    <span
      className="inline-block h-2.5 w-2.5 rounded-sm"
      style={{ background: `rgb(var(${props.rgbVar}) / 0.95)` }}
      aria-hidden="true"
    />
  );
}

export function ChainSnapshotCard(props: { chain: ChainId; metaAsof?: string; derivedAsof?: string; goldAsof?: string }) {
  const { chain, metaAsof, derivedAsof, goldAsof } = props;

  const bundleDate = useMemo(() => {
    return chooseBundleDate({ metaAsof, derivedAsof, goldAsof }) ?? metaAsof ?? derivedAsof ?? goldAsof ?? null;
  }, [metaAsof, derivedAsof, goldAsof]);

  const { data: bundle, isLoading: bundleLoading } = useBundle(chain, bundleDate ?? undefined);
  const meta = (bundle as any)?.meta ?? null;

  const { gatingThreshold } = useDatasetIndex();
  const effectiveThreshold = useMemo(() => {
    return typeof gatingThreshold === "number" && Number.isFinite(gatingThreshold) ? gatingThreshold : 0.4;
  }, [gatingThreshold]);

  const gate = useMemo(() => computeGate(meta, effectiveThreshold), [meta, effectiveThreshold]);

  // Headline regime is deterministic from META + contract threshold; no backfill is applied.
  const effectiveRegimeLabel = useMemo(() => {
    const raw = meta?.regime?.label ?? null;
    if (!raw) return null;
    return gate.status === "ok" ? String(raw) : "UNKNOWN/DEGRADED";
  }, [meta, gate.status]);

  // Use derivedAsof as end-of-window because derived is what provides MA7/MA30.
  const chartDates = useMemo(() => {
    if (!derivedAsof) return [];
    return buildDateRangeISO(derivedAsof, 120);
  }, [derivedAsof]);

  const [rows, setRows] = useState<DerivedSeriesRow[]>([]);
  const [rowsLoading, setRowsLoading] = useState(false);

  const [triSeries, setTriSeries] = useState<TriSeriesPoint[]>([]);
  const [metricKey, setMetricKey] = useState<string>("tx_count_daily");

  // Prevent re-setting the default metric every fetch.
  const didPickDefaultRef = useRef(false);

  // Fetch merged rows (derived + gold daily) for a compact preview chart.
  useEffect(() => {
    let alive = true;

    async function run() {
      if (!derivedAsof || chartDates.length === 0) {
        setRows([]);
        setTriSeries([]);
        didPickDefaultRef.current = false;
        return;
      }

      setRowsLoading(true);

      const [derivedRaw, goldRaw] = await Promise.all([fetchDerivedSeries(chain, chartDates), fetchGoldSeries(chain, chartDates)]);
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

      // Pick default ONCE per card lifecycle (or when chain changes via remount).
      if (!didPickDefaultRef.current) {
        const nextDefault = pickDefaultMetricKeyForChain(chain, keysSorted);
        setMetricKey(nextDefault);
        didPickDefaultRef.current = true;
      }

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

  const verdict = useMemo(() => computeVerdict(meta, gate), [meta, gate]);

  const highlights = useMemo(() => buildHighlights(meta, effectiveRegimeLabel, gate), [meta, effectiveRegimeLabel, gate]);

  const lagPolicy = meta?.publish_lag_days_policy;
  const updatedThrough = meta?.updated_through;

  const conf = useMemo(() => getConfidenceScore(meta), [meta]);
  const confPct = useMemo(() => (conf !== null ? `${Math.round(conf * 100)}%` : "—"), [conf]);
  const thresholdPct = useMemo(() => `${Math.round(effectiveThreshold * 100)}%`, [effectiveThreshold]);

  return (
    <div className="ui-card ui-lift rounded-3xl border border-ui-border bg-ui-bg/20 p-5">
      {/* Top row */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-ui-text">{displayName}</div>
          <div className="mt-1 text-[11px] text-ui-faint">
            Snapshot: <span className="text-ui-text">{bundleDate ?? "—"}</span>
          </div>
        </div>
      </div>

      {/* Primary surface: Verdict (noise vs structural) */}
      <div className="mt-3">
        <div className="flex flex-wrap items-center gap-2">
          <VerdictPill verdict={verdict.verdict} />
          {effectiveRegimeLabel ? (
            <div className="inline-flex items-center gap-2 rounded-full border border-ui-border bg-ui-bg/15 px-3 py-1 text-[11px]">
              <span className="text-ui-faint">Canonical</span>
              <RegimeBadge label={effectiveRegimeLabel} />
            </div>
          ) : null}
          {gate.status !== "ok" ? <FactPill label="gate" value={gateReasonLabel(gate)} /> : null}
        </div>
        <div className="mt-2 text-sm text-ui-muted">{verdict.reason}</div>
      </div>

      {/* Facts (explicit dimensions) */}
      <div className="mt-3 flex flex-wrap gap-2">
        <FactPill label="derived as-of" value={derivedAsof ?? "—"} />
        <FactPill label="gold as-of" value={goldAsof ?? "—"} />
        {typeof lagPolicy === "number" && Number.isFinite(lagPolicy) ? <FactPill label="lag policy" value={`${lagPolicy}d`} /> : null}
        {typeof updatedThrough === "string" && updatedThrough.length ? <FactPill label="updated through" value={updatedThrough} /> : null}
        <FactPill label="confidence" value={confPct} />
        <FactPill label="gate threshold" value={thresholdPct} />
      </div>

      {/* Primer */}
      <div className="mt-3 text-xs text-ui-muted">{primerText}</div>

      {/* Chart preview */}
      <div className="mt-4">
        <div className="flex items-baseline justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] text-ui-faint">Primary signal</div>
            <div className="mt-1 truncate text-xs text-ui-text">{metricLabel}</div>
          </div>

          {/* Legend with token-aligned semantics */}
          <div className="shrink-0 rounded-full border border-ui-border bg-ui-bg/15 px-2.5 py-1 text-[11px] text-ui-faint">
            <span className="inline-flex items-center gap-2">
              <span className="inline-flex items-center gap-1">
                <LegendDot rgbVar="--chart-daily" />
                <span>Daily</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <LegendDot rgbVar="--chart-ma7" />
                <span>MA7</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <LegendDot rgbVar="--chart-ma30" />
                <span>MA30</span>
              </span>
            </span>
          </div>
        </div>

        <div className="mt-2 h-28 min-h-[112px] w-full rounded-2xl border border-ui-border/15 bg-ui-bg/10 p-2">
          {bundleLoading || rowsLoading ? (
            <div className="flex h-full items-center justify-center text-xs text-ui-muted">Loading…</div>
          ) : triSeries.length === 0 ? (
            <div className="flex h-full items-center justify-center text-xs text-ui-muted">No chart data.</div>
          ) : (
            <MetricTriLineChart data={triSeries} />
          )}
        </div>
      </div>

      {/* Highlights */}
      <div className="mt-3 space-y-1">
        {highlights.length === 0 ? (
          <div className="text-xs text-ui-faint">No snapshot highlights available.</div>
        ) : (
          highlights.map((h, i) => (
            <div key={i} className="text-xs text-ui-muted">
              <span className="text-ui-faint">•</span> {h}
            </div>
          ))
        )}
      </div>

      {/* CTA */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Link
          href={`/chains/${chain}`}
          className="inline-flex items-center justify-center rounded-full border border-ui-border bg-ui-bg/15 px-4 py-2 text-xs font-semibold text-ui-text hover:bg-ui-bg/25 focus:outline-none focus:ring-2 focus:ring-ui-accent/30"
        >
          Open dashboard
        </Link>

        {/* web6 §4.1: direct TrustSection entry */}
        <Link
          href={`/chains/${chain}#trust`}
          className="inline-flex items-center justify-center rounded-full border border-ui-border bg-ui-bg/15 px-4 py-2 text-xs font-semibold text-ui-text hover:bg-ui-bg/25 focus:outline-none focus:ring-2 focus:ring-ui-accent/30"
        >
          View history
        </Link>
      </div>
    </div>
  );
}