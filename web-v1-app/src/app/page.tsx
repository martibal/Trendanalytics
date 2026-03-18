// src/app/page.tsx
import Link from "next/link";
import { CHAIN_LIST } from "@/config/chains";
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

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border p-6">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-6 text-muted-foreground">
        {children}
      </div>
    </section>
  );
}

function InlineCode({ children }: { children: string }) {
  return <code className="rounded bg-muted px-1 py-0.5">{children}</code>;
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
  if (typeof value !== "number") return "—";
  if (value >= 0.7) return "Good";
  if (value >= 0.4) return "Caution";
  return "Degraded";
}

function bandClass(band: string) {
  const base = "rounded-full border px-2 py-1 text-xs";
  if (band === "Good") return `${base} bg-green-50`;
  if (band === "Caution") return `${base} bg-yellow-50`;
  if (band === "Degraded") return `${base} bg-red-50`;
  return `${base} bg-muted`;
}

function statusClass(status?: string | null) {
  const base = "rounded-full border px-2 py-1 text-xs";
  if (status === "ok") return `${base} bg-green-50`;
  if (status === "warn") return `${base} bg-yellow-50`;
  if (status === "fail") return `${base} bg-red-50`;
  return `${base} bg-muted`;
}

function fmtDate(value?: string | null) {
  return value && value.trim().length > 0 ? value : "—";
}

function fmtConfidence(value?: number | null) {
  return typeof value === "number" ? value.toFixed(3) : "—";
}

export default async function HomePage() {
  const dataset: DatasetManifest | null = await readDatasetManifest();

  const [landingPayload, statusPayload] = await Promise.all([
    readPublishedJson<LandingApiResponse>("data/published/v1/landing/index.json"),
    readPublishedJson<StatusApiResponse>("data/published/v1/status/index.json"),
  ]);

  const landingChains = extractLandingChains(landingPayload);

  const statusRows =
    Array.isArray(statusPayload?.chains) && statusPayload?.chains.length > 0
      ? statusPayload.chains
      : [];

  const fallbackRows = CHAIN_LIST.map((chain) => {
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
      expected_delay_days: chain.id === "arbitrum" || chain.id === "base" ? 7 : 0,
    };
  });

  const rows = statusRows.length > 0 ? statusRows : fallbackRows;

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <header className="mb-8 rounded-2xl border p-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-3xl">
            <div className="text-sm font-medium text-muted-foreground">
              Descriptive blockchain regime context
            </div>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight">
              Regime change vs noise, without price, forecasts, or advice.
            </h1>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">
              TrendAnalytics is a publication-driven on-chain analytics product. It explains what the
              currently published data says about supported chains, how fresh that publication is,
              and how the current state compares with recent historical output.
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/chains"
                className="rounded-lg border px-4 py-2 text-sm font-medium transition hover:bg-muted"
              >
                Open Chains
              </Link>
              <Link
                href="/status"
                className="rounded-lg border px-4 py-2 text-sm font-medium transition hover:bg-muted"
              >
                Open Status
              </Link>
              <Link
                href="/track-record"
                className="rounded-lg border px-4 py-2 text-sm font-medium transition hover:bg-muted"
              >
                Open Track Record
              </Link>
              <Link
                href="/dashboard"
                className="rounded-lg border px-4 py-2 text-sm font-medium transition hover:bg-muted"
              >
                Subscriber Dashboard
              </Link>
            </div>
          </div>

          <div className="min-w-[280px] rounded-xl border p-5 text-sm">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              Published context
            </div>
            <div className="mt-3 space-y-2 text-muted-foreground">
              <div>
                <span className="font-medium text-foreground">Dataset:</span>{" "}
                {dataset?.version ?? "—"}
              </div>
              <div>
                <span className="font-medium text-foreground">Published at:</span>{" "}
                {dataset?.published_at ?? "—"}
              </div>
              <div>
                <span className="font-medium text-foreground">Methodology:</span>{" "}
                {dataset?.methodology_version ?? "—"}
              </div>
              <div>
                <span className="font-medium text-foreground">Data source:</span>{" "}
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

        <section className="rounded-xl border">
          <div className="border-b px-4 py-3">
            <h2 className="text-lg font-semibold">Supported chains</h2>
            <p className="mt-1 text-sm text-muted-foreground">
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
                  className="rounded-xl border p-4 transition hover:bg-muted/30"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-semibold">{row.label}</div>
                    <span className={statusClass(row.status)}>{row.status}</span>
                  </div>

                  <div className="mt-3 text-sm text-muted-foreground">
                    <div>
                      <span className="font-medium text-foreground">Regime:</span>{" "}
                      {row.published_regime ?? "—"}
                    </div>
                    <div className="mt-1">
                      <span className="font-medium text-foreground">Confidence:</span>{" "}
                      {fmtConfidence(row.confidence_score)}
                    </div>
                    <div className="mt-1">
                      <span className={bandClass(band)}>{band}</span>
                    </div>
                    <div className="mt-2">
                      <span className="font-medium text-foreground">As of:</span>{" "}
                      {fmtDate(row.as_of)}
                    </div>
                    <div className="mt-1">
                      <span className="font-medium text-foreground">Lag:</span>{" "}
                      {row.lag_days !== null ? `${row.lag_days}d` : "—"}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        <Section title="How the product is organized">
          <ul className="list-disc pl-5">
            <li>
              <Link href="/chains" className="underline">
                /chains
              </Link>{" "}
              shows current descriptive chain-level state.
            </li>
            <li>
              <Link href="/status" className="underline">
                /status
              </Link>{" "}
              shows freshness, lag, and publication health.
            </li>
            <li>
              <Link href="/track-record" className="underline">
                /track-record
              </Link>{" "}
              shows historical descriptive regime output.
            </li>
            <li>
              <Link href="/methodology" className="underline">
                /methodology
              </Link>{" "}
              and{" "}
              <Link href="/glossary" className="underline">
                /glossary
              </Link>{" "}
              explain the published fields and interpretation boundary.
            </li>
            <li>
              <Link href="/api-docs" className="underline">
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
              <span className="font-medium text-foreground">Gold</span>: descriptive published base metrics
            </li>
            <li>
              <span className="font-medium text-foreground">Meta</span>: status, confidence, scorecard, regime, drivers
            </li>
            <li>
              <span className="font-medium text-foreground">Derived</span>: published rolling trend context
            </li>
          </ul>
        </Section>

        <Section title="Related pages">
          <ul className="list-disc pl-5">
            <li>
              <Link href="/about" className="underline">
                /about
              </Link>
            </li>
            <li>
              <Link href="/methodology" className="underline">
                /methodology
              </Link>
            </li>
            <li>
              <Link href="/glossary" className="underline">
                /glossary
              </Link>
            </li>
            <li>
              <Link href="/thresholds" className="underline">
                /thresholds
              </Link>
            </li>
            <li>
              <Link href="/terms" className="underline">
                /terms
              </Link>
            </li>
            <li>
              <Link href="/privacy" className="underline">
                /privacy
              </Link>
            </li>
          </ul>
        </Section>

        <section className="rounded-xl border p-6 text-xs text-muted-foreground">
          <div className="font-medium text-foreground">Traceability</div>
          <p className="mt-2">
            Dataset context on this page is drawn from{" "}
            <InlineCode>/public/data/published/v1/dataset.json</InlineCode>.
          </p>
          <p className="mt-2">
            Chain cards prefer published status/index information where available and fall back to
            published landing/index context where necessary.
          </p>
        </section>
      </div>
    </main>
  );
}