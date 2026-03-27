import Link from "next/link";
import { CHAIN_LIST, type ChainId } from "@/config/chains";
import { readDatasetManifest, type DatasetManifest } from "@/lib/dataset";
import { currentDataSource, readStorageObject } from "@/lib/storage";
import LandingHero from "@/components/landing/LandingHero";
import CrossChainNotables from "@/components/landing/CrossChainNotables";

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
    <section className="section-shell p-6">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-7 text-muted-foreground">{children}</div>
    </section>
  );
}

function InlineCode({ children }: { children: string }) {
  return <code className="rounded bg-muted px-1.5 py-0.5 text-xs text-foreground">{children}</code>;
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
  const base = "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide";
  if (status === "ok") {
    return `${base} border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300`;
  }
  if (status === "warn") {
    return `${base} border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300`;
  }
  if (status === "fail") {
    return `${base} border-red-500/25 bg-red-500/10 text-red-700 dark:text-red-300`;
  }
  return `${base} border-border bg-muted text-muted-foreground`;
}

function confidenceChipClass(band: string) {
  const base = "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium";
  if (band === "Good") {
    return `${base} border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300`;
  }
  if (band === "Caution") {
    return `${base} border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300`;
  }
  if (band === "Degraded") {
    return `${base} border-red-500/25 bg-red-500/10 text-red-700 dark:text-red-300`;
  }
  return `${base} border-border bg-muted text-muted-foreground`;
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

      const asOf = meta?.updated_through ?? meta?.regime?.asof_date ?? meta?.date ?? null;

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
          typeof meta?.confidence?.confidence_score === "number" ? meta.confidence.confidence_score : null,
        expected_delay_days: expectedDelayDays(chain.id),
      };
    })
  );
}

function buildNotables(rows: StatusApiRow[]) {
  const items: { title: string; body: string }[] = [];

  const degraded = rows.filter((row) => typeof row.confidence_score === "number" && row.confidence_score < 0.4);
  if (degraded.length > 0) {
    items.push({
      title: "Confidence is degraded on part of the surface",
      body: `${degraded.map((row) => row.label).join(", ")} currently publish confidence below the canonical 0.40 threshold. These states remain visible for traceability, but should be read as UNKNOWN/DEGRADED.`,
    });
  }

  const delayed = rows.filter((row) => row.status === "warn" || row.status === "fail");
  if (delayed.length > 0) {
    items.push({
      title: "Freshness requires attention",
      body: `${delayed.map((row) => row.label).join(", ")} are currently outside their expected publish schedule. Status and lag remain visible so the latest publication can still be interpreted with the right freshness context.`,
    });
  }

  const l2s = rows.filter((row) => row.chain === "arbitrum" || row.chain === "base");
  if (l2s.length > 0) {
    items.push({
      title: "L2 publication cadence is intentionally different",
      body: `Arbitrum and Base are read against an expected publish delay of roughly seven days. A larger lag does not automatically imply a broken feed; it must be judged against the chain-specific policy shown on status and chain pages.`,
    });
  }

  if (items.length === 0) {
    items.push({
      title: "All supported chains have current published context",
      body: `The landing surface is currently able to show regime, confidence, and freshness context across all four supported chains using the latest published artifacts.`,
    });
  }

  return items.slice(0, 3);
}

export default async function HomePage() {
  const dataset: DatasetManifest | null = await readDatasetManifest();

  const [landingPayload, statusPayload, metaFallbackRows] = await Promise.all([
    readPublishedJson<LandingApiResponse>("data/published/v1/landing/index.json"),
    readPublishedJson<StatusApiResponse>("data/published/v1/status/index.json"),
    buildMetaFallbackRows(),
  ]);

  const landingChains = extractLandingChains(landingPayload);

  const statusRows = Array.isArray(statusPayload?.chains) && statusPayload.chains.length > 0 ? statusPayload.chains : [];

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

  const notables = buildNotables(rows);

  return (
    <div className="space-y-6 py-4">
      <LandingHero
        datasetVersion={dataset?.version ?? null}
        publishedAt={dataset?.published_at ?? null}
        methodologyVersion={dataset?.methodology_version ?? null}
        dataSource={currentDataSource()}
      />

      <Section title="Interpretation boundary">
        <ul className="list-disc space-y-1 pl-5">
          <li>No price data.</li>
          <li>No forecasts.</li>
          <li>No advisory language.</li>
          <li>No hidden portfolio guidance.</li>
          <li>Only published, descriptive regime context.</li>
        </ul>
      </Section>

      <section className="section-shell overflow-hidden">
        <div className="border-b border-border px-6 py-5">
          <h2 className="text-lg font-semibold text-foreground">Supported chains</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Current published regime, confidence, as-of date, and lag across the four supported
            chains.
          </p>
        </div>

        <div className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-4">
          {rows.map((row) => {
            const band = confidenceBand(row.confidence_score);

            return (
              <Link
                key={row.chain}
                href={`/chains/${row.chain}`}
                className="group surface-card p-5 transition hover:border-primary/30 hover:bg-card"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xl font-semibold tracking-tight text-foreground">{row.label}</div>
                    <div className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      {row.name}
                    </div>
                  </div>
                  <span className={statusChipClass(row.status)}>{row.status}</span>
                </div>

                <div className="mt-5">
                  <div className="eyebrow-label">Published regime</div>
                  <div className="mt-2 min-h-[48px] text-lg font-semibold leading-6 text-foreground">
                    {row.published_regime ?? "No published label"}
                  </div>
                </div>

                <div className="mt-5 rounded-xl border border-border bg-background/75 p-3">
                  <div className="eyebrow-label">Confidence</div>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <div className="text-2xl font-semibold text-foreground">{fmtConfidence(row.confidence_score)}</div>
                    <span className={confidenceChipClass(band)}>{band}</span>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-border bg-background/70 p-3">
                    <div className="eyebrow-label">As of</div>
                    <div className="mt-1 text-sm font-medium text-foreground">{fmtDate(row.as_of)}</div>
                  </div>
                  <div className="rounded-xl border border-border bg-background/70 p-3">
                    <div className="eyebrow-label">Lag</div>
                    <div className="mt-1 text-sm font-medium text-foreground">
                      {row.lag_days !== null ? `${row.lag_days}d` : "—"}
                    </div>
                  </div>
                </div>

                <div className="mt-4 text-xs text-muted-foreground transition group-hover:text-foreground">
                  Open chain detail →
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <CrossChainNotables items={notables} />

      <div className="grid gap-6 xl:grid-cols-2">
        <Section title="How the product is organized">
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <Link href="/chains" className="underline underline-offset-4">
                /chains
              </Link>{" "}
              shows current descriptive chain-level state.
            </li>
            <li>
              <Link href="/status" className="underline underline-offset-4">
                /status
              </Link>{" "}
              shows freshness, lag, and publication health.
            </li>
            <li>
              <Link href="/track-record" className="underline underline-offset-4">
                /track-record
              </Link>{" "}
              shows historical descriptive regime output.
            </li>
            <li>
              <Link href="/methodology" className="underline underline-offset-4">
                /methodology
              </Link>{" "}
              and{" "}
              <Link href="/glossary" className="underline underline-offset-4">
                /glossary
              </Link>{" "}
              explain the published fields and interpretation boundary.
            </li>
            <li>
              <Link href="/api-docs" className="underline underline-offset-4">
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
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <span className="font-medium text-foreground">Gold</span>: descriptive published base
              metrics.
            </li>
            <li>
              <span className="font-medium text-foreground">Meta</span>: status, confidence,
              scorecard, regime, and drivers.
            </li>
            <li>
              <span className="font-medium text-foreground">Derived</span>: published rolling trend
              context.
            </li>
          </ul>
        </Section>

        <Section title="Transparency path">
          <p>
            Dataset context on this page is drawn from <InlineCode>/public/data/published/v1/dataset.json</InlineCode>.
          </p>
          <p>
            Chain cards prefer published status/index information where available, then fall back to
            per-chain <InlineCode>meta/latest.json</InlineCode> files, and only then fall back to
            landing/index context.
          </p>
          <div className="flex flex-wrap gap-3 pt-1">
            <Link href="/status" className="inline-flex h-10 items-center rounded-lg border border-border bg-background px-3 text-sm text-foreground transition hover:bg-muted">
              System status
            </Link>
            <Link href="/methodology" className="inline-flex h-10 items-center rounded-lg border border-border bg-background px-3 text-sm text-foreground transition hover:bg-muted">
              Methodology
            </Link>
            <Link href="/glossary" className="inline-flex h-10 items-center rounded-lg border border-border bg-background px-3 text-sm text-foreground transition hover:bg-muted">
              Glossary
            </Link>
          </div>
        </Section>
      </div>
    </div>
  );
}
