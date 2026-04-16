import { NextRequest, NextResponse } from "next/server";

const DESKTOP_VIEW_COOKIE = "ua_view";

function isMobileRequest(req: NextRequest) {
  const ua = req.headers.get("user-agent")?.toLowerCase() ?? "";
  const chMobile = req.headers.get("sec-ch-ua-mobile");

  return (
    chMobile === "?1" ||
    /android|iphone|ipod|ipad|blackberry|iemobile|opera mini|mobile/.test(ua)
  );
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
  const { nextUrl, cookies } = req;
  const pathname = nextUrl.pathname;
  const requestedView = nextUrl.searchParams.get("view");
  const desktopCookie = cookies.get(DESKTOP_VIEW_COOKIE)?.value === "desktop";

  if (requestedView === "desktop") {
    const cleanUrl = nextUrl.clone();
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
    const cleanUrl = nextUrl.clone();
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
      const target = nextUrl.clone();
      target.pathname = mobilePath;
      return NextResponse.redirect(target);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|css|js|map|txt|xml|woff|woff2)$).*)",
  ],
};