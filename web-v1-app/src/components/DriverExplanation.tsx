// src/components/DriverExplanation.tsx
"use client";

import MetricTooltip from "@/components/MetricTooltip";

type Props = {
  metric?: string;
  axis?: string;
  trend?: string;
  z?: number;
  percentile90d?: number;
  momentum?: number;
};

function InlineCode({ children }: { children: string }) {
  return <code className="rounded bg-muted px-1 py-0.5">{children}</code>;
}

function fmt(v?: number, digits = 3) {
  if (typeof v !== "number" || Number.isNaN(v)) return "—";
  return v.toFixed(digits);
}

function fmtPct(v?: number) {
  if (typeof v !== "number" || Number.isNaN(v)) return "—";
  return `${v.toFixed(1)}%`;
}

export default function DriverExplanation({
  metric,
  axis,
  trend,
  z,
  percentile90d,
  momentum,
}: Props) {
  return (
    <details className="rounded-lg border p-4 text-sm">
      <summary className="cursor-pointer select-none font-medium">
        Metric explanation
      </summary>

      <div className="mt-3 grid gap-3 text-muted-foreground leading-6">
        <div>
          <span className="font-medium text-foreground">Metric:</span>{" "}
          {metric ?? "—"}
        </div>

        <div>
          <span className="font-medium text-foreground">Axis:</span>{" "}
          {axis ?? "—"}
        </div>

        <div>
          <span className="font-medium text-foreground">Trend:</span>{" "}
          {trend ?? "—"}
        </div>

        <div>
          <span className="font-medium text-foreground">Robust z-score:</span>{" "}
          {fmt(z, 2)}
        </div>

        <div>
          <span className="font-medium text-foreground">90-day percentile:</span>{" "}
          {fmtPct(percentile90d)}
        </div>

        <div>
          <span className="font-medium text-foreground">
            Momentum (7d vs 30d):
          </span>{" "}
          {fmt(momentum, 3)}
        </div>

        <MetricTooltip
          title={metric ?? "Driver metric"}
          what={
            <>
              Published driver row from <InlineCode>regime.drivers[]</InlineCode>,
              used to explain why the current regime looks notable.
            </>
          }
          why={
            <>
              Drivers help connect the regime label to concrete metrics by showing
              which published fields are currently unusual, elevated, depressed,
              or changing relative to recent history.
            </>
          }
          how={
            <>
              This row is read directly from <InlineCode>meta/&lt;chain&gt;/latest.json</InlineCode>.
              The UI displays the published driver fields such as metric, axis, trend,
              robust z-score, percentile, and momentum without recomputing them.
            </>
          }
          sourcePath="/public/data/published/v1/meta/<chain>/latest.json"
          fieldPath="regime.drivers[]"
        />

        <div className="rounded-md border bg-muted/30 p-3 text-xs">
          <div className="font-medium text-foreground">Traceability</div>
          <ul className="mt-2 list-disc pl-5">
            <li>
              Source:{" "}
              <InlineCode>
                /public/data/published/v1/meta/&lt;chain&gt;/latest.json
              </InlineCode>
            </li>
            <li>
              Field: <InlineCode>regime.drivers[]</InlineCode>
            </li>
          </ul>
        </div>

        <div className="text-xs text-muted-foreground">
          This component describes published driver values only.
          It does not infer causes, provide forecasts, or suggest actions.
        </div>
      </div>
    </details>
  );
}