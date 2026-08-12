import type { Metadata } from "next";
import Link from "next/link";
import { readStorageObject } from "@/lib/storage";
import {
  buildValidationDiagnostics,
  VALIDATION_LABELS,
  type ValidationDiagnostics,
  type ValidationInputRow,
  type ValidationLabel,
} from "@/lib/validationDiagnostics";

export const revalidate = 0;

export const metadata: Metadata = {
  title: "Validation | Urd Atlas",
  description: "Empirical validation and published diagnostics for Urd Atlas network-state classification: internal consistency, threshold robustness, signal ablation, class balance, transitions and confidence coverage.",
};

type WindowId = "last365d" | "last180d" | "last90d" | "last30d" | "last7d";

type ChainConfig = {
  id: "bitcoin" | "ethereum" | "arbitrum" | "base";
  ticker: string;
  name: string;
};

type ChainValidationRow = ChainConfig & ValidationDiagnostics & {
  window: WindowId | "unavailable";
};

const CHAINS: ChainConfig[] = [
  { id: "bitcoin", ticker: "BTC", name: "Bitcoin" },
  { id: "ethereum", ticker: "ETH", name: "Ethereum" },
  { id: "arbitrum", ticker: "ARB", name: "Arbitrum" },
  { id: "base", ticker: "BASE", name: "Base" },
];

const WINDOWS: WindowId[] = ["last365d", "last180d", "last90d", "last30d", "last7d"];

const proofItems = [
  {
    title: "Class balance",
    body: "A useful regime feature needs enough variation to segment analysis. Dominant-class share and entropy show whether a chain is informative or mostly constant.",
  },
  {
    title: "Transition stability",
    body: "A state layer should not flip randomly, but it also cannot be static. Transitions per 100 observations and median run length make that tradeoff visible.",
  },
  {
    title: "Confidence coverage",
    body: "Confidence should be used as a quality gate. This page shows how much of each chain has Good, Caution, Degraded or missing confidence.",
  },
  {
    title: "Operational usefulness",
    body: "The practical question is whether the feature helps explain daily app, protocol, fee, support or usage metrics more cleanly than an internal one-off rule.",
  },
  {
    title: "Point-in-time discipline",
    body: "Observation date, publication date and available-at timing must stay separate so downstream analysis does not accidentally use unavailable context.",
  },
  {
    title: "Explicit limitations",
    body: "Validation should state where the data is sparse, stale, low-confidence or too imbalanced to support a strong conclusion.",
  },
];

const statusLegend = [
  {
    title: "Usable diagnostic sample",
    body: "Enough observations, acceptable regime variation and at least half of rows carrying Good confidence.",
  },
  {
    title: "Confidence-limited",
    body: "There may be enough observations and variation, but fewer than half of rows pass the Good-confidence gate.",
  },
  {
    title: "Low variation",
    body: "One regime dominates at least 90% of rows, so segmentation may say more about the dominant state than about regime differences.",
  },
  {
    title: "Too sparse",
    body: "Fewer than 30 observations are available in the best published window, so the diagnostic sample is not yet strong.",
  },
];

const labelShort: Record<ValidationLabel, string> = {
  STABLE: "Stable",
  HEATING: "Heating",
  CONGESTED: "Congested",
  CHEAP: "Cheap",
  "UNKNOWN/DEGRADED": "Unknown",
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

function pct(value: number | undefined): string {
  if (typeof value !== "number" || Number.isNaN(value)) return "—";
  return `${Math.round(value * 100)}%`;
}

function decimal(value: number | undefined, digits = 2): string {
  if (typeof value !== "number" || Number.isNaN(value)) return "—";
  return value.toFixed(digits);
}

function dateRange(row: ChainValidationRow): string {
  if (!row.firstDate && !row.lastDate) return "—";
  if (row.firstDate === row.lastDate) return row.firstDate;
  return `${row.firstDate || "—"} → ${row.lastDate || "—"}`;
}

function diagnosticsStatus(row: ChainValidationRow): string {
  if (row.observations < 30) return "Too sparse";
  if (row.dominantShare >= 0.9) return "Low variation";
  if (row.usableConfidenceShare < 0.5) return "Confidence-limited";
  return "Usable diagnostic sample";
}

async function readBestWindow(chain: ChainConfig): Promise<{ window: WindowId | "unavailable"; rows: ValidationInputRow[] }> {
  for (const window of WINDOWS) {
    const raw = await readJson<ValidationInputRow[]>(`data/published/v1/meta/${chain.id}/${window}.json`);
    if (Array.isArray(raw) && raw.length > 0) return { window, rows: raw };
  }

  return { window: "unavailable", rows: [] };
}

async function getValidationRow(chain: ChainConfig): Promise<ChainValidationRow> {
  const { window, rows } = await readBestWindow(chain);
  const diagnostics = buildValidationDiagnostics(rows);

  return {
    ...chain,
    window,
    ...diagnostics,
  };
}

function totalObservations(rows: ChainValidationRow[]): number {
  return rows.reduce((sum, row) => sum + row.observations, 0);
}

function totalTransitions(rows: ChainValidationRow[]): number {
  return rows.reduce((sum, row) => sum + row.transitions, 0);
}

function averageGoodConfidenceShare(rows: ChainValidationRow[]): number | undefined {
  const populated = rows.filter((row) => row.observations > 0);
  if (populated.length === 0) return undefined;
  return populated.reduce((sum, row) => sum + row.usableConfidenceShare, 0) / populated.length;
}

function RegimeBars({ row }: { row: ChainValidationRow }) {
  return (
    <div className="grid gap-2">
      {VALIDATION_LABELS.map((label) => {
        const count = row.counts[label];
        const share = row.observations ? (count / row.observations) * 100 : 0;

        return (
          <div key={label} className="grid gap-1">
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="text-muted-foreground">{labelShort[label]}</span>
              <span className="font-mono text-muted-foreground">{count}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-background">
              <div className="h-full rounded-full bg-primary/70" style={{ width: `${Math.max(share, count > 0 ? 3 : 0)}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ConfidenceBars({ row }: { row: ChainValidationRow }) {
  const buckets = [
    { label: "Good", value: row.confidenceBuckets.good },
    { label: "Caution", value: row.confidenceBuckets.caution },
    { label: "Degraded", value: row.confidenceBuckets.degraded },
    { label: "Missing", value: row.confidenceBuckets.missing },
  ];

  return (
    <div className="grid gap-2">
      {buckets.map((bucket) => {
        const share = row.observations ? (bucket.value / row.observations) * 100 : 0;

        return (
          <div key={bucket.label} className="grid gap-1">
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="text-muted-foreground">{bucket.label}</span>
              <span className="font-mono text-muted-foreground">{bucket.value}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-background">
              <div className="h-full rounded-full bg-primary/70" style={{ width: `${Math.max(share, bucket.value > 0 ? 3 : 0)}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default async function ValidationPage() {
  const rows = await Promise.all(CHAINS.map((chain) => getValidationRow(chain)));

  return (
    <main className="mx-auto max-w-7xl px-6 py-14 lg:px-8 lg:py-20">
      <section className="grid gap-10 lg:grid-cols-[1fr_0.8fr] lg:items-end">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-primary">Validation</p>
          <h1 className="mt-5 text-5xl font-medium tracking-[-0.05em] sm:text-6xl">Evidence before trust.</h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-muted-foreground">
            Urd Atlas should not ask technical customers to trust a black box. This page separates dated methodology validation from live published-data diagnostics: whether the classification rules are internally coherent and robust, and whether the current data windows have enough variation, confidence coverage and transition structure for analysis.
          </p>
        </div>
        <div className="rounded-3xl border border-border bg-card/60 p-6">
          <p className="font-mono text-xs uppercase tracking-[0.16em] text-primary">Validation boundary</p>
          <p className="mt-4 text-2xl font-medium tracking-tight">Internally tested. Not a claim of external ground truth.</p>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            Network-state labels are explicitly defined descriptive categories. Validation tests reproducibility, internal rule consistency, threshold robustness and signal dependence. It does not claim a hidden objective regime truth, calibrated label probability, forecast or recommendation.
          </p>
        </div>
      </section>

      <section className="mt-12 rounded-[2rem] border border-border bg-card/60 p-6 lg:p-8">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-primary">Validation Report v1 · 12 August 2026</p>
            <h2 className="mt-3 text-3xl font-medium tracking-tight">The current classifier has been tested for internal consistency and robustness.</h2>
            <p className="mt-3 max-w-4xl text-sm leading-6 text-muted-foreground">
              The historical consistency audit covers all dated Meta rows available at the audit date. Sensitivity and ablation results are scoped to the current active rulesets so older methodology versions are not incorrectly judged by today&apos;s rules.
            </p>
          </div>
          <Link href="/methodology/reference" className="inline-flex w-fit items-center justify-center rounded-full border border-border px-5 py-3 text-sm font-medium">
            Read methodology
          </Link>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-2xl border border-border bg-background/55 p-5">
            <p className="font-mono text-xs uppercase tracking-[0.14em] text-primary">Historical consistency</p>
            <p className="mt-3 text-3xl font-medium tracking-tight">2,464</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Published chain-days audited across Bitcoin, Ethereum, Arbitrum and Base.</p>
          </article>
          <article className="rounded-2xl border border-border bg-background/55 p-5">
            <p className="font-mono text-xs uppercase tracking-[0.14em] text-primary">Hard rule violations</p>
            <p className="mt-3 text-3xl font-medium tracking-tight">0</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">No audited label-rule, confidence-range or candidate-signature consistency failures.</p>
          </article>
          <article className="rounded-2xl border border-border bg-background/55 p-5">
            <p className="font-mono text-xs uppercase tracking-[0.14em] text-primary">Baseline reproduction</p>
            <p className="mt-3 text-3xl font-medium tracking-tight">2,100 / 2,100</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Current-ruleset candidate labels exactly reproduced before counterfactual tests.</p>
          </article>
          <article className="rounded-2xl border border-border bg-background/55 p-5">
            <p className="font-mono text-xs uppercase tracking-[0.14em] text-primary">±5% threshold test</p>
            <p className="mt-3 text-3xl font-medium tracking-tight">96.5–97.6%</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Candidate labels unchanged when key threshold families were moved together by ±5%.</p>
          </article>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <article className="rounded-2xl border border-border bg-background/55 p-5">
            <h3 className="font-medium tracking-tight">Threshold sensitivity</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Combined ±10% perturbations changed 6.57–8.10% of current-ruleset candidate labels. Percentile boundaries were the most influential threshold family; robust z-score and momentum changes had materially smaller marginal effects.
            </p>
          </article>
          <article className="rounded-2xl border border-border bg-background/55 p-5">
            <h3 className="font-medium tracking-tight">Signal ablation</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Removing individual signals changed labels in semantically expected ways: fee removal primarily reduced low-friction or congestion classifications, while primary capacity proxies had the strongest effect on capacity-sensitive regimes. This tests structural dependence, not predictive accuracy.
            </p>
          </article>
        </div>
      </section>

      <section className="mt-12">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-primary">Live published-data diagnostics</p>
          <h2 className="mt-3 text-3xl font-medium tracking-tight">What does the currently published window look like?</h2>
          <p className="mt-3 max-w-4xl text-sm leading-6 text-muted-foreground">These numbers are calculated from the best currently available published Meta window and can change as new rows are published. They are separate from the dated Validation Report v1 results above.</p>
        </div>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        <article className="rounded-3xl border border-border bg-card/55 p-6">
          <p className="font-mono text-xs uppercase tracking-[0.16em] text-primary">Rows inspected</p>
          <p className="mt-3 text-4xl font-medium tracking-tight">{totalObservations(rows).toLocaleString("en-US")}</p>
          <p className="mt-2 text-sm text-muted-foreground">Across currently available published meta windows.</p>
        </article>
        <article className="rounded-3xl border border-border bg-card/55 p-6">
          <p className="font-mono text-xs uppercase tracking-[0.16em] text-primary">Transitions observed</p>
          <p className="mt-3 text-4xl font-medium tracking-tight">{totalTransitions(rows).toLocaleString("en-US")}</p>
          <p className="mt-2 text-sm text-muted-foreground">Regime changes in the diagnostic windows.</p>
        </article>
        <article className="rounded-3xl border border-border bg-card/55 p-6">
          <p className="font-mono text-xs uppercase tracking-[0.16em] text-primary">Good-confidence share</p>
          <p className="mt-3 text-4xl font-medium tracking-tight">{pct(averageGoodConfidenceShare(rows))}</p>
          <p className="mt-2 text-sm text-muted-foreground">Average share of rows with confidence ≥ 0.70.</p>
        </article>
      </section>

      <section className="mt-8 rounded-[2rem] border border-border bg-card/45 p-6 lg:p-8">
        <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-primary">Status legend</p>
            <h2 className="mt-3 text-2xl font-medium tracking-tight">How to read the chain status labels.</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              These labels are caution flags for using the diagnostic sample. They do not say whether a chain is good or bad; they say how carefully the current published window should be interpreted.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {statusLegend.map((item) => (
              <article key={item.title} className="rounded-2xl border border-border bg-background/55 p-4">
                <h3 className="font-medium tracking-tight">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-12 rounded-[2rem] border border-border bg-card/60 p-6 lg:p-8">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-primary">Current published-data diagnostics</p>
            <h2 className="mt-3 text-3xl font-medium tracking-tight">Can this chain be segmented?</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
              A customer should quickly see whether a chain has enough observations, enough regime diversity and enough confidence to support downstream reporting or model diagnostics.
            </p>
          </div>
          <Link href="/analyst-kit" className="inline-flex w-fit items-center justify-center rounded-full border border-border px-5 py-3 text-sm font-medium">
            Open Analyst Kit
          </Link>
        </div>

        <div className="mt-8 grid gap-5 xl:grid-cols-2">
          {rows.map((row) => (
            <article key={row.id} className="rounded-3xl border border-border bg-background/55 p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="font-mono text-xs uppercase tracking-[0.16em] text-primary">{row.ticker}</p>
                  <h3 className="mt-2 text-2xl font-medium tracking-tight">{row.name}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{dateRange(row)}</p>
                </div>
                <div className="rounded-2xl border border-border bg-card/60 px-4 py-3 text-sm">
                  <p className="font-mono text-xs uppercase tracking-[0.14em] text-primary">Status</p>
                  <p className="mt-1 font-medium">{diagnosticsStatus(row)}</p>
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl border border-border p-4">
                  <p className="font-mono text-xs uppercase tracking-[0.12em] text-muted-foreground">Obs.</p>
                  <p className="mt-2 text-2xl font-medium">{row.observations}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{row.window}</p>
                </div>
                <div className="rounded-2xl border border-border p-4">
                  <p className="font-mono text-xs uppercase tracking-[0.12em] text-muted-foreground">Dominant</p>
                  <p className="mt-2 text-2xl font-medium">{labelShort[row.dominantLabel]}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{pct(row.dominantShare)} of rows</p>
                </div>
                <div className="rounded-2xl border border-border p-4">
                  <p className="font-mono text-xs uppercase tracking-[0.12em] text-muted-foreground">Transitions</p>
                  <p className="mt-2 text-2xl font-medium">{decimal(row.transitionsPer100Observations, 1)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">per 100 obs.</p>
                </div>
                <div className="rounded-2xl border border-border p-4">
                  <p className="font-mono text-xs uppercase tracking-[0.12em] text-muted-foreground">Median run</p>
                  <p className="mt-2 text-2xl font-medium">{decimal(row.medianRunLength, 1)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">observations</p>
                </div>
              </div>

              <div className="mt-6 grid gap-5 md:grid-cols-2">
                <div className="rounded-2xl border border-border p-4">
                  <div className="flex items-center justify-between gap-4">
                    <h4 className="font-medium">Regime distribution</h4>
                    <span className="font-mono text-xs text-muted-foreground">Entropy {decimal(row.normalizedEntropy)}</span>
                  </div>
                  <div className="mt-4"><RegimeBars row={row} /></div>
                </div>
                <div className="rounded-2xl border border-border p-4">
                  <div className="flex items-center justify-between gap-4">
                    <h4 className="font-medium">Confidence coverage</h4>
                    <span className="font-mono text-xs text-muted-foreground">Avg. {pct(row.averageConfidence)}</span>
                  </div>
                  <div className="mt-4"><ConfidenceBars row={row} /></div>
                </div>
              </div>
            </article>
          ))}
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
            The validation layer should answer whether Urd Atlas is materially better than a customer building a small internal rule set. The answer may be stronger stability, more transparent confidence handling, reproducibility, lower maintenance cost or a measurable workflow improvement.
          </p>
        </div>
        <div className="rounded-3xl border border-border bg-card/55 p-7">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-primary">Do not overclaim</p>
          <h2 className="mt-4 text-3xl font-medium tracking-tight">Validation is not outcome marketing.</h2>
          <p className="mt-4 text-sm leading-7 text-muted-foreground">
            This page should not claim that regimes determine external outcomes. Its job is to make the data product credible: where it varies, when it is reliable, what it can segment and where customers should not use it.
          </p>
        </div>
      </section>

      <section className="mt-14 rounded-[2rem] border border-border bg-card p-8 lg:p-10">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-primary">Next proof layer</p>
        <h2 className="mt-4 text-3xl font-medium tracking-tight">Turn diagnostics into reproducible examples.</h2>
        <p className="mt-4 max-w-4xl text-muted-foreground leading-7">
          The next version should add downloadable notebooks that join Urd Atlas to public chain-activity or protocol-activity datasets and show a real regime-conditioned analysis without changing the product boundary.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link href="/workflows" className="rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground">See workflows</Link>
          <Link href="/methodology" className="rounded-full border border-border px-5 py-3 text-sm font-medium">Read methodology</Link>
        </div>
      </section>
    </main>
  );
}
