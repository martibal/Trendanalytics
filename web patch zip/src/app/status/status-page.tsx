// src/app/status/page.tsx
import type { ReactNode } from "react";
import Link from "next/link";

import { CHAIN_LIST, type ChainId } from "@/config/chains";
import { readDatasetManifest, type DatasetManifest } from "@/lib/dataset";
import { readStorageObject } from "@/lib/storage";
import RegimeBadge from "@/components/RegimeBadge";
import StalenessBar from "@/components/ui/StalenessBar";
import ChainIcon from "@/components/ChainIcon";

import "server-only";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type StatusRow = {
  chain: ChainId;
  name: string;
  label: string;
  as_of: string | null;
  lag_days: number | null;
  status: "ok" | "warn" | "fail" | "unknown";
  published_regime: string | null;
  confidence_score: number | null;
  expected_delay_days: number;
};

type LandingHero = {
  display_asof?: string | null;
  regime_asof?: string | null;
  asof?: {
    display?: string | null;
    latest_available?: string | null;
    gold?: string | null;
    derived?: string | null;
    meta?: string | null;
    meta_actual?: string | null;
    regime?: string | null;
  };
};

type MetaLatest = {
  updated_through?: string;
  date?: string;
  status?: { label?: string; one_liner?: string; color?: string };
  confidence?: { confidence_score?: number; lag_days_vs_utc_today?: number };
  regime?: { label?: string; asof_date?: string };
  profile?: { label?: string };
};

// ---------------------------------------------------------------------------
// Shared UI primitives
// ---------------------------------------------------------------------------

function ModalStyles() {
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `
          .ta-modal { display: none; }
          .ta-modal:target { display: flex; }
        `,
      }}
    />
  );
}

function InlineCode({ children }: { children: ReactNode }) {
  return <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">{children}</code>;
}

function MoreLink({ id, label = "More" }: { id: string; label?: string }) {
  return (
    <a
      href={`#${id}`}
      className="inline-flex items-center rounded-full border border-cyan-500/20 bg-cyan-500/5 px-3 py-1 text-xs font-medium text-cyan-200 hover:bg-cyan-500/10"
    >
      {label}
    </a>
  );
}

type ExplainPair = { basic: ReactNode; advanced: ReactNode; traceability?: ReactNode };

function ExplainModal({
  id,
  title,
  subtitle,
  pair,
}: {
  id: string;
  title: string;
  subtitle?: ReactNode;
  pair: ExplainPair;
}) {
  return (
    <div id={id} className="ta-modal fixed inset-0 z-[80] items-center justify-center p-4">
      <a href="#" className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" aria-label="Close dialog" />
      <div className="relative z-10 flex max-h-[88vh] w-full max-w-4xl flex-col rounded-3xl border border-cyan-500/20 bg-[#071322] shadow-2xl shadow-cyan-950/40">
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-white/8 px-6 py-5">
          <div>
            <h3 className="text-2xl font-semibold text-white">{title}</h3>
            {subtitle ? <div className="mt-2 text-sm leading-6 text-slate-300">{subtitle}</div> : null}
          </div>
          <a href="#" className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-xl text-slate-200 hover:bg-white/10" aria-label="Close dialog">×</a>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-6 pt-5">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <section className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
              <div className="text-xs font-medium uppercase tracking-[0.14em] text-emerald-200">Basic</div>
              <div className="mt-3 text-sm leading-7 text-slate-100">{pair.basic}</div>
            </section>
            <details className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-5" open>
              <summary className="cursor-pointer list-none text-xs font-medium uppercase tracking-[0.14em] text-cyan-200">Advanced</summary>
              <div className="mt-3 text-sm leading-7 text-slate-100">{pair.advanced}</div>
            </details>
          </div>
          {pair.traceability ? (
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="text-xs font-medium uppercase tracking-[0.14em] text-slate-300">Traceability</div>
              <div className="mt-3 text-sm leading-7 text-slate-200">{pair.traceability}</div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Data helpers
// ---------------------------------------------------------------------------

function arrayBufferToUtf8(buffer: ArrayBuffer): string {
  return new TextDecoder("utf-8").decode(new Uint8Array(buffer));
}

async function readPublishedJson<T>(storagePath: string): Promise<T | null> {
  const result = await readStorageObject(storagePath);
  if (!result) return null;
  try {
    const raw = arrayBufferToUtf8(result.body);
    const json = JSON.parse(raw);
    if (!json || typeof json !== "object") return null;
    return json as T;
  } catch {
    return null;
  }
}

function fmtDate(d?: string | null) {
  return d && d.trim().length > 0 ? d : "—";
}

function parseIsoDayToOsloMs(date?: string | null): number | null {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const [y, m, d] = date.split("-").map(Number);
  const ms = Date.UTC(y, m - 1, d);
  return Number.isFinite(ms) ? ms : null;
}

function osloTodayMs(): number {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Oslo", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const get = (t: string) => Number(parts.find((part) => part.type === t)?.value ?? "0");
  return Date.UTC(get("year"), get("month") - 1, get("day"));
}

function lagDaysFromIsoDay(date?: string | null): number | null {
  const asOfMs = parseIsoDayToOsloMs(date);
  if (asOfMs === null) return null;
  const diff = osloTodayMs() - asOfMs;
  return diff >= 0 ? Math.floor(diff / 86400000) : null;
}

function heroDisplayAsOf(hero?: LandingHero | null): string | null {
  return hero?.display_asof ?? hero?.asof?.display ?? hero?.asof?.latest_available ?? hero?.asof?.gold ?? hero?.asof?.derived ?? hero?.asof?.meta ?? null;
}

function confidenceBand(v?: number | null) {
  if (typeof v !== "number") return "—";
  if (v >= 0.7) return "Good";
  if (v >= 0.4) return "Caution";
  return "Degraded";
}

function bandChipClass(band: string) {
  const base = "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium";
  if (band === "Good") return `${base} border-emerald-500/25 bg-emerald-500/10 text-emerald-300`;
  if (band === "Caution") return `${base} border-amber-500/25 bg-amber-500/10 text-amber-300`;
  if (band === "Degraded") return `${base} border-red-500/25 bg-red-500/10 text-red-300`;
  return `${base} border-border bg-muted text-muted-foreground`;
}

function healthChipClass(kind: "ok" | "warn" | "fail" | "unknown") {
  const base = "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide";
  if (kind === "ok") return `${base} border-emerald-500/25 bg-emerald-500/10 text-emerald-300`;
  if (kind === "warn") return `${base} border-amber-500/25 bg-amber-500/10 text-amber-300`;
  if (kind === "fail") return `${base} border-red-500/25 bg-red-500/10 text-red-300`;
  return `${base} border-border bg-muted text-muted-foreground`;
}

function healthText(kind: "ok" | "warn" | "fail" | "unknown") {
  if (kind === "ok") return "OK";
  if (kind === "warn") return "WARN";
  if (kind === "fail") return "FAIL";
  return "UNKNOWN";
}

function datasetNotes(dataset: DatasetManifest | null): string[] {
  const notes = dataset?.notes;
  if (Array.isArray(notes)) return notes.filter((n): n is string => typeof n === "string" && n.trim().length > 0);
  if (typeof notes === "string" && notes.trim().length > 0) return [notes];
  return [];
}

function expectedDelayDays(chain: ChainId): number {
  return chain === "arbitrum" || chain === "base" ? 7 : 1;
}

function deriveHealth(params: {
  lagDays: number | null;
  asOf: string | null;
  expectedDelayDays: number;
}): "ok" | "warn" | "fail" | "unknown" {
  const { lagDays, asOf, expectedDelayDays } = params;
  if (!asOf || typeof lagDays !== "number") return "unknown";
  if (lagDays <= expectedDelayDays) return "ok";
  if (lagDays <= expectedDelayDays + 2) return "warn";
  return "fail";
}

async function buildStatusRows(): Promise<StatusRow[]> {
  return Promise.all(
    CHAIN_LIST.map(async (chain) => {
      const [meta, hero] = await Promise.all([
        readPublishedJson<MetaLatest>(`data/published/v1/meta/${chain.id}/latest.json`),
        readPublishedJson<LandingHero>(`data/published/v1/landing/${chain.id}/hero.json`),
      ]);
      const displayAsOf = heroDisplayAsOf(hero);
      const asOf = displayAsOf ?? meta?.updated_through ?? meta?.regime?.asof_date ?? meta?.date ?? null;
      const lagDays = lagDaysFromIsoDay(asOf);
      const delay = expectedDelayDays(chain.id);
      return {
        chain: chain.id,
        name: chain.name,
        label: chain.label,
        as_of: asOf,
        lag_days: lagDays,
        status: deriveHealth({ lagDays, asOf, expectedDelayDays: delay }),
        published_regime: meta?.status?.label ?? meta?.regime?.label ?? null,
        confidence_score: typeof meta?.confidence?.confidence_score === "number"
          ? meta.confidence.confidence_score
          : null,
        expected_delay_days: delay,
      };
    })
  );
}

// ---------------------------------------------------------------------------
// Explanations
// ---------------------------------------------------------------------------

const howToReadExplain: ExplainPair = {
  basic: (
    <>
      <p>
        This page answers one question: <span className="font-medium text-white">are
        the published data files current and usable right now?</span> It does not say
        anything about what markets are doing or what you should do.
      </p>
      <p className="mt-3">
        Each chain shows two separate things that are easy to confuse:
      </p>
      <ul className="mt-2 list-disc space-y-2 pl-5">
        <li>
          <span className="font-medium text-white">Health</span> is about freshness —
          how old is the published row compared to what we expect? Bitcoin and Ethereum
          should update roughly daily. Arbitrum and Base update roughly weekly by design.
          If a chain falls behind its expected schedule, health degrades from OK to WARN
          to FAIL.
        </li>
        <li>
          <span className="font-medium text-white">Confidence</span> is about evidence
          quality — how strongly does the available data support the published regime
          label? A row can be perfectly fresh but still have low confidence if the
          underlying data is patchy or ambiguous.
        </li>
      </ul>
      <p className="mt-3">
        A chain with Health OK and Confidence Good is the most reliable reading. A chain
        with Health FAIL or Confidence Degraded should be read with caution.
      </p>
    </>
  ),
  advanced: (
    <>
      <p>
        The status page evaluates two orthogonal quality dimensions per chain. Health is
        a staleness classification derived from{" "}
        <InlineCode>confidence.lag_days_vs_utc_today</InlineCode> against the
        chain-specific publication cadence policy (BTC/ETH: 1-day expected, warn at +2d,
        fail at +4d; ARB/BASE: 7-day expected, warn at +9d, fail at +11d). Confidence is
        a composite evidence-strength scalar from the meta layer, independent of lag.
      </p>
      <p className="mt-3">
        These dimensions can diverge in meaningful ways. A chain with lag = 0 and
        confidence = 0.35 is fresh but epistemically weak — the data is current but the
        evidence surface does not support a named regime label. Conversely, a chain with
        lag = 5 and confidence = 0.85 is delayed but internally coherent — when it was
        published, it was well-supported. The page surfaces both dimensions to prevent
        either from silently masking the other.
      </p>
      <p className="mt-3">
        Health is derived server-side at page render time, not read from a pre-computed
        status field. The classification is: lag ≤ expected → OK; lag ≤ expected + 2 →
        WARN; lag &gt; expected + 2 → FAIL; missing lag or as-of → UNKNOWN.
      </p>
    </>
  ),
  traceability: (
    <ul className="list-disc pl-5">
      <li>Source: <InlineCode>data/published/v1/meta/&lt;chain&gt;/latest.json</InlineCode></li>
      <li>Lag field: <InlineCode>confidence.lag_days_vs_utc_today</InlineCode></li>
      <li>Confidence field: <InlineCode>confidence.confidence_score</InlineCode></li>
      <li>Health derived at render time — not read from a pre-computed field</li>
    </ul>
  ),
};

const cadenceExplain: ExplainPair = {
  basic: (
    <>
      <p>
        Different blockchains publish at different speeds. This is not a bug — it is a
        deliberate policy based on how long it takes to process each chain&apos;s data.
      </p>
      <ul className="mt-3 list-disc space-y-2 pl-5">
        <li>
          <span className="font-medium text-white">Bitcoin and Ethereum</span> — expected
          to update roughly every day. If the data is more than 2 days behind, you will
          see a yellow WARN. More than 4 days behind shows a red FAIL.
        </li>
        <li>
          <span className="font-medium text-white">Arbitrum and Base</span> — published
          with an expected 7-day delay by design. Seeing &quot;7 days lag&quot; for these chains is
          completely normal. WARN only shows above 10 days, FAIL above 15 days.
        </li>
      </ul>
      <p className="mt-3">
        The pipeline is generally scheduled to run twice daily, around 09:00 and 21:00
        Europe/Oslo. These are expected publish windows, not guaranteed timestamps.
      </p>
      <p className="mt-3">
        When you see a persistent banner on an Arbitrum or Base chain page saying the
        data is 7 days old — that is expected behaviour, not a problem.
      </p>
    </>
  ),
  advanced: (
    <>
      <p>
        Publication cadence is chain-specific by design: BTC and ETH expect 1-day lag; ARB and BASE expect 7-day lag. The staleness thresholds are calibrated relative to expected lag, not relative to zero — which is why the same absolute lag value can be normal for one chain and anomalous for another.
      </p>
      <p className="mt-3">
        The operational pipeline is generally scheduled to publish around 09:00 and 21:00
        Europe/Oslo. In practice, visible availability can move slightly because of
        AWS upstream publication timing, chain-specific lag characteristics, deployment timing, or
        processing time. Urd Atlas checks for newly available upstream data twice daily.
      </p>
      <p className="mt-3">
        The staleness classification table is: for BTC/ETH, soft warn at lag &gt; 2d,
        hard fail at lag &gt; 4d; for ARB/BASE, soft warn at lag &gt; 10d, hard fail
        at lag &gt; 15d. These thresholds are also used by the{" "}
        <InlineCode>StalenessBar</InlineCode> component on individual chain pages, so
        the status page and chain pages are consistent.
      </p>
    </>
  ),
  traceability: (
    <ul className="list-disc pl-5">
      <li>Expected publish windows: around 09:00 and 21:00 Europe/Oslo</li>
      <li>BTC/ETH: expected 1d · warn &gt;2d · fail &gt;4d</li>
      <li>ARB/BASE: expected 7d · warn &gt;10d · fail &gt;15d</li>
      <li>Source: chain-specific public cadence policy described on this page</li>
    </ul>
  ),
};

const confidenceExplain: ExplainPair = {
  basic: (
    <>
      <p>
        The confidence score on this page is the same number shown on each chain page.
        It tells you how well the available on-chain data supports the published regime
        label — not how fresh the data is.
      </p>
      <ul className="mt-3 list-disc space-y-2 pl-5">
        <li>
          <span className="font-medium text-white">Good (≥ 0.70)</span> — strong
          evidence. The regime label is well-supported and the scorecard can be read
          normally.
        </li>
        <li>
          <span className="font-medium text-white">Caution (0.40–0.69)</span> — moderate
          evidence. The label is still published but scorecard scores are pulled toward
          neutral to avoid over-interpretation.
        </li>
        <li>
          <span className="font-medium text-white">Degraded (&lt; 0.40)</span> — weak
          evidence. The published label is UNKNOWN/DEGRADED regardless of what the raw
          metrics show.
        </li>
      </ul>
    </>
  ),
  advanced: (
    <>
      <p>
        Confidence is the geometric mean of <InlineCode>data_quality_score</InlineCode>{" "}
        and <InlineCode>label_confidence_score</InlineCode>. Data quality reflects
        completeness and coverage of the metric space; label confidence reflects how
        strongly the evidence distinguishes the published label from adjacent labels.
      </p>
      <p className="mt-3">
        On the status page, confidence is shown as a diagnostic alongside freshness —
        not as a standalone signal. The most important operational use is identifying
        chains where confidence has fallen below 0.40, which forces UNKNOWN/DEGRADED
        regardless of axis structure. A subscriber whose pipeline depends on regime
        labels should monitor this field to detect periods where published labels are
        epistemically unreliable.
      </p>
    </>
  ),
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function StatusPage() {
  const dataset: DatasetManifest | null = await readDatasetManifest();
  const rows = await buildStatusRows();
  const notes = datasetNotes(dataset);

  const okCount = rows.filter((r) => r.status === "ok").length;
  const warnCount = rows.filter((r) => r.status === "warn").length;
  const failCount = rows.filter((r) => r.status === "fail").length;
  const overallHealth = failCount > 0 ? "fail" : warnCount > 0 ? "warn" : "ok";

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <ModalStyles />

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <header className="mb-10">
        <div className="rounded-3xl border bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.10),transparent_40%)] p-8 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-3xl">
              <div className="text-xs font-medium uppercase tracking-[0.18em] text-cyan-200">
                System health
              </div>
              <h1 className="mt-3 text-4xl font-semibold leading-tight text-white sm:text-5xl">
                Status
              </h1>
              <p className="mt-4 text-lg leading-8 text-slate-300">
                Freshness and confidence for every published chain. This page answers
                whether the published artifacts are current and usable right now — not
                what to do about it. Expected refresh windows are around 09:00 and 21:00
                Europe/Oslo.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <MoreLink id="how-to-read-modal" label="How to read this page" />
                <MoreLink id="cadence-modal" label="Publication cadence" />
                <MoreLink id="confidence-modal" label="What confidence means here" />
              </div>
            </div>

            {/* Overall health + dataset card */}
            <div className="min-w-[220px] space-y-3">
              <div className="rounded-2xl border border-white/10 bg-black/10 px-4 py-4 text-xs text-slate-300">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-medium uppercase tracking-[0.12em] text-slate-400">
                    Overall
                  </div>
                  <span className={healthChipClass(overallHealth)}>
                    {healthText(overallHealth)}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="text-xl font-semibold text-emerald-300">{okCount}</div>
                    <div className="text-muted-foreground">OK</div>
                  </div>
                  <div>
                    <div className="text-xl font-semibold text-amber-300">{warnCount}</div>
                    <div className="text-muted-foreground">WARN</div>
                  </div>
                  <div>
                    <div className="text-xl font-semibold text-red-300">{failCount}</div>
                    <div className="text-muted-foreground">FAIL</div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/10 px-4 py-4 text-xs text-slate-300">
                <div className="font-medium uppercase tracking-[0.12em] text-slate-400">Dataset</div>
                {dataset?.version ? (
                  <div className="mt-2">Revision <span className="font-semibold text-white">{dataset.version}</span></div>
                ) : null}
                {dataset?.published_at ? (
                  <div className="mt-1">Published <span className="font-semibold text-white">{dataset.published_at.slice(0, 10)}</span></div>
                ) : null}
                {dataset?.methodology_version ? (
                  <div className="mt-1">Methodology <InlineCode>{dataset.methodology_version}</InlineCode></div>
                ) : null}
                <div className="mt-1">
                  Expected windows <span className="font-semibold text-white">~09:00 / ~21:00 Europe/Oslo</span>
                </div>
                <div className="mt-2 border-t border-white/10 pt-2 text-slate-400">
                  Source: <InlineCode>published artifact metadata</InlineCode>
                </div>
              </div>
            </div>
          </div>

          {/* Reading map */}
          <div className="mt-6 rounded-2xl border border-white/8 bg-white/3 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs font-medium uppercase tracking-[0.14em] text-cyan-200">
                  Two separate dimensions
                </div>
                <div className="mt-2 text-sm text-slate-100">
                  <span className="font-medium text-white">Health</span> = freshness relative to expected cadence ·{" "}
                  <span className="font-medium text-white">Confidence</span> = evidence quality for the published label
                </div>
              </div>
              <MoreLink id="how-to-read-modal" label="Full explanation" />
            </div>
          </div>
        </div>
      </header>

      {/* ── Per-chain staleness banners ───────────────────────────────────── */}
      <section className="mb-8 space-y-3">
        {rows.map((row) => (
          <StalenessBar
            key={`stale-${row.chain}`}
            chain={row.chain}
            lagDays={row.lag_days}
            asOfDate={row.as_of ?? "—"}
            confidenceScore={row.confidence_score}
            showWhenOk={true}
          />
        ))}
      </section>

      {/* ── Status table ─────────────────────────────────────────────────── */}
      <section className="mb-8 rounded-3xl border shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-6 py-5">
          <div>
            <div className="text-xs font-medium uppercase tracking-[0.14em] text-cyan-200">
              Current state
            </div>
            <h2 className="mt-1 text-3xl font-semibold">Per-chain overview</h2>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">
              Regime, confidence, and freshness for each chain from the latest published
              meta artifact.
            </p>
          </div>
          <MoreLink id="cadence-modal" label="Expected cadence" />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40 text-left">
              <tr>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Chain</th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Regime</th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Confidence</th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Band</th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Lag</th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">As of</th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Expected delay</th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Health</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row) => {
                const band = confidenceBand(row.confidence_score);
                return (
                  <tr key={row.chain} className="hover:bg-muted/10">
                    <td className="px-5 py-4">
                      <Link
                        href={`/chains/${row.chain}`}
                        className="inline-flex items-center gap-3 hover:text-cyan-200"
                      >
                        <ChainIcon chain={row.chain} className="h-7 w-7 text-xs" label={`${row.label} icon`} />
                        <span className="font-medium">{row.label || row.name}</span>
                      </Link>
                    </td>
                    <td className="px-5 py-4">
                      <RegimeBadge label={row.published_regime ?? "—"} />
                    </td>
                    <td className="px-5 py-4 font-mono text-xs">
                      {typeof row.confidence_score === "number"
                        ? row.confidence_score.toFixed(3)
                        : "—"}
                    </td>
                    <td className="px-5 py-4">
                      <span className={bandChipClass(band)}>{band}</span>
                    </td>
                    <td className="px-5 py-4 font-mono text-xs">
                      {row.lag_days !== null ? `${row.lag_days}d` : "—"}
                    </td>
                    <td className="px-5 py-4 font-mono text-xs">{fmtDate(row.as_of)}</td>
                    <td className="px-5 py-4 font-mono text-xs">
                      {row.expected_delay_days === 0 ? "~1d" : `~${row.expected_delay_days}d`}
                    </td>
                    <td className="px-5 py-4">
                      <span className={healthChipClass(row.status)}>
                        {healthText(row.status)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="border-t px-5 py-3 text-xs text-muted-foreground">
          Source: <InlineCode>data/published/v1/meta/&lt;chain&gt;/latest.json</InlineCode> ·
          Health is derived at render time from lag vs expected cadence
        </div>
      </section>

      {/* ── Cadence reference ────────────────────────────────────────────── */}
      <section className="mb-8 rounded-3xl border p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs font-medium uppercase tracking-[0.14em] text-cyan-200">
              Publication policy
            </div>
            <h2 className="mt-1 text-2xl font-semibold">Expected cadence per chain</h2>
          </div>
          <MoreLink id="cadence-modal" label="Full explanation" />
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {[
            {
              chains: "Bitcoin · Ethereum",
              expected: "~1 day",
              warn: "> 2 days",
              fail: "> 4 days",
              note: "Daily updates. A 1-day lag is normal.",
              color: "border-emerald-500/20 bg-emerald-500/5",
            },
            {
              chains: "Arbitrum · Base",
              expected: "~7 days",
              warn: "> 10 days",
              fail: "> 15 days",
              note: "Published with an intentional 7-day delay. Seeing 7d lag is normal.",
              color: "border-amber-500/20 bg-amber-500/5",
            },
          ].map(({ chains, expected, warn, fail, note, color }) => (
            <div key={chains} className={`rounded-2xl border p-5 ${color}`}>
              <div className="text-sm font-semibold text-white">{chains}</div>
              <p className="mt-1 text-xs leading-5 text-slate-300">{note}</p>
              <div className="mt-4 grid grid-cols-3 gap-3 text-center text-xs">
                <div className="rounded-xl border border-emerald-500/20 bg-black/20 px-2 py-2">
                  <div className="font-semibold text-emerald-300">OK</div>
                  <div className="mt-1 text-muted-foreground">≤ {expected}</div>
                </div>
                <div className="rounded-xl border border-amber-500/20 bg-black/20 px-2 py-2">
                  <div className="font-semibold text-amber-300">WARN</div>
                  <div className="mt-1 text-muted-foreground">{warn}</div>
                </div>
                <div className="rounded-xl border border-red-500/20 bg-black/20 px-2 py-2">
                  <div className="font-semibold text-red-300">FAIL</div>
                  <div className="mt-1 text-muted-foreground">{fail}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Dataset notes */}
      {notes.length > 0 ? (
        <section className="mb-8 rounded-3xl border border-amber-500/20 bg-amber-500/5 p-6 shadow-sm">
          <div className="text-xs font-medium uppercase tracking-[0.14em] text-amber-300">
            Dataset notes
          </div>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-200">
            {notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* ── Navigation strip ─────────────────────────────────────────────── */}
      <section className="mt-10 rounded-3xl border p-6 shadow-sm">
        <div className="text-xs font-medium uppercase tracking-[0.14em] text-cyan-200">Related</div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { href: "/chains", label: "Chains", desc: "Current regime for each network" },
            { href: "/track-record", label: "Track Record", desc: "Historical label archive" },
            { href: "/methodology", label: "Methodology", desc: "How labels are produced" },
            { href: "/glossary", label: "Glossary", desc: "Definitions for every term" },
          ].map(({ href, label, desc }) => (
            <Link
              key={href}
              href={href}
              className="group flex items-center justify-between rounded-2xl border bg-background/40 px-4 py-3 transition hover:border-cyan-500/30 hover:bg-muted/30"
            >
              <div>
                <div className="text-sm font-medium text-white">{label}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">{desc}</div>
              </div>
              <span className="text-xs text-muted-foreground transition group-hover:text-cyan-200">→</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Data contract ─────────────────────────────────────────────────── */}
      <details className="mt-8 rounded-2xl border p-5">
        <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
          Data contract and traceability
        </summary>
        <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
          <div>Dataset manifest: <InlineCode>data/published/v1/dataset.json</InlineCode></div>
          <div>Chain meta: <InlineCode>data/published/v1/meta/&lt;chain&gt;/latest.json</InlineCode></div>
          <div>Health classification is derived at render time — not read from a pre-computed status field.</div>
          <div>Primary provenance fields: <InlineCode>date</InlineCode>, <InlineCode>updated_through</InlineCode>, <InlineCode>methodology_version</InlineCode>, and <InlineCode>regime.determinism_hash</InlineCode></div>
        </div>
      </details>

      {/* ── All modals ────────────────────────────────────────────────────── */}
      <ExplainModal
        id="how-to-read-modal"
        title="How to read this page"
        subtitle="Health vs confidence — two separate dimensions that are easy to confuse."
        pair={howToReadExplain}
      />
      <ExplainModal
        id="cadence-modal"
        title="Publication cadence"
        subtitle="Why some chains update daily and others weekly — and what lag thresholds mean."
        pair={cadenceExplain}
      />
      <ExplainModal
        id="confidence-modal"
        title="What confidence means on this page"
        subtitle="Evidence quality for the published label — independent of freshness."
        pair={confidenceExplain}
      />
    </main>
  );
}