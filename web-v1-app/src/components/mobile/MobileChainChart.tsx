"use client";

import { useMemo, useState, useCallback } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
} from "recharts";
import { REGIME_COLORS } from "@/lib/mobile/data";

type HistoryRow = {
  date: string;
  label: string | null;
  confidence: number | null;
  oneLiner: string | null;
};

type ChartRow = {
  date: string;
  dateShort: string;
  regimeValue: number;
  confidence: number;
  label: string | null;
  oneLiner: string | null;
  color: string;
};

const REGIME_VALUES: Record<string, number> = {
  CONGESTED: 4,
  HEATING: 3,
  STABLE: 2,
  CHEAP: 1,
  "UNKNOWN/DEGRADED": 0,
};

const REGIME_VALUE_LABELS: Record<number, string> = {
  4: "CONGESTED",
  3: "HEATING",
  2: "STABLE",
  1: "CHEAP",
  0: "UNK",
};

function shortDate(date: string): string {
  const d = new Date(date + "T00:00:00Z");
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
}

function toChartRows(rows: HistoryRow[]): ChartRow[] {
  return [...rows].reverse().map((r) => ({
    date: r.date,
    dateShort: shortDate(r.date),
    regimeValue: REGIME_VALUES[r.label ?? ""] ?? 0,
    confidence: typeof r.confidence === "number" ? r.confidence : 0,
    label: r.label,
    oneLiner: r.oneLiner,
    color: REGIME_COLORS[r.label ?? ""] ?? REGIME_COLORS["UNKNOWN/DEGRADED"],
  }));
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: ChartRow }>;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;

  return (
    <div className="max-w-[210px] rounded-xl border border-white/15 bg-[#0F1B2D] px-3 py-2.5 text-[11px] shadow-xl">
      <div className="mb-1 text-slate-400">{d.date}</div>
      <div className="font-black" style={{ color: d.color }}>
        {d.label ?? "—"}
      </div>
      <div className="mt-0.5 text-slate-400">Confidence {d.confidence.toFixed(3)}</div>
      {d.oneLiner ? <div className="mt-1 leading-[1.5] text-slate-500">{d.oneLiner}</div> : null}
    </div>
  );
}

export default function MobileChainChart({
  rows,
  chainColor,
}: {
  rows: HistoryRow[];
  chainColor: string;
}) {
  const chartRows = useMemo(() => toChartRows(rows), [rows]);
  const [selected, setSelected] = useState<ChartRow | null>(null);

  const handleClick = useCallback((data: unknown) => {
    const activePayload = (
      data as
        | {
            activePayload?: Array<{
              payload?: ChartRow;
            }>;
          }
        | undefined
    )?.activePayload;

    const row = activePayload?.[0]?.payload;
    if (!row) return;
    setSelected(row);
  }, []);

  if (chartRows.length === 0) {
    return <div className="flex h-36 items-center justify-center text-[11px] text-slate-600">No history available</div>;
  }

  const regimeWidth = Math.max(640, chartRows.length * 18);
  const confidenceWidth = Math.max(640, chartRows.length * 18);
  const step = Math.max(1, Math.floor(chartRows.length / 6));

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/8 bg-black/15 p-3">
        <div className="mb-2 flex items-center justify-between gap-3">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Regime history</div>
            <div className="mt-1 text-[11px] text-slate-400">Drag horizontally if the chart is wider than your screen.</div>
          </div>
          {selected ? (
            <div className="text-right text-[11px]">
              <div className="font-semibold text-white">{selected.date}</div>
              <div style={{ color: selected.color }} className="font-black">{selected.label ?? "—"}</div>
            </div>
          ) : null}
        </div>

        <div className="mobile-inline-scroll -mx-3 overflow-x-auto px-3 pb-1">
          <div style={{ width: regimeWidth }}>
            <AreaChart width={regimeWidth} height={210} data={chartRows} onClick={handleClick} margin={{ top: 8, right: 10, left: 0, bottom: 8 }}>
              <defs>
                <linearGradient id="regimeGradMobile" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={chainColor} stopOpacity={0.26} />
                  <stop offset="95%" stopColor={chainColor} stopOpacity={0.02} />
                </linearGradient>
              </defs>

              <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
              <XAxis dataKey="dateShort" tick={{ fill: "#64748b", fontSize: 10 }} tickLine={false} axisLine={false} interval={step - 1} />
              <YAxis
                domain={[0, 4]}
                ticks={[0, 1, 2, 3, 4]}
                tick={(props: unknown) => {
                  const p = props as { y?: number; payload?: { value?: number }; value?: number };
                  const y = typeof p.y === "number" ? p.y : 0;
                  const value = Number(p.payload?.value ?? p.value ?? 0);
                  const label = REGIME_VALUE_LABELS[value] ?? "UNK";
                  const color = REGIME_COLORS[label === "UNK" ? "UNKNOWN/DEGRADED" : label] ?? "#6B7280";
                  return (
                    <text x={4} y={y + 4} fill={color} fontSize={9} fontWeight="bold">
                      {label}
                    </text>
                  );
                }}
                tickLine={false}
                axisLine={false}
                width={58}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={2} stroke="rgba(255,255,255,0.12)" strokeDasharray="3 3" />
              <Area type="stepAfter" dataKey="regimeValue" stroke={chainColor} strokeWidth={2.5} fill="url(#regimeGradMobile)" dot={false} activeDot={{ r: 4, fill: chainColor }} />
            </AreaChart>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/8 bg-black/15 p-3">
        <div className="mb-2 flex items-center justify-between gap-3">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Confidence history</div>
            <div className="mt-1 text-[11px] text-slate-400">0.40 is the key threshold. Below that, read the label as degraded.</div>
          </div>
          {selected ? <div className="text-[11px] font-semibold text-slate-300">{selected.confidence.toFixed(3)}</div> : null}
        </div>

        <div className="mobile-inline-scroll -mx-3 overflow-x-auto px-3 pb-1">
          <div style={{ width: confidenceWidth }}>
            <AreaChart width={confidenceWidth} height={96} data={chartRows} margin={{ top: 8, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="confGradMobile" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22d3ee" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="dateShort" tick={{ fill: "#64748b", fontSize: 10 }} tickLine={false} axisLine={false} interval={step - 1} />
              <YAxis domain={[0, 1]} tick={{ fill: "#64748b", fontSize: 10 }} tickCount={3} tickLine={false} axisLine={false} width={34} />
              <ReferenceLine y={0.4} stroke="rgba(255,100,100,0.35)" strokeDasharray="3 3" />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="confidence" stroke="#22d3ee" strokeWidth={1.8} fill="url(#confGradMobile)" dot={false} activeDot={{ r: 3, fill: "#22d3ee" }} />
            </AreaChart>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {(["CONGESTED", "HEATING", "STABLE", "CHEAP"] as const).map((label) => (
          <span key={label} className="flex items-center gap-1 text-[10px] text-slate-500">
            <span className="h-1.5 w-3 rounded-full" style={{ backgroundColor: REGIME_COLORS[label] }} />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
