"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useUiStore } from "@/store/uiStore";
import clsx from "clsx";

type ExplainMode = "basic" | "advanced";

export function AppShell({ children }: { children: React.ReactNode }) {
  const mode = useUiStore((s) => s.explainMode) as ExplainMode;
  const setMode = useUiStore((s) => s.setExplainMode);

  // Hydrate + persist in one place (source of truth)
  useEffect(() => {
    try {
      const v = window.localStorage.getItem("css_explain_mode");
      if (v === "basic" || v === "advanced") {
        setMode(v);
      }
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem("css_explain_mode", mode);
    } catch {
      // ignore
    }
  }, [mode]);

  return (
    <div className="min-h-screen">
      <header className="border-b border-zinc-800 bg-zinc-950/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-sm font-semibold tracking-tight">
              Blockchain Trends
            </Link>
            <nav className="hidden gap-3 text-sm text-zinc-300 sm:flex">
              <Link href="/methodology" className="hover:text-white">
                Methodology
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden text-xs text-zinc-400 sm:inline">Explain mode</span>
            <button
              className={clsx(
                "rounded-full border px-3 py-1 text-xs",
                mode === "basic"
                  ? "border-zinc-700 bg-zinc-900 text-zinc-100"
                  : "border-zinc-800 bg-transparent text-zinc-300 hover:bg-zinc-900/40"
              )}
              onClick={() => setMode("basic")}
              aria-pressed={mode === "basic"}
            >
              Basic
            </button>
            <button
              className={clsx(
                "rounded-full border px-3 py-1 text-xs",
                mode === "advanced"
                  ? "border-zinc-700 bg-zinc-900 text-zinc-100"
                  : "border-zinc-800 bg-transparent text-zinc-300 hover:bg-zinc-900/40"
              )}
              onClick={() => setMode("advanced")}
              aria-pressed={mode === "advanced"}
            >
              Advanced
            </button>
          </div>
        </div>
      </header>

      {children}

      <footer className="border-t border-zinc-800">
        <div className="mx-auto max-w-6xl px-4 py-6 text-xs text-zinc-500">
          Descriptive analytics only. No price data. No forecasts. No recommendations.
        </div>
      </footer>
    </div>
  );
}
