"use client";

import Image from "next/image";
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

const CLERK_CONFIGURED = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

function navLinkClass(active: boolean) {
  return [
    "inline-flex h-10 items-center whitespace-nowrap rounded-full px-4 text-sm font-extrabold transition-colors",
    active
      ? "border border-cyan-300/35 bg-cyan-300/12 text-white"
      : "text-white/88 hover:bg-white/[0.06] hover:text-white",
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
    ? "inline-flex items-center justify-center rounded-xl border border-cyan-300/30 bg-cyan-300/12 px-4 py-3 text-sm font-extrabold text-white"
    : "inline-flex h-11 items-center whitespace-nowrap rounded-full border border-cyan-300/30 bg-cyan-300/12 px-6 text-sm font-extrabold text-white transition hover:bg-cyan-300/18";

  const secondaryClass = mobile
    ? "inline-flex items-center justify-center rounded-xl border border-white/14 bg-white/[0.04] px-4 py-3 text-sm font-extrabold text-white"
    : "inline-flex h-11 items-center whitespace-nowrap rounded-full border border-white/14 bg-white/[0.04] px-6 text-sm font-extrabold text-white transition hover:bg-white/[0.08]";

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

function Brand({ onClick }: { onClick: () => void }) {
  return (
    <Link
      href="/"
      onClick={onClick}
      className="inline-flex min-w-0 shrink-0 items-center gap-2.5 text-white transition hover:opacity-90"
      aria-label="Urd Atlas home"
    >
      <span className="inline-flex min-w-0 items-baseline">
        <span className="text-[23px] font-black uppercase tracking-[-0.045em] text-white">
          URD
        </span>
        <span className="ml-1.5 text-[23px] font-black uppercase tracking-[-0.045em] text-blue-400">
          ATLAS
        </span>
      </span>
      <span className="relative inline-flex h-8 w-8 shrink-0 opacity-65" aria-hidden="true">
        <Image
          src="/web-bilder/ygg-transparent.png"
          alt=""
          fill
          sizes="32px"
          className="object-contain"
          priority
        />
      </span>
    </Link>
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
    <header className="fixed inset-x-0 top-0 z-[120] border-b border-white/10 bg-[#031329]/96 text-white shadow-[0_10px_32px_rgba(0,0,0,0.22)] backdrop-blur-md">
      <div className="mx-auto flex min-h-[86px] w-full max-w-[1360px] items-center justify-between gap-5 px-5 py-5 sm:px-7 lg:px-8">
        <div className="flex min-w-0 items-center gap-5 xl:gap-8">
          <Brand onClick={closeMenus} />

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
                <span className="ml-2 text-xs text-white/55">▾</span>
              </button>

              {chainsOpen ? (
                <div
                  role="menu"
                  aria-label="Chains"
                  className="absolute left-0 top-12 z-[130] min-w-[260px] rounded-2xl border border-white/10 bg-[#07111d]/98 p-2 shadow-[0_22px_60px_rgba(0,0,0,0.45)] backdrop-blur-md"
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
                className="inline-flex h-11 items-center whitespace-nowrap rounded-full border border-cyan-300/30 bg-cyan-300/12 px-6 text-sm font-extrabold text-white transition hover:bg-cyan-300/18"
              >
                Dashboard
              </Link>
              <Link
                href="/sign-in"
                className="inline-flex h-11 items-center whitespace-nowrap rounded-full border border-white/14 bg-white/[0.04] px-6 text-sm font-extrabold text-white transition hover:bg-white/[0.08]"
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
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/14 bg-white/[0.04] text-lg text-white transition hover:bg-white/[0.08] xl:hidden"
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
                    className="inline-flex items-center justify-center rounded-xl border border-cyan-300/30 bg-cyan-300/12 px-4 py-3 text-sm font-extrabold text-white"
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/sign-in"
                    onClick={closeMenus}
                    className="inline-flex items-center justify-center rounded-xl border border-white/14 bg-white/[0.04] px-4 py-3 text-sm font-extrabold text-white"
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
