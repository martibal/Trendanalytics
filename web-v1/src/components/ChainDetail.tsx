"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  useDatasetIndex,
  useBundle,
  chooseBundleDate,
  fetchDerivedSeries,
  buildDateRangeISO,
} from "@/lib/data";
import type { ChainId } from "@/lib/types";

import { RegimeBadge } from "@/components/ui/RegimeBadge";
import { InfoBox } from "@/components/info-boxes/InfoBox";
import { MetricTriLineChart } from "@/components/charts/MetricTriLineChart";
import { ScorecardView } from "@/components/scorecard/Scorecard";

import { useUiStore } from "@/store/uiStore";
import { getMetricDescription, getMetricOptionsForChain, getMetricLabel } from "@/lib/registry/metricRegistry";

import {
  resolveTriSeriesKeys,
  buildTriSeries,
  countTriCoverage,
  type DerivedSeriesRow,
  type TriSeriesPoint,
} from "@/lib/series/triSeries";

const CHAINS: ChainId[] = ["bitcoin", "ethereum", "arbitrum", "base"];

function normalizeChain(input: string): ChainId | null {
  const v = input.toLowerCase();
  return (CHAINS as string[]).includes(v) ? (v as ChainId) : null;
}

function fmtPct(x: number) {
  return `${Math.round(x)}%`;
}

function fmtNum(x: number) {
  if (!Number.isFinite(x)) return "—";
  const abs = Math.abs(x);
  if (abs >= 1_000_000) return `${(x / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(x / 1_000).toFixed(1)}k`;
  if (abs > 0 && abs < 1) return x.toFixed(4);
  return `${x.toFixed(2)}`;
}

type ExplainMode = "basic" | "advanced";

type Notable = {
  title: string;
  basic: string;
  advanced: string;
};

function buildNotables(args: {
  meta: any;
  explainMode: ExplainMode;
  metricLabelByKey: Map<string, string>;
}): Notable[] {
  const { meta, explainMode, metricLabelByKey } = args;
  const out: Notable[] = [];
  if (!meta) return out;

  const labelForMetric = (metricKey: string) => metricLabelByKey.get(metricKey) ?? getMetricLabel(metricKey);
  const advMetricSuffix = (metricKey: string) => (explainMode === "advanced" ? ` (key: ${metricKey})` : "");

  // 1) Regime snapshot
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

  // 2) Largest recent deviation by |z_robust|
  const drivers: any[] = Array.isArray(meta?.regime?.drivers) ? meta.regime.drivers : [];
  if (drivers.length > 0) {
    const best = drivers
      .filter((d) => typeof d?.z_robust === "number" && d?.metric != null)
      .sort((a, b) => Math.abs(b.z_robust) - Math.abs(a.z_robust))[0];

    if (best) {
      const metricKey = String(best.metric);
      const metricLabel = labelForMetric(metricKey);
      const axis = best.axis ?? "—";
      const trend = best.trend ?? "—";
      const z = typeof best.z_robust === "number" ? best.z_robust.toFixed(2) : "—";
      const p = typeof best.pct_90d === "number" ? fmtPct(best.pct_90d) : "—";
      const cur =
        best.current == null ? "—" : typeof best.current === "number" ? fmtNum(best.current) : String(best.current);

      const registryBasic = getMetricDescription(metricKey, "basic");
      const registryAdvanced = getMetricDescription(metricKey, "advanced");

      out.push({
        title: "Largest recent deviation",
        basic:
          `${metricLabel} (axis: ${axis}) is the largest recent deviation: trend=${trend}, p90d=${p}.` +
          (registryBasic ? ` ${registryBasic}` : ""),
        advanced:
          `${metricLabel}${advMetricSuffix(metricKey)} (axis: ${axis}) is the largest recent deviation by |z|. ` +
          `current=${cur}, z_robust=${z}, p90d=${p}, trend=${trend}.` +
          (registryAdvanced ? ` ${registryAdvanced}` : ""),
      });
    }
  }

  // 3) Coverage constraint
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

function arraysEqual(a: string[] | null, b: string[] | null) {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

function safeObjectKeysCount(x: any): number {
  if (!x || typeof x !== "object") return 0;
  return Object.keys(x).length;
}

export function ChainDetail({ chain }: { chain: string }) {
  const chainId = normalizeChain(chain);
  const { data: ds } = useDatasetIndex();
  const explainMode = useUiStore((s) => s.explainMode) as ExplainMode;

  // As-of dates from dataset index
  const metaAsof = chainId ? (ds as any)?.asof_by_genre_chain?.meta?.[chainId] : undefined;
  const derivedAsof = chainId ? (ds as any)?.asof_by_genre_chain?.derived?.[chainId] : undefined;
  const goldAsof = chainId ? (ds as any)?.asof_by_genre_chain?.gold?.[chainId] : undefined;

  const bundleDate = useMemo(() => {
    return chooseBundleDate({ metaAsof, derivedAsof, goldAsof }) ?? metaAsof ?? derivedAsof ?? goldAsof ?? null;
  }, [metaAsof, derivedAsof, goldAsof]);

  const { data: bundle, error: bundleError, isLoading: bundleLoading } = useBundle(
    chainId ?? "bitcoin",
    bundleDate ?? undefined
  );

  const meta = bundle?.meta ?? null;
  const gold = bundle?.gold ?? null;

  const chartDates = useMemo(() => (derivedAsof ? buildDateRangeISO(derivedAsof, 180) : []), [derivedAsof]);

  // Derived window rows (for charts)
  const [rows, setRows] = useState<DerivedSeriesRow[]>([]);
  const [rowsLoading, setRowsLoading] = useState(false);

  // Keys that actually have at least one numeric datapoint in the 180d window
  const [windowMetricKeys, setWindowMetricKeys] = useState<string[] | null>(null);

  // Selected metric (UI selection)
  const [metricKey, setMetricKey] = useState<string>("tx_count_daily");

  // Tri-series result
  const [triSeries, setTriSeries] = useState<TriSeriesPoint[]>([]);

  // Avoid infinite loops when we update metricKey inside the fetch effect
  const lastAutoSetRef = useRef<string | null>(null);

  // Diagnostics (advanced)
  const [diag, setDiag] = useState<null | {
    selected: string;
    baseKey: string;
    dailyKey: string;
    ma7Key: string;
    ma30Key: string;
    availableKeys: number;
    coverage: { daily: number; ma7: number; ma30: number; total: number };
    sample: { daily: number | null; ma7: number | null; ma30: number | null };
  }>(null);

  const metricOptions = useMemo(() => {
    return getMetricOptionsForChain(chainId ?? "bitcoin", {
      availableKeys: windowMetricKeys ?? undefined,
    });
  }, [chainId, windowMetricKeys]);

  // Map metricKey -> label for this chain (used in Regime drivers + Notables).
  const metricLabelByKey = useMemo(() => {
    const m = new Map<string, string>();
    for (const opt of metricOptions) m.set(opt.key, opt.label);
    return m;
  }, [metricOptions]);

  // Keep metricKey valid when options change
  useEffect(() => {
    if (!metricOptions || metricOptions.length === 0) return;
    if (metricOptions.some((m) => m.key === metricKey)) return;

    lastAutoSetRef.current = null;
    // prefer a non-MA base key if present; otherwise first option
    setMetricKey(metricOptions[0].key);
  }, [metricOptions, metricKey]);

  const notables = useMemo(() => {
    return buildNotables({ meta, explainMode, metricLabelByKey });
  }, [meta, explainMode, metricLabelByKey]);

  // Fetch derived rows for window
  useEffect(() => {
    let alive = true;

    async function run() {
      if (!chainId || !derivedAsof) return;
      if (!chartDates || chartDates.length === 0) return;

      setRowsLoading(true);

      const raw = await fetchDerivedSeries(chainId, chartDates);
      if (!alive) return;

      // normalize into DerivedSeriesRow
      const normalized: DerivedSeriesRow[] = raw.map((r) => ({
        date: r.date,
        metrics: r.metrics ?? {},
      }));

      // discover keys with any numeric data
      const keySet = new Set<string>();
      for (const r of normalized) {
        for (const [k, v] of Object.entries(r.metrics)) {
          if (typeof v === "number" && Number.isFinite(v)) keySet.add(k);
        }
      }
      const keysSorted = Array.from(keySet).sort();
      setWindowMetricKeys((prev) => (arraysEqual(prev, keysSorted) ? prev : keysSorted));

      setRows(normalized);
      setRowsLoading(false);
    }

    run();
    return () => {
      alive = false;
    };
  }, [chainId, derivedAsof, chartDates]);

  // Build tri-series for current selection (and auto-fallback if empty)
  useEffect(() => {
    if (!rows || rows.length === 0) {
      setTriSeries([]);
      return;
    }

    const available = new Set<string>(windowMetricKeys ?? []);

    const keys = resolveTriSeriesKeys({
      requestedKey: metricKey,
      availableKeys: available,
    });

    const built = buildTriSeries({ rows, keys });
    const cov = countTriCoverage(built);

    // If everything is missing (no lines), auto-fallback to another metric option that yields data.
    const hasAny = cov.daily + cov.ma7 + cov.ma30 > 0;

    if (!hasAny) {
      const candidates = metricOptions.length > 0 ? metricOptions.map((m) => m.key) : Array.from(available);

      for (const c of candidates) {
        if (c === metricKey) continue;

        const k2 = resolveTriSeriesKeys({ requestedKey: c, availableKeys: available });
        const b2 = buildTriSeries({ rows, keys: k2 });
        const c2 = countTriCoverage(b2);

        if (c2.daily + c2.ma7 + c2.ma30 > 0) {
          if (lastAutoSetRef.current !== c) {
            lastAutoSetRef.current = c;
            setMetricKey(c);
          }
          setTriSeries(b2);

          const last = b2.length ? b2[b2.length - 1] : null;
          setDiag({
            selected: c,
            baseKey: k2.baseKey,
            dailyKey: k2.dailyKey,
            ma7Key: k2.ma7Key,
            ma30Key: k2.ma30Key,
            availableKeys: available.size,
            coverage: c2,
            sample: {
              daily: last?.daily ?? null,
              ma7: last?.ma7 ?? null,
              ma30: last?.ma30 ?? null,
            },
          });
          return;
        }
      }
    }

    setTriSeries(built);

    const last = built.length ? built[built.length - 1] : null;
    setDiag({
      selected: metricKey,
      baseKey: keys.baseKey,
      dailyKey: keys.dailyKey,
      ma7Key: keys.ma7Key,
      ma30Key: keys.ma30Key,
      availableKeys: available.size,
      coverage: cov,
      sample: {
        daily: last?.daily ?? null,
        ma7: last?.ma7 ?? null,
        ma30: last?.ma30 ?? null,
      },
    });
  }, [rows, windowMetricKeys, metricKey, metricOptions]);

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

  const layerMetaOk = bundle?.meta != null;
  const layerDerivedOk = bundle?.derived != null;
  const layerGoldOk = bundle?.gold != null;

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold capitalize tracking-tight">{chainId}</h1>
          <div className="mt-1 text-xs text-zinc-400">
            Bundle date: <span className="text-zinc-200">{bundleDate ?? "—"}</span> · Meta as-of:{" "}
            <span className="text-zinc-200">{metaAsof ?? "—"}</span> · Derived as-of:{" "}
            <span className="text-zinc-200">{derivedAsof ?? "—"}</span> · Gold as-of:{" "}
            <span className="text-zinc-200">{goldAsof ?? "—"}</span>
          </div>
        </div>
        {meta?.regime?.label ? <RegimeBadge label={meta.regime.label} /> : null}
      </div>

      {/* LAYER COHERENCE (Advanced-only) */}
      {explainMode === "advanced" ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
          <div className="text-sm font-semibold">Layer coherence</div>
          <div className="mt-1 text-xs text-zinc-500">
            Snapshot is a deterministic bundle: meta + derived + gold for the same chain/date partition.
          </div>

          {bundleLoading ? (
            <div className="mt-3 text-sm text-zinc-400">Loading bundle…</div>
          ) : bundleError ? (
            <div className="mt-3 text-sm text-zinc-400">
              Bundle load error. Check published paths for meta/derived/gold.
            </div>
          ) : !bundle ? (
            <div className="mt-3 text-sm text-zinc-400">No bundle available.</div>
          ) : (
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2">
                <div className="text-[11px] text-zinc-400">meta</div>
                <div className="mt-1 text-sm text-zinc-200">{layerMetaOk ? "loaded" : "missing"}</div>
                <div className="mt-1 text-[11px] text-zinc-500">top-level keys: {safeObjectKeysCount(bundle.meta)}</div>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2">
                <div className="text-[11px] text-zinc-400">derived (snapshot)</div>
                <div className="mt-1 text-sm text-zinc-200">{layerDerivedOk ? "loaded" : "missing"}</div>
                <div className="mt-1 text-[11px] text-zinc-500">
                  top-level keys: {safeObjectKeysCount(bundle.derived)}
                </div>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2">
                <div className="text-[11px] text-zinc-400">gold</div>
                <div className="mt-1 text-sm text-zinc-200">{layerGoldOk ? "loaded" : "missing"}</div>
                <div className="mt-1 text-[11px] text-zinc-500">top-level keys: {safeObjectKeysCount(bundle.gold)}</div>
              </div>
            </div>
          )}

          <div className="mt-4">
            <InfoBox
              title="How to interpret layers"
              basic="Meta explains the snapshot. Derived provides time series evidence. Gold is intended for canonical aggregates and pro exports."
              advanced="For a given chain/date partition, meta+derived+gold must be mutually consistent. This panel shows whether each layer loads for the same date, enabling traceability and auditability."
            />
          </div>
        </div>
      ) : null}

      {/* SCORECARD */}
      {bundleLoading ? null : !meta?.scorecard ? null : (
        <ScorecardView scorecard={meta.scorecard} explainMode={explainMode} />
      )}

      {/* NOTABLES */}
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
          {bundleLoading ? (
            <div className="text-sm text-zinc-400">Loading…</div>
          ) : !meta ? (
            <div className="text-sm text-zinc-400">No meta available for the bundle date.</div>
          ) : notables.length === 0 ? (
            <div className="text-sm text-zinc-400">No notables available for this snapshot.</div>
          ) : (
            notables.map((n) => (
              <div key={n.title} className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3">
                <div className="text-xs font-semibold text-zinc-200">{n.title}</div>
                <div className="mt-1 text-sm text-zinc-300">{explainMode === "advanced" ? n.advanced : n.basic}</div>
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
        {/* REGIME DRIVERS */}
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
                {bundleLoading ? (
                  <tr>
                    <td className="py-2" colSpan={5}>
                      Loading…
                    </td>
                  </tr>
                ) : !meta ? (
                  <tr>
                    <td className="py-2" colSpan={5}>
                      No meta available.
                    </td>
                  </tr>
                ) : !Array.isArray(meta?.regime?.drivers) || meta.regime.drivers.length === 0 ? (
                  <tr>
                    <td className="py-2" colSpan={5}>
                      No regime drivers available.
                    </td>
                  </tr>
                ) : (
                  meta.regime.drivers.map((d: any) => {
                    const key: string = String(d.metric ?? "");
                    const label = metricLabelByKey.get(key) ?? getMetricLabel(key);
                    const tooltip =
                      getMetricDescription(key, "basic") ??
                      "A descriptive on-chain metric used by the deterministic regime ruleset.";

                    return (
                      <tr key={`${d.axis}-${d.metric}`} className="border-t border-zinc-900">
                        <td className="py-2 pr-3 capitalize">{d.axis}</td>
                        <td className="py-2 pr-3" title={tooltip}>
                          <div className="text-zinc-100">{label}</div>
                          {explainMode === "advanced" ? (
                            <div className="mt-0.5 font-mono text-[11px] text-zinc-500">{key}</div>
                          ) : null}
                        </td>
                        <td className="py-2 pr-3">{d.trend}</td>
                        <td className="py-2 pr-3">{Number(d.z_robust).toFixed(2)}</td>
                        <td className="py-2 pr-3">{Number(d.pct_90d).toFixed(1)}</td>
                      </tr>
                    );
                  })
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

        {/* TREND SERIES (TRI-LINE) */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">Trend series</div>
              <div className="mt-1 text-xs text-zinc-500">Daily + MA7 + MA30 (derived)</div>
            </div>

            <select
              className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-200"
              value={metricKey}
              onChange={(e) => {
                lastAutoSetRef.current = null;
                setMetricKey(e.target.value);
              }}
            >
              {metricOptions.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {explainMode === "advanced" ? (
            <div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-[11px] text-zinc-400">
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                <div>
                  selected: <span className="font-mono text-zinc-200">{diag?.selected ?? "—"}</span>
                </div>
                <div>
                  baseKey: <span className="font-mono text-zinc-200">{diag?.baseKey ?? "—"}</span>
                </div>
                <div>
                  dailyKey: <span className="font-mono text-zinc-200">{diag?.dailyKey ?? "—"}</span>
                </div>
                <div>
                  ma7Key: <span className="font-mono text-zinc-200">{diag?.ma7Key ?? "—"}</span>
                </div>
                <div>
                  ma30Key: <span className="font-mono text-zinc-200">{diag?.ma30Key ?? "—"}</span>
                </div>
              </div>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                <div>
                  availableKeys: <span className="text-zinc-200">{diag?.availableKeys ?? "—"}</span>
                </div>
                <div>
                  coverage daily/ma7/ma30:{" "}
                  <span className="text-zinc-200">
                    {diag ? `${diag.coverage.daily}/${diag.coverage.ma7}/${diag.coverage.ma30} (of ${diag.coverage.total})` : "—"}
                  </span>
                </div>
                <div>
                  last daily/ma7/ma30:{" "}
                  <span className="text-zinc-200">
                    {diag
                      ? `${diag.sample.daily != null ? fmtNum(diag.sample.daily) : "—"} / ${diag.sample.ma7 != null ? fmtNum(diag.sample.ma7) : "—"} / ${
                          diag.sample.ma30 != null ? fmtNum(diag.sample.ma30) : "—"
                        }`
                      : "—"}
                  </span>
                </div>
              </div>
            </div>
          ) : null}

          <div className="mt-4">
            {rowsLoading ? (
              <div className="text-sm text-zinc-400">Loading series…</div>
            ) : triSeries.length === 0 ? (
              <div className="text-sm text-zinc-400">No derived series available for this window.</div>
            ) : (
              <MetricTriLineChart data={triSeries} />
            )}
          </div>

          <div className="mt-4">
            <InfoBox
              title="What this chart is"
              basic={
                getMetricDescription(metricKey, "basic") ??
                "This chart shows the daily value plus MA7 and MA30 to make trend changes visually obvious."
              }
              advanced={
                (getMetricDescription(metricKey, "advanced") ??
                  "Daily values and moving averages are read from /derived/<chain>/<date>.json.metrics. MA7/MA30 are computed in the pipeline when available.") +
                " Missing lines are shown as gaps (null), never as zeros."
              }
            />
          </div>
        </div>
      </div>

      {/* GOLD LAYER */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
        <div className="text-sm font-semibold">Gold layer (diagnostic outputs)</div>
        <div className="mt-1 text-xs text-zinc-500">
          Gold is intended for canonical aggregates and pro exports. This page bundles gold with meta+derived by shared partition.
        </div>

        {bundleLoading ? (
          <div className="mt-3 text-sm text-zinc-400">Loading gold…</div>
        ) : !bundle ? (
          <div className="mt-3 text-sm text-zinc-400">No bundle available.</div>
        ) : !gold ? (
          <div className="mt-3 text-sm text-zinc-400">
            Gold missing for bundle date <span className="font-mono">{bundle.date}</span>.
          </div>
        ) : (
          <div className="mt-3">
            <div className="text-xs text-zinc-400">
              Loaded gold for <span className="font-mono text-zinc-200">{bundle.date}</span> · top-level keys:{" "}
              <span className="text-zinc-200">{safeObjectKeysCount(gold)}</span>
            </div>

            {explainMode === "advanced" ? (
              <div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-950 p-3">
                <div className="text-[11px] text-zinc-400">Gold JSON (truncated preview)</div>
                <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-words text-[11px] text-zinc-300">
                  {JSON.stringify(gold, null, 2).slice(0, 4000)}
                  {JSON.stringify(gold, null, 2).length > 4000 ? "\n… (truncated)" : ""}
                </pre>
              </div>
            ) : null}
          </div>
        )}

        <div className="mt-4">
          <InfoBox
            title="How gold supports meta and derived"
            basic="Meta describes the snapshot. Derived shows the time-series evidence. Gold is used for canonical aggregates and export-ready diagnostics."
            advanced="Gold is expected to contain higher-order aggregates consistent with meta’s snapshot and derived’s recent history. Shared (chain,date) partition enables auditability."
          />
        </div>
      </div>

      {/* DATA FRESHNESS */}
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
