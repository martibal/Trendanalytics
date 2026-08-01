import type { Metadata } from "next";
import Link from "next/link";
import { readStorageObject } from "@/lib/storage";

export const revalidate = 0;

export const metadata: Metadata = {
  title: "Validation | Urd Atlas",
  description: "Validation framework for Urd Atlas network-state features, class balance, transitions and limitations.",
};

type Label = "STABLE" | "HEATING" | "CONGESTED" | "CHEAP" | "UNKNOWN/DEGRADED";

type MetaWindowRow = {
  date?: string;
  updated_through?: string;
  status?: { label?: string };
  regime?: { label?: string; asof_date?: string };
  confidence?: { confidence_score?: number };
};

const CHAINS = [
  { id: "bitcoin", ticker: "BTC", name: "Bitcoin" },
  { id: "ethereum", ticker: "ETH", name: "Ethereum" },
  { id: "arbitrum", ticker: "ARB", name: "Arbitrum" },
  { id: "base", ticker: "BASE", name: "Base" },
] as const;

const LABELS: Label[] = ["STABLE", "HEATING", "CONGESTED", "CHEAP", "UNKNOWN/DEGRADED"];

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

function dateFromRow(row: MetaWindowRow): string {
  return row.date ?? row.updated_through ?? row.regime?.asof_date ?? "";
}

function entropy(counts: Record<Label, number>, total: number): number {
  if (total === 0) return 0;
  return LABELS.reduce((sum, label) => {
    const p = counts[label] / total;
    return p > 0 ? sum - p * Math.log2(p) : sum;
  }, 0);
}

async function getValidationRow(chain: (typeof CHAINS)[number]) {
  const raw = await readJson<MetaWindowRow[]>(`data/published/v1/meta/${chain.id}/last365d.json`);
  const rows = Array.isArray(raw) ? [...raw].sort((a, b) => dateFromRow(a).localeCompare(dateFromRow(b))) : [];
  const labels = rows.map((row) => normalizeLabel(row.status?.label ?? row.regime?.label));
  const counts = LABELS.reduce<Record<Label, number>>((acc, label) => {
    acc[label] = 0;
    return acc;
  }, {} as Record<Label, number>);

  labels.forEach((label) => {
    counts[label] += 1;
  });

  const transitions = labels.reduce((sum, label, index) => (index > 0 && labels[index - 1] !== label ? sum + 1 : sum), 0);
  const confidenceValues = rows
    .map((row) => row.confidence?.confidence_score)
    .filter((value): value is number => typeof value === "number" && !Number.isNaN(value));
  const averageConfidence = confidenceValues.length
    ? confidenceValues.reduce((sum, value) => sum + value, 0) / confidenceValues.length
    : undefined;

  return {
    ...chain,
    observations: rows.length,
    counts,
    transitions,
    averageConfidence,
    entropy: entropy(counts, rows.length),
    latest: labels[labels.length - 1] ?? "UNKNOWN/DEGRADED",
  };
}

const proofItems = [
  {
    title: "Class balance",
    body: "If a regime is almost always the same, it is a weak feature. Show frequency, dominant class share, entropy and run lengths per chain.",
  },
  {
    title: "Transition quality",
    body: "A useful state layer should not flip randomly, but it also cannot be constant. Track transition frequency and median days per run.",
  },
  {
    title: "Confidence distribution",
    body: "Users need to know how often the product is confident enough for automated analysis and how often it should trigger fallback behavior.",
  },
  {
    title: "Baseline comparison",
    body: "Compare Urd Atlas against simple rolling z-score or quantile rules. The product must beat the cheap internal alternative on stability, documentation or utility.",
  },
  {
    title: "Workflow validation",
    body: "Demonstrate at least one real model, report or protocol-metric workflow where the network-state layer changes the analysis.",
  },
  {
    title: "Point-in-time audit",
    body: "Separate observation date, publication date and available-at date so backtests cannot accidentally consume future information.",
  },
];

export default async function ValidationPage() {
  const rows = await Promise.all(CHAINS.map((chain) => getValidationRow(chain)));

  return (
    <main className="mx-auto max-w-7xl px-6 py-14 lg:px-8 lg:py-20">
      <section className="max-w-4xl">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-primary">Validation</p>
        <h1 className="mt-5 text-5xl font-medium tracking-[-0.05em] sm:text-6xl">Evidence before positioning.</h1>
        <p className="mt-6 text-lg leading-8 text-muted-foreground">
          Urd Atlas should not ask technical customers to believe in regimes. It should show whether the network-state layer has variation,
          confidence, stability and practical usefulness in real workflows.
        </p>
      </section>

      <section className="mt-12 overflow-hidden rounded-[2rem] border border-border bg-card/60">
        <div className="border-b border-border px-6 py-5">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-primary">Current published-data diagnostics</p>
          <p className="mt-2 text-sm text-muted-foreground">These are descriptive diagnostics from the available last-365-day meta windows where present.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse text-left text-sm">
            <thead className="border-b border-border text-xs uppercase tracking-[0.16em] text-muted-foreground">
              <tr>
                <th className="px-6 py-4">Chain</th>
                <th className="px-6 py-4">Obs.</th>
                <th className="px-6 py-4">Latest</th>
                <th className="px-6 py-4">Transitions</th>
                <th className="px-6 py-4">Entropy</th>
                <th className="px-6 py-4">Avg. confidence</th>
                {LABELS.map((label) => <th key={label} className="px-6 py-4">{label}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-border/70 last:border-0">
                  <td className="px-6 py-4 font-medium">{row.ticker} · {row.name}</td>
                  <td className="px-6 py-4 text-muted-foreground">{row.observations}</td>
                  <td className="px-6 py-4">{row.latest}</td>
                  <td className="px-6 py-4 text-muted-foreground">{row.transitions}</td>
                  <td className="px-6 py-4 text-muted-foreground">{row.entropy.toFixed(2)}</td>
                  <td className="px-6 py-4 text-muted-foreground">{pct(row.averageConfidence)}</td>
                  {LABELS.map((label) => (
                    <td key={label} className="px-6 py-4 text-muted-foreground">{row.counts[label]}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-12 grid gap-5 lg:grid-cols-3">
        {proofItems.map((item) => (
          <article key={item.title} className="rounded-3xl border border-border bg-card/55 p-6">
            <h2 className="text-2xl font-medium tracking-tight">{item.title}</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.body}</p>
          </article>
        ))}
      </section>

      <section className="mt-14 grid gap-8 lg:grid-cols-2">
        <div className="rounded-3xl border border-border bg-card/55 p-7">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-primary">Minimum proof standard</p>
          <h2 className="mt-4 text-3xl font-medium tracking-tight">A buyer needs proof of usefulness, not proof of elegance.</h2>
          <p className="mt-4 text-sm leading-7 text-muted-foreground">
            The validation layer should answer whether Urd Atlas is materially better than a customer building three rolling z-scores internally.
            The answer may be better stability, more transparent confidence handling, reproducibility, lower maintenance cost or a measurable workflow improvement.
          </p>
        </div>
        <div className="rounded-3xl border border-border bg-card/55 p-7">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-primary">Do not overclaim</p>
          <h2 className="mt-4 text-3xl font-medium tracking-tight">Validation is not alpha marketing.</h2>
          <p className="mt-4 text-sm leading-7 text-muted-foreground">
            This page should not claim that regimes predict returns unless that is separately proven. Its job is to make the data product credible:
            where it varies, when it is reliable, what it can segment and where customers should not use it.
          </p>
        </div>
      </section>

      <section className="mt-14 rounded-[2rem] border border-border bg-card p-8 lg:p-10">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-primary">Next build target</p>
        <h2 className="mt-4 text-3xl font-medium tracking-tight">Turn diagnostics into downloadable research examples.</h2>
        <p className="mt-4 max-w-4xl text-muted-foreground leading-7">
          The next version should add reproducible notebooks that join Urd Atlas to a public returns, volatility, fee or protocol-activity dataset and show a real regime-conditioned analysis.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link href="/workflows" className="rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground">See workflows</Link>
          <Link href="/methodology" className="rounded-full border border-border px-5 py-3 text-sm font-medium">Read methodology</Link>
        </div>
      </section>
    </main>
  );
}
