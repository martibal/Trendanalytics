"use client";

import React from "react";
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

export function MetricTriLineChart({ data }: { data: TriSeriesPoint[] }) {
  const fmt = (x: unknown) => {
    if (x == null) return "—";
    const n = Number(x);
    if (!Number.isFinite(n)) return "—";
    const abs = Math.abs(n);
    if (abs >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
    if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
    if (abs >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
    if (abs > 0 && abs < 1) return n.toFixed(6);
    return n.toFixed(2);
  };

  const fmtDateTick = (iso: string) => {
    if (typeof iso !== "string" || iso.length < 10) return iso;
    return iso.slice(5); // MM-DD
  };

  // Tokens (RGB triplets) from globals.css
  // Tokens (RGB triplets) from globals.css
  const axisText = rgb("--text-muted");
  const axisLine = rgba("--border", 0.10);
  const grid = rgba("--border", 0.10);

  const tooltipBg = rgba("--bg", 0.92);
  const tooltipBorder = rgba("--border", 0.12);
  const tooltipText = rgb("--text");

  const strokeDaily = rgb("--chart-daily");
  const strokeMA7 = rgb("--chart-ma7");
  const strokeMA30 = rgb("--chart-ma30");


  return (
    <div className="h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 8, left: 0 }}>
          <CartesianGrid stroke={grid} strokeDasharray="3 3" opacity={0.15} />

          <XAxis
            dataKey="date"
            tickFormatter={fmtDateTick}
            minTickGap={18}
            tick={{ fontSize: 11, fill: axisText }}
            axisLine={{ stroke: axisLine }}
            tickLine={{ stroke: axisLine }}
          />

          <YAxis
            tickFormatter={fmt}
            tick={{ fontSize: 11, fill: axisText }}
            axisLine={{ stroke: axisLine }}
            tickLine={{ stroke: axisLine }}
            width={64}
          />

          <Tooltip
            labelFormatter={(label) => String(label)}
            formatter={(value: unknown, name: string) => [fmt(value), name]}
            contentStyle={{
              background: tooltipBg,
              border: `1px solid ${tooltipBorder}`,
              borderRadius: 12,
              color: tooltipText,
              fontSize: 12,
            }}
            itemStyle={{ color: tooltipText }}
            labelStyle={{ color: tooltipText }}
          />

          <Legend wrapperStyle={{ fontSize: 12, color: axisText }} iconType="plainline" />

          {/* IMPORTANT: connectNulls={false} => null becomes gaps (not interpolated) */}
          <Line
            type="monotone"
            dataKey="daily"
            name="Daily"
            dot={false}
            stroke={strokeDaily}
            strokeWidth={1.5}
            connectNulls={false}
            isAnimationActive={false}
          />

          <Line
            type="monotone"
            dataKey="ma7"
            name="MA7"
            dot={false}
            stroke={strokeMA7}
            strokeWidth={2}
            connectNulls={false}
            isAnimationActive={false}
          />

          <Line
            type="monotone"
            dataKey="ma30"
            name="MA30"
            dot={false}
            stroke={strokeMA30}
            strokeWidth={2}
            connectNulls={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
