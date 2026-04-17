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

const REGIME_LABEL_MAP: Record<number, string> = {
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
  return [...rows].reverse().map((r) => ({
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
  const VH = 180;
  const VW = 320;
  const W_LABEL = 54;
  const PAD_TOP = 10;
  const PAD_BOT = 22;
  const innerH = VH - PAD_TOP - PAD_BOT;
  const innerW = VW - W_LABEL;

  const n = rows.length;
  const slotW = innerW / n;
  const xOf = (i: number) => W_LABEL + i * slotW;
  const yOf = (v: number) => PAD_TOP + innerH - (v / 4) * innerH;

  // Step fill path
  let fillD = "";
  let linePath = "";
  rows.forEach((r, i) => {
    const x1 = xOf(i);
    const x2 = xOf(i + 1);
    const y = yOf(r.regimeValue);
    if (i === 0) {
      fillD += `M ${x1} ${y}`;
      linePath += `M ${x1} ${y}`;
    } else {
      fillD += ` L ${x1} ${y}`;
      linePath += ` L ${x1} ${y}`;
    }
    fillD += ` L ${x2} ${y}`;
    linePath += ` L ${x2} ${y}`;
  });
  fillD += ` L ${VW} ${PAD_TOP + innerH} L ${W_LABEL} ${PAD_TOP + innerH} Z`;

  const step = Math.max(1, Math.floor(n / 5));
  const xLabels = rows.filter((_, i) => i === 0 || i % step === 0 || i === n - 1);

  return (
    <svg
      viewBox={`0 0 ${VW} ${VH}`}
      width="100%"
      style={{ display: "block", overflow: "visible" }}
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="rgGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={chainColor} stopOpacity="0.22" />
          <stop offset="100%" stopColor={chainColor} stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {/* Grid */}
      {[0, 1, 2, 3, 4].map((v) => (
        <line key={v} x1={W_LABEL} x2={VW} y1={yOf(v)} y2={yOf(v)}
          stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
      ))}

      {/* Neutral (STABLE) emphasis */}
      <line x1={W_LABEL} x2={VW} y1={yOf(2)} y2={yOf(2)}
        stroke="rgba(255,255,255,0.12)" strokeDasharray="4 4" />

      {/* Y labels */}
      {[4, 3, 2, 1, 0].map((v) => {
        const lbl = REGIME_LABEL_MAP[v] ?? "UNK";
        const col = REGIME_COLORS[lbl === "UNK" ? "UNKNOWN/DEGRADED" : lbl] ?? "#6B7280";
        return (
          <text key={v} x={2} y={yOf(v) + 4} fill={col} fontSize={8}
            fontWeight="bold" fontFamily="monospace">
            {lbl.slice(0, 5)}
          </text>
        );
      })}

      {/* Fill */}
      <path d={fillD} fill="url(#rgGrad)" />

      {/* Line */}
      <path d={linePath} fill="none" stroke={chainColor} strokeWidth={2.5} />

      {/* X labels */}
      {xLabels.map((r) => {
        const i = rows.indexOf(r);
        const cx = xOf(i) + slotW / 2;
        return (
          <text key={r.date} x={cx} y={VH - 5} textAnchor="middle"
            fill="#475569" fontSize={9}>
            {r.dateShort}
          </text>
        );
      })}

      {/* Selected dot */}
      {selected && (() => {
        const idx = rows.findIndex((r) => r.date === selected.date);
        if (idx < 0) return null;
        const cx = xOf(idx) + slotW / 2;
        const cy = yOf(selected.regimeValue);
        return <circle cx={cx} cy={cy} r={5} fill={selected.color}
          stroke="#0A0E1A" strokeWidth={2} />;
      })()}

      {/* Tap targets */}
      {rows.map((r, i) => (
        <rect key={r.date} x={xOf(i)} y={PAD_TOP} width={slotW} height={innerH}
          fill="transparent" style={{ cursor: "pointer" }}
          onClick={() => onSelect(r)} />
      ))}
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
  const VH = 72;
  const VW = 320;
  const W_LABEL = 28;
  const PAD_TOP = 8;
  const PAD_BOT = 4;
  const innerH = VH - PAD_TOP - PAD_BOT;
  const innerW = VW - W_LABEL;

  const n = rows.length;
  if (n < 2) return null;

  const slotW = innerW / n;
  const xOf = (i: number) => W_LABEL + i * slotW + slotW / 2;
  const yOf = (v: number) => PAD_TOP + innerH - v * innerH;

  const points = rows.map((r, i) => `${xOf(i)},${yOf(r.confidence)}`).join(" ");
  const fillD =
    `M ${xOf(0)} ${yOf(rows[0]!.confidence)} ` +
    rows.slice(1).map((r, i) => `L ${xOf(i + 1)} ${yOf(r.confidence)}`).join(" ") +
    ` L ${xOf(n - 1)} ${VH} L ${xOf(0)} ${VH} Z`;

  const gateY = yOf(0.4);

  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} width="100%"
      style={{ display: "block" }} preserveAspectRatio="none">
      <defs>
        <linearGradient id="cfGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {/* Gate line */}
      <line x1={W_LABEL} x2={VW} y1={gateY} y2={gateY}
        stroke="rgba(255,80,80,0.4)" strokeDasharray="4 3" strokeWidth={1} />
      <text x={W_LABEL + 2} y={gateY - 2} fill="rgba(255,80,80,0.5)" fontSize={7}>
        0.40
      </text>

      <path d={fillD} fill="url(#cfGrad)" />
      <polyline points={points} fill="none" stroke="#22d3ee" strokeWidth={1.8} />

      {selected && (() => {
        const idx = rows.findIndex((r) => r.date === selected.date);
        if (idx < 0) return null;
        return <circle cx={xOf(idx)} cy={yOf(selected.confidence)} r={3.5}
          fill="#22d3ee" stroke="#0A0E1A" strokeWidth={1.5} />;
      })()}

      {rows.map((r, i) => (
        <rect key={r.date} x={W_LABEL + i * slotW} y={0} width={slotW} height={VH}
          fill="transparent" style={{ cursor: "pointer" }}
          onClick={() => onSelect(r)} />
      ))}
    </svg>
  );
}

export default function MobileChainChart({
  rows,
  chainColor,
}: {
  rows: HistoryRow[];
  chainColor: string;
}) {
  const chartRows = useMemo(() => toChartRows(rows), [rows]);
  const [selected, setSelected] = useState<ChartRow | null>(null);

  if (chartRows.length === 0) {
    return (
      <div className="flex h-36 items-center justify-center text-[11px] text-slate-600">
        No history available
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Selected callout */}
      {selected ? (
        <div className="rounded-xl px-3 py-2.5 text-[11px]"
          style={{ backgroundColor: selected.color + "18", border: `1px solid ${selected.color}33` }}>
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-400">{selected.date}</span>
            <span className="font-black" style={{ color: selected.color }}>{selected.label ?? "—"}</span>
            <span className="text-slate-400">{selected.confidence.toFixed(3)}</span>
          </div>
          {selected.oneLiner && (
            <div className="mt-1 text-[10px] leading-[1.5] text-slate-500">{selected.oneLiner}</div>
          )}
        </div>
      ) : (
        <div className="text-[10px] text-slate-600">Tap any point to inspect that day</div>
      )}

      {/* Regime */}
      <div className="overflow-hidden rounded-xl border border-white/8 bg-black/15 p-2">
        <div className="mb-1 text-[9px] font-black uppercase tracking-[0.2em] text-slate-600">Regime</div>
        <RegimeChart rows={chartRows} chainColor={chainColor} selected={selected} onSelect={setSelected} />
      </div>

      {/* Confidence */}
      <div className="overflow-hidden rounded-xl border border-white/8 bg-black/15 p-2">
        <div className="mb-1 text-[9px] font-black uppercase tracking-[0.2em] text-slate-600">
          Confidence — 0.40 = publish gate
        </div>
        <ConfidenceChart rows={chartRows} selected={selected} onSelect={setSelected} />
      </div>

      {/* Legend */}
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
