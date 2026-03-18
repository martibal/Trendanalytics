// src/components/Nav.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = { href: string; label: string };

const PRIMARY: Item[] = [
  { href: "/", label: "Overview" },
  { href: "/chains", label: "Chains" },
  { href: "/notables", label: "Notables" },
  { href: "/methodology", label: "Methodology" },
  { href: "/wiki", label: "Wiki" },
  { href: "/about", label: "About" },
  // Keep discoverable in UI
  { href: "/how-to/custom-thresholds", label: "Custom thresholds" },
];

const CHAINS: Item[] = [
  { href: "/chains/bitcoin", label: "Bitcoin" },
  { href: "/chains/ethereum", label: "Ethereum" },
  { href: "/chains/arbitrum", label: "Arbitrum" },
  { href: "/chains/base", label: "Base" },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

function NavLink({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={[
        // HTML parity: mono chips, subtle borders, small radius (not fully rounded)
        "ui-lift rounded-md border px-2.5 py-1 font-mono text-[11px] font-semibold tracking-wide transition",
        active
          ? "border-ui-border-soft bg-ui-surface2 text-ui-text"
          : "border-ui-border bg-ui-bg/15 text-ui-muted hover:border-ui-border-soft hover:bg-ui-bg/20 hover:text-ui-text",
      ].join(" ")}
    >
      {label}
    </Link>
  );
}

export default function Nav() {
  const pathname = usePathname() || "/";

  return (
    <header className="sticky top-0 z-50 border-b border-ui-border bg-ui-bg/40 backdrop-blur">
      <div className="mx-auto w-full max-w-6xl px-4 py-3">
        {/* Row 1: Brand + primary nav */}
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <div className="mr-1 flex items-baseline gap-2">
              <div className="font-mono text-[11px] font-semibold uppercase tracking-wide text-ui-faint">
                Trend context
              </div>
              <div className="hidden text-[11px] text-ui-faint md:block">·</div>
              <div className="hidden text-[11px] text-ui-faint md:block">
                Descriptive-only · No prices · No forecasts · No advice
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {PRIMARY.map((it) => (
                <NavLink
                  key={it.href}
                  href={it.href}
                  label={it.label}
                  active={isActive(pathname, it.href)}
                />
              ))}
            </div>
          </div>

          {/* Compact guardrails (mobile-friendly) */}
          <div className="text-[11px] text-ui-faint md:hidden">
            Descriptive-only · No prices · No forecasts · No advice
          </div>
        </div>

        {/* Row 2: chain quick links */}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <div className="mr-1 font-mono text-[11px] font-semibold uppercase tracking-wide text-ui-faint">
            Chains
          </div>

          {CHAINS.map((it) => (
            <NavLink
              key={it.href}
              href={it.href}
              label={it.label}
              active={isActive(pathname, it.href)}
            />
          ))}
        </div>
      </div>
    </header>
  );
}