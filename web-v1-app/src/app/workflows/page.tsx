import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Workflows | Urd Atlas",
  description: "Concrete ways to use Urd Atlas in model evaluation, monitoring, research, reporting and feature stores.",
};

const workflows = [
  {
    title: "Regime-conditioned model evaluation",
    user: "Quant researchers and data scientists with model outputs, signal returns or forecast errors.",
    problem: "A single aggregate metric hides when the model works and when it breaks.",
    fields: "regime, confidence_score, observation_date, chain, available_at, methodology_version",
    output: "MAE, hit rate, drawdown, IC, calibration or return split by network state.",
    decision: "Reduce trust, size exposure, retrain, or split the model when performance is regime-specific.",
  },
  {
    title: "Point-in-time backtesting",
    user: "Researchers validating daily or weekly crypto strategies without look-ahead leakage.",
    problem: "A row about July 10 cannot be used in a July 10 decision if it was published on July 11.",
    fields: "observation_date, available_at, chain, regime, confidence_score, vintage_id",
    output: "A backtest dataset that only sees rows that were available at the decision timestamp.",
    decision: "Use Urd Atlas as a filter, context variable or diagnostic layer without contaminating the test.",
  },
  {
    title: "Production model monitoring",
    user: "Teams running volatility, activity, liquidity, risk or anomaly models on blockchain-related data.",
    problem: "Model error rises and the team cannot tell whether this is data drift, code failure or a network-state shift.",
    fields: "regime, confidence_score, demand_score, friction_score, capacity_score",
    output: "Error, bias and uncertainty by network state.",
    decision: "Widen intervals, flag elevated uncertainty, trigger manual review or route to a regime-specific model.",
  },
  {
    title: "Research segmentation",
    user: "Analysts testing relationships between on-chain activity, protocol metrics, flows, volatility or returns.",
    problem: "A relationship may be weak in aggregate but meaningful under specific network conditions.",
    fields: "regime plus continuous demand, friction and capacity scores.",
    output: "Interaction terms, stratified samples and coefficient comparisons by state.",
    decision: "Separate general effects from effects that only appear during heating, congestion or cheap-network periods.",
  },
  {
    title: "Feature-store ingestion",
    user: "Teams with Snowflake, BigQuery, Databricks, dbt, Airflow, Dagster or a lightweight internal warehouse.",
    problem: "Every analyst invents a different definition of high activity, stress or cheap network conditions.",
    fields: "full daily network-state schema with methodology and determinism metadata.",
    output: "One shared blockchain_network_state_daily table.",
    decision: "Standardize the feature across notebooks, dashboards, validation reports and production models.",
  },
  {
    title: "Analyst reporting",
    user: "Research analysts, protocol teams, newsletters, small funds and dashboard owners without a full data pipeline.",
    problem: "Weekly reports spend too much time interpreting raw charts and too little time explaining what changed.",
    fields: "regime, confidence, drivers, transitions, 30/90/365-day regime calendar.",
    output: "Copyable summaries, charts and tables for reports or BI annotations.",
    decision: "Describe chain conditions consistently without presenting the label as a trading signal.",
  },
];

const code = `import pandas as pd

results = pd.read_csv("my_model_results.csv")
urd = pd.read_csv("urd_atlas_network_state_daily.csv")

research = results.merge(
    urd[["observation_date", "chain", "regime", "confidence_score"]],
    left_on=["date", "chain"],
    right_on=["observation_date", "chain"],
    how="left",
)

report = (
    research[research["confidence_score"] >= 0.70]
    .groupby("regime")
    .agg(
        observations=("error", "size"),
        mae=("absolute_error", "mean"),
        hit_rate=("is_correct", "mean"),
        avg_return=("strategy_return", "mean"),
    )
)

print(report)`;

export default function WorkflowsPage() {
  return (
    <main className="mx-auto max-w-7xl px-6 py-14 lg:px-8 lg:py-20">
      <section className="max-w-4xl">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-primary">Workflows</p>
        <h1 className="mt-5 text-5xl font-medium tracking-[-0.05em] sm:text-6xl">What customers should actually do with Urd Atlas.</h1>
        <p className="mt-6 text-lg leading-8 text-muted-foreground">
          Urd Atlas creates value when it enters an existing workflow: a model, a report, a dashboard, a research notebook or a feature table.
          The unit of value is not the label alone. It is the decision made after joining network state to other data.
        </p>
      </section>

      <section className="mt-12 grid gap-5 lg:grid-cols-2">
        {workflows.map((workflow) => (
          <article key={workflow.title} className="rounded-3xl border border-border bg-card/55 p-6">
            <h2 className="text-2xl font-medium tracking-tight">{workflow.title}</h2>
            <dl className="mt-5 space-y-4 text-sm leading-6">
              <div>
                <dt className="font-mono text-xs uppercase tracking-[0.16em] text-primary">User</dt>
                <dd className="mt-1 text-muted-foreground">{workflow.user}</dd>
              </div>
              <div>
                <dt className="font-mono text-xs uppercase tracking-[0.16em] text-primary">Problem</dt>
                <dd className="mt-1 text-muted-foreground">{workflow.problem}</dd>
              </div>
              <div>
                <dt className="font-mono text-xs uppercase tracking-[0.16em] text-primary">Fields used</dt>
                <dd className="mt-1 text-muted-foreground">{workflow.fields}</dd>
              </div>
              <div>
                <dt className="font-mono text-xs uppercase tracking-[0.16em] text-primary">Output</dt>
                <dd className="mt-1 text-muted-foreground">{workflow.output}</dd>
              </div>
              <div>
                <dt className="font-mono text-xs uppercase tracking-[0.16em] text-primary">Decision</dt>
                <dd className="mt-1 text-muted-foreground">{workflow.decision}</dd>
              </div>
            </dl>
          </article>
        ))}
      </section>

      <section className="mt-14 grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-3xl border border-border bg-card/55 p-7">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-primary">Canonical workflow</p>
          <h2 className="mt-4 text-3xl font-medium tracking-tight">Join, gate, segment, act.</h2>
          <ol className="mt-6 space-y-4 text-sm leading-6 text-muted-foreground">
            <li><strong className="text-foreground">Join:</strong> attach Urd Atlas to existing rows on date and chain.</li>
            <li><strong className="text-foreground">Gate:</strong> remove or down-weight rows where confidence or freshness is not good enough.</li>
            <li><strong className="text-foreground">Segment:</strong> calculate the metric that matters by regime or continuous score band.</li>
            <li><strong className="text-foreground">Act:</strong> change reporting, monitoring, model trust, research priority or exposure rules.</li>
          </ol>
        </div>

        <pre className="overflow-x-auto rounded-3xl border border-border bg-background p-6 text-sm leading-7 text-muted-foreground"><code>{code}</code></pre>
      </section>

      <section className="mt-14 rounded-[2rem] border border-border bg-card p-8">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-primary">Important limitation</p>
        <h2 className="mt-4 text-3xl font-medium tracking-tight">Urd Atlas should not be sold as an intraday trading signal.</h2>
        <p className="mt-4 max-w-3xl text-muted-foreground leading-7">
          BTC and ETH are published at T+1. Base and Arbitrum are weekly. That makes the product suitable for research,
          reporting, daily/weekly monitoring and point-in-time model diagnostics. It is not suitable for market making,
          latency-sensitive execution, short-horizon congestion response or guaranteed price prediction.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/analyst-kit" className="rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground">Use without a pipeline</Link>
          <Link href="/api-docs" className="rounded-full border border-border px-5 py-3 text-sm font-medium">Open API docs</Link>
        </div>
      </section>
    </main>
  );
}
