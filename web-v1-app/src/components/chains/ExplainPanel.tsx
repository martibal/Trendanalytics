"use client";

import { useId, useState, type ReactNode } from "react";

type ExplainPanelProps = {
  title: string;
  kicker?: string;
  summary: ReactNode;
  basic: ReactNode;
  advanced: ReactNode;
  defaultExpanded?: boolean;
  tone?: "default" | "primary" | "success" | "warning";
  footer?: ReactNode;
};

function toneClasses(tone: ExplainPanelProps["tone"]) {
  switch (tone) {
    case "primary":
      return "border-cyan-500/25 bg-cyan-500/5";
    case "success":
      return "border-emerald-500/25 bg-emerald-500/5";
    case "warning":
      return "border-yellow-500/25 bg-yellow-500/5";
    default:
      return "border-white/10 bg-white/[0.02]";
  }
}

export default function ExplainPanel({
  title,
  kicker,
  summary,
  basic,
  advanced,
  defaultExpanded = false,
  tone = "default",
  footer,
}: ExplainPanelProps) {
  const [mode, setMode] = useState<"basic" | "advanced">("basic");
  const panelId = useId();

  return (
    <details
      open={defaultExpanded}
      className={`group rounded-2xl border ${toneClasses(
        tone
      )} p-4 shadow-[0_8px_30px_rgba(0,0,0,0.18)] transition`}
    >
      <summary className="cursor-pointer list-none select-none">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            {kicker ? (
              <div className="text-[11px] uppercase tracking-[0.16em] text-blue-700/80">
                {kicker}
              </div>
            ) : null}
            <div className="mt-1 text-sm font-semibold text-[var(--urd-text-strong)]">{title}</div>
            <div className="mt-2 text-sm leading-6 text-[var(--urd-text-muted)]">{summary}</div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <span className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] text-[var(--urd-text-muted)]">
              More
            </span>
            <span className="text-slate-500 transition group-open:rotate-180">▾</span>
          </div>
        </div>
      </summary>

      <div id={panelId} className="mt-4 border-t border-white/10 pt-4">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div className="text-xs uppercase tracking-[0.16em] text-slate-400">
            Explanation mode
          </div>
          <div className="inline-flex rounded-full border border-white/10 bg-slate-950/60 p-1">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setMode("basic");
              }}
              className={`rounded-full px-3 py-1.5 text-xs transition ${
                mode === "basic"
                  ? "bg-white text-slate-950"
                  : "text-[var(--urd-text-muted)] hover:text-[var(--urd-text-strong)]"
              }`}
            >
              Basic
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setMode("advanced");
              }}
              className={`rounded-full px-3 py-1.5 text-xs transition ${
                mode === "advanced"
                  ? "bg-white text-slate-950"
                  : "text-[var(--urd-text-muted)] hover:text-[var(--urd-text-strong)]"
              }`}
            >
              Advanced
            </button>
          </div>
        </div>

        <div className="space-y-4 text-sm leading-7 text-[var(--urd-text-muted)]">
          {mode === "basic" ? basic : advanced}
        </div>

        {footer ? <div className="mt-4 border-t border-white/10 pt-4">{footer}</div> : null}
      </div>
    </details>
  );
}
