import Link from "next/link";
import MobileBottomNav from "@/components/mobile/MobileBottomNav";
import MobileWikiClient from "@/components/mobile/MobileWikiClient";
import { WIKI_ENTRIES, WIKI_CATEGORIES } from "@/lib/mobile/wiki";

export default function MobileWikiPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#0A0E1A]">
      <header className="sticky top-0 z-10 border-b border-white/8 bg-[#0A0E1A]/95 px-4 pt-safe-top backdrop-blur-sm">
        <div className="py-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-400">Wiki</div>
              <div className="mt-0.5 text-[13px] font-bold text-white">Terms & definitions</div>
            </div>
            <span className="text-[10px] text-slate-600">{WIKI_ENTRIES.length} entries</span>
          </div>
        </div>
      </header>

      <main className="flex-1 pb-24">
        <div className="border-b border-white/5 px-4 py-3 text-[12px] leading-[1.7] text-slate-300">
          Use this as the mobile knowledge layer: terms, labels, confidence, scorecards,
          JSON field names, and core Urd Atlas concepts.
        </div>

        <MobileWikiClient entries={WIKI_ENTRIES} categories={WIKI_CATEGORIES} />

        <div className="mx-4 mb-4 rounded-xl border border-cyan-500/15 bg-cyan-500/5 px-4 py-3 text-center">
          <div className="text-[11px] text-slate-400">Want the compact model walkthrough too?</div>
          <Link href="/mobile/methodology" className="mt-1 inline-block text-[12px] font-semibold text-cyan-400">
            Open mobile methodology →
          </Link>
        </div>
      </main>

      <MobileBottomNav active="wiki" />
    </div>
  );
}
