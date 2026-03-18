// src/components/regime/VerdictCard.tsx
"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import clsx from "clsx";

import type { ChainId, MetaFile } from "@/lib/types";
import type { ExplainMode } from "@/lib/summary/chainSummary";
import type { CustomRegimeResult } from "@/lib/customThresholds/evaluate";
import { RegimeBadge } from "@/components/ui/RegimeBadge";
import { PanelPurpose } from "@/components/info-boxes/PanelPurpose";

type Verdict = "LIKELY_NOISE" | "STRUCTURAL_SHIFT" | "INSUFFICIENT_DATA";

export type VerdictCardProps = {
  chain: ChainId;
  canonical: MetaFile;

  /**
   * Optional custom regime result, typically produced by /api/regime/custom
   * after applying user thresholds.
   */
  custom?: CustomRegimeResult | null;

  customEnabled: boolean;

  /**
   * Use existing "ExplainMode" pattern (basic/advanced).
   * This component is pure; the parent owns mode + toggling.
   */
  explainMode: ExplainMode;
  onToggleExplainMode?: () => void;

  /**
   * Opens threshold panel owned by parent (ChainClient).
   * (We keep the CTA here so the verdict card is the "home" for the feature.)
   */
  onOpenThresholds?: () => void;

  /**
   * Optional gating threshold for "Insufficient data" when meta.regime.gate is not present.
   * If omitted, defaults to 0.40.
   */
  gatingConfidenceThreshold?: number | null;

  /**
   * Optional: show gate.status if present in meta.regime.gate (future schema),
   * otherwise we derive a simple status from confidence vs threshold.
   */
};

function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

function fmtNum(x: unknown, digits = 3): string {
  if (!isFiniteNumber(x)) return "—";
  return x.toFixed(digits);
}

function fmtPct01(x: unknown): string {
  // In our meta, pct_90d is typically 0..1 or 0..100 depending on publisher.
  // The canonical meta.regime.drivers.pct_90d in this repo looks like 0..1 (but we guard).
  if (!isFiniteNumber(x)) return "—";
  const v = x > 1.5 ? x : x * 100;
  return `${Math.round(v)}%`;
}

function normalizeLabel(label: unknown): string {
  return String(label ?? "").toUpperCase().trim();
}

function verdictFromCanonical(args: {
  canonical: MetaFile;
  gatingConfidenceThreshold: number;
}): { verdict: Verdict; reason: string; gateStatus: string; thresholdUsed: number } {
  const { canonical, gatingConfidenceThreshold } = args;

  const thresholdUsed = isFiniteNumber(gatingConfidenceThreshold) ? gatingConfidenceThreshold : 0.4;

  // If artifacts are missing, we must be explicit.
  if (canonical?.missing) {
    return {
      verdict: "INSUFFICIENT_DATA",
      reason: "Canonical META is marked missing for this chain/date.",
      gateStatus: "BLOCKED",
      thresholdUsed,
    };
  }

  // Future-compatible: if meta.regime.gate exists, honor it.
  const gate = (canonical as any)?.regime?.gate as
    | {
        status?: string;
        confidence_score?: number;
        threshold_used?: number;
        explanation?: string;
      }
    | undefined;

  if (gate && typeof gate === "object") {
    const status = normalizeLabel(gate.status || "UNKNOWN");
    const conf = isFiniteNumber(gate.confidence_score)
      ? gate.confidence_score
      : canonical?.confidence?.confidence_score;

    const thr = isFiniteNumber(gate.threshold_used) ? gate.threshold_used : thresholdUsed;

    // Map to Insufficient if gated or low confidence
    if (status === "BLOCKED" || status === "DEGRADED" || status === "UNKNOWN") {
      return {
        verdict: "INSUFFICIENT_DATA",
        reason: gate.explanation ? String(gate.explanation) : "Regime gate indicates insufficient data.",
        gateStatus: status,
        thresholdUsed: thr,
      };
    }
    if (isFiniteNumber(conf) && conf < thr) {
      return {
        verdict: "INSUFFICIENT_DATA",
        reason: "Confidence is below the gating threshold.",
        gateStatus: "DEGRADED",
        thresholdUsed: thr,
      };
    }
    // else: ungated
  } else {
    // Derive a gate-like status from confidence score vs threshold.
    const conf = canonical?.confidence?.confidence_score;
    if (!isFiniteNumber(conf)) {
      return {
        verdict: "INSUFFICIENT_DATA",
        reason: "Confidence score is unavailable.",
        gateStatus: "UNKNOWN",
        thresholdUsed,
      };
    }
    if (conf < thresholdUsed) {
      return {
        verdict: "INSUFFICIENT_DATA",
        reason: "Confidence is below the gating threshold.",
        gateStatus: "DEGRADED",
        thresholdUsed,
      };
    }
  }

  const label = normalizeLabel(canonical?.regime?.label);
  if (label === "STABLE") {
    return {
      verdict: "LIKELY_NOISE",
      reason: "Canonical regime is stable (no persistent regime shift detected in the current window).",
      gateStatus: "OK",
      thresholdUsed,
    };
  }

  if (label === "HEATING" || label === "CONGESTED" || label === "CHEAP") {
    return {
      verdict: "STRUCTURAL_SHIFT",
      reason:
        "Canonical regime indicates a persistent shift (one or more axes are outside typical bands with supporting drivers).",
      gateStatus: "OK",
      thresholdUsed,
    };
  }

  // Unknown label should not pretend certainty.
  return {
    verdict: "INSUFFICIENT_DATA",
    reason: "Regime label is not recognized or is degraded.",
    gateStatus: "UNKNOWN",
    thresholdUsed,
  };
}

function verdictLabel(v: Verdict): string {
  if (v === "LIKELY_NOISE") return "Likely noise";
  if (v === "STRUCTURAL_SHIFT") return "Structural shift";
  return "Insufficient data";
}

function verdictTone(v: Verdict): string {
  // Tone only; do not imply “good/bad”.
  if (v === "LIKELY_NOISE") return "border-ui-ok/25 bg-ui-ok/10 text-ui-ok";
  if (v === "STRUCTURAL_SHIFT")
    return "border-[rgb(var(--tone-heat)/0.25)] bg-[rgb(var(--tone-heat)/0.10)] text-[rgb(var(--tone-heat)/0.95)]";
  return "border-ui-border bg-ui-bg/20 text-ui-muted";
}

/**
 * HTML-parity pill: rounded-md + mono + tracking (instead of rounded-full).
 * Keep the API identical (children/tone/title) to avoid redlines.
 */
function Pill({
  children,
  tone,
  title,
}: {
  children: React.ReactNode;
  tone?: string;
  title?: string;
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-md border px-2.5 py-1 font-mono text-[11px] font-semibold leading-none tracking-wide",
        tone ?? "border-ui-border bg-ui-bg/15 text-ui-muted"
      )}
      title={title}
    >
      {children}
    </span>
  );
}

function KV({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="text-[11px] text-ui-faint">{k}</div>
      <div className="text-[11px] font-mono text-ui-muted tabular-nums">{v}</div>
    </div>
  );
}

function axisTrendLabel(trend: unknown): string {
  const t = String(trend ?? "—").toLowerCase().trim();
  if (t === "rising" || t === "up" || t === "heating") return "rising";
  if (t === "cooling" || t === "down" || t === "falling") return "cooling";
  if (t === "stable" || t === "flat" || t === "balanced") return "stable";
  return String(trend ?? "—");
}

/**
 * WEB4: Map custom label to same 3-state Verdict — but never override gating.
 * If canonical is gated/insufficient, custom verdict is also insufficient (deterministic).
 */
function verdictFromCustom(args: {
  canonicalVerdict: Verdict;
  custom: CustomRegimeResult | null | undefined;
}): { verdict: Verdict; reason: string } {
  const { canonicalVerdict, custom } = args;

  if (canonicalVerdict === "INSUFFICIENT_DATA") {
    return {
      verdict: "INSUFFICIENT_DATA",
      reason: "Canonical gate is insufficient; custom evaluation is also withheld for determinism.",
    };
  }

  const label = normalizeLabel(custom?.label);
  if (!label || label === "—") {
    return { verdict: "INSUFFICIENT_DATA", reason: "Custom label is unavailable." };
  }

  if (label === "UNKNOWN/DEGRADED") {
    return { verdict: "INSUFFICIENT_DATA", reason: "Custom label is degraded." };
  }

  if (label === "STABLE") {
    return { verdict: "LIKELY_NOISE", reason: "Custom thresholds still classify the snapshot as STABLE (baseline-aligned)." };
  }

  // Any other non-stable label is treated as structural shift (descriptive classification).
  return { verdict: "STRUCTURAL_SHIFT", reason: "Custom thresholds classify the snapshot as non-baseline." };
}

function formatDriverKey(d: any): string {
  const axis = String(d?.axis ?? "—");
  const metric = String(d?.metric ?? "—");
  return `${axis}:${metric}`;
}

export function VerdictCard(props: VerdictCardProps) {
  const {
    chain,
    canonical,
    custom,
    customEnabled,
    explainMode,
    onToggleExplainMode,
    onOpenThresholds,
    gatingConfidenceThreshold,
  } = props;

  const derived = useMemo(() => {
    const thr = isFiniteNumber(gatingConfidenceThreshold) ? gatingConfidenceThreshold : 0.4;
    const base = verdictFromCanonical({ canonical, gatingConfidenceThreshold: thr });

    const regime = (canonical as any)?.regime;

    const canonicalLabel = normalizeLabel(regime?.label) || "—";
    const canonicalAsof = regime?.asof_date ?? canonical?.confidence?.asof_date ?? "—";
    const canonicalWindow = regime?.window_days ?? canonical?.confidence?.window_days ?? null;

    const conf = canonical?.confidence?.confidence_score;
    const confStr = isFiniteNumber(conf) ? conf.toFixed(3) : "—";

    const drivers = Array.isArray(regime?.drivers) ? (regime.drivers as any[]) : [];
    const topDrivers = drivers.slice(0, 3);

    const axes = regime?.axes && typeof regime.axes === "object" ? regime.axes : {};

    const customLabel = custom ? normalizeLabel(custom.label) : null;

    const customDerived = customEnabled
      ? verdictFromCustom({ canonicalVerdict: base.verdict, custom: custom ?? null })
      : null;

    // Attempt to read custom drivers (schema is from customThresholds/evaluate output)
    const customDrivers = Array.isArray((custom as any)?.drivers) ? ((custom as any)?.drivers as any[]) : [];
    const topCustomDrivers = customDrivers.slice(0, 3);

    return {
      base,
      canonicalLabel,
      canonicalAsof,
      canonicalWindow,
      conf,
      confStr,
      topDrivers,
      axes,
      customLabel,
      customDerived,
      topCustomDrivers,
      thresholdUsed: base.thresholdUsed,
    };
  }, [canonical, custom, customEnabled, gatingConfidenceThreshold]);

  const verdictText = verdictLabel(derived.base.verdict);
  const verdictPillTone = verdictTone(derived.base.verdict);

  const customVerdictText = derived.customDerived ? verdictLabel(derived.customDerived.verdict) : null;
  const customVerdictTone = derived.customDerived ? verdictTone(derived.customDerived.verdict) : null;

  const verdictDiff =
    customEnabled && derived.customDerived
      ? derived.customDerived.verdict !== derived.base.verdict
      : false;

  const whyBasic = useMemo(() => {
    // Basic: 1–2 setninger basert på top driver(s) + axes.
    const d0 = derived.topDrivers?.[0];
    const d1 = derived.topDrivers?.[1];

    const bits: string[] = [];

    if (derived.base.verdict === "INSUFFICIENT_DATA") {
      bits.push(derived.base.reason);

      if (customEnabled && derived.customDerived) {
        bits.push(`Custom: ${derived.customDerived.reason}`);
      }

      return bits.join(" ");
    }

    if (d0) {
      bits.push(
        `${d0.axis}: ${d0.metric} is ${String(d0.trend ?? "changing")} (pct_90d ${fmtPct01(d0.pct_90d)}, z ${fmtNum(
          d0.z_robust,
          2
        )}).`
      );
    }
    if (d1) {
      bits.push(
        `${d1.axis}: ${d1.metric} supports the same axis signal (pct_90d ${fmtPct01(d1.pct_90d)}, z ${fmtNum(
          d1.z_robust,
          2
        )}).`
      );
    }

    if (!bits.length) {
      bits.push(derived.base.reason);
    }

    // WEB4: if custom is enabled, add a short deterministic comparison (no advice)
    if (customEnabled && derived.customDerived) {
      const base = verdictLabel(derived.base.verdict);
      const cust = verdictLabel(derived.customDerived.verdict);
      if (base === cust) {
        bits.push(`Custom thresholds agree (${cust}).`);
      } else {
        bits.push(`Custom thresholds differ: Canonical=${base}; Custom=${cust}.`);
      }
    }

    return bits.slice(0, 2).join(" ");
  }, [customEnabled, derived.base.reason, derived.base.verdict, derived.customDerived, derived.topDrivers]);

  return (
    // HTML parity: inset card style (instead of rounded-2xl + shadow-sm)
    <section className="ui-inset p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone={verdictPillTone} title="Noise vs structural (derived from canonical regime + gating)">
              <span className="mr-2 text-ui-faint">Verdict</span>
              <span className="text-ui-text">{verdictText}</span>
            </Pill>

            <span className="inline-flex items-center gap-2">
              <span className="font-mono text-[11px] font-semibold uppercase tracking-wide text-ui-faint">
                Canonical regime
              </span>
              <RegimeBadge label={derived.canonicalLabel} />
            </span>

            {customEnabled ? (
              <span className="inline-flex items-center gap-2">
                <span className="font-mono text-[11px] font-semibold uppercase tracking-wide text-ui-faint">
                  Custom
                </span>
                <RegimeBadge label={derived.customLabel ?? "—"} />
              </span>
            ) : null}

            {/* WEB4: Optional custom verdict pill */}
            {customEnabled && derived.customDerived ? (
              <Pill
                tone={customVerdictTone ?? undefined}
                title="Custom verdict uses user thresholds, but never overrides canonical gating."
              >
                <span className="mr-2 text-ui-faint">Custom verdict</span>
                <span className="text-ui-text">{customVerdictText ?? "—"}</span>
              </Pill>
            ) : null}

            {/* WEB4: explicit diff indicator */}
            {customEnabled && derived.customDerived ? (
              <Pill
                tone={
                  verdictDiff
                    ? "border-[rgb(var(--tone-heat)/0.25)] bg-[rgb(var(--tone-heat)/0.10)] text-[rgb(var(--tone-heat)/0.95)]"
                    : "border-ui-border bg-ui-bg/20 text-ui-muted"
                }
                title="Whether custom thresholds change the 3-state verdict vs canonical."
              >
                {verdictDiff ? "Custom differs" : "Custom matches"}
              </Pill>
            ) : null}
          </div>

          <div className="text-sm text-ui-muted">{whyBasic}</div>

          {/* web6 §2.2: purpose / value directly inside the verdict card */}
          <PanelPurpose
            whatThisShows={
              "A three-state, descriptive classification derived from the canonical regime label and the confidence gate. " +
              "It is normalized to this dataset’s historical behavior and explicitly withholds classification when inputs are insufficient."
            }
            commonlyUsedFor={[
              "Filtering short-lived fluctuations vs persistent shifts in reporting and audits.",
              "Prioritizing which diagnostics to inspect next (axes + drivers) when something changes.",
              "Comparing snapshots over time using consistent labels and explicit gating.",
              "Communicating data quality constraints when the model withholds classification.",
            ]}
          />

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Link
              href="/how-to/custom-thresholds"
              className="ui-lift rounded-md border border-ui-border bg-ui-bg/15 px-3 py-2 font-mono text-[11px] font-semibold tracking-wide text-ui-muted hover:border-ui-border-soft hover:bg-ui-bg/20 hover:text-ui-text"
            >
              What does this mean?
            </Link>

            {typeof onToggleExplainMode === "function" ? (
              <button
                type="button"
                onClick={onToggleExplainMode}
                className="ui-lift rounded-md border border-ui-border bg-ui-bg/15 px-3 py-2 font-mono text-[11px] font-semibold tracking-wide text-ui-muted hover:border-ui-border-soft hover:bg-ui-bg/20 hover:text-ui-text"
              >
                {explainMode === "basic" ? "Show Advanced" : "Show Basic"}
              </button>
            ) : null}

            {typeof onOpenThresholds === "function" ? (
              <button
                type="button"
                onClick={onOpenThresholds}
                className="ui-lift rounded-md border border-ui-border bg-ui-bg/15 px-3 py-2 font-mono text-[11px] font-semibold tracking-wide text-ui-muted hover:border-ui-border-soft hover:bg-ui-bg/20 hover:text-ui-text"
              >
                Custom thresholds
              </button>
            ) : null}
          </div>
        </div>

        {/* Right-side audit box */}
        <div className="w-full max-w-md ui-inset p-4">
          <div className="mb-2 font-mono text-[11px] font-semibold uppercase tracking-wide text-ui-faint">
            Confidence & freshness
          </div>

          <div className="flex flex-col gap-1.5">
            <KV k="Chain" v={chain} />
            <KV k="As-of" v={derived.canonicalAsof} />
            <KV k="Window (days)" v={derived.canonicalWindow ?? "—"} />
            <KV
              k="Confidence score"
              v={
                <span className="inline-flex items-center gap-2">
                  <span>{derived.confStr}</span>
                  <span className="text-ui-faint">/</span>
                  <span className="text-ui-faint">{fmtNum(derived.thresholdUsed, 2)}</span>
                </span>
              }
            />
            <KV k="Gate status" v={derived.base.gateStatus} />
          </div>
        </div>
      </div>

      {explainMode === "advanced" ? (
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="ui-inset p-4">
            <div className="mb-2 font-mono text-[11px] font-semibold uppercase tracking-wide text-ui-faint">
              Drivers (top 1–3)
            </div>

            {derived.topDrivers.length ? (
              <ul className="flex list-none flex-col gap-2">
                {derived.topDrivers.map((d) => {
                  const metric = String((d as any).metric ?? "—");
                  const axis = String((d as any).axis ?? "—");
                  const trend = String((d as any).trend ?? "—");
                  return (
                    <li key={`${axis}:${metric}`} className="rounded-lg border border-ui-border bg-ui-bg/10 p-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-xs font-semibold text-ui-muted">
                          <span className="text-ui-faint">{axis}</span> · {metric}
                        </div>
                        <Pill title="Driver trend">{trend}</Pill>
                      </div>
                      <div className="mt-1 grid grid-cols-3 gap-2">
                        <KV k="pct_90d" v={fmtPct01((d as any).pct_90d)} />
                        <KV k="z_robust" v={fmtNum((d as any).z_robust, 2)} />
                        <KV k="mom(7d/30d)" v={fmtNum((d as any).momentum_7d_vs_30d, 2)} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="text-xs text-ui-muted">No drivers available in canonical META.</div>
            )}

            {/* WEB4: Custom drivers side-by-side (if available) */}
            {customEnabled ? (
              <div className="mt-4 rounded-lg border border-ui-border bg-ui-bg/10 p-3">
                <div className="mb-2 font-mono text-[11px] font-semibold uppercase tracking-wide text-ui-faint">
                  Custom drivers (top 1–3)
                </div>

                {derived.base.verdict === "INSUFFICIENT_DATA" ? (
                  <div className="text-xs text-ui-muted">Custom drivers withheld because canonical gate is insufficient.</div>
                ) : derived.topCustomDrivers.length ? (
                  <ul className="flex list-none flex-col gap-2">
                    {derived.topCustomDrivers.map((d: any) => {
                      const axis = String(d?.axis ?? "—");
                      const metric = String(d?.metric ?? "—");
                      const trend = String(d?.trend ?? "—");
                      const band = String(d?.band ?? "—");
                      return (
                        <li key={formatDriverKey(d)} className="rounded-lg border border-ui-border bg-ui-bg/10 p-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="text-xs font-semibold text-ui-muted">
                              <span className="text-ui-faint">{axis}</span> · {metric}
                            </div>
                            <Pill title="Driver band + trend">
                              {band} · {trend}
                            </Pill>
                          </div>
                          <div className="mt-1 grid grid-cols-3 gap-2">
                            <KV k="pct_90d" v={fmtPct01(d?.pct_90d)} />
                            <KV k="z_robust" v={fmtNum(d?.z_robust, 2)} />
                            <KV k="mom(7d/30d)" v={fmtNum(d?.momentum_7d_vs_30d, 2)} />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <div className="text-xs text-ui-muted">No custom drivers available.</div>
                )}

                <div className="mt-2 text-[11px] text-ui-faint">
                  Custom drivers are derived from the same snapshot but using user-specified thresholds. Canonical artifacts are unchanged.
                </div>
              </div>
            ) : null}
          </div>

          <div className="ui-inset p-4">
            <div className="mb-2 font-mono text-[11px] font-semibold uppercase tracking-wide text-ui-faint">
              Axes (bands + trend)
            </div>

            {derived.axes && Object.keys(derived.axes).length ? (
              <div className="flex flex-col gap-2">
                {Object.entries(derived.axes).map(([axis, a]) => {
                  const bandHigh = String((a as any)?.band_high ?? "—");
                  const bandLow = String((a as any)?.band_low ?? "—");
                  const tr = axisTrendLabel((a as any)?.trend);
                  return (
                    <div key={axis} className="rounded-lg border border-ui-border bg-ui-bg/10 p-2">
                      <div className="flex items-center justify-between gap-4">
                        <div className="text-xs font-semibold text-ui-muted">{axis}</div>
                        <Pill title="Axis trend">{tr}</Pill>
                      </div>
                      <div className="mt-1 grid grid-cols-2 gap-2">
                        <KV k="band_high" v={bandHigh} />
                        <KV k="band_low" v={bandLow} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-xs text-ui-muted">No axis summary available in canonical META.</div>
            )}

            <div className="mt-3 text-[11px] text-ui-faint">
              Advanced mode surfaces the driver signal stats (pct/z/momentum) used for the explanation. It does not change any canonical artifacts.
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}