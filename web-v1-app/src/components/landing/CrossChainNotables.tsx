type NotableItem = {
  title: string;
  body: string;
};

export default function CrossChainNotables({ items }: { items: NotableItem[] }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-border bg-card/50 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Cross-chain notables</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Public, descriptive callouts from the latest published chain snapshots.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        {items.map((item) => (
          <article key={item.title} className="rounded-xl border border-border bg-background/70 p-4">
            <div className="text-sm font-medium text-foreground">{item.title}</div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
