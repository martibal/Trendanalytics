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
    purpose: "Communicate descriptive confidence in the published state.",
    interpretation:
      "Higher values indicate stronger descriptive confidence in the currently published state. Lower values should be read with greater caution.",
    notes:
      "Confidence is descriptive context, not a forecast and not a probability of future market behavior.",
  },
  {
    area: "Lag / staleness",
    field: "confidence.lag_days_vs_utc_today",
    purpose: "Show how delayed the published state is relative to current UTC date.",
    interpretation:
      "Higher lag means the published artifact is older relative to today and should be interpreted with more freshness caution.",
    notes:
      "Lag is chain-dependent and must be read together with expected publication delay and system status.",
  },
  {
    area: "Regime status",
    field: "status.label",
    purpose: "Express the currently published descriptive regime label.",
    interpretation:
      "Labels describe currently published conditions and should be understood in context of confidence, lag, scorecard, and drivers.",
    notes:
      "Labels are descriptive output categories, not trading signals or recommendations.",
  },
  {
    area: "Scorecard dimensions",
    field: "scorecard.dimensions.*.score",
    purpose: "Summarize descriptive axis state such as demand, friction, and capacity.",
    interpretation:
      "Scores are intended to show relative descriptive state inside the current methodology, not an objective market-quality ranking.",
    notes:
      "Dimension scores should remain traceable to published meta artifacts and visible methodology context.",
  },
  {
    area: "Driver unusualness",
    field: "regime.drivers[].z_robust",
    purpose: "Describe how unusual a driver metric is relative to recent published history.",
    interpretation:
      "Larger absolute values indicate stronger unusualness relative to the reference context used by the published artifact.",
    notes:
      "This is descriptive historical context. It does not imply that unusualness will continue or reverse.",
  },
  {
    area: "Driver percentile",
    field: "regime.drivers[].pct_90d",
    purpose: "Provide a descriptive percentile view versus a recent historical window.",
    interpretation:
      "Higher or lower percentile placement shows where the current metric sits relative to recent history.",
    notes:
      "Percentile positioning is contextual and should not be read as a signal by itself.",
  },
  {
    area: "Trend smoothing",
    field: "derived metric windows such as __ma7 and __ma30",
    purpose: "Show rolling descriptive smoothing of published base metrics.",
    interpretation:
      "These windows help the user compare current raw values with shorter and longer rolling context.",
    notes:
      "Rolling averages are descriptive support fields only and should not be presented as predictive indicators.",
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
              This page explains the threshold-facing interpretation layer of the product. It is not
              a trading signal page or forecast surface. It documents how threshold-like published
              values should be read within a descriptive methodology, and includes a client-side
              preview for exploratory threshold adjustments.
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
            Threshold-like values in TrendAnalytics are part of a descriptive product, not a signal
            engine. They help users understand whether the currently published state is stable,
            degraded, lagged, unusual, or confidence-limited within the context of published
            methodology.
          </p>
          <p>
            Thresholds on this page should be interpreted as explanatory boundaries and context
            markers rather than direct action triggers.
          </p>
        </Section>

        <Section title="What this page covers">
          <p>
            The product exposes several published fields that function like interpretive thresholds or
            threshold-aware context, including confidence, lag, driver unusualness, and rolling trend
            comparisons.
          </p>
          <p>
            These fields matter because they define how much descriptive weight a user should give to
            the visible state of the product.
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
            Threshold interpretation must remain version-aware. A threshold-facing explanation only
            makes sense when read in the context of the currently published methodology version.
          </p>
        </Section>

        <ThresholdControlsClient initialValues={DEFAULT_THRESHOLD_VALUES} />

        <Section title="Why interactive preview is shown here">
          <p>
            The controls and preview are included to demonstrate how a future custom-threshold
            workflow can be exposed without overwriting the canonical public methodology.
          </p>
          <p>
            This client-side exploration layer is separate from the default published regime layer
            and should never silently replace canonical outputs.
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

        <Section title="How threshold-like values should be used">
          <ul className="list-disc pl-5">
            <li>Use them to judge interpretive caution, not to generate trades.</li>
            <li>Read them together with freshness, regime label, scorecard, and drivers.</li>
            <li>Prefer traceability and context over single-field interpretation.</li>
            <li>Use chain history and track record for descriptive comparison across time.</li>
          </ul>
        </Section>

        <Section title="What they should not be used for">
          <ul className="list-disc pl-5">
            <li>Not as automatic buy/sell triggers.</li>
            <li>Not as hidden portfolio rules.</li>
            <li>Not as predictive promises about future movement.</li>
            <li>Not as substitutes for published methodology context.</li>
          </ul>
        </Section>

        <Section title="Relation to custom or user-adjusted thresholds">
          <p>
            The public thresholds page documents the product’s descriptive threshold interpretation
            layer. Subscriber or experimental threshold controls, if exposed elsewhere in the product,
            must remain clearly separate from the canonical published methodology.
          </p>
          <p>
            User-adjusted or exploratory thresholds should never silently replace the default
            published interpretation surface without being explicitly marked as custom.
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
            This page is documentation for threshold-aware interpretation, not a hidden rules engine.
            It should remain aligned with the published methodology, status, chain surfaces, and API
            contract.
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