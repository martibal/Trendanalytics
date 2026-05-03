import Link from "next/link";

const ATTRIBUTION_TEXT = "AWS Public Blockchain Data";
const SUPPORT_EMAIL = "support@urdatlas.com";

export default function SiteFooter() {
  return (
    <footer className="bg-[#031329]">
      <div className="mx-auto w-full px-6 py-12 sm:px-8 xl:px-12 2xl:px-16">
        <div className="grid gap-10 md:grid-cols-4">
          <section>
            <div className="text-xl font-semibold tracking-[-0.03em] text-white">Urd Atlas</div>
            <p className="mt-4 max-w-sm text-sm leading-7 text-slate-400">
              On-chain reference data for Bitcoin, Ethereum, Arbitrum, and Base.
              No price data. No forecasts. No recommendations.
            </p>
          </section>

          <section>
            <div className="text-sm font-semibold uppercase tracking-[0.16em] text-cyan-300/80">Trust</div>
            <div className="mt-4 flex flex-col gap-3 text-sm text-slate-400">
              <Link href="/about" className="transition hover:text-white">
                About
              </Link>
              <Link href="/methodology" className="transition hover:text-white">
                Methodology
              </Link>
              <Link href="/methodology/provenance" className="transition hover:text-white">
                Provenance & Revisions
              </Link>
              <Link href="/methodology/verification" className="transition hover:text-white">
                Verification Pack
              </Link>
              <Link href="/api-docs/samples" className="transition hover:text-white">
                Public Sample Pack
              </Link>
            </div>
          </section>

          <section>
            <div className="text-sm font-semibold uppercase tracking-[0.16em] text-cyan-300/80">Docs</div>
            <div className="mt-4 flex flex-col gap-3 text-sm text-slate-400">
              <Link href="/api-docs" className="transition hover:text-white">
                API Docs
              </Link>
              <Link href="/api-docs/schema" className="transition hover:text-white">
                Schema Reference
              </Link>
              <Link href="/api-docs/workflows" className="transition hover:text-white">
                Common Workflows
              </Link>
              <Link href="/status" className="transition hover:text-white">
                System Status
              </Link>
            </div>
          </section>

          <section>
            <div className="text-sm font-semibold uppercase tracking-[0.16em] text-cyan-300/80">Service</div>
            <div className="mt-4 flex flex-col gap-3 text-sm text-slate-400">
              <Link href="/service" className="transition hover:text-white">
                Service Expectations
              </Link>
              <Link href="/terms" className="transition hover:text-white">
                Terms
              </Link>
              <Link href="/privacy" className="transition hover:text-white">
                Privacy
              </Link>
              <a href={`mailto:${SUPPORT_EMAIL}`} className="transition hover:text-white">
                {SUPPORT_EMAIL}
              </a>
            </div>
          </section>
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-white/8 pt-5 text-xs text-slate-500">
          <span>Data attribution: {ATTRIBUTION_TEXT}</span>
          <span>·</span>
          <Link href="/service" className="transition hover:text-white">
            Service policy
          </Link>
          <span>·</span>
          <Link href="/methodology/provenance" className="transition hover:text-white">
            Provenance
          </Link>
          <span>·</span>
          <Link href="/api-docs/samples" className="transition hover:text-white">
            Sample pack
          </Link>
          <span>·</span>
          <Link href="/track-record" className="transition hover:text-white">
            Track Record
          </Link>
        </div>
      </div>
    </footer>
  );
}