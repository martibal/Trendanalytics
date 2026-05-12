import Link from "next/link";

import { CHAIN_LIST } from "@/config/chains";
import { loadSiteBriefBundle } from "@/lib/briefs/loadSiteBriefBundle";
import type { RegimeLabel, SiteBriefBundle, SiteBriefChain, SiteBriefSeriesDay } from "@/lib/briefs/types";

import "server-only";

const LABEL_COLORS: Record<RegimeLabel, { text: string; border: string; bg: string; dot: string }> = {
  STABLE: { text: "text-emerald-700", border: "border-emerald-400/55", bg: "bg-emerald-50", dot: "bg-emerald-500" },
  HEATING: { text: "text-amber-700", border: "border-amber-400/60", bg: "bg-amber-50", dot: "bg-amber-500" },
  CONGESTED: { text: "text-rose-700", border: "border-rose-400/60", bg: "bg-rose-50", dot: "bg-rose-500" },
  CHEAP: { text: "text-sky-700", border: "border-sky-400/60", bg: "bg-sky-50", dot: "bg-sky-500" },
  "UNKNOWN/DEGRADED": { text: "text-slate-700", border: "border-slate-400/60", bg: "bg-slate-100", dot: "bg-slate-400" },
};

function formatConfidence(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  const pct = Math.abs(value) <= 1 ? value * 100 : value;
  return `${Math.round(Math.max(0, Math.min(100, pct)))}%`;
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

function RegimePill({ label }: { label: RegimeLabel | null }) {
  const safe = label ?? "UNKNOWN/DEGRADED";
  const colors = LABEL_COLORS[safe];
  return (
    <span className={`inline-flex rounded-md border px-2.5 py-1 text-[12px] font-black uppercase tracking-[0.04em] ${colors.border} ${colors.bg} ${colors.text}`}>
      {safe}
    </span>
  );
}

function sparklinePath(days: SiteBriefSeriesDay[], width = 150, height = 42): string {
  const usable = days.slice(-14).filter((day) => typeof day.confidence_score === "number");
  if (usable.length < 2) return "";
  const values = usable.map((day) => Math.max(0, Math.min(1, day.confidence_score ?? 0)));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  return values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width;
      const y = height - ((value - min) / range) * (height - 4) - 2;
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

function chainConfig(chainId: string) {
  return CHAIN_LIST.find((chain) => chain.id === chainId);
}

function seriesFor(bundle: SiteBriefBundle, chainId: string): SiteBriefSeriesDay[] {
  return bundle.series_30d.find((series) => series.chain === chainId)?.days ?? [];
}

function BriefCard({ brief, bundle }: { brief: SiteBriefChain; bundle: SiteBriefBundle }) {
  const chain = chainConfig(brief.chain);
  const label = brief.label ?? "UNKNOWN/DEGRADED";
  const colors = LABEL_COLORS[label];
  const days = seriesFor(bundle, brief.chain);
  const path = sparklinePath(days);

  return (
    <article className="rounded-[28px] border border-[#c5d8ee] bg-white/88 p-6 shadow-[0_20px_62px_rgba(13,36,71,0.10)]">
      <div className="flex items-start justify-between gap-5">
        <div className="flex items-center gap-4">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#edf6ff] text-[30px] font-black text-[#0d2447] shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
            {chain?.icon ?? brief.chain.slice(0, 1).toUpperCase()}
          </span>
          <div>
            <h2 className="text-[28px] font-black tracking-[-0.04em] text-[#0d2447]">{chain?.name ?? brief.chain}</h2>
            <p className="mt-1 text-[13px] font-bold text-[#557099]">Updated through {formatDate(brief.updated_through)}</p>
          </div>
        </div>
        <div className="text-right">
          <RegimePill label={label} />
          <div className="mt-2 text-[13px] font-black text-[#0d2447]">Confidence {formatConfidence(brief.confidence?.latest)}</div>
        </div>
      </div>

      <p className="mt-5 text-[17px] font-bold leading-7 text-[#28476e]">
        {brief.headline ?? "The latest published 7-day brief is available for this chain."}
      </p>

      <div className="mt-5 rounded-2xl border border-[#d6e4f4] bg-[#f8fbff] p-4">
        <div className="mb-3 text-[12px] font-black uppercase tracking-[0.14em] text-[#557099]">Latest published path</div>
        {path ? (
          <svg viewBox="0 0 150 42" className="h-12 w-full max-w-[220px]" aria-hidden="true">
            <path d="M0 41.5H150" stroke="rgba(13,36,71,0.14)" />
            <path d={path} fill="none" stroke="currentColor" className={colors.text} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.8" />
          </svg>
        ) : (
          <div className="text-[13px] font-semibold text-[#60789c]">Sparkline unavailable for this chain.</div>
        )}
        <div className="mt-4 flex flex-wrap gap-1.5">
          {days.slice(-7).map((day) => (
            <span key={`${brief.chain}-${day.date}`} className={`rounded-md border px-2 py-1 text-[10px] font-black ${LABEL_COLORS[day.label].border} ${LABEL_COLORS[day.label].bg} ${LABEL_COLORS[day.label].text}`}>
              {day.label}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-3 text-[14px] font-semibold leading-6 text-[#415f86]">
        <div><strong className="text-[#0d2447]">What changed:</strong> The latest published label path is summarized from daily Meta rows.</div>
        <div><strong className="text-[#0d2447]">What drove it:</strong> Primary drivers remain available in the underlying JSON for verification.</div>
        <div><strong className="text-[#0d2447]">Persistence:</strong> Read as historical support, not as a prediction or recommendation.</div>
      </div>
    </article>
  );
}

export default async function BriefsPage() {
  const bundle = await loadSiteBriefBundle();

  if (!bundle || bundle.brief_status === "unavailable") {
    return (
      <main className="min-h-screen bg-[#edf6ff] px-6 py-16 text-[#0d2447]">
        <div className="mx-auto max-w-3xl rounded-[28px] border border-[#c5d8ee] bg-white p-8 shadow-[0_20px_62px_rgba(13,36,71,0.10)]">
          <Link href="/" className="text-[13px] font-black text-[#1d5fce]">← Back to Urd Atlas</Link>
          <h1 className="mt-6 text-[42px] font-black tracking-[-0.05em]">Briefs are not available yet.</h1>
          <p className="mt-4 text-[17px] font-semibold leading-7 text-[#557099]">
            The Briefs page appears when the published site brief bundle exists. Meta JSON and the public track record may still be available.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#031329_0%,#06182d_28%,#edf6ff_28%,#f7fbff_100%)] text-[#0d2447]">
      <section className="px-6 pb-16 pt-8 text-white sm:px-8 lg:px-10">
        <div className="mx-auto max-w-[1320px]">
          <nav className="flex items-center justify-between gap-6">
            <Link href="/" className="inline-flex items-center gap-3">
              <img src="/web-bilder/ygg-transparent.png" alt="" className="h-10 w-10 object-contain" />
              <span className="text-[25px] font-black tracking-[-0.045em]">Urd Atlas</span>
            </Link>
            <Link href="/api-docs/samples" className="rounded-xl bg-white px-5 py-3 text-[13px] font-black text-[#071426]">Inspect JSON</Link>
          </nav>

          <div className="mt-14 max-w-4xl">
            <div className="text-[12px] font-black uppercase tracking-[0.22em] text-[#9fe8ff]">Briefs</div>
            <h1 className="mt-3 text-[52px] font-black leading-[0.98] tracking-[-0.06em] sm:text-[66px]">
              Read the latest blockchain week in seconds.
            </h1>
            <p className="mt-6 text-[19px] font-semibold leading-8 text-[#d8e9ff]">
              Briefs turn published daily Meta rows into a short descriptive read: what changed, what drove it, and whether the latest label appears isolated or persistent. Daily, not intraday. Descriptive, not predictive.
            </p>
          </div>
        </div>
      </section>

      <section className="px-6 py-10 sm:px-8 lg:px-10">
        <div className="mx-auto grid max-w-[1320px] gap-5 lg:grid-cols-2">
          {CHAIN_LIST.map((chain) => {
            const brief = bundle.chains.find((item) => item.chain === chain.id);
            return brief ? <BriefCard key={chain.id} brief={brief} bundle={bundle} /> : null;
          })}
        </div>
      </section>
    </main>
  );
}
