import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Workflows | Urd Atlas",
  description: "Concrete ways to use Urd Atlas in reporting, research, model monitoring and feature-store workflows.",
};

const paths = [
  {
    title: "No-pipeline analyst",
    body: "Start with CSV calendars, weekly summaries and the runnable notebook. Useful when the team needs a report, dashboard annotation or quick segmentation before building infrastructure.",
    cta: "Open Analyst Kit",
    href: "/analyst-kit",
  },
  {
    title: "Technical evaluator",
    body: "Inspect public endpoints, test the join in pandas, review validation diagnostics, then decide whether subscriber artifacts are worth integrating.",
    cta: "Open API Docs",
    href: "/api-docs",
  },
  {
    title: "Production data team",
    body: "Ingest daily network-state files into a warehouse, preserve methodology and availability metadata, and expose one shared feature table to analysts and systems.",
    cta: "Check validation",
    href: "/validation",
  },
] as const;

const workflows = [
  {
    title: "Report annotation",
    user: "Research analysts, protocol teams, newsletters and dashboard owners.",
    startsWith: "A weekly report explains usage, fees, capacity, support load or activity but lacks a consistent chain-context layer.",
    useUrd: "Use the weekly summary plus the regime calendar for the relevant chain.",
    doThis: "Copy the latest summary into the report, then add a small table showing the last 30 or 90 days by network state.",
    output: "A repeatable paragraph and table that separate project-specific observations from chain-wide conditions.",
    support: "Helps the reader understand whether the week looked unusual in the context of the chain itself.",
    firstArtifact: "Weekly summary text or Analyst Kit CSV.",
  },
  {
    title: "App metric segmentation",
    user: "Protocol, wallet, infra or analytics teams with daily app metrics.",
    startsWith: "The team sees a change in users, transactions, support tickets, latency, failure rate or other operational metrics.",
    useUrd: "Join the app metric table to Urd Atlas on observation date and chain.",
    doThis: "Gate rows by confidence, then compare the app metric across STABLE, HEATING, CONGESTED, CHEAP and UNKNOWN/DEGRADED periods.",
    output: "A metric-by-network-state table that can be pasted into a report or used as a dashboard control.",
    support: "Helps decide whether the next analysis should focus on app changes, chain conditions or data quality.",
    firstArtifact: "Regime calendar CSV or subscriber Meta file.",
  },
  {
    title: "Model monitoring",
    user: "Teams running activity, demand, capacity, quality or anomaly models on blockchain-related operational data.",
    startsWith: "Model error rises and the team cannot tell whether this is input drift, code regression, data delay or a network-state shift.",
    useUrd: "Attach regime, confidence, demand, friction and capacity scores to every model-output row.",
    doThis: "Compare error, bias, alert count and uncertainty by regime and confidence bucket.",
    output: "A monitoring view showing where model behavior changes under different network conditions.",
    support: "Helps set review thresholds, confidence gates, fallback behavior and retraining priorities.",
    firstArtifact: "Subscriber Meta and Derived files.",
  },
  {
    title: "Shared feature-store definition",
    user: "Teams using Snowflake, BigQuery, Databricks, dbt, Airflow, Dagster or a lightweight internal warehouse.",
    startsWith: "Each analyst defines high activity, stress or cheap network conditions differently.",
    useUrd: "Ingest the daily network-state schema with methodology version, determinism hash and freshness metadata.",
    doThis: "Publish one internal blockchain_network_state_daily table joined by date and chain.",
    output: "A shared feature used consistently across notebooks, BI, model validation and reports.",
    support: "Reduces duplicated definitions and makes downstream analysis easier to reproduce.",
    firstArtifact: "Subscriber file delivery through /api/v1/files.",
  },
] as const;

const implementationSteps = [
  "Pick the chain and observation grain used by your existing data.",
  "Join Urd Atlas on observation_date and chain.",
  "Apply a confidence or freshness gate before summarizing.",
  "Segment the metric that matters by regime or score band.",
  "Write down what changed in the interpretation after the join.",
] as const;

const code = `import pandas as pd

metrics = pd.read_csv("my_daily_app_metrics.csv")
urd = pd.read_csv("https://urdatlas.com/api/v1/analyst-kit/ethereum/regime-calendar")

joined = metrics.merge(
    urd[[
        "observation_date",
        "chain",
        "regime",
        "confidence_score",
        "demand_score",
        "friction_score",
        "capacity_score",
    ]],
    left_on=["date", "chain"],
    right_on=["observation_date", "chain"],
    how="left",
)

usable = joined[joined["confidence_score"] >= 0.70]

summary = (
    usable.groupby("regime")
    .agg(
        days=("date", "count"),
        avg_daily_active_users=("daily_active_users", "mean"),
        avg_support_tickets=("support_tickets", "mean"),
        avg_failure_rate=("failure_rate", "mean"),
        avg_demand_score=("demand_score", "mean"),
    )
    .sort_values("days", ascending=False)
)

print(summary)`;

export default function WorkflowsPage() {
  return (
    <main className="mx-auto max-w-7xl px-6 py-14 lg:px-8 lg:py-20">
      <section className="grid gap-10 lg:grid-cols-[1fr_0.8fr] lg:items-end">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-primary">Workflows</p>
          <h1 className="mt-5 text-5xl font-medium tracking-[-0.05em] sm:text-6xl">
            Turn network state into a useful control variable.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-muted-foreground">
            Urd Atlas creates value after it is joined to something the user already cares about: app metrics,
            monitoring output, research tables, dashboard annotations or a shared feature store.
          </p>
        </div>
        <div className="rounded-3xl border border-border bg-card/60 p-6">
          <p className="font-mono text-xs uppercase tracking-[0.16em] text-primary">Core pattern</p>
          <p className="mt-4 text-2xl font-medium tracking-tight">Join → gate → segment → explain.</p>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            The label is not the final product. The useful output is the change in interpretation after chain-wide network state is added to an existing workflow.
          </p>
        </div>
      </section>

      <section className="mt-12 grid gap-5 lg:grid-cols-3">
        {paths.map((path) => (
          <article key={path.title} className="rounded-3xl border border-border bg-card/55 p-6">
            <h2 className="text-2xl font-medium tracking-tight">{path.title}</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{path.body}</p>
            <Link href={path.href} className="mt-6 inline-flex rounded-full border border-border px-4 py-2 text-sm font-medium hover:bg-background">
              {path.cta}
            </Link>
          </article>
        ))}
      </section>

      <section className="mt-14 rounded-[2rem] border border-border bg-card p-7 lg:p-9">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-primary">Practical workflows</p>
            <h2 className="mt-3 text-3xl font-medium tracking-tight">What you do, what you get, and why it matters.</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
              Each workflow starts from data the user already has. Urd Atlas adds daily network-state context and confidence metadata.
            </p>
          </div>
          <Link href="/api-docs" className="inline-flex rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground">
            Integrate with API
          </Link>
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          {workflows.map((workflow) => (
            <article key={workflow.title} className="rounded-3xl border border-border bg-background/55 p-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <h3 className="text-2xl font-medium tracking-tight">{workflow.title}</h3>
                <span className="rounded-full border border-border px-3 py-1 font-mono text-[0.68rem] uppercase tracking-[0.14em] text-primary">
                  {workflow.firstArtifact}
                </span>
              </div>
              <dl className="mt-5 grid gap-4 text-sm leading-6">
                <div>
                  <dt className="font-mono text-xs uppercase tracking-[0.16em] text-primary">User</dt>
                  <dd className="mt-1 text-muted-foreground">{workflow.user}</dd>
                </div>
                <div>
                  <dt className="font-mono text-xs uppercase tracking-[0.16em] text-primary">Start point</dt>
                  <dd className="mt-1 text-muted-foreground">{workflow.startsWith}</dd>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <dt className="font-mono text-xs uppercase tracking-[0.16em] text-primary">Use Urd Atlas</dt>
                    <dd className="mt-1 text-muted-foreground">{workflow.useUrd}</dd>
                  </div>
                  <div>
                    <dt className="font-mono text-xs uppercase tracking-[0.16em] text-primary">Do this</dt>
                    <dd className="mt-1 text-muted-foreground">{workflow.doThis}</dd>
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <dt className="font-mono text-xs uppercase tracking-[0.16em] text-primary">Output</dt>
                    <dd className="mt-1 text-muted-foreground">{workflow.output}</dd>
                  </div>
                  <div>
                    <dt className="font-mono text-xs uppercase tracking-[0.16em] text-primary">Decision support</dt>
                    <dd className="mt-1 text-muted-foreground">{workflow.support}</dd>
                  </div>
                </div>
              </dl>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-14 grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-3xl border border-border bg-card/55 p-7">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-primary">Implementation pattern</p>
          <h2 className="mt-4 text-3xl font-medium tracking-tight">The useful join should be boring.</h2>
          <ol className="mt-6 space-y-4 text-sm leading-6 text-muted-foreground">
            {implementationSteps.map((step, index) => (
              <li key={step}>
                <strong className="text-foreground">{index + 1}.</strong> {step}
              </li>
            ))}
          </ol>
        </div>

        <pre className="overflow-x-auto rounded-3xl border border-border bg-background p-6 text-sm leading-7 text-muted-foreground"><code>{code}</code></pre>
      </section>

      <section className="mt-14 grid gap-8 lg:grid-cols-2">
        <div className="rounded-3xl border border-border bg-card/55 p-7">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-primary">What Urd Atlas is good for</p>
          <h2 className="mt-4 text-3xl font-medium tracking-tight">Research, reporting, monitoring and reproducibility.</h2>
          <p className="mt-4 text-sm leading-7 text-muted-foreground">
            The product is strongest when users need a consistent daily or weekly context layer that can be joined, audited and reused across teams.
            It is especially useful when the alternative is every analyst inventing a separate definition of chain conditions.
          </p>
        </div>
        <div className="rounded-3xl border border-border bg-card/55 p-7">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-primary">Product boundary</p>
          <h2 className="mt-4 text-3xl font-medium tracking-tight">Not a real-time instruction layer.</h2>
          <p className="mt-4 text-sm leading-7 text-muted-foreground">
            BTC and ETH are published at T+1. Base and Arbitrum are weekly. That makes Urd Atlas suitable for descriptive analysis,
            daily or weekly monitoring, report context and point-in-time diagnostics. It should not be treated as an automated instruction or a future-state guarantee.
          </p>
        </div>
      </section>

      <section className="mt-14 rounded-[2rem] border border-border bg-card p-8 lg:p-10">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-primary">Next step</p>
        <h2 className="mt-4 text-3xl font-medium tracking-tight">Start simple, then move deeper.</h2>
        <p className="mt-4 max-w-4xl text-muted-foreground leading-7">
          A new user should begin with Analyst Kit, validate the segmentation idea, then move to subscriber files or API integration when the workflow is proven.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link href="/analyst-kit" className="rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground">Use without a pipeline</Link>
          <Link href="/validation" className="rounded-full border border-border px-5 py-3 text-sm font-medium">Check validation</Link>
          <Link href="/api-docs" className="rounded-full border border-border px-5 py-3 text-sm font-medium">Open API docs</Link>
        </div>
      </section>
    </main>
  );
}
