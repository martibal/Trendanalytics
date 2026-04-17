"use client";

import { useMemo, useState } from "react";
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
  return rows.map((r) => ({
    date: r.date,
    dateShort: shortDate(r.date),
    regimeValue: REGIME_VALUES[r.label ?? ""] ?? 0,
    confidence: typeof r.confidence === "number" ? r.confidence : 0,
    label: r.label,
    oneLiner: r.oneLiner,
    color: REGIME_COLORS[r.label ?? ""] ?? REGIME_COLORS["UNKNOWN/DEGRADED"],
  }));
}

function RegimeChart({
  rows,
  chainColor,
  selected,
  onSelect,
}: {
  rows: ChartRow[];
  chainColor: string;
  selected: ChartRow | null;
  onSelect: (r: ChartRow) => void;
}) {
  const n = rows.length;
  const slotW = Math.max(18, Math.min(34, 520 / Math.max(n, 1)));
  const W_LABEL = 40;
  const H = 118;
  const PAD_TOP = 6;
  const PAD_BOTTOM = 12;
  const innerH = H - PAD_TOP - PAD_BOTTOM;
  const VW = W_LABEL + n * slotW;
  const VH = H;

  const xOf = (i: number) => W_LABEL + i * slotW + slotW / 2;
  const yOf = (v: number) => PAD_TOP + ((4 - v) / 4) * innerH;

  const stepPath = rows
    .map((r, i) => {
      const x = xOf(i);
      const y = yOf(r.regimeValue);
      if (i === 0) return `M ${x} ${y}`;
      const prevX = xOf(i) - slotW;
      return `L ${prevX + slotW} ${yOf(rows[i - 1]!.regimeValue)} L ${prevX + slotW} ${y}`;
    })
    .join(" ");

  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} width="100%" height="118" preserveAspectRatio="none" style={{ display: "block" }}>
      <defs>
        <linearGradient id="rgGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={chainColor} stopOpacity="0.22" />
          <stop offset="100%" stopColor={chainColor} stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {[0, 1, 2, 3, 4].map((v) => {
        const y = yOf(v);
        const label = REGIME_VALUE_LABELS[v];
        const c = REGIME_COLORS[label === "UNK" ? "UNKNOWN/DEGRADED" : label] ?? "#6B7280";
        return (
          <g key={v}>
            <line x1={W_LABEL} x2={VW} y1={y} y2={y} stroke="rgba(255,255,255,0.06)" />
            <text x={2} y={y + 3} fill={c} fontSize={7} fontWeight="bold">{label}</text>
          </g>
        );
      })}

      <path d={stepPath} fill="none" stroke={chainColor} strokeWidth={2.2} />

      {rows.map((r, i) => {
        const x = xOf(i);
        const y = yOf(r.regimeValue);
        const isSelected = selected?.date === r.date;
        return (
          <g key={r.date}>
            <circle cx={x} cy={y} r={isSelected ? 4.4 : 3.2} fill={r.color} stroke="#0A0E1A" strokeWidth={isSelected ? 1.8 : 1.2} />
            <rect x={W_LABEL + i * slotW} y={0} width={slotW} height={VH} fill="transparent" style={{ cursor: "pointer" }} onClick={() => onSelect(r)} />
            {n <= 22 || i % Math.ceil(n / 6) === 0 ? (
              <text x={x} y={VH - 1} textAnchor="middle" fill="#64748b" fontSize={7}>{r.dateShort}</text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}

function ConfidenceChart({
  rows,
  selected,
  onSelect,
}: {
  rows: ChartRow[];
  selected: ChartRow | null;
  onSelect: (r: ChartRow) => void;
}) {
  const n = rows.length;
  const slotW = Math.max(18, Math.min(34, 520 / Math.max(n, 1)));
  const W_LABEL = 24;
  const H = 86;
  const PAD_TOP = 6;
  const PAD_BOTTOM = 12;
  const innerH = H - PAD_TOP - PAD_BOTTOM;
  const VW = W_LABEL + n * slotW;
  const VH = H;

  const xOf = (i: number) => W_LABEL + i * slotW + slotW / 2;
  const yOf = (v: number) => PAD_TOP + innerH - Math.max(0, Math.min(1, v)) * innerH;

  const linePath = rows
    .map((r, i) => `${i === 0 ? "M" : "L"} ${xOf(i)} ${yOf(r.confidence)}`)
    .join(" ");
  const fillD = `${linePath} L ${xOf(n - 1)} ${VH - PAD_BOTTOM} L ${xOf(0)} ${VH - PAD_BOTTOM} Z`;
  const gateY = yOf(0.4);

  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} width="100%" height="86" preserveAspectRatio="none" style={{ display: "block" }}>
      <defs>
        <linearGradient id="cfGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.03" />
        </linearGradient>
      </defs>

      {[0, 0.4, 1].map((v) => {
        const y = yOf(v);
        return <line key={v} x1={W_LABEL} x2={VW} y1={y} y2={y} stroke={v === 0.4 ? "rgba(255,80,80,0.35)" : "rgba(255,255,255,0.06)"} strokeDasharray={v === 0.4 ? "4 3" : undefined} />;
      })}
      <text x={2} y={yOf(1) + 3} fill="#64748b" fontSize={7}>1.0</text>
      <text x={2} y={gateY - 2} fill="rgba(255,80,80,0.5)" fontSize={7}>0.40</text>
      <text x={2} y={yOf(0) - 2} fill="#64748b" fontSize={7}>0.0</text>

      <path d={fillD} fill="url(#cfGrad)" />
      <path d={linePath} fill="none" stroke="#22d3ee" strokeWidth={1.8} />

      {rows.map((r, i) => {
        const x = xOf(i);
        const y = yOf(r.confidence);
        const isSelected = selected?.date === r.date;
        return (
          <g key={r.date}>
            <circle cx={x} cy={y} r={isSelected ? 3.8 : 2.8} fill="#22d3ee" stroke="#0A0E1A" strokeWidth={1.2} />
            <rect x={W_LABEL + i * slotW} y={0} width={slotW} height={VH} fill="transparent" style={{ cursor: "pointer" }} onClick={() => onSelect(r)} />
          </g>
        );
      })}
    </svg>
  );
}

export default function MobileChainChart({ rows, chainColor }: { rows: HistoryRow[]; chainColor: string }) {
  const chartRows = useMemo(() => toChartRows(rows), [rows]);
  const [selected, setSelected] = useState<ChartRow | null>(chartRows[chartRows.length - 1] ?? null);

  if (chartRows.length === 0) {
    return (
      <div className="flex h-36 items-center justify-center rounded-xl border border-dashed border-white/10 text-[11px] text-slate-600">
        No history available for this chart yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {selected ? (
        <div className="rounded-xl px-3 py-2.5 text-[11px]" style={{ backgroundColor: `${selected.color}18`, border: `1px solid ${selected.color}33` }}>
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-400">{selected.date}</span>
            <span className="font-black" style={{ color: selected.color }}>{selected.label ?? "—"}</span>
            <span className="text-slate-400">{selected.confidence.toFixed(3)}</span>
          </div>
          {selected.oneLiner ? <div className="mt-1 text-[10px] leading-[1.5] text-slate-500">{selected.oneLiner}</div> : null}
        </div>
      ) : null}

      <div className="text-[10px] text-slate-600">Tap any point to inspect that day</div>

      <div className="overflow-hidden rounded-xl border border-white/8 bg-black/15 p-2">
        <div className="mb-1 text-[9px] font-black uppercase tracking-[0.2em] text-slate-600">Regime</div>
        <div className="overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div style={{ minWidth: `${Math.max(320, chartRows.length * 18 + 52)}px` }}>
            <RegimeChart rows={chartRows} chainColor={chainColor} selected={selected} onSelect={setSelected} />
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-white/8 bg-black/15 p-2">
        <div className="mb-1 text-[9px] font-black uppercase tracking-[0.2em] text-slate-600">Confidence — 0.40 = publish gate</div>
        <div className="overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div style={{ minWidth: `${Math.max(320, chartRows.length * 18 + 32)}px` }}>
            <ConfidenceChart rows={chartRows} selected={selected} onSelect={setSelected} />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {(["CONGESTED", "HEATING", "STABLE", "CHEAP"] as const).map((label) => (
          <span key={label} className="flex items-center gap-1 text-[10px] text-slate-500">
            <span className="h-1.5 w-3 rounded-full" style={{ backgroundColor: REGIME_COLORS[label] }} />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
