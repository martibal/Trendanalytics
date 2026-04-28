// src/app/sign-up/[[...sign-up]]/page.tsx
import Link from "next/link";
import type { ReactNode } from "react";
import { SignUp } from "@clerk/nextjs";
import { cookies } from "next/headers";

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

const TERMS_VERSION = "2026-04-13";
const TERMS_ACCEPTANCE_COOKIE = "ua_terms_acceptance_pending";

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

async function acceptTermsForSignUp(formData: FormData) {
  "use server";

  const accepted = formData.get("accept_terms");
  if (accepted !== "yes") {
    return;
  }

  const cookieStore = await cookies();
  const timestamp = new Date().toISOString();

  cookieStore.set(TERMS_ACCEPTANCE_COOKIE, `${TERMS_VERSION}|${timestamp}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 6,
  });
}

async function clearTermsForSignUp() {
  "use server";

  const cookieStore = await cookies();
  cookieStore.delete(TERMS_ACCEPTANCE_COOKIE);
}

export default async function SignUpPage() {
  const clerkConfigured = isClerkConfigured();

  const cookieStore = await cookies();
  const pendingTermsAcceptance =
    cookieStore.get(TERMS_ACCEPTANCE_COOKIE)?.value ?? null;

  const hasAcceptedCurrentTerms =
    typeof pendingTermsAcceptance === "string" &&
    pendingTermsAcceptance.startsWith(`${TERMS_VERSION}|`);

  return (
    <UrdPage>
      <PageHero
        eyebrow="Subscriber access"
        title="Create account"
        highlight="for JSON delivery"
        summary="Create an account to use the subscriber dashboard, authenticated JSON delivery, API key lifecycle, and account-linked billing and entitlement flows."
      >
        <div className="flex flex-wrap gap-3">
          <UrdButtonLink href="/sign-in">Sign in</UrdButtonLink>
          <UrdButtonLink href="/dashboard">Dashboard</UrdButtonLink>
          <UrdButtonLink href="/terms">Terms</UrdButtonLink>
          <UrdButtonLink href="/privacy">Privacy</UrdButtonLink>
        </div>
      </PageHero>

      <UrdContainer>
        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-6">
            <UrdSection title="Subscriber account" eyebrow="Account boundary">
              <p>
                Create an account to use the subscriber dashboard, authenticated JSON delivery,
                API key lifecycle, and account-linked billing and entitlement flows. The public
                descriptive website remains available separately.
              </p>
            </UrdSection>

            <Section title="What account creation unlocks">
              <ul className="list-disc space-y-1 pl-5">
                <li>Subscriber dashboard access</li>
                <li>Plan-linked entitlement state</li>
                <li>Authenticated JSON file delivery</li>
                <li>API key lifecycle and account-linked access control</li>
              </ul>
            </Section>

            <Section title="Public pages remain public">
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
                Creating an account does not change the product boundary. Subscriber access extends
                delivery and account capabilities, but the product remains descriptive rather than
                predictive or advisory.
              </p>
            </UrdCallout>

            <Section title="Legal acceptance required">
              <p>
                Before account creation continues, you must review and explicitly accept the current{" "}
                <Link href="/terms" className="font-black text-blue-700 underline underline-offset-4">
                  Terms of Service
                </Link>{" "}
                and acknowledge the{" "}
                <Link href="/privacy" className="font-black text-blue-700 underline underline-offset-4">
                  Privacy Policy
                </Link>
                .
              </p>
              <p>
                The current terms version for sign-up gating is{" "}
                <UrdInlineCode>{TERMS_VERSION}</UrdInlineCode>.
              </p>
            </Section>

            <Section title="Related pages">
              <div className="flex flex-wrap gap-2">
                <UrdPillLink href="/sign-in">Sign in</UrdPillLink>
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
                Account creation
              </h2>
              <p className="mt-3 text-sm font-medium leading-7 text-[#27476f]">
                Continue with the configured identity provider to create a subscriber account.
              </p>
            </div>

            {!clerkConfigured ? (
              <UrdCallout title="Clerk is not configured in this environment." tone="warning">
                <p>
                  The sign-up route is available, but the identity provider is not fully wired in this
                  runtime yet. Add valid Clerk environment variables before rendering the embedded
                  sign-up component.
                </p>
                <p className="mt-4 text-xs font-black text-amber-800">
                  Required keys: <UrdInlineCode>NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</UrdInlineCode>{" "}
                  and <UrdInlineCode>CLERK_SECRET_KEY</UrdInlineCode>
                </p>
              </UrdCallout>
            ) : hasAcceptedCurrentTerms ? (
              <div className="space-y-4">
                <UrdCallout title="Terms accepted for this sign-up session.">
                  <p>
                    You can now continue to account creation. If you want to re-read the legal terms
                    before continuing, you can reset this session below.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-3 text-xs">
                    <span className="rounded-full border border-[#9db8d4] bg-[#eef6ff] px-3 py-1 font-black text-[#0d2447]">
                      Version: {TERMS_VERSION}
                    </span>
                  </div>
                </UrdCallout>

                <div className="rounded-3xl border border-[#c9d9ea] bg-[#eef6ff] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]">
                  <div className="flex justify-center">
                    <SignUp
                      routing="path"
                      path="/sign-up"
                      signInUrl="/sign-in"
                      fallbackRedirectUrl="/dashboard"
                    />
                  </div>
                </div>

                <form action={clearTermsForSignUp}>
                  <button
                    type="submit"
                    className="text-sm font-black text-[#557099] underline underline-offset-4 transition hover:text-blue-700"
                  >
                    Reset terms acceptance for this sign-up session
                  </button>
                </form>
              </div>
            ) : (
              <div className="rounded-2xl border border-blue-300 bg-[#e7f1fb] p-5">
                <div className="text-sm font-black text-blue-700">
                  Review and accept legal terms before sign-up
                </div>
                <p className="mt-3 text-sm font-semibold leading-7 text-[#0d2447]">
                  You must explicitly accept the current{" "}
                  <Link href="/terms" className="font-black text-blue-700 underline underline-offset-4">
                    Terms of Service
                  </Link>{" "}
                  and acknowledge the{" "}
                  <Link href="/privacy" className="font-black text-blue-700 underline underline-offset-4">
                    Privacy Policy
                  </Link>{" "}
                  before the account creation form becomes available.
                </p>

                <form action={acceptTermsForSignUp} className="mt-4 space-y-4">
                  <label className="flex items-start gap-3 rounded-2xl border border-[#c9d9ea] bg-[#eef6ff] p-4">
                    <input
                      type="checkbox"
                      name="accept_terms"
                      value="yes"
                      required
                      className="mt-1 h-4 w-4 rounded border-[#9db8d4] bg-white"
                    />
                    <span className="text-sm font-semibold leading-6 text-[#0d2447]">
                      I have read and agree to the{" "}
                      <Link href="/terms" className="font-black text-blue-700 underline underline-offset-4">
                        Terms of Service
                      </Link>{" "}
                      and acknowledge the{" "}
                      <Link href="/privacy" className="font-black text-blue-700 underline underline-offset-4">
                        Privacy Policy
                      </Link>
                      . I understand that subscriber JSON and data outputs are licensed subject to
                      those terms, including the internal-use restriction.
                    </span>
                  </label>

                  <div className="text-xs font-black text-[#557099]">
                    Current sign-up terms version: <UrdInlineCode>{TERMS_VERSION}</UrdInlineCode>
                  </div>

                  <button
                    type="submit"
                    className="inline-flex items-center rounded-full border border-[#9db8d4] bg-[#eef6ff] px-5 py-2.5 text-sm font-black text-[#0d2447] transition hover:bg-white hover:text-blue-800"
                  >
                    I agree — continue to sign up
                  </button>
                </form>
              </div>
            )}
          </section>
        </div>
      </UrdContainer>
    </UrdPage>
  );
}
