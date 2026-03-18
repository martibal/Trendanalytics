// src/app/dashboard/loading.tsx
export default function DashboardLoading() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <header className="mb-8">
        <div className="h-4 w-28 animate-pulse rounded bg-muted" />
        <div className="mt-3 h-9 w-56 animate-pulse rounded bg-muted" />
        <div className="mt-3 h-4 w-full max-w-3xl animate-pulse rounded bg-muted" />
        <div className="mt-2 h-4 w-4/5 max-w-2xl animate-pulse rounded bg-muted" />
      </header>

      <section className="mb-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-2xl border p-6">
          <div className="h-6 w-44 animate-pulse rounded bg-muted" />
          <div className="mt-2 h-4 w-80 animate-pulse rounded bg-muted" />

          <div className="mt-5 h-24 animate-pulse rounded-xl border bg-muted/40" />

          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="rounded-xl border p-4">
                <div className="h-3 w-24 animate-pulse rounded bg-muted" />
                <div className="mt-3 h-6 w-20 animate-pulse rounded bg-muted" />
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border p-6">
          <div className="h-6 w-44 animate-pulse rounded bg-muted" />
          <div className="mt-4 space-y-3">
            {Array.from({ length: 7 }).map((_, index) => (
              <div key={index} className="h-4 w-full animate-pulse rounded bg-muted" />
            ))}
          </div>
          <div className="mt-5 h-20 animate-pulse rounded-xl border bg-muted/40" />
        </section>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="space-y-6">
          <section className="rounded-2xl border p-6">
            <div className="h-6 w-52 animate-pulse rounded bg-muted" />
            <div className="mt-2 h-4 w-96 animate-pulse rounded bg-muted" />

            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="rounded-xl border p-4">
                  <div className="h-3 w-20 animate-pulse rounded bg-muted" />
                  <div className="mt-3 h-7 w-24 animate-pulse rounded bg-muted" />
                </div>
              ))}
            </div>

            <div className="mt-5 h-28 animate-pulse rounded-xl border bg-muted/40" />
            <div className="mt-5 h-28 animate-pulse rounded-xl border bg-muted/40" />
          </section>

          <section className="rounded-2xl border p-6">
            <div className="h-6 w-28 animate-pulse rounded bg-muted" />
            <div className="mt-2 h-4 w-80 animate-pulse rounded bg-muted" />
            <div className="mt-5 h-16 animate-pulse rounded-xl border bg-muted/40" />
            <div className="mt-5 space-y-3">
              {Array.from({ length: 2 }).map((_, index) => (
                <div key={index} className="h-24 animate-pulse rounded-xl border bg-muted/40" />
              ))}
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="h-24 animate-pulse rounded-xl border bg-muted/40" />
              ))}
            </div>
          </section>

          <section className="rounded-2xl border p-6">
            <div className="h-6 w-48 animate-pulse rounded bg-muted" />
            <div className="mt-2 h-4 w-96 animate-pulse rounded bg-muted" />
            <div className="mt-5 space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-20 animate-pulse rounded-xl border bg-muted/40" />
              ))}
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          {Array.from({ length: 4 }).map((_, index) => (
            <section key={index} className="rounded-2xl border p-6">
              <div className="h-6 w-40 animate-pulse rounded bg-muted" />
              <div className="mt-4 space-y-3">
                {Array.from({ length: 4 }).map((__, rowIndex) => (
                  <div key={rowIndex} className="h-12 animate-pulse rounded-xl border bg-muted/40" />
                ))}
              </div>
            </section>
          ))}
        </aside>
      </section>
    </main>
  );
}