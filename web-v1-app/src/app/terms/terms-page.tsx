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
              These Terms govern access to the Urd Atlas public website, subscriber dashboard,
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
            These Terms apply to the current public website, subscriber dashboard, and
            authenticated JSON delivery API. By creating an account, purchasing a subscription,
            generating or using an API key, or otherwise using authenticated features of the
            service, you agree to be bound by these Terms.
          </p>
          <p className="mt-2">
            Urd Atlas is descriptive only. It does not provide investment advice, trading advice,
            forecasts, or recommendations.
          </p>
        </div>
      </header>

      <div className="grid gap-6">
        <Section title="1. Service Description">
          <p>
            Urd Atlas is a descriptive on-chain analytics product. It provides a public,
            read-only website, a subscriber dashboard, and authenticated JSON file delivery for
            published data artifacts.
          </p>
          <p>
            The service is designed to present on-chain reference data, including regime context, confidence, drivers, rolling trend
            views, freshness context, and related explanatory material based on published
            blockchain data artifacts.
          </p>
        </Section>

        <Section title="2. No Investment Advice">
          <p>
            Urd Atlas is strictly descriptive. It does not provide investment advice, trading
            advice, portfolio advice, forecasts, or recommendations.
          </p>
          <p>
            No page, API route, chart, glossary entry, methodology section, downloadable file,
            JSON response, score, label, or driver list should be interpreted as a suggestion to
            buy, sell, hold, rebalance, hedge, or take any financial action.
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
            Subscriber-only features, including dashboard access, API keys, authenticated file
            downloads, and any data beyond the public surface, require a valid account and an
            active entitlement.
          </p>
        </Section>

        <Section title="4. Account, Billing, and Access">
          <p>
            Subscriber access is governed by the active subscription plan and associated
            entitlement scope, including chain access, data genre, window depth, and historical
            depth where applicable.
          </p>
          <p>
            Access may be suspended, limited, or revoked if a subscription expires, a payment
            fails, an entitlement changes, a key is revoked, or the service detects misuse or
            abuse of authenticated endpoints.
          </p>
          <p>
            Stripe is used for payment processing. Urd Atlas does not store or process card
            details directly.
          </p>
        </Section>

        <Section title="5. Publication Schedule and Availability">
          <p>
            The service is generally scheduled to publish updated data artifacts around 09:00 and
            21:00 Europe/Oslo.
          </p>
          <p>
            These are expected publication windows, not guaranteed timestamps. Published data may
            arrive later than usual because of upstream source delays, chain-specific lags,
            maintenance, deployment timing, or temporary processing issues.
          </p>
          <p>
            Published data may be delayed, incomplete, unavailable, revised, or marked degraded.
            Arbitrum and Base may have an expected publication delay relative to Bitcoin and
            Ethereum.
          </p>
          <p>
            System status information is published at{" "}
            <Link href="/status" className="underline">
              /status
            </Link>
            .
          </p>
        </Section>

        <Section title="6. License Grant and Internal-Use Restriction">
          <p>
            Subject to these Terms and an active entitlement, Urd Atlas grants you a limited,
            revocable, non-exclusive, non-transferable, and non-sublicensable license to access
            and use the service and any subscriber JSON files made available to your account.
          </p>
          <p>
            That license is granted solely for your own internal personal use or your own internal
            business use. It is not a sale of the service, the data, the reference data JSON, the
            labels, the scores, or any associated intellectual property.
          </p>
          <p>
            Except where explicit written permission is granted by Urd Atlas, subscriber data,
            including numeric values, JSON files, labels, confidence scores, drivers, rolling
            metrics, and substantial portions or derivatives of them, may not be commercialized,
            redistributed, sublicensed, resold, repackaged, or made available to third parties.
          </p>
        </Section>

        <Section title="7. Prohibited Uses">
          <p>You may not, without explicit written permission from Urd Atlas:</p>
          <p>
            (a) resell, redistribute, sublicense, lease, lend, assign, transfer, or otherwise
            commercially exploit subscriber data or authenticated outputs;
          </p>
          <p>
            (b) use the service or its outputs to operate a competing or substitutive product,
            dataset, alerting service, API, dashboard, research feed, broker product, managed
            service, or white-labeled offering;
          </p>
          <p>
            (c) publish, post, mirror, proxy, frame, or expose authenticated endpoints or
            subscriber JSON files for third-party access;
          </p>
          <p>
            (d) share accounts or API keys outside the authorized user or organization that
            purchased access;
          </p>
          <p>
            (e) remove attribution, provenance markers, metadata, contract context, or access
            controls where present;
          </p>
          <p>
            (f) attempt to bypass entitlement controls, rate limits, route protection, or scope
            restrictions, or attempt to gain access to data outside your authorized scope.
          </p>
        </Section>

        <Section title="8. API Keys, Fair Use, and Security">
          <p>
            Authenticated file delivery requires a valid API key supplied via the documented
            request header.
          </p>
          <p>
            API keys are confidential credentials. You are responsible for safeguarding them and
            for any activity performed with a valid key associated with your account.
          </p>
          <p>
            API access is subject to technical rate limits, daily fair-use quotas, entitlement
            checks, security controls, and operational safeguards. Unless otherwise agreed in
            writing, the default daily authenticated file-delivery quota is 500 requests per UTC
            day for Basic access and 5,000 requests per UTC day for Pro access.
          </p>
          <p>
            Urd Atlas may throttle, reject, suspend, or revoke access if request volume, request
            patterns, automation, credential sharing, scraping, redistribution, attempted
            circumvention, or other use creates security, legal, billing, infrastructure, or
            operational risk.
          </p>
          <p>
            Quotas and rate limits are intended to protect service availability and prevent
            excessive or abusive usage. They may be changed, reduced, increased, or applied
            differently where necessary to protect the service, comply with legal obligations,
            operate subscriptions, or support legitimate customer use.
          </p>
          <p>
            Urd Atlas may suspend or revoke keys for security, abuse prevention, entitlement
            enforcement, account lifecycle reasons, or breach of these Terms.
          </p>
        </Section>

        <Section title="9. Published Artifacts and API Contract">
          <p>
            Urd Atlas is built around published reference data artifacts and documented API contracts. Public
            routes and authenticated file delivery are intended to expose published outputs rather
            than hidden runtime model state.
          </p>
          <p>
            Public API routes may include dataset version, methodology version, freshness context,
            source mode, and canonical contract metadata as part of the descriptive interpretation
            surface.
          </p>
        </Section>

        <Section title="10. Data Sources and Attribution">
          <p>
            The underlying blockchain transaction data used in Urd Atlas classifications is sourced
            from <strong className="text-foreground">AWS Public Blockchain Data</strong>, a publicly
            available dataset provided through the AWS Open Data Program
            (registry.opendata.aws/aws-public-blockchain). This dataset is made freely available
            for research, analytics, and commercial use.
          </p>
          <p>
            Urd Atlas does not redistribute raw blockchain data. The published outputs — regime
            labels, confidence scores, scorecards, driver attribution, rolling averages, and all
            derived JSON artifacts — are original analytical work produced by Urd Atlas&apos;s own
            classification pipeline and methodology. These outputs constitute independent
            intellectual property and are distinct from the underlying source data.
          </p>
          <p>
            The distinction is material: Urd Atlas sells access to its analytical layer — the
            normalisation, baseline scoring, persistence logic, confidence gating, and published
            classification — not access to raw blockchain records. Subscribers receive Urd Atlas&apos;s
            derived outputs, not copies or transformations of the AWS Public Blockchain Data source files.
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

        <Section title="11. Intellectual Property">
          <p>
            Unless otherwise stated, the site structure, explanatory text, UI presentation, brand
            elements, compiled published reference data artifacts, documentation, and authenticated outputs made
            available through Urd Atlas are protected by applicable intellectual property and
            contract rights.
          </p>
          <p>
            No ownership interest in the service or subscriber content is transferred to you by
            purchasing access.
          </p>
        </Section>

        <Section title="12. Disclaimer of Warranties">
          <p>
            The service is provided on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo;
            basis. Urd Atlas makes no guarantee that the site or API will be uninterrupted,
            error-free, complete, timely, or suitable for any specific purpose.
          </p>
          <p>
            Published data may contain delays, missing values, degraded states, methodology
            changes, corrections, or revisions that affect interpretation.
          </p>
        </Section>

        <Section title="13. Limitation of Liability">
          <p>
            To the maximum extent permitted by applicable law, Urd Atlas and its operators are not
            liable for indirect, incidental, special, consequential, or business losses arising
            from use of the website, API, subscriber data, or published reference data artifacts.
          </p>
          <p>
            You are solely responsible for any interpretation or use of the information provided by
            the service.
          </p>
        </Section>

        <Section title="14. Suspension and Termination">
          <p>
            Urd Atlas may suspend or terminate access, API keys, subscriptions, or authenticated
            file delivery if it reasonably believes that these Terms have been breached, that the
            service is being misused, or that continued access creates security, legal, billing, or
            operational risk.
          </p>
          <p>
            On suspension or termination, your right to access subscriber-only content ends
            immediately unless otherwise required by applicable law.
          </p>
        </Section>

        <Section title="15. Changes to the Service or Terms">
          <p>
            Urd Atlas may update, revise, suspend, or discontinue parts of the service, including
            plans, entitlements, features, documentation, or publication schedules.
          </p>
          <p>
            These Terms may be updated from time to time. The latest published version on this page
            governs ongoing use of the service unless otherwise required by applicable law.
          </p>
        </Section>

        <Section title="16. Contact and Related Documents">
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
      </div>
    </main>
  );
}
