"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  heroFaqPrompt,
  heroPipelineBody,
  heroPipelineEyebrow,
  heroPipelinePoints,
  heroPipelineTitle,
  heroActionEyebrow,
  heroActionTitle,
  heroActionItems,
} from "@/lib/landing";

const PANEL_WIDTH = 232;
const GAP = 20;
const TOP = 72;

export function HeroSidePanels() {
  const [pos, setPos] = useState<{ leftPx: number; rightPx: number; fits: boolean } | null>(null);

  useEffect(() => {
    function measure() {
      const anchor = document.querySelector("[data-hero-anchor]");
      if (!anchor) return;
      const rect = (anchor as HTMLElement).getBoundingClientRect();
      const vw = window.innerWidth;
      const leftPanelLeft = rect.left - GAP - PANEL_WIDTH;
      const rightPanelLeft = rect.right + GAP;
      const fits = leftPanelLeft >= 8 && rightPanelLeft + PANEL_WIDTH <= vw - 8;
      setPos({ leftPx: leftPanelLeft, rightPx: rightPanelLeft, fits });
    }
    measure();
    window.addEventListener("resize", measure, { passive: true });
    return () => window.removeEventListener("resize", measure);
  }, []);

  if (!pos?.fits) return null;

  const panelBase: React.CSSProperties = {
    position: "fixed",
    top: TOP,
    width: PANEL_WIDTH,
    maxHeight: `calc(100vh - ${TOP + 16}px)`,
    overflowY: "auto",
    zIndex: 20,
  };

  return (
    <>
      {/* Left panel */}
      <div
        style={{ ...panelBase, left: pos.leftPx }}
        className="rounded-3xl border border-white/10 bg-[#07111f]/95 p-5 backdrop-blur-md"
      >
        <div className="text-[9px] font-bold uppercase tracking-[0.24em] text-cyan-600">
          {heroPipelineEyebrow}
        </div>
        <h2 className="mt-2 text-sm font-semibold leading-snug text-white">
          {heroPipelineTitle}
        </h2>
        <p className="mt-2 text-[11px] leading-[1.65] text-slate-300">{heroPipelineBody}</p>

        <div className="mt-4 space-y-2">
          {heroPipelinePoints.map((point) => (
            <div key={point.title} className="rounded-xl border border-white/6 bg-white/[0.03] px-3 py-2.5">
              <div className="text-[11px] font-semibold text-white">{point.title}</div>
              <div className="mt-1 text-[10px] leading-[1.55] text-slate-300">{point.body}</div>
            </div>
          ))}
        </div>

        <div className="mt-4 border-t border-white/6 pt-4 flex flex-wrap gap-3 text-xs">
          <Link href="#plans" className="text-cyan-400 hover:underline">See plans →</Link>
          <Link href="/methodology" className="text-slate-300 hover:text-cyan-400 transition-colors">Methodology →</Link>
        </div>
      </div>

      {/* Right panel */}
      <div
        style={{ ...panelBase, left: pos.rightPx }}
        className="rounded-3xl border border-white/10 bg-[#07111f]/95 p-5 backdrop-blur-md"
      >
        <div className="text-[9px] font-bold uppercase tracking-[0.24em] text-cyan-600">
          {heroActionEyebrow}
        </div>
        <h3 className="mt-2 text-sm font-semibold text-white">
          {heroActionTitle}
        </h3>

        <ul className="mt-3 divide-y divide-white/5">
          {heroActionItems.map((item, i) => (
            <li key={i} className="flex gap-2.5 py-2.5">
              <span className="mt-0.5 w-4 shrink-0 text-[9px] font-bold tabular-nums text-cyan-700">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="min-w-0">
                <div className="text-[11px] font-semibold text-white">{item.label}</div>
                <div className="mt-0.5 text-[10px] leading-[1.55] text-slate-300">{item.detail}</div>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-3 border-t border-white/6 pt-3 text-[10px] text-slate-400 leading-[1.6]">
          {heroFaqPrompt}{" "}
          <Link href="/faq" className="text-cyan-400 hover:underline">
            Read the Q&A →
          </Link>
        </div>
      </div>
    </>
  );
}
