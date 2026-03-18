// src/components/charts/MetricTriLineChart.tsx
"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type TriSeriesPoint = {
  date: string; // YYYY-MM-DD
  daily: number | null;
  ma7: number | null;
  ma30: number | null;
};

type CleanPoint = {
  t: number; // UTC ms
  date: string;
  daily: number | null;
  ma7: number | null;
  ma30: number | null;
};

type Size = { w: number; h: number };

function isISODate(s: unknown): s is string {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function isoToUtcMs(iso: string): number | null {
  if (!isISODate(iso)) return null;
  const y = Number(iso.slice(0, 4));
  const m = Number(iso.slice(5, 7));
  const d = Number(iso.slice(8, 10));
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
  const ms = Date.UTC(y, m - 1, d);
  return Number.isFinite(ms) ? ms : null;
}

function numOrNull(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function fmtCompact(x: unknown) {
  if (x == null) return "—";
  const n = Number(x);
  if (!Number.isFinite(n)) return "—";
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  if (abs > 0 && abs < 1) return n.toFixed(6);
  return n.toFixed(2);
}

function fmtTickFromMs(ms: number) {
  if (!Number.isFinite(ms)) return "";
  const d = new Date(ms);
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${mm}-${dd}`;
}

function clampFinite(n: number) {
  return Number.isFinite(n) ? n : 0;
}

function niceDomain(min: number, max: number) {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return { min: 0, max: 1 };
  if (min === max) return { min: min - 1, max: max + 1 };
  const pad = (max - min) * 0.06;
  return { min: min - pad, max: max + pad };
}

function buildPath(
  pts: CleanPoint[],
  key: "daily" | "ma7" | "ma30",
  x: (t: number) => number,
  y: (v: number) => number
) {
  let d = "";
  let penDown = false;

  for (const p of pts) {
    const v = p[key];
    if (v === null || !Number.isFinite(v)) {
      penDown = false;
      continue;
    }
    const X = x(p.t);
    const Y = y(v);
    if (!Number.isFinite(X) || !Number.isFinite(Y)) {
      penDown = false;
      continue;
    }
    if (!penDown) {
      d += `M ${X.toFixed(2)} ${Y.toFixed(2)} `;
      penDown = true;
    } else {
      d += `L ${X.toFixed(2)} ${Y.toFixed(2)} `;
    }
  }

  return d.trim();
}

function findNearestIndexByT(pts: CleanPoint[], t: number) {
  let lo = 0;
  let hi = pts.length - 1;

  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (pts[mid].t < t) lo = mid + 1;
    else hi = mid;
  }

  const i = lo;
  if (i <= 0) return 0;
  if (i >= pts.length) return pts.length - 1;

  const a = pts[i - 1];
  const b = pts[i];
  return Math.abs(a.t - t) <= Math.abs(b.t - t) ? i - 1 : i;
}

export function MetricTriLineChart({ data, height = 160 }: { data: TriSeriesPoint[]; height?: number }) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState<Size>({ w: 0, h: height });

  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [hoverXY, setHoverXY] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    const update = () => {
      const r = el.getBoundingClientRect();
      const w = Math.floor(clampFinite(r.width));
      setSize({ w, h: height });
    };

    update();
    const ro = new ResizeObserver(() => update());
    ro.observe(el);
    return () => ro.disconnect();
  }, [height]);

  const clean = useMemo<CleanPoint[]>(() => {
    const src = Array.isArray(data) ? data : [];
    const out: CleanPoint[] = [];

    for (const row of src) {
      const date = (row as any)?.date;
      const t = isoToUtcMs(date);
      if (t === null) continue;

      const daily = numOrNull((row as any)?.daily);
      const ma7 = numOrNull((row as any)?.ma7);
      const ma30 = numOrNull((row as any)?.ma30);

      if (daily === null && ma7 === null && ma30 === null) continue;
      out.push({ t, date, daily, ma7, ma30 });
    }

    out.sort((a, b) => a.t - b.t);
    return out;
  }, [data]);

  const ready = size.w >= 180 && size.h >= 120 && clean.length >= 2;

  const { xMin, xMax, yMin, yMax } = useMemo(() => {
    if (!ready) return { xMin: 0, xMax: 1, yMin: 0, yMax: 1 };

    let xmin = Infinity;
    let xmax = -Infinity;
    let ymin = Infinity;
    let ymax = -Infinity;

    for (const p of clean) {
      xmin = Math.min(xmin, p.t);
      xmax = Math.max(xmax, p.t);

      for (const k of ["daily", "ma7", "ma30"] as const) {
        const v = p[k];
        if (v === null || !Number.isFinite(v)) continue;
        ymin = Math.min(ymin, v);
        ymax = Math.max(ymax, v);
      }
    }

    const yd = niceDomain(ymin, ymax);
    if (!Number.isFinite(xmin) || !Number.isFinite(xmax) || xmin === xmax) {
      return { xMin: 0, xMax: 1, yMin: yd.min, yMax: yd.max };
    }

    return { xMin: xmin, xMax: xmax, yMin: yd.min, yMax: yd.max };
  }, [ready, clean]);

  // Layout (keep existing geometry; only visuals are adjusted)
  const padL = 54;
  const padR = 12;
  const padT = 10;
  const padB = 26;

  const innerW = Math.max(1, size.w - padL - padR);
  const innerH = Math.max(1, size.h - padT - padB);

  const x = useCallback((t: number) => padL + ((t - xMin) / (xMax - xMin)) * innerW, [padL, xMin, xMax, innerW]);
  const y = useCallback((v: number) => padT + (1 - (v - yMin) / (yMax - yMin)) * innerH, [padT, yMin, yMax, innerH]);

  const pathDaily = ready ? buildPath(clean, "daily", x, y) : "";
  const pathMA7 = ready ? buildPath(clean, "ma7", x, y) : "";
  const pathMA30 = ready ? buildPath(clean, "ma30", x, y) : "";

  const xTicks = useMemo(() => {
    if (!ready) return [];
    const n = 5;
    const out: number[] = [];
    for (let i = 0; i < n; i++) out.push(xMin + ((xMax - xMin) * i) / (n - 1));
    return out;
  }, [ready, xMin, xMax]);

  const yTicks = useMemo(() => {
    if (!ready) return [];
    const n = 4;
    const out: number[] = [];
    for (let i = 0; i < n; i++) out.push(yMin + ((yMax - yMin) * i) / (n - 1));
    return out;
  }, [ready, yMin, yMax]);

  const hoveredPoint = useMemo(() => {
    if (!ready || hoverIdx === null) return null;
    const p = clean[hoverIdx];
    if (!p) return null;
    const X = x(p.t);
    return { p, X };
  }, [ready, hoverIdx, clean, x]);

  function onPointerMove(e: React.PointerEvent<SVGSVGElement>) {
    if (!ready) return;
    const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    const clampedX = Math.min(padL + innerW, Math.max(padL, px));
    const t = xMin + ((clampedX - padL) / innerW) * (xMax - xMin);

    const idx = findNearestIndexByT(clean, t);
    setHoverIdx(idx);
    setHoverXY({ x: px, y: py });
  }

  function onPointerLeave() {
    setHoverIdx(null);
    setHoverXY(null);
  }

  const tip = useMemo(() => {
    if (!hoveredPoint || !hoverXY) return null;

    const { p } = hoveredPoint;

    const lines = [
      { label: "Daily", v: p.daily, color: "rgb(var(--chart-daily) / 0.95)" },
      { label: "MA7", v: p.ma7, color: "rgb(var(--chart-ma7) / 0.95)" },
      { label: "MA30", v: p.ma30, color: "rgb(var(--chart-ma30) / 0.95)" },
    ].filter((x) => x.v !== null && Number.isFinite(x.v as number));

    const title = p.date;

    const boxW = 190;
    const boxH = 22 + lines.length * 18;
    const margin = 8;

    let left = hoverXY.x + 10;
    let top = hoverXY.y + 10;
    if (left + boxW > size.w - margin) left = hoverXY.x - boxW - 10;
    if (top + boxH > size.h - margin) top = hoverXY.y - boxH - 10;
    left = Math.max(margin, left);
    top = Math.max(margin, top);

    return { left, top, boxW, boxH, title, lines };
  }, [hoveredPoint, hoverXY, size.w, size.h]);

  // Visual tokens (HTML parity)
  const radius = 6; // landing-v2: --radius: 6px
  const gridStroke = "rgb(var(--border) / 0.07)";
  const axisFill = "rgb(var(--text-faint) / 0.95)";
  const monoFont = "var(--font-mono), ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";

  return (
    <div ref={wrapRef} className="w-full" style={{ height }}>
      {!ready ? null : (
        <svg
          width={size.w}
          height={size.h}
          style={{ display: "block", touchAction: "none", cursor: "crosshair" }}
          onPointerMove={onPointerMove}
          onPointerLeave={onPointerLeave}
        >
          {/* plot background (flat premium; subtle border alpha) */}
          <rect
            x={0}
            y={0}
            width={size.w}
            height={size.h}
            rx={radius}
            fill="rgb(var(--surface-2) / 0.55)"
            stroke="rgb(var(--border) / 0.07)"
          />

          {/* grid (subtle) */}
          {xTicks.map((t, i) => {
            const X = x(t);
            return (
              <line
                key={`xg-${i}`}
                x1={X}
                y1={padT}
                x2={X}
                y2={padT + innerH}
                stroke={gridStroke}
                strokeDasharray="2 6"
              />
            );
          })}
          {yTicks.map((v, i) => {
            const Y = y(v);
            return (
              <line
                key={`yg-${i}`}
                x1={padL}
                y1={Y}
                x2={padL + innerW}
                y2={Y}
                stroke={gridStroke}
                strokeDasharray="2 6"
              />
            );
          })}

          {/* axes labels (mono, small) */}
          {yTicks.map((v, i) => {
            const Y = y(v);
            return (
              <text
                key={`yl-${i}`}
                x={padL - 10}
                y={Y + 4}
                textAnchor="end"
                fontSize={11}
                fill={axisFill}
                fontFamily={monoFont}
              >
                {fmtCompact(v)}
              </text>
            );
          })}
          {xTicks.map((t, i) => {
            const X = x(t);
            return (
              <text
                key={`xl-${i}`}
                x={X}
                y={padT + innerH + 18}
                textAnchor="middle"
                fontSize={11}
                fill={axisFill}
                fontFamily={monoFont}
              >
                {fmtTickFromMs(t)}
              </text>
            );
          })}

          {/* lines — hierarchy: MA30 (primary) → MA7 (secondary) → Daily (subtle) */}

          {/* Daily: thinnest + subtle */}
          {pathDaily ? (
            <path
              d={pathDaily}
              fill="none"
              stroke="rgb(var(--chart-daily) / 0.62)"
              strokeWidth={1.6}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ) : null}

          {/* MA7: secondary */}
          {pathMA7 ? (
            <>
              <path
                d={pathMA7}
                fill="none"
                stroke="rgb(0 0 0 / 0.45)"
                strokeWidth={5.2}
                strokeLinecap="round"
                opacity="0.50"
              />
              <path
                d={pathMA7}
                fill="none"
                stroke="rgb(var(--chart-ma7) / 0.92)"
                strokeWidth={2.8}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            </>
          ) : null}

          {/* MA30: primary baseline */}
          {pathMA30 ? (
            <>
              <path
                d={pathMA30}
                fill="none"
                stroke="rgb(0 0 0 / 0.45)"
                strokeWidth={6.0}
                strokeLinecap="round"
                opacity="0.50"
              />
              <path
                d={pathMA30}
                fill="none"
                stroke="rgb(var(--chart-ma30) / 0.95)"
                strokeWidth={3.2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            </>
          ) : null}

          {/* hover crosshair + dots */}
          {hoveredPoint ? (
            <>
              <line
                x1={hoveredPoint.X}
                y1={padT}
                x2={hoveredPoint.X}
                y2={padT + innerH}
                stroke="rgb(var(--border) / 0.13)"
              />

              {hoveredPoint.p.daily !== null && Number.isFinite(hoveredPoint.p.daily) ? (
                <circle cx={hoveredPoint.X} cy={y(hoveredPoint.p.daily)} r={3.0} fill="rgb(var(--chart-daily) / 0.95)" />
              ) : null}
              {hoveredPoint.p.ma7 !== null && Number.isFinite(hoveredPoint.p.ma7) ? (
                <circle cx={hoveredPoint.X} cy={y(hoveredPoint.p.ma7)} r={3.0} fill="rgb(var(--chart-ma7) / 0.95)" />
              ) : null}
              {hoveredPoint.p.ma30 !== null && Number.isFinite(hoveredPoint.p.ma30) ? (
                <circle cx={hoveredPoint.X} cy={y(hoveredPoint.p.ma30)} r={3.0} fill="rgb(var(--chart-ma30) / 0.95)" />
              ) : null}
            </>
          ) : null}

          {/* tooltip (HTML-parity: bg + border alpha + mono typography + radius 6px) */}
          {tip ? (
            <g>
              <rect
                x={tip.left}
                y={tip.top}
                width={tip.boxW}
                height={tip.boxH}
                rx={radius}
                ry={radius}
                fill="rgb(var(--bg) / 0.92)"
                stroke="rgb(var(--border) / 0.13)"
              />
              <text
                x={tip.left + 10}
                y={tip.top + 15}
                fontSize={11}
                fill="rgb(var(--text-muted) / 0.95)"
                fontFamily={monoFont}
              >
                {tip.title}
              </text>

              {tip.lines.map((ln, i) => (
                <g key={ln.label}>
                  <rect x={tip.left + 10} y={tip.top + 22 + i * 18 - 8} width={8} height={8} rx={2} fill={ln.color} />
                  <text
                    x={tip.left + 24}
                    y={tip.top + 22 + i * 18}
                    fontSize={11}
                    fill="rgb(var(--text-muted) / 0.92)"
                    fontFamily={monoFont}
                  >
                    {ln.label}: <tspan fill="rgb(var(--text) / 0.95)">{fmtCompact(ln.v)}</tspan>
                  </text>
                </g>
              ))}
            </g>
          ) : null}
        </svg>
      )}
    </div>
  );
}