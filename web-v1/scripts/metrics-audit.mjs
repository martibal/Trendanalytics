import fs from "fs";
import path from "path";

const ROOT = path.join(process.cwd(), "public", "data", "published", "v1");
const CATALOG_PATH = path.join(process.cwd(), "src", "lib", "metrics", "catalog.ts");

const CHAINS = ["bitcoin", "ethereum", "arbitrum", "base"];

/**
 * Keys that are allowed to exist in gold daily/latest files but are NOT metrics.
 * These must be excluded from the audit.
 */
const NON_METRIC_KEYS = new Set([
  "date",
  "chain",
  "dataset_id",
  "revision_id",
  "asof",
  "version",
]);

function readText(p) {
  try {
    return fs.readFileSync(p, "utf8");
  } catch {
    return null;
  }
}

function readJson(p) {
  try {
    const t = fs.readFileSync(p, "utf8");
    return JSON.parse(t);
  } catch {
    return null;
  }
}

function fileExists(p) {
  try {
    fs.accessSync(p);
    return true;
  } catch {
    return false;
  }
}

function extractCatalogKeys(catalogText) {
  // Extract keys like:
  // export const METRIC_CATALOG = {
  //   tx_count_daily: { ... },
  // };
  const keys = new Set();

  const startIdx = catalogText.indexOf("METRIC_CATALOG");
  if (startIdx === -1) return keys;

  const slice = catalogText.slice(startIdx);
  const braceIdx = slice.indexOf("{");
  if (braceIdx === -1) return keys;

  // Heuristic: keys at indent level 2 inside object: "  key_name: {"
  const re = /^\s{2}([a-zA-Z0-9_]+)\s*:\s*\{/gm;
  let m;
  while ((m = re.exec(slice)) !== null) {
    keys.add(m[1]);
  }
  return keys;
}

function pickLatestGoldFile(chain) {
  const latestPath = path.join(ROOT, "gold", chain, "latest.json");
  if (fileExists(latestPath)) return latestPath;

  const manifestPath = path.join(ROOT, "gold", chain, "manifest.json");
  const manifest = readJson(manifestPath);
  const days = Array.isArray(manifest?.available_days) ? manifest.available_days : [];
  if (!days.length) return null;

  const last = days[days.length - 1];
  const dailyPath = path.join(ROOT, "gold", chain, `${last}.json`);
  if (fileExists(dailyPath)) return dailyPath;

  return null;
}

function isMetricScalar(v) {
  // We accept numeric (incl null) and boolean as "metric-like scalars".
  // Strings/objects are treated as non-metric metadata.
  if (v === null) return true;
  if (typeof v === "number" && Number.isFinite(v)) return true;
  if (typeof v === "boolean") return true;
  return false;
}

function extractGoldMetricKeysFromFile(p) {
  const j = readJson(p);
  if (!j || typeof j !== "object") return new Set();

  const ks = new Set();
  for (const [k, v] of Object.entries(j)) {
    if (NON_METRIC_KEYS.has(k)) continue;
    // Only include scalar metric-like fields
    if (isMetricScalar(v)) ks.add(k);
  }
  return ks;
}

function main() {
  if (!fileExists(ROOT)) {
    console.error(`AUDIT_FAIL: Missing published root: ${ROOT}`);
    process.exit(1);
  }

  const catalogText = readText(CATALOG_PATH);
  if (!catalogText) {
    console.error(`AUDIT_FAIL: Missing catalog file: ${CATALOG_PATH}`);
    process.exit(1);
  }

  const catalogKeys = extractCatalogKeys(catalogText);
  if (catalogKeys.size === 0) {
    console.error(`AUDIT_FAIL: Could not extract keys from catalog (regex failed).`);
    process.exit(1);
  }

  const dataKeys = new Set();
  const perChain = {};

  for (const c of CHAINS) {
    const p = pickLatestGoldFile(c);
    if (!p) {
      console.error(`AUDIT_WARN: Could not find latest gold file for chain=${c}.`);
      perChain[c] = { file: null, keys: 0 };
      continue;
    }
    const ks = extractGoldMetricKeysFromFile(p);
    for (const k of ks) dataKeys.add(k);
    perChain[c] = { file: p, keys: ks.size };
  }

  const DATA_ONLY = [...dataKeys].filter((k) => !catalogKeys.has(k)).sort();
  const CATALOG_ONLY = [...catalogKeys].filter((k) => !dataKeys.has(k)).sort();

  console.log("=== METRICS AUDIT (gold metric keys vs catalog) ===");
  console.log(`Published root: ${ROOT}`);
  console.log(`Catalog:        ${CATALOG_PATH}`);
  console.log("");
  console.log(`Non-metric keys excluded: ${[...NON_METRIC_KEYS].join(", ")}`);
  console.log("");

  console.log("Per-chain source files:");
  for (const c of CHAINS) {
    const info = perChain[c];
    console.log(`- ${c}: ${info.file ?? "NONE"} (metric-like keys=${info.keys})`);
  }
  console.log("");

  console.log(`Catalog keys: ${catalogKeys.size}`);
  console.log(`Data metric-like keys: ${dataKeys.size}`);
  console.log("");

  console.log(`DATA_ONLY (in data, not in catalog): ${DATA_ONLY.length}`);
  if (DATA_ONLY.length) console.log(DATA_ONLY.map((k) => `- ${k}`).join("\n"));
  console.log("");

  console.log(`CATALOG_ONLY (in catalog, not seen in data): ${CATALOG_ONLY.length}`);
  if (CATALOG_ONLY.length) console.log(CATALOG_ONLY.map((k) => `- ${k}`).join("\n"));
  console.log("");

  if (DATA_ONLY.length) {
    console.error("AUDIT_FAIL: Data contains metric keys not present in METRIC_CATALOG.");
    process.exit(1);
  }

  console.log("AUDIT_OK");
}

main();