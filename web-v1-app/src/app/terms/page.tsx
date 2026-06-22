// src/app/terms/page.tsx
import Link from "next/link";
import type { ReactNode } from "react";
import "server-only";

export const revalidate = 0;

function InlineCode({ children }: { children: string }) {
  return <code className="code-block inline-block px-2 py-0.5 text-[12px]">{children}</code>;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-[var(--line)] pt-8 pb-6">
      <h2 className="ua-h3 mb-4">{title}</h2>
      <div className="space-y-3 text-sm leading-7 text-[var(--ink2)] max-w-3xl">{children}</div>
    </section>
  );
}

export default function TermsPage() {
  return (
    <main className="ua-page">

      <header className="hero border-b border-[var(--line)]">
        <div className="page-shell">
          <div className="eyebrow mb-4">Terms of Service</div>
          <h1 className="ua-h1">Terms of Service</h1>
          <p className="lead mt-4 max-w-2xl">
            These Terms govern access to the Urd Atlas public website, subscriber dashboard,
            and authenticated JSON delivery API.
          </p>
          <div className="mt-6 grid gap-3 max-w-lg">
            {[
              "The product is descriptive on-chain context, not financial advice or a trading signal service.",
              "Plans, access scope, and API-key usage are governed by subscription entitlements.",
              "The full legal text is below for precise rights, restrictions, and disclaimers.",
            ].map((point, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="font-mono text-[11px] text-[var(--gold)] mt-0.5 flex-shrink-0">{i + 1}.</span>
                <span className="text-sm text-[var(--ink2)]">{point}</span>
              </div>
            ))}
          </div>
        </div>
      </header>

      <div className="page-shell py-12">
        <div style={{ maxWidth: "760px" }}>

          <Section title="1. Service Description">
            <p>Urd Atlas is a descriptive on-chain analytics product. It provides a public, read-only website, a subscriber dashboard, and authenticated JSON file delivery for published data artifacts.</p>
            <p>The service presents on-chain reference data, including regime context, confidence, drivers, rolling trend views, freshness context, and related explanatory material based on published blockchain data artifacts.</p>
          </Section>

          <Section title="2. No Investment Advice">
            <p>Urd Atlas is strictly descriptive. It does not provide investment advice, trading advice, portfolio advice, forecasts, or recommendations.</p>
            <p>No page, API route, chart, glossary entry, methodology section, downloadable file, JSON response, score, label, or driver list should be interpreted as a suggestion to buy, sell, hold, rebalance, hedge, or take any financial action.</p>
          </Section>

          <Section title="3. Public Content and Subscriber Content">
            <p>Public pages, including <InlineCode>/</InlineCode>, <InlineCode>/chains</InlineCode>, <InlineCode>/glossary</InlineCode>, <InlineCode>/track-record</InlineCode>, <InlineCode>/thresholds</InlineCode>, <InlineCode>/about</InlineCode>, <InlineCode>/api-docs</InlineCode>, <InlineCode>/status</InlineCode>, <InlineCode>/terms</InlineCode>, and <InlineCode>/privacy</InlineCode>, are intended to be accessible without forced login.</p>
            <p>Subscriber-only features, including dashboard access, API keys, authenticated file downloads, and any data beyond the public surface, require a valid account and an active entitlement.</p>
          </Section>

          <Section title="4. Account, Billing, and Access">
            <p>Subscriber access is governed by the active subscription plan and associated entitlement scope, including chain access, data genre, window depth, and historical depth where applicable.</p>
            <p>Access may be suspended, limited, or revoked if a subscription expires, a payment fails, an entitlement changes, a key is revoked, or the service detects misuse or abuse of authenticated endpoints.</p>
            <p>Stripe is used for checkout, payment processing, subscription management, invoices, refunds where approved, and related billing workflows. Urd Atlas does not store or process card details directly.</p>
          </Section>

          <Section title="5. Subscription Renewal, Cancellation, and Refunds">
            <p>Paid subscriptions renew automatically at the billing interval and price shown at checkout, in Stripe, or in the subscriber account flow unless the subscription is cancelled before the next renewal date.</p>
            <p>You may cancel through the available account or Stripe customer-portal flow where provided, or by contacting <a href="mailto:support@urdatlas.com" className="text-link">support@urdatlas.com</a>. Cancellation requests should be submitted before the next renewal date to avoid the next billing period being charged.</p>
            <p>If cancellation is scheduled for the end of the paid billing period, subscriber access generally remains active until that period ends. If a subscription is cancelled immediately, dashboard access, authenticated file delivery, and API-key use may stop as soon as the subscription status becomes inactive.</p>
            <p>Fees already charged are generally non-refundable for partial billing periods except where required by applicable law or expressly approved by Urd Atlas. Approved refunds are processed through Stripe where applicable and do not guarantee continued subscriber access after cancellation or refund.</p>
          </Section>

          <Section title="6. Publication Schedule and Availability">
            <p>The service is generally scheduled to publish updated data artifacts around 09:00 and 21:00 Europe/Oslo. These are expected publication windows, not guaranteed timestamps.</p>
            <p>Published data may be delayed, incomplete, unavailable, revised, or marked degraded. Arbitrum and Base may have an expected publication delay relative to Bitcoin and Ethereum.</p>
            <p>System status information is published at <Link href="/status" className="text-link">/status</Link>.</p>
          </Section>

          <Section title="7. License Grant and Internal-Use Restriction">
            <p>Subject to these Terms and an active entitlement, Urd Atlas grants you a limited, revocable, non-exclusive, non-transferable, and non-sublicensable license to access and use the service and any subscriber JSON files made available to your account.</p>
            <p>That license is granted solely for your own internal personal use or your own internal business use. It is not a sale of the service, the data, the reference data JSON, the labels, the scores, or any associated intellectual property.</p>
            <p>Except where explicit written permission is granted by Urd Atlas, subscriber data may not be commercialized, redistributed, sublicensed, resold, repackaged, or made available to third parties.</p>
          </Section>

          <Section title="8. Prohibited Uses">
            <p>You may not, without explicit written permission from Urd Atlas:</p>
            <p>(a) resell, redistribute, sublicense, lease, lend, assign, transfer, or otherwise commercially exploit subscriber data or authenticated outputs;</p>
            <p>(b) use the service or its outputs to operate a competing or substitutive product, dataset, alerting service, API, dashboard, research feed, broker product, managed service, or white-labeled offering;</p>
            <p>(c) publish, post, mirror, proxy, frame, or expose authenticated endpoints or subscriber JSON files for third-party access;</p>
            <p>(d) share accounts or API keys outside the authorized user or organization that purchased access;</p>
            <p>(e) remove attribution, provenance markers, metadata, contract context, or access controls where present;</p>
            <p>(f) attempt to bypass entitlement controls, rate limits, route protection, or scope restrictions, or attempt to gain access to data outside your authorized scope.</p>
          </Section>

          <Section title="9. API Keys and Security">
            <p>Authenticated file delivery requires a valid API key supplied via the documented request header.</p>
            <p>API keys are confidential credentials. You are responsible for safeguarding them and for any activity performed with a valid key associated with your account.</p>
            <p>Urd Atlas may suspend or revoke keys for security, abuse prevention, entitlement enforcement, account lifecycle reasons, or breach of these Terms.</p>
          </Section>

          <Section title="10. Published Artifacts and API Contract">
            <p>Urd Atlas is built around published reference data artifacts and documented API contracts. Public routes and authenticated file delivery expose published outputs rather than hidden runtime model state.</p>
          </Section>

          <Section title="11. Data Sources and Attribution">
            <p>Urd Atlas uses public blockchain-derived data and published internal transformations of those data artifacts.</p>
            <p>AWS Public Blockchain Data attribution must remain visible where required by the product specification and related documentation.</p>
            <p>Additional information is available at <Link href="/about" className="text-link">/about</Link>, <Link href="/methodology" className="text-link">/methodology</Link>, and <Link href="/glossary" className="text-link">/glossary</Link>.</p>
          </Section>

          <Section title="12. Intellectual Property">
            <p>Unless otherwise stated, the site structure, explanatory text, UI presentation, brand elements, compiled published reference data artifacts, documentation, and authenticated outputs made available through Urd Atlas are protected by applicable intellectual property and contract rights.</p>
            <p>No ownership interest in the service or subscriber content is transferred to you by purchasing access.</p>
          </Section>

          <Section title="13. Disclaimer of Warranties">
            <p>The service is provided on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis. Urd Atlas makes no guarantee that the site or API will be uninterrupted, error-free, complete, timely, or suitable for any specific purpose.</p>
            <p>Published data may contain delays, missing values, degraded states, methodology changes, corrections, or revisions that affect interpretation.</p>
          </Section>

          <Section title="14. Limitation of Liability">
            <p>To the maximum extent permitted by applicable law, Urd Atlas and its operators are not liable for indirect, incidental, special, consequential, or business losses arising from use of the website, API, subscriber data, or published reference data artifacts.</p>
            <p>You are solely responsible for any interpretation or use of the information provided by the service.</p>
          </Section>

          <Section title="15. Suspension and Termination">
            <p>Urd Atlas may suspend or terminate access, API keys, subscriptions, or authenticated file delivery if it reasonably believes that these Terms have been breached, that the service is being misused, or that continued access creates security, legal, billing, or operational risk.</p>
            <p>On suspension or termination, your right to access subscriber-only content ends immediately unless otherwise required by applicable law.</p>
          </Section>

          <Section title="16. Changes to the Service or Terms">
            <p>Urd Atlas may update, revise, suspend, or discontinue parts of the service, including plans, entitlements, features, documentation, or publication schedules.</p>
            <p>These Terms may be updated from time to time. The latest published version on this page governs ongoing use of the service unless otherwise required by applicable law.</p>
          </Section>

          <Section title="17. Contact and Related Documents">
            <p>Urd Atlas is operated by MARTIN BALSTAD, organisation number 937 581 254, Norway.</p>
            <p>For support, billing, cancellation, refund, privacy, or legal requests, contact <a href="mailto:support@urdatlas.com" className="text-link">support@urdatlas.com</a>.</p>
            <p>For privacy-related information, see <Link href="/privacy" className="text-link">Privacy Policy</Link>.</p>
            <p>For system health and freshness information, see <Link href="/status" className="text-link">System Status</Link>.</p>
            <p>For methodology, definitions, and API contract context, see <Link href="/methodology" className="text-link">Methodology</Link>, <Link href="/glossary" className="text-link">Glossary</Link>, <Link href="/about" className="text-link">About</Link>, and <Link href="/api-docs" className="text-link">API Docs</Link>.</p>
          </Section>

        </div>
      </div>
    </main>
  );
}
