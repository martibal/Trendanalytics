// src/app/mobile/wiki/page.tsx
// Mobile wiki — searchable glossary of all blockchain and Urd Atlas terminology

import Link from "next/link";
import { MobileBottomNav } from "../page";
import MobileWikiClient from "@/components/mobile/MobileWikiClient";
import { WIKI_ENTRIES, WIKI_CATEGORIES } from "@/lib/mobile/wiki";

export default function MobileWikiPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#0A0E1A]">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-white/8 bg-[#0A0E1A]/95 backdrop-blur-sm px-4 pt-safe-top">
        <div className="py-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-400">
                Wiki
              </div>
              <div className="text-[13px] font-bold text-white mt-0.5">
                Terms & definitions
              </div>
            </div>
            <span className="text-[10px] text-slate-600">
              {WIKI_ENTRIES.length} entries
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1 pb-24">
        <MobileWikiClient entries={WIKI_ENTRIES} categories={WIKI_CATEGORIES} />

        {/* Desktop methodology link */}
        <div className="mx-4 mb-4 rounded-xl border border-cyan-500/15 bg-cyan-500/5 px-4 py-3 text-center">
          <div className="text-[11px] text-slate-400">
            Want formulas, thresholds, and full model docs?
          </div>
          <a
            href="https://urdatlas.com/methodology"
            className="mt-1 inline-block text-[12px] font-semibold text-cyan-400"
          >
            Full methodology → urdatlas.com/methodology
          </a>
        </div>
      </main>

      <MobileBottomNav active="wiki" />
    </div>
  );
}
