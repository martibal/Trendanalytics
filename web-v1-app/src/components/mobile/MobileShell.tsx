import Link from "next/link";
import type { ReactNode } from "react";

import MobileBottomNav from "@/components/mobile/MobileBottomNav";
import MobileRouteMenu from "@/components/mobile/MobileRouteMenu";

export type MobileActiveKey =
  | "overview"
  | "btc"
  | "eth"
  | "arb"
  | "base"
  | "api"
  | "methodology"
  | "wiki"
  | "track-record"
  | "plans"
  | "dashboard";

export function MobilePage({
  active = "overview",
  eyebrow,
  title,
  subtitle,
  children,
  backHref,
  backLabel = "Back",
  actions,
}: {
  active?: MobileActiveKey | string;
  eyebrow: string;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  backHref?: string;
  backLabel?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#050d18] text-[#eef7ff]">
      <div className="min-h-screen bg-[radial-gradient(circle_at_18%_-8%,rgba(96,165,250,0.22),transparent_18rem),radial-gradient(circle_at_92%_6%,rgba(196,146,48,0.14),transparent_16rem),linear-gradient(180deg,#061322_0%,#08182a_46%,#071321_100%)] pb-[calc(env(safe-area-inset-bottom)+96px)]">
        <header className="sticky top-0 z-40 border-b border-white/10 bg-[#061322]/88 px-4 pt-[calc(env(safe-area-inset-top)+10px)] shadow-[0_14px_44px_rgba(0,0,0,0.24)] backdrop-blur-xl">
          <div className="flex min-h-11 items-center justify-between gap-3 pb-3">
            <div className="flex min-w-0 items-center gap-3">
              {backHref ? (
                <Link
                  href={backHref}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/12 bg-white/[0.07] text-[17px] font-black text-white active:scale-[0.98]"
                  aria-label={backLabel}
                >
                  ←
                </Link>
              ) : (
                <Link
                  href="/mobile"
                  className="inline-flex min-w-0 items-center gap-2 text-white no-underline"
                  aria-label="Urd Atlas mobile home"
                >
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[#c49230]/38 bg-[#c49230]/12 text-[13px] font-black text-[#f5d386] shadow-[0_0_24px_rgba(196,146,48,0.18)]">
                    UA
                  </span>
                  <span className="truncate text-[18px] font-black tracking-[-0.045em]">
                    Urd Atlas
                  </span>
                </Link>
              )}
            </div>

            <MobileRouteMenu />
          </div>
        </header>

        <main className="px-4">
          <section className="pt-7 pb-5">
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[#c49230]">
              {eyebrow}
            </div>
            <h1 className="mt-2 max-w-[420px] text-[34px] font-black leading-[0.98] tracking-[-0.07em] text-white">
              {title}
            </h1>
            {subtitle ? (
              <div className="mt-3 max-w-[450px] text-[14px] font-semibold leading-6 text-[#cfe0f4]">
                {subtitle}
              </div>
            ) : null}
            {actions ? <div className="mt-4">{actions}</div> : null}
          </section>

          <div className="space-y-5">{children}</div>
        </main>

        <MobileBottomNav active={active} />
      </div>
    </div>
  );
}

export function MobileSection({
  eyebrow,
  title,
  children,
  id,
}: {
  eyebrow?: string;
  title?: ReactNode;
  children: ReactNode;
  id?: string;
}) {
  return (
    <section id={id} className="scroll-mt-28">
      {(eyebrow || title) ? (
        <div className="mb-3">
          {eyebrow ? (
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[#91b8db]">
              {eyebrow}
            </div>
          ) : null}
          {title ? (
            <h2 className="mt-1 text-[22px] font-black leading-[1.03] tracking-[-0.055em] text-white">
              {title}
            </h2>
          ) : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function MobileCard({
  children,
  className = "",
  tone = "default",
}: {
  children: ReactNode;
  className?: string;
  tone?: "default" | "gold" | "blue" | "warning";
}) {
  const toneClass =
    tone === "gold"
      ? "border-[#c49230]/32 bg-[#c49230]/10"
      : tone === "blue"
        ? "border-sky-300/22 bg-sky-300/[0.075]"
        : tone === "warning"
          ? "border-amber-300/28 bg-amber-300/[0.08]"
          : "border-white/12 bg-white/[0.065]";
  return (
    <article
      className={[
        "rounded-[24px] border p-4 shadow-[0_22px_64px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.075)]",
        toneClass,
        className,
      ].join(" ")}
    >
      {children}
    </article>
  );
}

export function MobilePill({
  children,
  tone = "blue",
}: {
  children: ReactNode;
  tone?: "blue" | "gold" | "green" | "red" | "gray";
}) {
  const toneClass =
    tone === "gold"
      ? "border-[#c49230]/36 bg-[#c49230]/12 text-[#f5d386]"
      : tone === "green"
        ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-100"
        : tone === "red"
          ? "border-red-300/30 bg-red-300/10 text-red-100"
          : tone === "gray"
            ? "border-slate-200/18 bg-white/[0.06] text-slate-200"
            : "border-sky-300/28 bg-sky-300/10 text-sky-100";
  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${toneClass}`}>
      {children}
    </span>
  );
}

export function MobileMetric({
  label,
  value,
  sub,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/[0.12] p-3">
      <div className="text-[9px] font-black uppercase tracking-[0.16em] text-[#91a9c4]">
        {label}
      </div>
      <div className="mt-1 text-[18px] font-black leading-none text-white">{value}</div>
      {sub ? <div className="mt-1 text-[10px] leading-4 text-[#9eb4cf]">{sub}</div> : null}
    </div>
  );
}

export function MobileTextLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className="font-black text-[#f5d386] underline decoration-[#c49230]/35 underline-offset-4">
      {children}
    </Link>
  );
}

export function MobilePrimaryLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl border border-[#c49230]/38 bg-[#c49230] px-4 text-[13px] font-black text-[#061322] shadow-[0_18px_44px_rgba(196,146,48,0.20)] active:scale-[0.99]"
    >
      {children}
    </Link>
  );
}
