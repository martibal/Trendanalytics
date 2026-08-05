import Link from "next/link";
import type { ReactNode } from "react";
import "server-only";

export const revalidate = 0;

function LegalCard({
  title,
  body,
  href,
  cta,
}: {
  title: string;
  body: string;
  href: string;
  cta: string;
}) {
  return (
    <article className="rounded-2xl border border-[var(--line)] bg-[var(--surface2)] p-6">
      <h2 className="ua-h3">{title}</h2>
      <p className="mt-3 text-sm leading-7 text-[var(--ink2)]">{body}</p>
      <Link href={href} className="text-link mt-5 inline-flex text-sm">
        {cta}
      </Link>
    </article>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-[var(--line)] pt-8 pb-6">
      <h2 className="ua-h3 mb-4">{title}</h2>
      <div className="max-w-3xl space-y-3 text-sm leading-7 text-[var(--ink2)]">{children}</div>
    </section>
  );
}

export default function LegalPage() {
  return (
    <main className="ua-page">
      <header className="hero border-b border-[var(--line)]">
        <div className="page-shell">
          <div className="eyebrow mb-4">Legal</div>
          <h1 className="ua-h1">Legal and product boundaries</h1>
          <p className="lead mt-4 max-w-2xl">
            Urd Atlas is descriptive network-state reference data. This page collects the legal documents and product boundaries that govern the public website, subscriber access, billing, and API delivery.
          </p>
          <div className="mt-6 flex flex-wrap gap-3 text-sm text-[var(--ink2)]">
            <span className="rounded-full border border-[var(--line)] px-3 py-1">No price data</span>
            <span className="rounded-full border border-[var(--line)] px-3 py-1">No forecasts</span>
            <span className="rounded-full border border-[var(--line)] px-3 py-1">No recommendations</span>
          </div>
        </div>
      </header>

      <div className="page-shell py-12">
        <div className="grid gap-5 md:grid-cols-2">
          <LegalCard
            title="Terms of Service"
            body="Rules for using the public website, subscriber dashboard, authenticated JSON delivery, subscriptions, account access, API keys, usage limits, and product disclaimers."
            href="/terms"
            cta="Read Terms →"
          />
          <LegalCard
            title="Privacy Policy"
            body="How account, billing, usage, API-key metadata, operational logs, support requests, and related service data may be processed."
            href="/privacy"
            cta="Read Privacy Policy →"
          />
        </div>

        <div className="mt-12" style={{ maxWidth: "760px" }}>
          <Section title="Operator">
            <p>Urd Atlas is operated by MARTIN BALSTAD, organisation number 937 581 254, Norway.</p>
            <p>Support, billing, cancellation, refund, privacy, and legal requests can be sent to <a href="mailto:support@urdatlas.com" className="text-link">support@urdatlas.com</a>.</p>
          </Section>

          <Section title="Product boundary">
            <p>Urd Atlas provides descriptive blockchain network-state reference data. It does not provide investment advice, trading advice, portfolio advice, forecasts, or recommendations.</p>
            <p>No label, score, driver list, chart, JSON file, API response, or written explanation should be interpreted as a suggestion to buy, sell, hold, rebalance, hedge, or take any financial action.</p>
          </Section>

          <Section title="Related pages">
            <p>For methodology and model-boundary context, see <Link href="/methodology" className="text-link">Methodology</Link>.</p>
            <p>For system freshness and delivery state, see <Link href="/status" className="text-link">System Status</Link>.</p>
            <p>For definitions used across the product, see <Link href="/glossary" className="text-link">Glossary</Link>.</p>
            <p>For API structure and delivery examples, see <Link href="/api-docs" className="text-link">API Docs</Link>.</p>
          </Section>
        </div>
      </div>
    </main>
  );
}
