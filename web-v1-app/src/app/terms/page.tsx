// src/app/terms/page.tsx
import Link from "next/link";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border p-6">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-6 text-muted-foreground">
        {children}
      </div>
    </section>
  );
}

function InlineCode({ children }: { children: string }) {
  return <code className="rounded bg-muted px-1 py-0.5">{children}</code>;
}

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <header className="mb-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Terms of Service</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              These Terms govern access to the TrendAnalytics public website, subscriber dashboard,
              and authenticated JSON delivery API.
            </p>
          </div>

          <div className="rounded-xl border px-4 py-3 text-sm">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              Status
            </div>
            <div className="mt-1 font-medium text-foreground">
              Current terms version
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              Applies to the current public site, dashboard, and authenticated delivery API.
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-xl border p-4 text-sm text-muted-foreground">
          <div className="font-medium text-foreground">Important</div>
          <p className="mt-2">
            This page describes the service terms that apply to the current public website, subscriber dashboard, and authenticated JSON delivery API.
          </p>
        </div>
      </header>

      <div className="grid gap-6">
        <Section title="1. Service Description">
          <p>
            TrendAnalytics is a descriptive on-chain analytics product. It provides a public,
            read-only website, a subscriber dashboard, and authenticated JSON file delivery for
            published data artifacts.
          </p>
          <p>
            The service is designed to present regime context, confidence, drivers, rolling trend
            views, and related explanatory material based on published blockchain data artifacts.
          </p>
        </Section>

        <Section title="2. No Investment Advice">
          <p>
            TrendAnalytics is strictly descriptive. It does not provide investment advice, trading
            advice, portfolio advice, forecasts, or recommendations.
          </p>
          <p>
            No page, API route, chart, glossary entry, methodology section, or downloadable file
            should be interpreted as a suggestion to buy, sell, hold, rebalance, hedge, or take any
            financial action.
          </p>
        </Section>

        <Section title="3. Public Content and Subscriber Content">
          <p>
            Public pages, including <InlineCode>/</InlineCode>, <InlineCode>/chains</InlineCode>,{" "}
            <InlineCode>/glossary</InlineCode>, <InlineCode>/track-record</InlineCode>,{" "}
            <InlineCode>/thresholds</InlineCode>, <InlineCode>/about</InlineCode>,{" "}
            <InlineCode>/api-docs</InlineCode>, <InlineCode>/status</InlineCode>,{" "}
            <InlineCode>/terms</InlineCode>, and <InlineCode>/privacy</InlineCode>, are intended to
            be accessible without forced login.
          </p>
          <p>
            Subscriber-only features, including dashboard access, API keys, and authenticated file
            downloads, require a valid account and an active entitlement.
          </p>
        </Section>

        <Section title="4. Account, Billing, and Access">
          <p>
            Subscriber access is governed by the active subscription plan and associated entitlement
            scope, including chain access, data genre, window depth, and historical depth where
            applicable.
          </p>
          <p>
            Access may be suspended, limited, or revoked if a subscription expires, a payment fails,
            a key is revoked, or the service detects misuse or abuse of authenticated endpoints.
          </p>
          <p>
            Stripe is used for payment processing. TrendAnalytics does not store or process card
            details directly.
          </p>
        </Section>

        <Section title="5. API Keys and Security">
          <p>
            Authenticated file delivery requires a valid API key supplied via the documented request
            header.
          </p>
          <p>
            API keys are confidential credentials. You are responsible for safeguarding them and for
            any activity performed with a valid key associated with your account.
          </p>
          <p>
            TrendAnalytics may suspend or revoke keys for security, abuse prevention, entitlement
            enforcement, or account lifecycle reasons.
          </p>
        </Section>

        <Section title="6. Service Limits and Availability">
          <p>
            The service may apply request limits, entitlement checks, maintenance windows, staleness
            warnings, and temporary availability restrictions.
          </p>
          <p>
            Published data may be delayed, incomplete, unavailable, or marked degraded. Arbitrum and
            Base may have an expected publication delay relative to Bitcoin and Ethereum.
          </p>
          <p>
            System status information is published at{" "}
            <Link href="/status" className="underline">
              /status
            </Link>
            .
          </p>
        </Section>

        <Section title="7. Published Artifacts and API Contract">
          <p>
            TrendAnalytics is built around published artifacts and documented API contracts. Public
            routes and authenticated file delivery are intended to expose published outputs rather
            than hidden runtime model state.
          </p>
          <p>
            Public API routes may include dataset version, methodology version, freshness context,
            source mode, and canonical contract metadata as part of the descriptive interpretation
            surface.
          </p>
        </Section>

        <Section title="8. Data Sources and Attribution">
          <p>
            TrendAnalytics uses public blockchain-derived data and published internal transformations
            of those data artifacts.
          </p>
          <p>
            AWS Public Blockchain Data attribution must remain visible where required by the product
            specification and related documentation.
          </p>
          <p>
            Additional information about methodology and data presentation is available at{" "}
            <Link href="/about" className="underline">
              /about
            </Link>
            ,{" "}
            <Link href="/methodology" className="underline">
              /methodology
            </Link>
            , and{" "}
            <Link href="/glossary" className="underline">
              /glossary
            </Link>
            .
          </p>
        </Section>

        <Section title="9. Intellectual Property and Usage Restrictions">
          <p>
            Unless otherwise stated, the site structure, explanatory text, UI presentation, and
            compiled published artifacts presented through TrendAnalytics are protected and may not
            be copied, redistributed, resold, mirrored, or framed except as permitted by applicable
            law or explicit written permission.
          </p>
          <p>
            You may not attempt to bypass entitlement controls, rate limits, or route protection, or
            attempt to gain access to data outside your authorized scope.
          </p>
        </Section>

        <Section title="10. Disclaimer of Warranties">
          <p>
            The service is provided on an “as is” and “as available” basis. TrendAnalytics makes no
            guarantee that the site or API will be uninterrupted, error-free, complete, timely, or
            suitable for any specific purpose.
          </p>
          <p>
            Published data may contain delays, missing values, degraded states, methodology changes,
            or revisions that affect interpretation.
          </p>
        </Section>

        <Section title="11. Limitation of Liability">
          <p>
            To the maximum extent permitted by applicable law, TrendAnalytics and its operators are
            not liable for indirect, incidental, special, consequential, or business losses arising
            from use of the website, API, subscriber data, or published artifacts.
          </p>
          <p>
            You are solely responsible for any interpretation or use of the information provided by
            the service.
          </p>
        </Section>

        <Section title="12. Changes to the Service or Terms">
          <p>
            TrendAnalytics may update, revise, suspend, or discontinue parts of the service,
            including plans, entitlements, features, or documentation.
          </p>
          <p>
            These Terms may be updated from time to time. The latest published version on this page
            governs ongoing use of the service unless otherwise required by applicable law.
          </p>
        </Section>

        <Section title="13. Contact and Related Documents">
          <p>
            For privacy-related information, see{" "}
            <Link href="/privacy" className="underline">
              Privacy Policy
            </Link>
            .
          </p>
          <p>
            For system health and freshness information, see{" "}
            <Link href="/status" className="underline">
              System Status
            </Link>
            .
          </p>
          <p>
            For methodology, definitions, explanatory material, and API contract context, see{" "}
            <Link href="/methodology" className="underline">
              Methodology
            </Link>
            ,{" "}
            <Link href="/glossary" className="underline">
              Glossary
            </Link>
            ,{" "}
            <Link href="/about" className="underline">
              About
            </Link>
            , and{" "}
            <Link href="/api-docs" className="underline">
              API Docs
            </Link>
            .
          </p>
        </Section>

        <section className="rounded-xl border p-6 text-xs text-muted-foreground">
          <div className="font-medium text-foreground">Implementation note</div>
          <p className="mt-2">
            This page is intended to remain aligned with the live product surface, entitlement model, and authenticated delivery routes described throughout the application.
          </p>
          <p className="mt-2">
            Product-specific technical areas relevant to these Terms include{" "}
            <InlineCode>/dashboard</InlineCode>, <InlineCode>/api/v1/files/[...path]</InlineCode>,{" "}
            <InlineCode>/api/v1/checkout</InlineCode>, <InlineCode>/api/v1/webhook</InlineCode>, and
            public API documentation at <InlineCode>/api-docs</InlineCode>.
          </p>
        </section>
      </div>
    </main>
  );
}