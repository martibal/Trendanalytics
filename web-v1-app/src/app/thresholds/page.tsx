// src/app/thresholds/page.tsx
import Link from "next/link";
import { readDatasetManifest, type DatasetManifest } from "@/lib/dataset";
import { currentDataSource } from "@/lib/storage";
import { type ThresholdControlValues } from "@/components/thresholds/ThresholdControls";
import ThresholdControlsClient from "@/components/thresholds/ThresholdControlsClient";

type ThresholdRow = {
  area: string;
  field: string;
  purpose: string;
  interpretation: string;
  notes: string;
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

function KeyValue({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <span className="font-medium text-foreground">{label}:</span> {value}
    </div>
  );
}

const DEFAULT_THRESHOLD_VALUES: ThresholdControlValues = {
  confidence_threshold: 0.4,
  min_persist_days: 3,
  high_pct: 80,
  high_z: 1.5,
  extreme_high_pct: 95,
  extreme_high_z: 2.5,
  low_pct: 20,
  low_z: -1.5,
  extreme_low_pct: 5,
  extreme_low_z: -2.5,
};

const THRESHOLD_ROWS: ThresholdRow[] = [
  {
    area: "Confidence",
    field: "confidence.confidence_score",
    purpose:
      "Communicate how strongly the published evidence supports the current daily state.",
    interpretation:
      "Higher values mean the visible state is supported by stronger published evidence. Lower values mean the state should be read with more caution. This is an evidence score for the current label, not a forecast and not the probability that the label will persist.",
    notes:
      "The canonical publish floor is 0.40. Values below that floor should be treated as UNKNOWN/DEGRADED rather than as a normal-confidence published state.",
  },
  {
    area: "Lag / staleness",
    field: "confidence.lag_days_vs_utc_today",
    purpose:
      "Show how delayed the published row is relative to the current UTC date.",
    interpretation:
      "Higher lag means the currently visible published artifact is older relative to today. Lag affects freshness interpretation, not the economic meaning of the row by itself.",
    notes:
      "Lag is chain-dependent. BTC and ETH are expected to be more current than Base and Arbitrum, so lag must be read against the relevant publication policy rather than as a universal threshold.",
  },
  {
    area: "Regime status",
    field: "status.label",
    purpose:
      "Express the currently published descriptive regime label in compact form.",
    interpretation:
      "Labels such as STABLE, HEATING, CONGESTED, CHEAP, and UNKNOWN/DEGRADED describe the currently published condition of the chain. They should always be read together with confidence, lag, scorecard, and drivers.",
    notes:
      "A regime label is not a trade signal, a return expectation, or a recommendation. It is a descriptive state classification built from published evidence.",
  },
  {
    area: "Scorecard dimensions",
    field: "scorecard.dimensions.*.score",
    purpose:
      "Summarize descriptive axis state such as demand, friction, and capacity.",
    interpretation:
      "These scores tell the user which parts of chain behavior currently look more notable relative to recent history. They are comparative descriptive scores inside the current methodology, not objective ratings of chain quality.",
    notes:
      "Dimension scores should remain traceable to published meta artifacts and visible methodology context. They are meant to explain the current state, not replace it with a hidden ranking model.",
  },
  {
    area: "Driver unusualness",
    field: "regime.drivers[].z_robust",
    purpose:
      "Describe how unusual a driver metric is relative to recent published history.",
    interpretation:
      "Larger absolute values mean the metric stands out more strongly versus its recent reference range. This helps explain why a driver is considered notable inside the current regime context.",
    notes:
      "Unusualness is descriptive historical context only. It does not imply that the condition will continue, mean-revert, or affect price in any specific way.",
  },
  {
    area: "Driver percentile",
    field: "regime.drivers[].pct_90d",
    purpose:
      "Show where the current metric sits inside a recent 90-day historical range.",
    interpretation:
      "A high percentile means the metric is near the top of its recent range. A low percentile means it is near the bottom. This helps users read position-in-range more intuitively than z-score alone.",
    notes:
      "Percentile is contextual. It should be read together with trend, z-score, momentum, and the current regime rather than as a standalone signal.",
  },
  {
    area: "Trend smoothing",
    field: "derived metric windows such as __ma7 and __ma30",
    purpose:
      "Show rolling descriptive smoothing of published base metrics.",
    interpretation:
      "These windows help the user compare the latest daily reading with shorter and longer rolling context. They are useful for distinguishing isolated daily moves from broader persistent changes.",
    notes:
      "Rolling averages are descriptive support fields only. They should not be presented as predictive indicators or used as hidden trading rules.",
  },
];

export default async function ThresholdsPage() {
  const dataset: DatasetManifest | null = await readDatasetManifest();

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Thresholds</h1>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
              This page explains the threshold-facing interpretation layer of the product.
              It is not a trading signal page or a forecast surface. Its job is to explain
              how threshold-like published values should be read inside a descriptive
              methodology, and to show a client-side preview for exploratory threshold
              adjustments without replacing the canonical product output.
            </p>
          </div>

          <div className="rounded-xl border px-4 py-3 text-sm">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              Published context
            </div>
            <div className="mt-1 font-medium text-foreground">
              Dataset: {dataset?.version ?? "—"}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              Methodology: {dataset?.methodology_version ?? "—"}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              Data source: {currentDataSource()}
            </div>
          </div>
        </div>
      </header>

      <div className="grid gap-6">
        <Section title="Interpretation boundary">
          <p>
            Threshold-like values in TrendAnalytics belong to a descriptive product, not
            to a signal engine. They help the user judge whether the currently published
            state looks normal, degraded, delayed, unusually strong, unusually weak, or
            confidence-limited within the context of the published methodology.
          </p>
          <p>
            The correct mental model is: thresholds on this page are
            <strong> explanatory boundaries</strong> and
            <strong> reading aids</strong>, not direct action triggers.
          </p>
        </Section>

        <Section title="How to read threshold-like values">
          <p>
            Start by asking three separate questions:
          </p>
          <ol className="list-decimal pl-5">
            <li>Is the published row current enough to trust from a freshness point of view?</li>
            <li>Is the published label supported strongly enough from a confidence point of view?</li>
            <li>Which scorecard axes and drivers are actually making the state look notable?</li>
          </ol>
          <p>
            This order matters because a number can be mathematically present but still
            deserve caution for freshness reasons, confidence reasons, or both.
          </p>
        </Section>

        <Section title="What this page covers">
          <p>
            The product exposes several published fields that function like interpretive
            thresholds or threshold-aware context, including confidence, lag, driver
            unusualness, percentile placement, and rolling trend comparisons.
          </p>
          <p>
            These fields matter because they determine how much interpretive weight a
            user should give to the visible state of the product at a given moment.
          </p>
        </Section>

        <Section title="Current published context">
          <div className="grid gap-2">
            <KeyValue label="Dataset version" value={dataset?.version ?? "—"} />
            <KeyValue label="Published at" value={dataset?.published_at ?? "—"} />
            <KeyValue label="Methodology version" value={dataset?.methodology_version ?? "—"} />
            <KeyValue label="Data source" value={currentDataSource()} />
          </div>
          <p>
            Threshold interpretation must remain version-aware. A threshold-facing
            explanation only makes sense when read in the context of the currently
            published methodology version and dataset state.
          </p>
        </Section>

        <ThresholdControlsClient initialValues={DEFAULT_THRESHOLD_VALUES} />

        <Section title="Why interactive preview is shown here">
          <p>
            The controls and preview are included to demonstrate how a future
            custom-threshold workflow can be exposed without overwriting the canonical
            public methodology.
          </p>
          <p>
            This client-side exploration layer is separate from the default published
            regime layer and should never silently replace canonical outputs.
          </p>
          <p>
            In other words: the controls are for understanding and exploration, not for
            redefining what the product officially published by default.
          </p>
        </Section>

        <section className="rounded-xl border">
          <div className="border-b px-4 py-3">
            <h2 className="text-lg font-semibold">Threshold-facing fields</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Summary of the main threshold-related published fields and how they should be read.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40 text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Area</th>
                  <th className="px-4 py-3">Field</th>
                  <th className="px-4 py-3">Purpose</th>
                  <th className="px-4 py-3">Interpretation</th>
                  <th className="px-4 py-3">Notes</th>
                </tr>
              </thead>
              <tbody>
                {THRESHOLD_ROWS.map((row) => (
                  <tr key={`${row.area}-${row.field}`} className="border-b last:border-b-0 align-top">
                    <td className="px-4 py-3 font-medium">{row.area}</td>
                    <td className="px-4 py-3">
                      <InlineCode>{row.field}</InlineCode>
                    </td>
                    <td className="px-4 py-3">{row.purpose}</td>
                    <td className="px-4 py-3">{row.interpretation}</td>
                    <td className="px-4 py-3">{row.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <Section title="The most important threshold on the site">
          <p>
            The most important threshold-facing number for interpretation is the
            canonical confidence floor:
            <strong> 0.40</strong>.
          </p>
          <p>
            Values below that floor should be read as
            <InlineCode> UNKNOWN/DEGRADED </InlineCode>
            rather than as an ordinary published state. Values from roughly 0.40 to 0.70
            still support a published label, but with more caution. Values above 0.70 mean
            the visible state has stronger support from the published evidence.
          </p>
          <p>
            This does <strong>not</strong> mean confidence is a probability forecast. It is
            an evidence-strength score for the current daily state.
          </p>
        </Section>

        <Section title="How threshold-like values should be used">
          <ul className="list-disc pl-5">
            <li>Use them to judge interpretive caution, not to generate trades.</li>
            <li>Read them together with freshness, regime label, scorecard, and drivers.</li>
            <li>Prefer traceability and context over single-field interpretation.</li>
            <li>Use chain history and Track Record for descriptive comparison across time.</li>
            <li>Use thresholds to understand why a state deserves caution, not to pretend the model is giving advice.</li>
          </ul>
        </Section>

        <Section title="What they should not be used for">
          <ul className="list-disc pl-5">
            <li>Not as automatic buy/sell triggers.</li>
            <li>Not as hidden portfolio rules.</li>
            <li>Not as predictive promises about future movement.</li>
            <li>Not as substitutes for published methodology context.</li>
            <li>Not as standalone numbers divorced from chain-specific freshness and evidence conditions.</li>
          </ul>
        </Section>

        <Section title="Relation to custom or user-adjusted thresholds">
          <p>
            The public thresholds page documents the product’s descriptive
            threshold-interpretation layer. Subscriber or experimental threshold controls,
            if exposed elsewhere in the product, must remain clearly separate from the
            canonical published methodology.
          </p>
          <p>
            User-adjusted or exploratory thresholds should never silently replace the
            default published interpretation surface without being explicitly marked as
            custom.
          </p>
        </Section>

        <Section title="Related pages">
          <ul className="list-disc pl-5">
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
              <Link href="/status" className="underline">
                /status
              </Link>
            </li>
            <li>
              <Link href="/chains" className="underline">
                /chains
              </Link>
            </li>
            <li>
              <Link href="/track-record" className="underline">
                /track-record
              </Link>
            </li>
            <li>
              <Link href="/api-docs" className="underline">
                /api-docs
              </Link>
            </li>
          </ul>
        </Section>

        <section className="rounded-xl border p-6 text-xs text-muted-foreground">
          <div className="font-medium text-foreground">Traceability</div>
          <p className="mt-2">
            This page is documentation for threshold-aware interpretation, not a hidden
            rules engine. It should remain aligned with the published methodology,
            status, chain surfaces, and API contract.
          </p>
          <p className="mt-2">
            Dataset context on this page is drawn from{" "}
            <InlineCode>/public/data/published/v1/dataset.json</InlineCode>.
          </p>
        </section>
      </div>
    </main>
  );
}
