// src/components/site/PageHero.tsx
import type { ReactNode } from "react";

type PageHeroProps = {
  eyebrow?: string;
  title: string;
  highlight?: string;
  summary: string;
  children?: ReactNode;
  actions?: ReactNode;
  className?: string;
  contentClassName?: string;
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function PageHero({
  eyebrow,
  title,
  highlight,
  summary,
  children,
  actions,
  className,
  contentClassName,
}: PageHeroProps) {
  return (
    <section
      className={cx(
        "relative isolate overflow-hidden bg-[#031329] text-white",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_8%,rgba(44,109,255,0.12),transparent_28%),radial-gradient(circle_at_82%_18%,rgba(47,115,255,0.15),transparent_26%),linear-gradient(180deg,#031329_0%,#041327_100%)]" />

      <div className="relative mx-auto w-full max-w-[1180px] px-6 pb-14 pt-[120px] sm:px-8 md:pb-16 md:pt-[130px] lg:px-10 lg:pb-20 lg:pt-[140px]">
        <div className={cx("max-w-[860px]", contentClassName)}>
          {eyebrow ? (
            <div className="mb-4 text-[12px] font-black uppercase tracking-[0.18em] text-blue-300/85">
              {eyebrow}
            </div>
          ) : null}

          <h1 className="text-[42px] font-black leading-[0.98] tracking-[-0.055em] text-white sm:text-[52px] lg:text-[64px]">
            {title}
            {highlight ? (
              <span className="block text-[#2f7cff]">{highlight}</span>
            ) : null}
          </h1>

          <p className="mt-6 max-w-[820px] text-[19px] font-semibold leading-8 text-white/86 sm:text-[21px]">
            {summary}
          </p>

          {actions ? (
            <div className="mt-8 flex flex-wrap items-center gap-4">
              {actions}
            </div>
          ) : null}

          {children ? <div className="mt-8">{children}</div> : null}
        </div>
      </div>
    </section>
  );
}