"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";

import type { ChainId, LandingHeroPoint } from "@/lib/types";
import { useLandingHero, useLandingHeroWindow } from "@/lib/data";
import { RegimeBadge } from "@/components/ui/RegimeBadge";

function titleChain(chain: ChainId) {
  switch (chain) {
    case "bitcoin":
      return "Bitcoin";
    case "ethereum":
      return "Ethereum";
    case "arbitrum":
      return "Arbitrum";
    case "base":
      return "Base";
    default:
      return String(chain);
  }
}

function safeNum(v: any): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function formatNumberSmart(v: number | null) {
  if (v === null) return "—";
  const abs = Math.abs(v);
  if (abs >= 1e9) return `${(v / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${(v / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${(v / 1e3).toFixed(1)}k`;
  if (abs >= 1) return v.toFixed(2);
  return v.toPrecision(3);
}

type Palette = {
  a: string;
  b: string;
  stroke: string;
  glow: string;
  ma7: string;
  ma30: string;
};

function paletteFor(chain: ChainId): Palette {
  if (chain === "ethereum") {
    return {
      a: "rgba(168,85,247,0.70)",
      b: "rgba(59,130,246,0.08)",
      stroke: "rgba(168,85,247,0.98)",
      glow: "rgba(168,85,247,0.75)",
      ma7: "rgba(255,255,255,0.82)",
      ma30: "rgba(255,255,255,0.35)",
    };
  }
  if (chain === "bitcoin") {
    return {
      a: "rgba(245,158,11,0.62)",
      b: "rgba(236,72,153,0.07)",
      stroke: "rgba(245,158,11,0.98)",
      glow: "rgba(245,158,11,0.72)",
      ma7: "rgba(255,255,255,0.80)",
      ma30: "rgba(255,255,255,0.33)",
    };
  }
  if (chain === "arbitrum") {
    return {
      a: "rgba(34,211,238,0.62)",
      b: "rgba(59,130,246,0.08)",
      stroke: "rgba(34,211,238,0.98)",
      glow: "rgba(34,211,238,0.72)",
      ma7: "rgba(255,255,255,0.80)",
      ma30: "rgba(255,255,255,0.33)",
    };
  }
  return {
    a: "rgba(34,197,94,0.60)",
    b: "rgba(16,185,129,0.07)",
    stroke: "rgba(34,197,94,0.98)",
    glow: "rgba(34,197,94,0.72)",
    ma7: "rgba(255,255,255,0.80)",
    ma30: "rgba(255,255,255,0.33)",
  };
}

function normalize(vals: (number | null)[]) {
  const xs = vals.filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  if (!xs.length) return { min: 0, max: 1 };
  let min = xs[0],
    max = xs[0];
  for (const v of xs) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  if (min === max) return { min: min - 1, max: max + 1 };
  return { min, max };
}

function mapY(v: number, min: number, max: number, h: number, pad: number) {
  const t = (v - min) / (max - min);
  return pad + (1 - t) * (h - pad * 2);
}

function pathForSeries(vals: (number | null)[], w: number, h: number, pad = 16) {
  const { min, max } = normalize(vals);
  const n = vals.length;
  if (!n) return { d: "", min, max };
  const dx = n <= 1 ? 0 : (w - pad * 2) / (n - 1);

  let d = "";
  let started = false;
  for (let i = 0; i < n; i++) {
    const x = pad + i * dx;
    const v = vals[i];
    if (typeof v !== "number" || !Number.isFinite(v)) {
      started = false;
      continue;
    }
    const y = mapY(v, min, max, h, pad);
    if (!started) {
      d += `M ${x.toFixed(2)} ${y.toFixed(2)} `;
      started = true;
    } else {
      d += `L ${x.toFixed(2)} ${y.toFixed(2)} `;
    }
  }
  return { d: d.trim(), min, max };
}

function areaUnderSeries(vals: (number | null)[], w: number, h: number, pad = 16) {
  const { min, max } = normalize(vals);
  const n = vals.length;
  if (!n) return { d: "", min, max };
  const dx = n <= 1 ? 0 : (w - pad * 2) / (n - 1);

  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i < n; i++) {
    const v = vals[i];
    if (typeof v !== "number" || !Number.isFinite(v)) continue;
    const x = pad + i * dx;
    const y = mapY(v, min, max, h, pad);
    pts.push({ x, y });
  }
  if (!pts.length) return { d: "", min, max };

  let d = `M ${pts[0].x.toFixed(2)} ${(h - pad).toFixed(2)} `;
  for (const p of pts) d += `L ${p.x.toFixed(2)} ${p.y.toFixed(2)} `;
  d += `L ${pts[pts.length - 1].x.toFixed(2)} ${(h - pad).toFixed(2)} Z`;
  return { d, min, max };
}

function confColor(conf: number | null) {
  if (conf === null) return "rgba(255,255,255,0.10)";
  if (conf >= 0.75) return "rgba(34,197,94,0.70)";
  if (conf >= 0.45) return "rgba(245,158,11,0.70)";
  return "rgba(244,63,94,0.70)";
}

function WindowToggle(props: { windows: number[]; active: number | null; onChange: (w: number) => void }) {
  const { windows, active, onChange } = props;
  const preferredOrder = [30, 90, 180, 365, 7];

  const ordered = [...windows].sort((a, b) => preferredOrder.indexOf(a) - preferredOrder.indexOf(b));

  return (
    <div className="flex flex-wrap gap-2">
      {ordered.map((w) => {
        const isActive = w === active;
        return (
          <button
            key={w}
            type="button"
            onClick={(e) => {
              e.preventDefault();
              onChange(w);
            }}
            className={[
              "rounded-full border px-3 py-1 text-[11px] font-medium transition",
              isActive
                ? "border-ui-border bg-ui-bg/40 text-ui-text"
                : "border-ui-border/70 bg-ui-bg/20 text-ui-muted hover:bg-ui-bg/30",
            ].join(" ")}
          >
            {w}d
          </button>
        );
      })}
    </div>
  );
}

export function ChainHeroCard({ chain }: { chain: ChainId }) {
  const pal = paletteFor(chain);

  const { data: hero, isLoading: heroLoading } = useLandingHero(chain);

  // ✅ Memoize windows to avoid new [] each render (fixes react-hooks/exhaustive-deps warning)
  const windows = useMemo<number[]>(() => {
    const w = hero?.windows_available;
    return Array.isArray(w) ? w : [];
  }, [hero?.windows_available]);

  const defaultWindow = hero?.default_window_days ?? null;

  const [activeWindow, setActiveWindow] = useState<number | null>(defaultWindow);

  // keep active in sync when hero loads
  const active = useMemo(() => {
    if (activeWindow && windows.includes(activeWindow)) return activeWindow;
    if (defaultWindow && windows.includes(defaultWindow)) return defaultWindow;
    return windows.length ? windows[Math.max(0, windows.length - 1)] : null;
  }, [activeWindow, windows, defaultWindow]);

  const { data: winFile, isLoading: winLoading } = useLandingHeroWindow(chain, active);

  const series: LandingHeroPoint[] = useMemo(() => {
    if (winFile?.series?.length) return winFile.series;
    // fallback to embedded default if window fetch missing
    const embedded = hero?.default?.series;
    return Array.isArray(embedded) ? embedded : [];
  }, [winFile, hero]);

  const last = series.length ? series[series.length - 1] : null;
  const regimeLabel = (last?.regime ?? null) as string | null;

  // SVG layout
  const w = 1200;
  const h = 360;
  const pad = 18;

  const daily = series.map((p) => safeNum(p.daily));
  const ma7 = series.map((p) => safeNum(p.ma7));
  const ma30 = series.map((p) => safeNum(p.ma30));
  const conf = series.map((p) => safeNum(p.confidence));

  const area = areaUnderSeries(daily, w, h, pad);
  const dailyLine = pathForSeries(daily, w, h, pad);
  const ma7Line = pathForSeries(ma7, w, h, pad);
  const ma30Line = pathForSeries(ma30, w, h, pad);

  const hasAny = !!(dailyLine.d || ma7Line.d || ma30Line.d);

  // Hover
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const n = series.length;
  const dx = n <= 1 ? 0 : (w - pad * 2) / (n - 1);

  function onMove(e: React.MouseEvent) {
    if (!wrapRef.current || n <= 0) return;
    const rect = wrapRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const t = x / rect.width;
    const raw = pad + t * (w - pad * 2);
    const i = Math.round((raw - pad) / dx);
    setHoverIdx(Math.max(0, Math.min(n - 1, i)));
  }
  function onLeave() {
    setHoverIdx(null);
  }

  const hover = hoverIdx === null ? null : series[hoverIdx];
  const xHover = hoverIdx === null ? null : pad + hoverIdx * dx;
  const tooltipLeftPct = hoverIdx === null || n <= 1 ? 50 : (hoverIdx / (n - 1)) * 100;

  const gradId = `grad-${chain}`;
  const glowId = `glow-${chain}`;

  return (
    <Link href={`/chains/${chain}`} className="group block">
      <div className="ui-card p-6 transition hover:border-ui-border/70">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div className="min-w-[320px]">
            <div className="flex items-center justify-between gap-3">
              <div className="text-lg font-semibold text-ui-text">{titleChain(chain)}</div>
              {regimeLabel ? <RegimeBadge label={regimeLabel} /> : null}
            </div>

            <div className="mt-2 text-xs text-ui-faint">
              Landing hero: <span className="text-ui-muted">Daily + MA7 + MA30</span>
            </div>

            <div className="mt-4">
              <div className="text-[11px] text-ui-faint">Window</div>
              <div className="mt-2">
                {heroLoading ? (
                  <div className="text-xs text-ui-muted">Loading windows…</div>
                ) : windows.length === 0 ? (
                  <div className="text-xs text-ui-bad">Missing landing files. Run publish + landing export + sync.</div>
                ) : (
                  <WindowToggle windows={windows} active={active} onChange={(w) => setActiveWindow(w)} />
                )}
              </div>
            </div>

            <div className="mt-4 text-xs text-ui-faint">Hover chart for exact values. Click to open full diagnostics →</div>
          </div>

          <div className="flex-1">
            <div className="rounded-2xl border border-ui-border bg-ui-bg/20 p-4">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-xs font-medium text-ui-muted">Signature trend</div>
                <div className="text-xs text-ui-faint">tx_count_daily • {active ? `${active}d` : "—"}</div>
              </div>

              {heroLoading || winLoading ? (
                <div className="flex h-[240px] items-center justify-center text-sm text-ui-faint">Loading series…</div>
              ) : !hasAny ? (
                <div className="rounded-xl border border-ui-border bg-ui-bg/20 p-4 text-sm text-ui-faint">No usable series.</div>
              ) : (
                <div
                  ref={wrapRef}
                  className="relative"
                  onMouseMove={onMove}
                  onMouseEnter={onMove}
                  onMouseLeave={onLeave}
                >
                  {hover ? (
                    <div
                      className="pointer-events-none absolute top-2 z-10 rounded-xl border border-ui-border bg-black/60 px-3 py-2 text-[11px] text-white backdrop-blur"
                      style={{
                        left: `clamp(8px, ${tooltipLeftPct}%, calc(100% - 260px))`,
                        width: 252,
                      }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-semibold">{hover.date}</div>
                        <div className="text-white/70">
                          conf: {hover.confidence === null ? "—" : Number(hover.confidence).toPrecision(3)}
                        </div>
                      </div>
                      <div className="mt-1 grid grid-cols-3 gap-2 text-white/90">
                        <div>
                          <div className="text-white/60">daily</div>
                          <div className="font-semibold">{formatNumberSmart(safeNum(hover.daily))}</div>
                        </div>
                        <div>
                          <div className="text-white/60">MA7</div>
                          <div className="font-semibold">{formatNumberSmart(safeNum(hover.ma7))}</div>
                        </div>
                        <div>
                          <div className="text-white/60">MA30</div>
                          <div className="font-semibold">{formatNumberSmart(safeNum(hover.ma30))}</div>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  <svg viewBox={`0 0 ${w} ${h + 14}`} className="h-auto w-full">
                    <defs>
                      <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor={pal.a} />
                        <stop offset="100%" stopColor={pal.b} />
                      </linearGradient>

                      <filter id={glowId} x="-40%" y="-40%" width="180%" height="180%">
                        <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                        <feMerge>
                          <feMergeNode in="coloredBlur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>

                      <linearGradient id={`${gradId}-shimmer`} x1="0" x2="1">
                        <stop offset="0%" stopColor="rgba(255,255,255,0.00)" />
                        <stop offset="50%" stopColor="rgba(255,255,255,0.10)" />
                        <stop offset="100%" stopColor="rgba(255,255,255,0.00)" />
                      </linearGradient>
                    </defs>

                    <g opacity="0.38">
                      {[1, 2, 3].map((i) => (
                        <line
                          key={i}
                          x1={pad}
                          y1={(h / 4) * i}
                          x2={w - pad}
                          y2={(h / 4) * i}
                          stroke="rgba(255,255,255,0.08)"
                        />
                      ))}
                    </g>

                    {area.d ? <path d={area.d} fill={`url(#${gradId})`} /> : null}

                    <rect x="0" y="0" width={w} height={h} fill={`url(#${gradId}-shimmer)`} opacity="0.30">
                      <animate attributeName="x" from={-w} to={w} dur="5s" repeatCount="indefinite" />
                    </rect>

                    {dailyLine.d ? (
                      <path
                        d={dailyLine.d}
                        fill="none"
                        stroke={pal.stroke}
                        strokeWidth="3.2"
                        filter={`url(#${glowId})`}
                        strokeLinecap="round"
                      />
                    ) : null}

                    {ma7Line.d ? (
                      <path
                        d={ma7Line.d}
                        fill="none"
                        stroke={pal.ma7}
                        strokeWidth="2.0"
                        strokeLinecap="round"
                        opacity="0.9"
                      />
                    ) : null}

                    {ma30Line.d ? (
                      <path
                        d={ma30Line.d}
                        fill="none"
                        stroke={pal.ma30}
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        opacity="0.85"
                      />
                    ) : null}

                    {xHover !== null && hover ? (
                      <g>
                        <line x1={xHover} y1={pad} x2={xHover} y2={h - pad} stroke="rgba(255,255,255,0.18)" />
                        {(() => {
                          const v = safeNum(hover.daily) ?? safeNum(hover.ma7) ?? safeNum(hover.ma30);
                          if (typeof v !== "number" || !Number.isFinite(v)) return null;
                          const y = mapY(v, dailyLine.min, dailyLine.max, h, pad);
                          return (
                            <circle
                              cx={xHover}
                              cy={y}
                              r={6}
                              fill="rgba(255,255,255,0.92)"
                              stroke={pal.glow}
                              strokeWidth={2}
                            />
                          );
                        })()}
                      </g>
                    ) : null}

                    <g transform={`translate(0 ${h + 4})`}>
                      {conf.map((c, i) => {
                        const x = (w / Math.max(1, conf.length)) * i;
                        const rw = w / Math.max(1, conf.length);
                        return (
                          <rect key={i} x={x} y={0} width={rw} height={8} fill={confColor(c)} opacity="0.95" />
                        );
                      })}
                    </g>
                  </svg>

                  <div className="mt-2 flex items-center justify-between text-[11px] text-ui-faint">
                    <span>Hover to inspect exact values</span>
                    <span>Daily (area+glow) • MA7 • MA30 • confidence</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}