"use client";

import { useEffect, useState, type ReactNode } from "react";

type Mode = "short" | "full";

function getInitialMode(pageKey: string): Mode {
  if (typeof window === "undefined") {
    return "short";
  }

  try {
    const saved = window.sessionStorage.getItem(`urdatlas:view:${pageKey}`);
    return saved === "full" ? "full" : "short";
  } catch {
    return "short";
  }
}

export default function ShortFullContent({
  pageKey,
  hint = "Short version first. Full version contains technical detail.",
  shortContent,
  fullContent,
}: {
  pageKey: string;
  shortTitle?: string;
  fullTitle?: string;
  summary: ReactNode;
  bullets?: ReactNode[];
  whyItMatters?: ReactNode;
  hint?: ReactNode;
  ctaLabel?: string;
  shortContent?: ReactNode;
  fullContent: ReactNode;
}) {
  const storageKey = `urdatlas:view:${pageKey}`;
  const [mode, setMode] = useState<Mode>(() => getInitialMode(pageKey));

  useEffect(() => {
    try {
      window.sessionStorage.setItem(storageKey, mode);
    } catch {
      // ignore session storage failures
    }
  }, [mode, storageKey]);

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm leading-7 text-slate-300">{hint}</div>

        <div className="inline-flex rounded-full border border-white/10 bg-black/20 p-1 text-xs">
          <button
            type="button"
            onClick={() => setMode("short")}
            aria-pressed={mode === "short"}
            className={`rounded-full px-3 py-1.5 font-medium transition ${
              mode === "short"
                ? "bg-cyan-400/15 text-cyan-100"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Short version
          </button>
          <button
            type="button"
            onClick={() => setMode("full")}
            aria-pressed={mode === "full"}
            className={`rounded-full px-3 py-1.5 font-medium transition ${
              mode === "full"
                ? "bg-cyan-400/15 text-cyan-100"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Full version
          </button>
        </div>
      </div>

      {mode === "short" ? (
        <section>{shortContent}</section>
      ) : (
        <section className="grid gap-6">
          <div className="flex justify-start">
            <button
              type="button"
              onClick={() => setMode("short")}
              className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/10"
            >
              Return to short version
            </button>
          </div>
          {fullContent}
        </section>
      )}
    </div>
  );
}