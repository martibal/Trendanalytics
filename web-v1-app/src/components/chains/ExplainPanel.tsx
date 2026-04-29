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
      return "border-[#7fb2e6] bg-[#d5e8f7]";
    case "success":
      return "border-emerald-300 bg-emerald-50";
    case "warning":
      return "border-amber-300 bg-amber-50";
    default:
      return "border-[#9db8d4] bg-[#dbeaf6]";
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
      )} p-4 shadow-[0_16px_32px_rgba(15,47,91,0.10)] transition`}
    >
      <summary className="cursor-pointer list-none select-none">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            {kicker ? (
              <div className="text-[11px] uppercase tracking-[0.16em] text-blue-700">
                {kicker}
              </div>
            ) : null}
            <div className="mt-1 text-sm font-semibold text-[#0a1d3a]">{title}</div>
            <div className="mt-2 text-sm leading-6 text-[#27476f]">{summary}</div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <span className="rounded-full border border-[#9db8d4] bg-[#eaf3fb] px-2.5 py-1 text-[11px] font-bold text-[#0d2447]">
              More
            </span>
            <span className="text-[#557099] transition group-open:rotate-180">▾</span>
          </div>
        </div>
      </summary>

      <div id={panelId} className="mt-4 border-t border-[#9db8d4] pt-4">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div className="text-xs uppercase tracking-[0.16em] text-[#557099]">
            Explanation mode
          </div>
          <div className="inline-flex rounded-full border border-[#9db8d4] bg-[#eaf3fb] p-1">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setMode("basic");
              }}
              className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                mode === "basic"
                  ? "bg-[#0d2447] text-white shadow-sm"
                  : "text-[#27476f] hover:text-[#0a1d3a]"
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
              className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                mode === "advanced"
                  ? "bg-[#0d2447] text-white shadow-sm"
                  : "text-[#27476f] hover:text-[#0a1d3a]"
              }`}
            >
              Advanced
            </button>
          </div>
        </div>

        <div className="space-y-4 text-sm leading-7 text-[#27476f]">
          {mode === "basic" ? basic : advanced}
        </div>

        {footer ? <div className="mt-4 border-t border-[#9db8d4] pt-4">{footer}</div> : null}
      </div>
    </details>
  );
}
