import Link from "next/link";

import MobileWikiClient from "@/components/mobile/MobileWikiClient";
import { MobileCard, MobilePage, MobileSection } from "@/components/mobile/MobileShell";
import { WIKI_CATEGORIES, WIKI_ENTRIES } from "@/lib/mobile/wiki";

export default function MobileWikiPage() {
  return (
    <MobilePage
      active="wiki"
      eyebrow="Mobile wiki"
      title={<>Terms, labels, confidence and JSON fields.</>}
      subtitle={
        <>
          A phone-sized lookup layer for the concepts used across Urd Atlas. Every link
          from this page stays inside the mobile surface.
        </>
      }
      backHref="/mobile"
    >
      <MobileSection>
        <MobileCard tone="blue">
          <div className="text-[13px] font-black text-white">
            {WIKI_ENTRIES.length} mobile-friendly entries
          </div>
          <p className="mt-2 text-[12px] leading-6 text-[#d7e8fb]">
            Use this when you need quick meaning rather than the full methodology.
            For process-level explanation, open the mobile methodology page.
          </p>
          <Link href="/mobile/methodology" className="mt-3 inline-block text-[12px] font-black text-[#f5d386] underline decoration-[#c49230]/35 underline-offset-4">
            Open methodology →
          </Link>
        </MobileCard>
      </MobileSection>

      <section className="-mx-4">
        <MobileWikiClient entries={WIKI_ENTRIES} categories={WIKI_CATEGORIES} />
      </section>
    </MobilePage>
  );
}
