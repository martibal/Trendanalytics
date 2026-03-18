// src/components/site/SiteFooter.tsx
import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="mt-12 border-t border-border">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <div className="text-sm font-semibold text-foreground">TrendAnalytics</div>
            <p className="mt-2 text-xs leading-6 text-muted-foreground">
              Descriptive on-chain regime context. No price. No forecasts. No recommendations.
            </p>
          </div>

          <div>
            <div className="text-sm font-semibold text-foreground">Data</div>
            <div className="mt-3 flex flex-col gap-2 text-sm text-muted-foreground">
              <Link href="/status" className="hover:underline">
                System Status
              </Link>
              <Link href="/api-docs" className="hover:underline">
                API Docs
              </Link>
              <Link href="/track-record" className="hover:underline">
                Track Record
              </Link>
            </div>
          </div>

          <div>
            <div className="text-sm font-semibold text-foreground">Legal</div>
            <div className="mt-3 flex flex-col gap-2 text-sm text-muted-foreground">
              <Link href="/terms" className="hover:underline">
                Terms
              </Link>
              <Link href="/privacy" className="hover:underline">
                Privacy
              </Link>
              <Link href="/about" className="hover:underline">
                About
              </Link>
            </div>
          </div>

          <div>
            <div className="text-sm font-semibold text-foreground">Attribution</div>
            <div className="mt-3 flex flex-col gap-2 text-sm text-muted-foreground">
              <div>AWS Public Blockchain Data</div>
              <a
                href="mailto:contact@trendanalytics.invalid"
                className="hover:underline"
              >
                Contact
              </a>
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-border pt-4 text-xs text-muted-foreground">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span>Data attribution: AWS Public Blockchain Data</span>
            <span>·</span>
            <Link href="/status" className="hover:underline">
              System Status
            </Link>
            <span>·</span>
            <Link href="/terms" className="hover:underline">
              Terms
            </Link>
            <span>·</span>
            <Link href="/privacy" className="hover:underline">
              Privacy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}