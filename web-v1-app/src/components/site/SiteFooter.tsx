import Link from "next/link";

const ATTRIBUTION_TEXT = "AWS Public Blockchain Data";

export default function SiteFooter() {
  return (
    <footer className="border-t border-border bg-card/40">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-4">
          <section>
            <div className="text-sm font-semibold text-foreground">Urd Atlas</div>
            <p className="mt-3 max-w-xs text-sm leading-6 text-muted-foreground">
              Descriptive on-chain regime context across Bitcoin, Ethereum, Arbitrum, and Base. No
              price. No forecasts. No recommendations.
            </p>
          </section>

          <section>
            <div className="text-sm font-semibold text-foreground">Data</div>
            <div className="mt-3 flex flex-col gap-2 text-sm text-muted-foreground">
              <Link href="/status" className="transition hover:text-foreground">
                System Status
              </Link>
              <Link href="/api-docs" className="transition hover:text-foreground">
                API Docs
              </Link>
              <Link href="/track-record" className="transition hover:text-foreground">
                Track Record
              </Link>
            </div>
          </section>

          <section>
            <div className="text-sm font-semibold text-foreground">Legal</div>
            <div className="mt-3 flex flex-col gap-2 text-sm text-muted-foreground">
              <Link href="/terms" className="transition hover:text-foreground">
                Terms
              </Link>
              <Link href="/privacy" className="transition hover:text-foreground">
                Privacy
              </Link>
              <Link href="/about" className="transition hover:text-foreground">
                About
              </Link>
              <Link href="/faq" className="transition hover:text-foreground">
                Q&A
              </Link>
            </div>
          </section>

          <section>
            <div className="text-sm font-semibold text-foreground">Attribution</div>
            <div className="mt-3 flex flex-col gap-2 text-sm text-muted-foreground">
              <div>{ATTRIBUTION_TEXT}</div>
              <a href="mailto:contact@urdatlas.com" className="transition hover:text-foreground">
                Contact
              </a>
            </div>
          </section>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-border pt-4 text-xs text-muted-foreground">
          <span>Data attribution: {ATTRIBUTION_TEXT}</span>
          <span>·</span>
          <Link href="/status" className="transition hover:text-foreground">
            System Status
          </Link>
          <span>·</span>
          <Link href="/api-docs" className="transition hover:text-foreground">
            API Docs
          </Link>
          <span>·</span>
          <Link href="/track-record" className="transition hover:text-foreground">
            Track Record
          </Link>
          <span>·</span>
          <Link href="/faq" className="transition hover:text-foreground">
            Q&A
          </Link>
          <span>·</span>
          <Link href="/terms" className="transition hover:text-foreground">
            Terms
          </Link>
          <span>·</span>
          <Link href="/privacy" className="transition hover:text-foreground">
            Privacy
          </Link>
        </div>
      </div>
    </footer>
  );
}
