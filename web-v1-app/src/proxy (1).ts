// src/proxy.ts
// Clerk middleware — beskytter kun browser-routes som krever innlogging.
// /api/v1/files bruker X-API-Key autentisering inne i routen selv,
// og skal IKKE beskyttes av Clerk middleware.
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/api/v1/checkout(.*)",
  "/api/v1/keys(.*)",
]);

const hasClerkKeys =
  Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) &&
  Boolean(process.env.CLERK_SECRET_KEY);

const proxyHandler = hasClerkKeys
  ? clerkMiddleware(async (auth, req) => {
      if (isProtectedRoute(req)) {
        await auth.protect();
      }
    })
  : function proxy() {
      return NextResponse.next();
    };

export default proxyHandler;

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/api/v1/checkout/:path*",
    "/api/v1/keys/:path*",
  ],
};
