"use client";

import { useState, useCallback } from "react";
import {
  ResponsiveContainer,
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

  const color = d.color;

  return (
    <div className="max-w-[200px] rounded-xl border border-white/15 bg-[#0F1B2D] px-3 py-2.5 text-[11px] shadow-xl">
      <div className="mb-1 text-slate-400">{d.date}</div>
      <div className="font-black" style={{ color }}>
        {d.label ?? "—"}
      </div>
      <div className="mt-0.5 text-slate-400">Confidence {d.confidence.toFixed(3)}</div>
      {d.oneLiner ? (
        <div className="mt-1 leading-[1.5] text-slate-500">{d.oneLiner}</div>
      ) : null}
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
  const chartRows = toChartRows(rows);
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
    return (
      <div className="flex h-32 items-center justify-center text-[11px] text-slate-600">
        No history available
      </div>
    );
  }

  const step = Math.max(1, Math.floor(chartRows.length / 6));

  return (
    <div>
      {selected ? (
        <div
          className="mb-3 rounded-xl px-3 py-2.5 text-[11px]"
          style={{
            backgroundColor: `${selected.color}18`,
            border: `1px solid ${selected.color}33`,
          }}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-400">{selected.date}</span>
            <span className="font-black" style={{ color: selected.color }}>
              {selected.label ?? "—"}
            </span>
            <span className="text-slate-400">{selected.confidence.toFixed(3)}</span>
          </div>
          {selected.oneLiner ? (
            <div className="mt-1 leading-[1.5] text-slate-500">{selected.oneLiner}</div>
          ) : null}
        </div>
      ) : null}

      <div className="touch-pan-x">
        <ResponsiveContainer width="100%" height={120}>
          <AreaChart
            data={chartRows}
            onClick={handleClick}
            margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="regimeGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={chainColor} stopOpacity={0.3} />
                <stop offset="95%" stopColor={chainColor} stopOpacity={0.02} />
              </linearGradient>
            </defs>

            <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />

            <XAxis
              dataKey="dateShort"
              tick={{ fill: "#475569", fontSize: 9 }}
              tickLine={false}
              axisLine={false}
              interval={step - 1}
            />

            <YAxis
              domain={[0, 4]}
              ticks={[0, 1, 2, 3, 4]}
              tick={(props: unknown) => {
                const p = props as {
                  y?: number;
                  payload?: { value?: number };
                  value?: number;
                };

                const y = typeof p.y === "number" ? p.y : 0;
                const value = Number(p.payload?.value ?? p.value ?? 0);
                const label = REGIME_VALUE_LABELS[value] ?? "UNK";
                const color =
                  REGIME_COLORS[
                    label === "UNK" ? "UNKNOWN/DEGRADED" : label
                  ] ?? "#6B7280";

                return (
                  <text x={2} y={y + 3} fill={color} fontSize={7} fontWeight="bold">
                    {label}
                  </text>
                );
              }}
              tickLine={false}
              axisLine={false}
              width={42}
            />

            <Tooltip content={<CustomTooltip />} />

            <ReferenceLine
              y={2}
              stroke="rgba(255,255,255,0.1)"
              strokeDasharray="3 3"
            />

            <Area
              type="stepAfter"
              dataKey="regimeValue"
              stroke={chainColor}
              strokeWidth={2}
              fill="url(#regimeGrad)"
              dot={false}
              activeDot={{ r: 4, fill: chainColor }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 touch-pan-x">
        <div className="mb-1 text-[9px] uppercase tracking-wider text-slate-600">
          Confidence
        </div>

        <ResponsiveContainer width="100%" height={50}>
          <AreaChart data={chartRows} margin={{ top: 2, right: 4, left: 42, bottom: 0 }}>
            <defs>
              <linearGradient id="confGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#22d3ee" stopOpacity={0.02} />
              </linearGradient>
            </defs>

            <XAxis dataKey="dateShort" hide />
            <YAxis domain={[0, 1]} hide />

            <ReferenceLine
              y={0.4}
              stroke="rgba(255,100,100,0.3)"
              strokeDasharray="3 3"
            />

            <Area
              type="monotone"
              dataKey="confidence"
              stroke="#22d3ee"
              strokeWidth={1.5}
              fill="url(#confGrad)"
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
        {(["CONGESTED", "HEATING", "STABLE", "CHEAP"] as const).map((label) => (
          <span key={label} className="flex items-center gap-1 text-[9px] text-slate-600">
            <span
              className="h-1.5 w-3 rounded-full"
              style={{ backgroundColor: REGIME_COLORS[label] }}
            />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}