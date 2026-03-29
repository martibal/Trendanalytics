"use client";

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
