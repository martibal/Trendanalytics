import Link from "next/link";
import { CHAIN_LIST } from "@/config/chains";
import { readStorageObject } from "@/lib/storage";
import { computeHistoryDepthDays } from "@/lib/historyDepth";
import { readDatasetManifest } from "@/lib/dataset";
import MobileBottomNav from "@/components/mobile/MobileBottomNav";
import {
  parseMobileChainState,
  regimeColor,
  regimeBg,
  CHAIN_COLORS,
  type MobileChainState,
} from "@/lib/mobile/data";
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

function ConfidenceBar({ score, label }: { score: number | null; label: string | null }) {
  const pct = typeof score === "number" ? Math.round(score * 100) : 0;
  const color = regimeColor(label);
  return (
    <div className="mt-2">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wider text-slate-500">Confidence</span>
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
      className="block overflow-hidden rounded-2xl border border-white/10 transition-transform active:scale-[0.98]"
      style={{ background: bg }}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl text-sm font-black"
              style={{
                backgroundColor: `${chainColor}22`,
                color: chainColor,
                border: `1px solid ${chainColor}44`,
              }}
            >
              {state.label}
            </div>
            <div>
              <div className="text-[13px] font-bold text-white">{state.name}</div>
              <div className="mt-0.5 text-[10px] text-slate-500">
                {state.asOf ?? "—"} · Lag {state.lagDays != null ? `${state.lagDays}d` : "—"}
              </div>
            </div>
          </div>

          <div
            className="rounded-xl px-2.5 py-1 text-[11px] font-black tracking-wider"
            style={{
              color,
              backgroundColor: `${color}22`,
              border: `1px solid ${color}44`,
            }}
          >
            {state.regimeLabel ?? "—"}
          </div>
        </div>

        <ConfidenceBar score={state.confidenceScore} label={state.regimeLabel} />

        {state.oneLiner ? (
          <p className="mt-2.5 text-[11px] leading-[1.6] text-slate-400">{state.oneLiner}</p>
        ) : null}

        <div className="mt-2.5 flex items-center justify-between">
          <span className="text-[10px] text-slate-600">Tap for history and drivers →</span>
          <FreshnessIndicator status={state.freshnessStatus} />
        </div>
      </div>
    </Link>
  );
}

export default async function MobileOverviewPage() {
  const [states, dataset, historyDays] = await Promise.all([
    buildChainStates(),
    readDatasetManifest(),
    computeHistoryDepthDays(),
  ]);
  const publishedAt = dataset?.published_at?.slice(0, 10) ?? null;

  return (
    <div className="flex min-h-screen flex-col bg-[#0A0E1A]">
      <header className="sticky top-0 z-10 border-b border-white/8 bg-[#0A0E1A]/95 px-4 pt-safe-top backdrop-blur-sm">
        <div className="flex items-center justify-between py-3">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-400">
              Urd Atlas Mobile
            </div>
            <div className="mt-0.5 text-[11px] text-slate-500">Current chain state first</div>
          </div>
          <div className="text-right">
            <div className="text-[11px] font-bold text-white">{publishedAt ?? "—"}</div>
            <div className="mt-0.5 text-[10px] text-slate-500">{historyDays ?? "—"} published days</div>
          </div>
        </div>
      </header>

      <main className="flex-1 space-y-4 px-4 py-4 pb-24">
        <section className="rounded-2xl border border-cyan-500/15 bg-cyan-500/[0.04] p-4">
          <div className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-300/80">How to use this</div>
          <p className="mt-2 text-[13px] leading-[1.7] text-slate-200">
            Start with the current status cards below. Then open a chain for recent history,
            drivers, confidence, and context.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href="/mobile/track-record" className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-slate-200">
              Track record
            </Link>
            <Link href="/mobile/plans" className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-slate-200">
              Plans
            </Link>
            <Link href="/mobile/wiki" className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-slate-200">
              Wiki
            </Link>
          </div>
        </section>

        <div className="mb-1 text-[9px] font-black uppercase tracking-[0.25em] text-slate-500">Current chain state</div>

        {states.map((state) => (
          <ChainCard key={state.chain} state={state} />
        ))}

        <div className="rounded-xl border border-white/6 bg-white/[0.02] px-4 py-3 text-center">
          <div className="text-[10px] leading-[1.7] text-slate-500">
            {historyDays ?? "—"} published days · every day since December 2024
          </div>
          <Link href="/?view=desktop" className="mt-1.5 inline-block text-[11px] font-semibold text-cyan-400">
            Open desktop analysis →
          </Link>
        </div>
      </main>

      <MobileBottomNav active="overview" />
    </div>
  );
}
