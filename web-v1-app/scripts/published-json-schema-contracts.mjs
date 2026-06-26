#!/usr/bin/env node
/*START FILE*/
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const WEB_ROOT = process.cwd();
const REPO_ROOT = path.resolve(WEB_ROOT, "..");
const PUBLISHED_ROOT = path.join(REPO_ROOT, "data", "published", "v1");
const REPORT_PATH = path.join(WEB_ROOT, ".audit", "published-json-schemas", "published-json-schema-contracts.md");

const CONTRACT_VERSION = "published_json_contracts.v1";
const CHAINS = ["bitcoin", "ethereum", "arbitrum", "base"];
const WINDOW_SPECS = [
  ["latest.json", null],
  ["last7d.json", 7],
  ["last30d.json", 30],
  ["last90d.json", 90],
  ["last180d.json", 180],
  ["last365d.json", 365],
];

const GOLD_METRICS = [
  "tx_count_daily",
  "unique_active_addresses",
  "value_transferred_native",
  "median_tx_value_native",
  "median_tx_fee_native",
  "failed_tx_rate",
  "gas_utilization_pct",
  "avg_block_time_sec",
  "block_count_daily",
];

const failures = [];
const warnings = [];
const counters = { files: 0, rows: 0, goldRows: 0, derivedRows: 0, metaRows: 0 };

function rel(filePath) {
  return path.relative(REPO_ROOT, filePath).split(path.sep).join("/");
}

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function isNullOrNumber(value) {
  return value === null || isFiniteNumber(value);
}

function isIsoDate(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function assertContract(condition, location, detail) {
  if (!condition) {
    failures.push({ location, detail });
  }
}

function warnContract(condition, location, detail) {
  if (!condition) {
    warnings.push({ location, detail });
  }
}

function readJson(filePath) {
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    counters.files += 1;
    return parsed;
  } catch (error) {
    failures.push({
      location: rel(filePath),
      detail: `JSON parse failed: ${error instanceof Error ? error.message : String(error)}`,
    });
    return null;
  }
}

function validateChainAndDate(row, location, { allowNullDate = false } = {}) {
  assertContract(isObject(row), location, "row must be a JSON object");
  if (!isObject(row)) {
    return;
  }

  assertContract(CHAINS.includes(row.chain), `${location}.chain`, `chain must be one of ${CHAINS.join(", ")}`);
  assertContract(
    allowNullDate ? row.date === null || isIsoDate(row.date) : isIsoDate(row.date),
    `${location}.date`,
    allowNullDate ? "date must be YYYY-MM-DD or null" : "date must be YYYY-MM-DD",
  );
}

function validateGoldRow(row, location) {
  counters.rows += 1;
  counters.goldRows += 1;
  validateChainAndDate(row, location);

  if (!isObject(row)) {
    return;
  }

  for (const metric of GOLD_METRICS) {
    assertContract(Object.hasOwn(row, metric), `${location}.${metric}`, "required GOLD metric field is missing");
    if (Object.hasOwn(row, metric)) {
      assertContract(isNullOrNumber(row[metric]), `${location}.${metric}`, "GOLD metric must be number or null");
    }
  }
}

function validateDerivedRow(row, location) {
  counters.rows += 1;
  counters.derivedRows += 1;
  validateChainAndDate(row, location);

  if (!isObject(row)) {
    return;
  }

  assertContract(isObject(row.derived), `${location}.derived`, "derived must be an object");
  if (!isObject(row.derived)) {
    return;
  }

  const metrics = row.derived.metrics;
  assertContract(isObject(metrics), `${location}.derived.metrics`, "derived.metrics must be an object");

  if (isObject(metrics)) {
    const entries = Object.entries(metrics);
    assertContract(entries.length > 0, `${location}.derived.metrics`, "derived.metrics must not be empty");

    for (const [key, value] of entries) {
      assertContract(/^[a-z0-9_]+__(ma7|ma30)$/.test(key), `${location}.derived.metrics.${key}`, "derived metric key must end in __ma7 or __ma30");
      assertContract(isNullOrNumber(value), `${location}.derived.metrics.${key}`, "derived metric value must be number or null");
    }
  }

  const source = row.derived.source;
  assertContract(isObject(source), `${location}.derived.source`, "derived.source must be an object");

  if (isObject(source)) {
    assertContract(source.chain === row.chain, `${location}.derived.source.chain`, "derived source chain must match row chain");
    assertContract(source.date === row.date, `${location}.derived.source.date`, "derived source date must match row date");
    assertContract(typeof source.producer === "string" && source.producer.length > 0, `${location}.derived.source.producer`, "producer must be a non-empty string");
    assertContract(typeof source.formula === "string" && source.formula.length > 0, `${location}.derived.source.formula`, "formula must be a non-empty string");
    assertContract(Array.isArray(source.metric_columns), `${location}.derived.source.metric_columns`, "metric_columns must be an array");
    assertContract(Array.isArray(source.rolling_windows), `${location}.derived.source.rolling_windows`, "rolling_windows must be an array");
    if (typeof source.gold_sha256 === "string") {
      assertContract(/^[a-f0-9]{64}$/i.test(source.gold_sha256), `${location}.derived.source.gold_sha256`, "gold_sha256 must be a SHA-256 hex digest");
    }
  }

  assertContract(Array.isArray(row.derived.context_blocks), `${location}.derived.context_blocks`, "context_blocks must be an array");
  assertContract(isObject(row.derived.meta_confidence), `${location}.derived.meta_confidence`, "meta_confidence must be an object");
}

function validateConfidenceBlock(block, location) {
  assertContract(isObject(block), location, "confidence block must be an object");
  if (!isObject(block)) {
    return;
  }

  assertContract(isNullOrNumber(block.confidence_score), `${location}.confidence_score`, "confidence_score must be number or null");
  assertContract(
    block.lag_days_vs_utc_today === undefined || block.lag_days_vs_utc_today === null || Number.isInteger(block.lag_days_vs_utc_today),
    `${location}.lag_days_vs_utc_today`,
    "lag_days_vs_utc_today must be integer or null when present",
  );
}

function validateScorecard(block, location) {
  assertContract(isObject(block), location, "scorecard must be an object");
  if (!isObject(block)) {
    return;
  }

  const dimensions = block.dimensions;
  assertContract(isObject(dimensions) || Array.isArray(dimensions), `${location}.dimensions`, "scorecard.dimensions must be an object or array");

  if (isObject(dimensions)) {
    for (const axis of ["demand", "friction", "capacity"]) {
      assertContract(isObject(dimensions[axis]), `${location}.dimensions.${axis}`, "scorecard dimension axis must be an object");
    }
  }

  if (Array.isArray(dimensions)) {
    const keys = new Set(dimensions.map((entry) => (isObject(entry) ? entry.key : null)));
    for (const axis of ["demand", "friction", "capacity"]) {
      assertContract(keys.has(axis), `${location}.dimensions`, `scorecard dimensions array must include ${axis}`);
    }
  }
}

function validateRegime(block, location) {
  assertContract(isObject(block), location, "regime must be an object");
  if (!isObject(block)) {
    return;
  }

  assertContract(typeof block.label === "string" && block.label.length > 0, `${location}.label`, "regime.label must be a non-empty string");
  assertContract(
    block.asof_date === undefined || block.asof_date === null || isIsoDate(block.asof_date),
    `${location}.asof_date`,
    "regime.asof_date must be YYYY-MM-DD, null, or omitted",
  );

  if (block.drivers !== undefined) {
    assertContract(Array.isArray(block.drivers), `${location}.drivers`, "regime.drivers must be an array when present");
  }

  if (block.axes !== undefined) {
    assertContract(isObject(block.axes), `${location}.axes`, "regime.axes must be an object when present");
  }
}

function validatePublishConfidence(block, location) {
  assertContract(isObject(block), location, "publish_confidence must be an object");
  if (!isObject(block)) {
    return;
  }

  assertContract(block.eligible === null || typeof block.eligible === "boolean", `${location}.eligible`, "publish_confidence.eligible must be boolean or null");
  assertContract(block.threshold === undefined || isNullOrNumber(block.threshold), `${location}.threshold`, "publish_confidence.threshold must be number or null when present");
}

function validateStatus(block, location) {
  assertContract(isObject(block), location, "status must be an object");
  if (!isObject(block)) {
    return;
  }

  assertContract(typeof block.label === "string" && block.label.length > 0, `${location}.label`, "status.label must be a non-empty string");
  assertContract(block.color === undefined || block.color === null || typeof block.color === "string", `${location}.color`, "status.color must be string, null, or omitted");
}

function validateMetaRow(row, location) {
  counters.rows += 1;
  counters.metaRows += 1;
  validateChainAndDate(row, location, { allowNullDate: true });

  if (!isObject(row)) {
    return;
  }

  assertContract(typeof row.methodology_version === "string" && row.methodology_version.length > 0, `${location}.methodology_version`, "methodology_version must be a non-empty string");
  assertContract(typeof row.missing === "boolean", `${location}.missing`, "missing must be boolean");
  assertContract(row.updated_through === null || isIsoDate(row.updated_through), `${location}.updated_through`, "updated_through must be YYYY-MM-DD or null");
  assertContract(Number.isInteger(row.publish_lag_days_policy), `${location}.publish_lag_days_policy`, "publish_lag_days_policy must be an integer");
  assertContract(typeof row.tier_used === "string" && row.tier_used.length > 0, `${location}.tier_used`, "tier_used must be a non-empty string");

  validateConfidenceBlock(row.confidence, `${location}.confidence`);
  validateConfidenceBlock(row.data_confidence, `${location}.data_confidence`);
  validatePublishConfidence(row.publish_confidence, `${location}.publish_confidence`);
  validateScorecard(row.scorecard, `${location}.scorecard`);
  validateRegime(row.regime, `${location}.regime`);
  validateStatus(row.status, `${location}.status`);

  if (row.revision_id !== undefined) {
    assertContract(typeof row.revision_id === "string" || typeof row.revision_id === "number", `${location}.revision_id`, "revision_id must be string or number when present");
  }
}

function assertDatesSorted(rows, location) {
  let previous = "";
  for (const [index, row] of rows.entries()) {
    if (!isObject(row) || !isIsoDate(row.date)) {
      continue;
    }
    assertContract(row.date >= previous, `${location}[${index}].date`, "window rows must be sorted ascending by date");
    previous = row.date;
  }
}

function validateWindowFile(filePath, maxRows, rowValidator) {
  const location = rel(filePath);
  const payload = readJson(filePath);

  if (maxRows === null) {
    rowValidator(payload, location);
    return;
  }

  assertContract(Array.isArray(payload), location, "window artifact must be an array");
  if (!Array.isArray(payload)) {
    return;
  }

  assertContract(payload.length > 0, location, "window artifact must not be empty");
  assertContract(payload.length <= maxRows, location, `window artifact must contain at most ${maxRows} rows`);
  assertDatesSorted(payload, location);

  for (const [index, row] of payload.entries()) {
    rowValidator(row, `${location}[${index}]`);
  }
}

function validateGenre(genre, rowValidator) {
  for (const chain of CHAINS) {
    for (const [fileName, maxRows] of WINDOW_SPECS) {
      const filePath = path.join(PUBLISHED_ROOT, genre, chain, fileName);
      assertContract(fs.existsSync(filePath), rel(filePath), "required published artifact file is missing");
      if (fs.existsSync(filePath)) {
        validateWindowFile(filePath, maxRows, rowValidator);
      }
    }
  }
}

function validateRootJson() {
  for (const fileName of ["dataset.json", "contract.json", "index.json", "latest.json", "source-freshness.json"]) {
    const filePath = path.join(PUBLISHED_ROOT, fileName);
    assertContract(fs.existsSync(filePath), rel(filePath), "required published root JSON file is missing");
    if (!fs.existsSync(filePath)) {
      continue;
    }

    const payload = readJson(filePath);
    assertContract(isObject(payload), rel(filePath), "published root JSON file must contain an object");

    if (fileName === "dataset.json" && isObject(payload)) {
      warnContract(isObject(payload.asof_by_genre_chain), `${rel(filePath)}.asof_by_genre_chain`, "dataset index should include asof_by_genre_chain");
      warnContract(isObject(payload.coverage), `${rel(filePath)}.coverage`, "dataset index should include coverage");
    }

    if (fileName === "contract.json" && isObject(payload)) {
      const directThreshold = payload.gating_threshold_default;
      const nestedThreshold = isObject(payload.gating) ? payload.gating.gating_threshold_default : undefined;
      const metaConfidenceThreshold =
        isObject(payload.meta) && isObject(payload.meta.confidence)
          ? payload.meta.confidence.gating_threshold_default
          : undefined;

      assertContract(
        isFiniteNumber(directThreshold) || isFiniteNumber(nestedThreshold) || isFiniteNumber(metaConfidenceThreshold),
        `${rel(filePath)}.meta.confidence.gating_threshold_default`,
        "contract must expose a numeric default gating threshold",
      );
    }
  }
}

function writeReport() {
  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });

  const lines = [
    "# Published JSON schema contracts",
    "",
    `Contract version: ${CONTRACT_VERSION}`,
    `Published root: ${path.relative(WEB_ROOT, PUBLISHED_ROOT).split(path.sep).join("/")}`,
    "",
    "## Result",
    "",
    `Failures: ${failures.length}`,
    `Warnings: ${warnings.length}`,
    "",
    "## Coverage",
    "",
    `Checked files: ${counters.files}`,
    `Checked rows: ${counters.rows}`,
    `Gold rows: ${counters.goldRows}`,
    `Derived rows: ${counters.derivedRows}`,
    `Meta rows: ${counters.metaRows}`,
    "",
    "Covered artifact families:",
    "- Root published contract/index files: dataset.json, contract.json, index.json, latest.json, source-freshness.json.",
    "- Core subscriber data files: gold/meta/derived latest.json and last7d/last30d/last90d/last180d/last365d per supported chain.",
    "",
  ];

  if (failures.length > 0) {
    lines.push("## Failures", "");
    for (const failure of failures) {
      lines.push(`- ${failure.location}: ${failure.detail}`);
    }
    lines.push("");
  }

  if (warnings.length > 0) {
    lines.push("## Warnings", "");
    for (const warning of warnings) {
      lines.push(`- ${warning.location}: ${warning.detail}`);
    }
    lines.push("");
  }

  fs.writeFileSync(REPORT_PATH, `${lines.join("\n")}\n`, "utf-8");
}

assertContract(fs.existsSync(PUBLISHED_ROOT), rel(PUBLISHED_ROOT), "published root is missing");

if (fs.existsSync(PUBLISHED_ROOT)) {
  validateRootJson();
  validateGenre("gold", validateGoldRow);
  validateGenre("derived", validateDerivedRow);
  validateGenre("meta", validateMetaRow);
}

writeReport();

if (failures.length > 0) {
  console.error("Published JSON schema contract check failed.");
  console.error(`Failures: ${failures.length}`);
  console.error(`Report: ${path.relative(WEB_ROOT, REPORT_PATH)}`);
  process.exit(1);
}

console.log("Published JSON schema contract check passed.");
console.log(`Checked files: ${counters.files}`);
console.log(`Checked rows: ${counters.rows}`);
console.log(`Warnings: ${warnings.length}`);
console.log(`Report: ${path.relative(WEB_ROOT, REPORT_PATH)}`);
/*END FILE*/

