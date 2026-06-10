// src/app/api/v1/thresholds/defaults/route.ts
import { NextResponse } from "next/server";
import { enforcePreAuthRateLimit } from "@/lib/security/preAuthRateLimit";
import { readDatasetManifest } from "@/lib/dataset";

export const revalidate = 300;

type ThresholdDimensionDoc = {
  field: string;
  purpose: string;
  interpretation: string;
  notes: string;
};

type ThresholdGroup = {
  name: string;
  description: string;
  dimensions: ThresholdDimensionDoc[];
};

export async function GET(request: Request) {
  const preAuthRateLimit = await enforcePreAuthRateLimit(request, "public-read-api");

  if (!preAuthRateLimit.ok) {
    return preAuthRateLimit.response;
  }

  const dataset = await readDatasetManifest();

  const groups: ThresholdGroup[] = [
    {
      name: "confidence",
      description:
        "Descriptive confidence fields that communicate interpretive caution around the currently published state.",
      dimensions: [
        {
          field: "confidence.confidence_score",
          purpose: "Expose descriptive confidence in the current published output.",
          interpretation:
            "Higher values indicate stronger descriptive confidence in the currently published state. Lower values indicate more caution should be applied.",
          notes:
            "This is not a forward-looking estimate, not a probability of future price movement, and not an action cue.",
        },
        {
          field: "confidence.lag_days_vs_utc_today",
          purpose: "Expose publication lag relative to current UTC date.",
          interpretation:
            "Higher lag means the artifact is less current and should be read with stronger freshness caution.",
          notes:
            "Lag should be read together with chain-specific expected publication delay and public status surfaces.",
        },
      ],
    },
    {
      name: "regime",
      description:
        "Published descriptive state labels and adjacent context fields that help users interpret the visible regime state.",
      dimensions: [
        {
          field: "status.label",
          purpose: "Expose the current published regime or state label.",
          interpretation:
            "The label describes current published conditions, not an instruction or forward-looking claim.",
          notes:
            "Users are intended to read regime labels together with confidence, lag, scorecard, and drivers.",
        },
        {
          field: "status.one_liner",
          purpose: "Provide short descriptive context for the current published state.",
          interpretation:
            "This is explanatory product text that summarizes the visible state in plain language.",
          notes:
            "The one-liner remains descriptive and must stay non-instructive and non-normative.",
        },
      ],
    },
    {
      name: "scorecard",
      description:
        "Published dimension scores that summarize descriptive current-state conditions across major axes.",
      dimensions: [
        {
          field: "scorecard.dimensions.*.score",
          purpose: "Provide descriptive dimension-level score context.",
          interpretation:
            "Scores are intended to be read as current methodology-specific state summaries, not absolute rankings.",
          notes:
            "Dimension scores remain traceable to the published meta artifact and current methodology version.",
        },
        {
          field: "scorecard.dimensions.*.effective_confidence",
          purpose: "Show dimension-level confidence context where published.",
          interpretation:
            "Lower effective confidence indicates greater caution in reading that dimension's score.",
          notes:
            "This is interpretive metadata and not a future-outcome confidence statement.",
        },
      ],
    },
    {
      name: "drivers",
      description:
        "Published unusualness and context fields that explain why a current state may appear notable.",
      dimensions: [
        {
          field: "regime.drivers[].z_robust",
          purpose: "Describe how unusual a driver metric is relative to recent historical context.",
          interpretation:
            "Larger absolute values indicate stronger unusualness relative to the reference context.",
          notes:
            "Unusualness is descriptive historical context only and must not be treated as an action cue.",
        },
        {
          field: "regime.drivers[].pct_90d",
          purpose: "Describe relative placement versus a recent historical window.",
          interpretation:
            "Higher or lower percentile placement shows where the current metric sits relative to recent history.",
          notes:
            "Percentile position is contextual and is designed to be read together with other published fields.",
        },
        {
          field: "regime.drivers[].momentum_7d_vs_30d",
          purpose: "Expose descriptive short-vs-long movement context where published.",
          interpretation:
            "This helps users compare short-horizon movement to a longer context window.",
          notes:
            "This remains descriptive and must not be reframed as a forward-looking estimate.",
        },
      ],
    },
    {
      name: "derived_trend_windows",
      description:
        "Published moving-average style fields that support descriptive trend reading across fixed windows.",
      dimensions: [
        {
          field: "derived.<metric>__ma7",
          purpose: "Expose shorter smoothing of a published base metric.",
          interpretation:
            "MA7 helps the user compare the current raw value with a short smoothing window.",
          notes:
            "This is a descriptive support field, not an action indicator.",
        },
        {
          field: "derived.<metric>__ma30",
          purpose: "Expose longer smoothing of a published base metric.",
          interpretation:
            "MA30 helps the user compare shorter movement with a longer descriptive context.",
          notes:
            "This remains descriptive and methodology-bound.",
        },
      ],
    },
  ];

  return NextResponse.json(
    {
      ok: true,
      generated_at_utc: new Date().toISOString(),
      dataset: dataset
        ? {
            version: dataset.version ?? null,
            published_at: dataset.published_at ?? null,
            methodology_version: dataset.methodology_version ?? null,
          }
        : null,
      group_count: groups.length,
      thresholds: groups,
      traceability: {
        source_mode: "route_defined_defaults",
        canonical_contract: {
          descriptive_only: true,
          defaults_documentation_route: true,
          published_threshold_editor: false,
          runtime_repair: false,
        },
      },
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=300",
      },
    }
  );
}
