// src/app/page.tsx
import Link from "next/link";
import { CHAIN_LIST, type ChainId } from "@/config/chains";
import { readDatasetManifest, type DatasetManifest } from "@/lib/dataset";
import { currentDataSource, readStorageObject } from "@/lib/storage";

type LandingApiChain = {
  chain?: string;
  label?: string;
  name?: string;
  status_label?: string;
  one_liner?: string;
  confidence_score?: number | null;
  lag_days?: number | null;
  as_of?: string | null;
};

type LandingApiResponse =
  | {
      chains?: LandingApiChain[];
    }
  | {
      items?: LandingApiChain[];
    }
  | {
      data?: LandingApiChain[];
    };

type StatusApiRow = {
  chain: string;
  name: string;
  label: string;
  as_of: string | null;
  lag_days: number | null;
  status: "ok" | "warn" | "fail" | "unknown";
  published_regime: string | null;
  confidence_score: number | null;
  expected_delay_days: number;
};

type StatusApiResponse = {
  ok: boolean;
  generated_at_utc: string;
  data_source?: "local" | "s3";
  dataset?: {
    version?: string | null;
    published_at?: string | null;
    methodology_version?: string | null;
  } | null;
  chains?: StatusApiRow[];
};

type MetaLatest = {
  date?: string;
  updated_through?: string;
  confidence?: {
    lag_days_vs_utc_today?: number;
    confidence_score?: number;
  };
  status?: {
    label?: string;
    color?: string;
    one_liner?: string;
  };
  regime?: {
    asof_date?: string;
  };
  profile?: {
    label?: string;
  };
};

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-6 text-slate-300">
        {children}
      </div>
    </section>
  );
}

function InlineCode({ children }: { children: string }) {
  return (
    <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs text-slate-100">
      {children}
    </code>
  );
}

function arrayBufferToUtf8(buffer: ArrayBuffer): string {
  return new TextDecoder("utf-8").decode(new Uint8Array(buffer));
}

async function readPublishedJson<T>(storagePath: string): Promise<T | null> {
  const result = await readStorageObject(storagePath);

  if (!result) {
    return null;
  }

  try {
    const raw = arrayBufferToUtf8(result.body);
    const json = JSON.parse(raw);

    if (!json || typeof json !== "object") {
      return null;
    }

    return json as T;
  } catch {
    return null;
  }
}

function extractLandingChains(payload: LandingApiResponse | null): LandingApiChain[] {
  if (!payload) return [];
  if (Array.isArray((payload as { chains?: LandingApiChain[] }).chains)) {
    return (payload as { chains?: LandingApiChain[] }).chains ?? [];
  }
  if (Array.isArray((payload as { items?: LandingApiChain[] }).items)) {
    return (payload as { items?: LandingApiChain[] }).items ?? [];
  }
  if (Array.isArray((payload as { data?: LandingApiChain[] }).data)) {
    return (payload as { data?: LandingApiChain[] }).data ?? [];
  }
  return [];
}

function confidenceBand(value?: number | null) {
  if (typeof value !== "number") return "Unknown";
  if (value >= 0.7) return "Good";
  if (value >= 0.4) return "Caution";
  return "Degraded";
}

function statusChipClass(status?: string | null) {
  const base =
    "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide";
  if (status === "ok") {
    return `${base} border-emerald-400/30 bg-emerald-400/10 text-emerald-200`;
  }
  if (status === "warn") {
    return `${base} border-amber-400/30 bg-amber-400/10 text-amber-200`;
  }
  if (status === "fail") {
    return `${base} border-red-400/30 bg-red-400/10 text-red-200`;
  }
  return `${base} border-slate-400/20 bg-slate-400/10 text-slate-200`;
}

function confidenceChipClass(band: string) {
  const base =
    "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium";
  if (band === "Good") {
    return `${base} border-emerald-400/30 bg-emerald-400/10 text-emerald-200`;
  }
  if (band === "Caution") {
    return `${base} border-amber-400/30 bg-amber-400/10 text-amber-200`;
  }
  if (band === "Degraded") {
    return `${base} border-rose-400/30 bg-rose-400/10 text-rose-200`;
  }
  return `${base} border-slate-400/20 bg-slate-400/10 text-slate-200`;
}

function fmtDate(value?: string | null) {
  return value && value.trim().length > 0 ? value : "—";
}

function fmtConfidence(value?: number | null) {
  return typeof value === "number" ? value.toFixed(3) : "—";
}

function parseIsoDayToUtcMs(date?: string): number | null {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const [y, m, d] = date.split("-").map(Number);
  const ms = Date.UTC(y, m - 1, d);
  return Number.isFinite(ms) ? ms : null;
}

function utcTodayMs(): number {
  const now = new Date();
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
}

function lagDaysFromIsoDay(date?: string): number | null {
  const asOfMs = parseIsoDayToUtcMs(date);
  if (asOfMs === null) return null;
  const diff = utcTodayMs() - asOfMs;
  return Math.max(0, Math.floor(diff / 86400000));
}

function expectedDelayDays(chain: ChainId): number {
  return chain === "arbitrum" || chain === "base" ? 7 : 0;
}

function classifyStatus(params: {
  chain: ChainId;
  lagDays: number | null;
  asOf?: string | null;
}): "ok" | "warn" | "fail" | "unknown" {
  const { chain, lagDays, asOf } = params;

  if (!asOf || typeof lagDays !== "number") {
    return "unknown";
  }

  const expectedDelay = expectedDelayDays(chain);

  if (lagDays <= expectedDelay) {
    return "ok";
  }

  if (lagDays <= expectedDelay + 2) {
    return "warn";
  }

  return "fail";
}

async function buildMetaFallbackRows(): Promise<StatusApiRow[]> {
  return Promise.all(
    CHAIN_LIST.map(async (chain) => {
      const metaPath = `data/published/v1/meta/${chain.id}/latest.json`;
      const meta = await readPublishedJson<MetaLatest>(metaPath);

      const asOf =
        meta?.updated_through ??
        meta?.regime?.asof_date ??
        meta?.date ??
        null;

      const lagDays =
        typeof meta?.confidence?.lag_days_vs_utc_today === "number"
          ? meta.confidence.lag_days_vs_utc_today
          : lagDaysFromIsoDay(asOf ?? undefined);

      return {
        chain: chain.id,
        name: meta?.profile?.label ?? chain.name,
        label: chain.label,
        as_of: asOf,
        lag_days: lagDays,
        status: classifyStatus({
          chain: chain.id,
          lagDays,
          asOf,
        }),
        published_regime: meta?.status?.label ?? null,
        confidence_score:
          typeof meta?.confidence?.confidence_score === "number"
            ? meta.confidence.confidence_score
            : null,
        expected_delay_days: expectedDelayDays(chain.id),
      };
    })
  );
}

export default async function HomePage() {
  const dataset: DatasetManifest | null = await readDatasetManifest();

  const [landingPayload, statusPayload, metaFallbackRows] = await Promise.all([
    readPublishedJson<LandingApiResponse>("data/published/v1/landing/index.json"),
    readPublishedJson<StatusApiResponse>("data/published/v1/status/index.json"),
    buildMetaFallbackRows(),
  ]);

  const landingChains = extractLandingChains(landingPayload);

  const statusRows =
    Array.isArray(statusPayload?.chains) && statusPayload.chains.length > 0
      ? statusPayload.chains
      : [];

  const landingFallbackRows = CHAIN_LIST.map((chain) => {
    const landing = landingChains.find((row) => row.chain === chain.id);

    return {
      chain: chain.id,
      name: landing?.name ?? chain.name,
      label: landing?.label ?? chain.label,
      as_of: landing?.as_of ?? null,
      lag_days: landing?.lag_days ?? null,
      status: "unknown" as const,
      published_regime: landing?.status_label ?? null,
      confidence_score: landing?.confidence_score ?? null,
      expected_delay_days: expectedDelayDays(chain.id),
    };
  });

  const rows =
    statusRows.length > 0
      ? statusRows
      : metaFallbackRows.some(
          (row) =>
            row.published_regime !== null ||
            row.confidence_score !== null ||
            row.as_of !== null ||
            row.lag_days !== null
        )
      ? metaFallbackRows
      : landingFallbackRows;

  return (
    <main className="mx-auto max-w-6xl px-6 py-10 text-slate-100">
      <header className="mb-8 rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.05] to-white/[0.02] p-8 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-3xl">
            <div className="text-sm font-medium text-slate-400">
              Descriptive blockchain regime context
            </div>
            <h1 className="mt-2 max-w-3xl text-4xl font-semibold tracking-tight text-white">
              Regime change vs noise, without price, forecasts, or advice.
            </h1>
            <p className="mt-4 text-sm leading-7 text-slate-300">
              TrendAnalytics is a publication-driven on-chain analytics product. It explains what the
              currently published data says about supported chains, how fresh that publication is,
              and how the current state compares with recent historical output.
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/chains"
                className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-white transition hover:bg-white/[0.08]"
              >
                Open Chains
              </Link>
              <Link
                href="/status"
                className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-white transition hover:bg-white/[0.08]"
              >
                Open Status
              </Link>
              <Link
                href="/track-record"
                className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-white transition hover:bg-white/[0.08]"
              >
                Open Track Record
              </Link>
              <Link
                href="/dashboard"
                className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-white transition hover:bg-white/[0.08]"
              >
                Subscriber Dashboard
              </Link>
            </div>
          </div>

          <div className="min-w-[300px] rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm">
            <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
              Published context
            </div>
            <div className="mt-4 space-y-2 text-slate-300">
              <div>
                <span className="font-medium text-white">Dataset:</span>{" "}
                {dataset?.version ?? "—"}
              </div>
              <div>
                <span className="font-medium text-white">Published at:</span>{" "}
                {dataset?.published_at ?? "—"}
              </div>
              <div>
                <span className="font-medium text-white">Methodology:</span>{" "}
                {dataset?.methodology_version ?? "—"}
              </div>
              <div>
                <span className="font-medium text-white">Data source:</span>{" "}
                {currentDataSource()}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="grid gap-6">
        <Section title="Interpretation boundary">
          <ul className="list-disc pl-5">
            <li>No price data.</li>
            <li>No forecasts.</li>
            <li>No advisory language.</li>
            <li>No hidden portfolio guidance.</li>
            <li>Only published, descriptive regime context.</li>
          </ul>
        </Section>

        <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
          <div className="border-b border-white/10 px-5 py-4">
            <h2 className="text-lg font-semibold text-white">Supported chains</h2>
            <p className="mt-1 text-sm text-slate-400">
              Public overview of currently supported chains and their published state.
            </p>
          </div>

          <div className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-4">
            {rows.map((row) => {
              const band = confidenceBand(row.confidence_score);

              return (
                <Link
                  key={row.chain}
                  href={`/chains/${row.chain}`}
                  className="group rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.035] to-white/[0.015] p-5 transition hover:border-white/20 hover:bg-white/[0.05]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xl font-semibold tracking-tight text-white">
                        {row.label}
                      </div>
                      <div className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">
                        {row.name}
                      </div>
                    </div>
                    <span className={statusChipClass(row.status)}>{row.status}</span>
                  </div>

                  <div className="mt-5">
                    <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
                      Published regime
                    </div>
                    <div className="mt-1 min-h-[48px] text-lg font-semibold leading-6 text-white">
                      {row.published_regime ?? "No published label"}
                    </div>
                  </div>

                  <div className="mt-5 rounded-xl border border-white/10 bg-black/10 p-3">
                    <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
                      Confidence
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <div className="text-2xl font-semibold text-white">
                        {fmtConfidence(row.confidence_score)}
                      </div>
                      <span className={confidenceChipClass(band)}>{band}</span>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                        As of
                      </div>
                      <div className="mt-1 text-sm font-medium text-slate-100">
                        {fmtDate(row.as_of)}
                      </div>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                        Lag
                      </div>
                      <div className="mt-1 text-sm font-medium text-slate-100">
                        {row.lag_days !== null ? `${row.lag_days}d` : "—"}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 text-xs text-slate-500 transition group-hover:text-slate-400">
                    Open chain detail →
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        <Section title="How the product is organized">
          <ul className="list-disc pl-5">
            <li>
              <Link href="/chains" className="underline decoration-white/20 underline-offset-4">
                /chains
              </Link>{" "}
              shows current descriptive chain-level state.
            </li>
            <li>
              <Link href="/status" className="underline decoration-white/20 underline-offset-4">
                /status
              </Link>{" "}
              shows freshness, lag, and publication health.
            </li>
            <li>
              <Link
                href="/track-record"
                className="underline decoration-white/20 underline-offset-4"
              >
                /track-record
              </Link>{" "}
              shows historical descriptive regime output.
            </li>
            <li>
              <Link
                href="/methodology"
                className="underline decoration-white/20 underline-offset-4"
              >
                /methodology
              </Link>{" "}
              and{" "}
              <Link href="/glossary" className="underline decoration-white/20 underline-offset-4">
                /glossary
              </Link>{" "}
              explain the published fields and interpretation boundary.
            </li>
            <li>
              <Link href="/api-docs" className="underline decoration-white/20 underline-offset-4">
                /api-docs
              </Link>{" "}
              documents public routes and subscriber delivery routes.
            </li>
          </ul>
        </Section>

        <Section title="Public site vs subscriber surface">
          <p>
            The public website is designed to explain published outputs. Subscriber functionality is
            separate and includes authenticated access, dashboard context, API keys, entitlement
            controls, and authenticated file delivery.
          </p>
          <p>
            Subscriber access starts at <InlineCode>/dashboard</InlineCode>, while public
            interpretation surfaces remain available without forced login.
          </p>
        </Section>

        <Section title="What the published artifacts mean">
          <p>
            The site presents published Gold, Meta, and Derived artifacts. These should be read as
            descriptive analytical outputs, not as recommendations.
          </p>
          <ul className="list-disc pl-5">
            <li>
              <span className="font-medium text-white">Gold</span>: descriptive published base metrics
            </li>
            <li>
              <span className="font-medium text-white">Meta</span>: status, confidence, scorecard,
              regime, drivers
            </li>
            <li>
              <span className="font-medium text-white">Derived</span>: published rolling trend context
            </li>
          </ul>
        </Section>

        <Section title="Related pages">
          <ul className="list-disc pl-5">
            <li>
              <Link href="/about" className="underline decoration-white/20 underline-offset-4">
                /about
              </Link>
            </li>
            <li>
              <Link
                href="/methodology"
                className="underline decoration-white/20 underline-offset-4"
              >
                /methodology
              </Link>
            </li>
            <li>
              <Link href="/glossary" className="underline decoration-white/20 underline-offset-4">
                /glossary
              </Link>
            </li>
            <li>
              <Link href="/thresholds" className="underline decoration-white/20 underline-offset-4">
                /thresholds
              </Link>
            </li>
            <li>
              <Link href="/terms" className="underline decoration-white/20 underline-offset-4">
                /terms
              </Link>
            </li>
            <li>
              <Link href="/privacy" className="underline decoration-white/20 underline-offset-4">
                /privacy
              </Link>
            </li>
          </ul>
        </Section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 text-xs text-slate-400">
          <div className="font-medium text-white">Traceability</div>
          <p className="mt-2">
            Dataset context on this page is drawn from{" "}
            <InlineCode>/public/data/published/v1/dataset.json</InlineCode>.
          </p>
          <p className="mt-2">
            Chain cards prefer published status/index information where available, then fall back to
            per-chain meta/latest files, and only then fall back to landing/index context.
          </p>
        </section>
      </div>
    </main>
  );
}