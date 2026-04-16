import { NextRequest, NextResponse, userAgent } from "next/server";

const DESKTOP_VIEW_COOKIE = "ua_view";

function isMobileRequest(req: NextRequest) {
  const { device } = userAgent(req);
  return device.type === "mobile" || device.type === "tablet";
}

function mapToMobilePath(pathname: string): string | null {
  if (pathname.startsWith("/mobile")) return null;
  if (pathname.startsWith("/_next")) return null;
  if (pathname.startsWith("/api")) return null;

  if (pathname === "/") return "/mobile";

  const chainMatch = pathname.match(/^\/chains\/(bitcoin|ethereum|arbitrum|base)$/);
  if (chainMatch) return `/mobile/chain/${chainMatch[1]}`;

  if (pathname === "/track-record") return "/mobile/track-record";
  if (pathname === "/methodology") return "/mobile/methodology";
  if (pathname === "/about") return "/mobile/methodology";
  if (pathname === "/glossary" || pathname === "/faq") return "/mobile/wiki";
  if (pathname.startsWith("/api-docs")) return "/mobile/wiki";

  return "/mobile";
}

export function proxy(req: NextRequest) {
  const url = req.nextUrl.clone();
  const pathname = url.pathname;
  const requestedView = url.searchParams.get("view");
  const desktopCookie = req.cookies.get(DESKTOP_VIEW_COOKIE)?.value === "desktop";

  if (requestedView === "desktop") {
    url.searchParams.delete("view");
    const res = NextResponse.redirect(url);
    res.cookies.set(DESKTOP_VIEW_COOKIE, "desktop", {
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
      sameSite: "lax",
    });
    return res;
  }

  if (requestedView === "mobile") {
    url.searchParams.delete("view");
    const mobilePath = mapToMobilePath(pathname) ?? "/mobile";
    url.pathname = mobilePath;

    const res = NextResponse.redirect(url);
    res.cookies.set(DESKTOP_VIEW_COOKIE, "", {
      path: "/",
      maxAge: 0,
      sameSite: "lax",
    });
    return res;
  }

  if (!desktopCookie && isMobileRequest(req)) {
    const mobilePath = mapToMobilePath(pathname);
    if (mobilePath && mobilePath !== pathname) {
      url.pathname = mobilePath;
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|css|js|map|txt|xml|woff|woff2)$).*)",
  ],
};