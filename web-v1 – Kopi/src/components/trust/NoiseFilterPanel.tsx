// src/components/trust/NoiseFilterPanel.tsx
"use client";

import React, { useMemo, useState } from "react";
import { PanelPurpose } from "@/components/info-boxes/PanelPurpose";
import type { RegimeHistoryPoint, Verdict } from "./RegimeTimeline";

type MetaDay = any;

function isISODate(x: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(x);
}

function verdictTone(v: Verdict): string {
  // UI tone only (descriptive-only product). Keep aligned with landing palette.
  if (v === "LIKELY_NOISE") return "border-ui-ok/25 bg-ui-ok/10 text-ui-ok";
  if (v === "STRUCTURAL_SHIFT")
    return "border-[rgb(var(--tone-heat)/0.25)] bg-[rgb(var(--tone-heat)/0.10)] text-[rgb(var(--tone-heat)/0.95)]";
  return "border-ui-border bg-ui-bg/20 text-ui-muted";
}

function fmtPct01(x: number | null): string {
  if (x == null || !Number.isFinite(x)) return "—";
  return `${Math.round(x * 100)}%`;
}

function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <div className="font-mono text-[11px] font-semibold uppercase tracking-wide text-ui-faint">{children}</div>;
}

function Pill(props: { label: string; value: React.ReactNode; tone?: string; title?: string }) {
  return (
    <span
      className={[
        "inline-flex items-center gap-2 rounded-md border px-2.5 py-1 font-mono text-[11px] font-semibold leading-none tracking-wide",
        props.tone ?? "border-ui-border bg-ui-bg/15 text-ui-muted",
      ].join(" ")}
      title={props.title}
    >
      <span className="text-ui-faint">{props.label}</span>
      <span className="text-ui-text tabular-nums">{props.value}</span>
    </span>
  );
}

function ChipButton(props: {
  children: React.ReactNode;
  active?: boolean;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      disabled={props.disabled}
      title={props.title}
      className={[
        "ui-lift rounded-md border px-3 py-2 font-mono text-[11px] font-semibold tracking-wide transition disabled:opacity-60",
        props.active
          ? "border-ui-border-soft bg-ui-surface2 text-ui-text"
          : "border-ui-border bg-ui-bg/15 text-ui-muted hover:border-ui-border-soft hover:bg-ui-bg/20 hover:text-ui-text",
      ].join(" ")}
    >
      {props.children}
    </button>
  );
}

function extractSignals(metaDay: MetaDay): Record<string, any> | null {
  const s = metaDay?.regime?.signals;
  if (!s || typeof s !== "object") return null;
  return s as Record<string, any>;
}

type SignalCompact = {
  pct: number | null; // 0..100 (best-effort)
  z: number | null;
  momentum: number | null;
  transform: string | null;
  rawKeys: string[];
};

function compactSignal(signal: any): SignalCompact {
  if (!signal || typeof signal !== "object") {
    return { pct: null, z: null, momentum: null, transform: null, rawKeys: [] };
  }

  const pct =
    (isFiniteNumber(signal?.pct_90d) ? signal.pct_90d : null) ??
    (isFiniteNumber(signal?.pct) ? signal.pct : null) ??
    (isFiniteNumber(signal?.percentile) ? signal.percentile : null) ??
    null;

  const z = (isFiniteNumber(signal?.z_robust) ? signal.z_robust : null) ?? (isFiniteNumber(signal?.z) ? signal.z : null) ?? null;

  const momentum =
    (isFiniteNumber(signal?.momentum_7d_vs_30d) ? signal.momentum_7d_vs_30d : null) ??
    (isFiniteNumber(signal?.momentum) ? signal.momentum : null) ??
    null;

  const transform = (typeof signal?.transform === "string" ? signal.transform : null) ?? (typeof signal?.xform === "string" ? signal.xform : null) ?? null;

  return { pct, z, momentum, transform, rawKeys: Object.keys(signal).sort() };
}

function computeStreak(pointsAsc: RegimeHistoryPoint[], idx: number) {
  if (idx < 0 || idx >= pointsAsc.length) {
    return { before: 0, after: 0, total: 0, start: null as string | null, end: null as string | null };
  }
  const v = pointsAsc[idx].verdict;

  let before = 0;
  for (let i = idx - 1; i >= 0; i--) {
    if (pointsAsc[i].verdict !== v) break;
    before += 1;
  }

  let after = 0;
  for (let i = idx + 1; i < pointsAsc.length; i++) {
    if (pointsAsc[i].verdict !== v) break;
    after += 1;
  }

  const start = pointsAsc[idx - before]?.date ?? pointsAsc[idx].date;
  const end = pointsAsc[idx + after]?.date ?? pointsAsc[idx].date;

  return { before, after, total: before + 1 + after, start, end };
}

type SpikeMode = "z" | "pct";

function defaultSpikeThreshold(mode: SpikeMode) {
  // Deterministic defaults (web6): UI defaults, not canonical truth.
  return mode === "z" ? 2.0 : 95;
}

export function NoiseFilterPanel(props: {
  points: RegimeHistoryPoint[]; // full timeline (from /api/regime/history)
  selected: RegimeHistoryPoint | null; // selected day point (from timeline)

  /**
   * Optional: full META day-json for the selected day (from /api/export/daily?genre=meta)
   * Used to enumerate signal keys and show signal values for the selected day.
   */
  metaDay?: MetaDay | null;

  id?: string;
  title?: string;

  /**
   * Default local analysis window in days (counted backwards from selected date).
   * Must be <= points length.
   */
  windowDays?: number;
}) {
  const pointsAsc = useMemo(() => {
    const arr = Array.isArray(props.points) ? props.points.filter((p) => p && isISODate(p.date)) : [];
    arr.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    return arr;
  }, [props.points]);

  const selectedDate = props.selected?.date ?? null;

  const selectedIdx = useMemo(() => {
    if (!selectedDate) return -1;
    return pointsAsc.findIndex((p) => p.date === selectedDate);
  }, [pointsAsc, selectedDate]);

  const streak = useMemo(() => computeStreak(pointsAsc, selectedIdx), [pointsAsc, selectedIdx]);

  const signals = useMemo(() => extractSignals(props.metaDay ?? null), [props.metaDay]);

  const driverMetricKeys = useMemo(() => {
    const ds = props.selected?.drivers ?? [];
    const keys = ds.map((d) => String(d.metric ?? "").trim()).filter((k) => k.length > 0);
    const out: string[] = [];
    const seen = new Set<string>();
    for (const k of keys) {
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(k);
    }
    return out;
  }, [props.selected]);

  const allSignalKeys = useMemo(() => {
    if (!signals) return [];
    return Object.keys(signals).sort();
  }, [signals]);

  const signalOptions = useMemo(() => {
    // web6 preference: driver metrics first
    const opts: string[] = [];
    const inSignals = new Set(allSignalKeys);

    for (const k of driverMetricKeys) {
      if (inSignals.has(k)) opts.push(k);
    }
    for (const k of allSignalKeys) {
      if (!opts.includes(k)) opts.push(k);
    }
    return opts;
  }, [allSignalKeys, driverMetricKeys]);

  const [selectedSignalKey, setSelectedSignalKey] = useState<string>(() => {
    if (signalOptions.length) return signalOptions[0];
    return "";
  });

  const effectiveSignalKey = useMemo(() => {
    if (!signalOptions.length) return "";
    if (selectedSignalKey && signalOptions.includes(selectedSignalKey)) return selectedSignalKey;
    return signalOptions[0];
  }, [signalOptions, selectedSignalKey]);

  const selectedSignal = useMemo(() => {
    if (!signals || !effectiveSignalKey) return null;
    return (signals as any)[effectiveSignalKey] ?? null;
  }, [signals, effectiveSignalKey]);

  const selectedSignalCompact = useMemo(() => compactSignal(selectedSignal), [selectedSignal]);

  const [spikeMode, setSpikeMode] = useState<SpikeMode>("z");
  const [threshold, setThreshold] = useState<number>(() => defaultSpikeThreshold("z"));

  const onChangeMode = (m: SpikeMode) => {
    setSpikeMode(m);
    setThreshold(defaultSpikeThreshold(m));
  };

  const windowDays = useMemo(() => {
    const w = typeof props.windowDays === "number" && Number.isFinite(props.windowDays) ? Math.floor(props.windowDays) : 120;
    return Math.max(30, Math.min(450, w));
  }, [props.windowDays]);

  /**
   * Spike counting requires per-day META signals.
   * In this UI phase, we keep it deterministic and "opt-in" by passing metaDayMap from the parent:
   *   metaDayMap[YYYY-MM-DD] => META day-json
   *
   * To avoid breaking callers, we read metaDayMap optionally via (props as any).
   */
  const metaDayMap: Record<string, MetaDay> | null = (props as any).metaDayMap ?? null;

  const spikeStats = useMemo(() => {
    if (!selectedDate || selectedIdx < 0) {
      return {
        ok: false as const,
        reason: "No selected day.",
      };
    }

    const end = selectedDate;
    const startIdx = Math.max(0, selectedIdx - windowDays + 1);
    const start = pointsAsc[startIdx]?.date ?? pointsAsc[0]?.date ?? end;

    if (!metaDayMap) {
      return {
        ok: false as const,
        reason:
          "Spike counting requires per-day META signals. Provide metaDayMap[date] -> META day-json to this component to enable spike counting.",
        start,
        end,
      };
    }

    let candidates = 0;
    let spikes = 0;
    const bucket: Record<Verdict, number> = {
      LIKELY_NOISE: 0,
      STRUCTURAL_SHIFT: 0,
      INSUFFICIENT_DATA: 0,
    };

    for (let i = startIdx; i <= selectedIdx; i++) {
      const p = pointsAsc[i];
      if (!p) continue;
      const meta = metaDayMap[p.date];
      if (!meta) continue;

      const sigs = extractSignals(meta);
      if (!sigs) continue;

      const sig = (sigs as any)[effectiveSignalKey];
      if (!sig) continue;

      const c = compactSignal(sig);
      const v = spikeMode === "z" ? c.z : c.pct;
      if (v == null || !Number.isFinite(v)) continue;

      candidates += 1;

      const isSpike = spikeMode === "z" ? Math.abs(v) >= threshold : v >= threshold;
      if (!isSpike) continue;

      spikes += 1;
      bucket[p.verdict] += 1;
    }

    const shareNoise = spikes ? bucket.LIKELY_NOISE / spikes : 0;
    const shareShift = spikes ? bucket.STRUCTURAL_SHIFT / spikes : 0;
    const shareIns = spikes ? bucket.INSUFFICIENT_DATA / spikes : 0;

    return {
      ok: true as const,
      start,
      end,
      windowDays,
      candidates,
      spikes,
      bucket,
      shareNoise,
      shareShift,
      shareIns,
    };
  }, [selectedDate, selectedIdx, pointsAsc, windowDays, metaDayMap, effectiveSignalKey, spikeMode, threshold]);

  const selectedVerdict = props.selected?.verdict ?? null;

  return (
    <section id={props.id} className="ui-card ui-lift p-5">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <Eyebrow>Noise filter</Eyebrow>
          <div className="mt-2 text-sm font-semibold text-ui-text">{props.title ?? "Spikes vs persistence"}</div>
          <div className="mt-1 text-xs text-ui-muted">
            Counts extreme signal days (“spikes”) and summarizes how often those spikes coincide with historical verdicts (noise vs structural
            shift). Descriptive history context only.
          </div>
        </div>

        {props.selected ? (
          <div className="flex flex-wrap items-center gap-2 md:justify-end">
            {selectedVerdict ? (
              <span
                className={[
                  "inline-flex items-center gap-2 rounded-md border px-2.5 py-1 font-mono text-[11px] font-semibold tracking-wide",
                  verdictTone(selectedVerdict),
                ].join(" ")}
                title="Three-state descriptive classification"
              >
                <span className="text-ui-faint">Verdict</span>
                <span className="text-ui-text">{selectedVerdict.replaceAll("_", " ").toLowerCase()}</span>
              </span>
            ) : null}

            <Pill label="date" value={selectedDate ?? "—"} />
            <Pill
              label="streak"
              value={streak.total ? `${streak.total}d` : "—"}
              title="Consecutive-day verdict run around the selected date."
            />
            <Pill label="confidence" value={fmtPct01(props.selected.confidence_score)} />
          </div>
        ) : (
          <div className="text-xs text-ui-faint md:text-right">Select a day to enable context.</div>
        )}
      </div>

      <PanelPurpose
        className="mt-4"
        whatThisShows={
          "Choose a signal, define what counts as an extreme (“spike”) using z-score or percentile thresholds, then count spikes in a historical window " +
          "and summarize how those spike days map to noise vs structural-shift verdicts."
        }
        commonlyUsedFor={[
          "Separating one-off extremes from sustained behavior using history (not prediction).",
          "Quantifying how often extreme signal days align with structural shifts vs likely noise.",
          "Auditing whether a signal generates frequent spikes and whether those spikes persist.",
        ]}
      />

      {/* Controls */}
      <div className="mt-5 ui-inset p-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <Eyebrow>Signal selection & spike definition</Eyebrow>
            <div className="mt-1 text-xs text-ui-faint">Driver metrics are prioritized first when present in signals.</div>
          </div>
          <div className="text-[11px] text-ui-faint">
            Defaults: <span className="font-mono text-ui-muted">z=2.0</span> · <span className="font-mono text-ui-muted">pct=95</span>
          </div>
        </div>

        {!signals ? (
          <div className="mt-3 text-sm text-ui-muted">
            No <span className="font-mono text-ui-text">regime.signals</span> available for the selected day. Load META day-json to enable this module.
          </div>
        ) : signalOptions.length === 0 ? (
          <div className="mt-3 text-sm text-ui-muted">No signal keys found.</div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            {/* Signal key */}
            <div className="rounded-lg border border-ui-border bg-ui-bg/10 p-3">
              <div className="font-mono text-[11px] font-semibold uppercase tracking-wide text-ui-faint">Signal key</div>
              <select
                className="mt-2 w-full rounded-md border border-ui-border bg-ui-bg/10 px-3 py-2 text-sm text-ui-text"
                value={effectiveSignalKey}
                onChange={(e) => setSelectedSignalKey(e.target.value)}
              >
                {signalOptions.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>

              <div className="mt-2 text-[11px] text-ui-faint">
                Selected-day signal fields:{" "}
                <span className="font-mono text-ui-muted">
                  pct {selectedSignalCompact.pct == null ? "—" : Math.round(selectedSignalCompact.pct)}, z{" "}
                  {selectedSignalCompact.z == null ? "—" : selectedSignalCompact.z.toFixed(2)}, momentum{" "}
                  {selectedSignalCompact.momentum == null ? "—" : selectedSignalCompact.momentum.toFixed(3)}
                </span>
              </div>
            </div>

            {/* Mode */}
            <div className="rounded-lg border border-ui-border bg-ui-bg/10 p-3">
              <div className="font-mono text-[11px] font-semibold uppercase tracking-wide text-ui-faint">Spike mode</div>
              <div className="mt-2 flex flex-wrap gap-2">
                <ChipButton onClick={() => onChangeMode("z")} active={spikeMode === "z"} title="Spike when |z| ≥ threshold">
                  z (|z| ≥ thr)
                </ChipButton>
                <ChipButton onClick={() => onChangeMode("pct")} active={spikeMode === "pct"} title="Spike when percentile ≥ threshold">
                  pct (pct ≥ thr)
                </ChipButton>
              </div>
              <div className="mt-2 text-[11px] text-ui-faint">
                z is symmetric (both tails). percentile is upper-tail only (higher = more extreme).
              </div>
            </div>

            {/* Threshold */}
            <div className="rounded-lg border border-ui-border bg-ui-bg/10 p-3">
              <div className="font-mono text-[11px] font-semibold uppercase tracking-wide text-ui-faint">Threshold</div>
              <input
                className="mt-2 w-full rounded-md border border-ui-border bg-ui-bg/10 px-3 py-2 text-sm text-ui-text"
                type="number"
                step={spikeMode === "z" ? 0.1 : 1}
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
              />
              <div className="mt-2 text-[11px] text-ui-faint">
                This is a UI filter for counting spikes in the selected historical window. It does not change canonical labels or published meta.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Spike counting results */}
      <div className="mt-5 ui-inset p-4">
        <Eyebrow>Spike counts → verdict outcomes</Eyebrow>

        {!selectedDate ? (
          <div className="mt-2 text-sm text-ui-muted">Select a day to define the window end.</div>
        ) : !signals ? (
          <div className="mt-2 text-sm text-ui-muted">Load META day-json for the selected day to pick a signal.</div>
        ) : !spikeStats.ok ? (
          <div className="mt-2 text-sm text-ui-muted">{spikeStats.reason}</div>
        ) : (
          <>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Pill label="window" value={`${spikeStats.start} → ${spikeStats.end}`} />
              <Pill label="days" value={`${spikeStats.windowDays}`} />
              <Pill
                label="candidates"
                value={`${spikeStats.candidates}`}
                title="Days where the chosen signal exists and has a usable z/pct."
              />
              <Pill label="spikes" value={`${spikeStats.spikes}`} title="Days meeting the spike threshold." />
              <Pill label="mode" value={spikeMode} />
              <Pill label="thr" value={threshold} />
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="rounded-lg border border-ui-border bg-ui-bg/10 p-4">
                <Eyebrow>Spikes → likely noise</Eyebrow>
                <div className="mt-2 text-lg font-semibold text-ui-text tabular-nums">{spikeStats.bucket.LIKELY_NOISE}</div>
                <div className="mt-1 text-xs text-ui-muted">
                  share: {spikeStats.spikes ? `${Math.round(spikeStats.shareNoise * 100)}%` : "—"}
                </div>
              </div>

              <div className="rounded-lg border border-ui-border bg-ui-bg/10 p-4">
                <Eyebrow>Spikes → structural shift</Eyebrow>
                <div className="mt-2 text-lg font-semibold text-ui-text tabular-nums">{spikeStats.bucket.STRUCTURAL_SHIFT}</div>
                <div className="mt-1 text-xs text-ui-muted">
                  share: {spikeStats.spikes ? `${Math.round(spikeStats.shareShift * 100)}%` : "—"}
                </div>
              </div>

              <div className="rounded-lg border border-ui-border bg-ui-bg/10 p-4">
                <Eyebrow>Spikes → insufficient</Eyebrow>
                <div className="mt-2 text-lg font-semibold text-ui-text tabular-nums">{spikeStats.bucket.INSUFFICIENT_DATA}</div>
                <div className="mt-1 text-xs text-ui-muted">
                  share: {spikeStats.spikes ? `${Math.round(spikeStats.shareIns * 100)}%` : "—"}
                </div>
              </div>
            </div>

            <div className="mt-3 rounded-lg border border-ui-border bg-ui-bg/10 p-3 text-[11px] text-ui-faint">
              Guardrail: spike counts summarize how often <span className="text-ui-text">extreme signal days</span> coincide with historical verdicts.
              This is descriptive context only — no forecasting, no causality claims.
            </div>
          </>
        )}
      </div>

      {/* Advanced: signal schema keys */}
      {signals && effectiveSignalKey ? (
        <div className="mt-5 ui-inset p-4">
          <Eyebrow>Advanced: selected signal schema</Eyebrow>

          {selectedSignal ? (
            <details className="mt-3 rounded-lg border border-ui-border bg-ui-bg/10 p-3">
              <summary className="cursor-pointer select-none font-mono text-[11px] font-semibold tracking-wide text-ui-text">
                View available keys for <span className="font-mono">{effectiveSignalKey}</span>
              </summary>

              <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                {selectedSignalCompact.rawKeys.slice(0, 60).map((k) => (
                  <span key={k} className="rounded-md border border-ui-border bg-ui-bg/10 px-2 py-1 font-mono text-ui-muted">
                    {k}
                  </span>
                ))}

                {selectedSignalCompact.rawKeys.length > 60 ? (
                  <span className="text-ui-faint">… +{selectedSignalCompact.rawKeys.length - 60} more</span>
                ) : null}
              </div>

              <div className="mt-2 text-[11px] text-ui-faint">
                Keys are schema-dependent; treat the published contract as the parser anchor.
              </div>
            </details>
          ) : (
            <div className="mt-2 text-sm text-ui-muted">No signal object found for this key on the selected day.</div>
          )}
        </div>
      ) : null}

      <div className="mt-5 rounded-lg border border-ui-border bg-ui-bg/10 px-4 py-3 text-[11px] text-ui-faint">
        Descriptive only · No prices · No forecasts · No advice
      </div>
    </section>
  );
}