#!/usr/bin/env node
/*START FILE*/
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import process from "node:process";

const WEB_ROOT = process.cwd();
const REPO_ROOT = path.resolve(WEB_ROOT, "..");
const DOWNLOADER = path.join(REPO_ROOT, "pipeline", "tools", "download_up_to_date_minimal.py");
const REPORT_PATH = path.join(WEB_ROOT, ".audit", "source-failure-handling", "source-failure-handling-gate.md");
const PYTHON = process.env.CSS_PYTHON || process.env.PYTHON || "python";

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeFile(filePath, content) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content, "utf-8");
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

function makeFakeAwsBin(rootDir) {
  const binDir = path.join(rootDir, "bin");
  ensureDir(binDir);

  const fakeAws = path.join(binDir, "fake-aws.mjs");
  writeFile(
    fakeAws,
    `#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const mode = process.env.URD_FAKE_AWS_MODE || "list-fail";

if (args[0] === "--version") {
  console.log("aws-cli/2.99.0 Python/3.12 source-failure-fixture");
  process.exit(0);
}

if (args[0] === "s3" && args[1] === "ls") {
  if (mode === "list-fail") {
    console.error("simulated upstream list failure");
    process.exit(2);
  }

  console.log("                           PRE 2020-01-02/");
  process.exit(0);
}

if (args[0] === "s3" && args[1] === "sync") {
  if (mode === "sync-fail") {
    console.error("simulated upstream sync failure");
    process.exit(3);
  }

  const dst = args[3];
  fs.mkdirSync(dst, { recursive: true });
  fs.writeFileSync(path.join(dst, "part-000.parquet"), "not-real-parquet");
  process.exit(0);
}

console.error("unexpected fake aws invocation: " + args.join(" "));
process.exit(9);
`,
  );

  fs.chmodSync(fakeAws, 0o755);

  const fakeAwsPy = path.join(binDir, "fake-aws.py");
  writeFile(
    fakeAwsPy,
    `#!/usr/bin/env python3
import os
import sys
from pathlib import Path

args = sys.argv[1:]
mode = os.environ.get("URD_FAKE_AWS_MODE", "list-fail")

if args[:1] == ["--version"]:
    print("aws-cli/2.99.0 Python/3.12 source-failure-fixture")
    raise SystemExit(0)

if len(args) >= 2 and args[0] == "s3" and args[1] == "ls":
    if mode == "list-fail":
        print("simulated upstream list failure", file=sys.stderr)
        raise SystemExit(2)
    print("                           PRE 2020-01-02/")
    raise SystemExit(0)

if len(args) >= 2 and args[0] == "s3" and args[1] == "sync":
    if mode == "sync-fail":
        print("simulated upstream sync failure", file=sys.stderr)
        raise SystemExit(3)
    dst = Path(args[3])
    dst.mkdir(parents=True, exist_ok=True)
    (dst / "part-000.parquet").write_text("not-real-parquet", encoding="utf-8")
    raise SystemExit(0)

print("unexpected fake aws invocation: " + " ".join(args), file=sys.stderr)
raise SystemExit(9)
`,
  );

  writeFile(path.join(binDir, "aws.cmd"), `@echo off\r\nnode "%~dp0fake-aws.mjs" %*\r\n`);
  writeFile(path.join(binDir, "aws"), `#!/usr/bin/env bash\nnode "$(dirname "$0")/fake-aws.mjs" "$@"\n`);
  fs.chmodSync(path.join(binDir, "aws"), 0o755);

  return binDir;
}

function makePublishedRoot(rootDir, withPublishedDay) {
  const publishedRoot = path.join(rootDir, "published", "v1");

  if (withPublishedDay) {
    const goldDir = path.join(publishedRoot, "gold", "bitcoin");
    ensureDir(goldDir);
    writeFile(path.join(goldDir, "2020-01-02.json"), JSON.stringify({ chain: "bitcoin", date: "2020-01-02" }, null, 2));
  }

  return publishedRoot;
}

function runDownloader({ name, mode, withPublishedDay }) {
  const scenarioRoot = fs.mkdtempSync(path.join(os.tmpdir(), `urd-source-failure-${name}-`));
  const binDir = makeFakeAwsBin(scenarioRoot);
  const rawRoot = path.join(scenarioRoot, "raw");
  const publishedRoot = makePublishedRoot(scenarioRoot, withPublishedDay);

  const env = {
    ...process.env,
    PATH: `${binDir}${path.delimiter}${process.env.PATH || ""}`,
    URD_FAKE_AWS_MODE: mode,
    CSS_AWS_CLI_PY: path.join(binDir, "fake-aws.py"),
    CSS_AWS_TIMEOUT_SECONDS: "5",
    CSS_AWS_MAX_ATTEMPTS: "2",
    CSS_AWS_BACKOFF_SECONDS: "0.01",
  };

  const result = spawnSync(
    PYTHON,
    [
      DOWNLOADER,
      "--root",
      scenarioRoot,
      "--raw-root",
      rawRoot,
      "--published-root",
      publishedRoot,
      "--start",
      "2020-01-01",
      "--chains",
      "bitcoin",
      "--lag-l1-days",
      "0",
      "--lag-l2-days",
      "0",
    ],
    {
      cwd: REPO_ROOT,
      env,
      encoding: "utf-8",
      stdio: "pipe",
      timeout: 60000,
    },
  );

  const reportFile = path.join(scenarioRoot, "reports", "download_up_to_date_minimal.json");
  const report = fs.existsSync(reportFile) ? readJson(reportFile) : null;

  return {
    name,
    mode,
    withPublishedDay,
    exitCode: result.status,
    stdout: result.stdout || "",
    stderr: result.stderr || "",
    report,
  };
}

function assertCondition(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function failureCount(report) {
  return Array.isArray(report?.failures) ? report.failures.length : 0;
}

function assertFailureScenario(result, expectedStage) {
  assertCondition(result.exitCode !== 0, `${result.name} must exit non-zero`);

  if (!(result.report && typeof result.report === "object")) {
    console.error("");
    console.error(`[diagnostic] ${result.name} did not write expected JSON report`);
    console.error(`[diagnostic] exitCode=${result.exitCode}`);
    console.error("[diagnostic] stdout:");
    console.error(result.stdout || "<empty>");
    console.error("[diagnostic] stderr:");
    console.error(result.stderr || "<empty>");
  }

  assertCondition(result.report && typeof result.report === "object", `${result.name} must write a JSON report before failing`);
  assertCondition(failureCount(result.report) > 0, `${result.name} report must contain failures[]`);
  assertCondition(
    result.report.failures.some((failure) => failure.stage === expectedStage),
    `${result.name} report must include failure stage ${expectedStage}`,
  );
}

function assertPublishedSkipScenario(result) {
  assertCondition(result.exitCode === 0, `${result.name} must exit zero`);
  assertCondition(result.report && typeof result.report === "object", `${result.name} must write a JSON report`);
  assertCondition(failureCount(result.report) === 0, `${result.name} must not report failures`);
  assertCondition(
    Array.isArray(result.report.planned_downloads) && result.report.planned_downloads.length === 0,
    `${result.name} must not plan downloads for already-published day`,
  );
}

function writeReport(results) {
  ensureDir(path.dirname(REPORT_PATH));

  const lines = [
    "# Source failure handling gate",
    "",
    "## Result",
    "",
    "Status: PASS",
    "",
    "## Coverage",
    "",
    "- Simulates upstream AWS source listing failure.",
    "- Simulates upstream AWS raw sync failure.",
    "- Verifies already-published days remain no-op and do not fail.",
    "- Requires `download_up_to_date_minimal.py` to write a report before failing.",
    "- Requires source failures to exit non-zero so `full_pipeline.ps1` fails closed before publish.",
    "",
    "## Scenario results",
    "",
  ];

  for (const result of results) {
    lines.push(`### ${result.name}`);
    lines.push("");
    lines.push(`- Exit code: ${result.exitCode}`);
    lines.push(`- Failure count: ${failureCount(result.report)}`);
    lines.push(`- Planned downloads: ${Array.isArray(result.report?.planned_downloads) ? result.report.planned_downloads.length : "n/a"}`);
    lines.push("");
  }

  writeFile(REPORT_PATH, `${lines.join("\n")}\n`);
}

if (!fs.existsSync(DOWNLOADER)) {
  throw new Error(`Missing downloader: ${DOWNLOADER}`);
}

const listFailure = runDownloader({
  name: "source-list-failure",
  mode: "list-fail",
  withPublishedDay: false,
});
assertFailureScenario(listFailure, "list_available_days");

const syncFailure = runDownloader({
  name: "source-sync-failure",
  mode: "sync-fail",
  withPublishedDay: false,
});
assertFailureScenario(syncFailure, "sync_day");

const publishedSkip = runDownloader({
  name: "already-published-noop",
  mode: "sync-success",
  withPublishedDay: true,
});
assertPublishedSkipScenario(publishedSkip);

writeReport([listFailure, syncFailure, publishedSkip]);

console.log("Source failure handling gate passed.");
console.log("Scenarios: source-list-failure, source-sync-failure, already-published-noop");
console.log(`Report: ${path.relative(WEB_ROOT, REPORT_PATH)}`);
/*END FILE*/
