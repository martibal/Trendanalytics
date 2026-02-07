import fs from "fs";
import path from "path";

const ROOT = path.join(process.cwd(), "public", "data", "published", "v1");

function fail(msg) {
  console.error(`CONTRACT_CHECK_FAIL: ${msg}`);
  process.exitCode = 1;
}

function readJson(p) {
  try {
    const raw = fs.readFileSync(p, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function isISODate(s) {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function mustExist(p) {
  if (!fs.existsSync(p)) fail(`Missing file: ${p}`);
}

function checkDataset() {
  const p = path.join(ROOT, "dataset.json");
  mustExist(p);
  const ds = readJson(p);
  if (!ds) return fail(`Invalid JSON: ${p}`);
  if (typeof ds.dataset_id !== "string" || !ds.dataset_id.trim()) fail(`dataset.json missing dataset_id`);
  if (ds.revision_id === undefined || ds.revision_id === null) fail(`dataset.json missing revision_id`);
}

function checkManifest(genre, chain) {
  const p = path.join(ROOT, genre, chain, "manifest.json");
  mustExist(p);
  const m = readJson(p);
  if (!m) return fail(`Invalid JSON: ${p}`);
  if (!isISODate(m.asof)) fail(`${genre}/${chain}/manifest.json missing/invalid asof`);
  if (!Array.isArray(m.available_days)) fail(`${genre}/${chain}/manifest.json missing available_days[]`);
}

function checkLatest(genre, chain) {
  const p = path.join(ROOT, genre, chain, "latest.json");
  mustExist(p);
  const j = readJson(p);
  if (!j) return fail(`Invalid JSON: ${p}`);
}

function main() {
  if (!fs.existsSync(ROOT)) {
    fail(`Missing published root folder: ${ROOT}`);
    return;
  }

  checkDataset();

  const genres = ["gold", "meta", "derived"];
  const chains = ["bitcoin", "ethereum", "arbitrum", "base"];

  for (const g of genres) {
    for (const c of chains) {
      checkManifest(g, c);
      checkLatest(g, c);
    }
  }

  // Minimal sanity: gold manifests should have at least one available day
  for (const c of chains) {
    const m = readJson(path.join(ROOT, "gold", c, "manifest.json"));
    if (m && Array.isArray(m.available_days) && m.available_days.length === 0) {
      fail(`gold/${c}/manifest.json has empty available_days`);
    }
  }
}

main();

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log("CONTRACT_CHECK_OK");