// src/app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import Nav from "@/components/Nav";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Blockchain Trends (Price-Agnostic)",
  description: "Descriptive, price-agnostic blockchain analytics. No forecasts.",
};

function Footer() {
  return (
    <footer className="mt-12 border-t border-white/10 bg-black/20">
      <div className="mx-auto w-full max-w-6xl px-4 py-10">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <div className="text-sm font-semibold text-white">Trend Context</div>
            <div className="text-xs text-white/60">
              Descriptive only · No prices · No forecasts · No advice
            </div>
            <div className="text-xs text-white/50">
              Audit signals: dataset_id · revision_id · as-of · lag · coverage
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-xs text-white/70 md:grid-cols-3">
            <Link className="underline underline-offset-4 hover:text-white" href="/chains">
              Chains
            </Link>
            <Link className="underline underline-offset-4 hover:text-white" href="/notables">
              Notables policy
            </Link>
            <Link className="underline underline-offset-4 hover:text-white" href="/methodology">
              Methodology
            </Link>
            <Link className="underline underline-offset-4 hover:text-white" href="/wiki">
              Wiki
            </Link>
            <Link className="underline underline-offset-4 hover:text-white" href="/about">
              About / contract
            </Link>

            <Link className="underline underline-offset-4 hover:text-white" href="/chains/bitcoin">
              Bitcoin
            </Link>
            <Link className="underline underline-offset-4 hover:text-white" href="/chains/ethereum">
              Ethereum
            </Link>
            <Link className="underline underline-offset-4 hover:text-white" href="/chains/arbitrum">
              Arbitrum
            </Link>
            <Link className="underline underline-offset-4 hover:text-white" href="/chains/base">
              Base
            </Link>
          </div>
        </div>

        <div className="mt-8 text-[11px] text-white/45">
          Data is served from published artifacts under{" "}
          <span className="font-mono text-white/55">public/data/published/v1</span>.
        </div>
      </div>
    </footer>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-zinc-950 text-zinc-100 antialiased">
        <Nav />
        <div className="mx-auto w-full max-w-6xl px-4 py-8">{children}</div>
        <Footer />
      </body>
    </html>
  );
}