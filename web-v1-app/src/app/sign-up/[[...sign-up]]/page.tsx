// src/app/sign-up/[[...sign-up]]/page.tsx
import Link from "next/link";
import { SignUp } from "@clerk/nextjs";

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

export default function SignUpPage() {
  const clerkConfigured = isClerkConfigured();

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

          {clerkConfigured ? (
            <div className="flex justify-center">
              <SignUp />
            </div>
          ) : (
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
                Required keys: <code className="rounded bg-black/20 px-1 py-0.5">NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</code>{" "}
                and <code className="rounded bg-black/20 px-1 py-0.5">CLERK_SECRET_KEY</code>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}