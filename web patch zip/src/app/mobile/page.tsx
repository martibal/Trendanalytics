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
  asof?: { display?: string; latest_available?: string; gold?: string; derived?: string; meta?: string };
};

function arrayBufferToUtf8(buffer: ArrayBuffer): string {
  return new TextDecoder("utf-8").decode(new Uint8Array(buffer));
}

async function readPublishedJson<T>(path: string): Promise<T | null> {
  const result = await readStorageObject(path);
  if (!result) return null;
  try { return JSON.parse(arrayBufferToUtf8(result.body)) as T; }
  catch { return null; }
}

function heroDisplayAsOf(hero?: LandingHero | null): string | null {
  return hero?.display_asof ?? hero?.asof?.display ?? hero?.asof?.latest_available ?? null;
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
      return { ...parsed, asOf: displayAsOf, lagDays, freshnessStatus: mobileFreshness(chain.id as ChainId, lagDays) };
    })
  );
}

function FreshnessIndicator({ status }: { status: string }) {
  if (status === "ok") return (
    <span className="flex items-center gap-1.5 text-[11px] text-emerald-300">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-60" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
      </span>
      On schedule
    </span>
  );
  if (status === "warn") return (
    <span className="flex items-center gap-1.5 text-[11px] text-amber-300">
      <span className="h-2 w-2 rounded-full bg-amber-400" />
      Delayed
    </span>
  );
  if (status === "fail") return (
    <span className="flex items-center gap-1.5 text-[11px] text-red-300">
      <span className="h-2 w-2 rounded-full bg-red-400" />
      Stale
    </span>
  );
  return (
    <span className="flex items-center gap-1.5 text-[11px] text-slate-400">
      <span className="h-2 w-2 rounded-full bg-slate-500" />
      Unknown
    </span>
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
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-sm font-black"
              style={{ backgroundColor: `${chainColor}22`, color: chainColor, border: `1px solid ${chainColor}44` }}
            >
              {state.label}
            </div>
            <div className="min-w-0">
              <div className="text-[14px] font-bold text-white">{state.name}</div>
              <div className="mt-0.5 text-[11px] text-slate-300">
                {state.asOf ?? "—"} · {state.lagDays != null ? `${state.lagDays}d lag` : "—"}
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

        {/* Confidence */}
        <div className="mt-3">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider text-slate-300">Confidence</span>
            <span className="text-[11px] font-bold text-slate-200">
              {typeof state.confidenceScore === "number" ? state.confidenceScore.toFixed(3) : "—"}
              <span className="ml-1.5 font-normal text-slate-300">{state.confidenceBand}</span>
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-white/10">
            <div className="h-2 rounded-full transition-all duration-700"
              style={{ width: `${typeof state.confidenceScore === "number" ? Math.round(state.confidenceScore * 100) : 0}%`, backgroundColor: color }}
            />
          </div>
        </div>

        {/* Scorecard mini — three axes in one row */}
        {(state.scorecard.demand || state.scorecard.friction || state.scorecard.capacity) && (
          <div className="mt-3 flex gap-2">
            {[
              { label: "D", value: state.scorecard.demand?.score, title: "Demand" },
              { label: "Fr", value: state.scorecard.friction?.score, title: "Friction" },
              { label: "Ca", value: state.scorecard.capacity?.score, title: "Capacity" },
            ].map(({ label, value, title }) => (
              <div key={label} className="flex-1 rounded-xl border border-white/6 bg-black/15 px-2 py-1.5 text-center">
                <div className="text-[9px] text-slate-400">{title}</div>
                <div className="text-[13px] font-black text-white">
                  {typeof value === "number" ? Math.round(value) : "—"}
                </div>
              </div>
            ))}
          </div>
        )}

        {state.oneLiner ? (
          <p className="mt-3 text-[12px] leading-[1.7] text-slate-300">{state.oneLiner}</p>
        ) : null}

        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="text-[11px] text-slate-300">History, drivers, scorecard →</span>
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

  const publishedAt = dataset?.published_at ? new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Oslo", year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(dataset.published_at)) : null;
  const allOnSchedule = states.every(s => s.freshnessStatus === "ok");

  return (
    <div className="flex min-h-screen flex-col bg-[#0A0E1A]">
      <header className="sticky top-0 z-10 border-b border-white/8 bg-[#0A0E1A]/95 px-4 pt-safe-top backdrop-blur-sm">
        <div className="flex items-start justify-between gap-3 py-3">
          <div>
            <div className="text-[11px] font-black uppercase tracking-[0.22em] text-cyan-400">Urd Atlas</div>
            <div className="mt-0.5 text-[13px] font-bold text-white">On-chain regime classification</div>
          </div>
          <div className="text-right">
            <div className="text-[11px] font-bold text-white">{publishedAt ?? "—"}</div>
            <div className="mt-0.5 text-[10px] text-slate-300">{historyDays ?? "—"} published days</div>
          </div>
        </div>
      </header>

      <main className="flex-1 space-y-4 px-4 py-4 pb-24">

        {/* Pipeline status banner */}
        <div className={`rounded-2xl border px-4 py-3 flex items-center justify-between ${
          allOnSchedule
            ? "border-emerald-500/20 bg-emerald-500/5"
            : "border-amber-500/20 bg-amber-500/5"
        }`}>
          <div>
            <div className={`text-[11px] font-bold ${allOnSchedule ? "text-emerald-300" : "text-amber-300"}`}>
              {allOnSchedule ? "Pipeline running on schedule" : "Some chains delayed"}
            </div>
            <div className="text-[10px] text-slate-300 mt-0.5">
              Expected refresh: ~09:00 and 21:00 Europe/Oslo
            </div>
          </div>
          <div className="relative flex h-2.5 w-2.5 shrink-0">
            {allOnSchedule && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-50" />}
            <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${allOnSchedule ? "bg-emerald-400" : "bg-amber-400"}`} />
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
            <div className="text-[10px] uppercase tracking-[0.18em] text-slate-300">Published days</div>
            <div className="mt-1 text-[28px] font-black text-white">{historyDays ?? "—"}</div>
            <div className="mt-1 text-[10px] text-slate-300">Since December 2024</div>
          </div>
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
            <div className="text-[10px] uppercase tracking-[0.18em] text-slate-300">Chains covered</div>
            <div className="mt-1 text-[28px] font-black text-white">4</div>
            <div className="mt-1 text-[10px] text-slate-300">BTC · ETH · ARB · BASE</div>
          </div>
        </div>

        {/* Chain cards */}
        <div>
          <div className="mb-2 text-[10px] font-black uppercase tracking-[0.22em] text-slate-300">
            Current chain state
          </div>
          <div className="space-y-3">
            {states.map((state) => (
              <ChainCard key={state.chain} state={state} />
            ))}
          </div>
        </div>

        {/* What you are looking at */}
        <section className="rounded-3xl border border-white/8 bg-white/[0.03] p-5">
          <div className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-300 mb-3">
            What these labels mean
          </div>
          <div className="space-y-2.5">
            {[
              { label: "STABLE", color: "#00FF88", desc: "All dimensions within this chain's own recent historical norms." },
              { label: "HEATING", color: "#FFD700", desc: "Demand is building. 7-day momentum running ahead of 30-day trend." },
              { label: "CONGESTED", color: "#FF4444", desc: "Sustained pressure across capacity and friction simultaneously." },
              { label: "CHEAP", color: "#3B82F6", desc: "Fees and demand materially below this chain's normal range." },
              { label: "UNKNOWN/DEGRADED", color: "#6B7280", desc: "Evidence too weak to publish a named label — shown instead of guessing." },
            ].map(({ label, color, desc }) => (
              <div key={label} className="flex items-start gap-3">
                <div className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                <div>
                  <span className="text-[11px] font-black" style={{ color }}>{label}</span>
                  <span className="ml-2 text-[11px] text-slate-400">{desc}</span>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[10px] text-slate-400 leading-[1.6]">
            All labels are chain-relative. HEATING on Ethereum means Ethereum is running hotter than Ethereum normally does — not hotter than Bitcoin.
          </p>
        </section>

        {/* Confidence explained */}
        <section className="rounded-3xl border border-white/8 bg-white/[0.03] p-5">
          <div className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-300 mb-3">
            How to read confidence
          </div>
          <div className="space-y-2">
            {[
              { range: "≥ 0.70", band: "Good", desc: "Strong evidence. Label is well-supported.", color: "#00FF88" },
              { range: "0.40–0.70", band: "Caution", desc: "Sufficient to publish, but read with care.", color: "#FFD700" },
              { range: "< 0.40", band: "Degraded", desc: "Below publish gate — UNKNOWN/DEGRADED shown instead.", color: "#6B7280" },
            ].map(({ range, band, desc, color }) => (
              <div key={band} className="flex items-start gap-3 rounded-xl border border-white/5 bg-black/10 px-3 py-2.5">
                <code className="shrink-0 font-mono text-[10px] text-slate-300 w-16">{range}</code>
                <div>
                  <span className="text-[11px] font-bold" style={{ color }}>{band}</span>
                  <span className="ml-2 text-[11px] text-slate-400">{desc}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Quick navigation */}
        <section className="rounded-3xl border border-white/8 bg-white/[0.03] p-4">
          <div className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-300 mb-3">
            Explore
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {[
              { href: "/mobile/track-record", title: "Track record", body: "What the model has actually been publishing day by day." },
              { href: "/mobile/wiki", title: "Wiki", body: "Definitions for every term, label, and field." },
              { href: "/mobile/methodology", title: "Methodology", body: "How the pipeline works and how labels are assigned." },
              { href: "/mobile/thresholds", title: "Thresholds", body: "The exact thresholds and banding rules used." },
              { href: "/mobile/plans", title: "Plans", body: "Free, Basic, and Pro — what each includes." },
              { href: "/mobile/api-docs", title: "API", body: "How to fetch Gold, Meta, and Derived JSON." },
            ].map((item) => (
              <Link key={item.href} href={item.href} className="rounded-2xl border border-white/8 bg-black/15 p-3 active:bg-white/[0.06]">
                <div className="text-[12px] font-bold text-white">{item.title}</div>
                <div className="mt-1 text-[11px] leading-[1.55] text-slate-400">{item.body}</div>
              </Link>
            ))}
          </div>
        </section>

        {/* Desktop bridge */}
        <div className="rounded-2xl border border-white/6 bg-white/[0.02] px-4 py-3 text-center">
          <div className="text-[11px] text-slate-300">Full analysis, API, and schema reference</div>
          <Link href="/?view=desktop" className="mt-1 inline-block text-[12px] font-semibold text-cyan-400">
            Open desktop version → urdatlas.com
          </Link>
        </div>
      </main>

      <MobileBottomNav active="overview" />
    </div>
  );
}
