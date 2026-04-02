"use client";

import { useState } from "react";
import { jsonExamples, type JsonExampleKey } from "@/lib/landing";

type ConfidenceLevel = "good" | "degraded";
type Layer = "gold" | "meta" | "derived";

function confidenceButtonClass(active: boolean, tone: ConfidenceLevel) {
  if (tone === "good") {
    return active
      ? "rounded-full border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-200"
      : "rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-400 hover:text-slate-200";
  }

  return active
    ? "rounded-full border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-200"
    : "rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-400 hover:text-slate-200";
}

export default function JsonExampleViewer() {
  const [confidence, setConfidence] = useState<ConfidenceLevel>("good");
  const [layer, setLayer] = useState<Layer>("meta");

  const resetToDefault = () => {
    setConfidence("good");
    setLayer("meta");
  };

  const key = `${layer}-${confidence}` as JsonExampleKey;
  const example = jsonExamples[key];

  return (
    <>
      <a
        href="#json-example-modal"
        onClick={resetToDefault}
        className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-white/10"
      >
        View actual published JSON examples →
      </a>

      <div id="json-example-modal" className="ta-modal fixed inset-0 z-[80] items-center justify-center p-4">
        <a
          href="#"
          className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
          aria-label="Close"
        />

        <div className="relative z-10 flex max-h-[88vh] w-full max-w-3xl flex-col rounded-3xl border border-cyan-500/20 bg-[#071322] shadow-2xl shadow-cyan-950/40">
          <div className="flex shrink-0 items-start justify-between gap-4 border-b border-white/8 px-6 py-5">
            <div>
              <h3 className="text-xl font-semibold text-white">Actual published JSON examples</h3>
              <p className="mt-1 text-sm text-slate-400">
                Real historical data from the published artifact store. Not fabricated.
              </p>
            </div>
            <a
              href="#"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-lg text-slate-200 hover:bg-white/10"
              aria-label="Close"
            >
              ×
            </a>
          </div>

          <div className="shrink-0 space-y-4 border-b border-white/8 px-6 py-4">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setConfidence("good")}
                className={confidenceButtonClass(confidence === "good", "good")}
              >
                ● Good confidence
              </button>
              <button
                type="button"
                onClick={() => setConfidence("degraded")}
                className={confidenceButtonClass(confidence === "degraded", "degraded")}
              >
                ○ Degraded confidence
              </button>
            </div>

            <div className="flex gap-1 rounded-xl border border-white/8 bg-white/3 p-1 w-fit">
              {(["gold", "meta", "derived"] as Layer[]).map((candidate) => (
                <button
                  key={candidate}
                  type="button"
                  onClick={() => setLayer(candidate)}
                  className={
                    layer === candidate
                      ? "rounded-lg px-4 py-1.5 text-xs font-medium bg-white/10 text-white"
                      : "rounded-lg px-4 py-1.5 text-xs text-slate-400 hover:text-slate-200"
                  }
                >
                  {candidate.charAt(0).toUpperCase() + candidate.slice(1)}
                </button>
              ))}
            </div>

            <div className="text-xs text-slate-400 border-b border-white/8 pb-3 mb-4">
              Actual published data
              <span className="mx-2 text-slate-600">·</span>
              {example.chain.charAt(0).toUpperCase() + example.chain.slice(1)}
              <span className="mx-2 text-slate-600">·</span>
              {example.date}
            </div>
          </div>

          <div className="shrink-0 px-6 pt-4">
            <div className="rounded-2xl border border-white/8 bg-white/3 px-4 py-3 text-xs leading-6 text-slate-300 mb-4">
              {example.explanation}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-6 pt-4">
            <pre className="rounded-2xl bg-black/40 p-5 text-xs leading-6 text-slate-200 overflow-x-auto max-h-96 overflow-y-auto">
              <code>{example.data}</code>
            </pre>
          </div>
        </div>
      </div>
    </>
  );
}
