// src/app/about/error.tsx
"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function AboutError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[about error boundary]", {
      message: error.message,
      digest: error.digest ?? null,
    });
  }, [error]);

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <section className="rounded-2xl border p-6">
        <div className="text-sm uppercase tracking-wide text-muted-foreground">
          About page error
        </div>

        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          The about page could not be rendered
        </h1>

        <p className="mt-3 text-sm text-muted-foreground">
          The failure has been contained to the about route so the rest of the
          application remains available. This usually indicates a temporary
          route-level rendering issue.
        </p>

        <div className="mt-5 rounded-xl border bg-muted/40 p-4">
          <div className="text-sm font-medium">Suggested recovery steps</div>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
            <li>Retry the page render.</li>
            <li>Return to the home page and reopen About.</li>
            <li>Use methodology or status while this route is unavailable.</li>
          </ul>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-lg border px-4 py-2 text-sm font-medium transition hover:bg-muted"
          >
            Retry page
          </button>

          <Link
            href="/"
            className="rounded-lg border px-4 py-2 text-sm font-medium transition hover:bg-muted"
          >
            Go to home
          </Link>

          <Link
            href="/status"
            className="rounded-lg border px-4 py-2 text-sm font-medium transition hover:bg-muted"
          >
            Open status
          </Link>
        </div>

        {error.digest ? (
          <p className="mt-5 text-xs text-muted-foreground">
            Error digest: <code className="rounded bg-muted px-1 py-0.5">{error.digest}</code>
          </p>
        ) : null}
      </section>
    </main>
  );
}