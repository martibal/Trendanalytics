// src/components/DriverExplanation.tsx
"use client";

import MetricTooltip from "@/components/MetricTooltip";
import { METRIC_EXPLAINERS } from "@/lib/content/chainExplainers";

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
  const explainer = metric ? METRIC_EXPLAINERS[metric] : undefined;

  return (
    <details className="rounded-2xl border p-4 text-sm" open={false}>
      <summary className="cursor-pointer select-none font-medium">
        Metric explanation
      </summary>

      <div className="mt-4 grid gap-4 leading-6 text-muted-foreground">
        <div className="rounded-xl border bg-muted/10 p-4">
          <div className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
            This driver row, in plain English
          </div>
          <div className="mt-2">
            This row is one of the current published driver rows from <InlineCode>regime.drivers[]</InlineCode>.
            Driver rows are surfaced so the user can see which specific metrics are currently
            doing the most work in explaining the visible regime label.
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <span className="font-medium text-foreground">Metric:</span> {metric ?? "—"}
          </div>
          <div>
            <span className="font-medium text-foreground">Axis:</span> {axis ?? "—"}
          </div>
          <div>
            <span className="font-medium text-foreground">Trend:</span> {trend ?? "—"}
          </div>
          <div>
            <span className="font-medium text-foreground">Robust z-score:</span> {fmt(z, 2)}
          </div>
          <div>
            <span className="font-medium text-foreground">90-day percentile:</span> {fmtPct(percentile90d)}
          </div>
          <div>
            <span className="font-medium text-foreground">Momentum (7d vs 30d):</span> {fmt(momentum, 3)}
          </div>
        </div>

        <div className="rounded-xl border bg-muted/10 p-4">
          <div className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
            How to read the numbers
          </div>
          <div className="mt-2 grid gap-2">
            <div>
              <span className="font-medium text-foreground">Trend</span>: the page's short
              directional reading of this driver right now.
            </div>
            <div>
              <span className="font-medium text-foreground">Robust z-score</span>: how unusual
              the current reading looks relative to recent history.
            </div>
            <div>
              <span className="font-medium text-foreground">90-day percentile</span>: where the
              current reading sits inside its recent range.
            </div>
            <div>
              <span className="font-medium text-foreground">Momentum (7d vs 30d)</span>: whether
              the short-term signal is running above or below the broader recent baseline.
            </div>
          </div>
        </div>

        <MetricTooltip
          title={metric ?? "Driver metric"}
          what={
            explainer?.short ?? (
              <>
                Published driver row from <InlineCode>regime.drivers[]</InlineCode> used to explain
                why the current regime looks notable.
              </>
            )
          }
          why={
            <>
              Drivers exist so the regime label is not a black box. They expose which concrete
              published metrics are currently most unusual or most supportive of the visible state.
            </>
          }
          basic={
            explainer?.basic ?? (
              <>
                Think of a driver as the “because” behind the regime. The regime label is the
                summary; the driver row shows which concrete metric is currently helping justify
                that summary.
              </>
            )
          }
          advanced={
            explainer?.advanced ?? (
              <>
                This row is read from the published meta contract, not generated heuristically in
                the UI. The current page should explain that driver surfacing is selective: users
                are seeing the strongest surfaced driver rows, not a dump of every possible field.
              </>
            )
          }
          sourcePath="/api/v1/files/meta/<chain>/latest.json"
          fieldPath="regime.drivers[]"
        />

        <div className="rounded-xl border p-4 text-xs text-muted-foreground">
          <div className="font-medium text-foreground">Traceability</div>
          <ul className="mt-2 list-disc pl-5">
            <li>
              Source: <InlineCode>/api/v1/files/meta/&lt;chain&gt;/latest.json</InlineCode>
            </li>
            <li>
              Field: <InlineCode>regime.drivers[]</InlineCode>
            </li>
          </ul>
        </div>

        <div className="text-xs text-muted-foreground">
          This component explains published driver evidence only. It should not imply hidden causes,
          forecast future conditions, or recommend actions.
        </div>
      </div>
    </details>
  );
}
