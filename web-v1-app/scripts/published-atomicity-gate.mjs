#!/usr/bin/env node
/*START FILE*/
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import process from "node:process";

const WEB_ROOT = process.cwd();
const REPO_ROOT = path.resolve(WEB_ROOT, "..");
const PUBLISHED_SOURCE_ROOT = path.join(REPO_ROOT, "data", "published", "v1");
const PUBLISH_SCRIPT = path.join(REPO_ROOT, "pipeline", "tools", "publish_artifacts.py");
const REPORT_PATH = path.join(WEB_ROOT, ".audit", "published-atomicity", "published-atomicity-gate.md");

const EXPLICIT_PYTHON = process.env.CSS_PYTHON || process.env.PYTHON || "";
const PYTHON_CMD = EXPLICIT_PYTHON || (process.platform === "win32" ? "py" : "python");
const PYTHON_ARGS_PREFIX = EXPLICIT_PYTHON ? [] : process.platform === "win32" ? ["-3"] : [];
const CHAINS = ["bitcoin", "ethereum", "arbitrum", "base"];
const GENRES = ["gold", "meta", "derived"];
const WINDOWS = ["7", "30", "90", "180", "365"];
const DAILY_FIXTURE_ROWS = 45;

const VOLATILE_KEYS = new Set([
  "dataset_id",
  "revision_id",
  "computed_at_utc",
]);

function log(message) {
  console.log(`[published-atomicity] ${message}`);
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function stableSort(value) {
  if (Array.isArray(value)) {
    return value.map(stableSort);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !VOLATILE_KEYS.has(key))
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, nested]) => [key, stableSort(nested)]),
    );
  }

  return value;
}

function sha256Json(value) {
  return crypto.createHash("sha256").update(JSON.stringify(stableSort(value))).digest("hex");
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

function readJsonTree(rootDir) {
  const output = {};

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
      output[rel] = readJson(fullPath);
    }
  }

  if (fs.existsSync(rootDir)) {
    walk(rootDir);
  }

  return Object.fromEntries(Object.entries(output).sort(([a], [b]) => a.localeCompare(b)));
}

function findTempFiles(rootDir) {
  const found = [];

  function walk(currentDir) {
    if (!fs.existsSync(currentDir)) {
      return;
    }

    for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }

      if (entry.isFile() && (entry.name.endsWith(".tmp") || entry.name.includes(".json.tmp"))) {
        found.push(path.relative(rootDir, fullPath).split(path.sep).join("/"));
      }
    }
  }

  walk(rootDir);
  return found.sort((a, b) => a.localeCompare(b));
}

function listRecentDayFiles(chainRoot) {
  const entries = fs
    .readdirSync(chainRoot, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /^\d{4}-\d{2}-\d{2}\.json$/.test(entry.name))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));

  const required = new Set(entries.slice(-1 * DAILY_FIXTURE_ROWS));
  const latest = path.join(chainRoot, "latest.json");

  if (fs.existsSync(latest)) {
    const latestObj = readJson(latest);
    const latestDate = typeof latestObj?.date === "string" ? latestObj.date : "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(latestDate)) {
      required.add(`${latestDate}.json`);
    }
  }

  return [...required].sort((a, b) => a.localeCompare(b));
}

function copyGenreForCalculatedRoot(genre, sourcePublishedRoot, calculatedRoot) {
  const sourceGenre = path.join(sourcePublishedRoot, genre);
  const targetGenre = path.join(calculatedRoot, genre === "gold" ? "gold_json" : genre);

  if (!fs.existsSync(sourceGenre)) {
    throw new Error(`Missing published source genre: ${sourceGenre}`);
  }

  for (const chain of CHAINS) {
    const sourceChain = path.join(sourceGenre, chain);
    const targetChain = path.join(targetGenre, chain);

    if (!fs.existsSync(sourceChain)) {
      throw new Error(`Missing source chain directory: ${sourceChain}`);
    }

    ensureDir(targetChain);

    for (const fileName of listRecentDayFiles(sourceChain)) {
      fs.copyFileSync(path.join(sourceChain, fileName), path.join(targetChain, fileName));
    }

    /*
      Copy non-day convenience artifacts too. publish_artifacts.py copies these
      if present, then recomputes DERIVED windows from final published GOLD.
      Keeping them in the fixture preserves the publish boundary shape without
      copying the full historical tree.
    */
    for (const fileName of ["latest.json", ...WINDOWS.map((window) => `last${window}d.json`)]) {
      const sourceFile = path.join(sourceChain, fileName);
      if (fs.existsSync(sourceFile)) {
        fs.copyFileSync(sourceFile, path.join(targetChain, fileName));
      }
    }
  }
}

function createCalculatedInput(rootDir) {
  const calculatedRoot = path.join(rootDir, "calculated");
  ensureDir(calculatedRoot);

  for (const genre of GENRES) {
    copyGenreForCalculatedRoot(genre, PUBLISHED_SOURCE_ROOT, calculatedRoot);
  }

  return calculatedRoot;
}

function runPublish(calculatedRoot, publishedRoot, label) {
  ensureDir(publishedRoot);
  log(`${label}: running publish_artifacts.py`);

  const publishArgs = [
    ...PYTHON_ARGS_PREFIX,
    PUBLISH_SCRIPT,
    "--root",
    REPO_ROOT,
    "--calculated-root",
    calculatedRoot,
    "--published-root",
    publishedRoot,
    "--chains",
    CHAINS.join(","),
    "--genres",
    GENRES.join(","),
    "--windows",
    WINDOWS.join(","),
  ];

  const result = spawnSync(PYTHON_CMD, publishArgs, {
    cwd: REPO_ROOT,
    encoding: "utf-8",
    stdio: "pipe",
    timeout: 120000,
  });

  if (result.error) {
    throw new Error(
      [
        `Failed to execute Python command: ${PYTHON_CMD} ${PYTHON_ARGS_PREFIX.join(" ")}`.trim(),
        result.error.message,
        "Set CSS_PYTHON to an explicit Python executable if the launcher is unavailable.",
      ].join("\n"),
    );
  }

  if (result.status !== 0) {
    throw new Error(
      [
        `publish_artifacts.py failed with exit code ${result.status}`,
        `Python command: ${PYTHON_CMD} ${PYTHON_ARGS_PREFIX.join(" ")}`.trim(),
        "--- stdout ---",
        result.stdout || "",
        "--- stderr ---",
        result.stderr || "",
      ].join("\n"),
    );
  }

  return {
    stdout: result.stdout || "",
    stderr: result.stderr || "",
  };
}

function validatePublishScriptUsesAtomicWriter() {
  const source = fs.readFileSync(PUBLISH_SCRIPT, "utf-8");

  const hasAtomicWriter =
    source.includes("def _write_json") &&
    source.includes('tmp = p.with_suffix(p.suffix + ".tmp")') &&
    source.includes("tmp.replace(p)");

  if (!hasAtomicWriter) {
    throw new Error("publish_artifacts.py must keep _write_json as temp-file + replace writer.");
  }

  const directFinalWrites = [...source.matchAll(/(?<!tmp)\.write_text\(/g)];
  if (directFinalWrites.length > 0) {
    throw new Error(`publish_artifacts.py contains ${directFinalWrites.length} non-temp write_text call(s).`);
  }
}

function assertRequiredOutputs(tree, label) {
  for (const fileName of ["dataset.json", "index.json", "latest.json", "contract.json"]) {
    if (!tree[fileName]) {
      throw new Error(`${label} missing ${fileName}`);
    }
  }

  for (const genre of GENRES) {
    for (const chain of CHAINS) {
      const manifestPath = `${genre}/${chain}/manifest.json`;
      const latestPath = `${genre}/${chain}/latest.json`;

      if (!tree[manifestPath]) {
        throw new Error(`${label} missing ${manifestPath}`);
      }

      if (!tree[latestPath]) {
        throw new Error(`${label} missing ${latestPath}`);
      }

      for (const window of WINDOWS) {
        const windowPath = `${genre}/${chain}/last${window}d.json`;
        if (!tree[windowPath]) {
          throw new Error(`${label} missing ${windowPath}`);
        }
      }
    }
  }
}

function publishAndDigest(parentDir, name) {
  const runRoot = path.join(parentDir, name);
  log(`${name}: preparing fixture input`);
  const calculatedRoot = createCalculatedInput(runRoot);
  const publishedRoot = path.join(runRoot, "published", "v1");

  runPublish(calculatedRoot, publishedRoot, `${name} first`);
  const firstTree = readJsonTree(publishedRoot);
  assertRequiredOutputs(firstTree, `${name} first publish`);

  const tempAfterFirst = findTempFiles(publishedRoot);
  if (tempAfterFirst.length > 0) {
    throw new Error(`${name} first publish left temp files: ${tempAfterFirst.join(", ")}`);
  }

  const firstDigest = sha256Json(firstTree);

  runPublish(calculatedRoot, publishedRoot, `${name} replay`);
  const replayTree = readJsonTree(publishedRoot);
  assertRequiredOutputs(replayTree, `${name} replay publish`);

  const tempAfterReplay = findTempFiles(publishedRoot);
  if (tempAfterReplay.length > 0) {
    throw new Error(`${name} replay publish left temp files: ${tempAfterReplay.join(", ")}`);
  }

  const replayDigest = sha256Json(replayTree);

  if (firstDigest !== replayDigest) {
    throw new Error(`${name} replay digest mismatch: ${firstDigest} != ${replayDigest}`);
  }

  log(`${name}: digest ${firstDigest}; files ${Object.keys(replayTree).length}`);

  return {
    root: runRoot,
    firstDigest,
    replayDigest,
    files: Object.keys(replayTree).length,
  };
}

function writeReport(runA, runB) {
  ensureDir(path.dirname(REPORT_PATH));

  const lines = [
    "# Published atomicity / replay gate",
    "",
    "## Result",
    "",
    "Status: PASS",
    "",
    "## Coverage",
    "",
    `- Fixture daily rows per chain/genre: ${DAILY_FIXTURE_ROWS}.`,
    "- Runs `pipeline/tools/publish_artifacts.py` twice against the same temporary published root.",
    "- Runs a second independent publish against a separate temporary published root.",
    "- Compares normalized published JSON-tree digests after stripping volatile dataset metadata.",
    "- Fails if any `.tmp` / `.json.tmp` files remain after publish or replay.",
    "- Fails if the final publish tree is missing root manifests or core gold/meta/derived chain/window artifacts.",
    "- Fails if `publish_artifacts.py` stops using temp-file + replace writes in `_write_json`.",
    "",
    "## Digests",
    "",
    `Run A first/replay digest: ${runA.firstDigest}`,
    `Run B first/replay digest: ${runB.firstDigest}`,
    "",
    "## File counts",
    "",
    `Run A files: ${runA.files}`,
    `Run B files: ${runB.files}`,
    "",
    "Volatile keys ignored for digest comparison:",
    ...[...VOLATILE_KEYS].sort().map((key) => `- ${key}`),
    "",
  ];

  fs.writeFileSync(REPORT_PATH, `${lines.join("\n")}\n`, "utf-8");
}

console.log("Published atomicity / replay gate started.");

validatePublishScriptUsesAtomicWriter();

if (!fs.existsSync(PUBLISHED_SOURCE_ROOT)) {
  throw new Error(`Missing published source root: ${PUBLISHED_SOURCE_ROOT}`);
}

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "urd-published-atomicity-"));

try {
  const runA = publishAndDigest(tmpRoot, "run-a");
  const runB = publishAndDigest(tmpRoot, "run-b");

  if (runA.firstDigest !== runB.firstDigest) {
    throw new Error(`independent publish digest mismatch: ${runA.firstDigest} != ${runB.firstDigest}`);
  }

  writeReport(runA, runB);

  console.log("Published atomicity / replay gate passed.");
  console.log(`Digest: ${runA.firstDigest}`);
  console.log(`Checked files: ${runA.files}`);
  console.log(`Report: ${path.relative(WEB_ROOT, REPORT_PATH)}`);
} finally {
  if (process.env.KEEP_PUBLISHED_ATOMICITY_FIXTURE === "1") {
    console.log(`Kept atomicity fixture workdir: ${tmpRoot}`);
  } else {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
}
/*END FILE*/
