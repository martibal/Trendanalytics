// src/app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import Nav from "@/components/Nav";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Blockchain Trends (Price-Agnostic)",
  description: "Descriptive, price-agnostic blockchain analytics. No advice, no forecasts, no prices.",
};

function Footer() {
  return (
    <footer className="mt-12 border-t border-ui-border bg-ui-bg/40">
      <div className="mx-auto w-full max-w-6xl px-4 py-10">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <div className="text-sm font-semibold text-ui-text">Trend Context</div>
            <div className="text-xs text-ui-muted">Descriptive only · No prices · No forecasts · No advice</div>
            <div className="text-xs text-ui-faint">Audit signals: dataset_id · revision_id · as-of · lag · coverage</div>
          </div>

          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-xs text-ui-muted md:grid-cols-3">
            <Link className="underline underline-offset-4 hover:text-ui-text" href="/chains">
              Chains
            </Link>
            <Link className="underline underline-offset-4 hover:text-ui-text" href="/notables">
              Notables policy
            </Link>
            <Link className="underline underline-offset-4 hover:text-ui-text" href="/methodology">
              Methodology
            </Link>
            <Link className="underline underline-offset-4 hover:text-ui-text" href="/wiki">
              Wiki
            </Link>
            <Link className="underline underline-offset-4 hover:text-ui-text" href="/about">
              About / contract
            </Link>

            <Link className="underline underline-offset-4 hover:text-ui-text" href="/chains/bitcoin">
              Bitcoin
            </Link>
            <Link className="underline underline-offset-4 hover:text-ui-text" href="/chains/ethereum">
              Ethereum
            </Link>
            <Link className="underline underline-offset-4 hover:text-ui-text" href="/chains/arbitrum">
              Arbitrum
            </Link>
            <Link className="underline underline-offset-4 hover:text-ui-text" href="/chains/base">
              Base
            </Link>
          </div>
        </div>

        <div className="mt-8 text-[11px] text-ui-faint">
          Data is served from published artifacts under{" "}
          <span className="font-mono text-ui-muted">public/data/published/v1</span>.
        </div>

        {/* Web2: site-wide legal / disclaimer block (in-layout, no extra file required) */}
        <div className="mt-10 rounded-3xl border border-ui-border bg-ui-bg/30 p-6">
          <div className="text-[12px] font-semibold tracking-wide text-[rgb(var(--bad)/0.95)]">
            DESCRIPTIVE ANALYSIS ONLY
          </div>

          <p className="mt-3 text-sm text-ui-muted">
            This platform provides descriptive blockchain activity analysis. It does not provide financial advice,
            investment recommendations, or price predictions.
          </p>

          <p className="mt-3 text-sm text-ui-muted">
            All data represents historical observation of network conditions. Past conditions do not predict future
            behavior. Users are responsible for their own interpretation and decisions.
          </p>

          <div className="mt-4 text-xs">
            <Link className="underline underline-offset-4 text-ui-muted hover:text-ui-text" href="/about">
              View contract / terms context →
            </Link>
          </div>

          <div className="mt-4 rounded-2xl border border-ui-border bg-[rgb(var(--bad)/0.08)] px-4 py-3 text-[11px] text-ui-faint">
            Guardrails: no prices · no advice · no forecasts · missing values render as gaps (null), never zeros.
          </div>
        </div>
      </div>
    </footer>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      {/* Patch: use token-based body classes directly (equivalent to ui-bg/ui-text, but consistent with web2 usage elsewhere) */}
      <body className="min-h-screen bg-ui-bg text-ui-text antialiased">
        <Nav />
        <div className="mx-auto w-full max-w-6xl px-4 py-8">{children}</div>
        <Footer />
      </body>
    </html>
  );
}