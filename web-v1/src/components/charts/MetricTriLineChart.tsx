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

// Optional convenience re-export (prevents “exported member” issues if someone imports from this module)
export type { TriSeriesPoint } from "@/lib/series/triSeries";

export function MetricTriLineChart({ data }: { data: TriSeriesPoint[] }) {
  // Compact number formatting for tooltip + axis
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

  // Show shorter dates on axis, keep full in tooltip label
  const fmtDateTick = (iso: string) => {
    // expecting YYYY-MM-DD
    if (typeof iso !== "string" || iso.length < 10) return iso;
    return iso.slice(5); // MM-DD
  };

  return (
    <div className="h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 8, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.15} />

          <XAxis
            dataKey="date"
            tickFormatter={fmtDateTick}
            minTickGap={18}
            tick={{ fontSize: 11, fill: "#a1a1aa" }}
            axisLine={{ stroke: "#27272a" }}
            tickLine={{ stroke: "#27272a" }}
          />

          <YAxis
            tickFormatter={fmt}
            tick={{ fontSize: 11, fill: "#a1a1aa" }}
            axisLine={{ stroke: "#27272a" }}
            tickLine={{ stroke: "#27272a" }}
            width={64}
          />

          <Tooltip
            labelFormatter={(label) => String(label)}
            formatter={(value: unknown, name: string) => [fmt(value), name]}
            contentStyle={{
              background: "rgba(9, 9, 11, 0.95)",
              border: "1px solid rgba(39, 39, 42, 1)",
              borderRadius: 12,
              color: "#e4e4e7",
              fontSize: 12,
            }}
            itemStyle={{ color: "#e4e4e7" }}
            labelStyle={{ color: "#e4e4e7" }}
          />

          <Legend
            wrapperStyle={{ fontSize: 12, color: "#a1a1aa" }}
            iconType="plainline"
          />

          {/* IMPORTANT: connectNulls={false} => null becomes gaps (not interpolated) */}
          <Line
            type="monotone"
            dataKey="daily"
            name="Daily"
            dot={false}
            strokeWidth={1.5}
            connectNulls={false}
          />

          <Line
            type="monotone"
            dataKey="ma7"
            name="MA7"
            dot={false}
            strokeWidth={2}
            connectNulls={false}
          />

          <Line
            type="monotone"
            dataKey="ma30"
            name="MA30"
            dot={false}
            strokeWidth={2}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
