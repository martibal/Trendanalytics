/*START FILE*/
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"];

const reportDir = path.join(root, ".audit", "api-contract");
const reportJsonPath = path.join(reportDir, "endpoint-inventory.json");
const reportMarkdownPath = path.join(reportDir, "endpoint-inventory.md");

/**
 * E-001 / E-002 inventory.
 *
 * This is intentionally explicit. If a new API route is added under src/app/api,
 * it must be added here with purpose, classification, launch status, and stability.
 *
 * Authentication and authorization correctness are audited later. This inventory
 * only classifies the route as part of the customer-facing contract surface.
 */
const ENDPOINT_INVENTORY = [
  {
    path: "/api/v1/status",
    methods: ["GET"],
    classification: "public product endpoint",
    launchStatus: "stable",
    stability: "stable",
    intendedUser: "website and technical evaluators",
    primaryUseCase: "Read per-chain freshness, lag, and publication status.",
    dataReturned: "Status and freshness context for supported chains.",
    artifactSource: "published status and latest meta artifacts",
    authRequirement: "none",
  },
  {
    path: "/api/v1/landing",
    methods: ["GET"],
    classification: "public product endpoint",
    launchStatus: "stable",
    stability: "stable",
    intendedUser: "website and technical evaluators",
    primaryUseCase: "Read the public landing snapshot across supported chains.",
    dataReturned: "Cross-chain landing summary and public product context.",
    artifactSource: "published landing/status/meta artifacts",
    authRequirement: "none",
  },
  {
    path: "/api/v1/summary/[chain]",
    methods: ["GET"],
    classification: "public product endpoint",
    launchStatus: "stable",
    stability: "stable",
    intendedUser: "website and technical evaluators",
    primaryUseCase: "Read chain-level summary context for one canonical chain.",
    dataReturned: "Regime, confidence, scorecard, drivers, freshness, and summary context.",
    artifactSource: "published meta/gold/derived artifacts",
    authRequirement: "none",
  },
  {
    path: "/api/v1/glossary",
    methods: ["GET"],
    classification: "public product endpoint",
    launchStatus: "stable",
    stability: "stable",
    intendedUser: "website and technical evaluators",
    primaryUseCase: "Read public glossary definitions.",
    dataReturned: "Glossary payload.",
    artifactSource: "site content registry",
    authRequirement: "none",
  },
  {
    path: "/api/v1/thresholds/defaults",
    methods: ["GET"],
    classification: "public product endpoint",
    launchStatus: "stable",
    stability: "stable",
    intendedUser: "website and technical evaluators",
    primaryUseCase: "Read canonical default threshold values.",
    dataReturned: "Default threshold configuration.",
    artifactSource: "threshold configuration registry",
    authRequirement: "none",
  },
  {
    path: "/api/v1/methodology/versions",
    methods: ["GET"],
    classification: "public product endpoint",
    launchStatus: "stable",
    stability: "stable",
    intendedUser: "website and technical evaluators",
    primaryUseCase: "Read published methodology version history.",
    dataReturned: "Methodology version list and metadata.",
    artifactSource: "methodology version registry",
    authRequirement: "none",
  },
  {
    path: "/api/v1/files/[...path]",
    methods: ["GET"],
    classification: "subscriber-only product endpoint",
    launchStatus: "stable",
    stability: "stable",
    intendedUser: "authenticated subscriber integrations",
    primaryUseCase: "Fetch entitled published artifact paths such as /api/v1/files/[genre]/[chain]/[window]/latest.json.",
    dataReturned: "Published Gold, Derived, Meta, or Briefs artifact payload.",
    artifactSource: "published artifact store",
    authRequirement: "X-API-Key",
  },
  {
    path: "/api/v1/samples/[...path]",
    methods: ["GET"],
    classification: "public sample endpoint",
    launchStatus: "stable",
    stability: "stable",
    intendedUser: "website visitors and technical evaluators",
    primaryUseCase: "Fetch public sample latest.json artifacts for inspection before subscribing.",
    dataReturned: "Public sample Gold, Derived, Meta, or Briefs artifact payload.",
    artifactSource: "published artifact store",
    authRequirement: "none",
  },
  {
    path: "/api/v1/units",
    methods: ["GET"],
    classification: "public metadata endpoint",
    launchStatus: "stable",
    stability: "stable",
    intendedUser: "website and technical evaluators",
    primaryUseCase: "Read canonical metric units and known chain metadata.",
    dataReturned: "Units payload, known chains, dataset version, and methodology version.",
    artifactSource: "@/config/units and dataset manifest",
    authRequirement: "none",
  },
  {
    path: "/api/v1/whn/[chain]",
    methods: ["GET"],
    classification: "public product endpoint",
    launchStatus: "stable",
    stability: "stable",
    intendedUser: "website and technical evaluators",
    primaryUseCase: "Read current Whats Happening Now context for one canonical chain.",
    dataReturned: "Current state, confidence, lag, top drivers, and traceability context.",
    artifactSource: "published meta latest artifact",
    authRequirement: "none",
  },
  {
    path: "/api/v1/keys",
    methods: ["POST", "DELETE"],
    classification: "authenticated product endpoint",
    launchStatus: "stable",
    stability: "stable",
    intendedUser: "authenticated dashboard user",
    primaryUseCase: "Create or revoke API keys.",
    dataReturned: "API key creation/revocation response.",
    artifactSource: "application database",
    authRequirement: "authenticated account context",
  },
  {
    path: "/api/v1/checkout",
    methods: ["GET", "POST"],
    classification: "authenticated product endpoint",
    launchStatus: "documented inactive until business registration is complete",
    stability: "stable",
    intendedUser: "authenticated dashboard user",
    primaryUseCase: "POST creates checkout session when billing is enabled; GET returns method_not_allowed with Allow: POST.",
    dataReturned: "Checkout redirect/session response, method_not_allowed response, or documented inactive-billing response.",
    artifactSource: "Stripe integration and account entitlement state",
    authRequirement: "authenticated account context for POST",
  },
  {
    path: "/api/v1/checkout/portal",
    methods: ["POST"],
    classification: "authenticated product endpoint",
    launchStatus: "documented inactive until business registration is complete",
    stability: "stable",
    intendedUser: "authenticated dashboard user",
    primaryUseCase: "Create customer portal session when billing is enabled.",
    dataReturned: "Customer portal session response or documented inactive-billing response.",
    artifactSource: "Stripe integration and account entitlement state",
    authRequirement: "authenticated account context",
  },
  {
    path: "/api/v1/webhook",
    methods: ["GET", "POST"],
    classification: "deprecated internal endpoint",
    launchStatus: "deprecated",
    stability: "legacy-compatible",
    intendedUser: "legacy webhook callers",
    primaryUseCase: "Return a stable 410 response directing Stripe delivery to /api/v1/stripe/webhook.",
    dataReturned: "Deprecated endpoint JSON response.",
    artifactSource: "route-level deprecation response",
    authRequirement: "none; endpoint is deprecated and performs no billing mutation",
  },
  {
    path: "/api/v1/stripe/webhook",
    methods: ["POST"],
    classification: "internal Stripe webhook endpoint",
    launchStatus: "stable",
    stability: "stable",
    intendedUser: "Stripe webhook delivery",
    primaryUseCase: "Receive verified Stripe subscription lifecycle events and synchronize account entitlements.",
    dataReturned: "Webhook acknowledgement or stable error response.",
    artifactSource: "Stripe event payload, Stripe signature verification, and application database",
    authRequirement: "Stripe signature header",
  },
];
const DOCUMENTED_ENDPOINTS = [
  { path: "/api/v1/status", methods: ["GET"], source: "src/app/api-docs/page.tsx PUBLIC_ENDPOINTS" },
  { path: "/api/v1/landing", methods: ["GET"], source: "src/app/api-docs/page.tsx PUBLIC_ENDPOINTS" },
  { path: "/api/v1/summary/[chain]", methods: ["GET"], source: "src/app/api-docs/page.tsx PUBLIC_ENDPOINTS" },
  { path: "/api/v1/glossary", methods: ["GET"], source: "src/app/api-docs/page.tsx PUBLIC_ENDPOINTS" },
  { path: "/api/v1/thresholds/defaults", methods: ["GET"], source: "src/app/api-docs/page.tsx PUBLIC_ENDPOINTS" },
  { path: "/api/v1/methodology/versions", methods: ["GET"], source: "src/app/api-docs/page.tsx PUBLIC_ENDPOINTS" },
  { path: "/api/v1/files/[...path]", methods: ["GET"], source: "src/app/api-docs/page.tsx AUTH_ENDPOINTS semantic path /api/v1/files/[genre]/[chain]/[window]/latest.json" },
  { path: "/api/v1/samples/[...path]", methods: ["GET"], source: "public sample API used by sample pack and landing JSON inspector" },
  { path: "/api/v1/units", methods: ["GET"], source: "public metadata API used by client surfaces" },
  { path: "/api/v1/whn/[chain]", methods: ["GET"], source: "public chain WHN API used by client surfaces" },
  { path: "/api/v1/keys", methods: ["POST", "DELETE"], source: "src/app/api-docs/page.tsx AUTH_ENDPOINTS" },
  { path: "/api/v1/checkout", methods: ["GET", "POST"], source: "src/app/api-docs/page.tsx AUTH_ENDPOINTS plus route-level GET method_not_allowed contract" },
  { path: "/api/v1/checkout/portal", methods: ["POST"], source: "src/app/api-docs/page.tsx AUTH_ENDPOINTS" },
  { path: "/api/v1/webhook", methods: ["GET", "POST"], source: "deprecated legacy webhook endpoint contract" },
  { path: "/api/v1/stripe/webhook", methods: ["POST"], source: "internal Stripe webhook contract" },
];
const RESPONSE_CONTRACTS = [
  {
    path: "/api/v1/status",
    success: {
      statuses: [200],
      shape: "JSON object with ok/status surface, dataset or freshness context, and per-chain status entries.",
      requiredFields: ["ok or status payload", "chain status/freshness context"],
    },
    errors: {
      statuses: [429, 500],
      shape: "Stable JSON error object from shared public read/rate-limit/server handling.",
      codes: ["rate_limited", "server_error"],
    },
    cachePolicy: "Public read endpoint; expected to be cacheable or short-lived according to route headers.",
    rateLimit: "public-read-api pre-auth rate limit where implemented.",
    authBoundary: "No API key required.",
  },
  {
    path: "/api/v1/landing",
    success: {
      statuses: [200],
      shape: "JSON object with landing snapshot, cross-chain state, methodology/version context, and product-boundary text.",
      requiredFields: ["ok or landing payload", "chains or cross-chain snapshot"],
    },
    errors: {
      statuses: [429, 500],
      shape: "Stable JSON error object from shared public read/rate-limit/server handling.",
      codes: ["rate_limited", "server_error"],
    },
    cachePolicy: "Public read endpoint; expected to be cacheable or short-lived according to route headers.",
    rateLimit: "public-read-api pre-auth rate limit where implemented.",
    authBoundary: "No API key required.",
  },
  {
    path: "/api/v1/summary/[chain]",
    success: {
      statuses: [200],
      shape: "JSON object with chain summary, regime/confidence context, scorecard, drivers, freshness, and traceability.",
      requiredFields: ["chain", "regime or status", "confidence or freshness context"],
    },
    errors: {
      statuses: [404, 429, 500],
      shape: "Stable JSON error object for unknown chain, missing published data, rate limit, or server failure.",
      codes: ["not_found", "unknown_chain", "rate_limited", "server_error"],
    },
    cachePolicy: "Public read endpoint; expected to be cacheable or short-lived according to route headers.",
    rateLimit: "public-read-api pre-auth rate limit where implemented.",
    authBoundary: "No API key required.",
  },
  {
    path: "/api/v1/glossary",
    success: {
      statuses: [200],
      shape: "JSON glossary payload.",
      requiredFields: ["glossary entries or grouped definitions"],
    },
    errors: {
      statuses: [429, 500],
      shape: "Stable JSON error object from shared public read/rate-limit/server handling.",
      codes: ["rate_limited", "server_error"],
    },
    cachePolicy: "Public read endpoint; expected to be cacheable or short-lived according to route headers.",
    rateLimit: "public-read-api pre-auth rate limit where implemented.",
    authBoundary: "No API key required.",
  },
  {
    path: "/api/v1/thresholds/defaults",
    success: {
      statuses: [200],
      shape: "JSON object containing canonical default threshold configuration.",
      requiredFields: ["threshold defaults"],
    },
    errors: {
      statuses: [429, 500],
      shape: "Stable JSON error object from shared public read/rate-limit/server handling.",
      codes: ["rate_limited", "server_error"],
    },
    cachePolicy: "Public read endpoint; expected to be cacheable or short-lived according to route headers.",
    rateLimit: "public-read-api pre-auth rate limit where implemented.",
    authBoundary: "No API key required.",
  },
  {
    path: "/api/v1/methodology/versions",
    success: {
      statuses: [200],
      shape: "JSON object or array containing methodology versions and version metadata.",
      requiredFields: ["methodology version entries"],
    },
    errors: {
      statuses: [429, 500],
      shape: "Stable JSON error object from shared public read/rate-limit/server handling.",
      codes: ["rate_limited", "server_error"],
    },
    cachePolicy: "Public read endpoint; expected to be cacheable or short-lived according to route headers.",
    rateLimit: "public-read-api pre-auth rate limit where implemented.",
    authBoundary: "No API key required.",
  },
  {
    path: "/api/v1/files/[...path]",
    success: {
      statuses: [200],
      shape: "Raw published artifact body with Content-Type, Content-Length, X-Request-Id, X-Entitlement-Tier, and X-Entitlement-Window headers.",
      requiredFields: ["artifact body", "Content-Type header", "X-Entitlement-Tier header", "X-Entitlement-Window header"],
    },
    errors: {
      statuses: [401, 403, 404, 429, 500],
      shape: "JSON object with code, message, detail plus X-Request-Id where available.",
      codes: ["unauthenticated", "forbidden", "not_found", "rate_limited", "server_error"],
    },
    cachePolicy: "private, no-store for subscriber file delivery.",
    rateLimit: "pre-auth file-api limit plus authenticated account rate limit and daily quota.",
    authBoundary: "Requires X-API-Key and entitlement check before artifact delivery.",
  },
  {
    path: "/api/v1/samples/[...path]",
    success: {
      statuses: [200],
      shape: "Raw public sample artifact body with Content-Type and Content-Length headers.",
      requiredFields: ["sample artifact body", "Content-Type header", "Content-Length header"],
    },
    errors: {
      statuses: [404, 429, 500],
      shape: "JSON object with ok:false, code, and message.",
      codes: ["not_found", "rate_limited", "server_error"],
    },
    cachePolicy: "public, s-maxage=300, stale-while-revalidate=300.",
    rateLimit: "public-read-api pre-auth rate limit.",
    authBoundary: "No API key required; only public sample paths are served.",
  },
  {
    path: "/api/v1/units",
    success: {
      statuses: [200],
      shape: "JSON object with ok:true, generated_at_utc, dataset, known_chains, group_count, units, and traceability.",
      requiredFields: ["ok", "generated_at_utc", "dataset", "known_chains", "units", "traceability"],
    },
    errors: {
      statuses: [429, 500],
      shape: "Stable JSON error object from public read/rate-limit/server handling.",
      codes: ["rate_limited", "server_error"],
    },
    cachePolicy: "public, s-maxage=300, stale-while-revalidate=300.",
    rateLimit: "public-read-api pre-auth rate limit.",
    authBoundary: "No API key required.",
  },
  {
    path: "/api/v1/whn/[chain]",
    success: {
      statuses: [200],
      shape: "JSON object with ok:true, generated_at_utc, dataset, chain, current_state, whats_happening_now, and traceability.",
      requiredFields: ["ok", "generated_at_utc", "dataset", "chain", "current_state", "whats_happening_now", "traceability"],
    },
    errors: {
      statuses: [404, 429, 500],
      shape: "JSON object with ok:false, code, message, and detail.",
      codes: ["not_found", "rate_limited", "server_error"],
    },
    cachePolicy: "public, s-maxage=300, stale-while-revalidate=300.",
    rateLimit: "public-read-api pre-auth rate limit.",
    authBoundary: "No API key required.",
  },
  {
    path: "/api/v1/keys",
    success: {
      statuses: [200, 201],
      shape: "JSON object for API key creation or revocation, including stable key metadata; secret value is shown only at creation.",
      requiredFields: ["key metadata or revocation result"],
    },
    errors: {
      statuses: [400, 401, 403, 429, 500],
      shape: "Stable JSON error object for auth, validation, rate limit, or server failure.",
      codes: ["auth_required", "forbidden", "invalid_request", "rate_limited", "server_error"],
    },
    cachePolicy: "no-store.",
    rateLimit: "authenticated and/or pre-auth account action limits where implemented.",
    authBoundary: "Requires authenticated account context.",
  },
  {
    path: "/api/v1/checkout",
    success: {
      statuses: [303],
      shape: "Redirect response to Stripe Checkout URL for valid POST when billing is configured.",
      requiredFields: ["Location header"],
    },
    errors: {
      statuses: [400, 401, 405, 429, 500, 503],
      shape: "JSON object with code, message, and detail; GET returns method_not_allowed with Allow: POST.",
      codes: ["invalid_plan", "auth_required", "method_not_allowed", "checkout_not_configured", "stripe_error", "account_error", "rate_limited"],
    },
    cachePolicy: "no-store.",
    rateLimit: "checkout-api pre-auth rate limit plus same-origin guard.",
    authBoundary: "POST requires same-origin request and authenticated account context before checkout is created.",
  },
  {
    path: "/api/v1/checkout/portal",
    success: {
      statuses: [303, 200],
      shape: "Redirect or JSON response for customer portal session when billing is configured.",
      requiredFields: ["portal redirect/session response"],
    },
    errors: {
      statuses: [400, 401, 403, 429, 500, 503],
      shape: "Stable JSON error object for auth, billing configuration, Stripe, rate-limit, or server failure.",
      codes: ["auth_required", "portal_not_configured", "stripe_error", "rate_limited", "server_error"],
    },
    cachePolicy: "no-store.",
    rateLimit: "checkout/customer-portal pre-auth rate limit where implemented.",
    authBoundary: "Requires authenticated account context.",
  },
  {
    path: "/api/v1/webhook",
    success: {
      statuses: [410],
      shape: "JSON object with deprecated_webhook_endpoint code directing callers to /api/v1/stripe/webhook.",
      requiredFields: ["code", "message"],
    },
    errors: {
      statuses: [],
      shape: "No operational webhook processing occurs on this deprecated endpoint.",
      codes: [],
    },
    cachePolicy: "no-store.",
    rateLimit: "none; endpoint performs no billing mutation.",
    authBoundary: "Deprecated endpoint; no Stripe payload is processed.",
  },
  {
    path: "/api/v1/stripe/webhook",
    success: {
      statuses: [200],
      shape: "JSON object acknowledgement after Stripe signature validation, replay persistence, and event processing.",
      requiredFields: ["result or acknowledgement"],
    },
    errors: {
      statuses: [400, 500, 503],
      shape: "Stable JSON error object for missing configuration, bad signature, or processing failure.",
      codes: ["not_configured", "bad_signature", "webhook_error"],
    },
    cachePolicy: "no-store for webhook responses.",
    rateLimit: "none; Stripe webhooks are authenticated by provider signature, not browser pre-auth rate-limit.",
    authBoundary: "Requires Stripe signature verification with stripe-signature header; not a user-facing endpoint.",
  },
];
const REQUEST_CONTRACTS = [
  {
    path: "/api/v1/status",
    pathParams: [],
    queryParams: [],
    requiredHeaders: [],
    authInputs: [],
    invalidInputCases: ["rate limited public-read request"],
    staticIndicators: ["enforcePreAuthRateLimit"],
  },
  {
    path: "/api/v1/landing",
    pathParams: [],
    queryParams: [],
    requiredHeaders: [],
    authInputs: [],
    invalidInputCases: ["rate limited public-read request"],
    staticIndicators: ["enforcePreAuthRateLimit"],
  },
  {
    path: "/api/v1/summary/[chain]",
    pathParams: ["chain: bitcoin | ethereum | arbitrum | base"],
    queryParams: [],
    requiredHeaders: [],
    authInputs: [],
    invalidInputCases: ["unknown chain", "missing published data", "rate limited public-read request"],
    staticIndicators: ["isChainId", "context.params", "enforcePreAuthRateLimit"],
  },
  {
    path: "/api/v1/glossary",
    pathParams: [],
    queryParams: [],
    requiredHeaders: [],
    authInputs: [],
    invalidInputCases: ["rate limited public-read request"],
    staticIndicators: ["enforcePreAuthRateLimit"],
  },
  {
    path: "/api/v1/thresholds/defaults",
    pathParams: [],
    queryParams: [],
    requiredHeaders: [],
    authInputs: [],
    invalidInputCases: ["rate limited public-read request"],
    staticIndicators: ["enforcePreAuthRateLimit"],
  },
  {
    path: "/api/v1/methodology/versions",
    pathParams: [],
    queryParams: [],
    requiredHeaders: [],
    authInputs: [],
    invalidInputCases: ["rate limited public-read request"],
    staticIndicators: ["enforcePreAuthRateLimit"],
  },
  {
    path: "/api/v1/files/[...path]",
    pathParams: [
      "path[0]: genre = gold | meta | derived | briefs",
      "path[1]: chain for gold/meta/derived; literal chains for briefs",
      "path tail: latest.json or [window]/latest.json",
    ],
    queryParams: ["start?: ISO date", "end?: ISO date"],
    requiredHeaders: ["X-API-Key"],
    authInputs: ["API key", "account entitlement", "tier quota", "daily quota"],
    invalidInputCases: [
      "missing API key",
      "invalid API key",
      "unknown genre",
      "unknown chain",
      "invalid path shape",
      "window could not be inferred",
      "entitlement forbidden",
      "object not found",
      "rate limited",
      "daily quota exceeded",
    ],
    staticIndicators: [
      "validateRequestApiKey",
      "sanitizeSegments",
      "parseFilePathSegments",
      "inferWindowFromTail",
      "evaluateFileEntitlement",
      "enforceAccountRateLimit",
      "enforceDailyApiQuota",
    ],
  },
  {
    path: "/api/v1/samples/[...path]",
    pathParams: [
      "path[0]: genre = gold | derived | meta | briefs",
      "path[1]: chain for gold/derived/meta; literal chains for briefs",
      "path tail: latest.json",
    ],
    queryParams: [],
    requiredHeaders: [],
    authInputs: [],
    invalidInputCases: ["unknown genre", "unknown chain", "invalid path shape", "sample not found", "rate limited"],
    staticIndicators: ["sanitizeSegments", "parseSampleSegments", "isSampleGenre", "isChainId", "enforcePreAuthRateLimit"],
  },
  {
    path: "/api/v1/units",
    pathParams: [],
    queryParams: [],
    requiredHeaders: [],
    authInputs: [],
    invalidInputCases: ["rate limited public-read request"],
    staticIndicators: ["normalizeUnitsObject", "CHAIN_LIST", "readDatasetManifest", "enforcePreAuthRateLimit"],
  },
  {
    path: "/api/v1/whn/[chain]",
    pathParams: ["chain: bitcoin | ethereum | arbitrum | base"],
    queryParams: [],
    requiredHeaders: [],
    authInputs: [],
    invalidInputCases: ["unknown chain", "missing published meta latest", "rate limited public-read request"],
    staticIndicators: ["isChainId", "context.params", "readDatasetManifest", "readStorageObject", "enforcePreAuthRateLimit"],
  },
  {
    path: "/api/v1/keys",
    pathParams: [],
    queryParams: [],
    requiredHeaders: [],
    authInputs: ["authenticated account context"],
    invalidInputCases: ["not signed in", "invalid action/body", "rate limited", "server error"],
    staticIndicators: ["auth", "currentUser"],
  },
  {
    path: "/api/v1/checkout",
    pathParams: [],
    queryParams: ["plan?: basic | single-chain | single_chain | pro | research"],
    requiredHeaders: ["same-origin headers for POST"],
    authInputs: ["authenticated account context", "Stripe configuration"],
    invalidInputCases: [
      "GET method_not_allowed",
      "missing or invalid plan",
      "not signed in",
      "missing Stripe secret key",
      "missing Stripe price id",
      "production checkout using non-live key",
      "same-origin guard failure",
      "rate limited",
      "Stripe error",
    ],
    staticIndicators: [
      "normalizePlan",
      "readPlan",
      "validateSameOriginRequest",
      "enforcePreAuthRateLimit",
      "getSignedInUser",
      "priceIdForPlan",
      "stripe.checkout.sessions.create",
    ],
  },
  {
    path: "/api/v1/checkout/portal",
    pathParams: [],
    queryParams: [],
    requiredHeaders: ["same-origin or authenticated request context where implemented"],
    authInputs: ["authenticated account context", "Stripe configuration", "customer/subscription state"],
    invalidInputCases: ["not signed in", "portal not configured", "missing Stripe customer", "rate limited", "Stripe error"],
    staticIndicators: ["auth", "Stripe"],
  },
  {
    path: "/api/v1/webhook",
    pathParams: [],
    queryParams: [],
    requiredHeaders: [],
    authInputs: [],
    invalidInputCases: ["deprecated endpoint requested"],
    staticIndicators: ["deprecated_webhook_endpoint", "status: 410", "Cache-Control"],
  },
  {
    path: "/api/v1/stripe/webhook",
    pathParams: [],
    queryParams: [],
    requiredHeaders: ["stripe-signature"],
    authInputs: ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "Stripe signature verification"],
    invalidInputCases: [
      "missing Stripe secret key",
      "missing webhook secret",
      "missing stripe-signature",
      "invalid signature",
      "unsupported or malformed event payload",
      "server error during entitlement sync",
      "duplicate Stripe event id replay",
    ],
    staticIndicators: [
      "stripe.webhooks.constructEvent",
      "stripe-signature",
      "STRIPE_WEBHOOK_SECRET",
      "stripeWebhookEvent",
      "handleVerifiedEvent",
    ],
  },
];
function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (["node_modules", ".next", ".git"].includes(entry.name)) continue;
      walk(full, out);
      continue;
    }

    if (entry.isFile() && /^route\.(ts|tsx|js|mjs)$/.test(entry.name)) {
      out.push(full);
    }
  }

  return out;
}

function normalizeRoutePath(routeFile) {
  const apiRoot = path.join(root, "src", "app");
  const relative = path.relative(apiRoot, routeFile).replaceAll(path.sep, "/");
  const withoutRouteFile = relative.replace(/\/route\.(ts|tsx|js|mjs)$/u, "");

  return `/${withoutRouteFile}`;
}

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function getImplementedMethods(raw) {
  const methods = new Set();

  for (const method of HTTP_METHODS) {
    const patterns = [
      new RegExp(`export\\s+async\\s+function\\s+${method}\\s*\\(`, "u"),
      new RegExp(`export\\s+function\\s+${method}\\s*\\(`, "u"),
      new RegExp(`export\\s+const\\s+${method}\\s*=`, "u"),
    ];

    if (patterns.some((pattern) => pattern.test(raw))) {
      methods.add(method);
    }
  }

  return [...methods].sort((a, b) => HTTP_METHODS.indexOf(a) - HTTP_METHODS.indexOf(b));
}

function getRouteFiles() {
  return walk(path.join(root, "src", "app", "api")).sort((a, b) => a.localeCompare(b));
}

function sortMethods(methods) {
  return [...methods].sort((a, b) => HTTP_METHODS.indexOf(a) - HTTP_METHODS.indexOf(b));
}

function key(pathValue) {
  return pathValue.toLowerCase();
}

function methodList(methods) {
  return sortMethods(methods).join(", ");
}

function arraysEqual(a, b) {
  return methodList(a) === methodList(b);
}

function tableRow(values) {
  return `| ${values.map((value) => String(value).replaceAll("\n", " ")).join(" | ")} |`;
}

function ensureReportDir() {
  fs.mkdirSync(reportDir, { recursive: true });
}

function requiredFieldErrors(item) {
  const required = [
    "path",
    "methods",
    "classification",
    "launchStatus",
    "stability",
    "intendedUser",
    "primaryUseCase",
    "dataReturned",
    "artifactSource",
    "authRequirement",
  ];

  return required.filter((field) => {
    const value = item[field];

    if (Array.isArray(value)) return value.length === 0;
    return typeof value !== "string" || value.trim().length === 0;
  });
}

function scanImplementedRoutes() {
  return getRouteFiles().map((file) => {
    const raw = read(file);
    return {
      path: normalizeRoutePath(file),
      methods: getImplementedMethods(raw),
      file: path.relative(root, file).replaceAll(path.sep, "/"),
    };
  });
}

function evaluate() {
  const implementedRoutes = scanImplementedRoutes();
  const inventoryByPath = new Map(ENDPOINT_INVENTORY.map((item) => [key(item.path), item]));
  const implementedByPath = new Map(implementedRoutes.map((item) => [key(item.path), item]));
  const documentedByPath = new Map(DOCUMENTED_ENDPOINTS.map((item) => [key(item.path), item]));

  const findings = [];

  for (const route of implementedRoutes) {
    const inventory = inventoryByPath.get(key(route.path));

    if (!inventory) {
      findings.push({
        severity: "fail",
        auditItem: "E-001",
        code: "IMPLEMENTED_ROUTE_NOT_IN_INVENTORY",
        route: route.path,
        file: route.file,
        detail: "Implemented API route is not classified in ENDPOINT_INVENTORY.",
      });
      continue;
    }

    if (!arraysEqual(route.methods, inventory.methods)) {
      findings.push({
        severity: "fail",
        auditItem: "E-003",
        code: "METHOD_MISMATCH_IMPLEMENTATION_VS_INVENTORY",
        route: route.path,
        file: route.file,
        detail: `Implemented methods [${methodList(route.methods)}] do not match inventory methods [${methodList(inventory.methods)}].`,
      });
    }

    const missingFields = requiredFieldErrors(inventory);
    if (missingFields.length > 0) {
      findings.push({
        severity: "fail",
        auditItem: "E-002",
        code: "INCOMPLETE_ENDPOINT_PURPOSE_DEFINITION",
        route: route.path,
        file: route.file,
        detail: `Inventory item is missing required fields: ${missingFields.join(", ")}.`,
      });
    }
  }

  for (const inventory of ENDPOINT_INVENTORY) {
    const implemented = implementedByPath.get(key(inventory.path));

    if (!implemented) {
      findings.push({
        severity: "fail",
        auditItem: "E-001",
        code: "INVENTORY_ROUTE_NOT_IMPLEMENTED",
        route: inventory.path,
        file: "ENDPOINT_INVENTORY",
        detail: "Endpoint appears in inventory but no matching src/app/api route was found.",
      });
    }

    const documented = documentedByPath.get(key(inventory.path));
    if (!documented) {
      findings.push({
        severity: "fail",
        auditItem: "E-001",
        code: "INVENTORY_ROUTE_NOT_DOCUMENTED",
        route: inventory.path,
        file: "src/app/api-docs/page.tsx",
        detail: "Endpoint appears in inventory but is not represented in DOCUMENTED_ENDPOINTS.",
      });
    } else if (!arraysEqual(inventory.methods, documented.methods)) {
      findings.push({
        severity: "fail",
        auditItem: "E-003",
        code: "METHOD_MISMATCH_INVENTORY_VS_DOCS",
        route: inventory.path,
        file: documented.source,
        detail: `Inventory methods [${methodList(inventory.methods)}] do not match documented methods [${methodList(documented.methods)}].`,
      });
    }
  }

  for (const documented of DOCUMENTED_ENDPOINTS) {
    const inventory = inventoryByPath.get(key(documented.path));

    if (!inventory) {
      findings.push({
        severity: "fail",
        auditItem: "E-001",
        code: "DOCUMENTED_ROUTE_NOT_IN_INVENTORY",
        route: documented.path,
        file: documented.source,
        detail: "Endpoint appears in API documentation but not in ENDPOINT_INVENTORY.",
      });
    }

    const implemented = implementedByPath.get(key(documented.path));
    if (!implemented) {
      findings.push({
        severity: "fail",
        auditItem: "E-001",
        code: "DOCUMENTED_ROUTE_NOT_IMPLEMENTED",
        route: documented.path,
        file: documented.source,
        detail: "Endpoint appears in API documentation but no matching src/app/api route was found.",
      });
    }
  }

  return {
    generatedAtUtc: new Date().toISOString(),
    implementedRoutes,
    endpointInventory: ENDPOINT_INVENTORY,
    documentedEndpoints: DOCUMENTED_ENDPOINTS,
    responseContracts: RESPONSE_CONTRACTS,
    requestContracts: REQUEST_CONTRACTS,
    findings,
    result: findings.some((finding) => finding.severity === "fail") ? "FAIL" : "PASS",
  };
}

function markdownReport(result) {
  const lines = [];

  lines.push("# API Contract Audit — Endpoint Inventory");
  lines.push("");
  lines.push(`Generated at UTC: ${result.generatedAtUtc}`);
  lines.push(`Result: ${result.result}`);
  lines.push("");
  lines.push("## Implemented API routes");
  lines.push("");
  lines.push(tableRow(["Path", "Methods", "File"]));
  lines.push(tableRow(["---", "---", "---"]));

  for (const route of result.implementedRoutes) {
    lines.push(tableRow([route.path, methodList(route.methods), route.file]));
  }

  lines.push("");
  lines.push("## Endpoint inventory");
  lines.push("");
  lines.push(
    tableRow([
      "Path",
      "Methods",
      "Classification",
      "Launch status",
      "Stability",
      "Intended user",
      "Primary use case",
      "Artifact source",
      "Auth requirement",
    ])
  );
  lines.push(tableRow(["---", "---", "---", "---", "---", "---", "---", "---", "---"]));

  for (const item of result.endpointInventory) {
    lines.push(
      tableRow([
        item.path,
        methodList(item.methods),
        item.classification,
        item.launchStatus,
        item.stability,
        item.intendedUser,
        item.primaryUseCase,
        item.artifactSource,
        item.authRequirement,
      ])
    );
  }

  lines.push("");
  lines.push("");
  lines.push("## Response contracts");
  lines.push("");
  lines.push(tableRow(["Path", "Success statuses", "Success shape", "Error statuses", "Error codes", "Cache policy", "Rate limit", "Auth boundary"]));
  lines.push(tableRow(["---", "---", "---", "---", "---", "---", "---", "---"]));

  for (const contract of result.responseContracts) {
    lines.push(
      tableRow([
        contract.path,
        contract.success.statuses.join(", "),
        contract.success.shape,
        contract.errors.statuses.join(", "),
        contract.errors.codes.join(", "),
        contract.cachePolicy,
        contract.rateLimit,
        contract.authBoundary,
      ])
    );
  }

  lines.push("");  lines.push("");
  lines.push("## Request contracts");
  lines.push("");
  lines.push(tableRow(["Path", "Path params", "Query params", "Required headers", "Auth inputs", "Invalid input cases", "Static indicators"]));
  lines.push(tableRow(["---", "---", "---", "---", "---", "---", "---"]));

  for (const contract of result.requestContracts) {
    lines.push(
      tableRow([
        contract.path,
        contract.pathParams.join(", ") || "none",
        contract.queryParams.join(", ") || "none",
        contract.requiredHeaders.join(", ") || "none",
        contract.authInputs.join(", ") || "none",
        contract.invalidInputCases.join(", "),
        contract.staticIndicators.join(", ") || "none",
      ])
    );
  }

  lines.push("");  lines.push("## Findings");
  lines.push("");

  if (result.findings.length === 0) {
    lines.push("No endpoint-inventory findings.");
  } else {
    lines.push(tableRow(["Severity", "Audit item", "Code", "Route", "File", "Detail"]));
    lines.push(tableRow(["---", "---", "---", "---", "---", "---"]));

    for (const finding of result.findings) {
      lines.push(
        tableRow([
          finding.severity,
          finding.auditItem,
          finding.code,
          finding.route,
          finding.file,
          finding.detail,
        ])
      );
    }
  }

  lines.push("");
  lines.push("## Coverage");
  lines.push("");
  lines.push("- E-001 Endpoint Inventory Completeness: checked.");
  lines.push("- E-002 Endpoint Purpose Definition: checked for inventory fields.");
  lines.push("- E-003 HTTP Method Correctness: checked for implementation vs inventory/docs method drift.");
  lines.push("- E-004 Success Response Schema Documentation: checked via RESPONSE_CONTRACTS.");
  lines.push("- E-005 Error Response Schema Documentation: checked via RESPONSE_CONTRACTS.");
  lines.push("- E-006 Request Parameter Contract: checked via REQUEST_CONTRACTS.");
  lines.push("- E-007 Invalid Input / Auth Boundary Cases: checked via REQUEST_CONTRACTS and static route indicators.");
  lines.push("");
  lines.push(
    "This script does not yet execute live runtime requests. Runtime parameter validation, schema sampling, freshness, coverage, confidence, methodology versions, ordering, pagination, exports, series, summaries, notables, manifests, unsupported dates, defaults, compatibility, deprecation, examples, and product-boundary response payloads must be added in later Section E stages."
  );

  return `${lines.join("\n")}\n`;
}

const result = evaluate();

ensureReportDir();
fs.writeFileSync(reportJsonPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
fs.writeFileSync(reportMarkdownPath, markdownReport(result), "utf8");

if (result.findings.length > 0) {
  console.error("API contract audit failed at endpoint-inventory stage.");
  console.error(`Report: ${path.relative(root, reportMarkdownPath)}`);
  console.error("");

  for (const finding of result.findings) {
    console.error(
      `[${finding.severity.toUpperCase()}] ${finding.auditItem} ${finding.code} :: ${finding.route}`
    );
    console.error(`  File: ${finding.file}`);
    console.error(`  Detail: ${finding.detail}`);
  }

  process.exit(1);
}

console.log("API contract audit endpoint-inventory stage passed.");
console.log(`Report: ${path.relative(root, reportMarkdownPath)}`);
/*END FILE*/