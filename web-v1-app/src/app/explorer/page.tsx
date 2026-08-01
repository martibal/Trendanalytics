import type { Metadata } from "next";
import Link from "next/link";
import { readStorageObject } from "@/lib/storage";

export const revalidate = 0;

export const metadata: Metadata = {
  title: "Explorer | Urd Atlas",
  description: "Browse current and historical blockchain network state without setting up a data pipeline.",
};

type Label = "STABLE" | "HEATING" | "CONGESTED" | "CHEAP" | "UNKNOWN/DEGRADED";

type MetaLatest = {
  date?: string;
  updated_through?: string;
  status?: { label?: string; one_liner?: string };
  regime?: { label?: string; asof_date?: string; drivers?: Array<{ name?: string; label?: string; value?: string }> };
  confidence?: { confidence_score?: number; data_quality_score?: number; label_confidence_score?: number; lag_days_vs_utc_today?: number };
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
  { id: "bitcoin", ticker: "BTC", name: "Bitcoin", lag: "T+1" },
  { id: "ethereum", ticker: "ETH", name: "Ethereum", lag: "T+1" },
  { id: "arbitrum", ticker: "ARB", name: "Arbitrum", lag: "weekly" },
  { id: "base", ticker: "BASE", name: "Base", lag: "weekly" },
] as const;

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

async function getChain(chain: (typeof CHAINS)[number]) {
  const [latest, last30Raw] = await Promise.all([
    readJson<MetaLatest>(`data/published/v1/meta/${chain.id}/latest.json`),
    readJson<MetaWindowRow[]>(`data/published/v1/meta/${chain.id}/last30d.json`),
  ]);

  const rows = Array.isArray(last30Raw) ? [...last30Raw].sort((a, b) => dateFromRow(a).localeCompare(dateFromRow(b))) : [];
  const labels = rows.map((row) => normalizeLabel(row.status?.label ?? row.regime?.label));
  const transitions = labels.reduce((sum, label, index) => (index > 0 && labels[index - 1] !== label ? sum + 1 : sum), 0);
  const latestLabel = normalizeLabel(latest?.status?.label ?? latest?.regime?.label);

  return {
    ...chain,
    latest,
    latestLabel,
    asOf: formatDate(latest?.date ?? latest?.updated_through ?? latest?.regime?.asof_date),
    confidence: pct(latest?.confidence?.confidence_score),
    dataQuality: pct(latest?.confidence?.data_quality_score),
    labelConfidence: pct(latest?.confidence?.label_confidence_score),
    oneLiner: latest?.status?.one_liner ?? `${chain.name}'s latest published network-state row is ${latestLabel}.`,
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

  return (
    <main className="mx-auto max-w-7xl px-6 py-14 lg:px-8 lg:py-20">
      <section className="max-w-4xl">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-primary">Explorer</p>
        <h1 className="mt-5 text-5xl font-medium tracking-[-0.05em] sm:text-6xl">Read network state before you integrate it.</h1>
        <p className="mt-6 text-lg leading-8 text-muted-foreground">
          Explorer is the no-setup surface for Urd Atlas. It should answer the first practical question:
          what state is each chain in, how confident is the classification, and what changed recently?
        </p>
      </section>

      <section className="mt-12 grid gap-6 lg:grid-cols-2">
        {chains.map((chain) => (
          <article key={chain.id} className="rounded-[2rem] border border-border bg-card/60 p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-primary">{chain.ticker} · {chain.name}</p>
                <h2 className="mt-3 text-4xl font-medium tracking-tight">{chain.latestLabel}</h2>
              </div>
              <div className="rounded-2xl border border-border bg-background/60 px-4 py-3 text-right text-xs text-muted-foreground">
                <p>{chain.lag}</p>
                <p>{chain.asOf}</p>
              </div>
            </div>

            <p className="mt-5 text-sm leading-7 text-muted-foreground">{chain.oneLiner}</p>

            <dl className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-border bg-background/55 p-4">
                <dt className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Confidence</dt>
                <dd className="mt-2 text-2xl font-medium">{chain.confidence}</dd>
              </div>
              <div className="rounded-2xl border border-border bg-background/55 p-4">
                <dt className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Data quality</dt>
                <dd className="mt-2 text-2xl font-medium">{chain.dataQuality}</dd>
              </div>
              <div className="rounded-2xl border border-border bg-background/55 p-4">
                <dt className="text-xs uppercase tracking-[0.16em] text-muted-foreground">30d changes</dt>
                <dd className="mt-2 text-2xl font-medium">{chain.transitions}</dd>
              </div>
            </dl>

            <div className="mt-6 rounded-2xl border border-border bg-background/55 p-4">
              <p className="font-mono text-xs uppercase tracking-[0.16em] text-primary">Latest path</p>
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
              <Link href="/analyst-kit" className="rounded-full border border-border px-4 py-2 text-sm font-medium">Use in report</Link>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
