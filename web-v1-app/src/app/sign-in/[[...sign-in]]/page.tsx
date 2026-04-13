// src/app/sign-in/[[...sign-in]]/page.tsx
import Link from "next/link";
import { SignIn } from "@clerk/nextjs";

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

export default function SignInPage() {
  const clerkConfigured = isClerkConfigured();

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-6">
          <header>
            <div className="text-sm text-muted-foreground">Subscriber access</div>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">Sign in</h1>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              Sign in to access the subscriber dashboard, entitlement-aware JSON delivery,
              API key management, and account-linked billing state. The public descriptive
              website remains separate from this subscriber surface.
            </p>
          </header>

          <Section title="What sign-in is for">
            <ul className="list-disc pl-5">
              <li>Subscriber dashboard access</li>
              <li>Account-linked entitlement inspection</li>
              <li>Authenticated API key lifecycle</li>
              <li>JSON file delivery within subscription scope</li>
            </ul>
          </Section>

          <Section title="What sign-in is not required for">
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
              Signing in does not unlock advice, forecasts, or price targets. Subscriber access
              extends delivery and account functionality around the same descriptive product.
            </p>
          </Section>

          <Section title="Related pages">
            <div className="flex flex-col gap-2">
              <Link href="/sign-up" className="underline">
                Create account
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
            <h2 className="text-lg font-semibold">Account sign-in</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Continue with the configured identity provider to access subscriber-only features.
            </p>
          </div>

          {clerkConfigured ? (
            <div className="flex justify-center">
              <SignIn
                routing="path"
                path="/sign-in"
                signUpUrl="/sign-up"
                fallbackRedirectUrl="/dashboard"
              />
            </div>
          ) : (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-5">
              <div className="text-sm font-medium text-amber-200">
                Clerk is not configured in this environment.
              </div>
              <p className="mt-2 text-sm text-amber-100/90">
                The sign-in route is live, but the identity provider is not fully wired in this
                runtime yet. Add valid Clerk environment variables before rendering the embedded
                sign-in component.
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