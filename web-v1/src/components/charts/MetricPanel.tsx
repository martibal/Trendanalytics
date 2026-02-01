"use client";

import React, { useMemo, useState } from "react";
import { MetricTriLineChart } from "@/components/charts/MetricTriLineChart";
import type { TriSeriesPoint } from "@/lib/series/triSeries";

type ExplainMode = "basic" | "advanced";

function lastNonNull(points: TriSeriesPoint[]) {
  for (let i = points.length - 1; i >= 0; i--) {
    const p = points[i];
    if (!p) continue;
    if (p.daily != null || p.ma7 != null || p.ma30 != null) return p;
  }
  return null;
}

function fmtNum(x: number) {
  if (!Number.isFinite(x)) return "—";
  const abs = Math.abs(x);
  if (abs >= 1_000_000_000) return `${(x / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `${(x / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${(x / 1_000).toFixed(1)}k`;
  if (abs > 0 && abs < 1) return x.toFixed(6);
  return x.toFixed(2);
}

function fmtPct(x: number) {
  if (!Number.isFinite(x)) return "—";
  return `${(x * 100).toFixed(1)}%`;
}

function deltaBadge(daily: number | null, ma: number | null) {
  if (daily == null || ma == null) return { text: "—", tone: "text-zinc-400 border-zinc-800" };

  const diff = daily - ma;
  const denom = Math.abs(ma) > 0 ? Math.abs(ma) : 0;
  const pct = denom > 0 ? diff / denom : null;

  // Tone only; no “good/bad” semantics.
  const tone =
    diff > 0
      ? "text-zinc-200 border-zinc-700"
      : diff < 0
      ? "text-zinc-200 border-zinc-700"
      : "text-zinc-400 border-zinc-800";

  const sign = diff > 0 ? "+" : diff < 0 ? "−" : "";
  const diffTxt = `${sign}${fmtNum(Math.abs(diff))}`;
  const pctTxt = pct == null ? "" : ` (${sign}${fmtPct(Math.abs(pct))})`;

  return { text: `${diffTxt}${pctTxt}`, tone };
}

export function MetricPanel(props: {
  title: string;
  subtitle?: string;
  data: TriSeriesPoint[];
  basicExplain?: string | null;
  advancedExplain?: string | null;
  explainMode: ExplainMode;
}) {
  const { title, subtitle, data, basicExplain, advancedExplain, explainMode } = props;

  const explain =
    explainMode === "advanced"
      ? advancedExplain ?? basicExplain ?? null
      : basicExplain ?? null;

  // Default: Basic = collapsed (more charts, less text). Advanced = expanded.
  const [open, setOpen] = useState<boolean>(explainMode === "advanced");

  const last = useMemo(() => lastNonNull(data), [data]);

  const today = last?.daily ?? null;
  const ma7 = last?.ma7 ?? null;
  const ma30 = last?.ma30 ?? null;

  const d7 = useMemo(() => deltaBadge(today, ma7), [today, ma7]);
  const d30 = useMemo(() => deltaBadge(today, ma30), [today, ma30]);

  const hasAny = data && data.length > 0;

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
      {/* HEADER */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-zinc-100">{title}</div>
          {subtitle ? <div className="mt-1 text-xs text-zinc-500">{subtitle}</div> : null}
        </div>

        {/* Micro summary: Today vs MA7/MA30 */}
        <div className="flex shrink-0 flex-col items-end gap-1">
          <div className="text-[11px] text-zinc-500">Today vs MA</div>
          <div className="flex items-center gap-2">
            <div className={`rounded-lg border px-2 py-1 text-[11px] ${d7.tone}`}>
              <span className="text-zinc-500">MA7</span>{" "}
              <span className="text-zinc-200">{d7.text}</span>
            </div>
            <div className={`rounded-lg border px-2 py-1 text-[11px] ${d30.tone}`}>
              <span className="text-zinc-500">MA30</span>{" "}
              <span className="text-zinc-200">{d30.text}</span>
            </div>
          </div>
        </div>
      </div>

      {/* CHART */}
      <div className="mt-3 h-56 min-h-[220px] w-full">
        {!hasAny ? (
          <div className="flex h-full items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950 text-sm text-zinc-400">
            No data for window.
          </div>
        ) : (
          <MetricTriLineChart data={data} />
        )}
      </div>

      {/* FOOTER: compact toggle + optional explanation */}
      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="text-[11px] text-zinc-500">
          {last?.date ? (
            <>
              Last point: <span className="text-zinc-300">{last.date}</span>
              {today != null ? (
                <>
                  {" "}
                  · Daily: <span className="text-zinc-300">{fmtNum(today)}</span>
                </>
              ) : null}
            </>
          ) : (
            "No recent point."
          )}
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-100 hover:bg-zinc-800"
        >
          {open ? "Hide explanation" : "Show explanation"}
        </button>
      </div>

      {open ? (
        <div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-950 p-3">
          <div className="text-xs font-semibold text-zinc-200">What you&apos;re seeing</div>
          <div className="mt-1 text-sm text-zinc-300">
            {explain ??
              "Daily value plus MA7 and MA30 to make trend shifts visually obvious. Missing values render as gaps (null), never as zeros."}
          </div>

          <div className="mt-2 text-[11px] text-zinc-500">
            Reading tip: if Daily diverges from MA7 and MA30, the move is recent; if MA7 crosses MA30, the shift is more
            persistent.
          </div>
        </div>
      ) : null}
    </div>
  );
}
