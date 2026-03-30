type SurfaceStatusItem = {
  title: string;
  body: string;
};

type SurfaceStatusProps = {
  items: SurfaceStatusItem[];
};

export default function SurfaceStatus({ items }: SurfaceStatusProps) {
  if (items.length === 0) return null;

  return (
    <section className="mt-10">
      <div>
        <div className="text-xs font-medium uppercase tracking-[0.14em] text-cyan-200">
          Surface status
        </div>
        <h2 className="mt-1 text-3xl font-semibold">Operational highlights</h2>
        <p className="mt-2 max-w-4xl text-sm leading-7 text-muted-foreground">
          Current conditions derived automatically from the latest published surface.
        </p>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        {items.map((item, i) => (
          <div key={i} className="rounded-3xl border p-5 shadow-sm">
            <div className="text-xs font-medium uppercase tracking-[0.14em] text-cyan-200">
              Surface note {i + 1}
            </div>
            <h3 className="mt-2 text-base font-semibold text-white">{item.title}</h3>
            <p className="mt-3 text-sm leading-7 text-slate-300">{item.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
