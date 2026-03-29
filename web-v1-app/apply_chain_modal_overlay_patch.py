from __future__ import annotations

import re
import sys
from pathlib import Path

EXPLAIN_MODAL_TSX = '''"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import type { ExplainContent } from "@/lib/chains/pageExplanations";

export default function ExplainModal({
  content,
  buttonLabel = "More",
  className,
}: {
  content: ExplainContent;
  buttonLabel?: string;
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<"Basic" | "Advanced">("Basic");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, mounted]);

  const active = mode === "Basic" ? content.basic : content.advanced;

  const modal = isOpen ? (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md md:p-8"
      role="dialog"
      aria-modal="true"
      aria-label={content.title}
      onClick={() => setIsOpen(false)}
    >
      <div
        className="relative w-full max-w-4xl overflow-hidden rounded-[28px] border border-cyan-400/20 bg-gradient-to-br from-slate-950 via-slate-950 to-slate-900 shadow-[0_36px_120px_-36px_rgba(6,182,212,0.28)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent" />
        <div className="p-6 md:p-8">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-200/85">
                Explanation
              </div>
              <div className="mt-2 text-2xl font-semibold tracking-tight text-white">
                {content.title}
              </div>
              {content.subtitle ? (
                <div className="mt-2 text-sm leading-6 text-slate-300">
                  {content.subtitle}
                </div>
              ) : null}
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-xl leading-none text-slate-200 transition-colors hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
              aria-label="Close explanation"
            >
              ×
            </button>
          </div>

          <div className="mt-6 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMode("Basic")}
              className={`rounded-full border px-3 py-1 text-sm font-medium transition-colors ${
                mode === "Basic"
                  ? "border-emerald-400/30 bg-emerald-400/12 text-emerald-100"
                  : "border-white/10 bg-white/[0.03] text-slate-300 hover:text-white"
              }`}
            >
              Basic
            </button>

            <button
              type="button"
              onClick={() => setMode("Advanced")}
              className={`rounded-full border px-3 py-1 text-sm font-medium transition-colors ${
                mode === "Advanced"
                  ? "border-cyan-400/30 bg-cyan-400/12 text-cyan-100"
                  : "border-white/10 bg-white/[0.03] text-slate-300 hover:text-white"
              }`}
            >
              Advanced
            </button>
          </div>

          <div className="mt-6 grid gap-5">
            <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/[0.05] p-5 text-sm leading-8 text-slate-100 md:p-6">
              <div className="space-y-4">{active}</div>
            </div>

            {content.traceability ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-sm leading-7 text-slate-300 md:p-6">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Traceability
                </div>
                <div className="mt-3 space-y-3">{content.traceability}</div>
              </div>
            ) : null}

            <div className="text-xs leading-6 text-slate-400">
              Descriptive only. Click outside the box or press Esc to close.
            </div>
          </div>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={[
          "inline-flex items-center rounded-full border border-cyan-400/25 bg-cyan-400/[0.06] px-3 py-1 text-xs font-medium text-cyan-100 transition-colors hover:border-cyan-300/40 hover:bg-cyan-400/[0.1]",
          className ?? "",
        ].join(" ")}
      >
        {buttonLabel}
      </button>

      {mounted ? createPortal(modal, document.body) : null}
    </>
  );
}
'''

HELPER = '''
function buildChartModalContent(
  metric: string,
  chainId: string,
  effectiveWindowDays: number,
  unitLabel?: string
) {
  const how = chartHowToReadExplanation(metric, effectiveWindowDays, unitLabel);
  const why = chartWhyShownExplanation(metric, chainId);

  return {
    title: `Chart guide — ${metric}`,
    subtitle: (
      <>
        Window <InlineCode>{String(effectiveWindowDays)}d</InlineCode> · Units{" "}
        <InlineCode>{unitLabel ?? "—"}</InlineCode>
      </>
    ),
    basic: (
      <>
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-200/85">
            How to read
          </div>
          <div className="mt-3 space-y-4">{how.basic}</div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-200/85">
            Why this chart is shown
          </div>
          <div className="mt-3 space-y-4">{why.basic}</div>
        </section>
      </>
    ),
    advanced: (
      <>
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-200/85">
            How to read
          </div>
          <div className="mt-3 space-y-4">{how.advanced}</div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-200/85">
            Why this chart is shown
          </div>
          <div className="mt-3 space-y-4">{why.advanced}</div>
        </section>
      </>
    ),
    traceability: (
      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            How to read traceability
          </div>
          <div className="mt-3 space-y-2">{how.traceability}</div>
        </div>
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            Why shown traceability
          </div>
          <div className="mt-3 space-y-2">{why.traceability}</div>
        </div>
      </div>
    ),
  };
}

'''

def patch_page(page_text: str):
    changes = []

    if "function buildChartModalContent(" not in page_text:
        marker = "export default async function ChainPage({"
        if marker not in page_text:
            raise RuntimeError("Could not find ChainPage export to insert chart modal helper.")
        page_text = page_text.replace(marker, HELPER + "\n" + marker, 1)
        changes.append("inserted buildChartModalContent helper")

    two_button_pattern = re.compile(
        r'<div className="flex flex-wrap gap-2">\s*'
        r'<ExplainModal content=\{chartHowToReadExplanation\(chart\.metric, effectiveWindowDays, chart\.unitLabel\)\} ?/>\s*'
        r'<ExplainModal content=\{chartWhyShownExplanation\(chart\.metric, chainId\)\} ?/>\s*'
        r'</div>',
        re.DOTALL,
    )

    replacement = '''<div className="flex flex-wrap gap-2">
                    <ExplainModal
                      content={buildChartModalContent(
                        chart.metric,
                        chainId,
                        effectiveWindowDays,
                        chart.unitLabel
                      )}
                    />
                  </div>'''

    if two_button_pattern.search(page_text):
        page_text = two_button_pattern.sub(replacement, page_text, count=1)
        changes.append("collapsed chart double-more buttons into one modal")
    else:
        changes.append("chart double-more pattern not found; left chart buttons unchanged")

    return page_text, changes

def main():
    root = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else Path.cwd().resolve()

    modal_path = root / "src" / "components" / "ExplainModal.tsx"
    page_path = root / "src" / "app" / "chains" / "[chain]" / "page.tsx"

    if not modal_path.exists():
        raise SystemExit(f"Missing file: {modal_path}")
    if not page_path.exists():
        raise SystemExit(f"Missing file: {page_path}")

    modal_path.write_text(EXPLAIN_MODAL_TSX, encoding="utf-8")

    page_text = page_path.read_text(encoding="utf-8")
    patched_page, changes = patch_page(page_text)
    page_path.write_text(patched_page, encoding="utf-8")

    print("Chain modal overlay patch applied.")
    print(f"  ExplainModal: {modal_path}")
    print(f"  Chain page:   {page_path}")
    for item in changes:
        print(f"  - {item}")

if __name__ == "__main__":
    main()
