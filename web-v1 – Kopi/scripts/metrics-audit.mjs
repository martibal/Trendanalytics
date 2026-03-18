import fs from "fs";
import path from "path";

const ROOT = path.join(process.cwd(), "public", "data", "published", "v1");
const CATALOG_PATH = path.join(process.cwd(), "src", "lib", "metrics", "catalog.ts");

const CHAINS = ["bitcoin", "ethereum", "arbitrum", "base"];
const GENRES = ["gold", "derived", "meta"];

/**
 * Keys that are allowed to exist in daily/latest files but are NOT metrics.
 * These must be excluded from the audit.
 *
 * Note: derived/meta commonly store metrics under a "metrics" object, and keep other fields top-level.
 */
const NON_METRIC_KEYS = new Set([
  "date",
  "chain",
  "dataset_id",
  "revision_id",
  "asof",
  "as_of",
  "updated_through",
  "version",
  "meta",
  "freshness",
  "coverage",
  "confidence",
  "metrics", // container key (derived/meta)

  // Web2 meta-policy / metadata fields that can be scalar and otherwise look "metric-like"
  "publish_lag_days_policy",
  "missing",
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

function pickLatestFile(chain, genre) {
  const latestPath = path.join(ROOT, genre, chain, "latest.json");
  if (fileExists(latestPath)) return latestPath;

  const manifestPath = path.join(ROOT, genre, chain, "manifest.json");
  const manifest = readJson(manifestPath);
  const days = Array.isArray(manifest?.available_days) ? manifest.available_days : [];
  if (!days.length) return null;

  const last = days[days.length - 1];
  const dailyPath = path.join(ROOT, genre, chain, `${last}.json`);
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

function extractMetricLikeKeysFromJson(j) {
  if (!j || typeof j !== "object") return new Set();

  // Prefer metrics container (derived/meta often use it),
  // otherwise fallback to top-level fields (gold daily typically does).
  const metricsObj = j && typeof j.metrics === "object" && j.metrics && !Array.isArray(j.metrics) ? j.metrics : null;

  const ks = new Set();

  if (metricsObj) {
    for (const [k, v] of Object.entries(metricsObj)) {
      if (NON_METRIC_KEYS.has(k)) continue;
      if (isMetricScalar(v)) ks.add(k);
    }
  } else {
    for (const [k, v] of Object.entries(j)) {
      if (NON_METRIC_KEYS.has(k)) continue;
      if (isMetricScalar(v)) ks.add(k);
    }
  }

  return ks;
}

function extractMetricKeysFromFile(p) {
  const j = readJson(p);
  return extractMetricLikeKeysFromJson(j);
}

/**
 * WEB2: Catalog guardrails.
 * We audit that each catalog entry has required doc blocks and stable anchors.
 *
 * This is heuristic parsing (not a TS AST).
 * We do *minimal* structure checks to catch accidental omission.
 */
function auditCatalogStructure(catalogText, catalogKeys) {
  const problems = [];

  // Quick slice around each key and check for doc fields presence.
  // We search for the object block that starts at "  key:" and ends before next "\n  <otherkey>:".n
  const allKeys = Array.from(catalogKeys);

  for (let i = 0; i < allKeys.length; i++) {
    const key = allKeys[i];
    const startRe = new RegExp(`^\\s{2}${key}\\s*:\\s*\\{`, "m");
    const m = startRe.exec(catalogText);
    if (!m) {
      problems.push(`Catalog entry missing block for key=${key} (regex start not found)`);
      continue;
    }

    const startIdx = m.index;
    const nextKey = allKeys.slice(i + 1).find((k2) => {
      const re2 = new RegExp(`^\\s{2}${k2}\\s*:\\s*\\{`, "m");
      return re2.test(catalogText.slice(startIdx + 1));
    });

    let endIdx = catalogText.length;
    if (nextKey) {
      const reNext = new RegExp(`^\\s{2}${nextKey}\\s*:\\s*\\{`, "m");
      const m2 = reNext.exec(catalogText.slice(startIdx + 1));
      if (m2) endIdx = startIdx + 1 + m2.index;
    }

    const block = catalogText.slice(startIdx, endIdx);

    const requiredSnippets = ["doc:", "what:", "basic:", "advanced:", "how:", "why:", "value:", "anchors:", "methodology:", "wiki:"];

    for (const s of requiredSnippets) {
      if (!block.includes(s)) {
        problems.push(`Catalog entry key=${key} missing required snippet: "${s}"`);
      }
    }

    // Stable anchor format check (Web2: /methodology#key and /wiki#key)
    // We check for A("key") usage or explicit string includes.
    const expectedMethod = `/methodology#${key}`;
    const expectedWiki = `/wiki#${key}`;
    const hasExpected =
      block.includes(`A("${key}")`) || block.includes(`A('${key}')`) || (block.includes(expectedMethod) && block.includes(expectedWiki));

    if (!hasExpected) {
      problems.push(`Catalog entry key=${key} anchors not stable (expected ${expectedMethod} and ${expectedWiki})`);
    }
  }

  return problems;
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

  // WEB2: Catalog structure guardrails
  const catalogProblems = auditCatalogStructure(catalogText, catalogKeys);
  if (catalogProblems.length) {
    console.error("AUDIT_FAIL: METRIC_CATALOG structure problems detected:");
    for (const p of catalogProblems.slice(0, 80)) console.error(`- ${p}`);
    if (catalogProblems.length > 80) console.error(`... and ${catalogProblems.length - 80} more.`);
    process.exit(1);
  }

  // Collect metric-like keys across gold/derived/meta (union), per chain
  const dataKeys = new Set();
  const perChain = {};

  for (const c of CHAINS) {
    perChain[c] = {};

    for (const genre of GENRES) {
      const p = pickLatestFile(c, genre);
      if (!p) {
        console.error(`AUDIT_WARN: Could not find latest file for chain=${c} genre=${genre}.`);
        perChain[c][genre] = { file: null, keys: 0 };
        continue;
      }

      const ks = extractMetricKeysFromFile(p);
      for (const k of ks) dataKeys.add(k);
      perChain[c][genre] = { file: p, keys: ks.size };
    }
  }

  const DATA_ONLY = [...dataKeys].filter((k) => !catalogKeys.has(k)).sort();
  const CATALOG_ONLY = [...catalogKeys].filter((k) => !dataKeys.has(k)).sort();

  console.log("=== METRICS AUDIT (metric-like keys vs METRIC_CATALOG) ===");
  console.log(`Published root: ${ROOT}`);
  console.log(`Catalog:        ${CATALOG_PATH}`);
  console.log("");
  console.log(`Non-metric keys excluded: ${[...NON_METRIC_KEYS].join(", ")}`);
  console.log("");

  console.log("Per-chain source files:");
  for (const c of CHAINS) {
    console.log(`- ${c}:`);
    for (const genre of GENRES) {
      const info = perChain[c][genre];
      console.log(`  - ${genre}: ${info.file ?? "NONE"} (metric-like keys=${info.keys})`);
    }
  }
  console.log("");

  console.log(`Catalog keys: ${catalogKeys.size}`);
  console.log(`Data metric-like keys (union across gold/derived/meta): ${dataKeys.size}`);
  console.log("");

  console.log(`DATA_ONLY (in data, not in catalog): ${DATA_ONLY.length}`);
  if (DATA_ONLY.length) console.log(DATA_ONLY.map((k) => `- ${k}`).join("\n"));
  console.log("");

  console.log(`CATALOG_ONLY (in catalog, not seen in data): ${CATALOG_ONLY.length}`);
  if (CATALOG_ONLY.length) console.log(CATALOG_ONLY.map((k) => `- ${k}`).join("\n"));
  console.log("");

  // WEB2: Hard fail if data contains undocumented keys.
  if (DATA_ONLY.length) {
    console.error("AUDIT_FAIL: Data contains metric keys not present in METRIC_CATALOG.");
    process.exit(1);
  }

  // NOTE: We do NOT fail on CATALOG_ONLY by default:
  // - Some catalog metrics may be chain-specific or not yet published for all chains.
  // - This is expected in incremental rollout.
  // However, we DO print it so you can keep catalog clean.
  console.log("AUDIT_OK");
}

main();