// src/app/api-docs/loading.tsx
export default function ApiDocsLoading() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <header className="mb-8">
        <div className="h-4 w-24 animate-pulse rounded bg-muted" />
        <div className="mt-3 h-9 w-56 animate-pulse rounded bg-muted" />
        <div className="mt-3 h-4 w-full max-w-3xl animate-pulse rounded bg-muted" />
        <div className="mt-2 h-4 w-4/5 max-w-2xl animate-pulse rounded bg-muted" />
      </header>

      <section className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <aside className="rounded-2xl border p-6">
          <div className="h-6 w-32 animate-pulse rounded bg-muted" />
          <div className="mt-4 space-y-3">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="h-9 animate-pulse rounded-lg bg-muted/60" />
            ))}
          </div>
        </aside>

        <div className="space-y-6">
          {Array.from({ length: 5 }).map((_, index) => (
            <section key={index} className="rounded-2xl border p-6">
              <div className="h-6 w-52 animate-pulse rounded bg-muted" />
              <div className="mt-3 h-4 w-full animate-pulse rounded bg-muted" />
              <div className="mt-2 h-4 w-5/6 animate-pulse rounded bg-muted" />

              <div className="mt-5 space-y-3">
                <div className="h-16 animate-pulse rounded-xl border bg-muted/40" />
                <div className="h-24 animate-pulse rounded-xl border bg-muted/40" />
                <div className="h-16 animate-pulse rounded-xl border bg-muted/40" />
              </div>
            </section>
          ))}
        </div>
      </section>
    </main>
  );
}