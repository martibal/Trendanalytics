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
  { href: "/faq", label: "FAQ" },
  { href: "/api-docs", label: "API Docs" },
  { href: "/methodology", label: "Methodology" },
] as const;

const CLERK_CONFIGURED = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

function navLinkClass(active: boolean) {
  return [
    "inline-flex h-10 items-center rounded-full px-4 text-sm font-medium transition-colors whitespace-nowrap",
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
    : "inline-flex h-11 items-center justify-center whitespace-nowrap rounded-full border border-cyan-400/20 bg-cyan-400/10 px-6 text-sm font-semibold text-white transition hover:bg-cyan-400/16";

  const secondaryClass = mobile
    ? "inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-slate-200"
    : "inline-flex h-11 items-center justify-center whitespace-nowrap rounded-full border border-white/10 bg-white/[0.03] px-6 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.06]";

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

  return (
    <header className="sticky inset-x-0 top-0 z-[80] border-b border-white/10 bg-[#031329] text-white shadow-[0_12px_30px_rgba(3,19,41,0.18)]">
      <div className="mx-auto flex h-[76px] w-full items-center gap-6 px-6 sm:px-8 xl:px-12 2xl:px-16">
        <Link
          href="/"
          onClick={closeMenus}
          className="inline-flex min-w-0 shrink-0 items-center gap-2 text-white transition hover:opacity-90"
          aria-label="Urd Atlas home"
        >
          <span className="inline-flex items-baseline whitespace-nowrap">
            <span className="text-[21px] font-black uppercase tracking-[-0.04em] text-white">
              URD
            </span>
            <span className="ml-1.5 text-[21px] font-black uppercase tracking-[-0.04em] text-blue-400">
              ATLAS
            </span>
          </span>
          <img
            src="/web-bilder/ygg-transparent.png"
            alt=""
            aria-hidden="true"
            className="h-10 w-10 shrink-0 object-contain opacity-70"
          />
        </Link>

        <nav aria-label="Primary" className="hidden min-w-0 flex-1 items-center gap-1 xl:flex">
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

        <div className="ml-auto hidden shrink-0 items-center gap-3 pl-10 xl:flex 2xl:pl-16">
          {CLERK_CONFIGURED ? (
            <AuthAwareActions />
          ) : (
            <>
              <Link
                href="/dashboard"
                className="inline-flex h-11 items-center justify-center whitespace-nowrap rounded-full border border-cyan-400/20 bg-cyan-400/10 px-6 text-sm font-semibold text-white transition hover:bg-cyan-400/16"
              >
                Dashboard
              </Link>
              <Link
                href="/sign-in"
                className="inline-flex h-11 items-center justify-center whitespace-nowrap rounded-full border border-white/10 bg-white/[0.03] px-6 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.06]"
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
          className="ml-auto inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-lg text-white transition hover:bg-white/[0.06] xl:hidden"
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

  if (pathname?.startsWith("/mobile")) {
    return null;
  }

  return <SiteNavbarInner pathname={pathname} />;
}
