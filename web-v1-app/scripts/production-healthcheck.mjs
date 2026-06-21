#!/usr/bin/env node
/*START FILE*/
import process from "node:process";

const DEFAULT_BASE_URL = "https://www.urdatlas.com";

const BASE_URL = normalizeBaseUrl(
  process.env.URD_HEALTHCHECK_BASE_URL || DEFAULT_BASE_URL,
);

const REQUEST_TIMEOUT_MS = readPositiveIntegerEnv(
  "URD_HEALTHCHECK_TIMEOUT_MS",
  15000,
);

const FAIL_ON_WARNINGS = readBooleanEnv(
  "URD_HEALTHCHECK_FAIL_ON_WARNINGS",
  false,
);

const REQUIRED_ROUTES = [
  {
    name: "Home page",
    path: "/",
    expectedStatus: 200,
    kind: "html",
  },
  {
    name: "Status page",
    path: "/status",
    expectedStatus: 200,
    kind: "html",
  },
  {
    name: "API getting started docs",
    path: "/api-docs/getting-started",
    expectedStatus: 200,
    kind: "html",
  },
  {
    name: "Mobile plans page",
    path: "/mobile/plans",
    expectedStatus: 200,
    kind: "html",
  },
  {
    name: "Public API status endpoint",
    path: "/api/v1/status",
    expectedStatus: 200,
    kind: "json",
  },
];

const REQUIRED_STATUS_CHAINS = ["bitcoin", "ethereum", "arbitrum", "base"];

function normalizeBaseUrl(value) {
  const trimmed = String(value || "").trim();

  if (!trimmed) {
    throw new Error("URD_HEALTHCHECK_BASE_URL cannot be empty.");
  }

  return trimmed.replace(/\/+$/, "");
}

function readPositiveIntegerEnv(name, fallback) {
  const raw = process.env[name];

  if (raw === undefined || raw === null || String(raw).trim() === "") {
    return fallback;
  }

  const parsed = Number.parseInt(String(raw), 10);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer.`);
  }

  return parsed;
}

function readBooleanEnv(name, fallback) {
  const raw = process.env[name];

  if (raw === undefined || raw === null || String(raw).trim() === "") {
    return fallback;
  }

  const normalized = String(raw).trim().toLowerCase();

  if (["1", "true", "yes", "y", "on"].includes(normalized)) {
    return true;
  }

  if (["0", "false", "no", "n", "off"].includes(normalized)) {
    return false;
  }

  throw new Error(`${name} must be a boolean value.`);
}

function nowIso() {
  return new Date().toISOString();
}

function buildUrl(path) {
  if (!path.startsWith("/")) {
    return `${BASE_URL}/${path}`;
  }

  return `${BASE_URL}${path}`;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function safeJsonStringify(value) {
  return JSON.stringify(value, null, 2);
}

function summarizeJson(value) {
  if (!isPlainObject(value)) {
    return "non_object_json";
  }

  const keys = Object.keys(value).sort();

  return `object_keys=${keys.slice(0, 20).join(",")}`;
}

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(url, {
      method: "GET",
      headers: {
        accept: "application/json,text/html;q=0.9,*/*;q=0.8",
        "user-agent": "urd-atlas-production-healthcheck/1.0",
      },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function checkRoute(route) {
  const url = buildUrl(route.path);
  const startedAt = Date.now();

  try {
    const response = await fetchWithTimeout(url);
    const elapsedMs = Date.now() - startedAt;

    const contentType = response.headers.get("content-type") || "";
    const contentLength = response.headers.get("content-length") || null;
    const lastModified = response.headers.get("last-modified") || null;

    const result = {
      name: route.name,
      path: route.path,
      url,
      kind: route.kind,
      status: response.status,
      expectedStatus: route.expectedStatus,
      elapsedMs,
      contentType,
      contentLength,
      lastModified,
      ok: response.status === route.expectedStatus,
      body: null,
      summary: null,
      error: null,
    };

    if (!response.ok) {
      await response.arrayBuffer();
      return result;
    }

    if (route.kind === "json") {
      try {
        const json = await response.json();
        result.body = json;
        result.summary = summarizeJson(json);
      } catch (error) {
        result.ok = false;
        result.error = `Invalid JSON response: ${error instanceof Error ? error.message : String(error)}`;
      }

      return result;
    }

    if (route.kind === "html") {
      const text = await response.text();
      const normalizedText = text.trim();

      if (normalizedText.length === 0) {
        result.ok = false;
        result.error = "Empty HTML response.";
      } else {
        result.summary = `html_bytes=${Buffer.byteLength(text, "utf8")}`;
      }

      return result;
    }

    const buffer = await response.arrayBuffer();

    if (buffer.byteLength === 0) {
      result.ok = false;
      result.error = "Empty binary response.";
    } else {
      result.summary = `binary_bytes=${buffer.byteLength}`;
    }

    return result;
  } catch (error) {
    return {
      name: route.name,
      path: route.path,
      url,
      kind: route.kind,
      status: null,
      expectedStatus: route.expectedStatus,
      elapsedMs: Date.now() - startedAt,
      contentType: "",
      contentLength: null,
      lastModified: null,
      ok: false,
      body: null,
      summary: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function evaluateStatusBody(statusBody) {
  const findings = [];

  if (!isPlainObject(statusBody)) {
    return [
      {
        ok: false,
        check: "status_body_shape",
        message: "Status endpoint did not return a JSON object.",
      },
    ];
  }

  findings.push({
    ok: statusBody.ok === true,
    check: "status_ok_flag",
    message:
      statusBody.ok === true
        ? "Status endpoint ok flag is true."
        : "Status endpoint ok flag is not true.",
    value: statusBody.ok,
  });

  const summary = isPlainObject(statusBody.summary) ? statusBody.summary : null;

  if (!summary) {
    findings.push({
      ok: false,
      check: "status_summary_shape",
      message: "Status endpoint summary is missing or invalid.",
    });
  } else {
    const failCount = Number(summary.fail_count ?? 0);
    const warnCount = Number(summary.warn_count ?? 0);
    const unknownCount = Number(summary.unknown_count ?? 0);

    findings.push({
      ok: failCount === 0,
      check: "summary_fail_count",
      message:
        failCount === 0
          ? "No chain failures reported by status summary."
          : `Status summary reports ${failCount} failed chains.`,
      value: failCount,
    });

    const warnCountOk = warnCount === 0 || !FAIL_ON_WARNINGS;

    findings.push({
      ok: warnCountOk,
      severity: warnCount === 0 ? "pass" : FAIL_ON_WARNINGS ? "fail" : "warn",
      check: "summary_warn_count",
      message:
        warnCount === 0
          ? "No chain warnings reported by status summary."
          : `Status summary reports ${warnCount} warning chains.`,
      value: warnCount,
    });

    findings.push({
      ok: unknownCount === 0,
      check: "summary_unknown_count",
      message:
        unknownCount === 0
          ? "No unknown chains reported by status summary."
          : `Status summary reports ${unknownCount} unknown chains.`,
      value: unknownCount,
    });
  }

  const chains = Array.isArray(statusBody.chains) ? statusBody.chains : [];

  for (const requiredChain of REQUIRED_STATUS_CHAINS) {
    const chainEntry = chains.find((entry) => entry?.chain === requiredChain);

    if (!isPlainObject(chainEntry)) {
      findings.push({
        ok: false,
        check: "required_chain_present",
        chain: requiredChain,
        message: `Missing status entry for required chain: ${requiredChain}.`,
      });
      continue;
    }

    const chainStatus = String(chainEntry.status ?? "unknown");
    const chainStatusOk =
      chainStatus === "ok" || (chainStatus === "warn" && !FAIL_ON_WARNINGS);
    const chainStatusSeverity =
      chainStatus === "ok"
        ? "pass"
        : chainStatus === "warn" && !FAIL_ON_WARNINGS
          ? "warn"
          : "fail";

    findings.push({
      ok: chainStatusOk,
      severity: chainStatusSeverity,
      check: "chain_status_ok",
      chain: requiredChain,
      message:
        chainStatus === "ok"
          ? `Chain status is ok for ${requiredChain}.`
          : `Chain status is ${chainStatus} for ${requiredChain}.`,
      value: chainStatus,
    });

    const lagDays = Number(chainEntry.lag_days);
    const expectedDelayDays = Number(chainEntry.expected_delay_days);

    if (Number.isFinite(lagDays) && Number.isFinite(expectedDelayDays)) {
      const lagWithinPolicy = lagDays <= expectedDelayDays;
      const lagSeverity = lagWithinPolicy ? "pass" : FAIL_ON_WARNINGS ? "fail" : "warn";

      findings.push({
        ok: lagWithinPolicy || !FAIL_ON_WARNINGS,
        severity: lagSeverity,
        check: "chain_lag_within_policy",
        chain: requiredChain,
        message:
          lagWithinPolicy
            ? `Chain lag is within policy for ${requiredChain}.`
            : `Chain lag exceeds policy for ${requiredChain}: ${lagDays}d > ${expectedDelayDays}d.`,
        lagDays,
        expectedDelayDays,
        asOf: chainEntry.as_of ?? null,
      });
    } else {
      findings.push({
        ok: false,
        check: "chain_lag_fields_present",
        chain: requiredChain,
        message: `Missing numeric lag fields for ${requiredChain}.`,
        lagDays: chainEntry.lag_days ?? null,
        expectedDelayDays: chainEntry.expected_delay_days ?? null,
        asOf: chainEntry.as_of ?? null,
      });
    }
  }

  return findings;
}

function printRouteResult(result) {
  const prefix = result.ok ? "PASS" : "FAIL";
  const statusText = result.status === null ? "NO_STATUS" : String(result.status);

  console.log(
    `${prefix} route=${result.path} status=${statusText} expected=${result.expectedStatus} kind=${result.kind} elapsed_ms=${result.elapsedMs}`,
  );

  if (result.summary) {
    console.log(`  ${result.summary}`);
  }

  if (result.contentType) {
    console.log(`  content_type=${result.contentType}`);
  }

  if (result.contentLength) {
    console.log(`  content_length=${result.contentLength}`);
  }

  if (result.lastModified) {
    console.log(`  last_modified=${result.lastModified}`);
  }

  if (result.error) {
    console.log(`  error=${result.error}`);
  }
}

function statusFindingSeverity(finding) {
  if (finding.severity === "warn") return "warn";
  if (finding.severity === "fail") return "fail";
  return finding.ok ? "pass" : "fail";
}

function printStatusFinding(finding) {
  const severity = statusFindingSeverity(finding);
  const prefix = severity === "warn" ? "WARN" : finding.ok ? "PASS" : "FAIL";
  const chain = finding.chain ? ` chain=${finding.chain}` : "";
  console.log(`${prefix} status_check=${finding.check}${chain}`);
  console.log(`  ${finding.message}`);
}

async function main() {
  console.log("");
  console.log("=== Urd Atlas production healthcheck ===");
  console.log(`Started at UTC: ${nowIso()}`);
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Timeout: ${REQUEST_TIMEOUT_MS}ms`);
  console.log("");

  const routeResults = [];

  for (const route of REQUIRED_ROUTES) {
    const result = await checkRoute(route);
    routeResults.push(result);
    printRouteResult(result);
  }

  const statusRoute = routeResults.find(
    (result) => result.path === "/api/v1/status",
  );

  let statusFindings = [];

  if (statusRoute?.ok && isPlainObject(statusRoute.body)) {
    console.log("");
    console.log("Production status body checks:");

    statusFindings = evaluateStatusBody(statusRoute.body);

    for (const finding of statusFindings) {
      printStatusFinding(finding);
    }
  } else {
    statusFindings = [
      {
        ok: false,
        check: "status_endpoint_unavailable",
        message: "Production status body could not be evaluated.",
      },
    ];

    console.log("");
    console.log("FAIL status_check=status_endpoint_unavailable");
    console.log("  Production status body could not be evaluated.");
  }

  const failedRoutes = routeResults.filter((result) => !result.ok);
  const failedStatusChecks = statusFindings.filter((finding) => !finding.ok);
  const warningStatusChecks = statusFindings.filter(
    (finding) => statusFindingSeverity(finding) === "warn",
  );

  console.log("");
  console.log("Summary:");
  console.log(`  route_failures=${failedRoutes.length}`);
  console.log(`  status_failures=${failedStatusChecks.length}`);
  console.log(`  status_warnings=${warningStatusChecks.length}`);

  if (failedRoutes.length > 0 || failedStatusChecks.length > 0) {
    console.log("");
    console.error("Production healthcheck failed.");

    if (failedRoutes.length > 0) {
      console.error("");
      console.error("Route failures:");
      console.error(safeJsonStringify(failedRoutes.map(({ body, ...rest }) => rest)));
    }

    if (failedStatusChecks.length > 0) {
      console.error("");
      console.error("Status check failures:");
      console.error(safeJsonStringify(failedStatusChecks));
    }

    console.error("");
    console.error("Use docs/runbooks/production-alerts-and-observability.md for routing.");
    console.error("Use docs/runbooks/data-stale-or-missing.md for stale or missing data.");
    process.exit(1);
  }

  console.log("");
  console.log("Production healthcheck passed.");
  console.log(`Finished at UTC: ${nowIso()}`);
  console.log("");
}

main().catch((error) => {
  console.error("");
  console.error("Unexpected production healthcheck failure.");
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exit(1);
});
/*END FILE*/
