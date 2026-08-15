#!/usr/bin/env node
import process from "node:process";

const BASE_URL = String(process.env.URD_HEALTHCHECK_BASE_URL || "https://www.urdatlas.com").replace(/\/+$/, "");
const TIMEOUT_MS = Number.parseInt(process.env.URD_HEALTHCHECK_TIMEOUT_MS || "15000", 10);
const PRO_API_KEY = String(process.env.URD_HEALTHCHECK_PRO_API_KEY || "").trim();
const BASIC_API_KEY = String(process.env.URD_HEALTHCHECK_BASIC_API_KEY || "").trim();
const BASIC_CHAIN = String(process.env.URD_HEALTHCHECK_BASIC_CHAIN || "").trim().toLowerCase();
const ARCHIVE_DATE = "2024-12-01";

const failures = [];

function textFromHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

async function request(path, apiKey = "") {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(`${BASE_URL}${path}`, {
      headers: {
        accept: "application/json,text/html;q=0.9,*/*;q=0.8",
        "user-agent": "urd-atlas-production-history-contract/1.0",
        ...(apiKey ? { "X-API-Key": apiKey } : {}),
      },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

function pass(name, detail = "") {
  console.log(`PASS ${name}${detail ? ` — ${detail}` : ""}`);
}

function skip(name, detail) {
  console.log(`SKIP ${name} — ${detail}`);
}

function fail(name, detail) {
  failures.push({ name, detail });
  console.error(`FAIL ${name} — ${detail}`);
}

async function checkPage(path, required = [], forbidden = []) {
  const response = await request(path);
  if (response.status !== 200) {
    fail(`page ${path}`, `expected 200, got ${response.status}`);
    return;
  }

  const text = textFromHtml(await response.text());
  for (const phrase of required) {
    if (!text.includes(phrase.toLowerCase())) {
      fail(`page ${path}`, `missing required text: ${phrase}`);
    } else {
      pass(`page ${path}`, `contains: ${phrase}`);
    }
  }

  for (const phrase of forbidden) {
    if (text.includes(phrase.toLowerCase())) {
      fail(`page ${path}`, `contains obsolete text: ${phrase}`);
    } else {
      pass(`page ${path}`, `obsolete text absent: ${phrase}`);
    }
  }
}

async function checkProArchive() {
  if (!PRO_API_KEY) {
    skip("Pro full-history API", "URD_HEALTHCHECK_PRO_API_KEY is not configured");
    return;
  }

  for (const path of [
    "/api/v1/files/meta/ethereum/manifest.json",
    `/api/v1/files/meta/ethereum/${ARCHIVE_DATE}.json`,
  ]) {
    const response = await request(path, PRO_API_KEY);
    if (response.status !== 200) {
      fail("Pro full-history API", `${path} expected 200, got ${response.status}`);
    } else {
      pass("Pro full-history API", `${path} returned 200`);
      await response.arrayBuffer();
    }
  }
}

async function checkBasicBoundary() {
  if (!BASIC_API_KEY || !BASIC_CHAIN) {
    skip(
      "Basic 90-day boundary",
      "URD_HEALTHCHECK_BASIC_API_KEY and URD_HEALTHCHECK_BASIC_CHAIN are not both configured",
    );
    return;
  }

  const allowedChains = new Set(["bitcoin", "ethereum", "arbitrum", "base"]);
  if (!allowedChains.has(BASIC_CHAIN)) {
    fail("Basic 90-day boundary", `invalid configured chain: ${BASIC_CHAIN}`);
    return;
  }

  const path = `/api/v1/files/meta/${BASIC_CHAIN}/${ARCHIVE_DATE}.json`;
  const response = await request(path, BASIC_API_KEY);
  await response.arrayBuffer();

  if (response.status !== 403) {
    fail("Basic 90-day boundary", `${path} expected 403, got ${response.status}`);
  } else {
    pass("Basic 90-day boundary", `${ARCHIVE_DATE} correctly rejected with 403`);
  }
}

async function main() {
  console.log("=== Production subscriber history contract ===");
  console.log(`Base URL: ${BASE_URL}`);

  await checkPage("/", [
    "90 days of history available immediately",
    "full published history",
    "enough to test the join. subscribe for enough history to trust the pattern.",
  ]);

  await checkPage("/faq", [
    "how much history do i get when i subscribe?",
    "basic gives immediate access to 90 days of history",
    "pro gives immediate access to the full published history",
  ]);

  await checkPage("/api-docs/history", [
    "basic",
    "90 days",
    "pro",
    "full published history",
    "manifest first, then original day files",
  ]);

  await checkPage(
    "/api-docs/getting-started",
    ["basic", "90 days", "pro", "full published history"],
    [
      "single chain gives one chain with 90 days",
      "research gives all four chains with 365 days",
      "full archive access, when offered, remains a separate add-on",
      "history add-on",
    ],
  );

  await checkProArchive();
  await checkBasicBoundary();

  if (failures.length > 0) {
    console.error("\nProduction subscriber history contract failed:");
    console.error(JSON.stringify(failures, null, 2));
    process.exit(1);
  }

  console.log("\nProduction subscriber history contract passed.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exit(1);
});
