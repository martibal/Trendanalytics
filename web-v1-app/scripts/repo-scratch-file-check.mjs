#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import path from "node:path";
import process from "node:process";

const repoRoot = path.resolve(process.cwd(), "..");
const prefix = "web-v1-app/";

const tracked = execFileSync("git", ["ls-files", "-z"], {
  cwd: repoRoot,
  encoding: "utf8",
  maxBuffer: 64 * 1024 * 1024,
})
  .split("\0")
  .filter(Boolean)
  .map((entry) => entry.replaceAll("\\", "/"));

function isWebRootFile(file) {
  if (!file.startsWith(prefix)) return false;
  const rest = file.slice(prefix.length);
  return rest.length > 0 && !rest.includes("/");
}

function looksLikeScratch(file) {
  if (!isWebRootFile(file)) return false;
  const name = file.slice(prefix.length);
  if (name.endsWith(".txt")) return true;
  if (!name.includes(".") && /[(){}]/u.test(name)) return true;
  return false;
}

const offenders = tracked.filter(looksLikeScratch).sort();

if (offenders.length > 0) {
  console.error("[REPO_SCRATCH_FILES] FAIL");
  console.error(
    "Unexpected scratch-like files are tracked at the web-v1-app root. Move durable material into docs/ or source directories and keep ad-hoc notes outside Git.",
  );
  for (const file of offenders) {
    console.error(`  - ${file}`);
  }
  process.exit(1);
}

console.log("[REPO_SCRATCH_FILES] OK: no scratch-like root files are tracked in web-v1-app");
