"use client";

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from "recharts";

export function MetricLineChart<T extends Record<string, unknown>>({
  data,
  valueKey,
}: {
  data: T[];
  valueKey: string;
}) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
          <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 10 }} width={48} />
          <Tooltip
            contentStyle={{ background: "rgba(9, 9, 11, 0.95)", border: "1px solid rgba(39, 39, 42, 1)", borderRadius: 12 }}
            labelStyle={{ color: "rgba(228, 228, 231, 1)" }}
          />
          <Line type="monotone" dataKey={valueKey} dot={false} strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
