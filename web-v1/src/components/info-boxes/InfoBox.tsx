"use client";

import { useUiStore } from "@/store/uiStore";

export function InfoBox({
  title,
  basic,
  advanced,
}: {
  title: string;
  basic: string;
  advanced: string;
}) {
  const mode = useUiStore((s) => s.explainMode);

  return (
    <div className="rounded-2xl border border-ui-border bg-ui-surface p-4 shadow-sm">
      <div className="text-sm font-semibold text-ui-text">{title}</div>
      <div className="mt-2 text-sm text-ui-muted">
        {mode === "basic" ? basic : advanced}
      </div>
    </div>
  );
}
