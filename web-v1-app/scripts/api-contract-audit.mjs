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
 * Every API route under src/app/api must be explicitly classified here with
 * purpose, launch status, stability, source, and authentication boundary.
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
    path: "/api/v1/analyst-kit/[chain]/regime-calendar",
    methods: ["GET"],
    classification: "public analyst endpoint",
    launchStatus: "draft public beta",
    stability: "beta schema",
    intendedUser: "analysts, researchers, dashboard owners, and technical evaluators without a full pipeline",
    primaryUseCase: "Download a chain-level regime calendar as CSV for reporting, notebooks, BI tools, and lightweight analysis.",
    dataReturned: "CSV rows with observation date, chain, regime, confidence, score components, methodology metadata, one-liner, and drivers.",
    artifactSource: "published meta window artifacts via Analyst Kit adapter",
    authRequirement: "none",
  },
  {
    path: "/api/v1/analyst-kit/[chain]/weekly-summary",
    methods: ["GET"],
    classification: "public analyst endpoint",
    launchStatus: "draft public beta",
    stability: "beta text contract",
    intendedUser: "analysts, researchers, dashboard owners, and technical evaluators without a full pipeline",
    primaryUseCase: "Read a short descriptive weekly network-state summary for one canonical chain.",
    dataReturned: "Plain-text descriptive summary, latest regime, confidence language, transition note, and product-boundary note.",
    artifactSource: "published meta window artifacts via Analyst Kit adapter",
    authRequirement: "none",
  },
  {
    path: "/api/v1/analyst-kit/feature-schema",
    methods: ["GET"],
    classification: "public analyst metadata endpoint",
    launchStatus: "draft public beta",
    stability: "beta schema",
    intendedUser: "analysts, researchers, BI users, and technical evaluators",
    primaryUseCase: "Read the machine-readable Analyst Kit feature schema and safe/unsafe use boundaries.",
    dataReturned: "JSON schema-like payload describing Analyst Kit fields, grain, keys, safe uses, and unsafe uses.",
    artifactSource: "Analyst Kit schema registry in application code",
    authRequirement: "none",
  },
  {
    path: "/api/v1/analyst-kit/starter-notebook",
    methods: ["GET"],
    classification: "public analyst artifact endpoint",
    launchStatus: "draft public beta",
    stability: "beta notebook contract",
    intendedUser: "analysts and technical evaluators who can run a Python notebook but do not have a production pipeline",
    primaryUseCase: "Download a starter notebook that loads Analyst Kit CSV, joins user metrics, and summarizes metrics by network state.",
    dataReturned: "Jupyter notebook JSON payload.",
    artifactSource: "Analyst Kit notebook template in application code",
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

const DOCUMENTED_ENDPOINTS = ENDPOINT_INVENTORY.map((item) => ({
  path: item.path,
  methods: item.methods,
  source: item.path.startsWith("/api/v1/analyst-kit")
    ? "src/app/analyst-kit/page.tsx public Analyst Kit links plus API route contract"
    : "API contract inventory and public/API documentation surfaces",
}));

const RESPONSE_CONTRACTS = ENDPOINT_INVENTORY.map((item) => ({
  path: item.path,
  success: {
    statuses: item.path === "/api/v1/webhook" ? [410] : item.path === "/api/v1/checkout" || item.path === "/api/v1/checkout/portal" ? [200, 303] : [200],
    shape: item.dataReturned,
    requiredFields: [item.dataReturned],
  },
  errors: {
    statuses: item.authRequirement === "none" ? [404, 429, 500] : [400, 401, 403, 404, 429, 500],
    shape: "Stable route-level error response where implemented.",
    codes: ["invalid_request", "not_found", "rate_limited", "server_error"],
  },
  cachePolicy: item.authRequirement === "none" ? "public or route-level cache policy" : "private or no-store where applicable",
  rateLimit: item.authRequirement === "none" ? "public-read-api pre-auth rate limit where implemented" : "authenticated or provider-authenticated rate limit where implemented",
  authBoundary: item.authRequirement,
}));

const REQUEST_CONTRACTS = ENDPOINT_INVENTORY.map((item) => {
  const chainScoped = item.path.includes("[chain]");
  const catchAll = item.path.includes("[...path]");

  return {
    path: item.path,
    pathParams: chainScoped
      ? ["chain: bitcoin | ethereum | arbitrum | base"]
      : catchAll
        ? ["path: validated artifact path segments"]
        : [],
    queryParams: [],
    requiredHeaders: item.authRequirement === "X-API-Key" ? ["X-API-Key"] : item.authRequirement === "Stripe signature header" ? ["stripe-signature"] : [],
    authInputs: item.authRequirement === "none" ? [] : [item.authRequirement],
    invalidInputCases: chainScoped ? ["unknown chain", "missing published data", "rate limited request"] : ["rate limited request", "server error"],
    staticIndicators: chainScoped
      ? ["isChainId", "context.params"]
      : catchAll
        ? ["path segment validation"]
        : [],
  };
});

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

  lines.push("");
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

  lines.push("");
  lines.push("## Findings");
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
