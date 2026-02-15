"use client";

import React, { useEffect, useMemo, useState } from "react";
import { ScorecardView, type Scorecard } from "@/components/scorecard/Scorecard";
import { buildChainIntelligenceSummary, type ExplainMode } from "@/lib/summary/chainSummary";
import type { ChainId, MetaFile } from "@/lib/types";

type ExportWindowResponse = {
  dataset_id: string | null;
  revision_id: number | null;
  chain: ChainId;
  genre: "gold" | "meta" | "derived";
  window: string;
  data: any;
};

type SummaryResponse = {
  dataset_id: string | null;
  revision_id: number | null;
  chain: ChainId;
  metric: string;
  start: string;
  end: string;
  rows: Array<{ date: string; daily: number | null; ma7: number | null; ma30: number | null }>;
  freshness?: { asof: string; lag_days: number };
};

type TriSeriesPoint = { date: string; daily: number | null; ma7: number | null; ma30: number | null };

function isValidISODate(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function getString(v: any): string | null {
  return typeof v === "string" && v.trim().length ? v : null;
}

function getNumber(v: any): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function clampWindowToExport(windowDays: number): 7 | 30 | 90 | 180 | 365 {
  const allowed: Array<7 | 30 | 90 | 180 | 365> = [7, 30, 90, 180, 365];
  if (allowed.includes(windowDays as any)) return windowDays as any;
  let best: 7 | 30 | 90 | 180 | 365 = 180;
  let bestDist = Infinity;
  for (const w of allowed) {
    const d = Math.abs(w - windowDays);
    if (d < bestDist) {
      best = w;
      bestDist = d;
    }
  }
  return best;
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-ui-border bg-ui-bg/15 px-3 py-1 text-[11px] font-semibold text-ui-muted">
      {children}
    </span>
  );
}

function KV({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="text-xs text-ui-faint">{k}</div>
      <div className="text-xs font-mono text-ui-muted tabular-nums">{v}</div>
    </div>
  );
}

function axisLabel(trend: any): string {
  const t = typeof trend === "string" ? trend : "—";
  const v = t.toLowerCase();
  if (v === "rising" || v === "up") return "rising";
  if (v === "cooling" || v === "down" || v === "falling") return "cooling";
  if (v === "stable" || v === "flat" || v === "balanced") return "stable";
  return t;
}

function defaultLagPolicyDays(chain: ChainId): number {
  // Project-level fallback policy (used ONLY if meta does not provide a policy field).
  // This matches the pipeline note: Base/Arbitrum can lag ~1 week; BTC/ETH near daily.
  if (chain === "base" || chain === "arbitrum") return 7;
  return 1;
}

function fmtPct01(x: number | null): string {
  if (x === null) return "—";
  return `${Math.round(x * 100)}%`;
}

function fmtInt(x: number | null): string {
  if (x === null) return "—";
  return `${Math.round(x)}`;
}

function computeCoverageProxy(points: TriSeriesPoint[]) {
  // Coverage proxy: count non-null daily values over expected number of days in the selected window.
  // This is not a substitute for dataset-wide coverage metadata, but gives an explicit, audit-ready proxy.
  const expected = Array.isArray(points) ? points.length : 0;
  if (!expected) return { expected: 0, present: 0, ratio: null as number | null };

  let present = 0;
  for (const p of points) {
    const v = p?.daily;
    if (typeof v === "number" && Number.isFinite(v)) present += 1;
  }

  const ratio = expected > 0 ? present / expected : null;
  return { expected, present, ratio };
}

async function fetchMetaWindow(chain: ChainId, windowDays: number, signal?: AbortSignal): Promise<MetaFile | null> {
  const w = clampWindowToExport(windowDays);
  const res = await fetch(`/api/export/window?chain=${chain}&genre=meta&window=${w}`, { signal, cache: "no-store" });
  if (!res.ok) return null;
  const j = (await res.json()) as ExportWindowResponse;
  const data = j?.data ?? null;
  if (!data || typeof data !== "object") return null;
  if (typeof (data as any).chain !== "string") return null;
  return data as MetaFile;
}

async function fetchSummarySeries(
  chain: ChainId,
  metric: string,
  start: string,
  end: string,
  signal?: AbortSignal
): Promise<TriSeriesPoint[] | null> {
  if (!isValidISODate(start) || !isValidISODate(end)) return null;
  const res = await fetch(`/api/summary?chain=${chain}&metric=${metric}&start=${start}&end=${end}`, {
    signal,
    cache: "no-store",
  });
  if (!res.ok) return null;
  const j = (await res.json()) as SummaryResponse;
  const rows = Array.isArray(j?.rows) ? j.rows : [];
  return rows.map((r) => ({ date: r.date, daily: r.daily ?? null, ma7: r.ma7 ?? null, ma30: r.ma30 ?? null }));
}

function readMetaUpdatedThrough(meta: any): string | null {
  // Try multiple meta shapes (defensive). We keep output ISO-only.
  const a = getString(meta?.updated_through);
  if (a && isValidISODate(a)) return a;

  const b = getString(meta?.freshness?.asof);
  if (b && isValidISODate(b)) return b;

  const c = getString(meta?.confidence?.asof_date);
  if (c && isValidISODate(c)) return c;

  return null;
}

function readMetaLagDays(meta: any): number | null {
  // Prefer explicit fields if present.
  const a = getNumber(meta?.freshness?.lag_days);
  if (a !== null) return a;

  const b = getNumber(meta?.confidence?.lag_days);
  if (b !== null) return b;

  const c = getNumber(meta?.publish_lag_days_policy);
  if (c !== null) return c;

  return null;
}

function readMetaLagPolicyDays(meta: any): number | null {
  const a = getNumber(meta?.publish_lag_days_policy);
  if (a !== null) return a;

  // Alternative naming (defensive)
  const b = getNumber(meta?.lag_policy_days);
  if (b !== null) return b;

  return null;
}

function readMetaConfidence(meta: any): number | null {
  const a = getNumber(meta?.confidence?.confidence_score);
  if (a !== null) return a;

  // Alternative naming (defensive)
  const b = getNumber(meta?.confidence_score);
  if (b !== null) return b;

  return null;
}

function readMetaCoverage(meta: any): { expected: number | null; present: number | null; ratio: number | null } {
  // Defensive: meta may have coverage at different paths.
  const expected = getNumber(meta?.coverage?.expected_days) ?? getNumber(meta?.confidence?.expected_days);
  const present = getNumber(meta?.coverage?.present_days) ?? getNumber(meta?.confidence?.present_days);
  const ratio = getNumber(meta?.coverage?.nonNull_ratio) ?? getNumber(meta?.coverage?.non_null_ratio) ?? getNumber(meta?.confidence?.nonNull_ratio);

  return { expected, present, ratio };
}

export function ChainDiagnosticHeader(props: {
  chain: ChainId;
  windowDays: number;
  start: string;
  end: string;
}) {
  const { chain, windowDays, start, end } = props;

  const [meta, setMeta] = useState<MetaFile | null>(null);
  const [anchors, setAnchors] = useState<Record<string, TriSeriesPoint[]>>({});
  const [explainMode, setExplainMode] = useState<ExplainMode>("basic");

  useEffect(() => {
    let cancelled = false;
    const ac = new AbortController();

    async function run() {
      try {
        const [m, a, f] = await Promise.all([
          fetchMetaWindow(chain, windowDays, ac.signal),
          fetchSummarySeries(chain, "tx_count_daily", start, end, ac.signal),
          fetchSummarySeries(chain, "median_tx_fee_native", start, end, ac.signal),
        ]);
        if (cancelled) return;

        setMeta(m);
        setAnchors({
          tx_count_daily: a ?? [],
          median_tx_fee_native: f ?? [],
        });
      } catch {
        if (cancelled) return;
        setMeta(null);
        setAnchors({});
      }
    }

    run();
    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [chain, windowDays, start, end]);

  const regimeLabel = (meta as any)?.regime?.label ?? "—";
  const axes = (meta as any)?.regime?.axes ?? {};
  const demandTrend = axisLabel((axes as any)?.demand?.trend);
  const frictionTrend = axisLabel((axes as any)?.friction?.trend);
  const capacityTrend = axisLabel((axes as any)?.capacity?.trend);

  // Audit-dimension extraction (robust fallbacks)
  const updatedThrough = useMemo(() => readMetaUpdatedThrough(meta), [meta]);
  const lagDaysObserved = useMemo(() => readMetaLagDays(meta), [meta]);

  const lagPolicyDays = useMemo(() => {
    const fromMeta = readMetaLagPolicyDays(meta);
    if (fromMeta !== null) return fromMeta;
    return defaultLagPolicyDays(chain);
  }, [meta, chain]);

  const lagPolicySource = useMemo(() => {
    const fromMeta = readMetaLagPolicyDays(meta);
    return fromMeta !== null ? "meta" : "default project policy";
  }, [meta]);

  const confidence = useMemo(() => readMetaConfidence(meta), [meta]);
  const confidencePct = useMemo(() => (confidence !== null ? `${Math.round(confidence * 100)}%` : "—"), [confidence]);

  const metaCoverage = useMemo(() => readMetaCoverage(meta), [meta]);
  const txCoverageProxy = useMemo(() => computeCoverageProxy(anchors.tx_count_daily ?? []), [anchors]);

  const coverageExpected = metaCoverage.expected ?? (txCoverageProxy.expected || null);
  const coveragePresent = metaCoverage.present ?? (txCoverageProxy.present || null);
  const coverageRatio = metaCoverage.ratio ?? txCoverageProxy.ratio;

  const coverageSource = useMemo(() => {
    const hasMeta = metaCoverage.expected !== null || metaCoverage.present !== null || metaCoverage.ratio !== null;
    return hasMeta ? "meta" : "proxy: tx_count_daily";
  }, [metaCoverage.expected, metaCoverage.present, metaCoverage.ratio]);

  const summary = useMemo(() => {
    try {
      return buildChainIntelligenceSummary({
        chain,
        mode: explainMode,
        meta,
        seriesByBaseKey: anchors,
      });
    } catch {
      return { title: "Chain intelligence summary", body: "—" };
    }
  }, [anchors, chain, explainMode, meta]);

  const scorecard: Scorecard | null = ((meta as any)?.scorecard as any) ?? null;

  return (
    <section className="mb-10 rounded-3xl border border-ui-border bg-ui-bg/20 p-7 ui-lift">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Pill>Diagnostic layer</Pill>
              <Pill>Regime: {regimeLabel}</Pill>
              <Pill>Window: {windowDays}d</Pill>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-ui-border bg-ui-bg/15 p-4">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-ui-faint">Axes</div>
                <div className="mt-3 space-y-2">
                  <KV k="Demand" v={demandTrend} />
                  <KV k="Friction" v={frictionTrend} />
                  <KV k="Capacity" v={capacityTrend} />
                </div>
                <div className="mt-3 text-xs text-ui-faint">
                  Axes summarize observed context (not causal, not predictive).
                </div>
              </div>

              <div className="rounded-2xl border border-ui-border bg-ui-bg/15 p-4">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-ui-faint">Audit</div>
                <div className="mt-3 space-y-2">
                  <KV
                    k="Updated-through"
                    v={updatedThrough && isValidISODate(updatedThrough) ? updatedThrough : "—"}
                  />
                  <KV
                    k="Lag (observed)"
                    v={lagDaysObserved !== null ? `${fmtInt(lagDaysObserved)}d` : "—"}
                  />
                  <KV
                    k="Lag policy"
                    v={`${fmtInt(lagPolicyDays)}d (${lagPolicySource})`}
                  />
                  <KV
                    k="Coverage"
                    v={
                      coverageExpected !== null && coveragePresent !== null
                        ? `${fmtInt(coveragePresent)}/${fmtInt(coverageExpected)} (${fmtPct01(coverageRatio)})`
                        : coverageRatio !== null
                        ? `${fmtPct01(coverageRatio)}`
                        : "—"
                    }
                  />
                  <KV k="Coverage source" v={coverageSource} />
                  <KV k="Confidence" v={confidencePct} />
                </div>

                <div className="mt-3 text-xs text-ui-faint leading-relaxed">
                  Missing values render as gaps (null), never zeros. All outputs are descriptive-only.
                </div>

                <div className="mt-2 text-[11px] text-ui-faint leading-relaxed">
                  Note: lag policy describes typical publication delay; observed lag may vary by dataset revision and
                  ingestion.
                </div>
              </div>

              <div className="rounded-2xl border border-ui-border bg-ui-bg/15 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-ui-faint">Summary</div>
                  <button
                    type="button"
                    className="rounded-full border border-ui-border bg-ui-bg/10 px-3 py-1 text-[11px] font-semibold text-ui-muted hover:bg-ui-bg/20"
                    onClick={() => setExplainMode((m) => (m === "basic" ? "advanced" : "basic"))}
                  >
                    {explainMode === "basic" ? "Basic" : "Advanced"}
                  </button>
                </div>
                <div className="mt-3 text-sm font-semibold text-ui-text">{summary.title}</div>
                <div className="mt-2 text-sm text-ui-muted">{summary.body}</div>
              </div>
            </div>
          </div>
        </div>

        {scorecard ? <ScorecardView scorecard={scorecard} explainMode={explainMode} /> : null}

        <div className="text-xs text-ui-faint leading-relaxed">
          Guardrail: the diagnostic layer provides context about observed levels, deviations, and data confidence. It does
          not recommend actions. No prices, no forecasts, no advice.
        </div>
      </div>
    </section>
  );
}