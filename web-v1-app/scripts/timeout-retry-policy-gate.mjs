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
const REPORT_PATH = path.join(WEB_ROOT, ".audit", "timeout-retry-policy", "timeout-retry-policy-gate.md");
const EXPLICIT_PYTHON = process.env.CSS_PYTHON || process.env.PYTHON || "";
const PYTHON_CMD = EXPLICIT_PYTHON || (process.platform === "win32" ? "py" : "python");
const PYTHON_ARGS_PREFIX = EXPLICIT_PYTHON ? [] : process.platform === "win32" ? ["-3"] : [];

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

function assertCondition(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function makeFakeAwsBin(rootDir) {
  const binDir = path.join(rootDir, "bin");
  ensureDir(binDir);

  const fakeAwsPy = path.join(binDir, "fake-aws.py");
  writeFile(
    fakeAwsPy,
    `#!/usr/bin/env python3
import json
import os
import sys
from pathlib import Path

args = sys.argv[1:]
mode = os.environ.get("URD_FAKE_AWS_MODE", "list-flaky-success")
state_file = Path(os.environ["URD_FAKE_AWS_STATE"])

if state_file.exists():
    state = json.loads(state_file.read_text(encoding="utf-8"))
else:
    state = {"list": 0, "sync": 0}

def save():
    state_file.write_text(json.dumps(state), encoding="utf-8")

if args[:1] == ["--version"]:
    print("aws-cli/2.99.0 Python/3.12 timeout-retry-fixture")
    raise SystemExit(0)

if len(args) >= 2 and args[0] == "s3" and args[1] == "ls":
    state["list"] += 1
    save()
    if mode == "list-flaky-success" and state["list"] % 2 == 1:
        print("simulated transient list failure", file=sys.stderr)
        raise SystemExit(2)
    if mode == "list-persistent-fail":
        print("simulated persistent list failure", file=sys.stderr)
        raise SystemExit(2)
    print("                           PRE 2020-01-02/")
    raise SystemExit(0)

if len(args) >= 2 and args[0] == "s3" and args[1] == "sync":
    state["sync"] += 1
    save()
    if mode == "sync-flaky-success" and state["sync"] % 2 == 1:
        print("simulated transient sync failure", file=sys.stderr)
        raise SystemExit(2)
    dst = Path(args[3])
    dst.mkdir(parents=True, exist_ok=True)
    (dst / "part-000.parquet").write_text("not-real-parquet", encoding="utf-8")
    raise SystemExit(0)

print("unexpected fake aws invocation: " + " ".join(args), file=sys.stderr)
raise SystemExit(9)
`,
  );

  return fakeAwsPy;
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

function runDownloader({ name, mode, withPublishedDay = false }) {
  const scenarioRoot = fs.mkdtempSync(path.join(os.tmpdir(), `urd-timeout-retry-${name}-`));
  const fakeAwsPy = makeFakeAwsBin(scenarioRoot);
  const rawRoot = path.join(scenarioRoot, "raw");
  const publishedRoot = makePublishedRoot(scenarioRoot, withPublishedDay);
  const stateFile = path.join(scenarioRoot, "fake-aws-state.json");

  const env = {
    ...process.env,
    URD_FAKE_AWS_MODE: mode,
    URD_FAKE_AWS_STATE: stateFile,
    CSS_AWS_CLI_PY: fakeAwsPy,
    CSS_AWS_TIMEOUT_SECONDS: "5",
    CSS_AWS_MAX_ATTEMPTS: "2",
    CSS_AWS_BACKOFF_SECONDS: "0.01",
  };

  const result = spawnSync(
    PYTHON_CMD,
    [
      ...PYTHON_ARGS_PREFIX,
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
  const state = fs.existsSync(stateFile) ? readJson(stateFile) : null;

  if (result.error) {
    return {
      name,
      mode,
      exitCode: null,
      stdout: result.stdout || "",
      stderr: [
        result.stderr || "",
        `Failed to execute Python command: ${PYTHON_CMD} ${PYTHON_ARGS_PREFIX.join(" ")}`.trim(),
        result.error.message,
        "Set CSS_PYTHON to an explicit Python executable if the launcher is unavailable.",
      ]
        .filter(Boolean)
        .join("\n"),
      report,
      state,
    };
  }

  return {
    name,
    mode,
    exitCode: result.status,
    stdout: result.stdout || "",
    stderr: result.stderr || "",
    report,
    state,
  };
}

function logDiagnostics(result) {
  console.error("");
  console.error(`[diagnostic] ${result.name}`);
  console.error(`[diagnostic] exitCode=${result.exitCode}`);
  console.error(`[diagnostic] state=${JSON.stringify(result.state)}`);
  console.error("[diagnostic] stdout:");
  console.error(result.stdout || "<empty>");
  console.error("[diagnostic] stderr:");
  console.error(result.stderr || "<empty>");
}

function assertPolicyShape(result) {
  const policy = result.report?.aws_policy;
  if (!(policy && typeof policy === "object")) {
    logDiagnostics(result);
  }
  assertCondition(policy && typeof policy === "object", `${result.name} report must include aws_policy`);
  assertCondition(policy.timeout_seconds === 5, `${result.name} must apply fixture timeout policy`);
  assertCondition(policy.max_attempts === 2, `${result.name} must apply fixture max-attempt policy`);
  assertCondition(policy.backoff_seconds === 0.01, `${result.name} must apply fixture backoff policy`);
}

function assertSuccessfulRetryScenario(result, expectedCounter) {
  if (result.exitCode !== 0) {
    logDiagnostics(result);
  }
  assertCondition(result.exitCode === 0, `${result.name} must exit zero after transient AWS failures`);
  assertCondition(result.report && typeof result.report === "object", `${result.name} must write report`);
  assertCondition(Array.isArray(result.report.failures) && result.report.failures.length === 0, `${result.name} must not report failures`);
  assertPolicyShape(result);
  assertCondition(result.state?.[expectedCounter] >= 2, `${result.name} must require more than one ${expectedCounter} attempt`);
}

function assertPersistentFailureScenario(result) {
  assertCondition(result.exitCode !== 0, `${result.name} must fail closed after bounded retries`);
  assertCondition(result.report && typeof result.report === "object", `${result.name} must write report`);
  assertPolicyShape(result);
  assertCondition(Array.isArray(result.report.failures) && result.report.failures.length > 0, `${result.name} must report failures`);
  assertCondition(result.state?.list >= 2, `${result.name} must use the configured bounded retry count`);
}

function assertSourceContainsPolicy() {
  const source = fs.readFileSync(DOWNLOADER, "utf-8");
  const requiredFragments = [
    "AWS_TIMEOUT_SECONDS_ENV",
    "AWS_MAX_ATTEMPTS_ENV",
    "AWS_BACKOFF_SECONDS_ENV",
    "timeout=timeout_seconds",
    "time.sleep(backoff_seconds * (2 ** (attempt - 1)))",
    "return aws_run([\"aws\", \"s3\", \"sync\"",
  ];

  for (const fragment of requiredFragments) {
    assertCondition(source.includes(fragment), `Downloader must contain policy fragment: ${fragment}`);
  }
}

function writeReport(results) {
  ensureDir(path.dirname(REPORT_PATH));

  const lines = [
    "# Timeout / retry / backoff policy gate",
    "",
    "## Result",
    "",
    "Status: PASS",
    "",
    "## Coverage",
    "",
    "- Requires an explicit AWS CLI timeout policy.",
    "- Requires a bounded retry count.",
    "- Requires exponential backoff between retryable AWS failures.",
    "- Verifies transient source listing failures recover within the retry budget.",
    "- Verifies transient sync failures recover within the retry budget.",
    "- Verifies persistent source failures still fail closed and write a report.",
    "",
    "## Scenario results",
    "",
  ];

  for (const result of results) {
    lines.push(`### ${result.name}`);
    lines.push("");
    lines.push(`- Exit code: ${result.exitCode}`);
    lines.push(`- List attempts: ${result.state?.list ?? "n/a"}`);
    lines.push(`- Sync attempts: ${result.state?.sync ?? "n/a"}`);
    lines.push(`- Failure count: ${Array.isArray(result.report?.failures) ? result.report.failures.length : "n/a"}`);
    lines.push("");
  }

  writeFile(REPORT_PATH, `${lines.join("\n")}\n`);
}

if (!fs.existsSync(DOWNLOADER)) {
  throw new Error(`Missing downloader: ${DOWNLOADER}`);
}

assertSourceContainsPolicy();

const listFlaky = runDownloader({
  name: "list-flaky-success",
  mode: "list-flaky-success",
});
assertSuccessfulRetryScenario(listFlaky, "list");

const syncFlaky = runDownloader({
  name: "sync-flaky-success",
  mode: "sync-flaky-success",
});
assertSuccessfulRetryScenario(syncFlaky, "sync");

const listPersistent = runDownloader({
  name: "list-persistent-fail",
  mode: "list-persistent-fail",
});
assertPersistentFailureScenario(listPersistent);

writeReport([listFlaky, syncFlaky, listPersistent]);

console.log("Timeout / retry / backoff policy gate passed.");
console.log("Scenarios: list-flaky-success, sync-flaky-success, list-persistent-fail");
console.log(`Report: ${path.relative(WEB_ROOT, REPORT_PATH)}`);
/*END FILE*/
