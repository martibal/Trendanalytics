import type { Metadata } from "next";
import Link from "next/link";

import EndpointCopyButton from "@/components/analyst-kit/EndpointCopyButton";

export const metadata: Metadata = {
  title: "Analyst Kit | Urd Atlas",
  description:
    "Use free public Urd Atlas CSV calendars, report snippets, schema exports and notebooks before building a data pipeline.",
};

const chains = [
  { id: "bitcoin", label: "Bitcoin", ticker: "BTC" },
  { id: "ethereum", label: "Ethereum", ticker: "ETH" },
  { id: "arbitrum", label: "Arbitrum", ticker: "ARB" },
  { id: "base", label: "Base", ticker: "BASE" },
] as const;

const globalDownloads = [
  {
    title: "Feature schema JSON",
    body: "Machine-readable field semantics, primary key, safe uses and unsafe uses for the Analyst Kit table.",
    href: "/api/v1/analyst-kit/feature-schema",
    action: "Open schema",
  },
  {
    title: "Runnable starter notebook",
    body: "Runs immediately with example data, then shows exactly where to replace it with your own CSV.",
    href: "/api/v1/analyst-kit/starter-notebook",
    action: "Open notebook",
  },
] as const;

const kitItems = [
  {
    title: "Regime calendar CSV",
    body: "One row per chain and observation date: label, confidence, component scores, freshness, methodology version and drivers.",
    example: "/api/v1/analyst-kit/ethereum/regime-calendar",
  },
  {
    title: "Weekly network-state summary",
    body: "Plain text for reports: latest state, recent transitions, confidence level and product-boundary language.",
    example: "/api/v1/analyst-kit/ethereum/weekly-summary",
  },
  {
    title: "Feature schema",
    body: "A machine-readable contract for the Analyst Kit feature table, including field semantics and intended uses.",
    example: "/api/v1/analyst-kit/feature-schema",
  },
  {
    title: "Starter notebook",
    body: "A first-run notebook that creates example metrics, joins Urd Atlas and produces a grouped summary before requiring local data.",
    example: "/api/v1/analyst-kit/starter-notebook",
  },
];

const previewRows = [
  {
    field: "observation_date",
    example: "2026-07-31",
    use: "Join key for daily analysis.",
  },
  {
    field: "chain",
    example: "ethereum",
    use: "Join key and chain selector.",
  },
  {
    field: "regime",
    example: "HEATING",
    use: "Network-state segment.",
  },
  {
    field: "confidence_score",
    example: "0.842",
    use: "Combined confidence score; 0.40 is the publication gate, not an outcome probability.",
  },
  {
    field: "demand_score",
    example: "73.1",
    use: "Continuous component for deeper analysis.",
  },
  {
    field: "methodology_version",
    example: "1.1",
    use: "Reproducibility context.",
  },
] as const;

const activationExample = [
  { label: "Question", value: "Did app activity change because the app improved, or because Ethereum was HEATING?" },
  { label: "Data needed", value: "Your daily metric plus one Urd Atlas regime calendar CSV." },
  { label: "Join", value: "Match on date and chain. Published rows meet the 0.40 gate; apply a stricter downstream confidence filter only if your analysis needs one." },
  { label: "Output", value: "The same metric summarized by network state." },
] as const;

const notebook = `import pandas as pd

chain = "ethereum"
urd = pd.read_csv(f"https://urdatlas.com/api/v1/analyst-kit/{chain}/regime-calendar")

example = urd[["observation_date", "chain"]].tail(30).copy()
example["daily_active_users"] = [100 + (i % 7) * 8 for i in range(len(example))]
example["support_tickets"] = [12 + (i % 5) for i in range(len(example))]
my_data = example.rename(columns={"observation_date": "date"})

df = my_data.merge(
    urd[["observation_date", "chain", "regime", "confidence_score", "demand_score"]],
    left_on=["date", "chain"],
    right_on=["observation_date", "chain"],
    how="left",
)

# 0.40 is the publication gate; 0.70 below is an optional stricter analyst filter.
summary = (
    df[df["confidence_score"] >= 0.70]
    .groupby("regime")
    .agg(
        days=("date", "count"),
        avg_daily_active_users=("daily_active_users", "mean"),
        avg_support_tickets=("support_tickets", "mean"),
        avg_demand_score=("demand_score", "mean"),
    )
)

summary.to_csv("my_metrics_by_urd_network_state.csv")`;

export default function AnalystKitPage() {
  return (
    <main className="mx-auto max-w-7xl px-6 py-14 lg:px-8 lg:py-20">
      <section className="grid gap-10 lg:grid-cols-[1fr_0.85fr] lg:items-end">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-primary">Analyst Kit</p>
          <h1 className="mt-5 text-5xl font-medium tracking-[-0.05em] sm:text-6xl">
            Use Urd Atlas before you have a pipeline.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-muted-foreground">
            Find out whether your metric changed because your project changed, or because the whole chain was in a different network state.
          </p>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-muted-foreground">
            Everything on this page is public and free to inspect. Start with one CSV calendar, join it to one of your daily metrics, and check whether the regime column makes the change easier to explain.
          </p>
        </div>
        <div className="rounded-3xl border border-border bg-card/60 p-6">
          <p className="font-mono text-xs uppercase tracking-[0.16em] text-primary">No-pipeline promise</p>
          <p className="mt-4 text-2xl font-medium tracking-tight">
            Read it, download it, then integrate it when the workflow is proven.
          </p>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            Analyst Kit packages deterministic network-state data into artifacts a research analyst, protocol team or BI user can use without owning data infrastructure.
          </p>
        </div>
      </section>

      <section className="mt-12 rounded-[2rem] border border-border bg-card p-7 lg:p-9">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-primary">Your first test</p>
            <h2 className="mt-3 text-3xl font-medium tracking-tight">Open one CSV, join one metric, summarize by regime.</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
              The first useful test is intentionally small: pick one chain, copy the regime calendar URL, join it to a daily metric you already track, then compare that metric across published regime rows. Use a stricter confidence filter only when your analysis calls for one.
            </p>
          </div>
          <div className="grid gap-2 text-sm leading-6 text-muted-foreground sm:grid-cols-2 lg:min-w-[420px]">
            <div><strong className="text-foreground">1.</strong> Pick a chain.</div>
            <div><strong className="text-foreground">2.</strong> Open or copy the CSV.</div>
            <div><strong className="text-foreground">3.</strong> Join on date and chain.</div>
            <div><strong className="text-foreground">4.</strong> Choose a confidence filter.</div>
          </div>
        </div>

        <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {chains.map((chain) => {
            const csvPath = `/api/v1/analyst-kit/${chain.id}/regime-calendar`;
            const summaryPath = `/api/v1/analyst-kit/${chain.id}/weekly-summary`;

            return (
              <article key={chain.id} className="min-w-0 rounded-3xl border border-border bg-background/55 p-5">
                <p className="font-mono text-xs uppercase tracking-[0.16em] text-primary">{chain.ticker}</p>
                <h3 className="mt-2 text-xl font-medium">{chain.label}</h3>
                <div className="mt-5 grid gap-3 text-sm">
                  <div className="min-w-0 rounded-2xl border border-border p-3">
                    <p className="font-medium">Regime calendar CSV</p>
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">Daily network-state rows for joining to your own metrics.</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <a href={csvPath} className="inline-flex items-center justify-center whitespace-nowrap rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground">Open CSV</a>
                      <EndpointCopyButton path={csvPath} />
                    </div>
                  </div>
                  <div className="min-w-0 rounded-2xl border border-border p-3">
                    <p className="font-medium">Weekly summary text</p>
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">Report-ready context for the latest published state.</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <a href={summaryPath} className="inline-flex items-center justify-center whitespace-nowrap rounded-full border border-border px-4 py-2 text-xs font-medium hover:bg-card">Open summary</a>
                      <EndpointCopyButton path={summaryPath} />
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {globalDownloads.map((download) => (
            <article key={download.href} className="min-w-0 rounded-3xl border border-border bg-background/55 p-5">
              <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                <div className="min-w-0">
                  <h3 className="text-xl font-medium">{download.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{download.body}</p>
                  <code className="mt-3 block min-w-0 truncate text-xs text-primary" title={download.href}>{download.href}</code>
                </div>
                <div className="flex shrink-0 gap-2">
                  <a href={download.href} className="inline-flex items-center justify-center whitespace-nowrap rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground">{download.action}</a>
                  <EndpointCopyButton path={download.href} />
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-12 grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-3xl border border-border bg-card/55 p-7">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-primary">CSV preview</p>
          <h2 className="mt-4 text-3xl font-medium tracking-tight">Designed to be easy to join.</h2>
          <p className="mt-4 text-sm leading-7 text-muted-foreground">
            No custom SDK. No dashboard lock-in. The CSV is one row per chain and observation date, with readable labels, continuous component scores and reproducibility metadata.
          </p>
          <div className="mt-6 overflow-x-auto rounded-3xl border border-border bg-background/60">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead className="border-b border-border text-xs uppercase tracking-[0.16em] text-primary">
                <tr>
                  <th className="px-4 py-3">Field</th>
                  <th className="px-4 py-3">Example</th>
                  <th className="px-4 py-3">Use</th>
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row) => (
                  <tr key={row.field} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-mono text-xs text-foreground">{row.field}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{row.example}</td>
                    <td className="px-4 py-3 text-muted-foreground">{row.use}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-card/55 p-7">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-primary">Runnable notebook</p>
          <h2 className="mt-4 text-3xl font-medium tracking-tight">Runs immediately, no local dataset required.</h2>
          <p className="mt-4 text-sm leading-7 text-muted-foreground">
            The starter notebook creates a small example table from the Urd Atlas date range, produces a grouped summary, then shows where to swap in a real CSV.
          </p>
          <pre className="mt-6 max-h-[520px] overflow-x-auto rounded-3xl border border-border bg-background p-6 text-sm leading-7 text-muted-foreground"><code>{notebook}</code></pre>
        </div>
      </section>

      <section className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {kitItems.map((item) => (
          <article key={item.title} className="min-w-0 rounded-3xl border border-border bg-card/55 p-6">
            <h2 className="text-2xl font-medium tracking-tight">{item.title}</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.body}</p>
            <p className="mt-5 break-all rounded-2xl border border-border bg-background/60 p-4 font-mono text-xs leading-6 text-primary">
              {item.example}
            </p>
          </article>
        ))}
      </section>

      <section className="mt-14 grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-3xl border border-border bg-card/55 p-7">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-primary">Example use case</p>
          <h2 className="mt-4 text-3xl font-medium tracking-tight">A simple diagnostic question.</h2>
          <dl className="mt-6 grid gap-4 text-sm leading-6">
            {activationExample.map((item) => (
              <div key={item.label} className="rounded-2xl border border-border bg-background/55 p-4">
                <dt className="font-mono text-xs uppercase tracking-[0.14em] text-primary">{item.label}</dt>
                <dd className="mt-2 text-muted-foreground">{item.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="rounded-3xl border border-border bg-card/55 p-7">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-primary">Boundary</p>
          <h2 className="mt-4 text-3xl font-medium tracking-tight">Accessible should not mean vague.</h2>
          <p className="mt-4 text-sm leading-7 text-muted-foreground">
            Analyst Kit packages deterministic network-state data into artifacts that help users write reports,
            annotate dashboards, investigate protocol activity and decide what to analyze next. The language should stay descriptive: context, not automated action.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/explorer" className="rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground">Open Explorer</Link>
            <Link href="/workflows" className="rounded-full border border-border px-5 py-3 text-sm font-medium">Move to technical workflows</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
