// src/components/MetricLineChart.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

export type MetricPoint = {
  date: string;
  value?: number | null;
  ma7?: number | null;
  ma30?: number | null;
};

// ── Colors — all from token system ───────────────────────────────────────────
const C = {
  chartRaw:  "#3D7099",
  chartMA7:  "#C49230",
  chartMA30: "#2A6E7A",
  chartGrid: "rgba(232,224,208,.14)",
  ink:       "#E8E0D0",
  ink2:      "#7A8A96",
  ink3:      "#3A4A57",
  gold:      "#C49230",
  surface2:  "#111E30",
  line2:     "rgba(232,224,208,.14)",
};

// ── Number formatting ─────────────────────────────────────────────────────────

function fmtNumber(v: unknown): string {
  if (typeof v !== "number" || Number.isNaN(v)) return "—";
  const abs = Math.abs(v);
  if (abs === 0) return "0";
  if (abs >= 1_000_000) return (v / 1_000_000).toFixed(2) + "M";
  if (abs >= 1_000) return v.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
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

function clampChartWidth(width: number): number {
  if (!Number.isFinite(width) || width <= 0) return 0;
  return Math.max(320, Math.floor(width));
}

// ── Metric context ────────────────────────────────────────────────────────────

type WindowDays = 30 | 90 | 180 | 365;

const METRIC_CONTEXT: Record<string, {
  axis: "demand" | "friction" | "capacity" | "context";
  what: string;
  readingGuide: Partial<Record<WindowDays, string>>;
}> = {
  tx_count_daily: {
    axis: "demand",
    what: "Confirmed transactions per day — the primary demand signal on any chain.",
    readingGuide: {
      30: "At 30 days you are reading short-term pulses. A rising MA7 crossing above a flat MA30 is a potential signal, but only significant if MA7 stays elevated for more than a few days. A single-day spike that reverts is noise, not a regime shift.",
      90: "At 90 days the MA30 line is your baseline. When MA7 rises above MA30 and holds there across multiple weeks, that is a credible demand increase. Watch the gap between the two lines — a widening gap means acceleration; a narrowing gap means momentum is fading.",
      180: "At 180 days you can see demand cycles clearly. A MA30 that trends upward across the entire window is a strong regime signal. Compare the first and last 30-day segments of the chart — if the right side is structurally higher, demand has shifted.",
      365: "At 365 days, short MA7 excursions are noise at this scale. Focus on the slope of the MA30. Prolonged MA30 uptrends that last months correspond to genuine on-chain demand cycles — not activity spikes.",
    },
  },
  block_count_daily: {
    axis: "capacity",
    what: "Blocks produced per day — reflects protocol pacing and miner or validator activity.",
    readingGuide: {
      30: "Block count should be near-constant for most chains. Bitcoin targets ~144 blocks per day. Short-term deviations are normal variance. A consistent drop below the expected baseline over 30 days is worth noting.",
      90: "For Bitcoin, look for the ~2-week rhythm of difficulty adjustments visible as slight oscillations. A MA30 that is clearly below the historical target rate over 90 days may indicate hash rate contraction.",
      180: "Sustained deviation from expected block rate over 6 months is unusual and significant. Compare with median_tx_fee_native — if fees are high but block count is low, capacity is genuinely constrained.",
      365: "Block count is one of the most stable metrics over a year. Large persistent deviations are rare and point to network-level events. Flat, stable MA30 at the expected rate confirms healthy network operation.",
    },
  },
  median_tx_fee_native: {
    axis: "friction",
    what: "Median transaction fee in native units — the direct cost of transacting; the main friction indicator.",
    readingGuide: {
      30: "Fee spikes at 30 days are often short congestion events. If MA7 spikes and then falls back toward MA30 within a week, the event was transient. If MA7 stays elevated above MA30 across multiple weeks, friction is genuinely building.",
      90: "A MA30 that is trending upward over 90 days means fee pressure is structural, not episodic. Cross-reference with tx_count: fees rising alongside rising demand is a textbook congestion build-up.",
      180: "Fee regimes persist. A MA30 uptrend over 6 months in fees, alongside sustained demand growth, is the classic CONGESTED regime pattern.",
      365: "Year-scale fee MA30 gives you the full regime context. Where the current MA30 sits relative to the 365-day range tells you whether fees are historically low, mid-range, or elevated.",
    },
  },
  avg_block_time_sec: {
    axis: "capacity",
    what: "Average time between blocks in seconds — measures chain pacing and throughput capacity.",
    readingGuide: {
      30: "Bitcoin targets ~600 seconds per block. A persistent trend above 600s over 30 days suggests hash rate decline; below 600s suggests hash rate growth.",
      90: "At 90 days you can see Bitcoin difficulty adjustment cycles. A MA30 that is clearly below 600s means hash rate has been growing structurally.",
      180: "Sustained compression of block time over 6 months means capacity is genuinely expanding. Declining block time with rising fees means demand is outpacing supply.",
      365: "Year-scale block time is a direct hash rate proxy. Compare to fee trends: growing capacity but still rising fees means demand growth is outpacing supply.",
    },
  },
  gas_utilization_pct: {
    axis: "capacity",
    what: "Average block gas utilization as a 0–1 fraction — how full EVM blocks are on average.",
    readingGuide: {
      30: "Values persistently above 0.90 over 30 days mean blocks are almost always full — a CONGESTED signal. Values near 0.50 are balanced.",
      90: "The MA30 at 90 days is the most reliable congestion indicator. A MA30 anchored near 0.90+ is the clearest congestion signal in the entire model.",
      180: "A MA30 that spent most of 6 months above 0.80 is a persistent congestion regime, not a short-term event.",
      365: "Year-scale gas utilization shows the full demand-versus-capacity story. Periods where MA30 stays near 0.90 are historically associated with high fees and failed transactions.",
    },
  },
  failed_tx_rate: {
    axis: "friction",
    what: "Share of transactions that failed — an EVM-specific friction and congestion indicator.",
    readingGuide: {
      30: "Elevated failed rate at 30 days can reflect smart contract competition or MEV activity. A spike that reverts to MA30 within a week is usually episodic.",
      90: "A MA30 failed rate that is persistently elevated over 90 days is a genuine friction signal. Cross-reference with gas_utilization.",
      180: "Structural elevation of the failed rate MA30 over 6 months, combined with high gas utilization and rising fees, is one of the clearest CONGESTED regime confirmations.",
      365: "Year-scale failed rate gives historical context. Near the 365-day low means the chain is operating cleanly.",
    },
  },
  unique_active_addresses: {
    axis: "demand",
    what: "Unique addresses active per day — measures the breadth of network participation.",
    readingGuide: {
      30: "Sudden surges in active addresses often reflect protocol events or airdrops. A sustained MA7 rise above MA30 that holds for two weeks is a more credible signal.",
      90: "A rising MA30 in active addresses over 90 days indicates genuine network growth. Compare to tx_count: if both rise together, demand is broad-based.",
      180: "Six-month address trends reveal adoption cycles. Structural MA30 growth across 6 months is a durable demand indicator.",
      365: "Year-scale active address trends are among the best regime context signals.",
    },
  },
  median_tx_value_native: {
    axis: "context",
    what: "Median transaction value in native units — characterizes the typical size of on-chain activity.",
    readingGuide: {
      30: "Short-term spikes in median value often reflect large transactions. A rising median value alongside flat tx_count means fewer, larger transactions dominating.",
      90: "Rising median value with flat tx_count typically means large-actor or institutional dominance.",
      180: "Six-month median value trends help characterize who is using the chain.",
      365: "Year-scale median value is a structural characterization tool.",
    },
  },
  value_transferred_native: {
    axis: "demand",
    what: "Total native value transferred per day — measures economic throughput on-chain.",
    readingGuide: {
      30: "Short value spikes often reflect large single transactions. Compare to tx_count: if tx_count is flat but value spikes, a few large actors are responsible.",
      90: "A rising MA30 in value transferred alongside rising tx_count is the strongest demand combination.",
      180: "Six-month value throughput trends are meaningful macro demand indicators.",
      365: "Year-scale value throughput captures full demand cycles.",
    },
  },
};

function getMetricContext(metric: string, windowDays: number) {
  const ctx = METRIC_CONTEXT[metric];
  if (!ctx) return null;
  const w = ([30, 90, 180, 365] as WindowDays[]).includes(windowDays as WindowDays)
    ? (windowDays as WindowDays) : null;
  const guide = (w ? ctx.readingGuide[w] : undefined) ?? null;
  return { what: ctx.what, guide, axis: ctx.axis };
}

const AXIS_LABELS: Record<string, string> = {
  demand: "Demand",
  friction: "Friction",
  capacity: "Capacity",
  context: "Context",
};

// ── Tooltip ───────────────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label, unitLabel }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
  unitLabel?: string;
}) {
  if (!active || !payload?.length) return null;
  const names: Record<string, string> = {
    value: "Daily (raw)",
    ma7: "MA7 — 7-day avg",
    ma30: "MA30 — 30-day avg",
  };
  return (
    <div style={{
      background: C.surface2, border: `1px solid ${C.line2}`,
      borderRadius: "5px", padding: "10px 14px",
      fontFamily: "var(--mono, ui-monospace)", fontSize: "11px",
    }}>
      <div style={{ color: C.ink, marginBottom: "6px", fontWeight: 500 }}>{label}</div>
      {payload.map((entry) => (
        <div key={entry.name} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "2px 0" }}>
          <span style={{ display: "inline-block", width: "12px", height: "2px", backgroundColor: entry.color, flexShrink: 0 }} />
          <span style={{ color: C.ink2 }}>{names[entry.name] ?? entry.name}:</span>
          <span style={{ color: C.ink, fontWeight: 500 }}>
            {fmtNumber(entry.value)}{unitLabel ? ` ${unitLabel}` : ""}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Legend ────────────────────────────────────────────────────────────────────

function ChartLegend({ showValue, showMA7, showMA30 }: {
  showValue: boolean; showMA7: boolean; showMA30: boolean;
}) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", fontFamily: "var(--mono, ui-monospace)", fontSize: "10px", color: C.ink2 }}>
      {showValue && (
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <svg width="28" height="10"><line x1="0" y1="5" x2="28" y2="5" stroke={C.chartRaw} strokeWidth="1.8" strokeOpacity="0.95" /></svg>
          <span>Daily raw value</span>
        </div>
      )}
      {showMA7 && (
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <svg width="28" height="10"><line x1="0" y1="5" x2="28" y2="5" stroke={C.chartMA7} strokeWidth="3" /></svg>
          <span>MA7 — 7-day moving average</span>
        </div>
      )}
      {showMA30 && (
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <svg width="28" height="10">
            <line x1="0" y1="5" x2="8" y2="5" stroke={C.chartMA30} strokeWidth="3" />
            <line x1="13" y1="5" x2="21" y2="5" stroke={C.chartMA30} strokeWidth="3" />
          </svg>
          <span>MA30 — 30-day trend baseline</span>
        </div>
      )}
    </div>
  );
}

// ── Trend summary ─────────────────────────────────────────────────────────────

function useTrendSummary(data: MetricPoint[]) {
  return useMemo(() => {
    const last = [...data].reverse().find(
      (p) => typeof p.ma7 === "number" && typeof p.ma30 === "number"
    );
    if (!last || last.ma7 == null || last.ma30 == null) return null;
    const diff = last.ma7 - last.ma30;
    const pct = last.ma30 !== 0 ? (diff / Math.abs(last.ma30)) * 100 : 0;
    const abs = Math.abs(pct);
    if (abs < 1) return { label: "MA7 ≈ MA30", direction: "flat" as const, abs };
    if (diff > 0) return { label: `MA7 +${abs.toFixed(1)}% above MA30`, direction: "up" as const, abs };
    return { label: `MA7 −${abs.toFixed(1)}% below MA30`, direction: "down" as const, abs };
  }, [data]);
}

// ── Main component ────────────────────────────────────────────────────────────

export default function MetricLineChart(props: {
  title: string;
  subtitle?: string;
  data: MetricPoint[];
  height?: number;
  unitLabel?: string;
  windowDays?: number;
}) {
  const { title, subtitle, data, height = 240, unitLabel, windowDays = 90 } = props;

  const showValue = hasAnySeries(data, "value");
  const showMA7   = hasAnySeries(data, "ma7");
  const showMA30  = hasAnySeries(data, "ma30");

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [chartWidth, setChartWidth] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const w = clampChartWidth(el.clientWidth);
      setChartWidth((p) => (p === w ? p : w));
    };
    update();
    const obs = typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;
    obs?.observe(el);
    window.addEventListener("resize", update);
    return () => { obs?.disconnect(); window.removeEventListener("resize", update); };
  }, []);

  const chartData = useMemo(() => data, [data]);
  const ctx = useMemo(() => getMetricContext(title, windowDays), [title, windowDays]);
  const trend = useTrendSummary(data);

  const trendColor = trend?.direction === "up"
    ? "var(--c-stable, #10B981)"
    : trend?.direction === "down"
      ? "var(--c-congested, #9E4040)"
      : C.ink2;

  return (
    <div style={{
      background: C.surface2, border: `1px solid ${C.line2}`,
      borderTop: `1px solid rgba(196,146,48,.20)`,
      borderRadius: "5px", overflow: "hidden",
      display: "flex", flexDirection: "column", gap: "0",
    }}>

      {/* ── Header ── */}
      <div style={{ padding: "16px 18px", borderBottom: `1px solid ${C.line2}`, display: "flex", flexWrap: "wrap", alignItems: "start", justifyContent: "space-between", gap: "12px" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
            <span style={{ fontFamily: "var(--mono, ui-monospace)", fontSize: "12px", color: C.ink, fontWeight: 500 }}>{title}</span>
            {ctx && (
              <span style={{
                fontFamily: "var(--mono, ui-monospace)", fontSize: "9px", letterSpacing: ".1em",
                textTransform: "uppercase", color: C.gold,
                borderBottom: `1px solid rgba(196,146,48,.30)`, paddingBottom: "1px",
              }}>
                {AXIS_LABELS[ctx.axis]}
              </span>
            )}
          </div>
          {ctx && (
            <p style={{ fontSize: "12px", color: C.ink2, lineHeight: 1.6, margin: 0 }}>{ctx.what}</p>
          )}
          {unitLabel && (
            <span style={{ fontFamily: "var(--mono, ui-monospace)", fontSize: "11px", color: C.ink3, fontWeight: 500, display: "block", marginTop: "4px" }}>Units: {unitLabel}</span>
          )}
        </div>

        {trend && (
          <div style={{
            background: "rgba(8,15,26,.6)", border: `1px solid ${C.line2}`,
            borderRadius: "3px", padding: "8px 12px", flexShrink: 0, textAlign: "right",
          }}>
            <div style={{ fontFamily: "var(--mono, ui-monospace)", fontSize: "9px", letterSpacing: ".12em", textTransform: "uppercase", color: C.ink3, marginBottom: "4px" }}>
              Current signal
            </div>
            <div style={{ fontFamily: "var(--mono, ui-monospace)", fontSize: "11px", fontWeight: 500, color: trendColor }}>{trend.label}</div>
          </div>
        )}
      </div>

      {/* ── Legend ── */}
      <div style={{ padding: "12px 18px", borderBottom: `1px solid ${C.line2}` }}>
        <ChartLegend showValue={showValue} showMA7={showMA7} showMA30={showMA30} />
      </div>

      {/* ── Chart ── */}
      <div ref={containerRef} style={{ width: "100%", minWidth: 0, overflow: "hidden", padding: "8px", height, minHeight: height, background: "transparent" }}>
        {chartWidth > 0 ? (
          <LineChart width={chartWidth} height={height} data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.chartGrid} strokeOpacity={0.8} />
            <XAxis
              dataKey="date"
              tickFormatter={fmtDateShort}
              minTickGap={22}
              tick={{ fontSize: 11, fill: C.ink3, fontFamily: "var(--mono, ui-monospace)" }}
            />
            <YAxis
              tickFormatter={fmtNumber}
              width={72}
              tick={{ fontSize: 11, fill: C.ink3, fontFamily: "var(--mono, ui-monospace)" }}
            />
            <Tooltip
              content={(p) => (
                <CustomTooltip
                  active={p.active}
                  payload={p.payload as unknown as Array<{ name: string; value: number; color: string }>}
                  label={typeof p.label === "string" ? p.label : String(p.label ?? "")}
                  unitLabel={unitLabel}
                />
              )}
              isAnimationActive={false}
            />
            {showValue && (
              <Line type="monotone" dataKey="value" dot={false} isAnimationActive={false}
                stroke={C.chartRaw} strokeWidth={1.75} strokeOpacity={0.95} />
            )}
            {showMA7 && (
              <Line type="monotone" dataKey="ma7" dot={false} isAnimationActive={false}
                stroke={C.chartMA7} strokeWidth={2.75} />
            )}
            {showMA30 && (
              <Line type="monotone" dataKey="ma30" dot={false} isAnimationActive={false}
                stroke={C.chartMA30} strokeWidth={3} strokeDasharray="7 3" />
            )}
          </LineChart>
        ) : (
          <div style={{ display: "flex", height: "100%", width: "100%", alignItems: "center", justifyContent: "center", color: C.ink3, fontFamily: "var(--mono, ui-monospace)", fontSize: "11px" }}>
            Preparing chart…
          </div>
        )}
      </div>

      {/* ── Reading guide ── */}
      {ctx?.guide && (
        <div style={{ borderTop: `1px solid ${C.line2}`, padding: "14px 18px" }}>
          <span style={{ fontFamily: "var(--mono, ui-monospace)", fontSize: "11px", color: C.gold, fontWeight: 500 }}>
            Reading this at {windowDays}d:&nbsp;
          </span>
          <span style={{ fontFamily: "var(--mono, ui-monospace)", fontSize: "11px", color: C.ink2 }}>{ctx.guide}</span>
        </div>
      )}

      {/* ── Footnote ── */}
      {subtitle && (
        <div style={{ borderTop: `1px solid ${C.line2}`, padding: "10px 18px", fontFamily: "var(--mono, ui-monospace)", fontSize: "10px", color: C.ink3, lineHeight: 1.6 }}>
          {subtitle}
        </div>
      )}
    </div>
  );
}
