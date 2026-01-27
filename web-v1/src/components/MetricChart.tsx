"use client";

import React, { useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

export type MetricChartPoint = {
  date: string; // YYYY-MM-DD
  value: number | null;
  ma7: number | null;
  ma30: number | null;
};

type Palette = {
  daily: string;
  ma7: string;
  ma30: string;
  grid?: string;
  text?: string;
};

export type MetricChartProps = {
  title?: string;
  subtitle?: string; // e.g. metric key
  rows: Array<Record<string, any>>; // daily objects
  metricKey: string;
  height?: number;

  // formatting
  formatValue?: (v: number | null) => string;
  formatTick?: (v: number) => string;
  formatDateLabel?: (yyyyMmDd: string) => string;

  palette?: Partial<Palette>;
  showLegendInline?: boolean; // tiny legend row under title
};

const DEFAULT_PALETTE: Palette = {
  daily: "rgba(249,250,251,0.92)", // text-primary-ish
  ma7: "rgba(59,130,246,0.95)", // accent-primary
  ma30: "rgba(99,102,241,0.95)", // accent-secondary
  grid: "rgba(255,255,255,0.06)",
  text: "rgba(209,213,219,0.85)",
};

function toUtcDayNumber(yyyyMmDd: string): number | null {
  if (typeof yyyyMmDd !== "string") return null;
  const s = yyyyMmDd.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const t = Date.parse(`${s}T00:00:00Z`);
  if (!Number.isFinite(t)) return null;
  return Math.floor(t / (1000 * 60 * 60 * 24));
}

function fromUtcDayNumber(day: number): Date {
  return new Date(day * 24 * 60 * 60 * 1000);
}

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function toNumberOrNull(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/**
 * Builds a continuous daily series over the window of available dates.
 * Missing days are filled as {value: null} so moving averages remain honest.
 */
function buildContinuousSeries(rows: Array<Record<string, any>>, metricKey: string): Array<{ date: string; value: number | null }> {
  // pick max date range from valid date rows
  const byDay = new Map<number, number | null>();

  let minDay: number | null = null;
  let maxDay: number | null = null;

  for (const r of rows) {
    const ds = typeof r.date === "string" ? r.date : "";
    const dn = toUtcDayNumber(ds);
    if (dn === null) continue;
    const v = toNumberOrNull(r?.[metricKey]);
    byDay.set(dn, v);
    if (minDay === null || dn < minDay) minDay = dn;
    if (maxDay === null || dn > maxDay) maxDay = dn;
  }

  if (minDay === null || maxDay === null) return [];

  const out: Array<{ date: string; value: number | null }> = [];
  for (let d = minDay; d <= maxDay; d++) {
    const date = ymd(fromUtcDayNumber(d));
    const value = byDay.has(d) ? (byDay.get(d) ?? null) : null;
    out.push({ date, value });
  }
  return out;
}

/**
 * Simple moving average over last N days.
 * - If any day in the window is null, SMA becomes null (strict).
 *   This prevents fake averages across gaps/missing data.
 */
function addSMA(
  series: Array<{ date: string; value: number | null }>,
  window: number
): Array<{ date: string; value: number | null; sma: number | null }> {
  const out: Array<{ date: string; value: number | null; sma: number | null }> = [];
  const buf: Array<number | null> = [];

  for (let i = 0; i < series.length; i++) {
    const v = series[i].value;
    buf.push(v);
    if (buf.length > window) buf.shift();

    let sma: number | null = null;
    if (buf.length === window && buf.every((x) => x !== null)) {
      const sum = (buf as number[]).reduce((a, b) => a + b, 0);
      sma = sum / window;
    }
    out.push({ date: series[i].date, value: v, sma });
  }

  return out;
}

function defaultFormatValue(v: number | null): string {
  if (v === null) return "n/a";
  // generic numeric with grouping
  const fixed = Number.isInteger(v) ? v.toFixed(0) : v.toFixed(2);
  const [a, b] = fixed.split(".");
  const grouped = a.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return b ? `${grouped}.${b}` : grouped;
}

function defaultFormatDateLabel(yyyyMmDd: string): string {
  return yyyyMmDd;
}

function smallLegendDot(color: string) {
  return (
    <span
      style={{
        display: "inline-block",
        width: 10,
        height: 10,
        borderRadius: 9999,
        background: color,
        marginRight: 6,
      }}
    />
  );
}

export default function MetricChart({
  title,
  subtitle,
  rows,
  metricKey,
  height = 220,
  formatValue = defaultFormatValue,
  formatTick,
  formatDateLabel = defaultFormatDateLabel,
  palette,
  showLegendInline = true,
}: MetricChartProps) {
  const pal: Palette = { ...DEFAULT_PALETTE, ...(palette ?? {}) };

  const data: MetricChartPoint[] = useMemo(() => {
    const series = buildContinuousSeries(rows, metricKey);

    // add MA7
    const with7 = addSMA(series, 7).map((p) => ({
      date: p.date,
      value: p.value,
      ma7: p.sma,
    }));

    // add MA30 on top (need base value again)
    // compute ma30 from original series (not from ma7)
    const with30 = addSMA(series, 30);

    const out: MetricChartPoint[] = [];
    for (let i = 0; i < series.length; i++) {
      out.push({
        date: series[i].date,
        value: series[i].value,
        ma7: with7[i]?.ma7 ?? null,
        ma30: with30[i]?.sma ?? null,
      });
    }
    return out;
  }, [rows, metricKey]);

  const hasAny = data.some((d) => d.value !== null || d.ma7 !== null || d.ma30 !== null);

  const yTickFormatter = (v: any) => {
    const n = typeof v === "number" ? v : Number(v);
    if (!Number.isFinite(n)) return "";
    return formatTick ? formatTick(n) : defaultFormatValue(n);
  };

  const xTickFormatter = (v: any) => {
    if (typeof v !== "string") return "";
    // show sparse tick label like YYYY-MM
    return v.slice(0, 7);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;

    const point = payload?.[0]?.payload as MetricChartPoint | undefined;
    const dateLabel = typeof label === "string" ? formatDateLabel(label) : "";

    const get = (k: keyof MetricChartPoint) => {
      const v = point ? (point[k] as any) : null;
      return formatValue(typeof v === "number" ? v : null);
    };

    return (
      <div
        className="css-panel"
        style={{
          padding: 10,
          minWidth: 220,
          borderColor: "rgba(255,255,255,0.10)",
          color: "rgba(249,250,251,0.92)",
          boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
        }}
      >
        <div className="css-label css-mono" style={{ fontSize: 12, marginBottom: 6 }}>
          {dateLabel}
        </div>

        <div style={{ display: "grid", rowGap: 6 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center" }}>
              {smallLegendDot(pal.daily)}
              <span className="css-label" style={{ fontSize: 12 }}>daily</span>
            </div>
            <span className="css-mono" style={{ fontSize: 12 }}>{get("value")}</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center" }}>
              {smallLegendDot(pal.ma7)}
              <span className="css-label" style={{ fontSize: 12 }}>MA7</span>
            </div>
            <span className="css-mono" style={{ fontSize: 12 }}>{get("ma7")}</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center" }}>
              {smallLegendDot(pal.ma30)}
              <span className="css-label" style={{ fontSize: 12 }}>MA30</span>
            </div>
            <span className="css-mono" style={{ fontSize: 12 }}>{get("ma30")}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <section className="css-panel" style={{ padding: 14 }}>
      {(title || subtitle || showLegendInline) ? (
        <div className="flex flex-wrap items-end justify-between gap-2 mb-2">
          <div>
            {title ? <div className="text-sm font-semibold" style={{ color: "rgba(249,250,251,0.92)" }}>{title}</div> : null}
            {subtitle ? <div className="text-xs css-label css-mono">{subtitle}</div> : null}
          </div>

          {showLegendInline ? (
            <div className="flex items-center gap-3 text-xs css-label">
              <span className="flex items-center">{smallLegendDot(pal.daily)}daily</span>
              <span className="flex items-center">{smallLegendDot(pal.ma7)}MA7</span>
              <span className="flex items-center">{smallLegendDot(pal.ma30)}MA30</span>
            </div>
          ) : null}
        </div>
      ) : null}

      {!hasAny ? (
        <div className="css-label text-sm">no data</div>
      ) : (
        <div style={{ width: "100%", height }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 18, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={pal.grid} strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickFormatter={xTickFormatter}
                minTickGap={28}
                tick={{ fill: pal.text, fontSize: 12 }}
                axisLine={{ stroke: pal.grid }}
                tickLine={{ stroke: pal.grid }}
              />
              <YAxis
                tickFormatter={yTickFormatter}
                tick={{ fill: pal.text, fontSize: 12 }}
                axisLine={{ stroke: pal.grid }}
                tickLine={{ stroke: pal.grid }}
                width={70}
              />

              <Tooltip content={<CustomTooltip />} />

              <Line
                type="monotone"
                dataKey="value"
                name="daily"
                stroke={pal.daily}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
                connectNulls={false}
              />
              <Line
                type="monotone"
                dataKey="ma7"
                name="MA7"
                stroke={pal.ma7}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
                connectNulls={false}
              />
              <Line
                type="monotone"
                dataKey="ma30"
                name="MA30"
                stroke={pal.ma30}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
