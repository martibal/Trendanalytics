import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const WEB_ROOT = path.resolve(process.cwd());
const REPO_ROOT = path.resolve(WEB_ROOT, "..");
const PYTHON = process.env.PYTHON || "python";
const CHAIN = "bitcoin";
const DAYS = ["2026-01-01", "2026-01-02", "2026-01-03"];
const FIXED_GENERATED_AT_UTC = "2026-01-04T00:00:00Z";
const FIXED_UTC_TODAY = "2026-01-04";
const EXPECTED_GOLDEN_FIXTURE_DIGEST = "b5ff196b9e84c6e6c71d9d39f19d4d5680f62da2fed259679afe50e0e1880547";

const EXPECTED_GOLD_DAYS = {
  "2026-01-01": {
    avg_block_time_sec: 600,
    block_count_daily: 2,
    block_weight_utilization_pct: 0.75,
    chain: "bitcoin",
    date: "2026-01-01",
    failed_tx_rate: 0.5,
    gas_utilization_pct: null,
    median_tx_fee_native: 0.25,
    median_tx_fee_rate_sat_vbyte: 250000,
    median_tx_value_native: 2,
    tx_count_daily: 2,
    unique_active_addresses: 4,
    value_transferred_native: 4,
  },
  "2026-01-02": {
    avg_block_time_sec: 600,
    block_count_daily: 2,
    block_weight_utilization_pct: 0.375,
    chain: "bitcoin",
    date: "2026-01-02",
    failed_tx_rate: 0,
    gas_utilization_pct: null,
    median_tx_fee_native: 0.5,
    median_tx_fee_rate_sat_vbyte: 500000,
    median_tx_value_native: 3,
    tx_count_daily: 2,
    unique_active_addresses: 4,
    value_transferred_native: 6,
  },
  "2026-01-03": {
    avg_block_time_sec: 600,
    block_count_daily: 2,
    block_weight_utilization_pct: 1,
    chain: "bitcoin",
    date: "2026-01-03",
    failed_tx_rate: 0.5,
    gas_utilization_pct: null,
    median_tx_fee_native: 0.75,
    median_tx_fee_rate_sat_vbyte: 750000,
    median_tx_value_native: 4,
    tx_count_daily: 2,
    unique_active_addresses: 4,
    value_transferred_native: 8,
  },
};

const EXPECTED_STATUS = {
  chain: "bitcoin",
  generated_at_utc: FIXED_GENERATED_AT_UTC,
  features_first_date: "2026-01-01",
  features_last_date: "2026-01-03",
  features_lag_days_vs_utc_today: 1,
  missing_dates: [],
  row_count: 3,
  gold_path: "<RUN_ROOT>/gold/bitcoin.parquet",
  features_path: "<RUN_ROOT>/features_agg/bitcoin",
  read_errors: [],
  quality: {
    row_count: 3,
    null_rates: {
      avg_block_time_sec: 0,
      block_count_daily: 0,
      block_gas_utilization_p90: 1,
      block_weight_utilization_pct: 0,
      chain: 0,
      date: 0,
      failed_tx_rate: 0,
      gas_utilization_pct: 1,
      median_tx_fee_native: 0,
      median_tx_fee_rate_sat_vbyte: 0,
      median_tx_gas_used: 1,
      median_tx_value_native: 0,
      tx_count_daily: 0,
      unique_active_addresses: 0,
      value_transferred_native: 0,
    },
    out_of_range_counts: {
      avg_block_time_sec: 0,
      block_gas_utilization_p90: 0,
      block_weight_utilization_pct: 0,
      failed_tx_rate: 0,
      gas_utilization_pct: 0,
      median_tx_fee_rate_sat_vbyte: 0,
      median_tx_gas_used: 0,
    },
  },
  fixes: {
    applied: ["gas_utilization_pct_null_for_btc", "median_tx_gas_used_null_for_non_eth", "median_block_base_fee_per_gas_null_for_non_eth", "block_gas_utilization_p90_null_for_non_eth"],
    notes: [],
  },
  raw_context: {
    latest_raw_ok_date: {
      blocks: "2026-01-03",
      transactions: "2026-01-03",
    },
    raw_gaps: {},
    raw_manifest_summary_path: "<RUN_ROOT>/reports/raw_manifest_summary.json",
    raw_gaps_path: "<RUN_ROOT>/reports/raw_gaps.json",
  },
};

const EXPECTED_DERIVED_METRICS = {
  "2026-01-01": {
    avg_block_time_sec__ma7: 600,
    avg_block_time_sec__ma30: 600,
    block_count_daily__ma7: 2,
    block_count_daily__ma30: 2,
    block_weight_utilization_pct__ma7: 0.75,
    block_weight_utilization_pct__ma30: 0.75,
    failed_tx_rate__ma7: 0.5,
    failed_tx_rate__ma30: 0.5,
    median_tx_fee_native__ma7: 0.25,
    median_tx_fee_native__ma30: 0.25,
    median_tx_fee_rate_sat_vbyte__ma7: 250000,
    median_tx_fee_rate_sat_vbyte__ma30: 250000,
    median_tx_value_native__ma7: 2,
    median_tx_value_native__ma30: 2,
    tx_count_daily__ma7: 2,
    tx_count_daily__ma30: 2,
    unique_active_addresses__ma7: 4,
    unique_active_addresses__ma30: 4,
    value_transferred_native__ma7: 4,
    value_transferred_native__ma30: 4,
  },
  "2026-01-02": {
    avg_block_time_sec__ma7: 600,
    avg_block_time_sec__ma30: 600,
    block_count_daily__ma7: 2,
    block_count_daily__ma30: 2,
    block_weight_utilization_pct__ma7: 0.5625,
    block_weight_utilization_pct__ma30: 0.5625,
    failed_tx_rate__ma7: 0.25,
    failed_tx_rate__ma30: 0.25,
    median_tx_fee_native__ma7: 0.375,
    median_tx_fee_native__ma30: 0.375,
    median_tx_fee_rate_sat_vbyte__ma7: 375000,
    median_tx_fee_rate_sat_vbyte__ma30: 375000,
    median_tx_value_native__ma7: 2.5,
    median_tx_value_native__ma30: 2.5,
    tx_count_daily__ma7: 2,
    tx_count_daily__ma30: 2,
    unique_active_addresses__ma7: 4,
    unique_active_addresses__ma30: 4,
    value_transferred_native__ma7: 5,
    value_transferred_native__ma30: 5,
  },
  "2026-01-03": {
    avg_block_time_sec__ma7: 600,
    avg_block_time_sec__ma30: 600,
    block_count_daily__ma7: 2,
    block_count_daily__ma30: 2,
    block_weight_utilization_pct__ma7: 0.7083333333333334,
    block_weight_utilization_pct__ma30: 0.7083333333333334,
    failed_tx_rate__ma7: 1 / 3,
    failed_tx_rate__ma30: 1 / 3,
    median_tx_fee_native__ma7: 0.5,
    median_tx_fee_native__ma30: 0.5,
    median_tx_fee_rate_sat_vbyte__ma7: 500000,
    median_tx_fee_rate_sat_vbyte__ma30: 500000,
    median_tx_value_native__ma7: 3,
    median_tx_value_native__ma30: 3,
    tx_count_daily__ma7: 2,
    tx_count_daily__ma30: 2,
    unique_active_addresses__ma7: 4,
    unique_active_addresses__ma30: 4,
    value_transferred_native__ma7: 6,
    value_transferred_native__ma30: 6,
  },
};

function stableValue(value) {
  if (Array.isArray(value)) {
    return value.map(stableValue);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, nested]) => [key, stableValue(nested)]),
    );
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error(`Non-finite number in golden fixture output: ${value}`);
    }
    return Number(value.toFixed(12));
  }
  return value;
}

function stableJson(value) {
  return JSON.stringify(stableValue(value));
}

function sha256(value) {
  return crypto.createHash("sha256").update(stableJson(value)).digest("hex");
}

function runCommand(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd || REPO_ROOT,
    encoding: "utf-8",
    stdio: "pipe",
    env: { ...process.env, PYTHONHASHSEED: "0" },
  });

  if (result.status !== 0) {
    const rendered = [command, ...args].join(" ");
    throw new Error(
      [
        `Command failed (${result.status}): ${rendered}`,
        "--- stdout ---",
        result.stdout || "",
        "--- stderr ---",
        result.stderr || "",
      ].join("\n"),
    );
  }

  return result;
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf-8");
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

function relPath(root, filePath) {
  return path.relative(root, filePath).split(path.sep).join("/");
}

function normalizeFixtureValue(value, runRoot) {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeFixtureValue(item, runRoot));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nested]) => [key, normalizeFixtureValue(nested, runRoot)]),
    );
  }
  if (typeof value !== "string") {
    return value;
  }

  const normalizedRunRoot = path.resolve(runRoot).split(path.sep).join("/");
  return value.split(path.sep).join("/").split(normalizedRunRoot).join("<RUN_ROOT>");
}

function walkJsonFiles(root) {
  if (!fs.existsSync(root)) {
    return [];
  }

  const out = [];
  const stack = [root];
  while (stack.length) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(absolute);
      } else if (entry.isFile() && entry.name.endsWith(".json")) {
        out.push(absolute);
      }
    }
  }
  return out.sort((a, b) => relPath(root, a).localeCompare(relPath(root, b)));
}

function collectJsonTree(root, runRoot = null) {
  const tree = {};
  for (const filePath of walkJsonFiles(root)) {
    const parsed = readJson(filePath);
    tree[relPath(root, filePath)] = runRoot ? normalizeFixtureValue(parsed, runRoot) : parsed;
  }
  return tree;
}

function assertClose(actual, expected, label) {
  if (typeof expected === "number") {
    if (typeof actual !== "number" || Math.abs(actual - expected) > 1e-9) {
      throw new Error(`${label}: expected ${expected}, got ${actual}`);
    }
    return;
  }

  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assertObjectSubset(actual, expected, label) {
  if (!actual || typeof actual !== "object" || Array.isArray(actual)) {
    throw new Error(`${label}: expected object, got ${typeof actual}`);
  }

  for (const [key, expectedValue] of Object.entries(expected)) {
    const actualValue = actual[key];
    const childLabel = `${label}.${key}`;
    if (Array.isArray(expectedValue)) {
      if (!Array.isArray(actualValue) || actualValue.length !== expectedValue.length) {
        throw new Error(`${childLabel}: expected array length ${expectedValue.length}`);
      }
      for (let index = 0; index < expectedValue.length; index += 1) {
        assertClose(actualValue[index], expectedValue[index], `${childLabel}[${index}]`);
      }
    } else if (expectedValue && typeof expectedValue === "object") {
      assertObjectSubset(actualValue, expectedValue, childLabel);
    } else {
      assertClose(actualValue, expectedValue, childLabel);
    }
  }
}

function createRawFixture(rawRoot) {
  const code = String.raw`
import sys
from pathlib import Path
import polars as pl

raw_root = Path(sys.argv[1])
fixtures = {
    "2026-01-01": {
        "values": [1.0, 3.0],
        "fees": [0.25, 0.25],
        "statuses": [1, 0],
        "addresses": [("a1", "b1"), ("c1", "d1")],
        "timestamps": [1704067200, 1704067800],
        "weights": [2000000.0, 4000000.0],
        "virtual_sizes": [100.0, 200.0],
        "is_coinbase": [False, True],
    },
    "2026-01-02": {
        "values": [2.0, 4.0],
        "fees": [0.5, 0.5],
        "statuses": [1, 1],
        "addresses": [("a2", "b2"), ("c2", "d2")],
        "timestamps": [1704153600, 1704154200],
        "weights": [1000000.0, 2000000.0],
        "virtual_sizes": [100.0, 200.0],
        "is_coinbase": [False, True],
    },
    "2026-01-03": {
        "values": [3.0, 5.0],
        "fees": [0.75, 0.75],
        "statuses": [1, 0],
        "addresses": [("a3", "b3"), ("c3", "d3")],
        "timestamps": [1704240000, 1704240600],
        "weights": [4000000.0, 4000000.0],
        "virtual_sizes": [100.0, 200.0],
        "is_coinbase": [False, True],
    },
}

for day, spec in fixtures.items():
    tx_dir = raw_root / "bitcoin" / "transactions" / f"date={day}"
    block_dir = raw_root / "bitcoin" / "blocks" / f"date={day}"
    tx_dir.mkdir(parents=True, exist_ok=True)
    block_dir.mkdir(parents=True, exist_ok=True)

    tx = pl.DataFrame({
        "value": spec["values"],
        "fee": spec["fees"],
        "receipt_status": spec["statuses"],
        "from_address": [pair[0] for pair in spec["addresses"]],
        "to_address": [pair[1] for pair in spec["addresses"]],
        "virtual_size": spec["virtual_sizes"],
        "is_coinbase": spec["is_coinbase"],
    })
    tx.write_parquet(tx_dir / "part-000.parquet")

    blocks = pl.DataFrame({
        "timestamp": spec["timestamps"],
        "gas_used": [100.0, 100.0],
        "gas_limit": [200.0, 200.0],
        "weight": spec["weights"],
    })
    blocks.write_parquet(block_dir / "part-000.parquet")
`;

  runCommand(PYTHON, ["-c", code, rawRoot]);
}

function validateEthereumBlockGasP90(parent) {
  const runRoot = path.join(parent, "ethereum-gas-p90");
  const rawRoot = path.join(runRoot, "raw");
  const featuresRoot = path.join(runRoot, "features_agg");
  const day = "2026-01-01";
  const blockDir = path.join(rawRoot, "ethereum", "blocks", `date=${day}`);
  const txDir = path.join(rawRoot, "ethereum", "transactions", `date=${day}`);
  fs.mkdirSync(blockDir, { recursive: true });
  fs.mkdirSync(txDir, { recursive: true });

  const createCode = String.raw`
import sys
from pathlib import Path
import polars as pl
out = Path(sys.argv[1])
tx_out = Path(sys.argv[2])
pl.DataFrame({
    "timestamp": [1704067200 + 12 * i for i in range(10)],
    "gas_used": [10., 20., 30., 40., 50., 60., 70., 80., 90., 100.],
    "gas_limit": [100.] * 10,
    "base_fee_per_gas": [10., 20., 30., 40., 50., 60., 70., 80., 90., 100.],
}).write_parquet(out / "part-000.parquet")
pl.DataFrame({
    "receipt_gas_used": [21000., 30000., 45000., 55000.],
    "input": ["0x", "", "0x1234", "0xabcdef"],
    "receipt_contract_address": [None, "", "0xabc123", None],
    "transaction_type": [0, 2, 2, 1],
}).write_parquet(tx_out / "part-000.parquet")
`;
  runCommand(PYTHON, ["-c", createCode, blockDir, txDir]);

  runCommand(PYTHON, [
    path.join(REPO_ROOT, "pipeline", "src", "feature_daily_agg.py"),
    "--chain", "ethereum",
    "--date", day,
    "--raw_root", rawRoot,
    "--out_root", featuresRoot,
  ]);

  const checkCode = String.raw`
import json
import sys
from pathlib import Path
import polars as pl
p = Path(sys.argv[1]) / "ethereum" / "2026-01-01.parquet"
df = pl.read_parquet(p)
print(json.dumps({"p90": df["block_gas_utilization_p90"][0], "base_fee": df["median_block_base_fee_per_gas"][0], "tx_gas": df["median_tx_gas_used"][0], "calldata_share": df["nonempty_calldata_share"][0], "contract_creation_share": df["contract_creation_tx_share"][0], "type2_share": df["eip1559_type2_tx_share"][0]}))
`;
  const result = runCommand(PYTHON, ["-c", checkCode, featuresRoot]);
  const parsed = JSON.parse(result.stdout.trim());
  assertClose(parsed.p90, 0.9, "ethereum.block_gas_utilization_p90");
  assertClose(parsed.base_fee, 55, "ethereum.median_block_base_fee_per_gas");
  assertClose(parsed.tx_gas, 37500, "ethereum.median_tx_gas_used");
  assertClose(parsed.calldata_share, 0.5, "ethereum.nonempty_calldata_share");
  assertClose(parsed.contract_creation_share, 0.25, "ethereum.contract_creation_tx_share");
  assertClose(parsed.type2_share, 0.5, "ethereum.eip1559_type2_tx_share");
}

function runFixtureOnce(parent, runName) {
  const runRoot = path.join(parent, runName);
  const rawRoot = path.join(runRoot, "raw");
  const featuresRoot = path.join(runRoot, "features_agg");
  const goldRoot = path.join(runRoot, "gold");
  const statusRoot = path.join(runRoot, "status");
  const reportsDir = path.join(runRoot, "reports");
  const goldJsonRoot = path.join(runRoot, "gold_json");
  const metaJsonRoot = path.join(runRoot, "meta_json");
  const derivedJsonRoot = path.join(runRoot, "derived_json");

  fs.mkdirSync(reportsDir, { recursive: true });
  fs.mkdirSync(path.join(metaJsonRoot, CHAIN), { recursive: true });
  writeJson(path.join(reportsDir, "raw_manifest_summary.json"), {
    bitcoin: {
      transactions: { latest_ok_date: DAYS.at(-1) },
      blocks: { latest_ok_date: DAYS.at(-1) },
    },
  });
  writeJson(path.join(reportsDir, "raw_gaps.json"), {});

  createRawFixture(rawRoot);

  for (const day of DAYS) {
    runCommand(PYTHON, [
      path.join(REPO_ROOT, "pipeline", "src", "feature_daily_agg.py"),
      "--chain",
      CHAIN,
      "--date",
      day,
      "--raw_root",
      rawRoot,
      "--out_root",
      featuresRoot,
    ]);
  }

  runCommand(PYTHON, [
    path.join(REPO_ROOT, "pipeline", "src", "build_gold_timeseries.py"),
    "--chain",
    CHAIN,
    "--features_root",
    featuresRoot,
    "--gold_root",
    goldRoot,
    "--status_root",
    statusRoot,
    "--reports_dir",
    reportsDir,
    "--generated-at-utc",
    FIXED_GENERATED_AT_UTC,
    "--utc-today",
    FIXED_UTC_TODAY,
  ]);

  runCommand(PYTHON, [
    path.join(REPO_ROOT, "pipeline", "tools", "sync_gold_json_history.py"),
    "--repo-root",
    REPO_ROOT,
    "--gold-root",
    goldRoot,
    "--out-root",
    goldJsonRoot,
    "--chains",
    CHAIN,
    "--mode",
    "full",
    "--windows",
    "2,3",
  ]);

  runCommand(PYTHON, [
    path.join(REPO_ROOT, "pipeline", "tools", "export_derived_json_history.py"),
    "--root",
    REPO_ROOT,
    "--gold-json-root",
    goldJsonRoot,
    "--meta-json-root",
    metaJsonRoot,
    "--out-root",
    derivedJsonRoot,
    "--start",
    DAYS[0],
    "--chains",
    CHAIN,
    "--mode",
    "rebuild",
    "--windows",
    "2,3",
  ]);

  const output = {
    gold_json: collectJsonTree(goldJsonRoot),
    gold_status: collectJsonTree(statusRoot, runRoot),
    derived_json: collectJsonTree(derivedJsonRoot),
  };

  return {
    runRoot,
    digest: sha256(output),
    output,
  };
}

function validateExpectedOutputs(output) {
  assertObjectSubset(output.gold_status["bitcoin.json"], EXPECTED_STATUS, "gold_status.bitcoin.json");

  for (const day of DAYS) {
    const gold = output.gold_json[`bitcoin/${day}.json`];
    assertObjectSubset(gold, EXPECTED_GOLD_DAYS[day], `gold.${day}`);

    const derived = output.derived_json[`bitcoin/${day}.json`];
    assertClose(derived?.date, day, `derived.${day}.date`);
    assertClose(derived?.chain, CHAIN, `derived.${day}.chain`);
    assertObjectSubset(
      derived?.derived?.metrics,
      EXPECTED_DERIVED_METRICS[day],
      `derived.${day}.derived.metrics`,
    );
  }
}

function writeReport(reportPath, runA, runB) {
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(
    reportPath,
    [
      "# Pipeline golden fixture determinism",
      "",
      `Run A digest: ${runA.digest}`,
      `Run B digest: ${runB.digest}`,
      "",
      "Covered chain: bitcoin",
      "Covered layers: raw parquet fixture -> feature_daily_agg -> build_gold_timeseries -> sync_gold_json_history -> export_derived_json_history",
      "Compared outputs: GOLD status JSON, GOLD JSON, and DERIVED JSON day/window files.",
      "Status paths are normalized to <RUN_ROOT> before hashing.",
      "",
    ].join("\n"),
    "utf-8",
  );
}

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "urd-pipeline-golden-fixture-"));

try {
  validateEthereumBlockGasP90(tmpRoot);

  const runA = runFixtureOnce(tmpRoot, "run-a");
  const runB = runFixtureOnce(tmpRoot, "run-b");

  if (runA.digest !== runB.digest) {
    throw new Error(`Golden fixture digest mismatch: ${runA.digest} != ${runB.digest}`);
  }

  validateExpectedOutputs(runA.output);
  validateExpectedOutputs(runB.output);

  if (runA.digest !== EXPECTED_GOLDEN_FIXTURE_DIGEST) {
    throw new Error(
      `Golden fixture digest ${runA.digest} does not match committed expected digest ${EXPECTED_GOLDEN_FIXTURE_DIGEST}`,
    );
  }

  const reportPath = path.join(WEB_ROOT, ".audit", "pipeline-golden-fixture", "pipeline-golden-fixture.md");
  writeReport(reportPath, runA, runB);

  console.log("Pipeline golden fixture determinism check passed.");
  console.log(`Digest: ${runA.digest}`);
  console.log(`Report: ${path.relative(WEB_ROOT, reportPath)}`);
} finally {
  if (process.env.KEEP_PIPELINE_GOLDEN_FIXTURE === "1") {
    console.log(`Kept fixture workdir: ${tmpRoot}`);
  } else {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
}
