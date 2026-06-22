// src/app/privacy/page.tsx
import Link from "next/link";
import type { ReactNode } from "react";
import "server-only";

export const revalidate = 0;

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-[var(--line)] pt-8 pb-6">
      <h2 className="ua-h3 mb-4">{title}</h2>
      <div className="space-y-3 text-sm leading-7 text-[var(--ink2)] max-w-3xl">{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <main className="ua-page">

      <header className="hero border-b border-[var(--line)]">
        <div className="page-shell">
          <div className="eyebrow mb-4">Privacy Policy</div>
          <h1 className="ua-h1">How your data is handled</h1>
          <p className="lead mt-4 max-w-2xl">
            This page describes how Urd Atlas handles account, billing, usage, and
            authenticated access data across the public website, subscriber dashboard, and API.
          </p>
          <div className="mt-6 flex flex-wrap gap-4 text-sm text-[var(--ink2)]">
            <span>The public website and subscriber system are different surfaces with different data-handling implications.</span>
          </div>
        </div>
      </header>

      <div className="page-shell py-12">
        <div style={{ maxWidth: "760px" }}>

          <Section title="1. Scope">
            <p>This Privacy Policy applies to Urd Atlas public pages, subscriber account pages, authenticated JSON delivery, and related support, billing, and operational workflows.</p>
            <p>The legal operator of Urd Atlas is MARTIN BALSTAD, organisation number 937 581 254, Norway. Privacy, support, billing, and legal requests can be sent to <a href="mailto:support@urdatlas.com" className="text-link">support@urdatlas.com</a>.</p>
            <p>It covers the handling of account information, entitlement state, usage data, API access data, billing-related metadata, and technical service-operation metadata.</p>
          </Section>

          <Section title="2. Public Website vs Subscriber System">
            <p>Urd Atlas has two distinct product surfaces: the public read-only website, which exposes descriptive pages and public API routes, and the subscriber system, which includes dashboard access, account state, API keys, and entitlement-gated file delivery.</p>
            <p>Privacy handling may differ depending on whether a user is only visiting public pages or using subscriber functionality that requires authentication and account-linked access.</p>
          </Section>

          <Section title="3. What Data May Be Processed">
            <p>Depending on how you use the service, Urd Atlas may process:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>account identifiers and authentication-linked user IDs,</li>
              <li>email address and subscriber profile information,</li>
              <li>subscription status, billing state, and entitlement scope,</li>
              <li>API key metadata such as prefix, last-used timestamp, and key status,</li>
              <li>request metadata needed for delivery, rate limiting, security, and abuse prevention,</li>
              <li>support or contact information you voluntarily provide.</li>
            </ul>
          </Section>

          <Section title="4. Authentication and Identity">
            <p>Urd Atlas uses Clerk for authentication and account session handling. Authentication data is therefore also subject to Clerk&apos;s own product and privacy terms.</p>
            <p>The site may process account-linked identifiers needed to determine whether a user has access to subscriber-only features such as dashboard routes, API keys, or authenticated file delivery.</p>
          </Section>

          <Section title="5. Billing and Payments">
            <p>Urd Atlas uses Stripe for billing, checkout, and subscription processing.</p>
            <p>Payment card details are not stored directly by Urd Atlas. Billing-related metadata such as customer identifiers, subscription identifiers, plan information, and webhook status may be processed to operate the subscriber service.</p>
          </Section>

          <Section title="6. API Access, Keys, and Security Logging">
            <p>Authenticated file delivery requires API keys. Urd Atlas may process API key metadata and request metadata needed for authentication and entitlement enforcement, security monitoring, rate limiting, abuse prevention, and subscriber support.</p>
            <p>Secret API keys should only be displayed once at creation and should not be recoverable in plaintext afterward.</p>
          </Section>

          <Section title="7. Public Website Analytics and Operational Data">
            <p>Urd Atlas may process limited operational and technical information necessary to operate the public website and API, such as route usage, availability signals, error states, freshness information, response timing, and delivery diagnostics.</p>
            <p>Urd Atlas does not use advertising cookies and does not require behavioral profiling to provide the service. If analytics or diagnostics are used, they are intended for aggregate product operation, reliability, abuse prevention, and performance monitoring rather than advertising or resale of user profiles.</p>
            <p>The product is not designed to collect unnecessary personal content. Public blockchain analytics content is descriptive and does not require user profiling to function.</p>
          </Section>

          <Section title="8. Published Data and Traceability Metadata">
            <p>Public routes may expose dataset version, methodology version, source mode, freshness context, chain-specific lag, and canonical contract fields.</p>
            <p>These fields are part of the product&apos;s transparency model and are intended to describe the published analytics state rather than identify end users.</p>
          </Section>

          <Section title="9. Why Data Is Processed">
            <p>Data may be processed to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>provide access to subscriber-only features,</li>
              <li>operate billing and entitlement workflows,</li>
              <li>deliver authenticated files within plan scope,</li>
              <li>protect the service against misuse or abuse,</li>
              <li>maintain service health, reliability, and support workflows,</li>
              <li>comply with legal or contractual obligations where applicable.</li>
            </ul>
          </Section>

          <Section title="10. Data Sharing">
            <p>Urd Atlas may rely on third-party processors and infrastructure providers, including services used for authentication, billing, deployment, hosting, storage, and rate limiting.</p>
            <p>Data is shared only to the extent reasonably necessary to provide or secure the service, or where required by law.</p>
          </Section>

          <Section title="11. Retention">
            <p>Subscriber account metadata, billing references, API key metadata, and operational logs may be retained for as long as reasonably necessary to provide the service, investigate misuse, maintain business records, or comply with legal obligations.</p>
          </Section>

          <Section title="12. Security">
            <p>Urd Atlas uses route protection, entitlement checks, key status enforcement, and rate limiting as part of its security model.</p>
            <p>No online system can guarantee absolute security, but the product is designed to reduce exposure of sensitive access credentials and restrict delivery to authorized scope.</p>
          </Section>

          <Section title="13. Your Rights and Requests">
            <p>Depending on applicable law, users may have rights related to access, correction, deletion, restriction, or objection in relation to their personal data.</p>
            <p>Requests are handled according to the operator&apos;s applicable legal obligations and the service records required to operate, secure, and support the platform.</p>
          </Section>

          <Section title="14. Related Documents">
            <p>Terms governing use of the service are available at <Link href="/terms" className="text-link">Terms of Service</Link>.</p>
            <p>System health and freshness are documented at <Link href="/status" className="text-link">System Status</Link>.</p>
            <p>Methodology and descriptive product boundaries are documented at <Link href="/methodology" className="text-link">Methodology</Link>, <Link href="/about" className="text-link">About</Link>, <Link href="/glossary" className="text-link">Glossary</Link>, and <Link href="/api-docs" className="text-link">API Docs</Link>.</p>
          </Section>

        </div>
      </div>
    </main>
  );
}



