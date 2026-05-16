import Link from "next/link";

import { CHAIN_LIST } from "@/config/chains";
import { loadSiteBriefBundle } from "@/lib/briefs/loadSiteBriefBundle";
import type {
  RegimeLabel,
  SiteBriefBundle,
  SiteBriefChain,
  SiteBriefSeriesDay,
} from "@/lib/briefs/types";

import "server-only";

export const revalidate = 0;

// ── Helpers ───────────────────────────────────────────────────────────────────

function regimeClass(label: RegimeLabel | null): string {
  if (label === "STABLE")    return "status-stable";
  if (label === "HEATING")   return "status-heating";
  if (label === "CONGESTED") return "status-congested";
  if (label === "CHEAP")     return "status-cheap";
  return "status-unknown";
}

function regimeColor(label: RegimeLabel | null): string {
  if (label === "STABLE")    return "var(--c-stable)";
  if (label === "HEATING")   return "var(--c-heating)";
  if (label === "CONGESTED") return "var(--c-congested)";
  if (label === "CHEAP")     return "var(--c-cheap)";
  return "var(--c-unknown)";
}

function regimeMeaning(label: RegimeLabel | null): string {
  if (label === "STABLE")    return "Normal, balanced network conditions.";
  if (label === "HEATING")   return "Activity building above chain's recent baseline.";
  if (label === "CONGESTED") return "Elevated friction and capacity pressure.";
  if (label === "CHEAP")     return "Below-baseline friction conditions.";
  return "Evidence insufficient for a strong label.";
}

function fmtConf(v: number | null | undefined): string {
  if (typeof v !== "number" || !Number.isFinite(v)) return "—";
  return `${Math.round((Math.abs(v) <= 1 ? v * 100 : v))}%`;
}

function fmtConfDecimal(v: number | null | undefined): string {
  if (typeof v !== "number" || !Number.isFinite(v)) return "—";
  return (Math.abs(v) <= 1 ? v : v / 100).toFixed(3);
}

function fmtDate(v: string | null | undefined): string {
  if (!v) return "—";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const d = new Date(`${v}T00:00:00Z`);
  if (isNaN(d.getTime())) return v;
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC", day: "numeric", month: "long", year: "numeric",
  }).format(d);
}

function fmtPattern(pattern: string | null | undefined): string {
  if (!pattern) return "—";
  return pattern.replace(/_/g, " ").toLowerCase();
}

function confDirStyle(dir: string | null | undefined): { label: string; cls: string } {
  if (dir === "weakening")     return { label: "weakening",     cls: "status-congested" };
  if (dir === "strengthening") return { label: "strengthening", cls: "status-stable" };
  return { label: "stable", cls: "status-unknown" };
}

function seriesFor(bundle: SiteBriefBundle, chainId: string): SiteBriefSeriesDay[] {
  return bundle.series_30d.find((s) => s.chain === chainId)?.days ?? [];
}

function sparklinePath(days: SiteBriefSeriesDay[]): string {
  const usable = days.slice(-14).filter((d) => typeof d.confidence_score === "number");
  if (usable.length < 2) return "";
  const values = usable.map((d) => Math.max(0, Math.min(1, d.confidence_score ?? 0)));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  return values.map((v, i) => {
    const x = (i / (values.length - 1)) * 120;
    const y = 32 - ((v - min) / range) * 28 - 2;
    return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(" ");
}

// ── BriefCard ─────────────────────────────────────────────────────────────────

function BriefCard({ brief, bundle }: { brief: SiteBriefChain; bundle: SiteBriefBundle }) {
  const chain = CHAIN_LIST.find((c) => c.id === brief.chain);
  const label = brief.label ?? "UNKNOWN/DEGRADED";
  const days  = seriesFor(bundle, brief.chain);
  const last7 = days.slice(-7);
  const sparkPath = sparklinePath(days);
  const conf  = brief.confidence;
  const dir   = confDirStyle(conf?.direction);
  const color = regimeColor(label);

  const confLatest = fmtConfDecimal(conf?.latest);
  const confAvg    = fmtConfDecimal(conf?.average_7d);
  const hasShift   = conf?.direction && conf.direction !== "stable";

  return (
    <article className="border-t border-[var(--line)] pt-10 pb-10">

      {/* ── Header ── */}
      <div className="section-head mb-8">
        <div>
          <div style={{
            width: "40px", height: "40px",
            display: "grid", placeItems: "center",
            border: "1px solid var(--line2)", borderRadius: "3px",
            fontFamily: "var(--mono)", fontSize: "18px", color: "var(--ink)",
            marginBottom: "12px",
          }}>
            {chain?.icon ?? brief.chain.slice(0, 1).toUpperCase()}
          </div>
          <h2 className="ua-h2">{chain?.name ?? brief.chain}</h2>
          <div className="eyebrow mt-2">Updated through {fmtDate(brief.updated_through)}</div>
        </div>

        <div>
          <div style={{ marginBottom: "16px" }}>
            <span
              className={`regime-token ${regimeClass(label)}`}
              style={{ fontSize: "18px", letterSpacing: ".1em", paddingBottom: "4px" }}
            >
              {label}
            </span>
            <p className="text-sm text-[var(--ink2)] mt-2 max-w-sm">{regimeMeaning(label)}</p>
          </div>
          {brief.headline && (
            <p className="text-[var(--ink)] text-base leading-7 max-w-xl">{brief.headline}</p>
          )}
        </div>
      </div>

      {/* ── Key metrics ── */}
      <div className="fact-row mb-8" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
        <div className="fact-item">
          <strong>Confidence</strong>
          <div className="mt-2 font-mono text-[22px] text-[var(--ink)]">{fmtConf(conf?.latest)}</div>
          <div className="mt-1 text-[11px] text-[var(--ink3)]">latest published</div>
        </div>
        <div className="fact-item">
          <strong>7-day avg</strong>
          <div className="mt-2 font-mono text-[22px] text-[var(--ink)]">{fmtConf(conf?.average_7d)}</div>
          <div className="mt-1 text-[11px] text-[var(--ink3)]">window average</div>
        </div>
        <div className="fact-item">
          <strong>Confidence trend</strong>
          <div className="mt-2">
            <span className={`regime-token ${dir.cls}`} style={{ fontSize: "13px" }}>
              {dir.label}
            </span>
          </div>
          <div className="mt-1 text-[11px] text-[var(--ink3)]">across 7-day window</div>
        </div>
        <div className="fact-item">
          <strong>Regime pattern</strong>
          <div className="mt-2 font-mono text-[12px] text-[var(--ink)] leading-snug">
            {fmtPattern(brief.pattern)}
          </div>
          <div className="mt-1 text-[11px] text-[var(--ink3)]">weekly characterization</div>
        </div>
      </div>

      {/* ── 7-day path ── */}
      <div className="border-t border-[var(--line)] pt-6 mb-6">
        <div className="eyebrow mb-4">Latest 7 published days</div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "20px" }}>
          {last7.map((day, i) => (
            <div key={`${brief.chain}-${day.date}-${i}`}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
              <span
                className={`regime-token ${regimeClass(day.label)}`}
                style={{ fontSize: "9px", letterSpacing: ".08em", padding: "3px 7px", borderBottomWidth: "1px" }}
              >
                {day.label === "UNKNOWN/DEGRADED" ? "UNKNOWN" : day.label}
              </span>
              <span style={{
                fontFamily: "var(--mono)", fontSize: "9px",
                color: "var(--ink3)", letterSpacing: ".04em",
              }}>
                {day.date?.slice(5)}
              </span>
            </div>
          ))}
        </div>

        {sparkPath && (
          <div>
            <div className="eyebrow mb-2">Confidence trend · 14 days</div>
            <svg viewBox="0 0 120 32"
              style={{ width: "100%", maxWidth: "280px", height: "40px" }}>
              <line x1="0" y1="30" x2="120" y2="30" stroke="var(--line)" strokeWidth="0.5" />
              <path d={sparkPath} fill="none" stroke={color}
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        )}
      </div>

      {/* ── Context narrative ── */}
      <div className="border-t border-[var(--line)] pt-6">
        <div className="eyebrow mb-4">What this means</div>
        <div style={{ display: "grid", gap: "0", maxWidth: "760px" }}>
          <div className="data-row" style={{ gridTemplateColumns: "140px 1fr", padding: "12px 0" }}>
            <span className="font-mono text-[10px] text-[var(--gold)] uppercase tracking-[.12em]">Regime</span>
            <p className="text-sm text-[var(--ink2)]">
              {label} was the latest published label.{" "}
              {hasShift
                ? `Confidence was ${dir.label} across the window — from an average of ${confAvg} to a latest reading of ${confLatest}.`
                : `Confidence was broadly stable at ${confLatest}.`}
            </p>
          </div>
          <div className="data-row" style={{ gridTemplateColumns: "140px 1fr", padding: "12px 0" }}>
            <span className="font-mono text-[10px] text-[var(--gold)] uppercase tracking-[.12em]">Pattern</span>
            <p className="text-sm text-[var(--ink2)]">
              The 7-day window showed a {fmtPattern(brief.pattern)} pattern.{" "}
              Full driver breakdown is available in the chain Meta JSON.
            </p>
          </div>
          <div className="data-row" style={{ gridTemplateColumns: "140px 1fr", padding: "12px 0", borderBottom: 0 }}>
            <span className="font-mono text-[10px] text-[var(--gold)] uppercase tracking-[.12em]">Boundary</span>
            <p className="text-sm text-[var(--ink2)]">
              Descriptive only. Daily cadence. Not a prediction or recommendation.
            </p>
          </div>
        </div>
      </div>

      {/* ── CTAs ── */}
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href={`/chains/${brief.chain}`} className="btn-ghost">
          View {chain?.name ?? brief.chain} chain data →
        </Link>
        <Link href={`/chains/${brief.chain}/history`} className="text-link">
          View history →
        </Link>
      </div>
    </article>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function BriefsPage() {
  const bundle = await loadSiteBriefBundle();

  if (!bundle || bundle.brief_status === "unavailable") {
    return (
      <main className="ua-page">
        <header className="hero border-b border-[var(--line)]">
          <div className="page-shell">
            <div className="eyebrow mb-4">Briefs</div>
            <h1 className="ua-h1">Briefs are not yet available.</h1>
            <p className="lead mt-4">
              The published site brief bundle has not been generated yet.
              Meta JSON and the public track record may still be available.
            </p>
            <div className="mt-8 flex gap-3">
              <Link href="/chains" className="btn-ghost">View chain data</Link>
              <Link href="/track-record" className="text-link">Track record →</Link>
            </div>
          </div>
        </header>
      </main>
    );
  }

  return (
    <main className="ua-page">

      {/* ── Hero ── */}
      <header className="hero border-b border-[var(--line)]">
        <div className="page-shell">
          <div className="eyebrow mb-4">Briefs</div>
          <h1 className="ua-h1">
            The latest blockchain week <em>in seconds.</em>
          </h1>
          <p className="lead mt-4 max-w-2xl">
            Briefs summarize what each chain&apos;s published Meta rows showed across
            the latest 7 days — what regime dominated, how confident the evidence
            was, and whether the label is persistent or recent. Daily cadence.
            Descriptive, not predictive.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/api-docs/samples" className="btn-ghost">Inspect JSON →</Link>
            <Link href="/track-record" className="text-link">Cross-chain history →</Link>
          </div>
        </div>
      </header>

      {/* ── Cross-chain summary strip ── */}
      <section className="border-b border-[var(--line)]">
        <div className="page-shell">
          <div className="fact-row" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
            {CHAIN_LIST.map((chain) => {
              const brief = bundle.chains.find((b) => b.chain === chain.id);
              if (!brief) return null;
              const lbl = brief.label ?? "UNKNOWN/DEGRADED";
              return (
                <Link
                  key={chain.id}
                  href={`/chains/${chain.id}`}
                  className="fact-item interactive-row"
                  style={{ textDecoration: "none" }}
                >
                  <strong>{chain.label}</strong>
                  <div className="mt-2">
                    <span className={`regime-token ${regimeClass(lbl)}`}>{lbl}</span>
                  </div>
                  <div className="mt-1 text-[11px] text-[var(--ink3)]">
                    {fmtConf(brief.confidence?.latest)} confidence
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Brief cards ── */}
      <div className="page-shell py-4">
        {CHAIN_LIST.map((chain) => {
          const brief = bundle.chains.find((b) => b.chain === chain.id);
          return brief
            ? <BriefCard key={chain.id} brief={brief} bundle={bundle} />
            : null;
        })}
      </div>

      {/* ── Footer note ── */}
      <div className="page-shell pb-16">
        <div className="border-t border-[var(--line)] pt-6">
          <p className="font-mono text-[10px] text-[var(--ink3)] tracking-[.08em]">
            Briefs are generated from published daily Meta rows. They are
            descriptive summaries of observed network conditions. They do not
            constitute forecasts, investment advice, or recommendations of any
            kind. Source: briefs/chains/*/latest.json · briefs_methodology_version:
            briefs_v1.0
          </p>
        </div>
      </div>

    </main>
  );
}
