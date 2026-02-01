"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  useDatasetIndex,
  useBundle,
  chooseBundleDate,
  fetchDerivedSeries,
  fetchGoldSeries,
  buildDateRangeISO,
} from "@/lib/data";
import type { ChainId } from "@/lib/types";

import { RegimeBadge } from "@/components/ui/RegimeBadge";
import { InfoBox } from "@/components/info-boxes/InfoBox";
import { ScorecardView } from "@/components/scorecard/Scorecard";
import { MetricPanel } from "@/components/charts/MetricPanel";

import { useUiStore } from "@/store/uiStore";
import {
  getMetricDescription,
  getMetricOptionsForChain,
  getMetricLabel,
  pickDefaultMetricKeyForChain,
  getBaseMetricKey,
} from "@/lib/registry/metricRegistry";

import {
  resolveTriSeriesKeys,
  buildTriSeries,
  countTriCoverage,
  type DerivedSeriesRow,
  type TriSeriesPoint,
} from "@/lib/series/triSeries";

import { getPrimaryBaseKeys } from "@/lib/registry/chainSemantics";

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
          `${metricLabel} (axis: ${axis}) is the strongest recent deviation: trend=${trend}, p90d=${p}.` +
          (registryBasic ? ` ${registryBasic}` : ""),
        advanced:
          `${metricLabel}${advMetricSuffix(metricKey)} (axis: ${axis}) has the largest |z|. ` +
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
        basic: `${k} has the lowest coverage in this window (${cov}). Low coverage pulls scores toward neutral (50).`,
        advanced:
          `${k} has the lowest coverage in this window (${cov}). ` +
          `Effective confidence is ${effTxt}. Missing inputs reduce coverage and dampen the score toward 50.`,
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

function buildInterpretationSummary(meta: any, explainMode: ExplainMode) {
  if (!meta?.regime) {
    return {
      title: "Interpretation summary",
      basic:
        "This page prioritizes charts over text. In Basic mode you see the chain’s primary metrics as graphs. Use MA7 vs MA30 to judge whether recent movement is persistent versus short-term noise.",
      advanced:
        "No regime snapshot is available. In Advanced mode you can inspect all available metrics as tri-line evidence (daily + MA7 + MA30). Missing values render as gaps (null), never zeros.",
    };
  }

  const label = meta?.regime?.label ?? "—";
  const axes = meta?.regime?.axes ?? {};
  const d = axes?.demand?.trend ?? "—";
  const f = axes?.friction?.trend ?? "—";
  const c = axes?.capacity?.trend ?? "—";

  const conf = meta?.confidence?.confidence_score;
  const confTxt = typeof conf === "number" ? conf.toFixed(2) : "—";

  const basic =
    `Regime: ${label}. Axes trends: Demand ${d}, Friction ${f}, Capacity ${c}. ` +
    `Confidence (7d): ${confTxt}. ` +
    "Use the primary charts below to see whether the latest daily values are diverging from MA7 and MA30 (trend persistence vs noise).";

  const advanced =
    `Regime: ${label}. Axes are banded by a deterministic ruleset (robust z-scores + short-vs-long momentum). ` +
    `Axes trends: Demand ${d}, Friction ${f}, Capacity ${c}. Confidence (7d): ${confTxt}. ` +
    "In Advanced mode, the chart grid shows all available metrics; interpret in the context of coverage constraints and chain-specific lags.";

  return { title: "Interpretation summary", basic, advanced };
}

function buildWhatToWatch(args: {
  meta: any;
  primaryPanels: Array<{ baseKey: string; label: string; series: TriSeriesPoint[] }>;
}): string[] {
  const { meta, primaryPanels } = args;
  const bullets: string[] = [];

  // 1) Confidence + lag: always useful, purely descriptive
  const conf = meta?.confidence?.confidence_score;
  if (typeof conf === "number") {
    bullets.push(`Confidence (7d) is ${conf.toFixed(2)} — lower values usually indicate weaker coverage in the window.`);
  } else {
    bullets.push("Confidence (7d) is unavailable — treat gaps as unknown rather than zero.");
  }

  const lag = meta?.publish_lag_days_policy;
  if (typeof lag === "number") {
    bullets.push(`Publish lag policy is ${lag} days — recent dates may have partial coverage depending on the chain.`);
  }

  // 2) Simple “divergence” scan: daily vs MA30 on primary charts (descriptive, no advice)
  const scored: Array<{ label: string; ratioAbs: number; daily: number; ma30: number }> = [];

  for (const p of primaryPanels) {
    const last = p.series.length ? p.series[p.series.length - 1] : null;
    if (!last) continue;
    if (typeof last.daily !== "number") continue;
    if (typeof last.ma30 !== "number") continue;
    if (!Number.isFinite(last.daily) || !Number.isFinite(last.ma30)) continue;
    if (last.ma30 === 0) continue;

    const ratio = last.daily / last.ma30;
    const ratioAbs = Math.abs(ratio - 1);
    scored.push({ label: p.label, ratioAbs, daily: last.daily, ma30: last.ma30 });
  }

  scored.sort((a, b) => b.ratioAbs - a.ratioAbs);

  const top = scored.slice(0, 2);
  for (const t of top) {
    const pct = (t.daily / t.ma30 - 1) * 100;
    const dir = pct >= 0 ? "above" : "below";
    bullets.push(
      `${t.label}: latest daily is ${Math.abs(pct).toFixed(1)}% ${dir} MA30 (daily=${fmtNum(t.daily)}, MA30=${fmtNum(
        t.ma30
      )}).`
    );
  }

  // 3) If meta has a strong driver, mention it (still descriptive)
  const drivers: any[] = Array.isArray(meta?.regime?.drivers) ? meta.regime.drivers : [];
  const best = drivers
    .filter((d) => typeof d?.z_robust === "number" && d?.metric != null)
    .sort((a, b) => Math.abs(b.z_robust) - Math.abs(a.z_robust))[0];

  if (best?.metric) {
    const m = String(best.metric);
    const axis = best.axis ?? "—";
    const trend = best.trend ?? "—";
    const z = typeof best.z_robust === "number" ? best.z_robust.toFixed(2) : "—";
    bullets.push(`Driver highlight: ${getMetricLabel(m)} (axis=${axis}) has high |z| (z=${z}), trend=${trend}.`);
  }

  return bullets.slice(0, 4);
}

export function ChainDetail({ chain }: { chain: string }) {
  const chainId = normalizeChain(chain);
  const { data: ds } = useDatasetIndex();
  const explainMode = useUiStore((s) => s.explainMode) as ExplainMode;

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

  // merged rows (derived + gold for daily canonical)
  const [rows, setRows] = useState<DerivedSeriesRow[]>([]);
  const [rowsLoading, setRowsLoading] = useState(false);
  const [windowMetricKeys, setWindowMetricKeys] = useState<string[] | null>(null);

  // selection (single chart dropdown; still useful in Advanced)
  const [metricKey, setMetricKey] = useState<string>("tx_count_daily");
  const lastAutoSetRef = useRef<string | null>(null);

  // triSeries for the selected dropdown (kept)
  const [triSeries, setTriSeries] = useState<TriSeriesPoint[]>([]);

  // Advanced-only diagnostics (optional – keep if you want)
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

  const metricLabelByKey = useMemo(() => {
    const m = new Map<string, string>();
    for (const opt of metricOptions) m.set(opt.key, opt.label);
    return m;
  }, [metricOptions]);

  // Pull merged series rows once per chain/date window
  useEffect(() => {
    let alive = true;

    async function run() {
      if (!chainId || !derivedAsof) return;
      if (!chartDates || chartDates.length === 0) return;

      setRowsLoading(true);

      const [derivedRaw, goldRaw] = await Promise.all([fetchDerivedSeries(chainId, chartDates), fetchGoldSeries(chainId, chartDates)]);
      if (!alive) return;

      const derivedByDate = new Map<string, Record<string, number>>();
      for (const r of derivedRaw) derivedByDate.set(r.date, (r.metrics as any) ?? {});

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

      const keySet = new Set<string>();
      for (const r of merged) {
        for (const [k, v] of Object.entries(r.metrics)) {
          if (typeof v === "number" && Number.isFinite(v)) keySet.add(k);
        }
      }
      const keysSorted = Array.from(keySet).sort();
      setWindowMetricKeys((prev) => (arraysEqual(prev, keysSorted) ? prev : keysSorted));

      setRows(merged);
      setRowsLoading(false);
    }

    run();
    return () => {
      alive = false;
    };
  }, [chainId, derivedAsof, chartDates]);

  // pick a chain-specific default metric once availability is known
  useEffect(() => {
    if (!chainId) return;
    if (!windowMetricKeys || windowMetricKeys.length === 0) return;

    const available = new Set(windowMetricKeys);
    if (available.has(metricKey)) return;

    lastAutoSetRef.current = null;
    const next = pickDefaultMetricKeyForChain(chainId, windowMetricKeys);
    setMetricKey(next);
  }, [chainId, windowMetricKeys, metricKey]);

  // build tri-series for the dropdown-selected metric
  useEffect(() => {
    if (!rows || rows.length === 0) {
      setTriSeries([]);
      return;
    }

    const available = new Set<string>(windowMetricKeys ?? []);
    const keys = resolveTriSeriesKeys({ requestedKey: metricKey, availableKeys: available });

    const built = buildTriSeries({ rows, keys });
    const cov = countTriCoverage(built);

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
            sample: { daily: last?.daily ?? null, ma7: last?.ma7 ?? null, ma30: last?.ma30 ?? null },
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
      sample: { daily: last?.daily ?? null, ma7: last?.ma7 ?? null, ma30: last?.ma30 ?? null },
    });
  }, [rows, windowMetricKeys, metricKey, metricOptions]);

  const notables = useMemo(() => {
    return buildNotables({ meta, explainMode, metricLabelByKey });
  }, [meta, explainMode, metricLabelByKey]);

  // ---------- Basic-first chart grid ----------
  const primaryBaseKeys = useMemo(() => (chainId ? getPrimaryBaseKeys(chainId) : []), [chainId]);

  const primaryPanels = useMemo(() => {
    if (!chainId) return [];
    if (!rows || rows.length === 0) return [];
    const available = new Set<string>(windowMetricKeys ?? []);

    const panels: Array<{ baseKey: string; label: string; series: TriSeriesPoint[] }> = [];
    for (const baseKey of primaryBaseKeys) {
      const keys = resolveTriSeriesKeys({ requestedKey: baseKey, availableKeys: available });
      const series = buildTriSeries({ rows, keys });

      const cov = countTriCoverage(series);
      if (cov.daily + cov.ma7 + cov.ma30 === 0) continue;

      panels.push({
        baseKey,
        label: getMetricLabel(baseKey),
        series,
      });
    }
    return panels;
  }, [chainId, rows, windowMetricKeys, primaryBaseKeys]);

  const whatToWatch = useMemo(() => {
    return buildWhatToWatch({ meta, primaryPanels });
  }, [meta, primaryPanels]);

  // Advanced: all metrics (render-limited with Show more)
  const [advancedLimit, setAdvancedLimit] = useState<number>(18);

  const advancedPanels = useMemo(() => {
    if (!rows || rows.length === 0) return [];
    if (!chainId) return [];
    const available = new Set<string>(windowMetricKeys ?? []);

    const baseSeen = new Set<string>();
    const bases: string[] = [];

    for (const opt of metricOptions) {
      const base = getBaseMetricKey(opt.key);
      if (baseSeen.has(base)) continue;
      baseSeen.add(base);
      bases.push(base);
    }

    const out: Array<{ baseKey: string; label: string; series: TriSeriesPoint[] }> = [];
    for (const baseKey of bases) {
      const keys = resolveTriSeriesKeys({ requestedKey: baseKey, availableKeys: available });
      const series = buildTriSeries({ rows, keys });
      const cov = countTriCoverage(series);
      if (cov.daily + cov.ma7 + cov.ma30 === 0) continue;
      out.push({ baseKey, label: getMetricLabel(baseKey), series });
    }
    return out;
  }, [rows, chainId, windowMetricKeys, metricOptions]);

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

  const summary = buildInterpretationSummary(meta, explainMode);

  // Diagnostics content rendered either:
  // - inline (advanced), or
  // - inside <details> (basic)
  const Diagnostics = () => (
    <div className="space-y-6">
      {/* LAYER COHERENCE (Advanced-like diagnostic) */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
        <div className="text-sm font-semibold">Layer coherence</div>
        <div className="mt-1 text-xs text-zinc-500">
          Snapshot is a deterministic bundle: meta + derived + gold for the same chain/date partition.
        </div>

        {bundleLoading ? (
          <div className="mt-3 text-sm text-zinc-400">Loading bundle…</div>
        ) : bundleError ? (
          <div className="mt-3 text-sm text-zinc-400">Bundle load error. Check published paths.</div>
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
              <div className="mt-1 text-[11px] text-zinc-500">top-level keys: {safeObjectKeysCount(bundle.derived)}</div>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2">
              <div className="text-[11px] text-zinc-400">gold</div>
              <div className="mt-1 text-sm text-zinc-200">{layerGoldOk ? "loaded" : "missing"}</div>
              <div className="mt-1 text-[11px] text-zinc-500">top-level keys: {safeObjectKeysCount(bundle.gold)}</div>
            </div>
          </div>
        )}
      </div>

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
      </div>

      {/* SCORECARD */}
      {bundleLoading ? null : !meta?.scorecard ? null : <ScorecardView scorecard={meta.scorecard} explainMode={explainMode} />}

      {/* SINGLE-METRIC DROPDOWN */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">Single metric explorer</div>
            <div className="mt-1 text-xs text-zinc-500">Useful when you want to isolate one metric.</div>
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
                dailyKey: <span className="font-mono text-zinc-200">{diag?.dailyKey ?? "—"}</span>
              </div>
              <div>
                ma7Key: <span className="font-mono text-zinc-200">{diag?.ma7Key ?? "—"}</span>
              </div>
              <div>
                ma30Key: <span className="font-mono text-zinc-200">{diag?.ma30Key ?? "—"}</span>
              </div>
            </div>
          </div>
        ) : null}

        <div className="mt-3">
          {rowsLoading ? (
            <div className="text-sm text-zinc-400">Loading series…</div>
          ) : triSeries.length === 0 ? (
            <div className="text-sm text-zinc-400">No series available for this window.</div>
          ) : (
            <MetricPanel
              title={getMetricLabel(metricKey)}
              subtitle="Daily + MA7 + MA30"
              data={triSeries}
              basicExplain={getMetricDescription(metricKey, "basic")}
              advancedExplain={getMetricDescription(metricKey, "advanced")}
              explainMode={explainMode}
            />
          )}
        </div>
      </div>

      {/* GOLD LAYER */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
        <div className="text-sm font-semibold">Gold layer (diagnostic outputs)</div>
        <div className="mt-1 text-xs text-zinc-500">Canonical daily metrics and export-ready diagnostics (read-only).</div>

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
            title="How gold supports the charts"
            basic="Gold provides canonical daily series for some metrics (when present). Derived provides MA7/MA30 smoothing for trend context."
            advanced="For the same (chain,date) partition, gold daily metrics should be consistent with derived’s smoothed counterparts and meta’s snapshot, enabling auditability."
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
    </div>
  );

  return (
    <section className="space-y-6">
      {/* HEADER */}
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

      {/* AT-A-GLANCE (compact, chart-first) */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">At-a-glance</div>
            <div className="mt-1 text-xs text-zinc-500">Quick snapshot from meta (descriptive only).</div>
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-300">
              Regime: <span className="text-zinc-100">{meta?.regime?.label ?? "—"}</span>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-300">
              Demand: <span className="text-zinc-100">{meta?.regime?.axes?.demand?.trend ?? "—"}</span>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-300">
              Friction: <span className="text-zinc-100">{meta?.regime?.axes?.friction?.trend ?? "—"}</span>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-300">
              Capacity: <span className="text-zinc-100">{meta?.regime?.axes?.capacity?.trend ?? "—"}</span>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-300">
              Confidence (7d):{" "}
              <span className="text-zinc-100">
                {meta?.confidence?.confidence_score != null ? meta.confidence.confidence_score.toFixed(2) : "—"}
              </span>
            </div>
          </div>
        </div>

        <details className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950 p-3">
          <summary className="cursor-pointer text-xs font-semibold text-zinc-200">Read the interpretation summary</summary>
          <div className="mt-2 text-sm text-zinc-300">{explainMode === "advanced" ? summary.advanced : summary.basic}</div>

          <div className="mt-4">
            <InfoBox
              title="Guardrails"
              basic="All statements are descriptive and contextual. No causality is implied, and no forecasts are made."
              advanced="Interpretation is based on deterministic transforms (robust z-scores, percentile ranks, and coverage-aware dampening). Missing data is treated as unknown (null), never as zero."
            />
          </div>
        </details>
      </div>

      {/* PRIMARY METRICS (Basic-first) */}
      <div className="space-y-3">
        <div>
          <div className="text-sm font-semibold">Primary metrics</div>
          <div className="mt-1 text-xs text-zinc-500">
            {explainMode === "basic"
              ? "Basic view shows the chain’s market-relevant metrics as default charts."
              : "In Advanced view you can still scan primary metrics first, then expand to all metrics below."}
          </div>
        </div>

        {rowsLoading ? (
          <div className="text-sm text-zinc-400">Loading series…</div>
        ) : primaryPanels.length === 0 ? (
          <div className="text-sm text-zinc-400">No primary metric series available for this window.</div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {primaryPanels.map((p) => (
              <MetricPanel
                key={p.baseKey}
                title={p.label}
                subtitle="Daily + MA7 + MA30"
                data={p.series}
                basicExplain={getMetricDescription(p.baseKey, "basic")}
                advancedExplain={getMetricDescription(p.baseKey, "advanced")}
                explainMode={explainMode}
              />
            ))}
          </div>
        )}
      </div>

      {/* WHAT TO WATCH (descriptive, no advice) */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
        <div className="text-sm font-semibold">What to watch</div>
        <div className="mt-1 text-xs text-zinc-500">Descriptive context derived from the latest window.</div>

        <div className="mt-3 space-y-2">
          {whatToWatch.map((b, i) => (
            <div key={i} className="text-sm text-zinc-300">
              • {b}
            </div>
          ))}
        </div>
      </div>

      {/* ADVANCED: ALL METRICS GRID */}
      {explainMode === "advanced" ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">All metrics</div>
              <div className="mt-1 text-xs text-zinc-500">
                Every available metric rendered as a tri-line chart (daily + MA7 + MA30), ordered by chain semantics.
              </div>
            </div>
            <button
              onClick={() => setAdvancedLimit((n) => Math.min(n + 18, advancedPanels.length))}
              className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-100 hover:bg-zinc-800 disabled:opacity-50"
              disabled={advancedLimit >= advancedPanels.length}
            >
              Show more
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {advancedPanels.slice(0, advancedLimit).map((p) => (
              <MetricPanel
                key={`all-${p.baseKey}`}
                title={p.label}
                subtitle="Daily + MA7 + MA30"
                data={p.series}
                basicExplain={getMetricDescription(p.baseKey, "basic")}
                advancedExplain={getMetricDescription(p.baseKey, "advanced")}
                explainMode={explainMode}
              />
            ))}
          </div>
        </div>
      ) : null}

      {/* DIAGNOSTICS:
          - Advanced: show inline
          - Basic: keep behind collapsible details */}
      {explainMode === "advanced" ? (
        <Diagnostics />
      ) : (
        <details className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
          <summary className="cursor-pointer text-sm font-semibold text-zinc-200">
            Open diagnostics (advanced details)
          </summary>
          <div className="mt-4">
            <Diagnostics />
          </div>
        </details>
      )}

      <div>
        <Link href="/" className="text-sm text-zinc-300 underline">
          Back to overview
        </Link>
      </div>
    </section>
  );
}
