// src/app/page.tsx
import Link from "next/link";
import LandingHero from "@/components/landing/LandingHero";

function Card(props: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-sm backdrop-blur">
      <div className="text-lg font-semibold text-white">{props.title}</div>
      <div className="mt-3 text-sm text-white/70">{props.children}</div>
    </div>
  );
}

function PillLink(props: { href: string; label: string }) {
  return (
    <Link
      href={props.href}
      className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-semibold text-white/70 hover:border-white/20 hover:text-white"
    >
      {props.label}
    </Link>
  );
}

export default function HomePage() {
  return (
    <main className="space-y-8">
      {/* Landing cards (2x2) */}
      <LandingHero />

      {/* How to read */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card title="How to read the charts">
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <span className="text-white/85">Daily</span> is the raw value for the date.
            </li>
            <li>
              <span className="text-white/85">MA7</span> and <span className="text-white/85">MA30</span> smooth noise to show sustained movement.
            </li>
            <li>
              Hover the chart to see <span className="text-white/85">confidence</span>, and (when available) <span className="text-white/85">z-score</span> / <span className="text-white/85">percentile</span>.
            </li>
            <li>
              Missing values are shown as <span className="text-white/85">gaps</span> (never interpolated).
            </li>
          </ul>
        </Card>

        <Card title="What the labels mean">
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <span className="text-white/85">Level</span>: Low / Typical / Elevated / Extreme vs historical reference.
            </li>
            <li>
              <span className="text-white/85">Trend</span>: Rising / Falling / Flat using MA30 slope over the selected window.
            </li>
            <li>
              <span className="text-white/85">Stability</span>: Stable / Variable / Highly variable based on dispersion of daily values.
            </li>
            <li>
              These are <span className="text-white/85">descriptive</span> summaries only — no advice, no forecasts, no prices.
            </li>
          </ul>
        </Card>
      </section>

      {/* Quick links */}
      <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-sm backdrop-blur">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-lg font-semibold text-white">Start exploring</div>
            <div className="mt-1 text-sm text-white/70">
              Chain dashboards, methodology, and raw exports are all accessible from the navigation bar.
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <PillLink href="/chains/bitcoin" label="Bitcoin dashboard" />
            <PillLink href="/chains/ethereum" label="Ethereum dashboard" />
            <PillLink href="/methodology" label="Methodology" />
            <PillLink href="/wiki" label="Wiki" />
            <PillLink href="/about" label="About / contract" />
          </div>
        </div>

        <div className="mt-4 text-xs text-white/50">
          Data is served from published artifacts under <span className="font-mono">public/data/published/v1</span> and is auditable via dataset_id and revision_id.
        </div>
      </section>
    </main>
  );
}
// "use client";

// import Link from "next/link";
// import { useMemo, useRef, useState } from "react";
// import useSWR from "swr";

// import type { ChainId, DatasetIndex } from "@/lib/types";
// import { buildDateRangeISO, chooseBundleDate, useBundle, useDatasetIndex } from "@/lib/data";
// import { RegimeBadge } from "@/components/ui/RegimeBadge";

// const DEFAULT_CHAINS: ChainId[] = ["bitcoin", "ethereum", "arbitrum", "base"];

// // Landing: keep it snappy. 60d looks great and is cheaper than 90d.
// // If you want 90: set to 90, but expect more fetches.
// const LANDING_DAYS = 60;

// // Concurrency limit for day-file fetching
// const CONCURRENCY = 10;

// type SeriesPoint = {
//   date: string;
//   daily: number | null;
//   ma7: number | null;
//   ma30: number | null;
// };

// async function fetchJson(url: string) {
//   const res = await fetch(url, { cache: "no-store" });
//   if (!res.ok) return null;
//   return res.json();
// }

// function safeNum(v: any): number | null {
//   return typeof v === "number" && Number.isFinite(v) ? v : null;
// }

// function titleChain(chain: ChainId) {
//   switch (chain) {
//     case "bitcoin":
//       return "Bitcoin";
//     case "ethereum":
//       return "Ethereum";
//     case "arbitrum":
//       return "Arbitrum";
//     case "base":
//       return "Base";
//     default:
//       return String(chain);
//   }
// }

// function pctDelta(a: unknown, b: unknown): number | null {
//   if (typeof a !== "number" || !Number.isFinite(a)) return null;
//   if (typeof b !== "number" || !Number.isFinite(b)) return null;
//   const denom = Math.abs(b);
//   if (!Number.isFinite(denom) || denom === 0) return null;
//   return ((a - b) / denom) * 100;
// }

// function fmtPct(x: number | null) {
//   if (x === null) return "—";
//   const abs = Math.abs(x);
//   const s = abs >= 10 ? x.toFixed(0) : x.toFixed(1);
//   return `${x > 0 ? "+" : ""}${s}%`;
// }

// function coverageTone(conf7d: number | null): { label: string; cls: string } {
//   if (conf7d === null) return { label: "Coverage: Low", cls: "border-ui-border bg-ui-bg/20 text-ui-muted" };
//   if (conf7d >= 0.75) return { label: "Coverage: High", cls: "border-ui-ok/25 bg-ui-ok/10 text-ui-ok" };
//   if (conf7d >= 0.45) return { label: "Coverage: Medium", cls: "border-ui-warn/25 bg-ui-warn/10 text-ui-warn" };
//   return { label: "Coverage: Low", cls: "border-ui-bad/25 bg-ui-bad/10 text-ui-bad" };
// }

// function pickGlanceKeys() {
//   return [
//     { label: "Activity", key: "tx_count_daily" },
//     { label: "Friction", key: "median_tx_fee_native" },
//     { label: "Capacity", key: "avg_block_time_sec" },
//   ] as const;
// }

// function formatNumberSmart(v: number | null) {
//   if (v === null) return "—";
//   const abs = Math.abs(v);
//   if (abs >= 1e9) return `${(v / 1e9).toFixed(2)}B`;
//   if (abs >= 1e6) return `${(v / 1e6).toFixed(2)}M`;
//   if (abs >= 1e3) return `${(v / 1e3).toFixed(1)}k`;
//   if (abs >= 1) return v.toFixed(2);
//   return v.toPrecision(3);
// }

// type Palette = {
//   name: string;
//   a: string; // area top
//   b: string; // area bottom
//   stroke: string; // daily neon
//   glow: string;
//   ma7: string;
//   ma30: string;
// };

// function paletteFor(chain: ChainId): Palette {
//   if (chain === "ethereum") {
//     return {
//       name: "violet",
//       a: "rgba(168,85,247,0.70)",
//       b: "rgba(59,130,246,0.08)",
//       stroke: "rgba(168,85,247,0.98)",
//       glow: "rgba(168,85,247,0.75)",
//       ma7: "rgba(255,255,255,0.82)",
//       ma30: "rgba(255,255,255,0.35)",
//     };
//   }
//   if (chain === "bitcoin") {
//     return {
//       name: "amber",
//       a: "rgba(245,158,11,0.60)",
//       b: "rgba(236,72,153,0.07)",
//       stroke: "rgba(245,158,11,0.98)",
//       glow: "rgba(245,158,11,0.72)",
//       ma7: "rgba(255,255,255,0.80)",
//       ma30: "rgba(255,255,255,0.33)",
//     };
//   }
//   if (chain === "arbitrum") {
//     return {
//       name: "cyan",
//       a: "rgba(34,211,238,0.62)",
//       b: "rgba(59,130,246,0.08)",
//       stroke: "rgba(34,211,238,0.98)",
//       glow: "rgba(34,211,238,0.72)",
//       ma7: "rgba(255,255,255,0.80)",
//       ma30: "rgba(255,255,255,0.33)",
//     };
//   }
//   return {
//     name: "lime",
//     a: "rgba(34,197,94,0.58)",
//     b: "rgba(16,185,129,0.07)",
//     stroke: "rgba(34,197,94,0.98)",
//     glow: "rgba(34,197,94,0.72)",
//     ma7: "rgba(255,255,255,0.80)",
//     ma30: "rgba(255,255,255,0.33)",
//   };
// }

// /**
//  * Fetch day partitions with concurrency limit.
//  * We deliberately read day-files (gold + derived) because those are clearly present for all chains
//  * (proved by chain detail pages).
//  */
// async function fetchSeriesDaily(args: {
//   chain: ChainId;
//   endDateISO: string;
//   days: number;
//   baseKey: string;
// }): Promise<SeriesPoint[]> {
//   const dates = buildDateRangeISO(args.endDateISO, args.days);

//   const results: SeriesPoint[] = [];
//   let idx = 0;

//   async function worker() {
//     while (true) {
//       const i = idx++;
//       if (i >= dates.length) break;
//       const d = dates[i];

//       const [gold, derived] = await Promise.all([
//         fetchJson(`/data/published/v1/gold/${args.chain}/${d}.json`),
//         fetchJson(`/data/published/v1/derived/${args.chain}/${d}.json`),
//       ]);

//       const daily =
//         safeNum(gold?.[args.baseKey]) ??
//         safeNum(gold?.gold?.[args.baseKey]) ??
//         safeNum(gold?.metrics?.[args.baseKey]) ??
//         safeNum(gold?.gold?.metrics?.[args.baseKey]) ??
//         null;

//       const m = derived?.derived?.metrics ?? derived?.metrics ?? null;
//       const ma7 = safeNum(m?.[`${args.baseKey}__ma7`]);
//       const ma30 = safeNum(m?.[`${args.baseKey}__ma30`]);

//       results[i] = { date: d, daily, ma7, ma30 };
//     }
//   }

//   const workers = Array.from({ length: CONCURRENCY }, () => worker());
//   await Promise.all(workers);

//   // compact: keep only points where at least one series exists (but preserve date order)
//   return results.filter((p) => p && (p.daily !== null || p.ma7 !== null || p.ma30 !== null));
// }

// function normalize(vals: (number | null)[]) {
//   const xs = vals.filter((v): v is number => typeof v === "number" && Number.isFinite(v));
//   if (!xs.length) return { min: 0, max: 1 };
//   let min = xs[0],
//     max = xs[0];
//   for (const v of xs) {
//     if (v < min) min = v;
//     if (v > max) max = v;
//   }
//   if (min === max) return { min: min - 1, max: max + 1 };
//   return { min, max };
// }

// function mapY(v: number, min: number, max: number, h: number, pad: number) {
//   const t = (v - min) / (max - min);
//   return pad + (1 - t) * (h - pad * 2);
// }

// function pathForSeries(vals: (number | null)[], w: number, h: number, pad = 16) {
//   const { min, max } = normalize(vals);
//   const n = vals.length;
//   if (!n) return { d: "", min, max };
//   const dx = n <= 1 ? 0 : (w - pad * 2) / (n - 1);

//   let d = "";
//   let started = false;
//   for (let i = 0; i < n; i++) {
//     const x = pad + i * dx;
//     const v = vals[i];
//     if (typeof v !== "number" || !Number.isFinite(v)) {
//       started = false;
//       continue;
//     }
//     const y = mapY(v, min, max, h, pad);
//     if (!started) {
//       d += `M ${x.toFixed(2)} ${y.toFixed(2)} `;
//       started = true;
//     } else {
//       d += `L ${x.toFixed(2)} ${y.toFixed(2)} `;
//     }
//   }
//   return { d: d.trim(), min, max };
// }

// function areaUnderSeries(vals: (number | null)[], w: number, h: number, pad = 16) {
//   const { min, max } = normalize(vals);
//   const n = vals.length;
//   if (!n) return { d: "", min, max };
//   const dx = n <= 1 ? 0 : (w - pad * 2) / (n - 1);

//   const pts: { x: number; y: number }[] = [];
//   for (let i = 0; i < n; i++) {
//     const v = vals[i];
//     if (typeof v !== "number" || !Number.isFinite(v)) continue;
//     const x = pad + i * dx;
//     const y = mapY(v, min, max, h, pad);
//     pts.push({ x, y });
//   }
//   if (!pts.length) return { d: "", min, max };

//   let d = `M ${pts[0].x.toFixed(2)} ${(h - pad).toFixed(2)} `;
//   for (const p of pts) d += `L ${p.x.toFixed(2)} ${p.y.toFixed(2)} `;
//   d += `L ${pts[pts.length - 1].x.toFixed(2)} ${(h - pad).toFixed(2)} Z`;
//   return { d, min, max };
// }

// function GlanceMetric({ label, value }: { label: string; value: string }) {
//   return (
//     <div className="rounded-xl border border-ui-border bg-ui-bg/30 p-3">
//       <div className="text-[11px] text-ui-faint">{label}</div>
//       <div className="mt-1 text-sm font-semibold text-ui-text">{value}</div>
//       <div className="mt-0.5 text-[11px] text-ui-faint">MA7 vs MA30</div>
//     </div>
//   );
// }

// function InteractiveNeonDailyChart({
//   chain,
//   endDateISO,
//   baseKey,
//   height = 340,
// }: {
//   chain: ChainId;
//   endDateISO: string;
//   baseKey: string;
//   height?: number;
// }) {
//   const pal = paletteFor(chain);

//   const swrKey = `landing:series:${chain}:${baseKey}:${endDateISO}:${LANDING_DAYS}`;
//   const { data: series } = useSWR<SeriesPoint[]>(
//     swrKey,
//     () => fetchSeriesDaily({ chain, endDateISO, days: LANDING_DAYS, baseKey }),
//     { revalidateOnFocus: false }
//   );

//   const points = series ?? [];
//   const daily = points.map((p) => p.daily);
//   const ma7 = points.map((p) => p.ma7);
//   const ma30 = points.map((p) => p.ma30);

//   // Visual basis: daily area + neon, MA7 + MA30 overlay
//   const w = 1200;
//   const h = height;
//   const pad = 18;

//   const area = areaUnderSeries(daily, w, h, pad);
//   const dailyLine = pathForSeries(daily, w, h, pad);
//   const ma7Line = pathForSeries(ma7, w, h, pad);
//   const ma30Line = pathForSeries(ma30, w, h, pad);

//   const hasAny = !!(dailyLine.d || ma7Line.d || ma30Line.d);

//   // Hover
//   const wrapRef = useRef<HTMLDivElement | null>(null);
//   const [hoverIdx, setHoverIdx] = useState<number | null>(null);

//   const n = points.length;
//   const dx = n <= 1 ? 0 : (w - pad * 2) / (n - 1);

//   function onMove(e: React.MouseEvent) {
//     if (!wrapRef.current || n <= 0) return;
//     const rect = wrapRef.current.getBoundingClientRect();
//     const x = e.clientX - rect.left;
//     const t = x / rect.width;
//     const raw = pad + t * (w - pad * 2);
//     const i = Math.round((raw - pad) / dx);
//     setHoverIdx(Math.max(0, Math.min(n - 1, i)));
//   }

//   function onLeave() {
//     setHoverIdx(null);
//   }

//   const hover = hoverIdx === null ? null : points[hoverIdx];
//   const xHover = hoverIdx === null ? null : pad + hoverIdx * dx;
//   const tooltipLeftPct = hoverIdx === null || n <= 1 ? 50 : (hoverIdx / (n - 1)) * 100;

//   const gradId = `grad-${chain}-${baseKey}-${pal.name}`;
//   const glowId = `glow-${chain}-${baseKey}-${pal.name}`;

//   return (
//     <div
//       ref={wrapRef}
//       className="relative mt-4 rounded-2xl border border-ui-border bg-ui-bg/20 p-4"
//       onMouseMove={onMove}
//       onMouseEnter={onMove}
//       onMouseLeave={onLeave}
//     >
//       <div className="mb-2 flex items-center justify-between">
//         <div className="text-xs font-medium text-ui-muted">Signature trend</div>
//         <div className="text-xs text-ui-faint">
//           {baseKey} • last {LANDING_DAYS}d
//         </div>
//       </div>

//       {!hasAny ? (
//         <div className="flex h-[240px] items-center justify-center text-sm text-ui-faint">
//           Loading series…
//         </div>
//       ) : (
//         <>
//           {/* Tooltip */}
//           {hover ? (
//             <div
//               className="pointer-events-none absolute top-2 z-10 rounded-xl border border-ui-border bg-black/60 px-3 py-2 text-[11px] text-white backdrop-blur"
//               style={{
//                 left: `clamp(8px, ${tooltipLeftPct}%, calc(100% - 260px))`,
//                 width: 252,
//               }}
//             >
//               <div className="flex items-center justify-between gap-2">
//                 <div className="font-semibold">{hover.date}</div>
//               </div>
//               <div className="mt-1 grid grid-cols-3 gap-2 text-white/90">
//                 <div>
//                   <div className="text-white/60">daily</div>
//                   <div className="font-semibold">{formatNumberSmart(hover.daily)}</div>
//                 </div>
//                 <div>
//                   <div className="text-white/60">MA7</div>
//                   <div className="font-semibold">{formatNumberSmart(hover.ma7)}</div>
//                 </div>
//                 <div>
//                   <div className="text-white/60">MA30</div>
//                   <div className="font-semibold">{formatNumberSmart(hover.ma30)}</div>
//                 </div>
//               </div>
//             </div>
//           ) : null}

//           <svg viewBox={`0 0 ${w} ${h}`} className="h-auto w-full">
//             <defs>
//               <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
//                 <stop offset="0%" stopColor={pal.a} />
//                 <stop offset="100%" stopColor={pal.b} />
//               </linearGradient>

//               <filter id={glowId} x="-40%" y="-40%" width="180%" height="180%">
//                 <feGaussianBlur stdDeviation="4" result="coloredBlur" />
//                 <feMerge>
//                   <feMergeNode in="coloredBlur" />
//                   <feMergeNode in="SourceGraphic" />
//                 </feMerge>
//               </filter>

//               <linearGradient id={`${gradId}-shimmer`} x1="0" x2="1">
//                 <stop offset="0%" stopColor="rgba(255,255,255,0.00)" />
//                 <stop offset="50%" stopColor="rgba(255,255,255,0.10)" />
//                 <stop offset="100%" stopColor="rgba(255,255,255,0.00)" />
//               </linearGradient>
//             </defs>

//             {/* grid */}
//             <g opacity="0.38">
//               {[1, 2, 3].map((i) => (
//                 <line
//                   key={i}
//                   x1={pad}
//                   y1={(h / 4) * i}
//                   x2={w - pad}
//                   y2={(h / 4) * i}
//                   stroke="rgba(255,255,255,0.08)"
//                 />
//               ))}
//             </g>

//             {/* area daily */}
//             {area.d ? <path d={area.d} fill={`url(#${gradId})`} /> : null}

//             {/* shimmer */}
//             <rect x="0" y="0" width={w} height={h} fill={`url(#${gradId}-shimmer)`} opacity="0.30">
//               <animate attributeName="x" from={-w} to={w} dur="5s" repeatCount="indefinite" />
//             </rect>

//             {/* daily neon */}
//             {dailyLine.d ? (
//               <path
//                 d={dailyLine.d}
//                 fill="none"
//                 stroke={pal.stroke}
//                 strokeWidth="3.2"
//                 filter={`url(#${glowId})`}
//                 strokeLinecap="round"
//               />
//             ) : null}

//             {/* MA7 */}
//             {ma7Line.d ? (
//               <path d={ma7Line.d} fill="none" stroke={pal.ma7} strokeWidth="2.0" strokeLinecap="round" opacity="0.9" />
//             ) : null}

//             {/* MA30 */}
//             {ma30Line.d ? (
//               <path
//                 d={ma30Line.d}
//                 fill="none"
//                 stroke={pal.ma30}
//                 strokeWidth="1.6"
//                 strokeLinecap="round"
//                 opacity="0.85"
//               />
//             ) : null}

//             {/* hover crosshair + marker */}
//             {xHover !== null && hover ? (
//               <g>
//                 <line x1={xHover} y1={pad} x2={xHover} y2={h - pad} stroke="rgba(255,255,255,0.18)" />
//                 {(() => {
//                   const v = hover.daily ?? hover.ma7 ?? hover.ma30;
//                   if (typeof v !== "number" || !Number.isFinite(v)) return null;
//                   const y = mapY(v, dailyLine.min, dailyLine.max, h, pad);
//                   return <circle cx={xHover} cy={y} r={6} fill="rgba(255,255,255,0.92)" stroke={pal.glow} strokeWidth={2} />;
//                 })()}
//               </g>
//             ) : null}
//           </svg>

//           <div className="mt-2 flex items-center justify-between text-[11px] text-ui-faint">
//             <span>Hover to inspect exact values</span>
//             <span>Daily (area+glow) • MA7 • MA30</span>
//           </div>
//         </>
//       )}
//     </div>
//   );
// }

// function ChainHeroCard(props: {
//   chain: ChainId;
//   metaAsof?: string;
//   derivedAsof?: string;
//   goldAsof?: string;
// }) {
//   const { chain, metaAsof, derivedAsof, goldAsof } = props;

//   const date = chooseBundleDate({ metaAsof, derivedAsof, goldAsof });
//   const { data: bundle, isLoading } = useBundle(chain, date ?? undefined);

//   const regimeLabel: string =
//     (bundle?.meta as any)?.regime?.label ?? (bundle?.meta as any)?.regime_label ?? "UNKNOWN/DEGRADED";

//   const conf7d: number | null = (() => {
//     const v =
//       (bundle?.meta as any)?.confidence?.score_7d ??
//       (bundle?.meta as any)?.confidence?.score ??
//       (bundle?.meta as any)?.confidence_7d;
//     return typeof v === "number" && Number.isFinite(v) ? v : null;
//   })();

//   const cov = coverageTone(conf7d);

//   const updatedThrough: string | null =
//     (bundle?.meta as any)?.updated_through ?? (bundle?.meta as any)?.updatedThrough ?? date ?? null;

//   const keys = pickGlanceKeys();
//   const deltas = keys.map((k) => {
//     const m = (bundle?.derived as any)?.derived?.metrics ?? (bundle?.derived as any)?.metrics ?? null;
//     const ma7 = m ? m[`${k.key}__ma7`] : null;
//     const ma30 = m ? m[`${k.key}__ma30`] : null;
//     return pctDelta(ma7, ma30);
//   });

//   const endDateISO = updatedThrough ?? date ?? "";

//   return (
//     <Link href={`/chains/${chain}`} className="group block">
//       <div className="ui-card p-6 transition hover:border-ui-border/70">
//         <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
//           <div className="min-w-[300px]">
//             <div className="flex items-center justify-between gap-3">
//               <div className="text-lg font-semibold text-ui-text">{titleChain(chain)}</div>
//               <RegimeBadge label={regimeLabel} />
//             </div>

//             <div className="mt-2 text-xs text-ui-faint">
//               Snapshot: <span className="text-ui-muted">{date ?? "—"}</span>
//               {updatedThrough ? (
//                 <>
//                   {" "}
//                   • Updated through <span className="text-ui-muted">{updatedThrough}</span>
//                 </>
//               ) : null}
//             </div>

//             <div className="mt-3">
//               <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium ${cov.cls}`}>
//                 {cov.label}
//               </span>
//             </div>

//             <div className="mt-4 grid grid-cols-3 gap-3">
//               {keys.map((k, i) => (
//                 <GlanceMetric key={k.key} label={k.label} value={isLoading ? "…" : fmtPct(deltas[i] ?? null)} />
//               ))}
//             </div>

//             <div className="mt-3 text-xs text-ui-faint">Click to open full diagnostics →</div>
//           </div>

//           <div className="flex-1">
//             {/* Big interactive daily series (works for all chains because it uses day partitions) */}
//             {endDateISO ? (
//               <InteractiveNeonDailyChart chain={chain} endDateISO={endDateISO} baseKey="tx_count_daily" height={360} />
//             ) : (
//               <div className="mt-4 rounded-2xl border border-ui-border bg-ui-bg/20 p-4 text-sm text-ui-faint">
//                 Missing end date for series.
//               </div>
//             )}
//           </div>
//         </div>
//       </div>
//     </Link>
//   );
// }

// export default function Page() {
//   const { data, error, isLoading } = useDatasetIndex();
//   const dataset: DatasetIndex | null = (data as any) ?? null;

//   const chains = useMemo<ChainId[]>(() => {
//     if (!dataset) return DEFAULT_CHAINS;
//     const supported = Array.isArray(dataset.supported_chains) ? dataset.supported_chains : [];
//     return (supported.length ? supported : DEFAULT_CHAINS) as ChainId[];
//   }, [dataset]);

//   if (isLoading) {
//     return (
//       <main className="mx-auto max-w-6xl px-4 py-8">
//         <div className="text-sm text-ui-muted">Loading…</div>
//       </main>
//     );
//   }

//   if (error || !dataset) {
//     return (
//       <main className="mx-auto max-w-6xl px-4 py-8">
//         <div className="text-sm text-ui-bad">Failed to load dataset index.</div>
//       </main>
//     );
//   }

//   const asofMeta = (dataset.asof_by_genre_chain as any)?.meta ?? {};
//   const asofDerived = (dataset.asof_by_genre_chain as any)?.derived ?? {};
//   const asofGold = (dataset.asof_by_genre_chain as any)?.gold ?? {};

//   return (
//     <main className="mx-auto max-w-6xl px-4 py-10">
//       <section className="space-y-10">
//         {/* HERO */}
//         <div className="relative overflow-hidden rounded-3xl border border-ui-border bg-ui-bg shadow-[0_18px_60px_rgba(0,0,0,0.45)]">
//           <div className="pointer-events-none absolute inset-0">
//             <div className="absolute inset-x-0 top-0 h-[220px] bg-gradient-to-b from-ui-accent/12 via-ui-accent/0 to-transparent" />
//             <div className="absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-ui-accent/10 blur-3xl" />
//             <div className="absolute -right-44 -top-52 h-[560px] w-[560px] rounded-full bg-ui-accent2/10 blur-3xl" />
//           </div>

//           <div className="relative p-6 md:p-10">
//             <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
//               <div className="max-w-2xl">
//                 <div className="flex flex-wrap gap-2">
//                   <span className="inline-flex items-center rounded-full border border-ui-border bg-ui-bg/30 px-3 py-1 text-[11px] text-ui-muted">
//                     Price-agnostic
//                   </span>
//                   <span className="inline-flex items-center rounded-full border border-ui-border bg-ui-bg/30 px-3 py-1 text-[11px] text-ui-muted">
//                     Descriptive only
//                   </span>
//                   <span className="inline-flex items-center rounded-full border border-ui-border bg-ui-bg/30 px-3 py-1 text-[11px] text-ui-muted">
//                     Explainable
//                   </span>
//                 </div>

//                 <h1 className="mt-4 text-3xl font-semibold tracking-tight text-ui-text md:text-4xl">
//                   Blockchain market intelligence
//                 </h1>

//                 <p className="mt-3 text-sm text-ui-muted md:text-base">
//                   Regimes, persistence, and historical context—built to make trends readable without relying on price noise.
//                 </p>

//                 <div className="mt-5 flex flex-wrap gap-3">
//                   <Link
//                     href="#chains"
//                     className="inline-flex items-center justify-center rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-zinc-200"
//                   >
//                     Explore chains
//                   </Link>
//                   <Link
//                     href="/methodology"
//                     className="inline-flex items-center justify-center rounded-xl border border-ui-border bg-ui-bg/30 px-4 py-2 text-sm font-semibold text-ui-text hover:border-ui-border/70"
//                   >
//                     Read methodology
//                   </Link>
//                 </div>
//               </div>

//               <div className="rounded-2xl border border-ui-border bg-ui-bg/30 px-4 py-3 text-xs text-ui-muted backdrop-blur">
//                 <div className="flex flex-col gap-1">
//                   <div>
//                     Computed (UTC): <span className="text-ui-text">{dataset.computed_at_utc}</span>
//                   </div>
//                   <div>
//                     Methodology: <span className="text-ui-text">{dataset.methodology_version}</span>
//                   </div>
//                 </div>
//               </div>
//             </div>
//           </div>
//         </div>

//         {/* CHAINS - stacked hero cards */}
//         <div id="chains" className="space-y-4">
//           <div>
//             <div className="text-sm font-semibold text-ui-text">Explore chains</div>
//             <div className="mt-1 text-xs text-ui-faint">
//               Full-width signature charts. Hover for exact values. Click to open chain diagnostics.
//             </div>
//             <div className="mt-1 text-xs text-ui-faint">
//               Note: landing pulls {LANDING_DAYS} daily partitions per chain (cached). Increase/decrease in this file if needed.
//             </div>
//           </div>

//           <div className="space-y-4">
//             {chains.map((chain) => (
//               <ChainHeroCard
//                 key={chain}
//                 chain={chain}
//                 metaAsof={asofMeta[chain]}
//                 derivedAsof={asofDerived[chain]}
//                 goldAsof={asofGold[chain]}
//               />
//             ))}
//           </div>
//         </div>
//       </section>
//     </main>
//   );
// }
