import type { Metadata } from "next";
import Link from "next/link";
import { readStorageObject } from "@/lib/storage";

export const revalidate = 0;

export const metadata: Metadata = {
  title: "Explorer | Urd Atlas",
  description: "Browse current and historical blockchain network state without setting up a data pipeline.",
};

type Label = "STABLE" | "HEATING" | "CONGESTED" | "CHEAP" | "UNKNOWN/DEGRADED";
type ConfidenceState = "Good" | "Caution" | "Review" | "Unknown";

type MetaLatest = {
  date?: string;
  updated_through?: string;
  status?: { label?: string; one_liner?: string };
  regime?: {
    label?: string;
    asof_date?: string;
    drivers?: Array<{ name?: string; label?: string; value?: string | number }>;
  };
  confidence?: {
    confidence_score?: number;
    data_quality_score?: number;
    label_confidence_score?: number;
    lag_days_vs_utc_today?: number;
  };
  methodology_version?: string;
};

type MetaWindowRow = {
  date?: string;
  updated_through?: string;
  status?: { label?: string; one_liner?: string };
  regime?: { label?: string; asof_date?: string };
  confidence?: { confidence_score?: number };
};

const CHAINS = [
  { id: "bitcoin", ticker: "BTC", name: "Bitcoin", lag: "T+1", cadence: "Daily publication target" },
  { id: "ethereum", ticker: "ETH", name: "Ethereum", lag: "T+1", cadence: "Daily publication target" },
  { id: "arbitrum", ticker: "ARB", name: "Arbitrum", lag: "weekly", cadence: "Weekly publication target" },
  { id: "base", ticker: "BASE", name: "Base", lag: "weekly", cadence: "Weekly publication target" },
] as const;

const LABEL_EXPLAINER: Record<Label, string> = {
  STABLE: "No single pressure dimension is dominating the latest published row.",
  HEATING: "Demand-side activity is elevated relative to recent network conditions.",
  CONGESTED: "Friction or capacity pressure is high enough to define the network state.",
  CHEAP: "Network conditions are relatively inexpensive or unconstrained in the published context.",
  "UNKNOWN/DEGRADED": "The latest row should be treated cautiously because label or data confidence is limited.",
};

function arrayBufferToUtf8(buffer: ArrayBuffer): string {
  return new TextDecoder("utf-8").decode(new Uint8Array(buffer));
}

async function readJson<T>(storagePath: string): Promise<T | null> {
  try {
    const result = await readStorageObject(storagePath);
    if (!result) return null;
    return JSON.parse(arrayBufferToUtf8(result.body)) as T;
  } catch {
    return null;
  }
}

function normalizeLabel(raw: string | undefined): Label {
  const label = (raw ?? "").toUpperCase();
  if (label === "STABLE") return "STABLE";
  if (label === "HEATING") return "HEATING";
  if (label === "CONGESTED") return "CONGESTED";
  if (label === "CHEAP") return "CHEAP";
  return "UNKNOWN/DEGRADED";
}

function pct(value: number | undefined): string {
  if (typeof value !== "number" || Number.isNaN(value)) return "—";
  return `${Math.round(value * 100)}%`;
}

function formatDate(value: string | undefined): string {
  if (!value) return "—";
  const parsed = new Date(value.includes("T") ? value : `${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

function dateFromRow(row: MetaWindowRow): string {
  return row.date ?? row.updated_through ?? row.regime?.asof_date ?? "";
}

function confidenceState(value: number | undefined): ConfidenceState {
  if (typeof value !== "number" || Number.isNaN(value)) return "Unknown";
  if (value >= 0.7) return "Good";
  if (value >= 0.4) return "Caution";
  return "Review";
}

function confidenceGuidance(state: ConfidenceState): string {
  if (state === "Good") return "Good enough for normal browsing, reporting and exploratory joins.";
  if (state === "Caution") return "Use as context, but keep confidence visible in reports and downstream analysis.";
  if (state === "Review") return "Treat the label as low-confidence context, not as an automated rule.";
  return "Confidence was not available in the latest published row.";
}

function driverText(driver: { name?: string; label?: string; value?: string | number }): string {
  const name = driver.label ?? driver.name ?? "Driver";
  if (driver.value === undefined || driver.value === null || driver.value === "") return name;
  return `${name}: ${driver.value}`;
}

async function getChain(chain: (typeof CHAINS)[number]) {
  const [latest, last30Raw] = await Promise.all([
    readJson<MetaLatest>(`data/published/v1/meta/${chain.id}/latest.json`),
    readJson<MetaWindowRow[]>(`data/published/v1/meta/${chain.id}/last30d.json`),
  ]);

  const rows = Array.isArray(last30Raw) ? [...last30Raw].sort((a, b) => dateFromRow(a).localeCompare(dateFromRow(b))) : [];
  const labels = rows.map((row) => normalizeLabel(row.status?.label ?? row.regime?.label));
  const transitions = labels.reduce((sum, label, index) => (index > 0 && labels[index - 1] !== label ? sum + 1 : sum), 0);
  const latestLabel = normalizeLabel(latest?.status?.label ?? latest?.regime?.label);
  const confidenceValue = latest?.confidence?.confidence_score;
  const state = confidenceState(confidenceValue);
  const lagDays = latest?.confidence?.lag_days_vs_utc_today;
  const drivers = latest?.regime?.drivers?.map(driverText).filter(Boolean).slice(0, 4) ?? [];

  return {
    ...chain,
    latest,
    latestLabel,
    asOf: formatDate(latest?.date ?? latest?.updated_through ?? latest?.regime?.asof_date),
    confidence: pct(confidenceValue),
    confidenceState: state,
    confidenceGuidance: confidenceGuidance(state),
    dataQuality: pct(latest?.confidence?.data_quality_score),
    labelConfidence: pct(latest?.confidence?.label_confidence_score),
    lagDays: typeof lagDays === "number" && !Number.isNaN(lagDays) ? `${lagDays}d` : "—",
    methodology: latest?.methodology_version ?? "—",
    oneLiner: latest?.status?.one_liner ?? `${chain.name}'s latest published network-state row is ${latestLabel}.`,
    labelExplainer: LABEL_EXPLAINER[latestLabel],
    drivers,
    rows: rows.slice(-14).map((row) => ({
      date: formatDate(dateFromRow(row)),
      label: normalizeLabel(row.status?.label ?? row.regime?.label),
      confidence: pct(row.confidence?.confidence_score),
    })),
    transitions,
  };
}

export default async function ExplorerPage() {
  const chains = await Promise.all(CHAINS.map((chain) => getChain(chain)));
  const goodConfidence = chains.filter((chain) => chain.confidenceState === "Good").length;
  const latestDates = chains.map((chain) => chain.asOf).filter((value) => value !== "—");

  return (
    <main className="mx-auto max-w-7xl px-6 py-14 lg:px-8 lg:py-20">
      <section className="grid gap-10 lg:grid-cols-[1fr_0.85fr] lg:items-end">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-primary">Explorer</p>
          <h1 className="mt-5 text-5xl font-medium tracking-[-0.05em] sm:text-6xl">Read the current network state first.</h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-muted-foreground">
            Explorer is the no-setup surface for Urd Atlas. Start here to see each chain's latest published regime,
            confidence level, freshness and recent state path before you download CSVs or integrate the API.
          </p>
        </div>
        <div className="rounded-3xl border border-border bg-card/60 p-6">
          <p className="font-mono text-xs uppercase tracking-[0.16em] text-primary">How to read it</p>
          <p className="mt-4 text-2xl font-medium tracking-tight">Label, confidence, freshness, drivers.</p>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            The label is a summary. The confidence and freshness fields tell you how much weight to place on it.
            Drivers and recent rows show why the latest state should be interpreted as context, not an instruction.
          </p>
        </div>
      </section>

      <section className="mt-10 grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-border bg-card/55 p-5">
          <p className="font-mono text-xs uppercase tracking-[0.16em] text-primary">Chains covered</p>
          <p className="mt-3 text-3xl font-medium">{chains.length}</p>
          <p className="mt-2 text-sm text-muted-foreground">Bitcoin, Ethereum, Arbitrum and Base.</p>
        </div>
        <div className="rounded-3xl border border-border bg-card/55 p-5">
          <p className="font-mono text-xs uppercase tracking-[0.16em] text-primary">Good confidence now</p>
          <p className="mt-3 text-3xl font-medium">{goodConfidence}/{chains.length}</p>
          <p className="mt-2 text-sm text-muted-foreground">Latest rows with confidence at or above the normal gate.</p>
        </div>
        <div className="rounded-3xl border border-border bg-card/55 p-5">
          <p className="font-mono text-xs uppercase tracking-[0.16em] text-primary">Latest published window</p>
          <p className="mt-3 text-3xl font-medium">{latestDates[0] ?? "—"}</p>
          <p className="mt-2 text-sm text-muted-foreground">Use each chain card for the exact as-of date and cadence.</p>
        </div>
      </section>

      <section className="mt-12 grid gap-6 lg:grid-cols-2">
        {chains.map((chain) => (
          <article key={chain.id} className="rounded-[2rem] border border-border bg-card/60 p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-primary">{chain.ticker} · {chain.name}</p>
                <h2 className="mt-3 text-4xl font-medium tracking-tight">{chain.latestLabel}</h2>
                <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">{chain.labelExplainer}</p>
              </div>
              <div className="rounded-2xl border border-border bg-background/60 px-4 py-3 text-right text-xs text-muted-foreground">
                <p className="font-medium text-foreground">{chain.lag}</p>
                <p>{chain.asOf}</p>
              </div>
            </div>

            <p className="mt-5 text-sm leading-7 text-muted-foreground">{chain.oneLiner}</p>

            <dl className="mt-6 grid gap-3 sm:grid-cols-4">
              <div className="rounded-2xl border border-border bg-background/55 p-4">
                <dt className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Confidence</dt>
                <dd className="mt-2 text-2xl font-medium">{chain.confidence}</dd>
                <dd className="mt-1 text-xs text-primary">{chain.confidenceState}</dd>
              </div>
              <div className="rounded-2xl border border-border bg-background/55 p-4">
                <dt className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Data quality</dt>
                <dd className="mt-2 text-2xl font-medium">{chain.dataQuality}</dd>
              </div>
              <div className="rounded-2xl border border-border bg-background/55 p-4">
                <dt className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Lag</dt>
                <dd className="mt-2 text-2xl font-medium">{chain.lagDays}</dd>
              </div>
              <div className="rounded-2xl border border-border bg-background/55 p-4">
                <dt className="text-xs uppercase tracking-[0.16em] text-muted-foreground">30d changes</dt>
                <dd className="mt-2 text-2xl font-medium">{chain.transitions}</dd>
              </div>
            </dl>

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-border bg-background/55 p-4">
                <p className="font-mono text-xs uppercase tracking-[0.16em] text-primary">Interpretation gate</p>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{chain.confidenceGuidance}</p>
                <p className="mt-3 text-xs text-muted-foreground">Methodology: {chain.methodology}</p>
              </div>
              <div className="rounded-2xl border border-border bg-background/55 p-4">
                <p className="font-mono text-xs uppercase tracking-[0.16em] text-primary">Latest drivers</p>
                {chain.drivers.length ? (
                  <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                    {chain.drivers.map((driver) => <li key={driver}>· {driver}</li>)}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm text-muted-foreground">No driver list was published for this row.</p>
                )}
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-border bg-background/55 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="font-mono text-xs uppercase tracking-[0.16em] text-primary">Latest published path</p>
                <p className="text-xs text-muted-foreground">Last {chain.rows.length} rows</p>
              </div>
              <div className="mt-4 grid gap-2">
                {chain.rows.map((row) => (
                  <div key={`${chain.id}-${row.date}`} className="grid grid-cols-[1fr_auto_auto] gap-3 rounded-xl border border-border/70 px-3 py-2 text-sm">
                    <span className="text-muted-foreground">{row.date}</span>
                    <span className="font-medium">{row.label}</span>
                    <span className="font-mono text-xs text-primary">{row.confidence}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link href={`/chains/${chain.id}`} className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Open chain page</Link>
              <Link href="/analyst-kit" className="rounded-full border border-border px-4 py-2 text-sm font-medium">Use in Analyst Kit</Link>
              <Link href="/validation" className="rounded-full border border-border px-4 py-2 text-sm font-medium">Check diagnostics</Link>
            </div>
          </article>
        ))}
      </section>

      <section className="mt-14 rounded-[2rem] border border-border bg-card p-8 lg:p-10">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-primary">Product boundary</p>
        <h2 className="mt-4 text-3xl font-medium tracking-tight">Explorer is a reading surface, not an automation layer.</h2>
        <p className="mt-4 max-w-4xl text-muted-foreground leading-7">
          Use this page to understand the latest published network-state context, inspect confidence and decide whether to open a chain page,
          download Analyst Kit artifacts or review validation diagnostics. It is descriptive reference data, not a live execution system or future-state guarantee.
        </p>
      </section>
    </main>
  );
}
