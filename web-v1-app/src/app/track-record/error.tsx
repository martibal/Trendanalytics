"use client";
import Link from "next/link";
import { useEffect } from "react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to monitoring if available
    console.error(error);
  }, [error]);

  const is429 = error?.message?.includes("429") || error?.digest?.includes("429");
  const is500 = error?.message?.includes("500") || error?.message?.includes("Internal");

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <div className="mx-auto max-w-md rounded-2xl border p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border bg-muted">
          <svg className="h-5 w-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.07 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>

        <h2 className="text-lg font-semibold text-foreground">
          {is429 ? "Rate limit reached" : is500 ? "Server error" : "Something went wrong"}
        </h2>

        <p className="mt-2 text-sm text-muted-foreground">
          {is429
            ? "Too many requests in a short window. Please wait a moment before trying again."
            : is500
            ? "An error occurred while loading data. The latest available data may still be shown below."
            : "An unexpected error occurred. Data shown may be from the previous load."}
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={reset}
            className="rounded-lg border px-4 py-2 text-sm text-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Try again
          </button>
          <Link
            href="/status"
            className="rounded-lg border px-4 py-2 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Check system status
          </Link>
        </div>

        {error?.digest && (
          <p className="mt-4 text-xs text-muted-foreground/60">
            Error ID: <code className="rounded bg-muted px-1">{error.digest}</code>
          </p>
        )}
      </div>
    </div>
  );
}
