import fs from "fs";
import path from "path";

const ROOT = path.join(process.cwd(), "public", "data", "published", "v1");
const CHAINS = ["bitcoin", "ethereum", "arbitrum", "base"];
const GENRES = ["gold", "derived", "meta"];

function fileExists(p) {
  try {
    fs.accessSync(p);
    return true;
  } catch {
    return false;
  }
}

function readJson(p) {
  try {
    const t = fs.readFileSync(p, "utf8");
    return JSON.parse(t);
  } catch {
    return null;
  }
}

function isISODate(s) {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function fail(msg) {
  console.error(`CONTRACT_FAIL: ${msg}`);
  process.exitCode = 1;
}

function warn(msg) {
  console.warn(`CONTRACT_WARN: ${msg}`);
}

function ok(msg) {
  console.log(`OK: ${msg}`);
}

function inspectChainGenre(chain, genre) {
  const dir = path.join(ROOT, genre, chain);
  const manifestPath = path.join(dir, "manifest.json");
  const latestPath = path.join(dir, "latest.json");

  if (!fileExists(dir)) {
    fail(`Missing directory: ${dir}`);
    return { ok: false };
  }
  if (!fileExists(manifestPath)) {
    fail(`Missing manifest: ${manifestPath}`);
    return { ok: false };
  }
  if (!fileExists(latestPath)) {
    fail(`Missing latest: ${latestPath}`);
    return { ok: false };
  }

  const manifest = readJson(manifestPath);
  if (!manifest || typeof manifest !== "object") {
    fail(`Invalid JSON manifest: ${manifestPath}`);
    return { ok: false };
  }

  const latest = readJson(latestPath);
  if (!latest || typeof latest !== "object") {
    fail(`Invalid JSON latest: ${latestPath}`);
    return { ok: false };
  }

  // --- Manifest shape checks (non-strict but deterministic)
  const asof = manifest.asof ?? manifest.as_of ?? manifest.updated_through ?? null;
  const availableDays = Array.isArray(manifest.available_days) ? manifest.available_days : null;

  if (!asof || typeof asof !== "string") {
    warn(`[${genre}/${chain}] manifest has no 'asof' (or variant). Path=${manifestPath}`);
  } else if (!isISODate(asof)) {
    warn(`[${genre}/${chain}] manifest.asof is not ISO date: ${String(asof)}`);
  }

  if (!availableDays) {
    warn(`[${genre}/${chain}] manifest.available_days missing or not array. Path=${manifestPath}`);
  } else if (availableDays.length === 0) {
    warn(`[${genre}/${chain}] manifest.available_days is empty. Path=${manifestPath}`);
  } else {
    // Ensure sorted and ISO-like
    for (let i = 0; i < availableDays.length; i++) {
      const d = availableDays[i];
      if (!isISODate(d)) {
        warn(`[${genre}/${chain}] manifest.available_days[${i}] not ISO date: ${String(d)}`);
        break;
      }
    }
  }

  // --- Latest shape checks
  // Common convention: latest has { chain, date, dataset_id, revision_id } but we don’t hard-require all
  if (latest.chain != null && String(latest.chain) !== chain) {
    warn(`[${genre}/${chain}] latest.chain mismatch: latest.chain=${String(latest.chain)} dir=${chain}`);
  }

  const latestDate = latest.date ?? null;
  if (latestDate == null) {
    warn(`[${genre}/${chain}] latest.json missing 'date' field. Path=${latestPath}`);
  } else if (!isISODate(latestDate)) {
    warn(`[${genre}/${chain}] latest.date not ISO: ${String(latestDate)} Path=${latestPath}`);
  }

  // --- Alignment: latest.date should match last available_days (if present)
  if (availableDays && availableDays.length > 0 && isISODate(latestDate)) {
    const last = availableDays[availableDays.length - 1];
    if (last !== latestDate) {
      // This is important: it usually indicates publish step mismatch.
      fail(
        `[${genre}/${chain}] latest.date does not match manifest last available day. ` +
          `manifest_last=${last} latest_date=${latestDate}`
      );
    }
  }

  return {
    ok: true,
    manifest,
    latest,
    manifestPath,
    latestPath,
  };
}

function extractIdPair(obj) {
  const dataset_id = obj?.dataset_id ?? null;
  const revision_id = obj?.revision_id ?? null;
  return {
    dataset_id: dataset_id == null ? null : String(dataset_id),
    revision_id: revision_id == null ? null : String(revision_id),
  };
}

function main() {
  console.log("=== CONTRACT CHECK (published v1) ===");
  console.log(`Root: ${ROOT}`);
  console.log("");

  if (!fileExists(ROOT)) {
    fail(`Missing published root folder: ${ROOT}`);
    process.exit(1);
  }

  /** results[chain][genre] = { manifest, latest, ... } */
  const results = {};
  for (const chain of CHAINS) {
    results[chain] = {};
    for (const genre of GENRES) {
      results[chain][genre] = inspectChainGenre(chain, genre);
    }
  }

  console.log("");
  console.log("=== CROSS-GENRE ALIGNMENT (dataset_id / revision_id) ===");

  for (const chain of CHAINS) {
    const g = results[chain]?.gold?.ok ? results[chain].gold.latest : null;
    const d = results[chain]?.derived?.ok ? results[chain].derived.latest : null;
    const m = results[chain]?.meta?.ok ? results[chain].meta.latest : null;

    if (!g || !d || !m) {
      warn(`[${chain}] Missing one or more genres (gold/derived/meta) — cannot fully align ids.`);
      continue;
    }

    const gi = extractIdPair(g);
    const di = extractIdPair(d);
    const mi = extractIdPair(m);

    // We do not hard-require ids, but if present, they must agree.
    const anyDataset =
      gi.dataset_id != null || di.dataset_id != null || mi.dataset_id != null;
    const anyRevision =
      gi.revision_id != null || di.revision_id != null || mi.revision_id != null;

    if (anyDataset) {
      const set = new Set([gi.dataset_id, di.dataset_id, mi.dataset_id].filter(Boolean));
      if (set.size > 1) {
        fail(
          `[${chain}] dataset_id mismatch across genres: ` +
            `gold=${gi.dataset_id ?? "—"} derived=${di.dataset_id ?? "—"} meta=${mi.dataset_id ?? "—"}`
        );
      }
    }

    if (anyRevision) {
      const set = new Set([gi.revision_id, di.revision_id, mi.revision_id].filter(Boolean));
      if (set.size > 1) {
        fail(
          `[${chain}] revision_id mismatch across genres: ` +
            `gold=${gi.revision_id ?? "—"} derived=${di.revision_id ?? "—"} meta=${mi.revision_id ?? "—"}`
        );
      }
    }

    ok(
      `[${chain}] aligned: dataset_id=${gi.dataset_id ?? di.dataset_id ?? mi.dataset_id ?? "—"} ` +
        `revision_id=${gi.revision_id ?? di.revision_id ?? mi.revision_id ?? "—"}`
    );
  }

  console.log("");
  if (process.exitCode && process.exitCode !== 0) {
    console.error("CONTRACT_CHECK: FAILED");
    process.exit(process.exitCode);
  } else {
    console.log("CONTRACT_CHECK: OK");
  }
}

main();