import Link from "next/link";
import { CHAIN_LIST, type ChainId } from "@/config/chains";
import { readStorageObject } from "@/lib/storage";
import { computeHistoryDepthDays } from "@/lib/historyDepth";
import { readDatasetManifest } from "@/lib/dataset";
import MobileBottomNav from "@/components/mobile/MobileBottomNav";
import {
  parseMobileChainState,
  regimeColor,
  regimeBg,
  CHAIN_COLORS,
  mobileFreshness,
  type MobileChainState,
} from "@/lib/mobile/data";
import "server-only";

type LandingHero = {
  display_asof?: string;
  asof?: {
    display?: string;
    latest_available?: string;
    gold?: string;
    derived?: string;
    meta?: string;
  };
};

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

function heroDisplayAsOf(hero?: LandingHero | null): string | null {
  return (
    hero?.display_asof ??
    hero?.asof?.display ??
    hero?.asof?.latest_available ??
    hero?.asof?.gold ??
    hero?.asof?.derived ??
    hero?.asof?.meta ??
    null
  );
}

function lagDaysFromIsoDay(date?: string | null): number | null {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const [y, m, d] = date.split("-").map(Number);
  const asOfMs = Date.UTC(y, m - 1, d);
  const now = new Date();
  const todayMs = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const diff = todayMs - asOfMs;
  return diff >= 0 ? Math.floor(diff / 86400000) : null;
}

async function buildChainStates(): Promise<MobileChainState[]> {
  return Promise.all(
    CHAIN_LIST.map(async (chain) => {
      const [meta, hero] = await Promise.all([
        readPublishedJson<Record<string, unknown>>(`data/published/v1/meta/${chain.id}/latest.json`),
        readPublishedJson<LandingHero>(`data/published/v1/landing/${chain.id}/hero.json`),
      ]);

      const parsed = parseMobileChainState(chain.id, chain.label, chain.name, meta as never);
      const displayAsOf = heroDisplayAsOf(hero);
      if (!displayAsOf) return parsed;

      const lagDays = lagDaysFromIsoDay(displayAsOf);
      return {
        ...parsed,
        asOf: displayAsOf,
        lagDays,
        freshnessStatus: mobileFreshness(chain.id as ChainId, lagDays),
      };
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
        On schedule
      </span>
    );
  }
  if (status === "warn") {
    return (
      <span className="flex items-center gap-1.5 text-[11px] text-amber-300">
        <span className="h-2 w-2 rounded-full bg-amber-400" />
        Slightly delayed
      </span>
    );
  }
  if (status === "fail") {
    return (
      <span className="flex items-center gap-1.5 text-[11px] text-red-300">
        <span className="h-2 w-2 rounded-full bg-red-400" />
        Stale
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
    <div className="mt-3">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wider text-slate-500">Confidence</span>
        <span className="text-[11px] font-bold text-slate-200">
          {typeof score === "number" ? score.toFixed(3) : "—"}
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-white/10">
        <div className="h-2 rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: color }} />
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
      className="block overflow-hidden rounded-3xl border border-white/10 shadow-[0_12px_40px_rgba(2,8,23,0.28)] transition-transform active:scale-[0.985]"
      style={{ background: bg }}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-sm font-black"
              style={{
                backgroundColor: `${chainColor}22`,
                color: chainColor,
                border: `1px solid ${chainColor}44`,
              }}
            >
              {state.label}
            </div>
            <div className="min-w-0">
              <div className="text-[14px] font-bold text-white">{state.name}</div>
              <div className="mt-0.5 text-[11px] text-slate-500">
                {state.asOf ?? "—"} · Lag {state.lagDays != null ? `${state.lagDays}d` : "—"}
              </div>
            </div>
          </div>

          <div
            className="shrink-0 rounded-xl px-2.5 py-1 text-[11px] font-black tracking-wider"
            style={{ color, backgroundColor: `${color}22`, border: `1px solid ${color}44` }}
          >
            {state.regimeLabel ?? "—"}
          </div>
        </div>

        <ConfidenceBar score={state.confidenceScore} label={state.regimeLabel} />

        {state.oneLiner ? <p className="mt-3 text-[12px] leading-[1.7] text-slate-300">{state.oneLiner}</p> : null}

        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="text-[11px] text-slate-500">Tap for history, scorecard, and drivers →</span>
          <FreshnessIndicator status={state.freshnessStatus} />
        </div>
      </div>
    </Link>
  );
}

const QUICK_LINKS = [
  { href: "/mobile/track-record", title: "Track record", body: "See what the model has actually published." },
  { href: "/mobile/plans", title: "Plans", body: "Compare Free, Basic, Pro, and archive access." },
  { href: "/mobile/wiki", title: "Wiki", body: "Understand labels, confidence, drivers, and fields." },
  { href: "/mobile/methodology", title: "Methodology", body: "Read the compact model walkthrough for mobile." },
] as const;

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
        <div className="py-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-400">Urd Atlas Mobile</div>
              <div className="mt-0.5 text-[13px] font-bold text-white">Current chain state, simplified for phone screens</div>
            </div>
            <Link href="/?view=desktop" className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-semibold text-slate-200">
              Open desktop
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 space-y-4 px-4 py-4 pb-24">
        <div className="rounded-3xl border border-cyan-500/18 bg-cyan-500/[0.06] p-4">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300/80">Mobile view</div>
          <p className="mt-2 text-[13px] leading-[1.75] text-slate-100">
            You are now visiting the <span className="font-semibold text-white">mobile version of Urd Atlas</span>.
            It is intentionally lighter and easier to scan on a phone. For the full analytical surface,
            longer methodology, and the complete desktop experience, open the site on your desktop or laptop.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
            <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Published days</div>
            <div className="mt-1 text-[28px] font-black text-white">{historyDays ?? "—"}</div>
            <div className="mt-1 text-[11px] text-slate-500">Every day since December 2024</div>
          </div>
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
            <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Dataset as of</div>
            <div className="mt-1 text-[18px] font-black text-white">{publishedAt ?? "—"}</div>
            <div className="mt-1 text-[11px] text-slate-500">Current published archive snapshot</div>
          </div>
        </div>

        <div>
          <div className="mb-2 text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Current chain status</div>
          <div className="space-y-3">
            {states.map((state) => (
              <ChainCard key={state.chain} state={state} />
            ))}
          </div>
        </div>

        <section className="rounded-3xl border border-white/8 bg-white/[0.03] p-4">
          <div className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Continue on mobile</div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {QUICK_LINKS.map((item) => (
              <Link key={item.href} href={item.href} className="rounded-2xl border border-white/8 bg-black/15 p-3 active:bg-white/[0.06]">
                <div className="text-[12px] font-bold text-white">{item.title}</div>
                <div className="mt-1 text-[11px] leading-[1.55] text-slate-400">{item.body}</div>
              </Link>
            ))}
          </div>
        </section>
      </main>

      <MobileBottomNav active="overview" />
    </div>
  );
}
