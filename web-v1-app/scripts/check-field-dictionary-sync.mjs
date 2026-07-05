#!/usr/bin/env node
/*START FILE*/
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const WEB_ROOT = process.cwd();
const REPO_ROOT = path.resolve(WEB_ROOT, "..");

const FIELD_DICTIONARY_PATH = path.join(WEB_ROOT, "src", "app", "methodology", "fields", "page.tsx");
const FEATURE_AGG_PATH = path.join(REPO_ROOT, "pipeline", "src", "feature_daily_agg.py");
const MARKET_SCORECARD_PATH = path.join(REPO_ROOT, "api", "market_scorecard.py");
const CONFIDENCE_ENGINE_PATH = path.join(REPO_ROOT, "api", "confidence_engine.py");

const NON_GOLD_PROFILE_SIGNALS = new Set([
  "blocktime_instability",
  "capacity_util_pct",
  "fee_burden_proxy",
  "median_gas_price",
  "tx_per_user",
]);

const failures = [];

function rel(filePath) {
  return path.relative(REPO_ROOT, filePath).split(path.sep).join("/");
}

function read(filePath) {
  try {
    return fs.readFileSync(filePath, "utf-8");
  } catch (error) {
    failures.push(`${rel(filePath)}: failed to read file: ${error instanceof Error ? error.message : String(error)}`);
    return "";
  }
}

function extractPythonListStrings(source, name, filePath) {
  const re = new RegExp(`${name}\\s*=\\s*\\[([\\s\\S]*?)\\]`, "m");
  const match = source.match(re);
  if (!match) {
    failures.push(`${rel(filePath)}: could not find ${name}`);
    return [];
  }
  return [...match[1].matchAll(/["']([^"']+)["']/g)].map((m) => m[1]);
}

function extractGoldFieldDictionaryFields(source) {
  const match = source.match(/const GOLD_FIELDS[\s\S]*?=\s*\[([\s\S]*?)\n\];/m);
  if (!match) {
    failures.push(`${rel(FIELD_DICTIONARY_PATH)}: could not find GOLD_FIELDS array`);
    return [];
  }
  return [...match[1].matchAll(/field:\s*["']([^"']+)["']/g)].map((m) => m[1]);
}

function extractAxisMapText(source) {
  const match = source.match(/field-dictionary-axis-map:start([\s\S]*?)field-dictionary-axis-map:end/m);
  if (!match) {
    failures.push(`${rel(FIELD_DICTIONARY_PATH)}: could not find field-dictionary-axis-map markers`);
    return "";
  }
  return match[1];
}

function extractProfileComponentFields(source) {
  const match = source.match(/PROFILE_COMPONENTS[\s\S]*?=\s*\{([\s\S]*?)\n\}\n\n\ndef _profile_for_chain/m);
  if (!match) {
    failures.push(`${rel(MARKET_SCORECARD_PATH)}: could not find PROFILE_COMPONENTS block`);
    return [];
  }
  return [...match[1].matchAll(/\(\s*["']([^"']+)["']\s*,\s*[0-9.]+\s*,\s*["'][^"']+["']\s*\)/g)]
    .map((m) => m[1]);
}

function extractConfidenceProfileFields(source) {
  const match = source.match(/CHAIN_SIGNAL_PROFILES[\s\S]*?=\s*\{([\s\S]*?)\n\}\n\n\nLOGICAL_METRIC_ALIASES/m);
  if (!match) {
    failures.push(`${rel(CONFIDENCE_ENGINE_PATH)}: could not find CHAIN_SIGNAL_PROFILES block`);
    return [];
  }
  return [...match[1].matchAll(/["']([a-z][a-z0-9_]*_[a-z0-9_]+)["']/g)]
    .map((m) => m[1])
    .filter((name) => !["not_applicable", "not_penalized"].includes(name));
}

function unique(values) {
  return [...new Set(values)].sort();
}

function difference(left, rightSet) {
  return unique(left.filter((item) => !rightSet.has(item)));
}

const fieldDictionary = read(FIELD_DICTIONARY_PATH);
const featureAgg = read(FEATURE_AGG_PATH);
const marketScorecard = read(MARKET_SCORECARD_PATH);
const confidenceEngine = read(CONFIDENCE_ENGINE_PATH);

const canonFields = extractPythonListStrings(featureAgg, "CANON_COLS", FEATURE_AGG_PATH);
const canonGoldMetricFields = canonFields.filter((field) => field !== "date" && field !== "chain");
const documentedGoldFields = extractGoldFieldDictionaryFields(fieldDictionary);
const documentedGoldSet = new Set(documentedGoldFields);
const axisMapText = extractAxisMapText(fieldDictionary);
const profileComponentFields = unique(extractProfileComponentFields(marketScorecard));
const confidenceProfileFields = unique(extractConfidenceProfileFields(confidenceEngine));

const missingGoldFields = difference(canonGoldMetricFields, documentedGoldSet);
if (missingGoldFields.length > 0) {
  failures.push(
    `${rel(FIELD_DICTIONARY_PATH)}: GOLD_FIELDS is missing CANON_COLS metrics: ${missingGoldFields.join(", ")}`,
  );
}

const extraGoldFields = difference(documentedGoldFields, new Set(canonGoldMetricFields));
if (extraGoldFields.length > 0) {
  failures.push(
    `${rel(FIELD_DICTIONARY_PATH)}: GOLD_FIELDS contains fields not present in CANON_COLS metrics: ${extraGoldFields.join(", ")}`,
  );
}

const missingAxisSignals = profileComponentFields.filter((field) => !axisMapText.includes(field));
if (missingAxisSignals.length > 0) {
  failures.push(
    `${rel(FIELD_DICTIONARY_PATH)}: axis mapping table is missing PROFILE_COMPONENTS signals: ${missingAxisSignals.join(", ")}`,
  );
}

const canonSet = new Set(canonGoldMetricFields);
const unexpectedConfidenceFields = confidenceProfileFields.filter(
  (field) => !canonSet.has(field) && !NON_GOLD_PROFILE_SIGNALS.has(field),
);
if (unexpectedConfidenceFields.length > 0) {
  failures.push(
    `${rel(CONFIDENCE_ENGINE_PATH)}: CHAIN_SIGNAL_PROFILES references fields that are neither Gold metrics nor known non-Gold profile signals: ${unexpectedConfidenceFields.join(", ")}`,
  );
}

const missingDocumentedConfidenceGold = confidenceProfileFields.filter(
  (field) => canonSet.has(field) && !documentedGoldSet.has(field),
);
if (missingDocumentedConfidenceGold.length > 0) {
  failures.push(
    `${rel(FIELD_DICTIONARY_PATH)}: GOLD_FIELDS is missing Gold metrics referenced by CHAIN_SIGNAL_PROFILES: ${unique(missingDocumentedConfidenceGold).join(", ")}`,
  );
}

if (failures.length > 0) {
  console.error("Field Dictionary sync check failed.");
  console.error("");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  console.error("");
  console.error("Keep methodology/fields aligned with pipeline/src/feature_daily_agg.py, api/market_scorecard.py, and api/confidence_engine.py.");
  process.exit(1);
}

console.log("Field Dictionary sync check passed.");
console.log(`Gold metric fields documented: ${documentedGoldFields.length}/${canonGoldMetricFields.length}`);
console.log(`Scorecard profile signals covered in axis table: ${profileComponentFields.length}`);
console.log(`Confidence profile fields checked: ${confidenceProfileFields.length}`);
/*END FILE*/
