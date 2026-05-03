import ShortFullContent from "@/components/site/ShortFullContent";
// src/app/privacy/page.tsx
import Link from "next/link";
import PageHero from "@/components/site/PageHero";
import { UrdContainer, UrdInlineCode, UrdPage, UrdSection } from "@/components/site/UrdDesignSystem";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <UrdSection title={title}>
      <div className="space-y-3">{children}</div>
    </UrdSection>
  );
}

function InlineCode({ children }: { children: string }) {
  return <UrdInlineCode>{children}</UrdInlineCode>;
}

export default function PrivacyPage() {
  return (
    <UrdPage>
      <PageHero
        eyebrow="Privacy Policy"
        title="How your data is handled"
        summary="This page describes how Urd Atlas handles account, billing, usage, and authenticated access data across the public website, subscriber dashboard, and API."
      />

      <UrdContainer className="max-w-4xl">
      <ShortFullContent
        pageKey="privacy"
        summary={<>This page explains what kinds of user data Urd Atlas may handle across the public website, subscriber system, dashboard, billing, and authenticated file delivery.</>}
        bullets={[
          <>The public website and the subscriber system are different surfaces with different data-handling implications.</>,
          <>The key things a customer usually wants to know first are what account data is stored, which third parties are used, and where support/privacy requests should go.</>,
          <>The full policy remains available below for legal precision.</>,
        ]}
        whyItMatters={<>A user should be able to understand the privacy model in plain language before reading the full legal text.</>}
        fullContent={
          <div className="grid gap-6">
        <Section title="1. Scope">
          <p>
            This Privacy Policy applies to Urd Atlas public pages, subscriber account pages,
            authenticated JSON delivery, and related support, billing, and operational workflows.
          </p>
          <p>
            It covers the handling of account information, entitlement state, usage data, API access
            data, billing-related metadata, and technical service-operation metadata.
          </p>
        </Section>

        <Section title="2. Public Website vs Subscriber System">
          <p>
            Urd Atlas has two distinct product surfaces:
          </p>
          <ul className="list-disc pl-5">
            <li>
              the public read-only website, which exposes descriptive pages and public API routes,
            </li>
            <li>
              the subscriber system, which includes dashboard access, account state, API keys, and
              entitlement-gated file delivery.
            </li>
          </ul>
          <p>
            Privacy handling may differ depending on whether a user is only visiting public pages or
            using subscriber functionality that requires authentication and account-linked access.
          </p>
        </Section>

        <Section title="3. What Data May Be Processed">
          <p>Depending on how you use the service, Urd Atlas may process:</p>
          <ul className="list-disc pl-5">
            <li>account identifiers and authentication-linked user IDs,</li>
            <li>email address and subscriber profile information,</li>
            <li>subscription status, billing state, and entitlement scope,</li>
            <li>API key metadata such as prefix, last-used timestamp, and key status,</li>
            <li>request metadata needed for delivery, rate limiting, security, and abuse prevention,</li>
            <li>support or contact information you voluntarily provide.</li>
          </ul>
        </Section>

        <Section title="4. Authentication and Identity">
          <p>
            Urd Atlas uses Clerk for authentication and account session handling. Authentication
            data is therefore also subject to Clerk’s own product and privacy terms.
          </p>
          <p>
            The site may process account-linked identifiers needed to determine whether a user has
            access to subscriber-only features such as dashboard routes, API keys, or authenticated
            file delivery.
          </p>
        </Section>

        <Section title="5. Billing and Payments">
          <p>
            Urd Atlas uses Stripe for billing, checkout, and subscription processing.
          </p>
          <p>
            Payment card details are not stored directly by Urd Atlas. Billing-related metadata
            such as customer identifiers, subscription identifiers, plan information, and webhook
            status may be processed to operate the subscriber service.
          </p>
        </Section>

        <Section title="6. API Access, Keys, and Security Logging">
          <p>
            Authenticated file delivery requires API keys. Urd Atlas may process API key
            metadata and request metadata needed for:
          </p>
          <ul className="list-disc pl-5">
            <li>authentication and entitlement enforcement,</li>
            <li>security monitoring,</li>
            <li>rate limiting,</li>
            <li>abuse prevention,</li>
            <li>subscriber support and operational troubleshooting.</li>
          </ul>
          <p>
            Secret API keys should only be displayed once at creation and should not be recoverable
            in plaintext afterward.
          </p>
        </Section>

        <Section title="7. Public Website Analytics and Operational Data">
          <p>
            Urd Atlas may process limited operational and technical information necessary to
            operate the public website and API, such as route usage, availability signals, error
            states, freshness information, response timing, and delivery diagnostics.
          </p>
          <p>
            The product is not designed to collect unnecessary personal content. Public blockchain
            analytics content is descriptive and does not require user profiling to function.
          </p>
        </Section>

        <Section title="8. Published Data and Traceability Metadata">
          <p>
            The public product is built around published reference data artifacts and traceable metadata. Public
            routes may expose dataset version, methodology version, source mode, freshness context,
            chain-specific lag, and canonical contract fields.
          </p>
          <p>
            These fields are part of the product’s transparency model and are intended to describe
            the published analytics state rather than identify end users.
          </p>
        </Section>

        <Section title="9. Why Data Is Processed">
          <p>Data may be processed to:</p>
          <ul className="list-disc pl-5">
            <li>provide access to subscriber-only features,</li>
            <li>operate billing and entitlement workflows,</li>
            <li>deliver authenticated files within plan scope,</li>
            <li>protect the service against misuse or abuse,</li>
            <li>maintain service health, reliability, and support workflows,</li>
            <li>comply with legal or contractual obligations where applicable.</li>
          </ul>
        </Section>

        <Section title="10. Data Sharing">
          <p>
            Urd Atlas may rely on third-party processors and infrastructure providers, including
            services used for authentication, billing, deployment, hosting, storage, and rate
            limiting.
          </p>
          <p>
            Data is shared only to the extent reasonably necessary to provide or secure the service,
            or where required by law.
          </p>
        </Section>

        <Section title="11. Retention">
          <p>
            Subscriber account metadata, billing references, API key metadata, and operational logs
            may be retained for as long as reasonably necessary to provide the service, investigate
            misuse, maintain business records, or comply with legal obligations.
          </p>
          <p>
            Retention periods may vary depending on operational, billing, security, and compliance requirements applicable to the service.
          </p>
        </Section>

        <Section title="12. Security">
          <p>
            Urd Atlas uses route protection, entitlement checks, key status enforcement, and
            rate limiting as part of its security model.
          </p>
          <p>
            No online system can guarantee absolute security, but the product is designed to reduce
            exposure of sensitive access credentials and restrict delivery to authorized scope.
          </p>
        </Section>

        <Section title="13. Your Rights and Requests">
          <p>
            Depending on applicable law, users may have rights related to access, correction,
            deletion, restriction, or objection in relation to their personal data.
          </p>
          <p>
            Requests are handled according to the operator’s applicable legal obligations and the service records required to operate, secure, and support the platform.
          </p>
        </Section>

        <Section title="14. Related Documents">
          <p>
            Terms governing use of the service are available at{" "}
            <Link href="/terms" className="underline">
              Terms of Service
            </Link>
            .
          </p>
          <p>
            System health and freshness are documented at{" "}
            <Link href="/status" className="underline">
              System Status
            </Link>
            .
          </p>
          <p>
            Methodology and descriptive product boundaries are documented at{" "}
            <Link href="/methodology" className="underline">
              Methodology
            </Link>
            ,{" "}
            <Link href="/about" className="underline">
              About
            </Link>
            ,{" "}
            <Link href="/glossary" className="underline">
              Glossary
            </Link>
            , and{" "}
            <Link href="/api-docs" className="underline">
              API Docs
            </Link>
            .
          </p>
        </Section>


          </div>
        }
      />
      </UrdContainer>
    </UrdPage>
  );
}
