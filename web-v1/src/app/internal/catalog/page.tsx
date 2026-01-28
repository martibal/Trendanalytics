// web-v1/src/app/internal/catalog/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";

import type { Chain } from "@/catalog/decisions/productDecisions";
import { CHAINS, decisionStatusForChain, PRODUCT_DECISIONS } from "@/catalog/decisions/productDecisions";
import type { ScanResult } from "@/catalog/scan/scanDataset";
import { scanGoldDataset } from "@/catalog/scan/scanDataset";
import type { CatalogWarning } from "@/catalog/warnings";
import { getMetricDoc } from "@/catalog/docs/metricDocs";

type LoadState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "loaded"; result: ScanResult }
  | { status: "error"; error: { message: string; details?: string } };

function severityRank(s: CatalogWarning["severity"]): number {
  if (s === "error") return 0;
  if (s === "warn") return 1;
  return 2;
}

function formatPct(x: number | undefined): string {
  if (typeof x !== "number" || !Number.isFinite(x)) return "—";
  return `${(x * 100).toFixed(1)}%`;
}

function fmtNum(x: number | null | undefined): string {
  if (typeof x !== "number" || !Number.isFinite(x)) return "—";
  return x.toLocaleString(undefined, { maximumFractionDigits: 6 });
}

function chainBadge(status: string): string {
  if (status === "core") return "CORE";
  if (status === "secondary") return "SECONDARY";
  if (status === "experimental") return "EXPERIMENTAL";
  return "HIDDEN";
}

type UnitTone = "neutral" | "warn" | "info";
function unitToneClass(t: UnitTone): string {
  if (t === "warn") return "border-yellow-500/30 bg-yellow-500/10 text-white/90";
  if (t === "info") return "border-white/15 bg-white/5 text-white/80";
  return "border-white/15 bg-black/20 text-white/80";
}

function isEvmChain(chain: Chain): boolean {
  return chain === "ethereum" || chain === "arbitrum" || chain === "base";
}

function guessUnitLabel(args: {
  metric_id: string;
  chain: Chain;
  pctGuess?: "0..1" | "0..100" | "mixed/unknown";
}): { label: string; tone: UnitTone } | null {
  const { metric_id, chain, pctGuess } = args;

  if (metric_id.endsWith("_rate")) {
    return { label: "rate 0..1", tone: "neutral" };
  }

  if (metric_id.endsWith("_pct")) {
    if (!pctGuess) return { label: "pct ?", tone: "warn" };
    if (pctGuess === "0..1") return { label: "pct 0..1", tone: "neutral" };
    if (pctGuess === "0..100") return { label: "pct 0..100", tone: "neutral" };
    return { label: "pct ?", tone: "warn" };
  }

  if (metric_id.endsWith("_native")) {
    return { label: isEvmChain(chain) ? "wei" : "sat", tone: "info" };
  }

  if (metric_id.endsWith("_sec")) {
    return { label: "sec", tone: "info" };
  }

  if (metric_id.endsWith("_daily")) {
    return { label: "daily", tone: "info" };
  }

  return null;
}

type DocMode = "basic" | "advanced";

export default function InternalCatalogPage() {
  // ---- ALL hooks must run on every render (no conditional hook calls) ----
  const [state, setState] = useState<LoadState>({ status: "idle" });

  const enabled = useMemo(() => String(process.env.NEXT_PUBLIC_INTERNAL_DEBUG ?? "") === "1", []);
  const baseUrl = useMemo(() => String(process.env.NEXT_PUBLIC_DATA_BASE_URL ?? "/data/published/v1"), []);

  // Explainer state (internal UI only)
  const [docOpenMetricId, setDocOpenMetricId] = useState<string | null>(null);
  const [docMode, setDocMode] = useState<DocMode>("basic");

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    async function run(): Promise<void> {
      setState({ status: "loading" });

      try {
        const result = await scanGoldDataset({
          baseUrl,
          windowDays: 365,
          sanitizeInvalidJsonTokens: false,
        });

        if (cancelled) return;
        setState({ status: "loaded", result });
      } catch (err) {
        if (cancelled) return;

        const msg = err instanceof Error ? err.message : String(err);
        setState({
          status: "error",
          error: { message: "Failed to scan published gold dataset.", details: msg },
        });
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [enabled, baseUrl]);

  // Derived values computed via hooks MUST be safe for non-loaded states
  const result: ScanResult | null = state.status === "loaded" ? state.result : null;

  const warningsSorted = useMemo(() => {
    if (!result) return [];
    return [...result.warnings].sort((a, b) => {
      const r = severityRank(a.severity) - severityRank(b.severity);
      if (r !== 0) return r;
      const ma = `${a.metric_id ?? ""}:${a.chain ?? ""}:${a.code}:${a.message}`;
      const mb = `${b.metric_id ?? ""}:${b.chain ?? ""}:${b.code}:${b.message}`;
      return ma.localeCompare(mb);
    });
  }, [result]);

  const metricsSorted = useMemo(() => {
    if (!result) return [];
    return Object.keys(result.observed).sort();
  }, [result]);

  const counts = useMemo(() => {
    if (!result) return { err: 0, warn: 0, info: 0 };
    let err = 0;
    let warn = 0;
    let info = 0;
    for (const w of result.warnings) {
      if (w.severity === "error") err++;
      else if (w.severity === "warn") warn++;
      else info++;
    }
    return { err, warn, info };
  }, [result]);

  const declaredMissing = useMemo(() => {
    if (!result) return [];
    return result.declaredButNotObserved ?? [];
  }, [result]);

  const openDoc = useMemo(() => {
    if (!docOpenMetricId) return null;
    return getMetricDoc(docOpenMetricId);
  }, [docOpenMetricId]);

  // ---- Rendering (safe early returns AFTER hooks) ----
  if (!enabled) {
    return (
      <div className="mx-auto max-w-5xl p-6">
        <h1 className="text-2xl font-semibold">Internal Catalog</h1>
        <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="text-sm text-white/80">
            This route is gated. Set <span className="font-mono">NEXT_PUBLIC_INTERNAL_DEBUG=1</span> to enable it.
          </div>
        </div>
      </div>
    );
  }

  if (state.status === "idle" || state.status === "loading") {
    return (
      <div className="mx-auto max-w-5xl p-6">
        <h1 className="text-2xl font-semibold">Internal Catalog</h1>
        <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/80">
          Scanning <span className="font-mono">{baseUrl}</span> (gold, last365d)…
        </div>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="mx-auto max-w-5xl p-6">
        <h1 className="text-2xl font-semibold">Internal Catalog</h1>
        <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
          <div className="text-sm font-medium text-white">{state.error.message}</div>
          {state.error.details ? (
            <pre className="mt-3 overflow-auto rounded-lg bg-black/30 p-3 text-xs text-white/80">
              {state.error.details}
            </pre>
          ) : null}
          <div className="mt-3 text-xs text-white/70">
            Base URL: <span className="font-mono">{baseUrl}</span>
          </div>
        </div>
      </div>
    );
  }

  // From here, loaded is guaranteed
  const dataset = state.result.dataset;

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Internal Catalog</h1>
        <div className="text-sm text-white/70">
          Source: <span className="font-mono">{baseUrl}</span> (gold / last365d)
        </div>
      </div>

      {/* Dataset header */}
      <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div>
            <div className="text-xs uppercase tracking-wider text-white/50">dataset_id</div>
            <div className="mt-1 font-mono text-sm text-white/90">{dataset.dataset_id ?? "—"}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-white/50">revision_id</div>
            <div className="mt-1 font-mono text-sm text-white/90">
              {typeof dataset.revision_id === "number" ? dataset.revision_id : "—"}
            </div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-white/50">computed_at_utc</div>
            <div className="mt-1 font-mono text-sm text-white/90">{dataset.computed_at_utc ?? "—"}</div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
          {CHAINS.map((c) => {
            const m = state.result.manifests[c];
            const asof = m?.asof ?? "—";
            return (
              <div key={c} className="rounded-xl border border-white/10 bg-black/20 p-3">
                <div className="text-xs uppercase tracking-wider text-white/50">{c}</div>
                <div className="mt-1 font-mono text-sm text-white/90">{asof}</div>
                <div className="mt-1 text-xs text-white/60">
                  window: <span className="font-mono">last365d</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Warnings */}
      <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-lg font-semibold">Warnings</div>
          <div className="flex gap-2 text-xs">
            <span className="rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-white/90">
              errors: {counts.err}
            </span>
            <span className="rounded-full border border-yellow-500/30 bg-yellow-500/10 px-3 py-1 text-white/90">
              warns: {counts.warn}
            </span>
            <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-white/80">
              info: {counts.info}
            </span>
          </div>
        </div>

        {warningsSorted.length === 0 ? (
          <div className="mt-3 text-sm text-white/80">No warnings. Catalog is clean.</div>
        ) : (
          <div className="mt-4 space-y-2">
            {warningsSorted.map((w, idx) => {
              const tone =
                w.severity === "error"
                  ? "border-red-500/30 bg-red-500/10"
                  : w.severity === "warn"
                  ? "border-yellow-500/30 bg-yellow-500/10"
                  : "border-white/10 bg-black/20";
              return (
                <div
                  key={`${idx}-${w.code}-${w.metric_id ?? ""}-${w.chain ?? ""}`}
                  className={`rounded-xl border p-3 ${tone}`}
                >
                  <div className="flex flex-wrap items-center gap-2 text-xs text-white/70">
                    <span className="rounded-md bg-black/30 px-2 py-0.5 font-mono">{w.severity}</span>
                    <span className="rounded-md bg-black/30 px-2 py-0.5 font-mono">{w.code}</span>
                    {w.metric_id ? <span className="rounded-md bg-black/30 px-2 py-0.5 font-mono">{w.metric_id}</span> : null}
                    {w.chain ? <span className="rounded-md bg-black/30 px-2 py-0.5 font-mono">{w.chain}</span> : null}
                  </div>
                  <div className="mt-2 text-sm text-white/90">{w.message}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Declared but NOT observed (CORE) */}
      <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-lg font-semibold text-red-300">Declared but NOT observed (CORE)</div>
          <div className="text-xs text-red-200">count: {declaredMissing.length}</div>
        </div>

        {declaredMissing.length === 0 ? (
          <div className="mt-3 text-sm text-white/80">No declared CORE metrics are missing. Pipeline is consistent.</div>
        ) : (
          <div className="mt-4 space-y-3">
            {declaredMissing.map((m) => (
              <div key={m.metric_id} className="rounded-xl border border-red-500/30 bg-black/30 p-3">
                <div className="font-mono text-sm text-white/90">{m.metric_id}</div>
                <div className="mt-1 text-xs text-white/70">
                  Missing CORE data for chains:{" "}
                  <span className="font-mono text-red-200">{m.missing_chains.join(", ")}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 text-xs text-white/60">
          These metrics are declared CORE in PRODUCT_DECISIONS but have no observed gold data for at least one required chain. This indicates a pipeline
          regression or incomplete publish.
        </div>
      </div>

      {/* Metric explainer (Basic/Advanced) */}
      <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-lg font-semibold">Metric explainer</div>

          <div className="flex items-center gap-2">
            <button
              className={`rounded-full border px-3 py-1 text-xs ${
                docMode === "basic" ? "border-white/25 bg-white/10 text-white" : "border-white/10 bg-black/20 text-white/70"
              }`}
              onClick={() => setDocMode("basic")}
              type="button"
            >
              Basic
            </button>
            <button
              className={`rounded-full border px-3 py-1 text-xs ${
                docMode === "advanced" ? "border-white/25 bg-white/10 text-white" : "border-white/10 bg-black/20 text-white/70"
              }`}
              onClick={() => setDocMode("advanced")}
              type="button"
            >
              Advanced
            </button>

            <button
              className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-white/70"
              onClick={() => setDocOpenMetricId(null)}
              type="button"
              title="Clear selection"
            >
              Clear
            </button>
          </div>
        </div>

        {!docOpenMetricId ? (
          <div className="mt-3 text-sm text-white/80">
            Click ⓘ next to a metric_id in the table to open documentation here.
          </div>
        ) : !openDoc ? (
          <div className="mt-3 text-sm text-white/80">
            No documentation yet for <span className="font-mono">{docOpenMetricId}</span>.
            <div className="mt-2 text-xs text-white/60">
              Add it in <span className="font-mono">src/catalog/docs/metricDocs.ts</span>.
            </div>
          </div>
        ) : (
          <div className="mt-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="font-mono text-sm text-white/90">{openDoc.metric_id}</div>
              <div className="text-xs text-white/60">Descriptive only • No price • No recommendations</div>
            </div>

            {docMode === "basic" ? (
              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <div className="text-xs uppercase tracking-wider text-white/50">What it is</div>
                  <div className="mt-2 text-sm text-white/85">{openDoc.basic.what}</div>
                </div>

                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <div className="text-xs uppercase tracking-wider text-white/50">How to read</div>
                  <div className="mt-2 text-sm text-white/85">{openDoc.basic.howToRead}</div>
                </div>

                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <div className="text-xs uppercase tracking-wider text-white/50">Why included</div>
                  <div className="mt-2 text-sm text-white/85">{openDoc.basic.whyIncluded}</div>
                </div>

                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <div className="text-xs uppercase tracking-wider text-white/50">Value to user</div>
                  <div className="mt-2 text-sm text-white/85">{openDoc.basic.valueToUser}</div>
                </div>

                <div className="rounded-xl border border-white/10 bg-black/20 p-4 md:col-span-2">
                  <div className="text-xs uppercase tracking-wider text-white/50">Common misreads</div>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-white/80">
                    {openDoc.basic.commonMisreads.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <div className="text-xs uppercase tracking-wider text-white/50">Definition</div>
                  <div className="mt-2 text-sm text-white/85">{openDoc.advanced.definition}</div>
                </div>

                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <div className="text-xs uppercase tracking-wider text-white/50">Calculation</div>
                  <div className="mt-2 text-sm text-white/85">{openDoc.advanced.calculation}</div>
                </div>

                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <div className="text-xs uppercase tracking-wider text-white/50">Units & scale</div>
                  <div className="mt-2 text-sm text-white/85">{openDoc.advanced.unitsAndScale}</div>
                </div>

                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <div className="text-xs uppercase tracking-wider text-white/50">Windowing</div>
                  <div className="mt-2 text-sm text-white/85">{openDoc.advanced.windowing}</div>
                </div>

                <div className="rounded-xl border border-white/10 bg-black/20 p-4 md:col-span-2">
                  <div className="text-xs uppercase tracking-wider text-white/50">Caveats</div>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-white/80">
                    {openDoc.advanced.caveats.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-xl border border-white/10 bg-black/20 p-4 md:col-span-2">
                  <div className="text-xs uppercase tracking-wider text-white/50">Chain notes</div>
                  <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
                    {CHAINS.map((c) => {
                      const note = openDoc.advanced.chainNotes[c];
                      return (
                        <div key={c} className="rounded-lg border border-white/10 bg-black/30 p-3">
                          <div className="text-xs uppercase tracking-wider text-white/50">{c}</div>
                          <div className="mt-1 text-sm text-white/80">{note ?? "—"}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Metrics table */}
      <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-lg font-semibold">Gold metrics (observed)</div>
          <div className="text-xs text-white/60">
            Declared decisions: <span className="font-mono">{Object.keys(PRODUCT_DECISIONS).length}</span> • Observed:{" "}
            <span className="font-mono">{metricsSorted.length}</span>
          </div>
        </div>

        <div className="mt-4 overflow-auto rounded-xl border border-white/10">
          <table className="min-w-[1300px] w-full text-left text-sm">
            <thead className="bg-black/30 text-xs text-white/70">
              <tr>
                <th className="p-3 font-medium">metric_id</th>
                <th className="p-3 font-medium">unit / scale</th>
                <th className="p-3 font-medium">chains_present</th>
                {CHAINS.map((c) => (
                  <th key={`h-${c}`} className="p-3 font-medium">
                    {c}
                  </th>
                ))}
                <th className="p-3 font-medium">missing_rate (max)</th>
                <th className="p-3 font-medium">min</th>
                <th className="p-3 font-medium">median</th>
                <th className="p-3 font-medium">max</th>
              </tr>
            </thead>
            <tbody>
              {metricsSorted.map((metric_id) => {
                const obs = state.result.observed[metric_id];
                const chains_present = obs.chains_present.join(", ");

                const missingRates = CHAINS.map((c) => obs.missing_rate_by_chain[c]).filter(
                  (x): x is number => typeof x === "number" && Number.isFinite(x)
                );
                const missingMax = missingRates.length ? Math.max(...missingRates) : undefined;

                const preferredChain: Chain | null =
                  obs.chains_present.includes("ethereum")
                    ? "ethereum"
                    : obs.chains_present.length
                    ? (obs.chains_present[0] as Chain)
                    : null;

                const min = preferredChain ? obs.min_by_chain[preferredChain] : null;
                const median = preferredChain ? obs.median_by_chain[preferredChain] : null;
                const max = preferredChain ? obs.max_by_chain[preferredChain] : null;

                const preferredGuess =
                  preferredChain && obs.pct_unit_guess_by_chain
                    ? obs.pct_unit_guess_by_chain[preferredChain]
                    : undefined;

                const preferredUnit = preferredChain
                  ? guessUnitLabel({ metric_id, chain: preferredChain, pctGuess: preferredGuess })
                  : null;

                const unitLabelsAcross = new Set<string>();
                for (const ch of obs.chains_present) {
                  const g = obs.pct_unit_guess_by_chain?.[ch];
                  const u = guessUnitLabel({ metric_id, chain: ch, pctGuess: g });
                  if (u?.label) unitLabelsAcross.add(u.label);
                }
                const varies = unitLabelsAcross.size > 1;

                const hasDoc = !!getMetricDoc(metric_id);

                return (
                  <tr key={metric_id} className="border-t border-white/5">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-white/90">{metric_id}</span>
                        <button
                          type="button"
                          className={`inline-flex h-6 w-6 items-center justify-center rounded-full border text-[11px] ${
                            hasDoc
                              ? "border-white/15 bg-black/20 text-white/80 hover:border-white/30"
                              : "border-white/10 bg-black/10 text-white/40"
                          }`}
                          title={hasDoc ? "Open explainer" : "Docs missing for this metric"}
                          onClick={() => {
                            setDocOpenMetricId(metric_id);
                            if (!hasDoc) setDocMode("basic");
                          }}
                        >
                          ⓘ
                        </button>
                      </div>
                    </td>

                    <td className="p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        {preferredUnit ? (
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-medium ${unitToneClass(
                              preferredUnit.tone
                            )}`}
                            title={
                              preferredChain
                                ? `Derived from suffix + diagnostics (preferred chain: ${preferredChain})`
                                : "Derived from suffix + diagnostics"
                            }
                          >
                            {preferredUnit.label}
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[11px] font-medium text-white/60">
                            —
                          </span>
                        )}

                        {varies ? (
                          <span
                            className="inline-flex rounded-full border border-yellow-500/30 bg-yellow-500/10 px-3 py-1 text-[11px] font-medium text-white/90"
                            title={`Unit/scale differs across chains_present: ${Array.from(unitLabelsAcross).join(", ")}`}
                          >
                            varies
                          </span>
                        ) : null}
                      </div>
                    </td>

                    <td className="p-3 text-xs text-white/70">{chains_present || "—"}</td>

                    {CHAINS.map((c) => {
                      const st = decisionStatusForChain(metric_id, c);
                      const label = st ? chainBadge(String(st)) : "UNDECLARED";
                      const tone =
                        st === "core"
                          ? "border-white/20 bg-white/10"
                          : st === "secondary"
                          ? "border-white/15 bg-white/5"
                          : st === "hidden"
                          ? "border-white/10 bg-black/20 text-white/60"
                          : "border-red-500/30 bg-red-500/10";

                      return (
                        <td key={`${metric_id}-${c}`} className="p-3">
                          <span className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-medium ${tone}`}>
                            {label}
                          </span>
                        </td>
                      );
                    })}

                    <td className="p-3 font-mono text-xs text-white/80">{formatPct(missingMax)}</td>
                    <td className="p-3 font-mono text-xs text-white/80">{fmtNum(min)}</td>
                    <td className="p-3 font-mono text-xs text-white/80">{fmtNum(median)}</td>
                    <td className="p-3 font-mono text-xs text-white/80">{fmtNum(max)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-3 text-xs text-white/60">
          Click ⓘ to open Basic/Advanced documentation above. “varies” indicates the unit/scale differs across chains_present and should be documented
          explicitly before exposing broadly.
        </div>
      </div>
    </div>
  );
}
