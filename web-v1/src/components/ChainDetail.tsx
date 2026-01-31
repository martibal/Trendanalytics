"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useDatasetIndex, useMeta, fetchDerivedSeries, buildDateRangeISO } from "@/lib/data";
import type { ChainId } from "@/lib/types";
import { RegimeBadge } from "@/components/ui/RegimeBadge";
import { InfoBox } from "@/components/info-boxes/InfoBox";
import { MetricLineChart } from "@/components/charts/MetricLineChart";
import { ScorecardView } from "@/components/scorecard/Scorecard";
import { useUiStore } from "@/store/uiStore";

const CHAINS: ChainId[] = ["bitcoin", "ethereum", "arbitrum", "base"];

function normalizeChain(input: string): ChainId | null {
  const v = input.toLowerCase();
  return (CHAINS as string[]).includes(v) ? (v as ChainId) : null;
}

const METRIC_OPTIONS = [
  { key: "tx_count_daily__ma7", label: "Transactions (7d MA)" },
  { key: "tx_count_daily__ma30", label: "Transactions (30d MA)" },
  { key: "median_tx_fee_native__ma7", label: "Median fee (native, 7d MA)" },
  { key: "median_tx_fee_native__ma30", label: "Median fee (native, 30d MA)" },
  { key: "value_transferred_native__ma7", label: "Value transferred (native, 7d MA)" },
  { key: "value_transferred_native__ma30", label: "Value transferred (native, 30d MA)" },
  { key: "avg_block_time_sec__ma7", label: "Avg block time (sec, 7d MA)" },
  { key: "avg_block_time_sec__ma30", label: "Avg block time (sec, 30d MA)" },
];

function fmtPct(x: number) {
  return `${Math.round(x)}%`;
}

function fmtNum(x: number) {
  // keep simple, avoid locale surprises
  if (!Number.isFinite(x)) return "—";
  const abs = Math.abs(x);
  if (abs >= 1_000_000) return `${(x / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(x / 1_000).toFixed(1)}k`;
  return `${x}`;
}

type Notable = { title: string; basic: string; advanced: string };

function buildNotables(meta: any): Notable[] {
  const out: Notable[] = [];
  if (!meta) return out;

  // 1) Axes snapshot (regime.axes)
  const axes = meta?.regime?.axes;
  if (axes && typeof axes === "object") {
    const demand = axes?.demand?.trend ?? "—";
    const friction = axes?.friction?.trend ?? "—";
    const capacity = axes?.capacity?.trend ?? "—";
    const label = meta?.regime?.label ?? "—";

    out.push({
      title: "Regime snapshot",
      basic: `Regime label is ${label}. Axes trends: Demand ${demand}, Friction ${friction}, Capacity ${capacity}.`,
      advanced:
        `Regime label is ${label}. Axes are banded using ruleset thresholds. ` +
        `Demand band: [${axes?.demand?.band_low ?? "—"}–${axes?.demand?.band_high ?? "—"}], trend=${demand}. ` +
        `Friction band: [${axes?.friction?.band_low ?? "—"}–${axes?.friction?.band_high ?? "—"}], trend=${friction}. ` +
        `Capacity band: [${axes?.capacity?.band_low ?? "—"}–${axes?.capacity?.band_high ?? "—"}], trend=${capacity}.`,
    });
  }

  // 2) Strongest driver by |z_robust|
  const drivers: any[] = Array.isArray(meta?.regime?.drivers) ? meta.regime.drivers : [];
  if (drivers.length > 0) {
    const best = drivers
      .filter((d) => typeof d?.z_robust === "number")
      .sort((a, b) => Math.abs(b.z_robust) - Math.abs(a.z_robust))[0];

    if (best) {
      const metric = best.metric ?? "—";
      const axis = best.axis ?? "—";
      const trend = best.trend ?? "—";
      const z = typeof best.z_robust === "number" ? best.z_robust.toFixed(2) : "—";
      const p = typeof best.pct_90d === "number" ? fmtPct(best.pct_90d) : "—";
      const cur =
        best.current == null ? "—" : typeof best.current === "number" ? fmtNum(best.current) : String(best.current);

      out.push({
        title: "Largest recent deviation",
        basic: `${metric} (axis: ${axis}) is the largest recent deviation: trend=${trend}, p90d=${p}.`,
        advanced: `${metric} (axis: ${axis}) is the largest recent deviation by |z|. current=${cur}, z_robust=${z}, p90d=${p}, trend=${trend}.`,
      });
    }
  }

  // 3) Coverage weak spot from scorecard
  const dims = meta?.scorecard?.dimensions;
  if (dims && typeof dims === "object") {
    const entries = Object.entries(dims)
      .map(([k, v]: any) => ({ key: k, v }))
      .filter((x) => typeof x?.v?.coverage_factor === "number");

    if (entries.length > 0) {
      const weakest = entries.sort((a, b) => a.v.coverage_factor - b.v.coverage_factor)[0];
      const k = weakest.key;
      const cov = fmtPct(weakest.v.coverage_factor * 100);
      const eff = weakest.v.effective_confidence;
      const effTxt = typeof eff === "number" ? eff.toFixed(3) : "—";

      out.push({
        title: "Coverage constraint",
        basic: `${k} has the lowest coverage in the current window (${cov}). Low coverage pulls scores toward neutral (50).`,
        advanced:
          `${k} has the lowest coverage in the current window (${cov}). ` +
          `Effective confidence for this dimension is ${effTxt}. Missing inputs reduce coverage and dampen the score toward 50.`,
      });
    }
  }

  return out.slice(0, 3);
}

export function ChainDetail({ chain }: { chain: string }) {
  const chainId = normalizeChain(chain);
  const { data: ds } = useDatasetIndex();
  const explainMode = useUiStore((s) => s.explainMode);

  const metaAsof = chainId ? ds?.asof_by_genre_chain?.meta?.[chainId] : undefined;
  const { data: meta, error: metaError, isLoading: metaLoading } = useMeta(chainId ?? "bitcoin", metaAsof);

  const [metricKey, setMetricKey] = useState(METRIC_OPTIONS[0].key);
  const [series, setSeries] = useState<Array<{ date: string; value: number }>>([]);
  const [seriesLoading, setSeriesLoading] = useState(false);

  const derivedAsof = chainId ? ds?.asof_by_genre_chain?.derived?.[chainId] : undefined;
  const chartDates = useMemo(() => (derivedAsof ? buildDateRangeISO(derivedAsof, 180) : []), [derivedAsof]);

  const notables = useMemo(() => buildNotables(meta), [meta]);

  useEffect(() => {
    let alive = true;

    async function run() {
      if (!chainId || !derivedAsof) return;
      setSeriesLoading(true);

      const raw = await fetchDerivedSeries(chainId, chartDates);
      if (!alive) return;

      const mapped = raw
        .map((r) => ({ date: r.date, value: r.metrics?.[metricKey] }))
        .filter((p) => typeof p.value === "number") as Array<{ date: string; value: number }>;

      setSeries(mapped);
      setSeriesLoading(false);
    }

    run();
    return () => {
      alive = false;
    };
  }, [chainId, derivedAsof, metricKey, chartDates]);

  if (!chainId) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
        <div className="text-sm text-zinc-300">
          Unknown chain: <span className="font-mono">{chain}</span>
        </div>
        <div className="mt-3 text-xs text-zinc-500">Supported: {CHAINS.join(", ")}</div>
        <div className="mt-4">
          <Link href="/" className="text-sm text-zinc-200 underline">
            Back
          </Link>
        </div>
      </div>
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold capitalize tracking-tight">{chainId}</h1>
          <div className="mt-1 text-xs text-zinc-400">
            Meta as-of: <span className="text-zinc-200">{metaAsof ?? "—"}</span> · Derived as-of:{" "}
            <span className="text-zinc-200">{derivedAsof ?? "—"}</span>
          </div>
        </div>
        {meta?.regime?.label ? <RegimeBadge label={meta.regime.label} /> : null}
      </div>

      {/* SCORECARD (A) */}
      {metaLoading ? null : metaError || !meta?.scorecard ? null : (
        <ScorecardView scorecard={meta.scorecard} explainMode={explainMode} />
      )}

      {/* NOTABLES (D) */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">Notables</div>
            <div className="mt-1 text-xs text-zinc-500">
              Descriptive highlights based on deviation, ranks, and coverage (no causal claims).
            </div>
          </div>
          <Link href="/methodology" className="text-xs text-zinc-300 underline">
            Methodology
          </Link>
        </div>

        <div className="mt-4 space-y-3">
          {metaLoading ? (
            <div className="text-sm text-zinc-400">Loading…</div>
          ) : metaError || !meta ? (
            <div className="text-sm text-zinc-400">No meta available.</div>
          ) : notables.length === 0 ? (
            <div className="text-sm text-zinc-400">No notables available for this snapshot.</div>
          ) : (
            notables.map((n) => (
              <div key={n.title} className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3">
                <div className="text-xs font-semibold text-zinc-200">{n.title}</div>
                <div className="mt-1 text-sm text-zinc-300">
                  {explainMode === "advanced" ? n.advanced : n.basic}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-4">
          <InfoBox
            title="Interpretation guardrails"
            basic="Notables highlight unusual or persistent patterns relative to recent history. They do not imply causality or future outcomes."
            advanced="Selection is based on robust deviation (|z|), percentile ranks (90d), and coverage constraints. Notables are descriptive and may have multiple plausible explanations."
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">Regime drivers (7d window)</div>
              <div className="mt-1 text-xs text-zinc-500">
                Deterministic ruleset · robust z-scores · short-vs-long momentum
              </div>
            </div>
            <Link href="/methodology" className="text-xs text-zinc-300 underline">
              Methodology
            </Link>
          </div>

          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-zinc-400">
                <tr>
                  <th className="py-2 pr-3">Axis</th>
                  <th className="py-2 pr-3">Metric</th>
                  <th className="py-2 pr-3">Trend</th>
                  <th className="py-2 pr-3">z (robust)</th>
                  <th className="py-2 pr-3">pct rank (90d)</th>
                </tr>
              </thead>
              <tbody className="text-zinc-200">
                {metaLoading ? (
                  <tr>
                    <td className="py-2" colSpan={5}>
                      Loading…
                    </td>
                  </tr>
                ) : metaError || !meta ? (
                  <tr>
                    <td className="py-2" colSpan={5}>
                      No meta available.
                    </td>
                  </tr>
                ) : (
                  meta.regime.drivers.map((d: any) => (
                    <tr key={`${d.axis}-${d.metric}`} className="border-t border-zinc-900">
                      <td className="py-2 pr-3 capitalize">{d.axis}</td>
                      <td className="py-2 pr-3 font-mono">{d.metric}</td>
                      <td className="py-2 pr-3">{d.trend}</td>
                      <td className="py-2 pr-3">{Number(d.z_robust).toFixed(2)}</td>
                      <td className="py-2 pr-3">{Number(d.pct_90d).toFixed(1)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4">
            <InfoBox
              title="Interpretation guardrails"
              basic="This table highlights which metrics contributed most to the current regime label. It does not imply causality or future outcomes."
              advanced="Drivers are selected by ruleset-specific importance ordering and robust deviation magnitude. Values are descriptive: z-scores (robust, median/MAD) and percentile rank within the last 90 days. No predictive claims are made."
            />
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">Trend series</div>
              <div className="mt-1 text-xs text-zinc-500">Derived daily series (smoothed)</div>
            </div>
            <select
              className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-200"
              value={metricKey}
              onChange={(e) => setMetricKey(e.target.value)}
            >
              {METRIC_OPTIONS.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-4">
            {seriesLoading ? (
              <div className="text-sm text-zinc-400">Loading series…</div>
            ) : series.length === 0 ? (
              <div className="text-sm text-zinc-400">No derived series available for this window.</div>
            ) : (
              <MetricLineChart data={series} valueKey="value" />
            )}
          </div>

          <div className="mt-4">
            <InfoBox
              title="What this chart is"
              basic="A smoothed time series (moving average) for the selected on-chain metric."
              advanced="Each point is read from /derived/<chain>/<date>.json. Moving averages are precomputed in the pipeline (e.g., MA7 / MA30). Chart window currently defaults to 180 days ending at the chain’s derived as-of date."
            />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
        <div className="text-sm font-semibold">Data freshness and coverage</div>
        <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2">
            <div className="text-[11px] text-zinc-400">Updated through</div>
            <div className="mt-1 text-sm text-zinc-200">{meta?.updated_through ?? "—"}</div>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2">
            <div className="text-[11px] text-zinc-400">Confidence (7d)</div>
            <div className="mt-1 text-sm text-zinc-200">
              {meta?.confidence?.confidence_score != null ? meta.confidence.confidence_score.toFixed(2) : "—"}
            </div>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2">
            <div className="text-[11px] text-zinc-400">Lag policy (days)</div>
            <div className="mt-1 text-sm text-zinc-200">{meta?.publish_lag_days_policy ?? "—"}</div>
          </div>
        </div>
      </div>

      <div>
        <Link href="/" className="text-sm text-zinc-300 underline">
          Back to overview
        </Link>
      </div>
    </section>
  );
}
