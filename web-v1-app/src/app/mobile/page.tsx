// src/app/mobile/page.tsx
// Mobile home screen — daily snapshot of all four chains

import Link from "next/link";
import { CHAIN_LIST } from "@/config/chains";
import { readStorageObject } from "@/lib/storage";
import {
  parseMobileChainState,
  regimeColor,
  regimeBg,
  CHAIN_COLORS,
  type MobileChainState,
} from "@/lib/mobile/data";
import { computeHistoryDepthDays } from "@/lib/historyDepth";
import { readDatasetManifest } from "@/lib/dataset";
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

async function buildChainStates(): Promise<MobileChainState[]> {
  return Promise.all(
    CHAIN_LIST.map(async (chain) => {
      const meta = await readPublishedJson<Record<string, unknown>>(
        `data/published/v1/meta/${chain.id}/latest.json`
      );
      return parseMobileChainState(chain.id, chain.label, chain.name, meta as never);
    })
  );
}

function FreshnessIndicator({ status }: { status: string }) {
  if (status === "ok") {
    return (
      <span className="flex items-center gap-1.5 text-[11px] text-emerald-300">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
        </span>
        Pipeline active
      </span>
    );
  }
  if (status === "warn") {
    return (
      <span className="flex items-center gap-1.5 text-[11px] text-amber-300">
        <span className="h-2 w-2 rounded-full bg-amber-400" />
        Data delayed
      </span>
    );
  }
  if (status === "fail") {
    return (
      <span className="flex items-center gap-1.5 text-[11px] text-red-300">
        <span className="h-2 w-2 rounded-full bg-red-400" />
        Data stale
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5 text-[11px] text-slate-400">
      <span className="h-2 w-2 rounded-full bg-slate-500" />
      Unknown
    </span>
  );
}

function ConfidenceBar({
  score,
  label,
}: {
  score: number | null;
  label: string | null;
}) {
  const pct = typeof score === "number" ? Math.round(score * 100) : 0;
  const color = regimeColor(label);
  return (
    <div className="mt-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-slate-500 uppercase tracking-wider">
          Confidence
        </span>
        <span className="text-[11px] font-bold text-slate-200">
          {typeof score === "number" ? score.toFixed(3) : "—"}
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-white/10">
        <div
          className="h-1.5 rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function ChainCard({ state }: { state: MobileChainState }) {
  const color = regimeColor(state.regimeLabel);
  const bg = regimeBg(state.regimeLabel);
  const chainColor = CHAIN_COLORS[state.chain];

  return (
    <Link
      href={`/mobile/chain/${state.chain}`}
      className="block rounded-2xl border border-white/10 overflow-hidden active:scale-[0.98] transition-transform"
      style={{ background: bg }}
    >
      <div className="p-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl text-sm font-black"
              style={{
                backgroundColor: chainColor + "22",
                color: chainColor,
                border: `1px solid ${chainColor}44`,
              }}
            >
              {state.label}
            </div>
            <div>
              <div className="text-[13px] font-bold text-white">{state.name}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                {state.asOf ?? "—"} · Lag {state.lagDays != null ? `${state.lagDays}d` : "—"}
              </div>
            </div>
          </div>

          {/* Regime label */}
          <div
            className="rounded-xl px-2.5 py-1 text-[11px] font-black tracking-wider"
            style={{
              color,
              backgroundColor: color + "22",
              border: `1px solid ${color}44`,
            }}
          >
            {state.regimeLabel ?? "—"}
          </div>
        </div>

        {/* Confidence bar */}
        <ConfidenceBar score={state.confidenceScore} label={state.regimeLabel} />

        {/* One-liner */}
        {state.oneLiner && (
          <p className="mt-2.5 text-[11px] leading-[1.6] text-slate-400">
            {state.oneLiner}
          </p>
        )}

        {/* Tap hint */}
        <div className="mt-2.5 flex items-center justify-between">
          <span className="text-[10px] text-slate-600">
            Tap for history and drivers →
          </span>
          <FreshnessIndicator status={state.freshnessStatus} />
        </div>
      </div>
    </Link>
  );
}

export default async function MobileOverviewPage() {
  const [states, dataset] = await Promise.all([
    buildChainStates(),
    readDatasetManifest(),
  ]);
  const historyDays = dataset ? computeHistoryDepthDays(dataset) : null;
  const publishedAt = dataset?.published_at?.slice(0, 10) ?? null;

  return (
    <div className="flex min-h-screen flex-col bg-[#0A0E1A]">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-white/8 bg-[#0A0E1A]/95 backdrop-blur-sm px-4 pt-safe-top">
        <div className="flex items-center justify-between py-3">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-400">
              Urd Atlas
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              On-chain regime classification
            </div>
          </div>
          <div className="text-right">
            <div className="text-[11px] font-bold text-white">
              {publishedAt ?? "—"}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              {historyDays ?? "—"} published days
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 px-4 py-4 pb-24 space-y-3">
        {/* Section label */}
        <div className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-500 mb-1">
          Current chain state
        </div>

        {/* Chain cards */}
        {states.map((state) => (
          <ChainCard key={state.chain} state={state} />
        ))}

        {/* Footer strip */}
        <div className="mt-4 rounded-xl border border-white/6 bg-white/[0.02] px-4 py-3 text-center">
          <div className="text-[10px] text-slate-500 leading-[1.7]">
            {historyDays ?? "—"} published days · every day since December 2024
          </div>
          <a
            href="https://urdatlas.com"
            className="mt-1.5 inline-block text-[11px] font-semibold text-cyan-400"
          >
            Full analysis and API → urdatlas.com
          </a>
        </div>
      </main>

      {/* Bottom nav */}
      <MobileBottomNav active="overview" />
    </div>
  );
}

// Re-export for use in other mobile pages
export function MobileBottomNav({ active }: { active: string }) {
  const tabs = [
    { key: "overview", label: "Overview", href: "/mobile", icon: "◉" },
    { key: "btc", label: "BTC", href: "/mobile/chain/bitcoin", icon: "₿" },
    { key: "eth", label: "ETH", href: "/mobile/chain/ethereum", icon: "Ξ" },
    { key: "l2", label: "L2s", href: "/mobile/chain/arbitrum", icon: "⬡" },
    { key: "wiki", label: "Wiki", href: "/mobile/wiki", icon: "⊞" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-white/8 bg-[#0A0E1A]/98 backdrop-blur-sm pb-safe-bottom">
      <div className="flex">
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            href={tab.href}
            className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-semibold transition-colors ${
              active === tab.key
                ? "text-cyan-400"
                : "text-slate-500 active:text-slate-300"
            }`}
          >
            <span className="text-[16px] leading-none">{tab.icon}</span>
            {tab.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
