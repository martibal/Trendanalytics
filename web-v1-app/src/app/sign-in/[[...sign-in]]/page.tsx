// src/app/sign-in/[[...sign-in]]/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { SignIn } from "@clerk/nextjs";

import PageHero from "@/components/site/PageHero";
import {
  UrdButtonLink,
  UrdCallout,
  UrdContainer,
  UrdInlineCode,
  UrdPage,
  UrdPillLink,
  UrdSection,
  cx,
  urd,
} from "@/components/site/UrdDesignSystem";

type AuthSearchParams = Record<string, string | string[] | undefined>;

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return <UrdSection title={title}>{children}</UrdSection>;
}

function isClerkConfigured() {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const secretKey = process.env.CLERK_SECRET_KEY;

  return Boolean(
    publishableKey &&
      publishableKey.trim().length > 0 &&
      secretKey &&
      secretKey.trim().length > 0
  );
}

function firstSearchParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function normalizeRedirectUrl(value: string | null): string | null {
  if (!value) {
    return null;
  }

  if (value.startsWith("/") && !value.startsWith("//")) {
    return value;
  }

  try {
    const parsed = new URL(value);
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
}

function sanitizeSignInRedirect(searchParams: AuthSearchParams | undefined) {
  const rawRedirectUrl = firstSearchParam(searchParams?.redirect_url);
  const normalizedRedirectUrl = normalizeRedirectUrl(rawRedirectUrl);

  if (rawRedirectUrl && normalizedRedirectUrl && normalizedRedirectUrl !== rawRedirectUrl) {
    const params = new URLSearchParams();
    params.set("redirect_url", normalizedRedirectUrl);
    redirect(`/sign-in?${params.toString()}`);
  }
}

function isPreviewCheckoutRedirect(searchParams: AuthSearchParams | undefined): boolean {
  const redirectUrl = normalizeRedirectUrl(firstSearchParam(searchParams?.redirect_url));

  return (
    process.env.VERCEL_ENV === "preview" &&
    typeof redirectUrl === "string" &&
    redirectUrl.startsWith("/checkout/start")
  );
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams?: Promise<AuthSearchParams>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  sanitizeSignInRedirect(resolvedSearchParams);
  const clerkConfigured = isClerkConfigured();
  const previewCheckoutRedirect = isPreviewCheckoutRedirect(resolvedSearchParams);

  return (
    <UrdPage>
      <PageHero
        eyebrow="Subscriber access"
        title="Sign in"
        highlight="to Urd Atlas"
        summary="Access the subscriber dashboard, entitlement-aware JSON delivery, API key management, and account-linked billing state."
      >
        <div className="flex flex-wrap gap-3">
          <UrdButtonLink href="/sign-up">Create account</UrdButtonLink>
          <UrdButtonLink href="/dashboard">Dashboard</UrdButtonLink>
          <UrdButtonLink href="/api-docs">API Docs</UrdButtonLink>
        </div>
      </PageHero>

      <UrdContainer>
        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-6">
            <UrdSection title="Subscriber surface" eyebrow="Account boundary">
              <p>
                Sign in to access the subscriber dashboard, entitlement-aware JSON delivery,
                API key management, and account-linked billing state. The public descriptive
                website remains separate from this subscriber surface.
              </p>
            </UrdSection>

            <Section title="What sign-in is for">
              <ul className="list-disc space-y-1 pl-5">
                <li>Subscriber dashboard access</li>
                <li>Account-linked entitlement inspection</li>
                <li>Authenticated API key lifecycle</li>
                <li>JSON file delivery within subscription scope</li>
              </ul>
            </Section>

            <Section title="What sign-in is not required for">
              <div className="flex flex-wrap gap-2">
                <UrdPillLink href="/">Home</UrdPillLink>
                <UrdPillLink href="/chains">Chains</UrdPillLink>
                <UrdPillLink href="/status">Status</UrdPillLink>
                <UrdPillLink href="/track-record">Track Record</UrdPillLink>
                <UrdPillLink href="/methodology">Methodology</UrdPillLink>
                <UrdPillLink href="/glossary">Glossary</UrdPillLink>
              </div>
            </Section>

            <UrdCallout title="Interpretation boundary">
              <p>
                Signing in does not unlock advice, forecasts, or price targets. Subscriber access
                extends delivery and account functionality around the same descriptive product.
              </p>
            </UrdCallout>

            <Section title="Related pages">
              <div className="flex flex-wrap gap-2">
                <UrdPillLink href="/sign-up">Create account</UrdPillLink>
                <UrdPillLink href="/dashboard">Dashboard</UrdPillLink>
                <UrdPillLink href="/api-docs">API Docs</UrdPillLink>
                <UrdPillLink href="/terms">Terms</UrdPillLink>
                <UrdPillLink href="/privacy">Privacy</UrdPillLink>
              </div>
            </Section>
          </div>

          <section className={cx(urd.section, "self-start")}>
            <div className="mb-5">
              <div className="text-xs font-black uppercase tracking-[0.14em] text-[#557099]">
                Identity provider
              </div>
              <h2 className="mt-1 text-2xl font-black tracking-[-0.03em] text-[#0d2447]">
                Account sign-in
              </h2>
              <p className="mt-3 text-sm font-medium leading-7 text-[#27476f]">
                Continue with the configured identity provider to access subscriber-only features.
              </p>
            </div>

            {clerkConfigured ? (
              previewCheckoutRedirect ? (
                <UrdCallout title="Preview checkout sign-in is disabled." tone="warning">
                  <p>
                    This preview deployment reached the subscriber checkout sign-in step, but the
                    embedded identity provider is not rendered here to avoid a raw preview runtime
                    error. Use the production environment for the final Stripe checkout test.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <UrdPillLink href="/#pricing">Back to pricing</UrdPillLink>
                    <UrdPillLink href="/plans">View plans</UrdPillLink>
                    <UrdPillLink href="/dashboard">Dashboard</UrdPillLink>
                  </div>
                </UrdCallout>
              ) : (
                <div className="rounded-3xl border border-[#c9d9ea] bg-[#eef6ff] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]">
                  <div className="flex justify-center">
                    <SignIn
                      routing="path"
                      path="/sign-in"
                      signUpUrl="/sign-up"
                      fallbackRedirectUrl="/dashboard"
                    />
                  </div>
                </div>
              )
            ) : (
              <UrdCallout title="Clerk is not configured in this environment." tone="warning">
                <p>
                  The sign-in route is available, but the identity provider is not fully wired in this
                  runtime yet. Add valid Clerk environment variables before rendering the embedded
                  sign-in component.
                </p>
                <p className="mt-4 text-xs font-black text-amber-800">
                  Required keys: <UrdInlineCode>NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</UrdInlineCode>{" "}
                  and <UrdInlineCode>CLERK_SECRET_KEY</UrdInlineCode>
                </p>
              </UrdCallout>
            )}

            <div className="mt-6 border-t border-[#c9d9ea] pt-5 text-sm font-semibold leading-7 text-[#27476f]">
              New subscriber?{" "}
              <Link href="/sign-up" className="font-black text-blue-700 underline underline-offset-4">
                Create an account
              </Link>
              .
            </div>
          </section>
        </div>
      </UrdContainer>
    </UrdPage>
  );
}
