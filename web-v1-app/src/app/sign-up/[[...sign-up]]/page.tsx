// src/app/sign-up/[[...sign-up]]/page.tsx
import Link from "next/link";
import { SignUp } from "@clerk/nextjs";
import { cookies } from "next/headers";

const TERMS_VERSION = "2026-04-13";
const TERMS_ACCEPTANCE_COOKIE = "ua_terms_acceptance_pending";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border p-5">
      <h2 className="text-base font-semibold">{title}</h2>
      <div className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
        {children}
      </div>
    </section>
  );
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
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-6">
          <header>
            <div className="text-sm text-muted-foreground">Subscriber access</div>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">Create account</h1>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              Create an account to use the subscriber dashboard, authenticated JSON delivery,
              API key lifecycle, and account-linked billing and entitlement flows. The public
              descriptive website remains available separately.
            </p>
          </header>

          <Section title="What account creation unlocks">
            <ul className="list-disc pl-5">
              <li>Subscriber dashboard access</li>
              <li>Plan-linked entitlement state</li>
              <li>Authenticated JSON file delivery</li>
              <li>API key lifecycle and account-linked access control</li>
            </ul>
          </Section>

          <Section title="Public pages remain public">
            <ul className="list-disc pl-5">
              <li>
                <Link href="/" className="underline">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/chains" className="underline">
                  Chains
                </Link>
              </li>
              <li>
                <Link href="/status" className="underline">
                  Status
                </Link>
              </li>
              <li>
                <Link href="/track-record" className="underline">
                  Track Record
                </Link>
              </li>
              <li>
                <Link href="/methodology" className="underline">
                  Methodology
                </Link>
              </li>
              <li>
                <Link href="/glossary" className="underline">
                  Glossary
                </Link>
              </li>
            </ul>
          </Section>

          <Section title="Interpretation boundary">
            <p>
              Creating an account does not change the product boundary. Subscriber access extends
              delivery and account capabilities, but the product remains descriptive rather than
              predictive or advisory.
            </p>
          </Section>

          <Section title="Legal acceptance required">
            <p>
              Before account creation continues, you must review and explicitly accept the current{" "}
              <Link href="/terms" className="underline">
                Terms of Service
              </Link>{" "}
              and acknowledge the{" "}
              <Link href="/privacy" className="underline">
                Privacy Policy
              </Link>
              .
            </p>
            <p>
              The current terms version for sign-up gating is{" "}
              <code className="rounded bg-muted px-1 py-0.5">{TERMS_VERSION}</code>.
            </p>
          </Section>

          <Section title="Related pages">
            <div className="flex flex-col gap-2">
              <Link href="/sign-in" className="underline">
                Sign in
              </Link>
              <Link href="/dashboard" className="underline">
                Dashboard
              </Link>
              <Link href="/api-docs" className="underline">
                API Docs
              </Link>
              <Link href="/terms" className="underline">
                Terms
              </Link>
              <Link href="/privacy" className="underline">
                Privacy
              </Link>
            </div>
          </Section>
        </div>

        <section className="rounded-2xl border p-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Account creation</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Continue with the configured identity provider to create a subscriber account.
            </p>
          </div>

          {!clerkConfigured ? (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-5">
              <div className="text-sm font-medium text-amber-200">
                Clerk is not configured in this environment.
              </div>
              <p className="mt-2 text-sm text-amber-100/90">
                The sign-up route is live, but the identity provider is not fully wired in this
                runtime yet. Add valid Clerk environment variables before rendering the embedded
                sign-up component.
              </p>
              <div className="mt-4 text-xs text-amber-100/80">
                Required keys:{" "}
                <code className="rounded bg-black/20 px-1 py-0.5">
                  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
                </code>{" "}
                and{" "}
                <code className="rounded bg-black/20 px-1 py-0.5">
                  CLERK_SECRET_KEY
                </code>
              </div>
            </div>
          ) : hasAcceptedCurrentTerms ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-4">
                <div className="text-sm font-medium text-emerald-200">
                  Terms accepted for this sign-up session.
                </div>
                <p className="mt-2 text-sm text-emerald-100/90">
                  You can now continue to account creation. If you want to re-read the legal terms
                  before continuing, you can reset this session below.
                </p>
                <div className="mt-3 flex flex-wrap gap-3 text-xs">
                  <span className="rounded bg-black/20 px-2 py-1 text-emerald-100/80">
                    Version: {TERMS_VERSION}
                  </span>
                </div>
              </div>

              <div className="flex justify-center">
                <SignUp
                  routing="path"
                  path="/sign-up"
                  signInUrl="/sign-in"
                  fallbackRedirectUrl="/dashboard"
                />
              </div>

              <form action={clearTermsForSignUp}>
                <button
                  type="submit"
                  className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
                >
                  Reset terms acceptance for this sign-up session
                </button>
              </form>
            </div>
          ) : (
            <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-5">
              <div className="text-sm font-medium text-cyan-200">
                Review and accept legal terms before sign-up
              </div>
              <p className="mt-2 text-sm text-slate-200">
                You must explicitly accept the current{" "}
                <Link href="/terms" className="underline">
                  Terms of Service
                </Link>{" "}
                and acknowledge the{" "}
                <Link href="/privacy" className="underline">
                  Privacy Policy
                </Link>{" "}
                before the account creation form becomes available.
              </p>

              <form action={acceptTermsForSignUp} className="mt-4 space-y-4">
                <label className="flex items-start gap-3 rounded-xl border border-white/10 bg-black/10 p-4">
                  <input
                    type="checkbox"
                    name="accept_terms"
                    value="yes"
                    required
                    className="mt-1 h-4 w-4 rounded border-white/20 bg-transparent"
                  />
                  <span className="text-sm leading-6 text-slate-200">
                    I have read and agree to the{" "}
                    <Link href="/terms" className="underline">
                      Terms of Service
                    </Link>{" "}
                    and acknowledge the{" "}
                    <Link href="/privacy" className="underline">
                      Privacy Policy
                    </Link>
                    . I understand that subscriber JSON and data outputs are licensed subject to
                    those terms, including the internal-use restriction.
                  </span>
                </label>

                <div className="text-xs text-muted-foreground">
                  Current sign-up terms version:{" "}
                  <code className="rounded bg-muted px-1 py-0.5">{TERMS_VERSION}</code>
                </div>

                <button
                  type="submit"
                  className="inline-flex items-center rounded-full border border-cyan-500/30 bg-cyan-500/15 px-5 py-2.5 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/25"
                >
                  I agree — continue to sign up
                </button>
              </form>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}