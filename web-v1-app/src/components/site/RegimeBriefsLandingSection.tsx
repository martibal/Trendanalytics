import { CHAIN_LIST } from "@/config/chains";
import { loadSiteBriefBundle } from "@/lib/briefs/loadSiteBriefBundle";
import type { RegimeLabel, SiteBriefBundle, SiteBriefSeriesDay } from "@/lib/briefs/types";

import "server-only";

const LABEL_COLORS: Record<RegimeLabel, string> = {
  STABLE: "#00c97a",
  HEATING: "#f5a623",
  CONGESTED: "#ff4d4d",
  CHEAP: "#3b82f6",
  "UNKNOWN/DEGRADED": "#6b7280",
};

const LABEL_TEXT: Record<RegimeLabel, string> = {
  STABLE: "Stable",
  HEATING: "Heating",
  CONGESTED: "Congested",
  CHEAP: "Cheap",
  "UNKNOWN/DEGRADED": "Unknown / degraded",
};

function formatConfidence(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return value.toFixed(3);
}

function formatDriver(value: string | null | undefined): string {
  if (!value) return "—";
  return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function chainName(chainId: string): string {
  return CHAIN_LIST.find((chain) => chain.id === chainId)?.name ?? chainId;
}

function seriesFor(bundle: SiteBriefBundle, chainId: string): SiteBriefSeriesDay[] {
  return bundle.series_30d.find((entry) => entry.chain === chainId)?.days ?? [];
}

function chainBrief(bundle: SiteBriefBundle, chainId: string) {
  return bundle.chains.find((entry) => entry.chain === chainId) ?? null;
}

function sparklinePath(days: SiteBriefSeriesDay[]): string | null {
  const values = days
    .map((day) => day.confidence_score)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));

  if (values.length < 2) return null;

  const width = 92;
  const height = 28;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;

  return values
    .map((value, index) => {
      const x = (index / Math.max(1, values.length - 1)) * width;
      const y = height - ((value - min) / span) * height;
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

function RegimeCell({ day }: { day: SiteBriefSeriesDay }) {
  const color = day.color ?? LABEL_COLORS[day.label] ?? LABEL_COLORS["UNKNOWN/DEGRADED"];
  const title = `${day.date} · ${day.label} · confidence ${formatConfidence(day.confidence_score)} · primary driver ${formatDriver(day.primary_driver)}`;

  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      className="group relative h-4 min-w-4 rounded-[5px] border border-white/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.34),0_4px_10px_rgba(6,19,37,0.12)] outline-none transition hover:-translate-y-0.5 focus-visible:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-[#ff9a4a]/70"
      style={{ backgroundColor: color }}
    >
      <span className="pointer-events-none absolute bottom-[calc(100%+10px)] left-1/2 z-30 hidden w-[210px] -translate-x-1/2 rounded-2xl border border-[#8fb5d9]/40 bg-[#061325]/96 px-3 py-2 text-left text-[11px] leading-4 text-white shadow-[0_18px_48px_rgba(3,19,41,0.36)] group-hover:block group-focus-visible:block">
        <span className="block font-black text-[#9fe8ff]">{day.date}</span>
        <span className="mt-1 block font-bold">{LABEL_TEXT[day.label] ?? day.label}</span>
        <span className="block text-white/80">Confidence: {formatConfidence(day.confidence_score)}</span>
        <span className="block text-white/80">Primary driver: {formatDriver(day.primary_driver)}</span>
      </span>
    </button>
  );
}

function ConfidenceSparkline({ days }: { days: SiteBriefSeriesDay[] }) {
  const path = sparklinePath(days);

  if (!path) {
    return <div className="h-7 w-[92px] rounded-xl bg-white/10" aria-hidden="true" />;
  }

  return (
    <svg
      viewBox="0 0 92 28"
      role="img"
      aria-label="30 published day confidence sparkline"
      className="h-7 w-[92px] overflow-visible"
    >
      <path d="M0 27.5H92" stroke="rgba(216,233,255,0.22)" strokeWidth="1" />
      <path
        d={path}
        fill="none"
        stroke="#9fe8ff"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.6"
      />
    </svg>
  );
}

function ChainBriefRow({ bundle, chainId }: { bundle: SiteBriefBundle; chainId: string }) {
  const brief = chainBrief(bundle, chainId);
  const series = seriesFor(bundle, chainId);
  const latestLabel = brief?.label ?? "UNKNOWN/DEGRADED";
  const labelColor = LABEL_COLORS[latestLabel] ?? LABEL_COLORS["UNKNOWN/DEGRADED"];
  const headline =
    brief?.brief_status === "published" || brief?.brief_status === "degraded"
      ? brief.headline ?? "The latest 7 published days are available."
      : "The latest 7 published days are not available yet.";

  return (
    <article className="relative overflow-hidden rounded-[26px] border border-[#8fb5d9]/20 bg-[linear-gradient(145deg,rgba(255,255,255,0.105),rgba(255,255,255,0.035))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_18px_56px_rgba(3,19,41,0.22)]">
      <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full blur-2xl" style={{ backgroundColor: `${labelColor}22` }} />

      <div className="relative flex items-start justify-between gap-4">
        <div>
          <div className="text-[13px] font-black uppercase tracking-[0.17em] text-[#9fe8ff]">
            {chainName(chainId)}
          </div>
          <p className="mt-2 max-w-[560px] text-[15px] font-bold leading-6 text-white">
            {headline}
          </p>
          <p className="mt-1 text-[12px] font-semibold text-white/60">
            Updated through {brief?.updated_through ?? "—"} · daily, not intraday
          </p>
        </div>

        <div className="shrink-0 text-right">
          <div
            className="inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.1em] shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]"
            style={{ borderColor: labelColor, color: labelColor, backgroundColor: `${labelColor}16` }}
          >
            {latestLabel}
          </div>
          <div className="mt-3 flex justify-end">
            <ConfidenceSparkline days={series} />
          </div>
        </div>
      </div>

      <div className="relative mt-4 flex gap-[5px] overflow-x-auto pb-1 scrollbar-none" aria-label={`${chainName(chainId)} latest 30 published regime labels`}>
        {series.slice(-30).map((day) => (
          <RegimeCell key={`${chainId}-${day.date}`} day={day} />
        ))}
      </div>
    </article>
  );
}

export default async function RegimeBriefsLandingSection() {
  const bundle = await loadSiteBriefBundle();

  if (!bundle || bundle.brief_status === "unavailable") {
    return null;
  }

  const orderedChains = CHAIN_LIST.map((chain) => chain.id);
  const sameFreshness = Boolean(bundle.freshness?.same_updated_through_all_chains);

  return (
    <section className="relative overflow-hidden bg-[linear-gradient(180deg,#031329_0%,#06182d_100%)] py-12 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(47,124,255,0.18),transparent_24rem),radial-gradient(circle_at_88%_10%,rgba(255,154,74,0.11),transparent_20rem)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#9fe8ff]/50 to-transparent" />

      <div className="relative mx-auto max-w-7xl px-6 sm:px-8 lg:px-10">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.92fr)_minmax(340px,0.48fr)] lg:items-end">
          <div>
            <div className="inline-flex rounded-full border border-[#9fe8ff]/20 bg-[#9fe8ff]/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-[#9fe8ff] shadow-[inset_0_1px_0_rgba(255,255,255,0.10)]">
              Latest 7-day regime context
            </div>
            <h2 className="mt-4 max-w-4xl text-[34px] font-black leading-[1.02] tracking-[-0.055em] text-white sm:text-[42px] lg:text-[48px]">
              What kind of week did each chain just publish?
            </h2>
            <p className="mt-4 max-w-3xl text-[17px] font-semibold leading-7 text-[#d8e9ff]">
              Urd Atlas now turns the latest published labels into a short deterministic regime brief: what changed, what drove it, and whether the recent label is isolated or persistent.
            </p>
          </div>

          <aside className="rounded-[28px] border border-[#8fb5d9]/20 bg-[linear-gradient(145deg,rgba(255,255,255,0.115),rgba(255,255,255,0.035))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_20px_60px_rgba(3,19,41,0.25)]">
            <div className="text-[11px] font-black uppercase tracking-[0.18em] text-[#ffb777]">
              Cross-chain read
            </div>
            <p className="mt-3 text-[17px] font-black leading-6 text-white">
              {bundle.summary?.headline ?? "Latest 7-day regime context"}
            </p>
            {bundle.summary?.text ? (
              <p className="mt-2 text-[13px] font-semibold leading-5 text-[#d8e9ff]">
                {bundle.summary.text}
              </p>
            ) : null}
            {!sameFreshness ? (
              <p className="mt-3 rounded-2xl border border-[#9fe8ff]/20 bg-[#9fe8ff]/10 px-3 py-2 text-[12px] font-bold leading-5 text-[#d8e9ff]">
                Cross-chain text uses each chain&apos;s latest published window. Data cadence is daily, not intraday.
              </p>
            ) : null}
          </aside>
        </div>

        <div className="mt-7 grid gap-4 lg:grid-cols-2">
          {orderedChains.map((chainId) => (
            <ChainBriefRow key={chainId} bundle={bundle} chainId={chainId} />
          ))}
        </div>

        <div className="mt-6 grid gap-3 rounded-[26px] border border-[#8fb5d9]/20 bg-[#020b17]/40 p-4 text-[12px] font-bold leading-5 text-[#c8ddf5] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] sm:grid-cols-[1fr_auto] sm:items-center">
          <p>
            Data cadence: daily, not intraday. This is descriptive regime context, not a prediction or recommendation.
          </p>
          <p className="text-[#9fe8ff]">
            One Site Bundle · no extra frontend fetches
          </p>
        </div>
      </div>
    </section>
  );
}
