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
  shortTitle = "Short version",
  fullTitle = "Full version",
  summary,
  bullets,
  whyItMatters,
  hint = "Short version first. Full version contains technical detail.",
  ctaLabel = "Read full version",
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
      <div className="rounded-3xl border border-cyan-400/18 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.08),transparent_42%)] p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200">
              {mode === "short" ? shortTitle : fullTitle}
            </div>
            <div className="mt-1 max-w-3xl text-sm leading-7 text-slate-300">{hint}</div>
          </div>

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
      </div>

      {mode === "short" ? (
        <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-white">{shortTitle}</h2>

          <div className="mt-3 max-w-4xl text-sm leading-7 text-slate-200">{summary}</div>

          {bullets && bullets.length > 0 ? (
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-7 text-slate-300">
              {bullets.map((bullet, idx) => (
                <li key={idx}>{bullet}</li>
              ))}
            </ul>
          ) : null}

          {shortContent ? <div className="mt-5">{shortContent}</div> : null}

          {whyItMatters ? (
            <div className="mt-5 rounded-2xl border border-cyan-400/18 bg-cyan-400/5 p-4 text-sm leading-7 text-slate-200">
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-200">
                Why this matters
              </div>
              <div className="mt-2">{whyItMatters}</div>
            </div>
          ) : null}

          <div className="mt-5">
            <button
              type="button"
              onClick={() => setMode("full")}
              className="inline-flex items-center rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm font-medium text-cyan-100 transition hover:bg-cyan-400/15"
            >
              {ctaLabel}
            </button>
          </div>
        </section>
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