#!/usr/bin/env node
/*START FILE*/
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const WEB_ROOT = process.cwd();
const REPO_ROOT = path.resolve(WEB_ROOT, "..");
const REPORT_PATH = path.join(WEB_ROOT, ".audit", "native-pipeline", "native-pipeline-ci-command.md");

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeFile(filePath, content) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content, "utf-8");
}

function assertCondition(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function runPython(args, label) {
  const python = process.env.CSS_PYTHON || "python";
  const result = spawnSync(python, args, {
    cwd: WEB_ROOT,
    encoding: "utf-8",
    shell: process.platform === "win32",
  });

  if (result.status !== 0) {
    throw new Error(`${label} failed rc=${result.status}\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
  }

  return {
    label,
    status: "PASS",
    stdout: String(result.stdout || ""),
    stderr: String(result.stderr || ""),
  };
}

function tailLines(text, limit) {
  return String(text || "")
    .trim()
    .split(/\r?\n/)
    .filter(Boolean)
    .slice(-limit);
}

function runNativePipelineContract() {
  const nativeScript = path.join(REPO_ROOT, "pipeline", "tools", "full_pipeline.py");
  const result = runPython(
    ["-u", nativeScript, "--root", REPO_ROOT, "--mode", "incremental", "--skip-raw-download", "--dry-run", "--json"],
    "full_pipeline.py dry-run contract",
  );

  assertCondition(
    result.stdout.includes("PIPELINE NATIVE ENTRYPOINT CONTRACT OK"),
    "full_pipeline.py did not emit the native entrypoint contract success marker",
  );
  assertCondition(result.stdout.includes("build_daily_features"), "full_pipeline.py contract did not include feature build stage");
  assertCondition(result.stdout.includes("publish_artifacts"), "full_pipeline.py contract did not include publish stage");
  assertCondition(result.stdout.includes("sync_web_data"), "full_pipeline.py contract did not include web sync stage");

  return result;
}

function runNativePipelineExecutionScaffold() {
  const nativeScript = path.join(REPO_ROOT, "pipeline", "tools", "full_pipeline.py");
  const result = runPython(
    ["-u", nativeScript, "--root", REPO_ROOT, "--mode", "incremental", "--skip-raw-download", "--execute-stage", "validate_published_dataset", "--json"],
    "full_pipeline.py native execution scaffold",
  );

  assertCondition(
    result.stdout.includes("PIPELINE NATIVE EXECUTION SCAFFOLD OK"),
    "full_pipeline.py did not emit the native execution scaffold success marker",
  );
  assertCondition(
    result.stdout.includes("stage=validate_published_dataset rc=0"),
    "native execution scaffold did not complete validate_published_dataset",
  );
  assertCondition(result.stdout.includes("RUN validate_published_dataset"), "native execution scaffold did not invoke the stage runner");

  return result;
}

function writeReport(results) {
  const lines = [
    "# Native pipeline CI command",
    "",
    "## Result",
    "",
    "Status: PASS",
    "",
    "This gate exposes the native pipeline entrypoint as a first-class CI/local command instead of only validating it indirectly through the environment parity inventory.",
    "",
    "## Commands",
    "",
  ];

  for (const result of results) {
    lines.push(`### ${result.label}`);
    lines.push("");
    lines.push(`- status: ${result.status}`);
    for (const line of tailLines(result.stdout, 12)) {
      lines.push(`- stdout: ${line}`);
    }
    if (result.stderr.trim()) {
      for (const line of tailLines(result.stderr, 6)) {
        lines.push(`- stderr: ${line}`);
      }
    }
    lines.push("");
  }

  writeFile(REPORT_PATH, `${lines.join("\n")}\n`);
}

const contract = runNativePipelineContract();
const scaffold = runNativePipelineExecutionScaffold();

writeReport([contract, scaffold]);

console.log("Native pipeline CI command passed.");
console.log("Native pipeline contract: PASS");
console.log("Native pipeline execution scaffold: PASS");
console.log(`Report: ${path.relative(WEB_ROOT, REPORT_PATH)}`);
/*END FILE*/
