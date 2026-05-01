// src/app/chains/[chain]/history/error.tsx
"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function ChainHistoryError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[chain history error boundary]", {
      message: error.message,
      digest: error.digest ?? null,
    });
  }, [error]);

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <section className="rounded-2xl border p-6">
        <div className="text-sm uppercase tracking-wide text-muted-foreground">
          Chain history error
        </div>

        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          This chain history view could not be rendered
        </h1>

        <p className="mt-3 text-sm text-muted-foreground">
          The failure has been contained to the history route so the rest of the
          application remains available. This usually indicates a temporary issue
          with historical data loading, parsing, or route-specific rendering.
        </p>

        <div className="mt-5 rounded-xl border bg-muted/40 p-4">
          <div className="text-sm font-medium">Suggested recovery steps</div>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
            <li>Retry the history page render.</li>
            <li>Return to the chain overview and reopen history.</li>
            <li>Check the status page if the issue looks data-related.</li>
          </ul>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-lg border px-4 py-2 text-sm font-medium transition hover:bg-muted"
          >
            Retry history page
          </button>

          <Link
            href="/chains"
            className="rounded-lg border px-4 py-2 text-sm font-medium transition hover:bg-muted"
          >
            Back to chains
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