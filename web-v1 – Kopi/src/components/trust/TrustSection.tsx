// src/components/trust/TrustSection.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { ChainId } from "@/lib/types";

import { PanelPurpose } from "@/components/info-boxes/PanelPurpose";
import { RegimeTimeline, type RegimeHistoryPoint } from "./RegimeTimeline";
import { RegimeStatsPanel } from "./RegimeStatsPanel";
import { HistoricalInspectorDrawer } from "./HistoricalInspectorDrawer";
import { NoiseFilterPanel } from "./NoiseFilterPanel";
import { ThresholdIntegrityPanel, type CustomEvalLike } from "./ThresholdIntegrityPanel";

type HistoryResponse = {
  ok: boolean;
  chain: ChainId;
  contract_gate_threshold_default?: number;
  range?: { start: string | null; end: string | null };
  count?: number;
  points?: RegimeHistoryPoint[];
  error?: string;
};

type MetaDay = any;

function isISODate(x: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(x);
}

function buildUrl(path: string, params: Record<string, string | number | undefined | null>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    sp.set(k, String(v));
  }
  return `${path}?${sp.toString()}`;
}

function chainName(chain: ChainId) {
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

async function fetchMetaDay(chain: ChainId, date: string): Promise<MetaDay> {
  const url = buildUrl("/api/export/daily", { chain, genre: "meta", date });
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`meta day HTTP ${res.status}`);
  return (await res.json()) as MetaDay;
}

async function runWithConcurrency<T, R>(items: T[], limit: number, worker: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let idx = 0;

  async function runner() {
    while (idx < items.length) {
      const i = idx++;
      out[i] = await worker(items[i]);
    }
  }

  const n = Math.max(1, Math.min(limit, items.length));
  const runners = Array.from({ length: n }, () => runner());
  await Promise.all(runners);
  return out;
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <div className="font-mono text-[11px] font-semibold uppercase tracking-wide text-ui-faint">{children}</div>;
}

function ChipButton(props: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
  tone?: "neutral" | "warn";
}) {
  const tone = props.tone ?? "neutral";
  const cls =
    tone === "warn"
      ? "border-[rgb(var(--tone-heat)/0.25)] bg-[rgb(var(--tone-heat)/0.10)] text-[rgb(var(--tone-heat)/0.95)]"
      : "border-ui-border bg-ui-bg/15 text-ui-muted hover:border-ui-border-soft hover:bg-ui-bg/20 hover:text-ui-text";

  return (
    <button
      type="button"
      onClick={props.onClick}
      disabled={props.disabled}
      title={props.title}
      className={[
        "ui-lift rounded-md border px-3 py-2 font-mono text-[11px] font-semibold tracking-wide transition disabled:opacity-60",
        cls,
      ].join(" ")}
    >
      {props.children}
    </button>
  );
}

function NoticeBox(props: { title: string; body: React.ReactNode; tone?: "warn" | "neutral" }) {
  const tone = props.tone ?? "neutral";
  const boxCls =
    tone === "warn"
      ? "border-ui-border bg-[rgb(var(--tone-heat)/0.10)]"
      : "border-ui-border bg-ui-bg/10";

  const titleCls =
    tone === "warn"
      ? "text-[rgb(var(--tone-heat)/0.95)]"
      : "text-ui-text";

  return (
    <div className={`mt-4 rounded-lg border ${boxCls} p-4`}>
      <div className={`font-mono text-[11px] font-semibold uppercase tracking-wide ${titleCls}`}>{props.title}</div>
      <div className="mt-2 text-sm text-ui-muted">{props.body}</div>
    </div>
  );
}

export function TrustSection(props: {
  chain: ChainId;

  /** Optional: provide pre-fetched regime history points to avoid double-fetching. */
  points?: RegimeHistoryPoint[];

  /** Optional: propagate a parent-level history error into the TrustSection error state. */
  historyError?: string | null;

  /** web6 expects 400+ days by default. */
  days?: number;

  /** Optional explicit range overrides days. Must be YYYY-MM-DD. */
  start?: string;
  end?: string;

  /** Optional: allow parent to provide initial selected day. */
  initialSelectedDate?: string | null;

  /** Section anchor id. web6 uses #trust. */
  id?: string;

  /** NoiseFilterPanel window to prefetch meta for. Default 120. */
  noiseWindowDays?: number;

  /** Prefetch concurrency (avoid overloading dev server). Default 6. */
  metaPrefetchConcurrency?: number;
}) {
  const days = typeof props.days === "number" && Number.isFinite(props.days) ? Math.max(60, Math.floor(props.days)) : 450;
  const noiseWindowDays =
    typeof props.noiseWindowDays === "number" && Number.isFinite(props.noiseWindowDays)
      ? Math.max(30, Math.min(450, Math.floor(props.noiseWindowDays)))
      : 120;

  const prefetchConcurrency =
    typeof props.metaPrefetchConcurrency === "number" && Number.isFinite(props.metaPrefetchConcurrency)
      ? Math.max(1, Math.min(12, Math.floor(props.metaPrefetchConcurrency)))
      : 6;

  const [loading, setLoading] = useState<boolean>(true);
  const [err, setErr] = useState<string | null>(null);

  const [points, setPoints] = useState<RegimeHistoryPoint[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(props.initialSelectedDate ?? null);

  // Selected day META (for inspector + integrity + signal dropdown)
  const [selectedMeta, setSelectedMeta] = useState<MetaDay | null>(null);
  const [selectedMetaErr, setSelectedMetaErr] = useState<string | null>(null);
  const [selectedMetaLoading, setSelectedMetaLoading] = useState<boolean>(false);

  // Prefetched META map for spike-counting window
  const [metaDayMap, setMetaDayMap] = useState<Record<string, MetaDay>>({});
  const [metaMapErr, setMetaMapErr] = useState<string | null>(null);
  const [metaMapLoading, setMetaMapLoading] = useState<boolean>(false);

  // Optional custom evaluation
  const [customEval, setCustomEval] = useState<CustomEvalLike | null>(null);
  const [customErr, setCustomErr] = useState<string | null>(null);
  const [customLoading, setCustomLoading] = useState<boolean>(false);

  const historyUrl = useMemo(() => {
    const hasRange = (props.start && isISODate(props.start)) || (props.end && isISODate(props.end));
    if (hasRange) {
      return buildUrl("/api/regime/history", {
        chain: props.chain,
        start: props.start ?? undefined,
        end: props.end ?? undefined,
      });
    }
    return buildUrl("/api/regime/history", {
      chain: props.chain,
      days,
    });
  }, [props.chain, props.start, props.end, days]);

  // Fetch history (or consume pre-fetched points from parent)
  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setErr(null);

      // If parent provides points, avoid refetching history here.
      if (props.points !== undefined) {
        const pts = Array.isArray(props.points) ? [...props.points] : [];
        pts.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

        if (cancelled) return;

        setPoints(pts);
        setErr(props.historyError ?? null);
        setLoading(false);

        // deterministic selection:
        // 1) keep current if exists
        // 2) else initialSelectedDate if exists
        // 3) else latest
        const existingOk = selectedDate && pts.some((p) => p.date === selectedDate);
        if (existingOk) return;

        const init = props.initialSelectedDate;
        const initOk = init && pts.some((p) => p.date === init);
        if (initOk) {
          setSelectedDate(init!);
          return;
        }

        setSelectedDate(pts.length ? pts[pts.length - 1].date : null);
        return;
      }

      try {
        const res = await fetch(historyUrl, { cache: "no-store" });
        if (!res.ok) throw new Error(`history HTTP ${res.status}`);

        const json = (await res.json()) as HistoryResponse;
        if (!json?.ok) throw new Error(json?.error || "History response not ok.");

        const pts = Array.isArray(json.points) ? json.points : [];
        pts.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

        if (cancelled) return;

        setPoints(pts);
        setLoading(false);

        // deterministic selection:
        // 1) keep current if exists
        // 2) else initialSelectedDate if exists
        // 3) else latest
        const existingOk = selectedDate && pts.some((p) => p.date === selectedDate);
        if (existingOk) return;

        const init = props.initialSelectedDate;
        const initOk = init && pts.some((p) => p.date === init);
        if (initOk) {
          setSelectedDate(init!);
          return;
        }

        setSelectedDate(pts.length ? pts[pts.length - 1].date : null);
      } catch (e: any) {
        if (cancelled) return;
        setErr(e?.message || "Failed to load regime history.");
        setPoints([]);
        setLoading(false);
        setSelectedDate(null);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
    // We intentionally do not include selectedDate: the history load should not re-run on selection changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyUrl, props.points, props.historyError, props.initialSelectedDate]);

  const selectedPoint = useMemo(() => {
    if (!selectedDate) return null;
    return points.find((p) => p.date === selectedDate) ?? null;
  }, [points, selectedDate]);

  // Fetch selected day META (on selection change)
  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!selectedDate) {
        setSelectedMeta(null);
        setSelectedMetaErr(null);
        setSelectedMetaLoading(false);
        return;
      }

      setSelectedMetaLoading(true);
      setSelectedMetaErr(null);

      try {
        const meta = await fetchMetaDay(props.chain, selectedDate);
        if (cancelled) return;
        setSelectedMeta(meta);
        setSelectedMetaLoading(false);
      } catch (e: any) {
        if (cancelled) return;
        setSelectedMeta(null);
        setSelectedMetaErr(e?.message || "Failed to load META day-json.");
        setSelectedMetaLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [props.chain, selectedDate]);

  // Prefetch metaDayMap for a backward window ending at selectedDate
  useEffect(() => {
    let cancelled = false;

    async function run() {
      setMetaMapErr(null);

      if (!selectedDate || !points.length) {
        setMetaDayMap({});
        setMetaMapLoading(false);
        return;
      }

      // Find index of selected day in points (ascending)
      const idx = points.findIndex((p) => p.date === selectedDate);
      if (idx < 0) {
        setMetaDayMap({});
        setMetaMapLoading(false);
        return;
      }

      const startIdx = Math.max(0, idx - noiseWindowDays + 1);
      const windowPoints = points.slice(startIdx, idx + 1);
      const dates = windowPoints.map((p) => p.date);

      // Keep what we already have; only fetch missing dates.
      const missing = dates.filter((d) => metaDayMap[d] == null);

      if (missing.length === 0) {
        setMetaMapLoading(false);
        return;
      }

      setMetaMapLoading(true);

      try {
        const results = await runWithConcurrency(missing, prefetchConcurrency, async (d) => {
          const meta = await fetchMetaDay(props.chain, d);
          return { date: d, meta };
        });

        if (cancelled) return;

        setMetaDayMap((prev) => {
          const next = { ...prev };
          for (const r of results) next[r.date] = r.meta;
          return next;
        });

        setMetaMapLoading(false);
      } catch (e: any) {
        if (cancelled) return;
        setMetaMapErr(e?.message || "Failed to prefetch META window for spike counting.");
        setMetaMapLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
    // Depend on selectedDate/points length/chain/window size; do not depend directly on metaDayMap object
    // to avoid thrashing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.chain, selectedDate, points.length, noiseWindowDays, prefetchConcurrency]);

  async function runCustomThresholds() {
    if (!selectedDate) return;

    setCustomLoading(true);
    setCustomErr(null);

    try {
      const url = buildUrl("/api/regime/custom", { chain: props.chain, date: selectedDate });

      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ config: { version: "v1" } }),
      });

      if (!res.ok) throw new Error(`custom HTTP ${res.status}`);

      const json = (await res.json()) as any;

      const custom: CustomEvalLike =
        (json?.custom as any) ??
        (json?.result as any) ??
        ({
          label: json?.label,
          verdict: json?.verdict,
          threshold_config: json?.threshold_config ?? json?.config ?? null,
          drivers: json?.drivers ?? null,
          axes: json?.axes ?? null,
          notes: json?.notes ?? null,
        } as CustomEvalLike);

      setCustomEval(custom);
      setCustomLoading(false);
    } catch (e: any) {
      setCustomEval(null);
      setCustomErr(e?.message || "Custom threshold evaluation failed.");
      setCustomLoading(false);
    }
  }

  function clearCustom() {
    setCustomEval(null);
    setCustomErr(null);
    setCustomLoading(false);
  }

  return (
    <section id={props.id ?? "trust"} className="ui-card ui-lift p-6">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <Eyebrow>Trust & validation</Eyebrow>
          <div className="mt-2 text-xl font-semibold text-ui-text">History audit surface</div>
          <div className="mt-2 text-sm text-ui-muted">
            Long-horizon audit view for <span className="text-ui-text">{chainName(props.chain)}</span>. Descriptive-only.
          </div>
        </div>

        <div className="text-[11px] text-ui-faint md:text-right">
          Endpoint: <span className="font-mono text-ui-muted">/api/regime/history</span>
          <span className="mx-2 text-ui-faint">·</span>
          Range: <span className="font-mono text-ui-muted">{days}d</span>
        </div>
      </div>

      <PanelPurpose
        className="mt-5"
        whatThisShows={
          "A reproducible audit surface: a long-horizon timeline of canonical labels and a three-state verdict, plus drilldowns into drivers, axes, signals, spike counting, and integrity-safe custom thresholds."
        }
        commonlyUsedFor={[
          "Auditing persistence vs frequent flips over long history (regime stability).",
          "Inspecting a specific day (drivers/axes/signals) using published META as the source of truth.",
          "Counting spikes vs outcomes using a deterministic window + signal definition (descriptive only).",
          "Comparing canonical vs custom threshold views without modifying published artifacts.",
        ]}
      />

      {/* States */}
      {loading ? (
        <div className="mt-5 ui-inset p-4 text-sm text-ui-muted">Loading history…</div>
      ) : err ? (
        <NoticeBox
          title="History unavailable"
          tone="warn"
          body={
            <>
              <div className="text-ui-muted">{err}</div>
              <div className="mt-2 text-xs text-ui-faint">
                Requires published META day-json under{" "}
                <span className="font-mono text-ui-muted">public/data/published/v1/meta/&lt;chain&gt;</span>.
              </div>
            </>
          }
        />
      ) : points.length === 0 ? (
        <div className="mt-5 ui-inset p-4 text-sm text-ui-muted">No historical points returned.</div>
      ) : (
        <>
          {/* Timeline + stats */}
          <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <RegimeTimeline points={points} selectedDate={selectedDate} onSelectDate={(d) => setSelectedDate(d)} title="Timeline" />
            <RegimeStatsPanel points={points} title="Stability summary" />
          </div>

          {/* Inspector */}
          <div className="mt-5">
            <HistoricalInspectorDrawer
              chain={props.chain}
              open={Boolean(selectedPoint)}
              points={points}
              selected={selectedPoint}
              onClose={() => setSelectedDate(null)}
              title="Historical inspector"
            />
          </div>

          {/* Noise filter */}
          <div className="mt-5">
            <NoiseFilterPanel
              points={points}
              selected={selectedPoint}
              metaDay={selectedMeta}
              windowDays={noiseWindowDays}
              {...({ metaDayMap } as any)}
              title="Noise filter (spikes vs persistence)"
            />

            <div className="mt-2 text-[11px] text-ui-faint">
              META prefetch (window):{" "}
              <span className="font-mono text-ui-muted">
                {metaMapLoading ? "loading…" : `${Object.keys(metaDayMap).length} days cached`}
              </span>
              {metaMapErr ? <span className="ml-2 text-[rgb(var(--tone-heat)/0.95)]">{metaMapErr}</span> : null}
            </div>
          </div>

          {/* Custom thresholds (overlay) */}
          <div className="mt-5 ui-inset p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <Eyebrow>Custom thresholds</Eyebrow>
                <div className="mt-2 text-sm text-ui-muted">
                  Optional overlay evaluation for the selected day. Canonical artifacts remain immutable.
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <ChipButton
                  onClick={() => runCustomThresholds()}
                  disabled={!selectedDate || customLoading}
                  title="Calls /api/regime/custom for the selected date (defaults)"
                  tone="neutral"
                >
                  {customLoading ? "Running…" : "Run custom thresholds"}
                </ChipButton>

                <ChipButton onClick={() => clearCustom()} disabled={!customEval && !customErr} tone="neutral">
                  Clear
                </ChipButton>
              </div>
            </div>

            <div className="mt-3 text-[11px] text-ui-faint">
              Selected META:{" "}
              <span className="font-mono text-ui-muted">
                {selectedMetaLoading ? "loading…" : selectedMeta ? "loaded" : "—"}
              </span>
              {selectedMetaErr ? <span className="ml-2 text-[rgb(var(--tone-heat)/0.95)]">{selectedMetaErr}</span> : null}
              {customErr ? <span className="ml-2 text-[rgb(var(--tone-heat)/0.95)]">{customErr}</span> : null}
            </div>

            <div className="mt-4">
              <ThresholdIntegrityPanel
                canonicalMetaDay={selectedMeta}
                custom={customEval}
                fallbackGateThreshold={0.4}
                learnMoreHref="/how-to/custom-thresholds"
                title="Threshold integrity"
              />
            </div>
          </div>

          <div className="mt-5 rounded-lg border border-ui-border bg-ui-bg/10 px-4 py-3 text-[11px] text-ui-faint">
            Guardrail: descriptive-only. No price data, no forecasts, and no advisory language.
          </div>
        </>
      )}
    </section>
  );
}