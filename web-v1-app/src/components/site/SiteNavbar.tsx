"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { useEffect, useMemo, useRef, useState } from "react";
import { CHAIN_LIST } from "@/config/chains";
import { useTheme } from "@/components/site/ThemeProvider";

const DESKTOP_ITEMS = [
  { href: "/glossary", label: "Glossary" },
  { href: "/track-record", label: "Track Record" },
  { href: "/thresholds", label: "Thresholds" },
  { href: "/api-docs", label: "API Docs" },
  { href: "/status", label: "Status" },
  { href: "/faq", label: "Q&A" },
  { href: "/about", label: "About" },
] as const;

const CLERK_CONFIGURED = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

function navLinkClass(active: boolean) {
  return [
    "inline-flex h-9 items-center rounded-lg px-3 text-sm transition-colors",
    active
      ? "bg-muted text-foreground"
      : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
  ].join(" ");
}

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      className="inline-flex h-9 min-w-[108px] items-center justify-center rounded-lg border border-border bg-background px-3 text-sm text-foreground transition hover:bg-muted"
    >
      {theme === "dark" ? "Light mode" : "Dark mode"}
    </button>
  );
}

function AuthAwareLink({
  mobile = false,
  onNavigate,
}: {
  mobile?: boolean;
  onNavigate?: () => void;
}) {
  const { isLoaded, isSignedIn } = useAuth();

  const baseClass = mobile
    ? "rounded-lg px-3 py-2 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground"
    : "inline-flex h-9 items-center rounded-lg border border-border bg-background px-3 text-sm text-foreground transition hover:bg-muted";

  if (!isLoaded) {
    return <span className={baseClass}>Account</span>;
  }

  return (
    <Link
      href={isSignedIn ? "/dashboard" : "/sign-in"}
      className={baseClass}
      onClick={onNavigate}
    >
      {isSignedIn ? "Dashboard" : "Sign In"}
    </Link>
  );
}

function SiteNavbarInner({ pathname }: { pathname: string | null }) {
  const [chainsOpen, setChainsOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const chainsRef = useRef<HTMLDivElement | null>(null);

  const isChainsActive = useMemo(
    () => pathname === "/chains" || pathname?.startsWith("/chains/"),
    [pathname]
  );

  function closeMenus() {
    setChainsOpen(false);
    setMobileOpen(false);
  }

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!chainsRef.current) {
        return;
      }

      if (!chainsRef.current.contains(event.target as Node)) {
        setChainsOpen(false);
      }
    }

    function onEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeMenus();
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onEscape);

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onEscape);
    };
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-border/80 bg-background/92 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-2 sm:gap-5">
          <Link
            href="/"
            onClick={closeMenus}
            className="inline-flex items-center gap-2 rounded-lg px-1 py-1 text-sm font-semibold tracking-wide text-foreground hover:opacity-85"
          >
            <span className="inline-flex size-7 items-center justify-center rounded-full border border-border bg-card text-xs font-bold text-primary">
              UA
            </span>
            <span className="truncate">Urd Atlas</span>
          </Link>

          <nav aria-label="Primary" className="hidden items-center gap-1 lg:flex">
            <div ref={chainsRef} className="relative">
              <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={chainsOpen}
                onClick={() => setChainsOpen((prev) => !prev)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setChainsOpen((prev) => !prev);
                  }
                  if (event.key === "Escape") {
                    setChainsOpen(false);
                  }
                }}
                className={navLinkClass(Boolean(isChainsActive))}
              >
                Chains
                <span className="ml-2 text-xs text-muted-foreground">▾</span>
              </button>

              {chainsOpen ? (
                <div
                  role="menu"
                  aria-label="Chains"
                  className="absolute left-0 top-11 min-w-[220px] rounded-xl border border-border bg-popover p-2 shadow-lg"
                >
                  <Link
                    href="/chains"
                    onClick={closeMenus}
                    className="block rounded-lg px-3 py-2 text-sm text-foreground transition hover:bg-muted"
                  >
                    All chains overview
                  </Link>

                  <div className="my-2 h-px bg-border" />

                  {CHAIN_LIST.map((chain) => (
                    <Link
                      key={chain.id}
                      href={`/chains/${chain.id}`}
                      onClick={closeMenus}
                      className="block rounded-lg px-3 py-2 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground"
                    >
                      {chain.label} · {chain.name}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>

            {DESKTOP_ITEMS.map((item) => {
              const active =
                pathname === item.href || pathname?.startsWith(`${item.href}/`);

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

        <div className="hidden items-center gap-3 lg:flex">
          <ThemeToggle />
          {CLERK_CONFIGURED ? (
            <AuthAwareLink />
          ) : (
            <Link
              href="/sign-in"
              className="inline-flex h-9 items-center rounded-lg border border-border bg-background px-3 text-sm text-foreground transition hover:bg-muted"
            >
              Sign In
            </Link>
          )}
        </div>

        <button
          type="button"
          aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((prev) => !prev)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-background text-sm text-foreground transition hover:bg-muted lg:hidden"
        >
          {mobileOpen ? "✕" : "☰"}
        </button>
      </div>

      {mobileOpen ? (
        <div className="border-t border-border bg-background lg:hidden">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-4 py-4 sm:px-6 lg:px-8">
            <Link
              href="/chains"
              onClick={closeMenus}
              className={navLinkClass(Boolean(isChainsActive))}
            >
              Chains overview
            </Link>

            <div className="grid gap-2 rounded-xl border border-border bg-card p-3">
              {CHAIN_LIST.map((chain) => (
                <Link
                  key={chain.id}
                  href={`/chains/${chain.id}`}
                  onClick={closeMenus}
                  className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground"
                >
                  {chain.label} · {chain.name}
                </Link>
              ))}
            </div>

            {DESKTOP_ITEMS.map((item) => {
              const active =
                pathname === item.href || pathname?.startsWith(`${item.href}/`);

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

            <div className="mt-2 flex flex-wrap items-center gap-3">
              <ThemeToggle />
              {CLERK_CONFIGURED ? (
                <AuthAwareLink mobile onNavigate={closeMenus} />
              ) : (
                <Link
                  href="/sign-in"
                  onClick={closeMenus}
                  className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground"
                >
                  Sign In
                </Link>
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

  return <SiteNavbarInner key={pathname ?? "root"} pathname={pathname} />;
}