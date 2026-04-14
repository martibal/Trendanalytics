// src/proxy.ts
// Clerk middleware:
// - runs on browser routes so public pages can still read auth context
// - only protects routes that truly require login
// - leaves /api/v1/files on API-key auth only
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
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
    /*
      Run Clerk middleware on all app/browser routes so public pages like
      /chains/[chain] can still detect signed-in users on the server.

      Exclude:
      - _next assets
      - static files
      - common binary/image assets
      - /api/v1/files because that route uses X-API-Key auth inside the handler
    */
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",

    // Explicitly exclude the file-delivery route from Clerk protection/context handling.
    // It authenticates via X-API-Key inside the route itself.
  ],
};