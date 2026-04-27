// src/app/status/page.tsx
import type { ReactNode } from "react";
import Link from "next/link";

import { CHAIN_LIST, type ChainId } from "@/config/chains";
import { readDatasetManifest, type DatasetManifest } from "@/lib/dataset";
import { readStorageObject } from "@/lib/storage";
import RegimeBadge from "@/components/RegimeBadge";
import StalenessBar from "@/components/ui/StalenessBar";
import ChainIcon from "@/components/ChainIcon";
import PageHero from "@/components/site/PageHero";
import ShortFullContent from "@/components/site/ShortFullContent";

import StatusInfoModals from "@/components/status/StatusInfoModals";

import "server-only";

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
  return (
    <code className="rounded border border-[#9db8d4] bg-[#f4f9ff] px-1.5 py-0.5 font-mono text-xs font-bold text-[#0d2447]">
      {children}
    </code>
  );
}

function MoreLink({ id, label = "More" }: { id: string; label?: string }) {
  return (
    <a
      href={`#${id}`}
      className="inline-flex items-center rounded-full border border-blue-300 bg-[#d8e9fb] px-3 py-1 text-xs font-extrabold text-[#031329] shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] transition hover:border-blue-500 hover:bg-white hover:text-blue-900"
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
    <div id={id} className="ta-modal fixed inset-0 z-[100] items-center justify-center p-4">
      <a
        href="#"
        data-status-modal-close="true"
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
        aria-label="Close dialog"
      />
      <div className="relative z-10 flex max-h-[88vh] w-full max-w-4xl flex-col rounded-3xl border border-[#b6cce3] bg-[#e7f1fb] shadow-2xl shadow-slate-950/30">
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-[#b6cce3] px-6 py-5">
          <div>
            <h3 className="text-2xl font-black text-[#0d2447]">{title}</h3>
            {subtitle ? <div className="mt-2 text-sm font-medium leading-6 text-[#27476f]">{subtitle}</div> : null}
          </div>
          <a
            href="#"
            data-status-modal-close="true"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#9db8d4] bg-[#dceaf8] text-xl font-bold text-[#0d2447] hover:bg-white"
            aria-label="Close dialog"
          >
            ×
          </a>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-6 pt-5">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <section className="rounded-2xl border border-[#9db8d4] bg-[#dceaf8] p-5">
              <div className="text-xs font-black uppercase tracking-[0.14em] text-blue-800">Basic</div>
              <div className="mt-3 text-sm font-medium leading-7 text-[#0d2447]">{pair.basic}</div>
            </section>
            <details className="rounded-2xl border border-[#9db8d4] bg-[#dceaf8] p-5" open>
              <summary className="cursor-pointer list-none text-xs font-black uppercase tracking-[0.14em] text-blue-800">Advanced</summary>
              <div className="mt-3 text-sm font-medium leading-7 text-[#0d2447]">{pair.advanced}</div>
            </details>
          </div>
          {pair.traceability ? (
            <div className="mt-4 rounded-2xl border border-[#9db8d4] bg-[#dceaf8] p-5">
              <div className="text-xs font-black uppercase tracking-[0.14em] text-[#203c63]">Traceability</div>
              <div className="mt-3 text-sm font-medium leading-7 text-[#0d2447]">{pair.traceability}</div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

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
  const base = "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold";
  if (band === "Good") return `${base} border-emerald-500/25 bg-emerald-500/10 text-emerald-700`;
  if (band === "Caution") return `${base} border-amber-500/25 bg-amber-500/10 text-amber-700`;
  if (band === "Degraded") return `${base} border-red-500/25 bg-red-500/10 text-red-700`;
  return `${base} border-slate-300 bg-slate-100 text-slate-600`;
}

function healthChipClass(kind: "ok" | "warn" | "fail" | "unknown") {
  const base = "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide";
  if (kind === "ok") return `${base} border-emerald-500/25 bg-emerald-500/10 text-emerald-700`;
  if (kind === "warn") return `${base} border-amber-500/25 bg-amber-500/10 text-amber-700`;
  if (kind === "fail") return `${base} border-red-500/25 bg-red-500/10 text-red-700`;
  return `${base} border-slate-300 bg-slate-100 text-slate-600`;
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

const howToReadExplain: ExplainPair = {
  basic: (
    <>
      <p>
        This page answers one question: <span className="font-black">are
        the published data files current and usable right now?</span> It does not say
        anything about what markets are doing or what you should do.
      </p>
      <p className="mt-3">Each chain shows two separate things that are easy to confuse:</p>
      <ul className="mt-2 list-disc space-y-2 pl-5">
        <li>
          <span className="font-black">Health</span> is about freshness — how old is the published row compared to what we expect?
        </li>
        <li>
          <span className="font-black">Confidence</span> is about evidence quality — how strongly does the available data support the published regime label?
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
        chain-specific publication cadence policy.
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
      <li>Source: latest published Meta artifact for each chain</li>
      <li>Lag field: <InlineCode>confidence.lag_days_vs_utc_today</InlineCode></li>
      <li>Confidence field: <InlineCode>confidence.confidence_score</InlineCode></li>
      <li>Health derived at render time — not read from a pre-computed field</li>
    </ul>
  ),
};

const cadenceExplain: ExplainPair = {
  basic: (
    <>
      <p>Different blockchains publish at different speeds. This is not a bug — it is chain-specific cadence policy.</p>
      <ul className="mt-3 list-disc space-y-2 pl-5">
        <li><span className="font-black">Bitcoin and Ethereum</span> — expected to update roughly every day.</li>
        <li><span className="font-black">Arbitrum and Base</span> — published with an expected 7-day delay by design.</li>
      </ul>
    </>
  ),
  advanced: (
    <>
      <p>
        Publication cadence is chain-specific by design: BTC and ETH expect 1-day lag; ARB and BASE expect 7-day lag.
      </p>
      <p className="mt-3">
        The staleness classification table is: for BTC/ETH, soft warn at lag &gt; 2d,
        hard fail at lag &gt; 4d; for ARB/BASE, soft warn at lag &gt; 10d, hard fail
        at lag &gt; 15d.
      </p>
    </>
  ),
  traceability: (
    <ul className="list-disc pl-5">
      <li>Expected publish windows: around 09:00 and 21:00 Europe/Oslo</li>
      <li>BTC/ETH: expected 1d · warn &gt;2d · fail &gt;4d</li>
      <li>ARB/BASE: expected 7d · warn &gt;10d · fail &gt;15d</li>
    </ul>
  ),
};

const confidenceExplain: ExplainPair = {
  basic: (
    <>
      <p>
        The confidence score tells you how well the available on-chain data supports the published regime label — not how fresh the data is.
      </p>
      <ul className="mt-3 list-disc space-y-2 pl-5">
        <li><span className="font-black">Good (≥ 0.70)</span> — strong evidence.</li>
        <li><span className="font-black">Caution (0.40–0.69)</span> — moderate evidence.</li>
        <li><span className="font-black">Degraded (&lt; 0.40)</span> — weak evidence.</li>
      </ul>
    </>
  ),
  advanced: (
    <>
      <p>
        Confidence is the geometric mean of <InlineCode>data_quality_score</InlineCode>{" "}
        and <InlineCode>label_confidence_score</InlineCode>.
      </p>
      <p className="mt-3">
        On the status page, confidence is shown as a diagnostic alongside freshness — not as a standalone signal.
      </p>
    </>
  ),
};

export default async function StatusPage() {
  const dataset: DatasetManifest | null = await readDatasetManifest();
  const rows = await buildStatusRows();
  const notes = datasetNotes(dataset);

  const okCount = rows.filter((r) => r.status === "ok").length;
  const warnCount = rows.filter((r) => r.status === "warn").length;
  const failCount = rows.filter((r) => r.status === "fail").length;
  const overallHealth = failCount > 0 ? "fail" : warnCount > 0 ? "warn" : "ok";

  return (
    <main className="min-h-screen bg-[#edf6ff] text-[#0a1d3a]">
      <ModalStyles />

      <PageHero
        eyebrow="System health"
        title="Status"
        summary="Freshness and confidence for every published chain. This page shows whether the current published artifacts are current and usable right now — not what to do about them."
      >
        <StatusInfoModals />

        <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <div className="text-xs font-black uppercase tracking-[0.14em] text-blue-200">Two separate dimensions</div>
            <div className="mt-2 text-sm leading-7 text-white/86">
              <span className="font-semibold text-white">Health</span> = freshness relative to expected cadence ·{" "}
              <span className="font-semibold text-white">Confidence</span> = evidence quality for the published label.
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs font-black uppercase tracking-[0.12em] text-blue-200">Overall</div>
              <span className={healthChipClass(overallHealth)}>{healthText(overallHealth)}</span>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-2xl font-black text-emerald-300">{okCount}</div>
                <div className="text-xs text-white/55">OK</div>
              </div>
              <div>
                <div className="text-2xl font-black text-amber-300">{warnCount}</div>
                <div className="text-xs text-white/55">WARN</div>
              </div>
              <div>
                <div className="text-2xl font-black text-red-300">{failCount}</div>
                <div className="text-xs text-white/55">FAIL</div>
              </div>
            </div>
          </div>
        </div>
      </PageHero>

      <div className="mx-auto max-w-7xl px-6 py-10">
        <ShortFullContent
          pageKey="status"
          summary={<>This page tells you whether the currently published rows are usable right now, how fresh they are, and whether confidence is holding up independently of freshness.</>}
          bullets={[
            <>Status answers health first: are rows on schedule, slightly delayed, or materially stale for their chain-specific cadence.</>,
            <>Confidence is shown alongside freshness, but it is a different question: evidence quality for the published label, not recency.</>,
            <>BTC/ETH and ARB/BASE use different expected delay policies, so lag must be interpreted relative to chain cadence.</>,
          ]}
          whyItMatters={<>A user should be able to decide quickly whether today&apos;s published rows are operationally safe enough for their workflow before reading the full policy.</>}
          fullContent={
            <>
              <section className="status-staleness-readable mb-8 space-y-3">
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

              <section className="mb-8 overflow-hidden rounded-3xl border border-[#c9d9ea] bg-[#edf5fb] shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_14px_34px_rgba(15,47,91,0.08)]">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#cbdced] px-6 py-5">
                  <div>
                    <div className="text-xs font-black uppercase tracking-[0.14em] text-[#37547b]">Current state</div>
                    <h2 className="mt-1 text-3xl font-black tracking-[-0.035em] text-[#0d2447]">Per-chain overview</h2>
                    <p className="mt-2 text-sm leading-7 text-[#557099]">
                      Regime, confidence, and freshness for each chain from the latest published meta artifact.
                    </p>
                  </div>
                  <StatusInfoModals variant="cadence" />
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-[#cbdced] bg-[#e6f0fa] text-left">
                      <tr>
                        <th className="px-5 py-3 text-xs font-black uppercase tracking-[0.12em] text-[#557099]">Chain</th>
                        <th className="px-5 py-3 text-xs font-black uppercase tracking-[0.12em] text-[#557099]">Regime</th>
                        <th className="px-5 py-3 text-xs font-black uppercase tracking-[0.12em] text-[#557099]">Confidence</th>
                        <th className="px-5 py-3 text-xs font-black uppercase tracking-[0.12em] text-[#557099]">Band</th>
                        <th className="px-5 py-3 text-xs font-black uppercase tracking-[0.12em] text-[#557099]">Lag</th>
                        <th className="px-5 py-3 text-xs font-black uppercase tracking-[0.12em] text-[#557099]">As of</th>
                        <th className="px-5 py-3 text-xs font-black uppercase tracking-[0.12em] text-[#557099]">Expected delay</th>
                        <th className="px-5 py-3 text-xs font-black uppercase tracking-[0.12em] text-[#557099]">Health</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#cbdced]">
                      {rows.map((row) => {
                        const band = confidenceBand(row.confidence_score);
                        return (
                          <tr key={row.chain} className="transition hover:bg-[#e6f0fa]/70">
                            <td className="px-5 py-4">
                              <Link href={`/chains/${row.chain}`} className="inline-flex items-center gap-3 font-semibold text-[#0d2447] hover:text-blue-700">
                                <ChainIcon chain={row.chain} className="h-7 w-7 text-xs" label={`${row.label} icon`} />
                                <span>{row.label || row.name}</span>
                              </Link>
                            </td>
                            <td className="px-5 py-4"><RegimeBadge label={row.published_regime ?? "—"} /></td>
                            <td className="px-5 py-4 font-mono text-xs text-[#0d2447]">
                              {typeof row.confidence_score === "number" ? row.confidence_score.toFixed(3) : "—"}
                            </td>
                            <td className="px-5 py-4"><span className={bandChipClass(band)}>{band}</span></td>
                            <td className="px-5 py-4 font-mono text-xs text-[#0d2447]">{row.lag_days !== null ? `${row.lag_days}d` : "—"}</td>
                            <td className="px-5 py-4 font-mono text-xs text-[#0d2447]">{fmtDate(row.as_of)}</td>
                            <td className="px-5 py-4 font-mono text-xs text-[#0d2447]">{row.expected_delay_days === 0 ? "~1d" : `~${row.expected_delay_days}d`}</td>
                            <td className="px-5 py-4"><span className={healthChipClass(row.status)}>{healthText(row.status)}</span></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="border-t border-[#cbdced] px-5 py-3 text-xs font-medium text-[#557099]">
                  Source: latest published Meta artifact per chain · Health is derived at render time from lag vs expected cadence
                </div>
              </section>

              <section className="mb-8 rounded-3xl border border-[#c9d9ea] bg-[#edf5fb] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_14px_34px_rgba(15,47,91,0.08)]">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-black uppercase tracking-[0.14em] text-[#37547b]">Publication policy</div>
                    <h2 className="mt-1 text-2xl font-black tracking-[-0.03em] text-[#0d2447]">Expected cadence per chain</h2>
                  </div>
                  <StatusInfoModals variant="cadence" />
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
                      <div className="text-sm font-black text-[#0d2447]">{chains}</div>
                      <p className="mt-1 text-xs leading-5 text-[#557099]">{note}</p>
                      <div className="mt-4 grid grid-cols-3 gap-3 text-center text-xs">
                        <div className="rounded-xl border border-emerald-500/20 bg-white/40 px-2 py-2">
                          <div className="font-bold text-emerald-700">OK</div>
                          <div className="mt-1 text-[#557099]">≤ {expected}</div>
                        </div>
                        <div className="rounded-xl border border-amber-500/20 bg-white/40 px-2 py-2">
                          <div className="font-bold text-amber-700">WARN</div>
                          <div className="mt-1 text-[#557099]">{warn}</div>
                        </div>
                        <div className="rounded-xl border border-red-500/20 bg-white/40 px-2 py-2">
                          <div className="font-bold text-red-700">FAIL</div>
                          <div className="mt-1 text-[#557099]">{fail}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {notes.length > 0 ? (
                <section className="mb-8 rounded-3xl border border-amber-500/20 bg-amber-500/5 p-6 shadow-sm">
                  <div className="text-xs font-black uppercase tracking-[0.14em] text-amber-700">Dataset notes</div>
                  <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-[#0d2447]">
                    {notes.map((note) => <li key={note}>{note}</li>)}
                  </ul>
                </section>
              ) : null}

              <section className="mt-10 rounded-3xl border border-[#c9d9ea] bg-[#edf5fb] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_14px_34px_rgba(15,47,91,0.08)]">
                <div className="text-xs font-black uppercase tracking-[0.14em] text-[#37547b]">Related</div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    { href: "/chains", label: "Chains", desc: "Current regime for each network" },
                    { href: "/track-record", label: "Track Record", desc: "Historical label archive" },
                    { href: "/methodology", label: "Methodology", desc: "How labels are produced" },
                    { href: "/glossary", label: "Glossary", desc: "Definitions for every term" },
                  ].map(({ href, label, desc }) => (
                    <Link key={href} href={href} className="group flex items-center justify-between rounded-2xl border border-[#cbdced] bg-white/35 px-4 py-3 transition hover:border-blue-300 hover:bg-white/55">
                      <div>
                        <div className="text-sm font-bold text-[#0d2447]">{label}</div>
                        <div className="mt-0.5 text-xs text-[#557099]">{desc}</div>
                      </div>
                      <span className="text-xs text-[#557099] transition group-hover:text-blue-700">→</span>
                    </Link>
                  ))}
                </div>
              </section>

              <details className="mt-8 rounded-2xl border border-[#c9d9ea] bg-[#edf5fb] p-5">
                <summary className="cursor-pointer text-sm font-bold text-[#557099] hover:text-[#0d2447]">Data contract and traceability</summary>
                <div className="mt-4 grid gap-2 text-sm text-[#557099]">
                  <div>Public provenance anchors: date / updated_through / methodology_version / published revision / regime.determinism_hash</div>
                  <div>Health classification is derived at render time — not read from a pre-computed status field.</div>
                  <div>Operational expectations and correction policy are documented on the service and provenance pages.</div>
                </div>
              </details>
            </>
          }
        />

        <div className="mt-8 rounded-2xl border border-[#c9d9ea] bg-[#edf5fb] p-4 text-sm leading-7 text-[#557099]">
          Operational expectations, support response target, and revision / correction policy are documented at{" "}
          <Link href="/service" className="font-bold text-blue-700 underline">/service</Link>.
        </div>
      </div>
      
    </main>
  );
}