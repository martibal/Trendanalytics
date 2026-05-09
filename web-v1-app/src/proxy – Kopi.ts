import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextRequest, NextResponse, userAgent } from "next/server";

function isMobileRequest(req: NextRequest) {
  const { device } = userAgent(req);
  return device.type === "mobile" || device.type === "tablet";
}

function mapToMobilePath(pathname: string): string | null {
  if (pathname.startsWith("/mobile")) return null;
  if (pathname.startsWith("/_next")) return null;
  if (pathname.startsWith("/api/")) return null;
  if (pathname.startsWith("/__clerk")) return null;

  if (pathname === "/") return "/mobile";

  const chainMatch = pathname.match(/^\/chains\/(bitcoin|ethereum|arbitrum|base)$/);
  if (chainMatch) return `/mobile/chain/${chainMatch[1]}`;

  if (pathname === "/track-record") return "/mobile/track-record";
  if (pathname === "/methodology") return "/mobile/methodology";
  if (pathname === "/thresholds") return "/mobile/thresholds";
  if (pathname === "/about") return "/mobile/methodology";
  if (pathname === "/glossary" || pathname === "/faq") return "/mobile/wiki";
  if (pathname === "/api-docs" || pathname.startsWith("/api-docs/")) return "/mobile/api-docs";

  return "/mobile";
}

export default clerkMiddleware((_auth, req) => {
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
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest|map|txt|xml)).*)",
    "/(api|trpc|__clerk)(.*)",
  ],
};
