import Link from "next/link";

const ATTRIBUTION_TEXT = "AWS Public Blockchain Data";
const SUPPORT_EMAIL = "support@urdatlas.com";

export default function SiteFooter() {
  return (
    <footer className="border-t border-border bg-card/40">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-4">
          <section>
            <div className="text-sm font-semibold text-foreground">Urd Atlas</div>
            <p className="mt-3 max-w-xs text-sm leading-6 text-muted-foreground">Descriptive on-chain regime context across Bitcoin, Ethereum, Arbitrum, and Base. No price. No forecasts. No recommendations.</p>
          </section>
          <section>
            <div className="text-sm font-semibold text-foreground">Trust</div>
            <div className="mt-3 flex flex-col gap-2 text-sm text-muted-foreground">
              <Link href="/methodology" className="transition hover:text-foreground">Methodology</Link>
              <Link href="/methodology/provenance" className="transition hover:text-foreground">Provenance & Revisions</Link>
              <Link href="/methodology/verification" className="transition hover:text-foreground">Verification Pack</Link>
              <Link href="/api-docs/samples" className="transition hover:text-foreground">Public Sample Pack</Link>
            </div>
          </section>
          <section>
            <div className="text-sm font-semibold text-foreground">Docs</div>
            <div className="mt-3 flex flex-col gap-2 text-sm text-muted-foreground">
              <Link href="/api-docs" className="transition hover:text-foreground">API Docs</Link>
              <Link href="/api-docs/schema" className="transition hover:text-foreground">Schema Reference</Link>
              <Link href="/api-docs/workflows" className="transition hover:text-foreground">Common Workflows</Link>
              <Link href="/status" className="transition hover:text-foreground">System Status</Link>
            </div>
          </section>
          <section>
            <div className="text-sm font-semibold text-foreground">Service</div>
            <div className="mt-3 flex flex-col gap-2 text-sm text-muted-foreground">
              <Link href="/service" className="transition hover:text-foreground">Service Expectations</Link>
              <Link href="/terms" className="transition hover:text-foreground">Terms</Link>
              <Link href="/privacy" className="transition hover:text-foreground">Privacy</Link>
              <a href={`mailto:${SUPPORT_EMAIL}`} className="transition hover:text-foreground">{SUPPORT_EMAIL}</a>
            </div>
          </section>
        </div>
        <div className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-border pt-4 text-xs text-muted-foreground">
          <span>Data attribution: {ATTRIBUTION_TEXT}</span>
          <span>·</span><Link href="/service" className="transition hover:text-foreground">Service policy</Link>
          <span>·</span><Link href="/methodology/provenance" className="transition hover:text-foreground">Provenance</Link>
          <span>·</span><Link href="/api-docs/samples" className="transition hover:text-foreground">Sample pack</Link>
          <span>·</span><Link href="/track-record" className="transition hover:text-foreground">Track Record</Link>
        </div>
      </div>
    </footer>
  );
}
