"use client";

import React, { useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";

import type { TriSeriesPoint } from "@/lib/series/triSeries";

// Optional convenience re-export
export type { TriSeriesPoint } from "@/lib/series/triSeries";

// Helper: convert our RGB-triplet CSS vars into valid rgb()/rgba()
const rgb = (name: string) => `rgb(var(${name}))`;
const rgba = (name: string, a: number) => `rgb(var(${name}) / ${a})`;

function fmtCompact(x: unknown) {
  if (x == null) return "—";
  const n = Number(x);
  if (!Number.isFinite(n)) return "—";

  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  if (abs > 0 && abs < 1) return n.toFixed(6);
  return n.toFixed(2);
}

function fmtDateTick(iso: string) {
  if (typeof iso !== "string" || iso.length < 10) return iso;
  return iso.slice(5); // MM-DD
}

export function MetricTriLineChart({ data }: { data: TriSeriesPoint[] }) {
  // Important: keep strokes/borders subtle, but *readable*.
  // Use tokens directly; Tailwind alpha is already handled by rgb(var(--x) / a).
  const theme = useMemo(() => {
    return {
      axisText: rgb("--text-muted"),
      axisLine: rgba("--border", 0.35),
      tickLine: rgba("--border", 0.25),
      grid: rgba("--border", 0.18),

      tooltipBg: rgba("--surface", 0.98),
      tooltipBorder: rgba("--border", 0.55),
      tooltipText: rgb("--text"),

      daily: rgb("--chart-daily"),
      ma7: rgb("--chart-ma7"),
      ma30: rgb("--chart-ma30"),
    };
  }, []);

  return (
    <div className="h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 8, left: 0 }}>
          <CartesianGrid stroke={theme.grid} strokeDasharray="3 3" />

          <XAxis
            dataKey="date"
            tickFormatter={fmtDateTick}
            minTickGap={18}
            tick={{ fontSize: 11, fill: theme.axisText }}
            axisLine={{ stroke: theme.axisLine }}
            tickLine={{ stroke: theme.tickLine }}
          />

          <YAxis
            tickFormatter={fmtCompact}
            tick={{ fontSize: 11, fill: theme.axisText }}
            axisLine={{ stroke: theme.axisLine }}
            tickLine={{ stroke: theme.tickLine }}
            width={64}
          />

          <Tooltip
            labelFormatter={(label) => String(label)}
            formatter={(value: unknown, name: string) => [fmtCompact(value), name]}
            contentStyle={{
              background: theme.tooltipBg,
              border: `1px solid ${theme.tooltipBorder}`,
              borderRadius: 12,
              color: theme.tooltipText,
              fontSize: 12,
            }}
            itemStyle={{ color: theme.tooltipText }}
            labelStyle={{ color: theme.tooltipText }}
          />

          <Legend wrapperStyle={{ fontSize: 12, color: theme.axisText }} iconType="plainline" />

          {/* IMPORTANT: connectNulls={false} => null becomes gaps (not interpolated) */}
          <Line
            type="monotone"
            dataKey="daily"
            name="Daily"
            dot={false}
            stroke={theme.daily}
            strokeWidth={1.5}
            connectNulls={false}
            isAnimationActive={false}
          />

          <Line
            type="monotone"
            dataKey="ma7"
            name="MA7"
            dot={false}
            stroke={theme.ma7}
            strokeWidth={2}
            connectNulls={false}
            isAnimationActive={false}
          />

          <Line
            type="monotone"
            dataKey="ma30"
            name="MA30"
            dot={false}
            stroke={theme.ma30}
            strokeWidth={2}
            connectNulls={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
