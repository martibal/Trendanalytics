"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton, useAuth } from "@clerk/nextjs";
import { useEffect, useRef, useState } from "react";

import { CHAIN_LIST } from "@/config/chains";

const DESKTOP_ITEMS = [
  { href: "/status", label: "Status" },
  { href: "/track-record", label: "Track Record" },
  { href: "/thresholds", label: "Thresholds" },
  { href: "/glossary", label: "Glossary" },
  { href: "/api-docs", label: "API Docs" },
  { href: "/methodology", label: "Methodology" },
  { href: "/about", label: "About" },
  { href: "/faq", label: "FAQ" },
] as const;


const HOME_ITEMS = [
  { href: "/chains", label: "Chains" },
  { href: "/status", label: "Status" },
  { href: "/track-record", label: "Track Record" },
  { href: "/thresholds", label: "Thresholds" },
  { href: "/glossary", label: "Glossary" },
  { href: "/api-docs", label: "API Docs" },
  { href: "/methodology", label: "Methodology" },
  { href: "/about", label: "About" },
  { href: "/faq", label: "FAQ" },
] as const;

const CLERK_CONFIGURED = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

function navLinkClass(active: boolean) {
  return [
    "inline-flex h-10 items-center rounded-full px-4 text-sm font-medium transition-colors",
    active
      ? "border border-cyan-400/20 bg-cyan-400/10 text-white"
      : "text-slate-300 hover:bg-white/[0.05] hover:text-white",
  ].join(" ");
}

function AuthAwareActions({
  mobile = false,
  onNavigate,
}: {
  mobile?: boolean;
  onNavigate?: () => void;
}) {
  const { isLoaded, isSignedIn } = useAuth();

  const dashboardClass = mobile
    ? "inline-flex items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm font-semibold text-white"
    : "inline-flex h-11 items-center rounded-full border border-cyan-400/20 bg-cyan-400/10 px-5 text-sm font-semibold text-white transition hover:bg-cyan-400/16";

  const secondaryClass = mobile
    ? "inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-slate-200"
    : "inline-flex h-11 items-center rounded-full border border-white/10 bg-white/[0.03] px-5 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.06]";

  if (!isLoaded) {
    return <span className={secondaryClass}>Account</span>;
  }

  if (!isSignedIn) {
    return (
      <>
        <Link href="/dashboard" className={dashboardClass} onClick={onNavigate}>
          Dashboard
        </Link>
        <Link href="/sign-in" className={secondaryClass} onClick={onNavigate}>
          Log in
        </Link>
      </>
    );
  }

  return (
    <>
      <Link href="/dashboard" className={dashboardClass} onClick={onNavigate}>
        Dashboard
      </Link>
      <SignOutButton redirectUrl="/">
        <button type="button" className={secondaryClass} onClick={onNavigate}>
          Log out
        </button>
      </SignOutButton>
    </>
  );
}

function SiteNavbarInner({ pathname }: { pathname: string | null }) {
  const [chainsOpen, setChainsOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const chainsRef = useRef<HTMLDivElement | null>(null);

  const isChainsActive = pathname === "/chains" || pathname?.startsWith("/chains/");

  function closeMenus() {
    setChainsOpen(false);
    setMobileOpen(false);
  }

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!chainsRef.current) return;
      if (!chainsRef.current.contains(event.target as Node)) {
        setChainsOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeMenus();
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  if (pathname === "/") {
    return (
      <header className="absolute inset-x-0 top-0 z-[80] bg-transparent text-white">
        <div className="relative mx-auto flex h-[86px] w-full max-w-[1128px] items-end justify-between gap-5 px-5 pb-5 pt-10 sm:px-7 lg:px-8">
          <Link
            href="/"
            onClick={closeMenus}
            className="inline-flex min-w-0 items-baseline text-white transition hover:opacity-90"
            aria-label="Urd Atlas home"
          >
            <span className="text-[21px] font-black uppercase tracking-[-0.04em]">
              URD
            </span>
            <span className="ml-1.5 text-[21px] font-black uppercase tracking-[-0.04em] text-blue-400">
              ATLAS
            </span>
          </Link>

            <nav aria-label="Primary" className="hidden items-center gap-8 md:flex">
              {HOME_ITEMS.map((item) => {
                if (item.href === "/chains") {
                  return (
                    <div key={item.href} ref={chainsRef} className="relative">
                      <button
                        type="button"
                        aria-haspopup="menu"
                        aria-expanded={chainsOpen}
                        onClick={() => setChainsOpen((prev) => !prev)}
                        className="inline-flex items-center text-[12px] font-extrabold text-white/90 transition hover:text-white"
                      >
                        Chains
                        <span className="ml-1.5 text-[10px] text-white/55">▾</span>
                      </button>

                      {chainsOpen ? (
                        <div
                          role="menu"
                          aria-label="Chains"
                          className="absolute left-0 top-8 z-[120] min-w-[250px] rounded-2xl border border-white/10 bg-[#07111d]/98 p-2 shadow-[0_22px_60px_rgba(0,0,0,0.45)] backdrop-blur-md"
                        >
                          <Link
                            href="/chains"
                            onClick={closeMenus}
                            className="block rounded-xl px-3 py-2.5 text-sm font-medium text-white transition hover:bg-white/[0.05]"
                          >
                            All chains overview
                          </Link>
                          <div className="my-2 h-px bg-white/8" />
                          {CHAIN_LIST.map((chain) => (
                            <Link
                              key={chain.id}
                              href={`/chains/${chain.id}`}
                              onClick={closeMenus}
                              className="block rounded-xl px-3 py-2.5 text-sm text-slate-300 transition hover:bg-white/[0.05] hover:text-white"
                            >
                              {chain.label} · {chain.name}
                            </Link>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                }

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeMenus}
                    className="text-[12px] font-extrabold text-white/90 transition hover:text-white"
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

          <div className="hidden items-center gap-3 sm:flex">
            <Link
              href="/dashboard"
              className="inline-flex h-10 items-center rounded-[8px] bg-blue-600 px-5 text-[12px] font-extrabold text-white shadow-[0_12px_26px_rgba(37,99,235,0.28)] transition hover:bg-blue-700"
            >
              Dashboard
            </Link>
          </div>

          <button
            type="button"
            aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((prev) => !prev)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-[8px] border border-white/12 bg-white/[0.04] text-lg text-white transition hover:bg-white/[0.08] sm:hidden"
          >
            {mobileOpen ? "✕" : "☰"}
          </button>
        </div>

        {mobileOpen ? (
          <div className="relative border-t border-white/8 bg-[#031329] px-5 pb-5 sm:hidden">
            <div className="grid gap-2">
              {HOME_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeMenus}
                  className="rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.05] hover:text-white"
                >
                  {item.label}
                </Link>
              ))}
              <Link
                href="/dashboard"
                onClick={closeMenus}
                className="mt-2 inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-3 text-sm font-extrabold text-white"
              >
                Dashboard
              </Link>
            </div>
          </div>
        ) : null}
      </header>
    );
  }

  return (
    <header className="absolute inset-x-0 top-0 z-[80] bg-transparent text-white">
      <div className="mx-auto flex h-16 w-full items-center justify-between gap-4 px-6 sm:px-8 xl:px-12 2xl:px-16">
        <div className="flex min-w-0 items-center gap-3 xl:gap-8">
          <Link
            href="/"
            onClick={closeMenus}
            className="inline-flex min-w-0 items-center gap-3 rounded-full px-1 py-1 text-white transition hover:opacity-90"
          >
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-cyan-400/20 bg-cyan-400/10 text-sm font-black text-cyan-300">
              UA
            </span>
            <span className="truncate text-xl font-semibold tracking-[-0.03em]">Urd Atlas</span>
          </Link>

          <nav aria-label="Primary" className="hidden items-center gap-1 xl:flex">
            <div ref={chainsRef} className="relative">
              <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={chainsOpen}
                onClick={() => setChainsOpen((prev) => !prev)}
                className={navLinkClass(Boolean(isChainsActive))}
              >
                Chains
                <span className="ml-2 text-xs text-slate-500">▾</span>
              </button>

              {chainsOpen ? (
                <div
                  role="menu"
                  aria-label="Chains"
                  className="absolute left-0 top-12 min-w-[260px] rounded-2xl border border-white/10 bg-[#07111d]/96 p-2 shadow-[0_22px_60px_rgba(0,0,0,0.45)] backdrop-blur-md"
                >
                  <Link
                    href="/chains"
                    onClick={closeMenus}
                    className="block rounded-xl px-3 py-2.5 text-sm font-medium text-white transition hover:bg-white/[0.05]"
                  >
                    All chains overview
                  </Link>
                  <div className="my-2 h-px bg-white/8" />
                  {CHAIN_LIST.map((chain) => (
                    <Link
                      key={chain.id}
                      href={`/chains/${chain.id}`}
                      onClick={closeMenus}
                      className="block rounded-xl px-3 py-2.5 text-sm text-slate-300 transition hover:bg-white/[0.05] hover:text-white"
                    >
                      {chain.label} · {chain.name}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>

            {DESKTOP_ITEMS.map((item) => {
              const active = pathname === item.href || pathname?.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeMenus}
                  className={navLinkClass(Boolean(active))}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="hidden items-center gap-3 xl:flex">
          {CLERK_CONFIGURED ? (
            <AuthAwareActions />
          ) : (
            <>
              <Link
                href="/dashboard"
                className="inline-flex h-11 items-center rounded-full border border-cyan-400/20 bg-cyan-400/10 px-5 text-sm font-semibold text-white transition hover:bg-cyan-400/16"
              >
                Dashboard
              </Link>
              <Link
                href="/sign-in"
                className="inline-flex h-11 items-center rounded-full border border-white/10 bg-white/[0.03] px-5 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.06]"
              >
                Log in
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((prev) => !prev)}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-lg text-white transition hover:bg-white/[0.06] xl:hidden"
        >
          {mobileOpen ? "✕" : "☰"}
        </button>
      </div>

      {mobileOpen ? (
        <div className="border-t border-white/8 bg-[#06101b]/98 xl:hidden">
          <div className="mx-auto flex w-full flex-col gap-3 px-6 py-4 sm:px-8">
            <Link href="/chains" onClick={closeMenus} className={navLinkClass(Boolean(isChainsActive))}>
              Chains overview
            </Link>

            <div className="grid gap-2 rounded-2xl border border-white/10 bg-white/[0.02] p-3">
              {CHAIN_LIST.map((chain) => (
                <Link
                  key={chain.id}
                  href={`/chains/${chain.id}`}
                  onClick={closeMenus}
                  className="rounded-xl px-3 py-2.5 text-sm text-slate-300 transition hover:bg-white/[0.05] hover:text-white"
                >
                  {chain.label} · {chain.name}
                </Link>
              ))}
            </div>

            {DESKTOP_ITEMS.map((item) => {
              const active = pathname === item.href || pathname?.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeMenus}
                  className={navLinkClass(Boolean(active))}
                >
                  {item.label}
                </Link>
              );
            })}

            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              {CLERK_CONFIGURED ? (
                <AuthAwareActions mobile onNavigate={closeMenus} />
              ) : (
                <>
                  <Link
                    href="/dashboard"
                    onClick={closeMenus}
                    className="inline-flex items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm font-semibold text-white"
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/sign-in"
                    onClick={closeMenus}
                    className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-slate-200"
                  >
                    Log in
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}

export default function SiteNavbar() {
  const pathname = usePathname();
  return <SiteNavbarInner pathname={pathname} />;
}