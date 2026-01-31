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
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
      <div className="text-sm font-semibold">{title}</div>
      <div className="mt-2 text-sm text-zinc-300">
        {mode === "basic" ? basic : advanced}
      </div>
    </div>
  );
}
