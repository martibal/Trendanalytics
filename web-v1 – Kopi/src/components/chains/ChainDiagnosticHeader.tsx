// src/components/chains/ChainDiagnosticHeader.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { ScorecardView, type Scorecard } from "@/components/scorecard/Scorecard";
import { buildChainIntelligenceSummary, type ExplainMode } from "@/lib/summary/chainSummary";
import type { ChainId, MetaFile } from "@/lib/types";
import type { CustomRegimeResult } from "@/lib/customThresholds/evaluate";
import { VerdictCard } from "@/components/regime/VerdictCard";
import { PanelPurpose } from "@/components/info-boxes/PanelPurpose";

type ExportWindowResponse = {
  dataset_id: string | null;
  revision_id: number | null;
  chain: ChainId;
  genre: "gold" | "meta" | "derived";
  window: string;
  data: unknown;
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

function asRecord(v: unknown): Record<string, unknown> | null {
  if (!v || typeof v !== "object") return null;
  return v as Record<string, unknown>;
}

function getString(v: unknown): string | null {
  return typeof v === "string" && v.trim().length ? v : null;
}

function getNumber(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

type AllowedWindow = 7 | 30 | 90 | 180 | 365;

function isAllowedWindow(n: number): n is AllowedWindow {
  return n === 7 || n === 30 || n === 90 || n === 180 || n === 365;
}

function clampWindowToExport(windowDays: number): AllowedWindow {
  if (isAllowedWindow(windowDays)) return windowDays;

  const allowed: AllowedWindow[] = [7, 30, 90, 180, 365];
  let best: AllowedWindow = 180;
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

/** HTML-parity typography helper */
function Eyebrow({ children }: { children: React.ReactNode }) {
  return <div className="font-mono text-[11px] font-semibold uppercase tracking-wide text-ui-faint">{children}</div>;
}

/** HTML-parity chip */
function Pill({
  label,
  value,
  tone = "neutral",
  title,
}: {
  label: string;
  value: React.ReactNode;
  tone?: "neutral" | "ok" | "warn";
  title?: string;
}) {
  const cls =
    tone === "ok"
      ? "border-ui-ok/25 bg-ui-ok/10 text-ui-ok"
      : tone === "warn"
      ? "border-[rgb(var(--tone-heat)/0.25)] bg-[rgb(var(--tone-heat)/0.10)] text-[rgb(var(--tone-heat)/0.95)]"
      : "border-ui-border bg-ui-bg/15 text-ui-muted";

  return (
    <span
      title={title}
      className={[
        "inline-flex items-center gap-2 rounded-md border px-2.5 py-1 font-mono text-[11px] font-semibold leading-none tracking-wide",
        cls,
      ].join(" ")}
    >
      <span className="text-ui-faint">{label}</span>
      <span className="text-ui-text tabular-nums">{value}</span>
    </span>
  );
}

function ModeButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={[
        "rounded-full border px-3 py-1 text-[11px] font-mono transition",
        active
          ? "border-ui-border-soft bg-ui-surface2 text-ui-text"
          : "border-ui-border bg-ui-bg/10 text-ui-muted hover:text-ui-text hover:border-ui-border-soft",
      ].join(" ")}
      onClick={onClick}
    >
      {children}
    </button>
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

function axisLabel(trend: unknown): string {
  const t = typeof trend === "string" ? trend : "—";
  if (!t) return "—";
  return t;
}

function readAxisTrend(axis: unknown): unknown {
  if (!axis || typeof axis !== "object") return null;
  return (axis as any).trend ?? null;
}

function readMetaAxes(meta: MetaFile | null): { demand: unknown; friction: unknown; capacity: unknown } {
  const axes = (meta as any)?.regime?.axes;
  return {
    demand: axes?.demand ?? axes?.Demand ?? null,
    friction: axes?.friction ?? axes?.Friction ?? null,
    capacity: axes?.capacity ?? axes?.Capacity ?? null,
  };
}

function defaultLagPolicyDays(chain: ChainId): number {
  if (chain === "arbitrum" || chain === "base") return 7;
  return 1;
}

function computeCoverageProxy(series: TriSeriesPoint[]): { expected: number; present: number; ratio: number | null } {
  const expected = series.length;
  const present = series.filter((p) => typeof p.daily === "number" && Number.isFinite(p.daily)).length;
  const ratio = expected ? present / expected : null;
  return { expected, present, ratio };
}

function fmtPct01(x: number | null): string {
  if (x === null || !Number.isFinite(x)) return "—";
  return `${Math.round(x * 100)}%`;
}

function fmtInt(x: number | null): string {
  if (x === null || !Number.isFinite(x)) return "—";
  return String(Math.round(x));
}

function readScorecard(meta: MetaFile | null): Scorecard | null {
  const raw = (meta as any)?.scorecard;
  if (!raw || typeof raw !== "object") return null;
  return raw as Scorecard;
}

function readMetaUpdatedThrough(meta: MetaFile | null): string | null {
  // Try multiple meta shapes (defensive). We keep output ISO-only.
  const rec = asRecord(meta);
  if (!rec) return null;

  const a = getString(rec["updated_through"]);
  if (a && isValidISODate(a)) return a;

  const freshness = asRecord(rec["freshness"]);
  const b = freshness ? getString(freshness["asof"]) : null;
  if (b && isValidISODate(b)) return b;

  const confidence = asRecord(rec["confidence"]);
  const c = confidence ? getString(confidence["asof_date"]) : null;
  if (c && isValidISODate(c)) return c;

  return null;
}

function readMetaLagDays(meta: MetaFile | null): number | null {
  // Prefer explicit fields if present.
  const rec = asRecord(meta);
  if (!rec) return null;

  const freshness = asRecord(rec["freshness"]);
  const a = freshness ? getNumber(freshness["lag_days"]) : null;
  if (a !== null) return a;

  const confidence = asRecord(rec["confidence"]);
  const b = confidence ? getNumber(confidence["lag_days"]) : null;
  if (b !== null) return b;

  const c = getNumber(rec["publish_lag_days_policy"]);
  if (c !== null) return c;

  return null;
}

function readMetaLagPolicyDays(meta: MetaFile | null): number | null {
  const rec = asRecord(meta);
  if (!rec) return null;

  const a = getNumber(rec["publish_lag_days_policy"]);
  if (a !== null) return a;

  // Alternative naming (defensive)
  const b = getNumber(rec["lag_policy_days"]);
  if (b !== null) return b;

  return null;
}

function readMetaConfidence(meta: MetaFile | null): number | null {
  const rec = asRecord(meta);
  if (!rec) return null;

  const confidence = asRecord(rec["confidence"]);
  const a = confidence ? getNumber(confidence["confidence_score"]) : null;
  if (a !== null) return a;

  // Alternative naming (defensive)
  const b = getNumber(rec["confidence_score"]);
  if (b !== null) return b;

  return null;
}

function readMetaCoverage(meta: MetaFile | null): { expected: number | null; present: number | null; ratio: number | null } {
  // Defensive: meta may have coverage at different paths.
  const rec = asRecord(meta);
  if (!rec) return { expected: null, present: null, ratio: null };

  const coverage = asRecord(rec["coverage"]);
  const confidence = asRecord(rec["confidence"]);

  const expected =
    (coverage ? getNumber(coverage["expected_days"]) : null) ?? (confidence ? getNumber(confidence["expected_days"]) : null);
  const present =
    (coverage ? getNumber(coverage["present_days"]) : null) ?? (confidence ? getNumber(confidence["present_days"]) : null);

  const ratio =
    (coverage ? getNumber(coverage["nonNull_ratio"]) : null) ??
    (coverage ? getNumber(coverage["non_null_ratio"]) : null) ??
    (confidence ? getNumber(confidence["nonNull_ratio"]) : null);

  return { expected, present, ratio };
}

function summarizeKeys(obj: unknown, maxKeys = 8): string | null {
  const rec = asRecord(obj);
  if (!rec) return null;
  const keys = Object.keys(rec);
  if (!keys.length) return null;
  const head = keys.slice(0, maxKeys).join(", ");
  return keys.length > maxKeys ? `${head}, … (+${keys.length - maxKeys})` : head;
}

function readMetaRulesetId(meta: MetaFile | null): string | null {
  const rec = asRecord(meta);
  if (!rec) return null;
  const regime = asRecord(rec["regime"]);
  const v = regime ? getString(regime["ruleset_id"]) : null;
  return v;
}

function readMetaProfileSummary(meta: MetaFile | null): string | null {
  const rec = asRecord(meta);
  if (!rec) return null;
  const p = rec["profile"];
  if (!p) return null;
  if (typeof p === "string") return getString(p);

  const pr = asRecord(p);
  if (!pr) return null;

  const label = getString(pr["label"]);
  const id = getString(pr["id"]);
  const type = getString(pr["type"]);

  const parts: string[] = [];
  if (label) parts.push(label);
  else if (id) parts.push(id);
  if (type) parts.push(`type:${type}`);

  return parts.length ? parts.join(" · ") : null;
}

function readMetaPrimaryAxes(meta: MetaFile | null): string | null {
  const rec = asRecord(meta);
  if (!rec) return null;
  const regime = asRecord(rec["regime"]);
  const axes = regime ? regime["axes"] : null;
  return summarizeKeys(axes, 12);
}

function readMetaSignals(meta: MetaFile | null): { signals: string | null; aliases: string | null } {
  const rec = asRecord(meta);
  if (!rec) return { signals: null, aliases: null };
  const regime = asRecord(rec["regime"]);
  const signals = regime ? summarizeKeys(regime["signals"], 8) : null;
  const aliases = regime ? summarizeKeys(regime["signal_aliases"], 8) : null;
  return { signals, aliases };
}

async function fetchMetaWindow(chain: ChainId, windowDays: number, signal?: AbortSignal): Promise<MetaFile | null> {
  const w = clampWindowToExport(windowDays);

  // Prefer META window file (if present); fall back to latest.json.
  // We keep this defensive so missing files don't break UI.
  const candidates = [`/data/published/v1/meta/${chain}/last${w}d.json`, `/data/published/v1/meta/${chain}/latest.json`];

  for (const url of candidates) {
    try {
      const res = await fetch(url, { signal, cache: "no-store" });
      if (!res.ok) continue;

      const j = (await res.json()) as unknown;
      if (Array.isArray(j) && j.length) {
        const last = j[j.length - 1];
        const data = asRecord(last);
        if (!data) continue;

        // Very lightweight sanity check.
        const chainStr = data["chain"];
        if (typeof chainStr !== "string" || !chainStr.trim().length) continue;

        return last as MetaFile;
      }

      const data = asRecord(j);
      if (!data) continue;

      // Very lightweight sanity check.
      const chainStr = data["chain"];
      if (typeof chainStr !== "string" || !chainStr.trim().length) continue;

      return j as MetaFile;
    } catch {
      // continue to next candidate
    }
  }

  return null;
}

async function fetchContractGatingThreshold(signal?: AbortSignal): Promise<number | null> {
  // Contract source of truth: public/data/published/v1/contract.json
  // We read gating_threshold_default defensively and fall back to null if unavailable.
  try {
    const res = await fetch(`/data/published/v1/contract.json`, { signal, cache: "no-store" });
    if (!res.ok) return null;

    const j = (await res.json()) as unknown;
    const rec = asRecord(j);
    if (!rec) return null;

    // Accept both shapes (defensive)
    const gating = asRecord(rec["gating"]);
    const v1 = gating ? getNumber(gating["gating_threshold_default"]) : null;
    if (v1 !== null) return v1;

    const v2 = getNumber(rec["gating_threshold_default"]);
    if (v2 !== null) return v2;

    return null;
  } catch {
    return null;
  }
}

async function fetchSummarySeries(
  chain: ChainId,
  metric: string,
  start: string,
  end: string,
  signal?: AbortSignal
): Promise<TriSeriesPoint[] | null> {
  const res = await fetch(`/api/summary?chain=${chain}&metric=${metric}&start=${start}&end=${end}`, {
    signal,
    cache: "no-store",
  });
  if (!res.ok) return null;

  const j = (await res.json()) as SummaryResponse;
  const rows = Array.isArray(j?.rows) ? j.rows : [];
  return rows.map((r) => ({ date: r.date, daily: r.daily ?? null, ma7: r.ma7 ?? null, ma30: r.ma30 ?? null }));
}

/**
 * Deterministic gating (UI-side; no backfill)
 *
 * - If META is missing, or confidence is missing => UNKNOWN/DEGRADED (missing META inputs)
 * - If confidence < threshold => UNKNOWN/DEGRADED (confidence below threshold)
 * - Else => OK
 */
type GateState =
  | { status: "ok"; reason: "ok"; confidence: number; threshold: number }
  | {
      status: "unknown_degraded";
      reason: "missing_meta_inputs" | "confidence_below_threshold";
      confidence: number | null;
      threshold: number;
    };

function computeGate(meta: MetaFile | null, threshold: number): GateState {
  if (!meta) return { status: "unknown_degraded", reason: "missing_meta_inputs", confidence: null, threshold };
  const c = readMetaConfidence(meta);
  if (c === null) return { status: "unknown_degraded", reason: "missing_meta_inputs", confidence: null, threshold };
  if (c < threshold) return { status: "unknown_degraded", reason: "confidence_below_threshold", confidence: c, threshold };
  return { status: "ok", reason: "ok", confidence: c, threshold };
}

function gateStatusLabel(gate: GateState): string {
  return gate.status === "ok" ? "OK" : "DEGRADED";
}

function gateReasonLabel(gate: GateState): string {
  if (gate.reason === "missing_meta_inputs") return "Missing meta inputs";
  if (gate.reason === "confidence_below_threshold") return "Confidence below threshold";
  return "—";
}

type ChainDiagnosticHeaderProps = {
  chain: ChainId;
  windowDays: number;
  start: string;
  end: string;
  canonicalMeta?: MetaFile | null;
  goldWindow?: ExportWindowResponse | null;
  derivedWindow?: ExportWindowResponse | null;
  customResult?: CustomRegimeResult | null;
  customEnabled?: boolean;
  onOpenThresholdPanel: () => void;
};

export function ChainDiagnosticHeader(props: ChainDiagnosticHeaderProps) {
  const { chain, windowDays, start, end, canonicalMeta, customResult, customEnabled, onOpenThresholdPanel } = props;

  const [fetchedMeta, setFetchedMeta] = useState<MetaFile | null>(null);
  const [anchors, setAnchors] = useState<Record<string, TriSeriesPoint[]>>({});
  const [explainMode, setExplainMode] = useState<ExplainMode>("basic");

  const [gatingThreshold, setGatingThreshold] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const ac = new AbortController();

    async function run() {
      try {
        const metaPromise = canonicalMeta ? Promise.resolve(canonicalMeta) : fetchMetaWindow(chain, windowDays, ac.signal);

        const [m, a, f, thr] = await Promise.all([
          metaPromise,
          fetchSummarySeries(chain, "tx_count_daily", start, end, ac.signal),
          fetchSummarySeries(chain, "median_tx_fee_native", start, end, ac.signal),
          fetchContractGatingThreshold(ac.signal),
        ]);
        if (cancelled) return;

        setFetchedMeta(m ?? null);
        setGatingThreshold(thr);
        setAnchors({
          tx_count_daily: a ?? [],
          median_tx_fee_native: f ?? [],
        });
      } catch {
        if (cancelled) return;
        setFetchedMeta(null);
        setGatingThreshold(null);
        setAnchors({});
      }
    }

    run();
    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [chain, windowDays, start, end, canonicalMeta]);

  const meta = canonicalMeta ?? fetchedMeta;

  const effectiveGatingThreshold = useMemo(() => {
    return typeof gatingThreshold === "number" && Number.isFinite(gatingThreshold) ? gatingThreshold : 0.4;
  }, [gatingThreshold]);

  const gate = useMemo(() => computeGate(meta, effectiveGatingThreshold), [meta, effectiveGatingThreshold]);

  const axes = useMemo(() => readMetaAxes(meta), [meta]);
  const demandTrend = axisLabel(readAxisTrend(axes.demand));
  const frictionTrend = axisLabel(readAxisTrend(axes.friction));
  const capacityTrend = axisLabel(readAxisTrend(axes.capacity));

  // web7: canonical ruleset/profile/signal surfaces (descriptive, audit-only)
  const rulesetId = useMemo(() => readMetaRulesetId(meta), [meta]);
  const profileSummary = useMemo(() => readMetaProfileSummary(meta), [meta]);
  const primaryAxesLabel = useMemo(() => readMetaPrimaryAxes(meta), [meta]);
  const metaSignals = useMemo(() => readMetaSignals(meta), [meta]);
  const signalsLabel = metaSignals.signals;
  const signalAliasesLabel = metaSignals.aliases;

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
  }, [metaCoverage]);

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

  const scorecard = useMemo(() => readScorecard(meta), [meta]);

  const gateTone = gate.status === "ok" ? "ok" : "warn";

  return (
    <section className="mb-10 ui-card ui-lift p-6">
      <div className="flex flex-col gap-6">
        {/* Primary product surface: Verdict (noise vs structural) */}
        {meta ? (
          <VerdictCard
            chain={chain}
            canonical={meta}
            custom={customResult ?? null}
            customEnabled={Boolean(customEnabled)}
            explainMode={explainMode}
            onToggleExplainMode={() => setExplainMode((m) => (m === "basic" ? "advanced" : "basic"))}
            onOpenThresholds={onOpenThresholdPanel}
            gatingConfidenceThreshold={effectiveGatingThreshold}
          />
        ) : (
          <section className="ui-inset p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Pill label="Verdict" value="Insufficient data" tone="warn" />
              <Pill label="Canonical regime" value="—" />
              <Pill label="Window" value={`${windowDays}d`} />
            </div>
            <div className="mt-2 text-sm text-ui-muted">
              META is not available for this chain/window, so the verdict surface cannot be computed.
            </div>
          </section>
        )}

        {/* Diagnostic dimensions (supporting, not primary) */}
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Pill label="Layer" value="Diagnostics" />
              <Pill label="Window" value={`${windowDays}d`} />
              <Pill label="Gate" value={gateStatusLabel(gate)} tone={gateTone} title={gateReasonLabel(gate)} />
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {/* Axes */}
              <div className="ui-inset p-4">
                <Eyebrow>Axes</Eyebrow>
                <div className="mt-3 space-y-2">
                  <KV k="Demand" v={demandTrend} />
                  <KV k="Friction" v={frictionTrend} />
                  <KV k="Capacity" v={capacityTrend} />
                </div>
                <div className="mt-3 text-xs text-ui-faint">Axes summarize observed context (not causal, not predictive).</div>
              </div>

              {/* Audit */}
              <div className="ui-inset p-4">
                <Eyebrow>Audit</Eyebrow>
                <div className="mt-3 space-y-2">
                  <KV k="Updated-through" v={updatedThrough && isValidISODate(updatedThrough) ? updatedThrough : "—"} />
                  <KV k="Ruleset" v={rulesetId ?? "—"} />
                  <KV k="Profile" v={profileSummary ?? "—"} />
                  <KV k="Primary axes" v={primaryAxesLabel ?? "—"} />
                  <KV k="Signals" v={signalsLabel ?? "—"} />
                  <KV k="Signal aliases" v={signalAliasesLabel ?? "—"} />
                  <KV k="Lag (observed)" v={lagDaysObserved !== null ? `${fmtInt(lagDaysObserved)}d` : "—"} />
                  <KV k="Lag policy" v={`${fmtInt(lagPolicyDays)}d (${lagPolicySource})`} />
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
                  <KV k="Gate threshold" v={`${Math.round(effectiveGatingThreshold * 100)}%`} />
                  <KV k="Gate reason" v={gateReasonLabel(gate)} />
                </div>

                <div className="mt-3 text-xs text-ui-faint leading-relaxed">
                  Missing values render as gaps (null), never zeros. All outputs are descriptive-only.
                </div>

                <div className="mt-2 text-[11px] text-ui-faint leading-relaxed">
                  Note: lag policy describes typical publication delay; observed lag may vary by dataset revision and ingestion.
                </div>
              </div>

              {/* Summary */}
              <div className="ui-inset p-4">
                <Eyebrow>Summary</Eyebrow>
                <div className="mt-3 rounded-lg border border-ui-border bg-ui-bg/10 p-4">
                  <div className="text-xs font-semibold text-ui-text">{summary.title}</div>
                  <div className="mt-2 text-sm text-ui-muted leading-relaxed">{summary.body}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Explicit mode buttons (VerdictCard also offers a toggle) */}
          <div className="flex items-center gap-2">
            <ModeButton active={explainMode === "basic"} onClick={() => setExplainMode("basic")}>
              Basic
            </ModeButton>
            <ModeButton active={explainMode === "advanced"} onClick={() => setExplainMode("advanced")}>
              Advanced
            </ModeButton>
          </div>
        </div>

        {scorecard ? <ScorecardView scorecard={scorecard} explainMode={explainMode} /> : null}

        {/* web6: panel purpose */}
        <PanelPurpose
          whatThisShows={
            "A diagnostic, audit-friendly layer that makes data freshness, coverage, confidence, and gating explicit alongside axes trends and a short chain summary. This supports interpretation of regime outputs without implying causality or action."
          }
          commonlyUsedFor={[
            "Verifying whether the current verdict/regime label is interpretable (coverage + confidence + gate).",
            "Understanding directionality in the axes (demand/friction/capacity) as descriptive context for regime changes.",
            "Explaining dataset lag policy vs observed lag so readers can reason about recency limits per chain.",
          ]}
          learnMoreHref="/methodology/data-quality"
        />
      </div>
    </section>
  );
}