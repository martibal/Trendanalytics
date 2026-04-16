import { NextRequest, NextResponse, userAgent } from "next/server";

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

  if (requestedView === "desktop") {
    url.searchParams.delete("view");
    return NextResponse.redirect(url);
  }

  if (requestedView === "mobile") {
    url.searchParams.delete("view");
    const mobilePath = mapToMobilePath(pathname) ?? "/mobile";
    url.pathname = mobilePath;
    return NextResponse.redirect(url);
  }

  if (isMobileRequest(req)) {
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