// src/proxy.ts
// Clerk middleware + mobile redirect layer
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/api/v1/keys(.*)",
]);

const hasClerkKeys =
  Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) &&
  Boolean(process.env.CLERK_SECRET_KEY);

const DESKTOP_VIEW_COOKIE = "ua_view";

function isMobileRequest(req: Request & { headers: Headers }) {
  const ua = req.headers.get("user-agent")?.toLowerCase() ?? "";
  const chMobile = req.headers.get("sec-ch-ua-mobile");
  return (
    chMobile === "?1" ||
    /android|iphone|ipod|blackberry|iemobile|opera mini|mobile/.test(ua)
  );
}

function mapToMobilePath(pathname: string): string | null {
  if (pathname.startsWith("/mobile")) return null;
  if (pathname === "/") return "/mobile";

  const chainMatch = pathname.match(/^\/chains\/(bitcoin|ethereum|arbitrum|base)$/);
  if (chainMatch) return `/mobile/chain/${chainMatch[1]}`;

  if (pathname === "/track-record") return "/mobile/track-record";
  if (pathname === "/methodology") return "/mobile/methodology";
  if (pathname === "/glossary" || pathname === "/faq") return "/mobile/wiki";
  if (pathname === "/about") return "/mobile/methodology";
  if (pathname === "/status") return "/mobile/track-record";
  if (pathname.startsWith("/api-docs")) return "/mobile/wiki";
  if (pathname === "/thresholds") return "/mobile/methodology";

  // Keep auth/dashboard/other flows on desktop unless explicitly rebuilt.
  if (
    pathname.startsWith("/sign-in") ||
    pathname.startsWith("/sign-up") ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/api/")
  ) {
    return null;
  }

  // Default mobile fallback for public brochure routes.
  return "/mobile";
}

const proxyHandler = hasClerkKeys
  ? clerkMiddleware(async (auth, req) => {
      const url = req.nextUrl;
      const pathname = url.pathname;
      const requestedView = url.searchParams.get("view");
      const desktopCookie = req.cookies.get(DESKTOP_VIEW_COOKIE)?.value === "desktop";

      if (requestedView === "desktop") {
        const cleanUrl = new URL(req.url);
        cleanUrl.searchParams.delete("view");
        const res = NextResponse.redirect(cleanUrl);
        res.cookies.set(DESKTOP_VIEW_COOKIE, "desktop", {
          path: "/",
          maxAge: 60 * 60 * 24 * 30,
          sameSite: "lax",
        });
        return res;
      }

      if (requestedView === "mobile") {
        const cleanUrl = new URL(req.url);
        cleanUrl.searchParams.delete("view");
        const mobilePath = mapToMobilePath(pathname) ?? "/mobile";
        cleanUrl.pathname = mobilePath;
        const res = NextResponse.redirect(cleanUrl);
        res.cookies.delete(DESKTOP_VIEW_COOKIE);
        return res;
      }

      if (!desktopCookie && isMobileRequest(req)) {
        const mobilePath = mapToMobilePath(pathname);
        if (mobilePath && mobilePath !== pathname) {
          const target = new URL(req.url);
          target.pathname = mobilePath;
          return NextResponse.redirect(target);
        }
      }

      if (isProtectedRoute(req)) {
        await auth.protect();
      }
    })
  : function proxy(req: Request & { nextUrl: URL; headers: Headers; cookies: { get: (name: string) => { value?: string } | undefined } }) {
      const url = req.nextUrl;
      const pathname = url.pathname;
      const requestedView = url.searchParams.get("view");
      const desktopCookie = req.cookies.get(DESKTOP_VIEW_COOKIE)?.value === "desktop";

      if (requestedView === "desktop") {
        const cleanUrl = new URL(req.url);
        cleanUrl.searchParams.delete("view");
        const res = NextResponse.redirect(cleanUrl);
        res.cookies.set(DESKTOP_VIEW_COOKIE, "desktop", {
          path: "/",
          maxAge: 60 * 60 * 24 * 30,
          sameSite: "lax",
        });
        return res;
      }

      if (requestedView === "mobile") {
        const cleanUrl = new URL(req.url);
        cleanUrl.searchParams.delete("view");
        const mobilePath = mapToMobilePath(pathname) ?? "/mobile";
        cleanUrl.pathname = mobilePath;
        const res = NextResponse.redirect(cleanUrl);
        res.cookies.delete(DESKTOP_VIEW_COOKIE);
        return res;
      }

      if (!desktopCookie && isMobileRequest(req)) {
        const mobilePath = mapToMobilePath(pathname);
        if (mobilePath && mobilePath !== pathname) {
          const target = new URL(req.url);
          target.pathname = mobilePath;
          return NextResponse.redirect(target);
        }
      }

      return NextResponse.next();
    };

export default proxyHandler;

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
