// src/proxy.ts
//
// Endringer vs original:
//   1. Manglende route-mappinger lagt til:
//        /status      → /mobile/status
//        /plans       → /mobile/plans
//        /dashboard   → /mobile/plans
//        /about       → /mobile/wiki  (mer relevant enn /mobile/methodology)
//        /chains      → /mobile       (index-siden)
//   2. Desktop-override bruker nå cookie i stedet for query param.
//      Problemet med ?view=desktop i originalen: middleware sletter param og
//      redirecter, men neste request er fortsatt mobilklient → ny redirect
//      til /mobile. Løsningen: sett en 2-timers cookie "urd-force-desktop".
//      isMobileRequest() respekterer cookien og hopper over redirect.
//   3. ?view=mobile fjerner cookien slik at mobil-redirect gjenopptas.

import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextRequest, NextResponse, userAgent } from "next/server";

const DESKTOP_COOKIE     = "urd-force-desktop";
const DESKTOP_COOKIE_TTL = 60 * 60 * 2; // 2 timer

function isMobileRequest(req: NextRequest): boolean {
  if (req.cookies.get(DESKTOP_COOKIE)?.value === "1") return false;
  const { device } = userAgent(req);
  return device.type === "mobile" || device.type === "tablet";
}

function mapToMobilePath(pathname: string): string | null {
  if (pathname.startsWith("/mobile"))   return null;
  if (pathname.startsWith("/_next"))    return null;
  if (pathname.startsWith("/api/"))     return null;
  if (pathname.startsWith("/__clerk"))  return null;

  if (pathname === "/") return "/mobile";

  const chainMatch = pathname.match(
    /^\/chains\/(bitcoin|ethereum|arbitrum|base)$/
  );
  if (chainMatch) return `/mobile/chain/${chainMatch[1]}`;

  if (pathname === "/chains")                              return "/mobile";
  if (pathname === "/track-record")                        return "/mobile/track-record";
  if (pathname === "/status")                              return "/mobile/status";
  if (pathname === "/methodology")                         return "/mobile/methodology";
  if (pathname === "/thresholds")                          return "/mobile/thresholds";
  if (pathname === "/about")                               return "/mobile/wiki";
  if (pathname === "/glossary" || pathname === "/faq")     return "/mobile/wiki";
  if (pathname === "/plans")                               return "/mobile/plans";
  if (pathname === "/dashboard")                           return "/mobile/plans";
  if (pathname === "/api-docs" ||
      pathname.startsWith("/api-docs/"))                   return "/mobile/api-docs";

  // Catch-all: ukjente paths til mobil-hjem
  return "/mobile";
}

export default clerkMiddleware((_auth, req) => {
  const url      = req.nextUrl.clone();
  const pathname = url.pathname;
  const view     = url.searchParams.get("view");

  // ?view=desktop → sett cookie, fjern param, bli på samme side
  if (view === "desktop") {
    url.searchParams.delete("view");
    const res = NextResponse.redirect(url);
    res.cookies.set(DESKTOP_COOKIE, "1", {
      maxAge:   DESKTOP_COOKIE_TTL,
      path:     "/",
      sameSite: "lax",
    });
    return res;
  }

  // ?view=mobile → slett cookie, redirect til mobil-ekvivalent
  if (view === "mobile") {
    url.searchParams.delete("view");
    const mobilePath  = mapToMobilePath(pathname) ?? "/mobile";
    url.pathname      = mobilePath;
    const res         = NextResponse.redirect(url);
    res.cookies.delete(DESKTOP_COOKIE);
    return res;
  }

  // Automatisk mobil-redirect
  if (isMobileRequest(req)) {
    const mobilePath = mapToMobilePath(pathname);
    if (mobilePath && mobilePath !== pathname) {
      url.pathname = mobilePath;
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest|map|txt|xml)).*)",
    "/(api|trpc|__clerk)(.*)",
  ],
};
