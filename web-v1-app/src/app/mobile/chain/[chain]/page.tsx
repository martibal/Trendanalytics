// src/app/mobile/chain/[chain]/page.tsx
// Mobile chain detail — visual history, scorecard, drivers

import { notFound } from "next/navigation";
import Link from "next/link";
import { CHAIN_LIST, CHAINS, type ChainId } from "@/config/chains";
import { readStorageObject } from "@/lib/storage";
import { auth } from "@clerk/nextjs/server";
import {
  parseMobileChainState,
  regimeColor,
  regimeBg,
  CHAIN_COLORS,
  mobileLag,
  mobileBand,
} from "@/lib/mobile/data";
import MobileBottomNav from "@/components/mobile/MobileBottomNav";
import MobileChainChart from "@/components/mobile/MobileChainChart";
import "server-only";

function arrayBufferToUtf8(buffer: ArrayBuffer): string {
  return new TextDecoder("utf-8").decode(new Uint8Array(buffer));
}

async function readPublishedJson<T>(path: string): Promise<T | null> {
  const result = await readStorageObject(path);
  if (!result) return null;
  try {
    return JSON.parse(arrayBufferToUtf8(result.body)) as T;
  } catch {
    return null;
  }
}

type MetaHistoryRow = {
  date?: string;
  status?: { label?: string; one_liner?: string };
  regime?: { label?: string; determinism_hash?: string };
  confidence?: { confidence_score?: number };
};

async function buildHistoryRows(
  chain: ChainId,
  window: 30 | 90 | 180 | 365
): Promise<{ date: string; label: string | null; confidence: number | null; oneLiner: string | null }[]> {
  const data = await readPublishedJson<{ rows?: MetaHistoryRow[] }>(
    `data/published/v1/meta/${chain}/last${window}d.json`
  );
  const rows = data?.rows ?? [];
  return rows
    .filter((r) => typeof r.date === "string")
    .map((r) => ({
      date: r.date!,
      label: r.status?.label ?? r.regime?.label ?? null,
      confidence: typeof r.confidence?.confidence_score === "number"
        ? r.confidence.confidence_score
        : null,
      oneLiner: r.status?.one_liner ?? null,
    }))
    .sort((a, b) => b.date.localeCompare(a.date));
}

function ScoreBar({
  label,
  score,
  color,
}: {
  label: string;
  score: number | null;
  color: string;
}) {
  const pct = typeof score === "number" ? Math.max(0, Math.min(100, score)) : 50;
  const isAbove50 = pct > 50;
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] font-semibold text-white">{label}</span>
        <span className="text-[11px] text-slate-400">
          {typeof score === "number" ? Math.round(score) : "—"} / 100
        </span>
      </div>
      <div className="relative h-2 w-full rounded-full bg-white/10">
        {/* Neutral marker */}
        <div className="absolute left-1/2 top-1/2 h-3 w-0.5 -translate-x-1/2 -translate-y-1/2 bg-white/20 rounded-full" />
        {/* Fill */}
        <div
          className="absolute top-0 h-2 rounded-full transition-all duration-700"
          style={{
            left: isAbove50 ? "50%" : `${pct}%`,
            width: `${Math.abs(pct - 50)}%`,
            backgroundColor: isAbove50 ? color : "#3B82F6",
          }}
        />
      </div>
      <div className="flex justify-between mt-0.5">
        <span className="text-[9px] text-slate-600">Low</span>
        <span className="text-[9px] text-slate-600">Neutral</span>
        <span className="text-[9px] text-slate-600">High</span>
      </div>
    </div>
  );
}

function TrendArrow({ trend }: { trend: string | null }) {
  if (trend === "HEATING") return <span className="text-amber-300">↑</span>;
  if (trend === "COOLING") return <span className="text-blue-300">↓</span>;
  return <span className="text-slate-500">→</span>;
}

export default async function MobileChainPage({
  params,
  searchParams,
}: {
  params: Promise<{ chain: string }>;
  searchParams?: Promise<{ w?: string }>;
}) {
  const resolvedParams = await params;
  const resolvedSearch = searchParams ? await searchParams : {};

  const chainId = resolvedParams.chain as ChainId;
  const cfg = CHAINS[chainId];
  if (!cfg) notFound();

  const { userId } = await auth();
  const isSignedIn = !!userId;

  // Window selection
  const rawW = resolvedSearch.w ?? "30";
  const windowDays = (
    isSignedIn
      ? [30, 90, 180, 365]
      : [30]
  ).includes(Number(rawW))
    ? (Number(rawW) as 30 | 90 | 180 | 365)
    : 30;

  const [meta, historyRows] = await Promise.all([
    readPublishedJson<Record<string, unknown>>(
      `data/published/v1/meta/${chainId}/latest.json`
    ),
    buildHistoryRows(chainId, windowDays),
  ]);

  const state = parseMobileChainState(chainId, cfg.label, cfg.name, meta as never);
  const color = regimeColor(state.regimeLabel);
  const bg = regimeBg(state.regimeLabel);
  const chainColor = CHAIN_COLORS[chainId];

  const navKey =
    chainId === "bitcoin" ? "btc"
    : chainId === "ethereum" ? "eth"
    : "l2";

  return (
    <div className="flex min-h-screen flex-col bg-[#0A0E1A]">
      {/* Header */}
      <header
        className="sticky top-0 z-10 border-b border-white/8 backdrop-blur-sm px-4 pt-safe-top"
        style={{ background: bg }}
      >
        <div className="flex items-center gap-3 py-3">
          <Link href="/mobile" className="text-slate-400 text-lg pr-1">←</Link>
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-black"
            style={{ backgroundColor: chainColor + "22", color: chainColor }}
          >
            {cfg.label}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[14px] font-bold text-white">{cfg.name}</div>
            <div className="text-[10px] text-slate-500">
              {state.asOf ?? "—"} · Lag {state.lagDays != null ? `${state.lagDays}d` : "—"}
            </div>
          </div>
          <div
            className="rounded-lg px-2.5 py-1 text-[10px] font-black tracking-wider shrink-0"
            style={{ color, backgroundColor: color + "22", border: `1px solid ${color}44` }}
          >
            {state.regimeLabel ?? "—"}
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 py-4 pb-24 space-y-4">

        {/* Confidence + one-liner */}
        <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider">Confidence</div>
              <div className="text-[24px] font-black text-white mt-0.5">
                {typeof state.confidenceScore === "number"
                  ? state.confidenceScore.toFixed(3)
                  : "—"}
              </div>
            </div>
            <div
              className="rounded-xl px-3 py-1.5 text-[11px] font-bold"
              style={{ color, backgroundColor: color + "18", border: `1px solid ${color}33` }}
            >
              {state.confidenceBand}
            </div>
          </div>
          <div className="h-1.5 w-full rounded-full bg-white/10">
            <div
              className="h-1.5 rounded-full"
              style={{
                width: `${Math.round((state.confidenceScore ?? 0) * 100)}%`,
                backgroundColor: color,
              }}
            />
          </div>
          {state.oneLiner && (
            <p className="mt-3 text-[12px] leading-[1.65] text-slate-400">
              {state.oneLiner}
            </p>
          )}
        </div>

        {/* Scorecard */}
        <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4 space-y-4">
          <div className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
            Scorecard
          </div>
          <ScoreBar
            label="Demand"
            score={state.scorecard.demand?.score ?? null}
            color="#00FF88"
          />
          <ScoreBar
            label="Friction"
            score={state.scorecard.friction?.score ?? null}
            color="#FF4444"
          />
          <ScoreBar
            label="Capacity"
            score={state.scorecard.capacity?.score ?? null}
            color="#FF4444"
          />
        </div>

        {/* Drivers */}
        {state.drivers.length > 0 && (
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500 mb-3">
              Top drivers
            </div>
            <div className="space-y-3">
              {state.drivers.map((d) => (
                <div key={d.metric} className="flex items-start gap-3">
                  <TrendArrow trend={d.trend} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[12px] font-semibold text-white truncate">
                        {d.metric}
                      </span>
                      <span className="text-[10px] text-slate-500 shrink-0">
                        {d.axis}
                      </span>
                    </div>
                    <div className="flex gap-4 mt-0.5">
                      {d.zRobust != null && (
                        <span className="text-[10px] text-slate-400">
                          z {d.zRobust > 0 ? "+" : ""}{d.zRobust.toFixed(2)}
                        </span>
                      )}
                      {d.pct90d != null && (
                        <span className="text-[10px] text-slate-400">
                          {Math.round(d.pct90d)}th pct
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* History chart */}
        <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
              History
            </div>
            {/* Window selector */}
            <div className="flex gap-1">
              {[
                { w: 30, label: "30d" },
                { w: 90, label: "90d" },
                { w: 180, label: "180d" },
                { w: 365, label: "365d" },
              ].map(({ w, label }) => {
                const isActive = windowDays === w;
                const isLocked = !isSignedIn && w > 30;
                return (
                  <Link
                    key={w}
                    href={
                      isLocked
                        ? "https://urdatlas.com/sign-up"
                        : `/mobile/chain/${chainId}?w=${w}`
                    }
                    className={`rounded-lg px-2 py-1 text-[10px] font-bold transition-colors ${
                      isActive
                        ? "bg-cyan-500/20 text-cyan-300"
                        : isLocked
                        ? "text-slate-600"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {label}{isLocked ? " ↑" : ""}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Chart component (client) */}
          <MobileChainChart
            rows={historyRows}
            chainColor={chainColor}
          />
        </div>

        {/* History list */}
        <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
          <div className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500 mb-3">
            Published labels
          </div>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {historyRows.slice(0, 60).map((row) => {
              const rc = regimeColor(row.label);
              return (
                <div
                  key={row.date}
                  className="flex items-center gap-3 py-1.5 border-b border-white/5 last:border-0"
                >
                  <span className="text-[11px] text-slate-500 w-24 shrink-0">{row.date}</span>
                  <span
                    className="rounded-md px-2 py-0.5 text-[10px] font-black tracking-wide shrink-0"
                    style={{ color: rc, backgroundColor: rc + "18" }}
                  >
                    {row.label ?? "—"}
                  </span>
                  <span className="text-[10px] text-slate-600 truncate">
                    {typeof row.confidence === "number"
                      ? row.confidence.toFixed(3)
                      : "—"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Determinism hash */}
        {state.determinismHash && (
          <div className="rounded-xl border border-white/6 bg-white/[0.02] px-4 py-3">
            <div className="text-[10px] text-slate-600 mb-1">Determinism hash</div>
            <div className="font-mono text-[11px] text-slate-400 break-all">
              {state.determinismHash}
            </div>
          </div>
        )}

        {/* Desktop CTA */}
        <div className="rounded-xl border border-cyan-500/15 bg-cyan-500/5 px-4 py-3 text-center">
          <div className="text-[11px] text-slate-400">
            Want JSON access for {cfg.label}?
          </div>
          <a
            href="https://urdatlas.com/plans"
            className="mt-1 inline-block text-[12px] font-semibold text-cyan-400"
          >
            Get API access → urdatlas.com/plans
          </a>
        </div>
      </main>

      <MobileBottomNav active={navKey} />
    </div>
  );
}
