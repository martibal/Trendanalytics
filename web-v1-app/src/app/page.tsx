import Link from "next/link";
import { readStorageObject } from "@/lib/storage";

export const revalidate = 0;

type Label = "STABLE" | "HEATING" | "CONGESTED" | "CHEAP" | "UNKNOWN/DEGRADED";

type MetaLatest = {
  chain?: string;
  date?: string;
  updated_through?: string;
  status?: {
    label?: string;
    one_liner?: string;
  };
  regime?: {
    label?: string;
    asof_date?: string;
  };
  confidence?: {
    confidence_score?: number;
    data_quality_score?: number;
    label_confidence_score?: number;
    lag_days_vs_utc_today?: number;
  };
  methodology_version?: string;
};

type DatasetJson = {
  published_at?: string;
  computed_at_utc?: string;
};

type ChainSnapshot = {
  id: string;
  ticker: string;
  name: string;
  lag: string;
  regime: Label;
  confidence: string;
  asOf: string;
  oneLiner: string;
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

    const raw = arrayBufferToUtf8(result.body);
    const parsed = JSON.parse(raw);

    if (!parsed || typeof parsed !== "object") return null;
    return parsed as T;
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

  return parsed.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

async function getSnapshot(chain: (typeof CHAINS)[number]): Promise<ChainSnapshot> {
  const meta = await readJson<MetaLatest>(`data/published/v1/meta/${chain.id}/latest.json`);
  const regime = normalizeLabel(meta?.status?.label ?? meta?.regime?.label);

  return {
    id: chain.id,
    ticker: chain.ticker,
    name: chain.name,
    lag: chain.lag,
    regime,
    confidence: pct(meta?.confidence?.confidence_score),
    asOf: formatDate(meta?.date ?? meta?.updated_through ?? meta?.regime?.asof_date),
    oneLiner:
      meta?.status?.one_liner ??
      `${chain.name} latest published network-state row is ${regime}.`,
  };
}

async function getLastRun(): Promise<string> {
  const dataset = await readJson<DatasetJson>("data/published/v1/dataset.json");
  return formatDate(dataset?.published_at ?? dataset?.computed_at_utc);
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-border/70 bg-card/60 px-3 py-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">
      {children}
    </span>
  );
}

function PrimaryLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition hover:opacity-90"
    >
      {children}
    </Link>
  );
}

function SecondaryLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center justify-center rounded-full border border-border px-5 py-3 text-sm font-medium text-foreground transition hover:border-primary/70 hover:text-primary"
    >
      {children}
    </Link>
  );
}

function LevelCard({
  level,
  title,
  body,
  href,
  cta,
}: {
  level: string;
  title: string;
  body: string;
  href: string;
  cta: string;
}) {
  return (
    <article className="rounded-3xl border border-border bg-card/55 p-6 shadow-sm">
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-primary">{level}</p>
      <h3 className="mt-4 text-2xl font-medium tracking-tight text-foreground">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{body}</p>
      <Link href={href} className="mt-6 inline-flex text-sm font-medium text-primary">
        {cta} →
      </Link>
    </article>
  );
}

function WorkflowStep({ number, title, body }: { number: string; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-border bg-background/45 p-5">
      <div className="flex items-center gap-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
          {number}
        </span>
        <h3 className="text-base font-medium text-foreground">{title}</h3>
      </div>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{body}</p>
    </div>
  );
}

export default async function HomePage() {
  const [snapshots, lastRun] = await Promise.all([
    Promise.all(CHAINS.map((chain) => getSnapshot(chain))),
    getLastRun(),
  ]);

  return (
    <main className="bg-background text-foreground">
      <section className="mx-auto grid max-w-7xl gap-10 px-6 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-24">
        <div>
          <div className="flex flex-wrap gap-2">
            <Pill>Daily network-state data</Pill>
            <Pill>No price forecasts</Pill>
            <Pill>Point-in-time ready</Pill>
          </div>

          <h1 className="mt-8 max-w-4xl text-5xl font-medium tracking-[-0.05em] text-foreground sm:text-6xl lg:text-7xl">
            Add blockchain network state to the work you already do.
          </h1>

          <p className="mt-7 max-w-2xl text-lg leading-8 text-muted-foreground">
            Urd Atlas turns raw on-chain activity into a daily network-state layer you can read in the browser,
            download into analyst workflows, or integrate into models, backtests and monitoring systems.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <PrimaryLink href="/explorer">Read current state</PrimaryLink>
            <SecondaryLink href="/analyst-kit">Use without a pipeline</SecondaryLink>
            <SecondaryLink href="/api-docs">Open API docs</SecondaryLink>
          </div>

          <dl className="mt-10 grid max-w-2xl grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              ["4", "chains"],
              ["T+1", "BTC / ETH"],
              ["weekly", "Base / Arbitrum"],
              [lastRun, "last run"],
            ].map(([value, label]) => (
              <div key={label} className="rounded-2xl border border-border bg-card/40 p-4">
                <dt className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</dt>
                <dd className="mt-2 text-xl font-medium text-foreground">{value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <aside className="rounded-[2rem] border border-border bg-card/70 p-5 shadow-2xl shadow-black/20">
          <div className="rounded-3xl border border-border bg-background/60 p-5">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-primary">Latest published rows</p>
            <div className="mt-5 space-y-3">
              {snapshots.map((chain) => (
                <Link
                  key={chain.id}
                  href={`/chains/${chain.id}`}
                  className="block rounded-2xl border border-border bg-card/50 p-4 transition hover:border-primary/60"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">{chain.ticker} · {chain.name}</p>
                      <p className="mt-1 text-2xl font-medium tracking-tight">{chain.regime}</p>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <p>{chain.lag}</p>
                      <p>{chain.asOf}</p>
                    </div>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{chain.oneLiner}</p>
                  <p className="mt-3 font-mono text-xs uppercase tracking-[0.16em] text-primary">confidence {chain.confidence}</p>
                </Link>
              ))}
            </div>
          </div>
        </aside>
      </section>

      <section className="border-y border-border bg-card/25">
        <div className="mx-auto max-w-7xl px-6 py-14 lg:px-8">
          <div className="max-w-3xl">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-primary">The product in one join</p>
            <h2 className="mt-4 text-3xl font-medium tracking-tight sm:text-4xl">
              Urd Atlas becomes useful when it is joined to another workflow.
            </h2>
            <p className="mt-4 text-muted-foreground leading-7">
              The output is not a trading recommendation. It is a contextual feature layer: date, chain,
              regime, confidence, component scores and reproducibility metadata. The value appears when it
              segments analysis, flags weak observations, or explains where a model behaves differently.
            </p>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-2">
            <pre className="overflow-x-auto rounded-3xl border border-border bg-background p-5 text-sm leading-7 text-muted-foreground"><code>{`# Your existing data
date        chain       prediction   actual   error
2026-07-01  ethereum    0.042        0.018    0.024`}</code></pre>
            <pre className="overflow-x-auto rounded-3xl border border-border bg-background p-5 text-sm leading-7 text-muted-foreground"><code>{`# After Urd Atlas
date        chain       prediction   actual   error   regime     confidence
2026-07-01  ethereum    0.042        0.018    0.024   HEATING    0.84`}</code></pre>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
        <div className="max-w-3xl">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-primary">Start where you are</p>
          <h2 className="mt-4 text-3xl font-medium tracking-tight sm:text-4xl">
            One product surface for each stage of trust.
          </h2>
          <p className="mt-4 text-muted-foreground leading-7">
            First read the current state, then test the table, inspect diagnostics, understand workflows and integrate only when the use case is proven.
          </p>
        </div>
        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-5">
          <LevelCard
            level="Read"
            title="Explorer"
            body="See the latest regime, confidence, freshness and recent state path for each supported chain."
            href="/explorer"
            cta="Open Explorer"
          />
          <LevelCard
            level="Analyze"
            title="Analyst Kit"
            body="Open CSV calendars, weekly summaries, schema and a runnable notebook without owning a pipeline."
            href="/analyst-kit"
            cta="Use Analyst Kit"
          />
          <LevelCard
            level="Trust"
            title="Validation"
            body="Check observations, regime balance, transition structure and confidence coverage before relying on the data."
            href="/validation"
            cta="Check diagnostics"
          />
          <LevelCard
            level="Apply"
            title="Workflows"
            body="Map Urd Atlas to report annotation, app metric segmentation, model evaluation and monitoring."
            href="/workflows"
            cta="See workflows"
          />
          <LevelCard
            level="Integrate"
            title="API Docs"
            body="Use public checks, Analyst Kit endpoints and authenticated artifact delivery once the workflow is proven."
            href="/api-docs"
            cta="Open API docs"
          />
        </div>
      </section>

      <section className="border-y border-border bg-card/25">
        <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-primary">From data to decision</p>
              <h2 className="mt-4 text-3xl font-medium tracking-tight sm:text-4xl">The first workflow customers should understand.</h2>
              <p className="mt-4 text-muted-foreground leading-7">
                Urd Atlas should answer a concrete question: does my model, report, dashboard or thesis behave
                differently when the underlying blockchain is stable, heating, congested, cheap or unknown?
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <WorkflowStep number="1" title="Join" body="Attach Urd Atlas to your data on observation date and chain." />
              <WorkflowStep number="2" title="Gate" body="Filter or weight observations by confidence and freshness before drawing conclusions." />
              <WorkflowStep number="3" title="Segment" body="Measure errors, returns, growth, volume, user activity or report metrics by regime." />
              <WorkflowStep number="4" title="Act" body="Adjust model trust, annotate dashboards, prioritize research, or explain performance changes." />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-3">
          {[
            ["For analysts", "A regime calendar and weekly summary reduce the time spent interpreting raw on-chain charts before writing a report."],
            ["For protocol teams", "Compare app growth against chain-wide network state to separate internal traction from broader ecosystem heat."],
            ["For data teams", "Use a deterministic feature vector and metadata contract instead of maintaining another bespoke on-chain classification pipeline."],
          ].map(([title, body]) => (
            <article key={title} className="rounded-3xl border border-border bg-card/55 p-6">
              <h3 className="text-xl font-medium tracking-tight">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-20 lg:px-8">
        <div className="rounded-[2rem] border border-border bg-card p-8 lg:p-10">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-primary">Validation before persuasion</p>
          <div className="mt-4 grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <h2 className="text-3xl font-medium tracking-tight sm:text-4xl">Trust starts with diagnostics, not copy.</h2>
              <p className="mt-4 max-w-3xl text-muted-foreground leading-7">
                The Validation page now shows published-data diagnostics: observations, transition structure,
                dominant regime share, confidence coverage and per-chain segmentation status. Use it before
                treating the network-state layer as a downstream control variable.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 lg:justify-end">
              <PrimaryLink href="/validation">See validation</PrimaryLink>
              <SecondaryLink href="/api-docs">Open API docs</SecondaryLink>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
