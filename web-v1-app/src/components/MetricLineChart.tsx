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
import { cx, urd } from "@/components/site/UrdDesignSystem";

export type MetricPoint = {
  date: string; // YYYY-MM-DD
  value?: number | null; // raw/level (gold)
  ma7?: number | null;
  ma30?: number | null;
};

// ─── Number formatting ────────────────────────────────────────────────────────

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

// ─── Contextual interpretation ────────────────────────────────────────────────

type WindowDays = 30 | 90 | 180 | 365;

const METRIC_CONTEXT: Record<
  string,
  {
    axis: "demand" | "friction" | "capacity" | "context";
    what: string;
    readingGuide: Partial<Record<WindowDays, string>>;
  }
> = {
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
      90: "A MA30 that is trending upward over 90 days means fee pressure is structural, not episodic. Cross-reference with tx_count: fees rising alongside rising demand is a textbook congestion build-up. Fees rising with flat demand is unusual and may indicate other factors.",
      180: "Fee regimes persist. A MA30 uptrend over 6 months in fees, alongside sustained demand growth, is the classic CONGESTED regime pattern. A MA30 downtrend in fees with flat or falling demand is the CHEAP regime pattern.",
      365: "Year-scale fee MA30 gives you the full regime context. Where the current MA30 sits relative to the 365-day range visible in this chart tells you whether fees are historically low, mid-range, or elevated — essential context for any regime label.",
    },
  },
  avg_block_time_sec: {
    axis: "capacity",
    what: "Average time between blocks in seconds — measures chain pacing and throughput capacity.",
    readingGuide: {
      30: "Bitcoin targets ~600 seconds per block. Deviations within ±5% are normal. A persistent trend above 600s over 30 days suggests hash rate decline; below 600s suggests hash rate growth. Both will trigger a difficulty adjustment.",
      90: "At 90 days you can see Bitcoin difficulty adjustment cycles playing out — the MA7 oscillates around the MA30 roughly every two weeks. A MA30 that is clearly below 600s means hash rate has been growing structurally.",
      180: "Sustained compression of block time (MA30 trending down) over 6 months means capacity is genuinely expanding. The model uses this as the capacity proxy for Bitcoin. Declining block time with stable or rising fees means even expanding capacity is not keeping up with demand.",
      365: "Year-scale block time is a direct hash rate proxy. A year of declining MA30 is a major capacity expansion signal. Compare to fee trends: growing capacity but still rising fees means demand growth is outpacing supply.",
    },
  },
  value_transferred_native: {
    axis: "demand",
    what: "Total native value transferred per day — measures economic throughput on-chain.",
    readingGuide: {
      30: "Short value spikes often reflect large single transactions or exchange movements, not broad demand. Compare to tx_count: if tx_count is flat but value spikes, a few large actors are responsible. If both spike together, it is broad demand.",
      90: "A rising MA30 in value transferred alongside rising tx_count is the strongest demand combination. If only value is rising but tx_count is flat, it may reflect whale or custodial activity, not network-wide demand growth.",
      180: "Six-month value throughput trends are meaningful macro demand indicators. Structural MA30 growth alongside rising tx_count typically precedes or confirms a HEATING or elevated demand regime label in the model.",
      365: "Year-scale value throughput captures full demand cycles. The current MA30 position relative to the 365-day range in this chart is direct historical context for the regime label: near the year's high means demand is elevated; near the low means demand is subdued.",
    },
  },
  gas_utilization_pct: {
    axis: "capacity",
    what: "Average block gas utilization as a 0–1 fraction — how full EVM blocks are on average.",
    readingGuide: {
      30: "Values persistently above 0.90 over 30 days mean blocks are almost always full — a CONGESTED signal. Values near 0.50 are balanced. Sustained readings below 0.30 suggest demand is well within available capacity.",
      90: "The MA30 at 90 days is the most reliable congestion indicator. A MA30 anchored near 0.90+ is the clearest congestion signal in the entire model. Watch for MA7 and MA30 both converging near that ceiling.",
      180: "At 6 months, gas utilization reveals how demand cycles track against block capacity. A MA30 that spent most of 6 months above 0.80 is a persistent congestion regime, not a short-term event.",
      365: "Year-scale gas utilization shows the full demand-versus-capacity story. Periods where MA30 stays near 0.90 are historically associated with high fees and failed transactions. Periods near 0.40–0.60 are structurally cheap for users.",
    },
  },
  failed_tx_rate: {
    axis: "friction",
    what: "Share of transactions that failed — an EVM-specific friction and congestion indicator.",
    readingGuide: {
      30: "Elevated failed rate at 30 days can reflect smart contract competition, MEV activity, or users submitting with insufficient gas. A spike that reverts to MA30 within a week is usually episodic. Sustained elevation is worth flagging.",
      90: "A MA30 failed rate that is persistently elevated over 90 days is a genuine friction signal. Cross-reference with gas_utilization: both high together confirms that block space scarcity is the cause of failures.",
      180: "Structural elevation of the failed rate MA30 over 6 months, combined with high gas utilization and rising fees, is one of the clearest CONGESTED regime confirmations. All three pointing up together is a strong signal.",
      365: "Year-scale failed rate gives historical context. If the current MA30 is near the 365-day low, the chain is operating cleanly. Near the 365-day high indicates the network is under genuine friction stress relative to its own history.",
    },
  },
  unique_active_addresses: {
    axis: "demand",
    what: "Unique addresses active per day — measures the breadth of network participation.",
    readingGuide: {
      30: "Sudden surges in active addresses often reflect protocol events, airdrops, or speculative activity. A sustained MA7 rise above MA30 that holds for two weeks or more is a more credible demand-broadening signal.",
      90: "A rising MA30 in active addresses over 90 days indicates genuine network growth. Compare to tx_count: if both rise together, demand is broad-based. If addresses rise but tx_count is flat, the average activity per address may be falling.",
      180: "Six-month address trends reveal adoption cycles. Structural MA30 growth across 6 months is a durable demand indicator. A structural MA30 decline alongside falling tx_count confirms a demand contraction regime.",
      365: "Year-scale active address trends are among the best regime context signals. Where the current MA30 sits relative to the 365-day range in this chart shows where the chain is in its demand cycle — near the top means elevated participation, near the bottom means subdued.",
    },
  },
  median_tx_value_native: {
    axis: "context",
    what: "Median transaction value in native units — characterizes the typical size of on-chain activity.",
    readingGuide: {
      30: "Short-term spikes in median value often reflect large transactions skewing the distribution. If MA7 spikes but MA30 is flat, the event was isolated. A rising median value alongside flat tx_count means fewer, larger transactions dominating.",
      90: "Rising median value with flat tx_count typically means large-actor or institutional dominance. Rising tx_count with flat or falling median value suggests retail or broad demand — a very different regime character.",
      180: "Six-month median value trends help characterize who is using the chain. High-value low-count activity and high-count low-value activity produce different congestion and fee dynamics, even at similar total throughput.",
      365: "Year-scale median value is a structural characterization tool. Its current MA30 position in the 365-day range contextualizes whether current activity is representative of the chain's typical usage pattern or an anomaly.",
    },
  },
};

function getMetricContext(metric: string, windowDays: number) {
  const ctx = METRIC_CONTEXT[metric];
  if (!ctx) return null;
  const w = ([30, 90, 180, 365] as WindowDays[]).includes(windowDays as WindowDays)
    ? (windowDays as WindowDays)
    : null;
  const guide = (w ? ctx.readingGuide[w] : undefined) ?? null;
  return { what: ctx.what, guide, axis: ctx.axis };
}

const AXIS_LABELS: Record<string, string> = {
  demand: "Demand",
  friction: "Friction",
  capacity: "Capacity",
  context: "Context",
};

// ─── Custom tooltip ───────────────────────────────────────────────────────────

function CustomTooltip({
  active,
  payload,
  label,
  unitLabel,
}: {
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
    <div className="rounded-lg border border-[var(--urd-border)] bg-[var(--urd-raised)] px-3 py-2 text-xs text-[var(--urd-text)] shadow-lg">
      <div className="mb-1.5 font-black text-[var(--urd-text-strong)]">{label}</div>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2 py-0.5">
          <span
            className="inline-block h-2 w-3 rounded-sm flex-shrink-0"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-[var(--urd-text-body)]">{names[entry.name] ?? entry.name}:</span>
          <span className="font-black text-[var(--urd-text-strong)]">
            {fmtNumber(entry.value)}{unitLabel ? ` ${unitLabel}` : ""}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Legend ───────────────────────────────────────────────────────────────────

function ChartLegend({
  showValue,
  showMA7,
  showMA30,
}: {
  showValue: boolean;
  showMA7: boolean;
  showMA30: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs font-black text-[var(--urd-text-strong)]">
      {showValue && (
        <div className="flex items-center gap-2">
          <svg width="28" height="10" className="flex-shrink-0">
            <line x1="0" y1="5" x2="28" y2="5" stroke={urd.color.chartRaw} strokeWidth="1.8" strokeOpacity="0.95" />
          </svg>
          <span>Daily raw value</span>
        </div>
      )}
      {showMA7 && (
        <div className="flex items-center gap-2">
          <svg width="28" height="10" className="flex-shrink-0">
            <line x1="0" y1="5" x2="28" y2="5" stroke={urd.color.chartMA7} strokeWidth="3" />
          </svg>
          <span>MA7 — 7-day moving average</span>
        </div>
      )}
      {showMA30 && (
        <div className="flex items-center gap-2">
          <svg width="28" height="10" className="flex-shrink-0">
            <line x1="0" y1="5" x2="8" y2="5" stroke={urd.color.chartMA30} strokeWidth="3" />
            <line x1="13" y1="5" x2="21" y2="5" stroke={urd.color.chartMA30} strokeWidth="3" />
          </svg>
          <span>MA30 — 30-day trend baseline</span>
        </div>
      )}
    </div>
  );
}

// ─── MA7 vs MA30 live summary ─────────────────────────────────────────────────

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

// ─── Main component ───────────────────────────────────────────────────────────

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
    const obs = typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(update)
      : null;
    obs?.observe(el);
    window.addEventListener("resize", update);
    return () => { obs?.disconnect(); window.removeEventListener("resize", update); };
  }, []);

  const chartData = useMemo(() => data, [data]);
  const ctx = useMemo(() => getMetricContext(title, windowDays), [title, windowDays]);
  const trend = useTrendSummary(data);

  const trendColor =
    trend?.direction === "up"
      ? "text-emerald-800"
      : trend?.direction === "down"
        ? "text-red-800"
        : "text-[var(--urd-text-muted)]";

  return (
    <div className={cx(urd.chartCard, "flex flex-col gap-4")}>

      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-black text-[var(--urd-text-strong)]">{title}</span>
            {ctx && (
              <span className="rounded-full border border-[var(--urd-border)] bg-[var(--urd-raised)] px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-[var(--urd-text-strong)] flex-shrink-0">
                {AXIS_LABELS[ctx.axis]}
              </span>
            )}
          </div>
          {ctx && (
            <p className="text-xs font-medium text-[var(--urd-text-body)] leading-relaxed">{ctx.what}</p>
          )}
          {unitLabel && (
            <span className="text-xs font-medium text-[var(--urd-text-muted)]">Units: {unitLabel}</span>
          )}
        </div>

        {/* MA7 vs MA30 live readout */}
        {trend && (
          <div className="rounded-xl border border-[var(--urd-border)] bg-[var(--urd-raised)] px-3 py-2 text-xs flex-shrink-0 text-right">
            <div className="text-[10px] font-black uppercase tracking-wide text-[var(--urd-text-muted)] mb-0.5">
              Current signal
            </div>
            <div className={`font-medium ${trendColor}`}>{trend.label}</div>
          </div>
        )}
      </div>

      {/* ── Legend ── */}
      <ChartLegend showValue={showValue} showMA7={showMA7} showMA30={showMA30} />

      {/* ── Chart ── */}
      <div
        ref={containerRef}
        className={cx(urd.chartPanel, "w-full min-w-0 overflow-hidden p-2")}
        style={{ height, minHeight: height }}
      >
        {chartWidth > 0 ? (
          <LineChart width={chartWidth} height={height} data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke={urd.color.chartGrid} strokeOpacity={0.8} />
            <XAxis
              dataKey="date"
              tickFormatter={fmtDateShort}
              minTickGap={22}
              tick={{ fontSize: 11, fill: urd.color.inkStrong, fontWeight: 700 }}
            />
            <YAxis
              tickFormatter={fmtNumber}
              width={72}
              tick={{ fontSize: 11, fill: urd.color.inkStrong, fontWeight: 700 }}
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

            {/* Raw daily: thin, very low opacity — background context only */}
            {showValue && (
              <Line
                type="monotone"
                dataKey="value"
                dot={false}
                isAnimationActive={false}
                stroke={urd.color.chartRaw}
                strokeWidth={1.75}
                strokeOpacity={0.95}
              />
            )}

            {/* MA7: solid amber, medium weight — short-term momentum */}
            {showMA7 && (
              <Line
                type="monotone"
                dataKey="ma7"
                dot={false}
                isAnimationActive={false}
                stroke={urd.color.chartMA7}
                strokeWidth={2.75}
              />
            )}

            {/* MA30: dashed green, heavier — the regime baseline to watch */}
            {showMA30 && (
              <Line
                type="monotone"
                dataKey="ma30"
                dot={false}
                isAnimationActive={false}
                stroke={urd.color.chartMA30}
                strokeWidth={3}
                strokeDasharray="7 3"
              />
            )}
          </LineChart>
        ) : (
          <div
            className="flex h-full w-full items-center justify-center rounded-lg border border-dashed border-[var(--urd-border)] bg-[var(--urd-raised)] text-xs font-semibold text-[var(--urd-text-body)]"
            aria-live="polite"
          >
            Preparing chart…
          </div>
        )}
      </div>

      {/* ── Contextual reading guide ── */}
      {ctx?.guide && (
        <div className="rounded-xl border border-[var(--urd-border)] bg-[var(--urd-raised)] px-4 py-3 text-xs font-medium leading-relaxed text-[var(--urd-text-body)]">
          <span className="font-black text-[var(--urd-text-strong)]">
            Reading this at {windowDays}d:&nbsp;
          </span>
          {ctx.guide}
        </div>
      )}

      {/* ── Technical footnote ── */}
      {subtitle && (
        <div className="border-t border-[var(--urd-border)] pt-2 text-[10px] font-medium leading-relaxed text-[var(--urd-text-muted)]">
          {subtitle}
        </div>
      )}
    </div>
  );
}
