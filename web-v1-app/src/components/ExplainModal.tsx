"use client";

import { useEffect, useState } from "react";

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

  useEffect(() => {
    if (!isOpen) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen]);

  const active = mode === "Basic" ? content.basic : content.advanced;

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={[
          "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground",
          className ?? "",
        ].join(" ")}
      >
        {buttonLabel}
      </button>

      {isOpen ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={content.title}
          onClick={() => setIsOpen(false)}
        >
          <div
            className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border bg-background p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xl font-semibold text-foreground">
                  {content.title}
                </div>
                {content.subtitle ? (
                  <div className="mt-1 text-sm text-muted-foreground">
                    {content.subtitle}
                  </div>
                ) : null}
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border text-lg leading-none text-muted-foreground transition-colors hover:text-foreground"
                aria-label="Close explanation"
              >
                ×
              </button>
            </div>

            <div className="mt-5 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMode("Basic")}
                className={`rounded-full border px-3 py-1 text-sm font-medium transition-colors ${
                  mode === "Basic"
                    ? "border-foreground bg-foreground text-background"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                Basic
              </button>

              <button
                type="button"
                onClick={() => setMode("Advanced")}
                className={`rounded-full border px-3 py-1 text-sm font-medium transition-colors ${
                  mode === "Advanced"
                    ? "border-foreground bg-foreground text-background"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                Advanced
              </button>
            </div>

            <div className="mt-6 space-y-4 text-sm leading-7 text-muted-foreground">
              {active}
            </div>

            {content.traceability ? (
              <div className="mt-6 rounded-xl border bg-muted/20 p-4 text-xs text-muted-foreground">
                <div className="font-medium text-foreground">Traceability</div>
                <div className="mt-2 space-y-2">{content.traceability}</div>
              </div>
            ) : null}

            <div className="mt-6 text-xs text-muted-foreground">
              Descriptive only. This explanation is for interpretation and
              traceability, not for forecasting or recommendations.
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
