import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const WEB_ROOT = path.resolve(process.cwd());
const REPO_ROOT = path.resolve(WEB_ROOT, "..");
const PYTHON = process.env.PYTHON || "python";

const CHAIN = "bitcoin";
const METHODOLOGY_VERSION = "1.1";
const START_DATE = "2026-01-01";
const END_DATE = "2026-01-30";
const FIXED_UTC_TODAY = "2026-01-31";
const EXPECTED_META_GOLDEN_FIXTURE_DIGEST = "9d843e8a4f0e81220fd6aaf58a930dae72741b388dd8f3adfc3eb6190d9e4a4b";
const PLACEHOLDER_DIGEST = "TO_BE_REPLACED_AFTER_LOCAL_BOOTSTRAP";

function isoDay(offset) {
  const date = new Date(`${START_DATE}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

const DAYS = Array.from({ length: 30 }, (_value, index) => isoDay(index));

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeJson(filePath, value) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf-8");
}

function sortObject(value) {
  if (Array.isArray(value)) {
    return value.map(sortObject);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, nested]) => [key, sortObject(nested)]),
    );
  }

  return value;
}

function stableJson(value) {
  return JSON.stringify(sortObject(value));
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function runCommand(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd || REPO_ROOT,
    env: options.env || process.env,
    encoding: "utf-8",
    stdio: "pipe",
  });

  if (result.status !== 0) {
    throw new Error(
      [
        `${command} ${args.join(" ")} failed with exit code ${result.status}`,
        "--- stdout ---",
        result.stdout || "",
        "--- stderr ---",
        result.stderr || "",
      ].join("\n"),
    );
  }

  return result;
}

function readJsonTree(rootDir) {
  const out = {};

  function walk(currentDir) {
    for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }

      if (!entry.isFile() || !entry.name.endsWith(".json")) {
        continue;
      }

      const rel = path.relative(rootDir, fullPath).split(path.sep).join("/");
      out[rel] = JSON.parse(fs.readFileSync(fullPath, "utf-8"));
    }
  }

  if (fs.existsSync(rootDir)) {
    walk(rootDir);
  }

  return Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)));
}

function buildGoldDay(index) {
  const day = DAYS[index];
  const baseTx = 1000 + index * 40;
  const feeWave = index < 10 ? 0.00018 : index < 20 ? 0.00026 : 0.00034;
  const blockTime = index < 15 ? 600 : 604 + (index % 3);
  const medianValue = 1.25 + index * 0.03;

  return {
    chain: CHAIN,
    date: day,
    tx_count_daily: baseTx,
    unique_active_addresses: 500 + index * 12,
    value_transferred_native: Number((baseTx * medianValue).toFixed(6)),
    median_tx_value_native: Number(medianValue.toFixed(6)),
    median_tx_fee_native: Number(feeWave.toFixed(8)),
    failed_tx_rate: null,
    gas_utilization_pct: null,
    avg_block_time_sec: blockTime,
    block_count_daily: 144,
  };
}

function createGoldJsonFixture(goldRoot) {
  const chainDir = path.join(goldRoot, CHAIN);
  ensureDir(chainDir);

  const rows = DAYS.map((_day, index) => buildGoldDay(index));
  for (const row of rows) {
    writeJson(path.join(chainDir, `${row.date}.json`), row);
  }

  writeJson(path.join(chainDir, "latest.json"), rows.at(-1));
  writeJson(path.join(chainDir, "last7d.json"), rows.slice(-7));
  writeJson(path.join(chainDir, "last30d.json"), rows.slice(-30));
}

function createStatusFixture(statusRoot) {
  writeJson(path.join(statusRoot, `${CHAIN}.json`), {
    chain: CHAIN,
    missing: false,
    features_last_date: END_DATE,
    features_lag_days_vs_utc_today: 1,
    generated_at_utc: `${FIXED_UTC_TODAY}T00:00:00Z`,
    row_count: DAYS.length,
    note: "Hermetic META golden fixture status.",
  });
}

function assertObjectSubset(actual, expected, label) {
  if (!actual || typeof actual !== "object") {
    throw new Error(`${label}: expected object`);
  }

  for (const [key, expectedValue] of Object.entries(expected)) {
    const actualValue = actual[key];
    if (JSON.stringify(actualValue) !== JSON.stringify(expectedValue)) {
      throw new Error(
        `${label}.${key}: expected ${JSON.stringify(expectedValue)}, got ${JSON.stringify(actualValue)}`,
      );
    }
  }
}

function assertPresent(value, label) {
  if (value === null || value === undefined) {
    throw new Error(`${label}: expected value to be present`);
  }
}

function validateMetaOutputs(output) {
  const latest = output["bitcoin/latest.json"];
  const day = output[`bitcoin/${END_DATE}.json`];
  const last7 = output["bitcoin/last7d.json"];
  const last30 = output["bitcoin/last30d.json"];

  assertObjectSubset(latest, {
    chain: CHAIN,
    date: END_DATE,
    missing: false,
    methodology_version: METHODOLOGY_VERSION,
    publish_lag_days_policy: 1,
    tier_used: "standard",
  }, "meta.latest");

  assertObjectSubset(day, {
    chain: CHAIN,
    date: END_DATE,
    missing: false,
    methodology_version: METHODOLOGY_VERSION,
  }, `meta.${END_DATE}`);

  if (!Array.isArray(last7) || last7.length !== 7) {
    throw new Error(`meta.last7d.json: expected 7 rows, got ${Array.isArray(last7) ? last7.length : typeof last7}`);
  }

  if (!Array.isArray(last30) || last30.length !== 30) {
    throw new Error(`meta.last30d.json: expected 30 rows, got ${Array.isArray(last30) ? last30.length : typeof last30}`);
  }

  for (const field of ["confidence", "data_confidence", "publish_confidence", "scorecard", "regime", "status"]) {
    assertPresent(latest[field], `meta.latest.${field}`);
  }

  assertPresent(latest.confidence.confidence_score, "meta.latest.confidence.confidence_score");
  assertPresent(latest.confidence.candidate_label, "meta.latest.confidence.candidate_label");
  assertPresent(latest.scorecard.dimensions, "meta.latest.scorecard.dimensions");
  assertPresent(latest.regime.label, "meta.latest.regime.label");
  assertPresent(latest.status.label, "meta.latest.status.label");

  if (latest.confidence.lag_days_vs_utc_today !== 1) {
    throw new Error(
      `meta.latest.confidence.lag_days_vs_utc_today: expected 1, got ${latest.confidence.lag_days_vs_utc_today}`,
    );
  }
}

function runFixtureOnce(tmpRoot, runName) {
  const runRoot = path.join(tmpRoot, runName);
  const goldRoot = path.join(runRoot, "gold-json");
  const statusRoot = path.join(runRoot, "gold-status");
  const metaOutRoot = path.join(runRoot, "meta-json");
  const emptyWeeklyRoot = path.join(runRoot, "empty-gold-weekly");
  const emptyConfidenceRoot = path.join(runRoot, "empty-confidence");
  const emptyConfidenceWeeklyRoot = path.join(runRoot, "empty-confidence-weekly");

  for (const dir of [goldRoot, statusRoot, metaOutRoot, emptyWeeklyRoot, emptyConfidenceRoot, emptyConfidenceWeeklyRoot]) {
    ensureDir(dir);
  }

  createGoldJsonFixture(goldRoot);
  createStatusFixture(statusRoot);

  const env = {
    ...process.env,
    GOLD_DIR: goldRoot,
    GOLD_STATUS_DIR: statusRoot,
    GOLD_WEEKLY_DIR: emptyWeeklyRoot,
    CONFIDENCE_DIR: emptyConfidenceRoot,
    CONFIDENCE_WEEKLY_DIR: emptyConfidenceWeeklyRoot,
    META_DIR: metaOutRoot,
    METHODOLOGY_VERSION,
    CSS_UTC_TODAY: FIXED_UTC_TODAY,
    PYTHONPATH: [REPO_ROOT, process.env.PYTHONPATH].filter(Boolean).join(path.delimiter),
  };

  runCommand(PYTHON, [
    path.join(REPO_ROOT, "pipeline", "tools", "export_meta_json_history.py"),
    "--root",
    REPO_ROOT,
    "--out-root",
    metaOutRoot,
    "--start",
    START_DATE,
    "--mode",
    "rebuild",
    "--windows",
    "7,30",
  ], { env });

  const output = readJsonTree(metaOutRoot);
  const digest = sha256(stableJson(output));

  return { digest, output };
}

function writeReport(reportPath, runA, runB) {
  ensureDir(path.dirname(reportPath));
  fs.writeFileSync(
    reportPath,
    [
      "# Pipeline META golden fixture determinism",
      "",
      `Run A digest: ${runA.digest}`,
      `Run B digest: ${runB.digest}`,
      `Expected digest: ${EXPECTED_META_GOLDEN_FIXTURE_DIGEST}`,
      "",
      "Covered chain: bitcoin",
      "Covered layers: synthetic GOLD JSON fixture -> export_meta_json_history -> api.main -> market_scorecard -> regime_engine -> confidence_engine.",
      "Compared outputs: META JSON day/window/latest files.",
      `Fixed UTC today: ${FIXED_UTC_TODAY}`,
      "",
    ].join("\n"),
    "utf-8",
  );
}

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "urd-meta-golden-fixture-"));

try {
  const runA = runFixtureOnce(tmpRoot, "run-a");
  const runB = runFixtureOnce(tmpRoot, "run-b");

  if (runA.digest !== runB.digest) {
    throw new Error(`META golden fixture digest mismatch: ${runA.digest} != ${runB.digest}`);
  }

  validateMetaOutputs(runA.output);
  validateMetaOutputs(runB.output);

  const reportPath = path.join(WEB_ROOT, ".audit", "pipeline-meta-golden-fixture", "pipeline-meta-golden-fixture.md");
  writeReport(reportPath, runA, runB);

  if (EXPECTED_META_GOLDEN_FIXTURE_DIGEST === PLACEHOLDER_DIGEST) {
    if (process.env.META_GOLDEN_FIXTURE_BOOTSTRAP === "1") {
      console.log("Pipeline META golden fixture bootstrap passed.");
      console.log(`Digest: ${runA.digest}`);
      console.log(`Report: ${path.relative(WEB_ROOT, reportPath)}`);
      process.exit(0);
    }

    throw new Error(
      `META golden fixture expected digest is not committed yet. Bootstrap digest: ${runA.digest}`,
    );
  }

  if (runA.digest !== EXPECTED_META_GOLDEN_FIXTURE_DIGEST) {
    throw new Error(
      `META golden fixture digest ${runA.digest} does not match committed expected digest ${EXPECTED_META_GOLDEN_FIXTURE_DIGEST}`,
    );
  }

  console.log("Pipeline META golden fixture determinism check passed.");
  console.log(`Digest: ${runA.digest}`);
  console.log(`Report: ${path.relative(WEB_ROOT, reportPath)}`);
} finally {
  if (process.env.KEEP_PIPELINE_META_GOLDEN_FIXTURE === "1") {
    console.log(`Kept fixture workdir: ${tmpRoot}`);
  } else {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
}

