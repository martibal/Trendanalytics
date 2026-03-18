// src/app/track-record/loading.tsx
export default function TrackRecordLoading() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <header className="mb-8">
        <div className="h-4 w-28 animate-pulse rounded bg-muted" />
        <div className="mt-3 h-9 w-64 animate-pulse rounded bg-muted" />
        <div className="mt-3 h-4 w-full max-w-3xl animate-pulse rounded bg-muted" />
      </header>

      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <section className="rounded-2xl border p-6">
            <div className="h-6 w-44 animate-pulse rounded bg-muted" />
            <div className="mt-2 h-4 w-80 animate-pulse rounded bg-muted" />

            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="rounded-xl border p-4">
                  <div className="h-3 w-24 animate-pulse rounded bg-muted" />
                  <div className="mt-3 h-7 w-20 animate-pulse rounded bg-muted" />
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border p-6">
            <div className="h-6 w-52 animate-pulse rounded bg-muted" />
            <div className="mt-2 h-4 w-96 animate-pulse rounded bg-muted" />

            <div className="mt-5 space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-24 animate-pulse rounded-xl border bg-muted/40" />
              ))}
            </div>
          </section>

          <section className="rounded-2xl border p-6">
            <div className="h-6 w-40 animate-pulse rounded bg-muted" />
            <div className="mt-2 h-4 w-72 animate-pulse rounded bg-muted" />

            <div className="mt-5 h-56 animate-pulse rounded-xl border bg-muted/40" />
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-2xl border p-6">
            <div className="h-6 w-32 animate-pulse rounded bg-muted" />
            <div className="mt-4 space-y-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="h-10 animate-pulse rounded-xl border bg-muted/40" />
              ))}
            </div>
          </section>

          <section className="rounded-2xl border p-6">
            <div className="h-6 w-36 animate-pulse rounded bg-muted" />
            <div className="mt-4 space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="h-16 animate-pulse rounded-xl border bg-muted/40" />
              ))}
            </div>
          </section>
        </aside>
      </section>
    </main>
  );
}