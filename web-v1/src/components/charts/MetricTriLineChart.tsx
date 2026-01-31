"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";

export type TriLinePoint = {
  date: string;
  daily: number | null;
  ma7: number | null;
  ma30: number | null;
};

function formatNumber(x: unknown) {
  if (typeof x !== "number" || !Number.isFinite(x)) return "—";
  const abs = Math.abs(x);
  if (abs >= 1_000_000) return `${(x / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(x / 1_000).toFixed(1)}k`;
  // keep small values readable without over-rounding
  if (abs > 0 && abs < 1) return x.toFixed(4);
  return `${x.toFixed(2)}`;
}

export function MetricTriLineChart({
  data,
  yLabel,
}: {
  data: TriLinePoint[];
  yLabel?: string;
}) {
  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
          <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 10 }} width={54} label={yLabel ? { value: yLabel, angle: -90, position: "insideLeft" } : undefined} />
          <Tooltip
            formatter={(value: unknown, name: string) => [formatNumber(value), name]}
            contentStyle={{
              background: "rgba(9, 9, 11, 0.95)",
              border: "1px solid rgba(39, 39, 42, 1)",
              borderRadius: 12,
            }}
            labelStyle={{ color: "rgba(228, 228, 231, 1)" }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />

          {/* Daily (raw) */}
          <Line
            type="monotone"
            dataKey="daily"
            name="Daily"
            dot={false}
            strokeWidth={1.5}
            stroke="#e4e4e7"
            connectNulls={false}
          />

          {/* MA7 */}
          <Line
            type="monotone"
            dataKey="ma7"
            name="MA7"
            dot={false}
            strokeWidth={2}
            stroke="#60a5fa"
            connectNulls={false}
          />

          {/* MA30 */}
          <Line
            type="monotone"
            dataKey="ma30"
            name="MA30"
            dot={false}
            strokeWidth={2.5}
            stroke="#fbbf24"
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
