// src/app/status/page.tsx
import type { ReactNode } from "react";
import Link from "next/link";

import { CHAIN_LIST, type ChainId } from "@/config/chains";
import { readDatasetManifest, type DatasetManifest } from "@/lib/dataset";
import { readStorageObject } from "@/lib/storage";
import ChainIcon from "@/components/ChainIcon";
import { UrdContainer, UrdPage } from "@/components/site/UrdDesignSystem";

import "server-only";

type SourceFreshnessChain = {
  last_run_at_utc?: string | null;
  last_run_date?: string | null;
  last_data_load_date?: string | null;
  latest_available_source_date?: string | null;
  latest_seen_source_partition_date?: string | null;
  source_cutoff_date?: string | null;
  published_asof?: string | null;
  source_latest_available?: string | null;
  source_effective_latest?: string | null;
  reason_code?: string | null;
  reason?: string | null;
  source_is_newer_than_published?: boolean;
  source_is_not_newer_than_published?: boolean;
};

type SourceFreshnessReport = {
  generated_at_utc?: string;
  last_run_at_utc?: string;
  last_run_date?: string;
  source?: string;
  chains?: Record<string, SourceFreshnessChain>;
};

type ChainDegradationReason =
  | "published_meta_missing"
  | "published_meta_invalid_json"
  | "published_meta_invalid_shape";

type ChainDegradation = {
  degraded: true;
  reason_code: ChainDegradationReason;
  source_path: string;
  detail: string;
};

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
  source_freshness: SourceFreshnessChain | null;
  freshness_explanation: string | null;
  degradation: ChainDegradation | null;
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

type ExplainPair = { basic: ReactNode; advanced: ReactNode; traceability?: ReactNode };

function ModalStyles() {
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `
          .ta-modal { display: none; }
          .ta-modal:target { display: flex; }
          .ta-summary { list-style: none; }
          .ta-summary::-webkit-details-marker { display: none; }
        `,
      }}
    />
  );
}

function InlineCode({ children }: { children: ReactNode }) {
  return <code className="font-mono text-[12px] text-[#D9AB4A]">{children}</code>;
}

function TextLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      className="inline-flex items-center gap-2 border-b border-[rgba(196,146,48,.20)] pb-[1px] font-mono text-[11px] uppercase tracking-[0.08em] text-[#C49230] transition hover:border-[#C49230] hover:text-[#D9AB4A]"
    >
      {children}
    </a>
  );
}

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
    <div id={id} className="ta-modal fixed inset-0 z-[180] items-center justify-center p-4">
      <a href="#" className="absolute inset-0 bg-[#080F1A]/88" aria-label="Close dialog" />
      <div className="relative z-10 flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-[8px] border border-[rgba(232,224,208,.14)] bg-[#111E30]">
        <div className="flex items-start justify-between gap-6 border-b border-[rgba(232,224,208,.07)] px-6 py-5">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#C49230]">Status page</div>
            <h3 className="mt-2 font-[var(--serif)] text-[30px] leading-[1.1] text-[#E8E0D0]">{title}</h3>
            {subtitle ? (
              <div className="mt-3 max-w-3xl text-[14px] leading-7 text-[#7A8A96]">{subtitle}</div>
            ) : null}
          </div>
          <a
            href="#"
            className="inline-flex h-9 w-9 items-center justify-center rounded-[3px] border border-[rgba(232,224,208,.14)] font-mono text-[14px] text-[#E8E0D0] transition hover:border-[rgba(232,224,208,.22)] hover:bg-[#162840]"
            aria-label="Close dialog"
          >
            Ã—
          </a>
        </div>
        <div className="overflow-y-auto px-6 py-6">
          <div className="grid gap-10 lg:grid-cols-2">
            <section>
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#C49230]">Basic</div>
              <div className="mt-3 text-[15px] leading-[1.82] text-[#7A8A96]">{pair.basic}</div>
            </section>
            <section>
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#C49230]">Advanced</div>
              <div className="mt-3 text-[15px] leading-[1.82] text-[#7A8A96]">{pair.advanced}</div>
            </section>
          </div>
          {pair.traceability ? (
            <section className="mt-8 border-t border-[rgba(232,224,208,.07)] pt-6">
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#C49230]">Traceability</div>
              <div className="mt-3 text-[14px] leading-[1.82] text-[#7A8A96]">{pair.traceability}</div>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function arrayBufferToUtf8(buffer: ArrayBuffer): string {
  return new TextDecoder("utf-8").decode(new Uint8Array(buffer));
}

type PublishedJsonReadStatus = "ok" | "missing" | "invalid_json" | "invalid_shape";

type PublishedJsonRead<T> = {
  path: string;
  status: PublishedJsonReadStatus;
  value: T | null;
  detail: string | null;
};

async function readPublishedJsonWithState<T>(
  storagePath: string
): Promise<PublishedJsonRead<T>> {
  const result = await readStorageObject(storagePath);

  if (!result) {
    return {
      path: storagePath,
      status: "missing",
      value: null,
      detail: "Published JSON object is missing.",
    };
  }

  try {
    const raw = arrayBufferToUtf8(result.body);
    const json = JSON.parse(raw);

    if (!json || typeof json !== "object") {
      return {
        path: storagePath,
        status: "invalid_shape",
        value: null,
        detail: "Published JSON object is not an object.",
      };
    }

    return {
      path: storagePath,
      status: "ok",
      value: json as T,
      detail: null,
    };
  } catch {
    return {
      path: storagePath,
      status: "invalid_json",
      value: null,
      detail: "Published JSON object could not be parsed.",
    };
  }
}

async function readPublishedJson<T>(storagePath: string): Promise<T | null> {
  const result = await readPublishedJsonWithState<T>(storagePath);
  return result.value;
}

function chainDegradationFromMetaRead(
  read: PublishedJsonRead<unknown>
): ChainDegradation | null {
  if (read.status === "ok") {
    return null;
  }

  if (read.status === "missing") {
    return {
      degraded: true,
      reason_code: "published_meta_missing",
      source_path: read.path,
      detail: read.detail ?? "Published meta latest JSON is missing.",
    };
  }

  if (read.status === "invalid_json") {
    return {
      degraded: true,
      reason_code: "published_meta_invalid_json",
      source_path: read.path,
      detail: read.detail ?? "Published meta latest JSON could not be parsed.",
    };
  }

  return {
    degraded: true,
    reason_code: "published_meta_invalid_shape",
    source_path: read.path,
    detail: read.detail ?? "Published meta latest JSON is not an object.",
  };
}

function fmtDate(d?: string | null) {
  return d && d.trim().length > 0 ? d : "â€”";
}

function parseIsoDayToOsloMs(date?: string | null): number | null {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const [y, m, d] = date.split("-").map(Number);
  const ms = Date.UTC(y, m - 1, d);
  return Number.isFinite(ms) ? ms : null;
}

function osloTodayMs(): number {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Oslo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
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

function confidenceBand(v?: number | null) {
  if (typeof v !== "number") return "Unknown";
  if (v >= 0.7) return "Good";
  if (v >= 0.4) return "Caution";
  return "Degraded";
}

function healthText(kind: "ok" | "warn" | "fail" | "unknown") {
  if (kind === "ok") return "On schedule";
  if (kind === "warn") return "Soft staleness";
  if (kind === "fail") return "Delayed";
  return "Unknown";
}

function healthLabel(kind: "ok" | "warn" | "fail" | "unknown") {
  if (kind === "ok") return "OK";
  if (kind === "warn") return "WARN";
  if (kind === "fail") return "FAIL";
  return "UNKNOWN";
}

function healthClass(kind: "ok" | "warn" | "fail" | "unknown") {
  if (kind === "ok") return "text-[#10B981]";
  if (kind === "warn") return "text-[#C4843C]";
  if (kind === "fail") return "text-[#9E4040]";
  return "text-[#525E6E]";
}

function regimeClass(label?: string | null) {
  const value = (label ?? "").toUpperCase();
  if (value === "STABLE") return "text-[#10B981]";
  if (value === "HEATING") return "text-[#C4843C]";
  if (value === "CONGESTED") return "text-[#9E4040]";
  if (value === "CHEAP") return "text-[#3D7099]";
  return "text-[#525E6E]";
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

function sourceFreshnessForChain(
  report: SourceFreshnessReport | null,
  chain: ChainId
): SourceFreshnessChain | null {
  const row = report?.chains?.[chain];
  return row && typeof row === "object" ? row : null;
}

function sourceExplainsPublishedLag(sourceFreshness: SourceFreshnessChain | null): boolean {
  if (!sourceFreshness) return false;
  if (sourceFreshness.reason_code === "source_not_newer_than_published") return true;
  if (sourceFreshness.reason_code === "published_newer_than_source_listing") return true;
  if (sourceFreshness.source_is_not_newer_than_published === true) return true;
  return false;
}

function sourceCheckUnavailable(sourceFreshness: SourceFreshnessChain | null): boolean {
  if (!sourceFreshness) return false;
  return (
    sourceFreshness.reason_code === "source_check_unavailable" ||
    sourceFreshness.reason_code === "source_no_dates_detected"
  );
}

function sourceFreshnessLabel(row: StatusRow): string {
  const source = row.source_freshness;
  const lastRun = source?.last_run_date ?? "Ã¢â‚¬â€";
  const lastLoad = source?.last_data_load_date ?? row.as_of ?? "Ã¢â‚¬â€";
  const latestSource =
    source?.latest_available_source_date ??
    source?.source_effective_latest ??
    source?.source_latest_available ??
    "Ã¢â‚¬â€";

  return `Last run: ${lastRun} Ã‚Â· Last data load: ${lastLoad} Ã‚Â· Latest source: ${latestSource}`;
}

function deriveHealth(params: {
  lagDays: number | null;
  asOf: string | null;
  expectedDelayDays: number;
  sourceFreshness: SourceFreshnessChain | null;
}): "ok" | "warn" | "fail" | "unknown" {
  const { lagDays, asOf, expectedDelayDays, sourceFreshness } = params;
  if (!asOf || typeof lagDays !== "number") return "unknown";
  if (lagDays <= expectedDelayDays) return "ok";
  if (lagDays <= expectedDelayDays + 2) return "warn";
  if (sourceExplainsPublishedLag(sourceFreshness) || sourceCheckUnavailable(sourceFreshness)) return "warn";
  return "fail";
}

async function buildStatusRows(): Promise<StatusRow[]> {
  const sourceFreshnessReport = await readPublishedJson<SourceFreshnessReport>(
    "data/published/v1/source-freshness.json"
  );

  return Promise.all(
    CHAIN_LIST.map(async (chain) => {
      const metaPath = `data/published/v1/meta/${chain.id}/latest.json`;
      const [metaRead, hero] = await Promise.all([
        readPublishedJsonWithState<MetaLatest>(metaPath),
        readPublishedJson<LandingHero>(`data/published/v1/landing/${chain.id}/hero.json`),
      ]);
      const meta = metaRead.value;
      const degradation = chainDegradationFromMetaRead(metaRead);
      const displayAsOf = heroDisplayAsOf(hero);
      const asOf = displayAsOf ?? meta?.updated_through ?? meta?.regime?.asof_date ?? meta?.date ?? null;
      const lagDays = lagDaysFromIsoDay(asOf);
      const delay = expectedDelayDays(chain.id);
      const sourceFreshness = sourceFreshnessForChain(sourceFreshnessReport, chain.id);
      const status = deriveHealth({
        lagDays,
        asOf,
        expectedDelayDays: delay,
        sourceFreshness,
      });
      const freshnessExplanation =
        sourceFreshness?.reason ??
        (status === "fail"
          ? "Published data is older than the chain freshness policy and no upstream source explanation is available."
          : null);

      return {
        chain: chain.id,
        name: chain.name,
        label: chain.label,
        as_of: asOf,
        lag_days: lagDays,
        status,
        published_regime: meta?.status?.label ?? meta?.regime?.label ?? null,
        confidence_score:
          typeof meta?.confidence?.confidence_score === "number" ? meta.confidence.confidence_score : null,
        expected_delay_days: delay,
        source_freshness: sourceFreshness,
        freshness_explanation: freshnessExplanation,
        degradation,
      };
    })
  );
}

function chainNarrative(row: StatusRow) {
  if (row.degradation) {
    return "Published meta artifact is degraded. The row remains visible for traceability, but regime, confidence, and freshness should be treated as degraded until the artifact is repaired.";
  }

  const band = confidenceBand(row.confidence_score);
  if (row.status === "ok" && band === "Good") {
    return "Published data is on its expected schedule and the evidence quality behind the label is strong.";
  }
  if (row.status === "ok" && band === "Caution") {
    return "Published data is current, but evidence quality is moderate rather than strong. The row is usable, with more caution in interpretation.";
  }
  if (row.status === "ok" && band === "Degraded") {
    return "Published data is current, but the evidence quality is degraded. Freshness is not the issue here; confidence is.";
  }
  if (row.status === "warn") {
    if (sourceExplainsPublishedLag(row.source_freshness)) {
      return row.freshness_explanation ?? "Published data is behind policy because the upstream AWS source has no newer complete day available.";
    }
    if (sourceCheckUnavailable(row.source_freshness)) {
      return row.freshness_explanation ?? "Published data is behind policy, and the upstream source freshness check is currently unavailable.";
    }
    return "Published data is slightly behind the chainÃ¢â‚¬â„¢s usual cadence. The row is still shown, but freshness should be read with more caution.";
  }
  if (row.status === "fail") {
    if (row.source_freshness?.source_is_newer_than_published) {
      return row.freshness_explanation ?? "The upstream AWS source has newer data than the currently published dataset, so the publication pipeline is behind source.";
    }
    return "Published data is beyond the normal freshness boundary for this chain. Treat the latest row as delayed until the next expected publication arrives.";
  }
  return "Freshness cannot be classified from the latest available publication metadata.";
}

function degradationCopy(degradation: ChainDegradation): string {
  return `${degradation.detail} Source path: ${degradation.source_path}.`;
}

function cadenceCopy(chain: ChainId) {
  if (chain === "arbitrum" || chain === "base") {
    return "Expected ~7d Â· soft warning > 10d Â· hard fail > 15d";
  }
  return "Expected ~1d Â· soft warning > 2d Â· hard fail > 4d";
}

const howToReadExplain: ExplainPair = {
  basic: (
    <>
      <p>
        This page answers one question: <span className="text-[#E8E0D0]">are the published data files current and usable right now?</span>
        It does not say anything about what markets are doing or what a subscriber should do.
      </p>
      <p className="mt-4">Each chain shows two separate things that are easy to confuse.</p>
      <ul className="mt-4 list-disc space-y-2 pl-5">
        <li>
          <span className="text-[#E8E0D0]">Health</span> is freshness relative to expected cadence.
          Bitcoin and Ethereum should update roughly daily. Arbitrum and Base update roughly weekly by design.
        </li>
        <li>
          <span className="text-[#E8E0D0]">Confidence</span> is evidence quality for the published label.
          A row can be fresh and still degraded if the evidence surface is weak.
        </li>
      </ul>
    </>
  ),
  advanced: (
    <>
      <p>
        Health is derived at render time from lag versus the chain-specific publication policy. Confidence is read from the latest
        published meta artifact and measures the evidentiary strength behind the label.
      </p>
      <p className="mt-4">
        These dimensions are orthogonal. A chain can be delayed but internally coherent, or fresh but epistemically weak.
        Both are shown to keep operational freshness from masking evidence quality and vice versa.
      </p>
    </>
  ),
  traceability: (
    <ul className="list-disc space-y-2 pl-5">
      <li>Source: latest published meta artifact per chain</li>
      <li>Lag field: <InlineCode>confidence.lag_days_vs_utc_today</InlineCode></li>
      <li>Confidence field: <InlineCode>confidence.confidence_score</InlineCode></li>
      <li>Health is derived at render time, not read from a stored status field</li>
    </ul>
  ),
};

const cadenceExplain: ExplainPair = {
  basic: (
    <>
      <p>
        Different chains publish at different speeds by design. That means lag must always be interpreted relative to policy.
      </p>
      <ul className="mt-4 list-disc space-y-2 pl-5">
        <li><span className="text-[#E8E0D0]">Bitcoin and Ethereum</span> are expected roughly daily.</li>
        <li><span className="text-[#E8E0D0]">Arbitrum and Base</span> are intentionally published with an expected 7-day delay.</li>
      </ul>
      <p className="mt-4">
        The operational pipeline generally checks for new upstream data twice daily around 09:00 and 21:00 Europe/Oslo.
      </p>
    </>
  ),
  advanced: (
    <>
      <p>
        BTC and ETH use a daily cadence policy: expected 1 day, soft warning above 2 days, hard fail above 4 days.
        ARB and BASE use a weekly cadence policy: expected 7 days, soft warning above 10 days, hard fail above 15 days.
      </p>
      <p className="mt-4">
        This is why the same absolute lag value can be normal for one chain and anomalous for another.
      </p>
    </>
  ),
  traceability: (
    <ul className="list-disc space-y-2 pl-5">
      <li>Expected windows: around 09:00 and 21:00 Europe/Oslo</li>
      <li>BTC / ETH: expected 1d Â· warn &gt; 2d Â· fail &gt; 4d</li>
      <li>ARB / BASE: expected 7d Â· warn &gt; 10d Â· fail &gt; 15d</li>
    </ul>
  ),
};

const confidenceExplain: ExplainPair = {
  basic: (
    <>
      <p>
        Confidence measures how strongly the available data supports the published label.
      </p>
      <ul className="mt-4 list-disc space-y-2 pl-5">
        <li><span className="text-[#E8E0D0]">Good</span> (â‰¥ 0.70) means strong evidence.</li>
        <li><span className="text-[#E8E0D0]">Caution</span> (0.40â€“0.69) means moderate evidence.</li>
        <li><span className="text-[#E8E0D0]">Degraded</span> (&lt; 0.40) means weak evidence.</li>
      </ul>
    </>
  ),
  advanced: (
    <>
      <p>
        Confidence is shown here as an operational diagnostic, not as a market signal.
        It indicates how well the evidence surface distinguishes the published label from adjacent labels.
      </p>
      <p className="mt-4">
        A degraded score means the row may still be published for traceability, but the label should be treated as low-trust.
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
  const goodConfidence = rows.filter((r) => confidenceBand(r.confidence_score) === "Good").length;
  const degradedConfidence = rows.filter((r) => confidenceBand(r.confidence_score) === "Degraded").length;
  const degradedArtifacts = rows.filter((r) => r.degradation !== null).length;

  return (
    <UrdPage className="bg-[#080F1A] text-[#E8E0D0]">
      <ModalStyles />

      <header className="relative overflow-hidden border-b border-[rgba(232,224,208,.07)] bg-[linear-gradient(180deg,#080F1A_0%,#0D1F35_100%)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(42,110,122,.14),transparent_28rem),radial-gradient(circle_at_88%_10%,rgba(196,146,48,.08),transparent_26rem)]" />
        <UrdContainer className="relative py-16 sm:py-20">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#C49230]">System health</div>
              <h1 className="mt-6 max-w-4xl font-[var(--serif)] text-[clamp(48px,5.5vw,82px)] font-normal leading-[1.02] tracking-[-0.035em] text-[#E8E0D0]">
                Read <em className="text-[#D9AB4A] not-italic">freshness</em> and evidence quality
                <br />
                without confusing them.
              </h1>
              <p className="mt-6 max-w-3xl text-[15px] leading-[1.82] text-[#7A8A96]">
                Status shows whether the latest published rows are current enough for operational use,
                and whether confidence is strong enough for the published label to be read normally.
                No price data. No forecasts. No recommendations.
              </p>
              <div className="mt-8 flex flex-wrap gap-6">
                <TextLink href="#how-to-read">How to read this page â†’</TextLink>
                <TextLink href="#cadence">Publication cadence â†’</TextLink>
                <TextLink href="#confidence">Confidence bands â†’</TextLink>
              </div>
              <div className="mt-8 text-[14px] leading-7 text-[#7A8A96]">
                Expected publish windows around <span className="text-[#E8E0D0]">09:00</span> and <span className="text-[#E8E0D0]">21:00 Europe/Oslo</span>.
              </div>
            </div>

            <section className="rounded-[5px] border border-[rgba(232,224,208,.14)] border-t-[rgba(196,146,48,.20)] bg-[#111E30] p-5">
              <div className="flex items-center justify-between gap-4 border-b border-[rgba(232,224,208,.07)] pb-4">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#C49230]">Latest published context</div>
                  <div className="mt-2 text-[14px] leading-6 text-[#7A8A96]">Chain-relative freshness, not price-relative.</div>
                </div>
                <div className="text-right font-mono text-[11px] leading-6 text-[#7A8A96]">
                  {dataset?.published_at ? (
                    <>
                      <div>Published {dataset.published_at.slice(0, 10)}</div>
                      {dataset?.version ? <div>Revision {dataset.version}</div> : null}
                    </>
                  ) : (
                    <div>Latest dataset manifest loaded</div>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-8 gap-y-4 py-5 sm:grid-cols-3">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#C49230]">Chains</div>
                  <div className="mt-2 font-[var(--serif)] text-[34px] leading-none text-[#E8E0D0]">4</div>
                </div>
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#C49230]">On schedule</div>
                  <div className="mt-2 font-[var(--serif)] text-[34px] leading-none text-[#10B981]">{okCount}</div>
                </div>
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#C49230]">Delayed</div>
                  <div className="mt-2 font-[var(--serif)] text-[34px] leading-none text-[#C4843C]">{warnCount + failCount}</div>
                </div>
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#C49230]">Good confidence</div>
                  <div className="mt-2 font-[var(--serif)] text-[34px] leading-none text-[#E8E0D0]">{goodConfidence}</div>
                </div>
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#C49230]">Degraded confidence</div>
                  <div className="mt-2 font-[var(--serif)] text-[34px] leading-none text-[#9E4040]">{degradedConfidence}</div>
                </div>
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#C49230]">Degraded artifacts</div>
                  <div className="mt-2 font-[var(--serif)] text-[34px] leading-none text-[#9E4040]">{degradedArtifacts}</div>
                </div>
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#C49230]">Methodology</div>
                  <div className="mt-2 font-mono text-[13px] text-[#E8E0D0]">{dataset?.methodology_version ?? "v1"}</div>
                </div>
              </div>
              <div className="border-t border-[rgba(232,224,208,.07)] pt-4 text-[13px] leading-6 text-[#7A8A96]">
                Health = freshness relative to expected cadence. Confidence = evidence quality for the published label.
              </div>
            </section>
          </div>
        </UrdContainer>
      </header>

      <UrdContainer className="py-12">
        <section className="border-b border-[rgba(232,224,208,.07)] pb-10">
          <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-10">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#C49230]">Reading map</div>
              <h2 className="mt-4 font-[var(--serif)] text-[clamp(32px,3.8vw,54px)] font-normal leading-[1.08] tracking-[-0.025em] text-[#E8E0D0]">
                Two dimensions.
              </h2>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="reveal">
                <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#C49230]">Health</div>
                <p className="mt-3 text-[15px] leading-[1.82] text-[#7A8A96]">
                  Freshness relative to the chain-specific publication policy. BTC and ETH are expected roughly daily.
                  ARB and BASE are expected roughly weekly.
                </p>
              </div>
              <div className="reveal">
                <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#C49230]">Confidence</div>
                <p className="mt-3 text-[15px] leading-[1.82] text-[#7A8A96]">
                  Evidence quality for the published label. A row can be current and still degraded,
                  or delayed and still internally coherent.
                </p>
              </div>
            </div>
          </div>
          <div className="mt-8 flex flex-wrap gap-6">
            <TextLink href="#how-to-read-modal">Full explanation â†’</TextLink>
            <Link
              href="/service"
              className="inline-flex items-center gap-2 border-b border-[rgba(232,224,208,.07)] pb-[1px] font-mono text-[11px] uppercase tracking-[0.08em] text-[#7A8A96] transition hover:border-[rgba(232,224,208,.22)] hover:text-[#E8E0D0]"
            >
              Service policy â†’
            </Link>
          </div>
        </section>

        <section className="border-b border-[rgba(232,224,208,.07)] py-12">
          <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-10">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#C49230]">Current state</div>
              <h2 className="mt-4 font-[var(--serif)] text-[clamp(32px,3.8vw,54px)] font-normal leading-[1.08] tracking-[-0.025em] text-[#E8E0D0]">
                Per-chain overview.
              </h2>
            </div>
            <div>
              <div className="border-t border-[rgba(232,224,208,.07)]">
                {rows.map((row) => {
                  const band = confidenceBand(row.confidence_score);
                  return (
                    <article
                      key={row.chain}
                      className="group relative grid gap-6 border-b border-[rgba(232,224,208,.07)] py-7 transition hover:bg-[#162840]/40 md:grid-cols-[minmax(0,1fr)_240px] md:pl-0"
                    >
                      <span className="absolute left-0 top-0 bottom-0 w-[2px] bg-transparent transition group-hover:bg-[#C49230]" />
                      <div className="pl-4 transition group-hover:pl-6">
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                          <Link
                            href={`/chains/${row.chain}`}
                            className="inline-flex items-center gap-3 text-[#E8E0D0] transition hover:text-[#D9AB4A]"
                          >
                            <ChainIcon chain={row.chain} className="h-7 w-7 text-xs" label={`${row.label} icon`} />
                            <span className="font-mono text-[12px] uppercase tracking-[0.12em]">{row.label || row.name}</span>
                          </Link>
                          <span className={`font-mono text-[11px] uppercase tracking-[0.08em] ${regimeClass(row.published_regime)}`}>
                            {row.published_regime ?? "UNKNOWN / DEGRADED"}
                          </span>
                          <span className={`font-mono text-[11px] uppercase tracking-[0.08em] ${healthClass(row.status)}`}>
                            {healthLabel(row.status)}
                          </span>
                        </div>
                        <h3 className="mt-4 font-[var(--serif)] text-[24px] leading-[1.2] text-[#E8E0D0]">
                          {healthText(row.status)}
                        </h3>
                        <p className="mt-3 max-w-3xl text-[15px] leading-[1.82] text-[#7A8A96]">
                          {chainNarrative(row)}
                        </p>
                        <div className="mt-4 text-[13px] leading-7 text-[#7A8A96]">
                          <span className="text-[#E8E0D0]">Policy:</span> {cadenceCopy(row.chain)}
                        </div>
                          <div className="mt-2 text-[13px] leading-7 text-[#7A8A96]">
                            <span className="text-[#E8E0D0]">Dates:</span> {sourceFreshnessLabel(row)}
                          </div>
                          {row.freshness_explanation ? (
                            <div className="mt-2 text-[13px] leading-7 text-[#7A8A96]">
                              <span className="text-[#E8E0D0]">Freshness note:</span> {row.freshness_explanation}
                            </div>
                          ) : null}
                          {row.degradation ? (
                            <div className="mt-2 text-[13px] leading-7 text-[#C4843C]">
                              <span className="text-[#E8E0D0]">Artifact note:</span> {degradationCopy(row.degradation)}
                            </div>
                          ) : null}
                      </div>
                      <div className="border-t border-[rgba(232,224,208,.07)] pt-4 md:border-t-0 md:border-l md:border-[rgba(232,224,208,.07)] md:pl-6">
                        <dl className="grid grid-cols-2 gap-x-4 gap-y-4 text-[13px] leading-6">
                          <div>
                            <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#C49230]">Last data load</dt>
                            <dd className="mt-1 text-[#E8E0D0]">{fmtDate(row.source_freshness?.last_data_load_date ?? row.as_of)}</dd>
                          </div>
                          <div>
                            <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#C49230]">Observed lag</dt>
                            <dd className="mt-1 text-[#E8E0D0]">{row.lag_days !== null ? `${row.lag_days}d` : "â€”"}</dd>
                          </div>
                          <div>
                            <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#C49230]">Last run</dt>
                            <dd className="mt-1 text-[#E8E0D0]">{fmtDate(row.source_freshness?.last_run_date)}</dd>
                          </div>
                          <div>
                            <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#C49230]">Latest source</dt>
                            <dd className="mt-1 text-[#E8E0D0]">{fmtDate(row.source_freshness?.latest_available_source_date ?? row.source_freshness?.source_effective_latest)}</dd>
                          </div>
                          <div>
                            <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#C49230]">Confidence</dt>
                            <dd className="mt-1 text-[#E8E0D0]">
                              {typeof row.confidence_score === "number" ? row.confidence_score.toFixed(3) : "â€”"}
                            </dd>
                          </div>
                          <div>
                            <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#C49230]">Band</dt>
                            <dd
                              className={`mt-1 ${
                                band === "Good"
                                  ? "text-[#10B981]"
                                  : band === "Caution"
                                    ? "text-[#C4843C]"
                                    : band === "Degraded"
                                      ? "text-[#9E4040]"
                                      : "text-[#525E6E]"
                              }`}
                            >
                              {band}
                            </dd>
                          </div>
                        </dl>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-[rgba(232,224,208,.07)] py-12" id="cadence">
          <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-10">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#C49230]">Publication policy</div>
              <h2 className="mt-4 font-[var(--serif)] text-[clamp(32px,3.8vw,54px)] font-normal leading-[1.08] tracking-[-0.025em] text-[#E8E0D0]">
                Chain cadence.
              </h2>
            </div>
            <div className="border-t border-[rgba(232,224,208,.07)]">
              {[
                {
                  label: "Bitcoin Â· Ethereum",
                  policy: "Expected ~1 day Â· soft warning above 2 days Â· hard fail above 4 days",
                  note: "Daily publication policy. A one-day lag is normal.",
                },
                {
                  label: "Arbitrum Â· Base",
                  policy: "Expected ~7 days Â· soft warning above 10 days Â· hard fail above 15 days",
                  note: "Weekly-style publication policy by design. Seeing 7d lag is normal.",
                },
              ].map((item) => (
                <div key={item.label} className="border-b border-[rgba(232,224,208,.07)] py-6">
                  <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-[#E8E0D0]">{item.label}</div>
                  <div className="mt-3 text-[15px] leading-[1.82] text-[#7A8A96]">{item.note}</div>
                  <div className="mt-3 font-mono text-[12px] text-[#C49230]">{item.policy}</div>
                </div>
              ))}
              <div className="pt-6">
                <TextLink href="#cadence-modal">Full cadence explanation â†’</TextLink>
              </div>
            </div>
          </div>
        </section>

        {notes.length > 0 ? (
          <section className="border-b border-[rgba(232,224,208,.07)] py-12">
            <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-10">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#C49230]">Dataset notes</div>
                <h2 className="mt-4 font-[var(--serif)] text-[clamp(32px,3.8vw,54px)] font-normal leading-[1.08] tracking-[-0.025em] text-[#E8E0D0]">
                  Manifest notes.
                </h2>
              </div>
              <div className="border-t border-[rgba(232,224,208,.07)]">
                {notes.map((note) => (
                  <div key={note} className="border-b border-[rgba(232,224,208,.07)] py-5 text-[15px] leading-[1.82] text-[#7A8A96]">
                    {note}
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        <section className="border-b border-[rgba(232,224,208,.07)] py-12">
          <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-10">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#C49230]">Related</div>
              <h2 className="mt-4 font-[var(--serif)] text-[clamp(32px,3.8vw,54px)] font-normal leading-[1.08] tracking-[-0.025em] text-[#E8E0D0]">
                Next places to read.
              </h2>
            </div>
            <div className="border-t border-[rgba(232,224,208,.07)]">
              {[
                { href: "/chains", label: "Chains", desc: "Current chain-by-chain regime context and history." },
                { href: "/track-record", label: "Track record", desc: "Historical label archive and consistency view." },
                { href: "/methodology", label: "Methodology", desc: "How the published layers and labels are produced." },
                { href: "/glossary", label: "Glossary", desc: "Definitions for terms used across the product." },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group relative block border-b border-[rgba(232,224,208,.07)] py-5 pl-4 transition hover:bg-[#162840]/40 hover:pl-6"
                >
                  <span className="absolute left-0 top-0 bottom-0 w-[2px] bg-transparent transition group-hover:bg-[#C49230]" />
                  <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-[#E8E0D0]">{item.label}</div>
                  <div className="mt-2 text-[15px] leading-[1.82] text-[#7A8A96]">{item.desc}</div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="py-12" id="how-to-read">
          <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-10">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#C49230]">Traceability</div>
              <h2 className="mt-4 font-[var(--serif)] text-[clamp(32px,3.8vw,54px)] font-normal leading-[1.08] tracking-[-0.025em] text-[#E8E0D0]">
                Data contract.
              </h2>
            </div>
            <div>
              <details className="border-t border-b border-[rgba(232,224,208,.07)] py-4">
                <summary className="ta-summary flex cursor-pointer items-center justify-between gap-4 font-mono text-[12px] uppercase tracking-[0.12em] text-[#E8E0D0]">
                  <span>Provenance and operational notes</span>
                  <span className="text-[#C49230]">+</span>
                </summary>
                <div className="pt-4 text-[15px] leading-[1.82] text-[#7A8A96]">
                  <p>
                    Public provenance anchors: <InlineCode>date</InlineCode>, <InlineCode>updated_through</InlineCode>, <InlineCode>methodology_version</InlineCode>, published revision, and <InlineCode>regime.determinism_hash</InlineCode>.
                  </p>
                  <p className="mt-4">
                    Health classification is derived at render time. Confidence is read directly from the latest published meta artifact.
                  </p>
                </div>
              </details>
              <div className="mt-6 flex flex-wrap gap-6">
                <TextLink href="#how-to-read-modal">Health vs confidence â†’</TextLink>
                <TextLink href="#confidence-modal">Confidence bands â†’</TextLink>
              </div>
            </div>
          </div>
        </section>
      </UrdContainer>

      <ExplainModal
        id="how-to-read-modal"
        title="How to read the status page"
        subtitle="Freshness and confidence are separate operational questions."
        pair={howToReadExplain}
      />
      <ExplainModal
        id="cadence-modal"
        title="Publication cadence"
        subtitle="Lag has to be interpreted relative to chain-specific cadence, not relative to zero."
        pair={cadenceExplain}
      />
      <ExplainModal
        id="confidence-modal"
        title="Confidence on this page"
        subtitle="Confidence is evidence quality for the published label, independent of freshness."
        pair={confidenceExplain}
      />
    </UrdPage>
  );
}