// src/components/glossary/GlossaryEntry.tsx
import type { ReactNode } from "react";
import type { GlossaryEntry as GlossaryEntryType } from "@/data/glossary";
import MetricTooltip from "@/components/MetricTooltip";

function InlineCode({ children }: { children: ReactNode }) {
  return <code className="rounded bg-muted px-1 py-0.5">{children}</code>;
}

function categoryLabel(category: GlossaryEntryType["category"]): string {
  switch (category) {
    case "regime":
      return "Regime";
    case "confidence":
      return "Confidence";
    case "scorecard":
      return "Scorecard";
    case "drivers":
      return "Drivers";
    case "charts":
      return "Charts";
    case "freshness":
      return "Freshness";
    case "metadata":
      return "Metadata";
    default:
      return category;
  }
}

export type GlossaryEntryProps = {
  entry: GlossaryEntryType;
};

export default function GlossaryEntry({ entry }: GlossaryEntryProps) {
  return (
    <div className="rounded-xl border p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-medium">{entry.label}</h3>
          <div className="mt-1 text-xs text-muted-foreground">
            Key: <InlineCode>{entry.key}</InlineCode>
          </div>
        </div>

        <span className="rounded-full border px-2 py-1 text-xs text-muted-foreground">
          {categoryLabel(entry.category)}
        </span>
      </div>

      <div className="mt-4 grid gap-4 text-sm">
        <div>
          <div className="font-medium">Basic</div>
          <div className="mt-1 leading-6 text-muted-foreground">
            {entry.description.basic}
          </div>
        </div>

        <div>
          <div className="font-medium">Advanced</div>
          <div className="mt-1 leading-6 text-muted-foreground">
            {entry.description.advanced}
          </div>
        </div>

        <MetricTooltip
          title={entry.label}
          what={entry.description.basic}
          why={entry.description.advanced}
          units={entry.units}
          sourcePath={entry.sourcePath}
          fieldPath={entry.fieldPath}
        />

        <div className="grid gap-2 text-xs text-muted-foreground">
          {entry.units ? (
            <div>
              <span className="font-medium text-foreground">Units:</span>{" "}
              {entry.units}
            </div>
          ) : null}

          {entry.sourcePath ? (
            <div>
              <span className="font-medium text-foreground">Source path:</span>{" "}
              <InlineCode>{entry.sourcePath}</InlineCode>
            </div>
          ) : null}

          {entry.fieldPath ? (
            <div>
              <span className="font-medium text-foreground">Field path:</span>{" "}
              <InlineCode>{entry.fieldPath}</InlineCode>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}