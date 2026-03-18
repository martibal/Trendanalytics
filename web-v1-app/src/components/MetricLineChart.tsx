// src/components/MetricLineChart.tsx
"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

export type MetricPoint = {
  date: string; // YYYY-MM-DD
  value?: number | null; // raw/level (gold)
  ma7?: number | null;
  ma30?: number | null;
};

function fmtNumber(v: unknown): string {
  if (typeof v !== "number" || Number.isNaN(v)) return "—";
  const abs = Math.abs(v);
  if (abs === 0) return "0";
  if (abs >= 1000) return v.toFixed(0);
  if (abs >= 10) return v.toFixed(2);
  if (abs >= 1) return v.toFixed(4);
  return v.toPrecision(6);
}

function fmtDateShort(d: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d.slice(5);
  return d;
}

function hasAnySeries(data: MetricPoint[], key: "value" | "ma7" | "ma30") {
  return data.some((p) => typeof p[key] === "number" && !Number.isNaN(p[key] as number));
}

function withUnit(value: unknown, unitLabel?: string): string {
  const base = fmtNumber(value);
  if (!unitLabel || base === "—") return base;
  return `${base} ${unitLabel}`;
}

export default function MetricLineChart(props: {
  title: string;
  subtitle?: string;
  data: MetricPoint[];
  height?: number;
  unitLabel?: string;
}) {
  const { title, subtitle, data, height = 280, unitLabel } = props;

  const showValue = hasAnySeries(data, "value");
  const showMA7 = hasAnySeries(data, "ma7");
  const showMA30 = hasAnySeries(data, "ma30");

  return (
    <div className="rounded-xl border p-5">
      <div className="flex flex-col gap-1">
        <div className="text-sm font-medium">{title}</div>
        {subtitle ? <div className="text-xs text-muted-foreground">{subtitle}</div> : null}
        {unitLabel ? <div className="text-xs text-muted-foreground">Units: {unitLabel}</div> : null}
      </div>

      <div className="mt-4 w-full min-w-0" style={{ height, minHeight: height }}>
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={height}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tickFormatter={fmtDateShort} minTickGap={18} />
            <YAxis tickFormatter={fmtNumber} width={72} />

            <Tooltip
              formatter={(value, name) => {
                const n = String(name);
                const seriesLabel =
                  n === "value"
                    ? unitLabel
                      ? `Value (${unitLabel})`
                      : "Value"
                    : n === "ma7"
                      ? unitLabel
                        ? `MA7 (${unitLabel})`
                        : "MA7"
                      : n === "ma30"
                        ? unitLabel
                          ? `MA30 (${unitLabel})`
                          : "MA30"
                        : n;

                return [withUnit(value, unitLabel), seriesLabel];
              }}
              labelFormatter={(label) => (typeof label === "string" ? label : String(label))}
            />

            {showValue ? (
              <Line type="monotone" dataKey="value" dot={false} isAnimationActive={false} />
            ) : null}
            {showMA7 ? (
              <Line type="monotone" dataKey="ma7" dot={false} isAnimationActive={false} />
            ) : null}
            {showMA30 ? (
              <Line type="monotone" dataKey="ma30" dot={false} isAnimationActive={false} />
            ) : null}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 text-xs text-muted-foreground">
        Showing: {[showValue ? "Value" : null, showMA7 ? "MA7" : null, showMA30 ? "MA30" : null]
          .filter(Boolean)
          .join(", ")}
        {unitLabel ? ` · Units: ${unitLabel}` : ""}
        . No reinterpretation applied.
      </div>
    </div>
  );
}