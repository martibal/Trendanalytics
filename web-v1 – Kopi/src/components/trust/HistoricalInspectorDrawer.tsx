// src/components/trust/HistoricalInspectorDrawer.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { ChainId } from "@/lib/types";
import { PanelPurpose } from "@/components/info-boxes/PanelPurpose";
import type { RegimeHistoryPoint, Verdict } from "./RegimeTimeline";

type MetaDay = any;

function isISODate(x: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(x);
}

function buildUrl(path: string, params: Record<string, string | undefined>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v != null && v !== "") sp.set(k, v);
  }
  return `${path}?${sp.toString()}`;
}

function normalizeText(x: unknown): string {
  const s = String(x ?? "").trim();
  return s.length ? s : "—";
}

function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

function fmtPct01(x: number | null): string {
  if (x == null || !Number.isFinite(x)) return "—";
  return `${Math.round(x * 100)}%`;
}

function verdictTone(v: Verdict): string {
  if (v === "LIKELY_NOISE") return "border-ui-ok/25 bg-ui-ok/10 text-ui-ok";
  if (v === "STRUCTURAL_SHIFT") return "border-ui-warn/25 bg-ui-warn/10 text-ui-warn";
  return "border-ui-border bg-ui-bg/20 text-ui-muted";
}

function Pill(props: { label: string; value: React.ReactNode; tone?: string; title?: string }) {
  return (
    <span
      className={[
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold",
        props.tone ?? "border-ui-border bg-ui-bg/15 text-ui-muted",
      ].join(" ")}
      title={props.title}
    >
      <span className="text-ui-faint">{props.label}</span>
      <span className="font-mono text-ui-text tabular-nums">{props.value}</span>
    </span>
  );
}

function SectionTitle(props: { children: React.ReactNode }) {
  return <div className="text-[11px] font-semibold uppercase tracking-wide text-ui-faint">{props.children}</div>;
}

function DriverRow(props: { d: RegimeHistoryPoint["drivers"][number] }) {
  const d = props.d;
  return (
    <div className="rounded-xl border border-ui-border bg-ui-bg/10 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-xs font-semibold text-ui-text">{normalizeText(d.metric)}</div>
          <div className="mt-1 text-[11px] text-ui-faint">
            Axis: <span className="text-ui-muted">{normalizeText(d.axis)}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Pill label="band" value={normalizeText(d.band)} />
          <Pill label="trend" value={normalizeText(d.trend)} />
        </div>
      </div>
    </div>
  );
}

function AxisRow(props: { axis: string; v: { band_high: string; band_low: string; trend: string } }) {
  const { axis, v } = props;
  return (
    <div className="grid grid-cols-1 gap-2 rounded-xl border border-ui-border bg-ui-bg/10 p-3 md:grid-cols-4">
      <div className="text-xs font-semibold text-ui-text">{normalizeText(axis)}</div>
      <div className="text-[11px] text-ui-faint">
        band_high: <span className="font-mono text-ui-muted">{normalizeText(v.band_high)}</span>
      </div>
      <div className="text-[11px] text-ui-faint">
        band_low: <span className="font-mono text-ui-muted">{normalizeText(v.band_low)}</span>
      </div>
      <div className="text-[11px] text-ui-faint">
        trend: <span className="font-mono text-ui-muted">{normalizeText(v.trend)}</span>
      </div>
    </div>
  );
}

function extractSignals(metaDay: MetaDay): Record<string, any> | null {
  const s = metaDay?.regime?.signals;
  if (!s || typeof s !== "object") return null;
  return s as Record<string, any>;
}

function findMetricSignal(signals: Record<string, any>, metricKey: string): any | null {
  // web6: "signals for driver metrics" – schema may vary; try common keying patterns.
  if (!signals || typeof signals !== "object") return null;
  if (metricKey in signals) return signals[metricKey];

  // try normalized variants
  const m = metricKey.trim();
  const candidates = [
    m,
    m.toLowerCase(),
    m.toUpperCase(),
    m.replaceAll(" ", "_"),
    m.replaceAll("-", "_"),
    m.replaceAll(".", "_"),
  ];

  for (const c of candidates) {
    if (c in signals) return signals[c];
  }

  // try nested under "metrics" or similar (defensive)
  const metricsObj = signals["metrics"];
  if (metricsObj && typeof metricsObj === "object") {
    for (const c of candidates) {
      if (c in metricsObj) return (metricsObj as any)[c];
    }
  }

  return null;
}

function compactSignal(signal: any): {
  pct: number | null;
  z: number | null;
  momentum: number | null;
  transform: string | null;
  rawKeys: string[];
} {
  if (!signal || typeof signal !== "object") {
    return { pct: null, z: null, momentum: null, transform: null, rawKeys: [] };
  }

  // Common field guesses (schema-defensive)
  const pct =
    (isFiniteNumber(signal?.pct_90d) ? signal.pct_90d : null) ??
    (isFiniteNumber(signal?.pct) ? signal.pct : null) ??
    (isFiniteNumber(signal?.percentile) ? signal.percentile : null) ??
    null;

  const z =
    (isFiniteNumber(signal?.z_robust) ? signal.z_robust : null) ??
    (isFiniteNumber(signal?.z) ? signal.z : null) ??
    null;

  const momentum =
    (isFiniteNumber(signal?.momentum_7d_vs_30d) ? signal.momentum_7d_vs_30d : null) ??
    (isFiniteNumber(signal?.momentum) ? signal.momentum : null) ??
    null;

  const transform =
    (typeof signal?.transform === "string" ? signal.transform : null) ??
    (typeof signal?.xform === "string" ? signal.xform : null) ??
    null;

  const rawKeys = Object.keys(signal).sort();

  return { pct, z, momentum, transform, rawKeys };
}

function computeStreakBeforeAfter(pointsAsc: RegimeHistoryPoint[], idx: number) {
  // Streak on verdict (web6: duration before/after)
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

export function HistoricalInspectorDrawer(props: {
  chain: ChainId;
  open: boolean;

  // Full timeline (from /api/regime/history)
  points: RegimeHistoryPoint[];

  // Selected day (from timeline)
  selected: RegimeHistoryPoint | null;

  onClose?: () => void;

  title?: string;
  id?: string;
}) {
  const { open, selected, chain } = props;
  const date = selected?.date ?? null;

  const pointsAsc = useMemo(() => {
    const arr = Array.isArray(props.points) ? props.points.filter((p) => p && isISODate(p.date)) : [];
    arr.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    return arr;
  }, [props.points]);

  const selectedIdx = useMemo(() => {
    if (!selected) return -1;
    return pointsAsc.findIndex((p) => p.date === selected.date);
  }, [pointsAsc, selected]);

  const streak = useMemo(() => computeStreakBeforeAfter(pointsAsc, selectedIdx), [pointsAsc, selectedIdx]);

  const axesEntries = useMemo(() => {
    if (!selected?.axes) return [];
    return Object.entries(selected.axes);
  }, [selected]);

  const rawMetaHref = useMemo(() => {
    if (!date) return null;
    // existing endpoint in your app: /api/export/daily
    return buildUrl("/api/export/daily", { chain, genre: "meta", date });
  }, [chain, date]);

  // On-demand full META fetch for selected date
  const [metaDay, setMetaDay] = useState<MetaDay | null>(null);
  const [metaErr, setMetaErr] = useState<string | null>(null);
  const [metaLoading, setMetaLoading] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!open || !date) {
        setMetaDay(null);
        setMetaErr(null);
        setMetaLoading(false);
        return;
      }

      setMetaLoading(true);
      setMetaErr(null);

      try {
        const url = buildUrl("/api/export/daily", { chain, genre: "meta", date });
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error(`meta day HTTP ${res.status}`);
        const json = (await res.json()) as MetaDay;

        if (!cancelled) {
          setMetaDay(json);
          setMetaLoading(false);
        }
      } catch (e: any) {
        if (!cancelled) {
          setMetaErr(e?.message || "Failed to load META day-json.");
          setMetaDay(null);
          setMetaLoading(false);
        }
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [open, date, chain]);

  const signals = useMemo(() => extractSignals(metaDay), [metaDay]);

  const driverSignals = useMemo(() => {
    if (!selected?.drivers?.length) return [];
    const ds = selected.drivers.slice(0, 3);
    return ds.map((d) => {
      const sig = signals ? findMetricSignal(signals, d.metric) : null;
      const c = compactSignal(sig);
      return { metric: d.metric, found: Boolean(sig), ...c };
    });
  }, [selected, signals]);

  if (!open) return null;

  return (
    <section id={props.id} className="rounded-2xl border border-ui-border bg-ui-bg/10 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-ui-text">{props.title ?? "Historical inspector"}</div>
          <div className="mt-1 text-xs text-ui-muted">
            {date ? (
              <>
                Date: <span className="font-mono text-ui-text">{date}</span>
              </>
            ) : (
              "No day selected."
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {rawMetaHref ? (
            <a
              className="rounded-full border border-ui-border bg-ui-bg/15 px-3 py-1 text-[11px] font-semibold text-ui-muted hover:bg-ui-bg/25"
              href={rawMetaHref}
              target="_blank"
              rel="noreferrer"
              title="Open raw META day-json for this date"
            >
              Open full meta JSON →
            </a>
          ) : null}

          {typeof props.onClose === "function" ? (
            <button
              type="button"
              onClick={props.onClose}
              className="rounded-full border border-ui-border bg-ui-bg/15 px-3 py-1 text-[11px] font-semibold text-ui-muted hover:bg-ui-bg/25 focus:outline-none focus:ring-2 focus:ring-ui-accent/30"
            >
              Close
            </button>
          ) : null}
        </div>
      </div>

      <PanelPurpose
        className="mt-3"
        whatThisShows={
          "A per-day drilldown: canonical label/verdict, gate/confidence context, top drivers and axes, plus driver-metric signals (pct/z/momentum) when available. " +
          "It also computes verdict streak length before/after the selected day using the historical timeline."
        }
        commonlyUsedFor={[
          "Auditing why a specific day is labeled as noise vs structural shift (or withheld).",
          "Validating persistence: whether the verdict continues before/after the selected day.",
          "Inspecting driver-metric signal context (pct/z/momentum) without needing to parse the full META JSON manually.",
        ]}
      />

      {!selected ? (
        <div className="mt-4 rounded-2xl border border-ui-border bg-ui-bg/10 p-4 text-sm text-ui-muted">
          Select a day from the timeline to inspect drivers, axes, and signals.
        </div>
      ) : (
        <>
          {/* Canonical summary */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold ${verdictTone(
                selected.verdict
              )}`}
              title="Three-state descriptive classification"
            >
              <span className="text-ui-faint">Verdict</span>
              <span className="text-ui-text">{selected.verdict.replaceAll("_", " ").toLowerCase()}</span>
            </span>

            <Pill label="label" value={normalizeText(selected.label)} />
            <Pill label="confidence" value={fmtPct01(selected.confidence_score)} />
            <Pill label="gate" value={normalizeText(selected.gate_status)} />

            <Pill
              label="streak"
              value={streak.total ? `${streak.total}d` : "—"}
              title="Consecutive days with the same verdict around the selected day (before + selected + after)."
            />
            <Pill
              label="before/after"
              value={`${streak.before}d / ${streak.after}d`}
              title="Days before / after the selected day that keep the same verdict."
            />
            {streak.start && streak.end ? (
              <Pill label="range" value={`${streak.start} → ${streak.end}`} title="Streak date range." />
            ) : null}
          </div>

          {/* Drivers */}
          <div className="mt-4">
            <SectionTitle>Top drivers</SectionTitle>
            <div className="mt-2 space-y-2">
              {selected.drivers && selected.drivers.length ? (
                selected.drivers.slice(0, 3).map((d, i) => <DriverRow key={`${d.metric}-${i}`} d={d} />)
              ) : (
                <div className="rounded-xl border border-ui-border bg-ui-bg/10 p-3 text-xs text-ui-muted">
                  No drivers available for this day.
                </div>
              )}
            </div>
          </div>

          {/* Axes */}
          <div className="mt-4">
            <SectionTitle>Axes</SectionTitle>
            <div className="mt-2 space-y-2">
              {axesEntries.length ? (
                axesEntries.map(([axis, v]) => <AxisRow key={axis} axis={axis} v={v} />)
              ) : (
                <div className="rounded-xl border border-ui-border bg-ui-bg/10 p-3 text-xs text-ui-muted">
                  No axis summary available for this day.
                </div>
              )}
            </div>
          </div>

          {/* META fetch status + signals for drivers */}
          <div className="mt-4 rounded-2xl border border-ui-border bg-ui-bg/10 p-4">
            <SectionTitle>Signals for driver metrics</SectionTitle>

            {metaLoading ? (
              <div className="mt-2 text-sm text-ui-muted">Loading META…</div>
            ) : metaErr ? (
              <div className="mt-2 text-sm text-ui-muted">{metaErr}</div>
            ) : !metaDay ? (
              <div className="mt-2 text-sm text-ui-muted">—</div>
            ) : !signals ? (
              <div className="mt-2 text-sm text-ui-muted">
                No <span className="font-mono">regime.signals</span> object found in META for this date.
              </div>
            ) : (
              <div className="mt-3 space-y-2">
                {driverSignals.length ? (
                  driverSignals.map((s) => (
                    <div key={s.metric} className="rounded-xl border border-ui-border bg-ui-bg/5 p-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="text-xs font-semibold text-ui-text">{normalizeText(s.metric)}</div>
                        <Pill label="signal" value={s.found ? "present" : "missing"} />
                      </div>

                      {s.found ? (
                        <>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <Pill
                              label="pct"
                              value={s.pct == null ? "—" : `${Math.round(s.pct)}`}
                              title="Percentile context (commonly pct_90d)."
                            />
                            <Pill
                              label="z"
                              value={s.z == null ? "—" : s.z.toFixed(2)}
                              title="Robust z-score context (commonly z_robust)."
                            />
                            <Pill
                              label="momentum"
                              value={s.momentum == null ? "—" : s.momentum.toFixed(3)}
                              title="Short vs structural divergence (commonly 7d vs 30d)."
                            />
                            <Pill label="transform" value={s.transform ?? "—"} title="Signal transform if provided." />
                          </div>

                          <details className="mt-2 rounded-2xl border border-ui-border bg-ui-bg/10 p-3">
                            <summary className="cursor-pointer select-none text-xs font-semibold text-ui-text">
                              Advanced: available keys
                            </summary>
                            <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                              {s.rawKeys.slice(0, 40).map((k) => (
                                <span
                                  key={k}
                                  className="rounded-full border border-ui-border bg-ui-bg/10 px-2 py-1 font-mono text-ui-muted"
                                >
                                  {k}
                                </span>
                              ))}
                              {s.rawKeys.length > 40 ? (
                                <span className="text-ui-faint">… +{s.rawKeys.length - 40} more</span>
                              ) : null}
                            </div>
                          </details>
                        </>
                      ) : (
                        <div className="mt-2 text-xs text-ui-muted">
                          No matching signal entry found for this metric key in <span className="font-mono">regime.signals</span>.
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl border border-ui-border bg-ui-bg/10 p-3 text-xs text-ui-muted">
                    No drivers available; nothing to map into signals.
                  </div>
                )}
              </div>
            )}

            <div className="mt-3 text-[11px] text-ui-faint">
              Guardrail: pct/z/momentum are distribution and trend context for the selected day. They do not imply causality or prediction.
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-ui-border bg-ui-bg/10 p-3 text-[11px] text-ui-faint">
            Descriptive only · No prices · No forecasts · No advice
          </div>
        </>
      )}
    </section>
  );
}