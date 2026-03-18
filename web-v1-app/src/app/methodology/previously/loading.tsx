// src/app/methodology/previously/loading.tsx
export default function MethodologyPreviouslyLoading() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <header className="mb-8">
        <div className="h-4 w-32 animate-pulse rounded bg-muted" />
        <div className="mt-3 h-9 w-72 animate-pulse rounded bg-muted" />
        <div className="mt-3 h-4 w-full max-w-3xl animate-pulse rounded bg-muted" />
      </header>

      <section className="space-y-6">
        {Array.from({ length: 5 }).map((_, index) => (
          <section key={index} className="rounded-2xl border p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="h-6 w-56 animate-pulse rounded bg-muted" />
                <div className="mt-3 h-4 w-80 animate-pulse rounded bg-muted" />
              </div>

              <div className="h-8 w-28 animate-pulse rounded-full bg-muted" />
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border p-4">
                <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                <div className="mt-3 h-16 animate-pulse rounded bg-muted/50" />
              </div>

              <div className="rounded-xl border p-4">
                <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                <div className="mt-3 h-16 animate-pulse rounded bg-muted/50" />
              </div>
            </div>

            <div className="mt-5 rounded-xl border p-4">
              <div className="h-4 w-20 animate-pulse rounded bg-muted" />
              <div className="mt-3 space-y-2">
                <div className="h-4 w-full animate-pulse rounded bg-muted" />
                <div className="h-4 w-11/12 animate-pulse rounded bg-muted" />
                <div className="h-4 w-4/5 animate-pulse rounded bg-muted" />
              </div>
            </div>
          </section>
        ))}
      </section>
    </main>
  );
}