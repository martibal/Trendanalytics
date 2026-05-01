import Link from "next/link";
import MobileBottomNav from "@/components/mobile/MobileBottomNav";
import MobileWikiClient from "@/components/mobile/MobileWikiClient";
import { WIKI_ENTRIES, WIKI_CATEGORIES } from "@/lib/mobile/wiki";

export default function MobileWikiPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#0A0E1A]">
      <header className="sticky top-0 z-10 border-b border-white/8 bg-[#0A0E1A]/95 px-4 pt-safe-top backdrop-blur-sm">
        <div className="py-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-400">Wiki</div>
              <div className="mt-0.5 text-[13px] font-bold text-white">Terms, labels, confidence, and fields</div>
            </div>
            <Link href="/glossary?view=desktop" className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-semibold text-slate-200">Desktop</Link>
          </div>
          <div className="mt-2 text-[11px] text-slate-500">{WIKI_ENTRIES.length} mobile-friendly entries</div>
        </div>
      </header>

      <main className="flex-1 pb-24">
        <div className="border-b border-white/5 px-4 py-3 text-[12px] leading-[1.7] text-slate-300">
          Use this as the quick knowledge layer for mobile: labels, confidence, scorecards, JSON field names, and the core Urd Atlas concepts you need most often.
        </div>

        <MobileWikiClient entries={WIKI_ENTRIES} categories={WIKI_CATEGORIES} />

        <div className="mx-4 mb-4 rounded-2xl border border-cyan-500/15 bg-cyan-500/5 px-4 py-3 text-center">
          <div className="text-[11px] text-slate-400">Need the compact model walkthrough too?</div>
          <Link href="/mobile/methodology" className="mt-1 inline-block text-[12px] font-semibold text-cyan-400">Open mobile methodology →</Link>
        </div>
      </main>

      <MobileBottomNav active="wiki" />
    </div>
  );
}
