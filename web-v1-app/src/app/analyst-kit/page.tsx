import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Analyst Kit | Urd Atlas",
  description: "Use Urd Atlas without a data pipeline through calendars, CSV exports, report snippets and notebooks.",
};

const kitItems = [
  {
    title: "Regime calendar",
    body: "A daily table of chain, observation date, regime, confidence, freshness and methodology version. This is the lowest-friction artifact for analysts and BI users.",
    example: "2026-07-01 · ethereum · HEATING · confidence 0.84",
  },
  {
    title: "Weekly network-state summary",
    body: "A structured written summary that explains what changed, whether the classification is strong enough to use, and which drivers supported the latest state.",
    example: "Ethereum moved from STABLE to HEATING during the latest published window.",
  },
  {
    title: "Chart pack",
    body: "Downloadable views for regime history, transition dates, confidence, demand/friction/capacity scores and distribution by state.",
    example: "Regime path · confidence line · transition markers · 30/90/365-day distribution",
  },
  {
    title: "Notebook starter",
    body: "A copy-run-adapt Python notebook for users who can code but do not have infrastructure. Load Urd Atlas, merge with a CSV, calculate metrics by regime, export tables.",
    example: "Open notebook → paste API key → choose chain → run all cells",
  },
  {
    title: "Google Sheets / Excel path",
    body: "A spreadsheet-oriented route for users who need charts and report tables before they need an API client or data warehouse integration.",
    example: "Raw data · Regime calendar · Charts · Notes · Report text",
  },
  {
    title: "Report snippets",
    body: "Copyable language for methodology, limitation notes and chain-state summaries so non-technical output does not overstate the product.",
    example: "Network state is descriptive context, not a buy/sell recommendation.",
  },
];

const notebook = `import pandas as pd

urd = pd.read_csv("urd_atlas_ethereum_daily.csv")
my_data = pd.read_csv("my_protocol_metrics.csv")

df = my_data.merge(
    urd[["observation_date", "chain", "regime", "confidence_score"]],
    left_on=["date", "chain"],
    right_on=["observation_date", "chain"],
    how="left",
)

summary = (
    df[df["confidence_score"] >= 0.70]
    .groupby("regime")
    .agg(
        days=("date", "count"),
        avg_users=("daily_active_users", "mean"),
        avg_volume=("volume_usd", "mean"),
    )
)

summary.to_csv("my_metrics_by_urd_regime.csv")`;

export default function AnalystKitPage() {
  return (
    <main className="mx-auto max-w-7xl px-6 py-14 lg:px-8 lg:py-20">
      <section className="grid gap-10 lg:grid-cols-[1fr_0.85fr] lg:items-end">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-primary">Analyst Kit</p>
          <h1 className="mt-5 text-5xl font-medium tracking-[-0.05em] sm:text-6xl">Use Urd Atlas before you have a pipeline.</h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-muted-foreground">
            The advanced product is an API and network-state feature layer. But many users need value earlier:
            a regime calendar, a chart, a weekly summary, a notebook or a table they can put into a report.
          </p>
        </div>
        <div className="rounded-3xl border border-border bg-card/60 p-6">
          <p className="font-mono text-xs uppercase tracking-[0.16em] text-primary">No-pipeline promise</p>
          <p className="mt-4 text-2xl font-medium tracking-tight">Read it, download it, then integrate it when the workflow is proven.</p>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            This page is the bridge between a technical data product and a customer who only knows they need better blockchain context.
          </p>
        </div>
      </section>

      <section className="mt-12 grid gap-5 lg:grid-cols-3">
        {kitItems.map((item) => (
          <article key={item.title} className="rounded-3xl border border-border bg-card/55 p-6">
            <h2 className="text-2xl font-medium tracking-tight">{item.title}</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.body}</p>
            <p className="mt-5 rounded-2xl border border-border bg-background/60 p-4 font-mono text-xs leading-6 text-primary">{item.example}</p>
          </article>
        ))}
      </section>

      <section className="mt-14 grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-3xl border border-border bg-card/55 p-7">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-primary">Example use case</p>
          <h2 className="mt-4 text-3xl font-medium tracking-tight">Did our protocol grow, or was the whole chain hot?</h2>
          <p className="mt-4 text-sm leading-7 text-muted-foreground">
            A protocol team can merge its own app metrics with the Urd Atlas regime calendar. If growth only occurs during chain-wide HEATING periods,
            the story is different than if growth appears during STABLE or CHEAP periods. This does not require a feature store. It requires one CSV join.
          </p>
          <ol className="mt-6 space-y-3 text-sm leading-6 text-muted-foreground">
            <li><strong className="text-foreground">1.</strong> Download chain regime calendar.</li>
            <li><strong className="text-foreground">2.</strong> Export app metrics from the tool already used by the team.</li>
            <li><strong className="text-foreground">3.</strong> Join on date and chain.</li>
            <li><strong className="text-foreground">4.</strong> Compare users, volume or fees by network state.</li>
          </ol>
        </div>

        <pre className="overflow-x-auto rounded-3xl border border-border bg-background p-6 text-sm leading-7 text-muted-foreground"><code>{notebook}</code></pre>
      </section>

      <section className="mt-14 rounded-[2rem] border border-border bg-card p-8 lg:p-10">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-primary">Product boundary</p>
        <h2 className="mt-4 text-3xl font-medium tracking-tight">The accessible version must still be rigorous.</h2>
        <p className="mt-4 max-w-4xl text-muted-foreground leading-7">
          Analyst Kit should not become retail trading content. It should package the same deterministic network-state data into artifacts that help users write reports,
          annotate dashboards, investigate protocol performance and decide what to analyze next. The language should stay descriptive: context, not recommendation.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link href="/explorer" className="rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground">Open Explorer</Link>
          <Link href="/workflows" className="rounded-full border border-border px-5 py-3 text-sm font-medium">Move to technical workflows</Link>
        </div>
      </section>
    </main>
  );
}
