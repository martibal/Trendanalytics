#!/usr/bin/env node
/*START FILE*/
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const CHAINS = ["bitcoin", "ethereum", "arbitrum", "base"];
const GENRES = ["gold", "meta", "derived"];
const WINDOWS = [7, 30, 90, 180, 365];

const reportDir = path.join(root, ".audit", "publication-integrity");
const reportJsonPath = path.join(reportDir, "publication-integrity.json");
const reportMarkdownPath = path.join(reportDir, "publication-integrity.md");

function candidatePublishedRoots() {
  return [
    path.join(root, "public", "data", "published", "v1"),
    path.join(root, "data", "published", "v1"),
    path.join(root, "..", "public", "data", "published", "v1"),
    path.join(root, "..", "data", "published", "v1"),
    path.join(root, "..", "..", "public", "data", "published", "v1"),
    path.join(root, "..", "..", "data", "published", "v1"),
  ].map((candidate) => path.resolve(candidate));
}

function discoverPublishedRoot() {
  const candidates = candidatePublishedRoots();

  for (const candidate of candidates) {
    if (!fs.existsSync(candidate)) continue;

    const hasDataset = fs.existsSync(path.join(candidate, "dataset.json"));
    const hasGenreDirectory = GENRES.some((genre) =>
      fs.existsSync(path.join(candidate, genre))
    );

    if (hasDataset && hasGenreDirectory) {
      return candidate;
    }
  }

  for (const candidate of candidates) {
    if (!fs.existsSync(candidate)) continue;

    const hasGenreDirectory = GENRES.some((genre) =>
      fs.existsSync(path.join(candidate, genre))
    );

    if (hasGenreDirectory) {
      return candidate;
    }
  }

  return candidates[0];
}

const publishedRoot = discoverPublishedRoot();

function ensureReportDir() {
  fs.mkdirSync(reportDir, { recursive: true });
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function writeJson(file, obj) {
  fs.writeFileSync(file, `${JSON.stringify(obj, null, 2)}\n`, "utf8");
}

function isPlainObject(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function canonicalize(value) {
  if (Array.isArray(value)) {
    return value.map((item) => canonicalize(item));
  }

  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, child]) => [key, canonicalize(child)])
    );
  }

  return value;
}

function stableJson(value) {
  return JSON.stringify(canonicalize(value));
}

function tableRow(values) {
  return `| ${values.map((value) => String(value).replaceAll("\n", " ")).join(" | ")} |`;
}

function isIsoDay(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/u.test(value);
}

function chainGenreDir(genre, chain) {
  return path.join(publishedRoot, genre, chain);
}

function listDatedFiles(genre, chain) {
  const dir = chainGenreDir(genre, chain);

  if (!fs.existsSync(dir)) {
    return [];
  }

  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => /^\d{4}-\d{2}-\d{2}\.json$/u.test(name))
    .sort()
    .map((name) => ({
      date: name.replace(/\.json$/u, ""),
      file: path.join(dir, name),
      relativeFile: path.relative(root, path.join(dir, name)),
    }));
}

function fileDateFromJson(json, fallbackDate) {
  return isIsoDay(json?.date) ? json.date : fallbackDate;
}

function loadDayObjects(genre, chain) {
  return listDatedFiles(genre, chain).map((item) => {
    const json = readJson(item.file);
    return {
      ...item,
      json,
      jsonDate: fileDateFromJson(json, item.date),
    };
  });
}

function manifestPath(genre, chain) {
  return path.join(chainGenreDir(genre, chain), "manifest.json");
}

function latestPath(genre, chain) {
  return path.join(chainGenreDir(genre, chain), "latest.json");
}

function windowPath(genre, chain, windowDays) {
  return path.join(chainGenreDir(genre, chain), `last${windowDays}d.json`);
}

function addFinding(findings, severity, auditItem, code, file, detail) {
  findings.push({
    severity,
    auditItem,
    code,
    file,
    detail,
  });
}

function arrayEquals(a, b) {
  return Array.isArray(a) &&
    Array.isArray(b) &&
    a.length === b.length &&
    a.every((value, index) => value === b[index]);
}

function evaluateArtifactInventory(findings) {
  const inventory = [];

  for (const genre of GENRES) {
    for (const chain of CHAINS) {
      const dir = chainGenreDir(genre, chain);

      if (!fs.existsSync(dir)) {
        addFinding(findings, "fail", "D-001", "MISSING_GENRE_CHAIN_DIRECTORY", path.relative(root, dir), `Published directory missing for ${genre}/${chain}.`);
        inventory.push({ genre, chain, dir: path.relative(root, dir), days: [], count: 0 });
        continue;
      }

      const dayObjects = loadDayObjects(genre, chain);
      const days = dayObjects.map((item) => item.date);

      if (days.length === 0) {
        addFinding(findings, "fail", "D-001", "NO_DATED_DAY_FILES", path.relative(root, dir), `No YYYY-MM-DD.json day files found for ${genre}/${chain}.`);
      }

      for (const item of dayObjects) {
        if (item.jsonDate !== item.date) {
          addFinding(findings, "fail", "D-001", "DAY_FILE_DATE_MISMATCH", item.relativeFile, `File name date ${item.date} does not match JSON date ${item.jsonDate}.`);
        }

        if (item.json?.chain !== chain) {
          addFinding(findings, "fail", "D-001", "DAY_FILE_CHAIN_MISMATCH", item.relativeFile, `Expected chain ${chain}, got ${item.json?.chain}.`);
        }
      }

      inventory.push({
        genre,
        chain,
        dir: path.relative(root, dir),
        days,
        count: days.length,
        first: days[0] ?? null,
        latest: days[days.length - 1] ?? null,
      });
    }
  }

  return inventory;
}

function evaluateDatasetIndex(findings, inventory) {
  const file = path.join(publishedRoot, "dataset.json");

  if (!fs.existsSync(file)) {
    addFinding(
      findings,
      "fail",
      "D-002",
      "MISSING_DATASET_INDEX",
      path.relative(root, file),
      "dataset.json was not found in the published v1 root."
    );
    return null;
  }

  const dataset = readJson(file);

  if (!Array.isArray(dataset.supported_chains)) {
    addFinding(findings, "fail", "D-002", "DATASET_SUPPORTED_CHAINS_MISSING", path.relative(root, file), "dataset.supported_chains must be an array.");
  } else {
    for (const chain of CHAINS) {
      if (!dataset.supported_chains.includes(chain)) {
        addFinding(findings, "fail", "D-002", "DATASET_SUPPORTED_CHAIN_MISSING", path.relative(root, file), `dataset.supported_chains does not include ${chain}.`);
      }
    }
  }

  if (!Array.isArray(dataset.supported_genres)) {
    addFinding(findings, "fail", "D-002", "DATASET_SUPPORTED_GENRES_MISSING", path.relative(root, file), "dataset.supported_genres must be an array.");
  } else {
    for (const genre of GENRES) {
      if (!dataset.supported_genres.includes(genre)) {
        addFinding(findings, "fail", "D-002", "DATASET_SUPPORTED_GENRE_MISSING", path.relative(root, file), `dataset.supported_genres does not include ${genre}.`);
      }
    }
  }

  if (!Array.isArray(dataset.windows_supported)) {
    addFinding(findings, "fail", "D-002", "DATASET_WINDOWS_SUPPORTED_MISSING", path.relative(root, file), "dataset.windows_supported must be an array.");
  } else {
    for (const windowDays of WINDOWS) {
      if (!dataset.windows_supported.includes(windowDays)) {
        addFinding(findings, "fail", "D-002", "DATASET_WINDOW_MISSING", path.relative(root, file), `dataset.windows_supported does not include ${windowDays}.`);
      }
    }
  }

  for (const row of inventory) {
    const expectedFrom = row.days[0] ?? null;
    const expectedTo = row.days[row.days.length - 1] ?? null;
    const expectedDays = row.days.length;

    const coverage = dataset.coverage?.[row.chain]?.[row.genre];
    const asofByGenreChain = dataset.asof_by_genre_chain?.[row.genre]?.[row.chain];

    if (!coverage) {
      addFinding(findings, "fail", "D-002", "DATASET_COVERAGE_ENTRY_MISSING", path.relative(root, file), `dataset.coverage.${row.chain}.${row.genre} is missing.`);
      continue;
    }

    if (coverage.from !== expectedFrom) {
      addFinding(findings, "fail", "D-002", "DATASET_COVERAGE_FROM_MISMATCH", path.relative(root, file), `${row.genre}/${row.chain}: coverage.from=${coverage.from}, expected ${expectedFrom}.`);
    }

    if (coverage.to !== expectedTo) {
      addFinding(findings, "fail", "D-002", "DATASET_COVERAGE_TO_MISMATCH", path.relative(root, file), `${row.genre}/${row.chain}: coverage.to=${coverage.to}, expected ${expectedTo}.`);
    }

    if (coverage.asof !== expectedTo) {
      addFinding(findings, "fail", "D-002", "DATASET_COVERAGE_ASOF_MISMATCH", path.relative(root, file), `${row.genre}/${row.chain}: coverage.asof=${coverage.asof}, expected ${expectedTo}.`);
    }

    if (coverage.days !== expectedDays) {
      addFinding(findings, "fail", "D-002", "DATASET_COVERAGE_DAYS_MISMATCH", path.relative(root, file), `${row.genre}/${row.chain}: coverage.days=${coverage.days}, expected ${expectedDays}.`);
    }

    if (asofByGenreChain !== expectedTo) {
      addFinding(findings, "fail", "D-002", "DATASET_ASOF_BY_GENRE_CHAIN_MISMATCH", path.relative(root, file), `${row.genre}/${row.chain}: asof_by_genre_chain=${asofByGenreChain}, expected ${expectedTo}.`);
    }
  }

  return dataset;
}

function evaluateManifest(findings, inventory) {
  for (const row of inventory) {
    const file = manifestPath(row.genre, row.chain);
    const relativeFile = path.relative(root, file);

    if (!fs.existsSync(file)) {
      addFinding(findings, "fail", "D-003", "MISSING_MANIFEST", relativeFile, `manifest.json missing for ${row.genre}/${row.chain}.`);
      continue;
    }

    const manifest = readJson(file);

    if (!Array.isArray(manifest.available_days)) {
      addFinding(findings, "fail", "D-003", "MANIFEST_AVAILABLE_DAYS_MISSING", relativeFile, "manifest.available_days must be an array.");
      continue;
    }

    const availableDays = manifest.available_days;

    if (!arrayEquals(availableDays, [...availableDays].sort())) {
      addFinding(findings, "fail", "D-003", "MANIFEST_AVAILABLE_DAYS_NOT_SORTED", relativeFile, "manifest.available_days must be sorted ascending.");
    }

    if (new Set(availableDays).size !== availableDays.length) {
      addFinding(findings, "fail", "D-003", "MANIFEST_AVAILABLE_DAYS_DUPLICATES", relativeFile, "manifest.available_days contains duplicate dates.");
    }

    for (const day of availableDays) {
      if (!isIsoDay(day)) {
        addFinding(findings, "fail", "D-003", "MANIFEST_DAY_NOT_ISO_DATE", relativeFile, `Invalid manifest day: ${day}.`);
      }
    }

    if (!arrayEquals(availableDays, row.days)) {
      const missingFromManifest = row.days.filter((day) => !availableDays.includes(day));
      const missingFiles = availableDays.filter((day) => !row.days.includes(day));

      addFinding(
        findings,
        "fail",
        "D-004",
        "MANIFEST_TO_DAY_FILES_MISMATCH",
        relativeFile,
        `${row.genre}/${row.chain}: manifest/day-file mismatch. Missing from manifest: ${missingFromManifest.slice(0, 10).join(", ") || "none"}; listed but missing file: ${missingFiles.slice(0, 10).join(", ") || "none"}.`
      );
    }

    const expectedAsof = row.latest;
    if (manifest.asof !== expectedAsof) {
      addFinding(findings, "fail", "D-003", "MANIFEST_ASOF_MISMATCH", relativeFile, `manifest.asof=${manifest.asof}, expected ${expectedAsof}.`);
    }
  }
}

function evaluateLatestPointers(findings, inventory) {
  for (const row of inventory) {
    const file = latestPath(row.genre, row.chain);
    const relativeFile = path.relative(root, file);

    if (!fs.existsSync(file)) {
      addFinding(findings, "fail", "D-005", "MISSING_LATEST_JSON", relativeFile, `latest.json missing for ${row.genre}/${row.chain}.`);
      continue;
    }

    if (!row.latest) {
      addFinding(findings, "fail", "D-005", "LATEST_WITHOUT_DAY_FILES", relativeFile, `latest.json exists for ${row.genre}/${row.chain}, but no day files exist.`);
      continue;
    }

    const latest = readJson(file);
    const expectedFile = path.join(chainGenreDir(row.genre, row.chain), `${row.latest}.json`);
    const expected = readJson(expectedFile);

    if (fileDateFromJson(latest, null) !== row.latest) {
      addFinding(findings, "fail", "D-005", "LATEST_DATE_MISMATCH", relativeFile, `latest.json date=${fileDateFromJson(latest, null)}, expected ${row.latest}.`);
    }

    if (stableJson(latest) !== stableJson(expected)) {
      addFinding(findings, "fail", "D-005", "LATEST_CONTENT_MISMATCH", relativeFile, `latest.json does not exactly match ${path.relative(root, expectedFile)}.`);
    }
  }
}

function evaluateWindowFiles(findings, inventory) {
  for (const row of inventory) {
    const dayObjectsByDate = new Map(
      loadDayObjects(row.genre, row.chain).map((item) => [item.date, item.json])
    );

    for (const windowDays of WINDOWS) {
      const file = windowPath(row.genre, row.chain, windowDays);
      const relativeFile = path.relative(root, file);

      if (!fs.existsSync(file)) {
        addFinding(findings, "fail", "D-005", "MISSING_WINDOW_FILE", relativeFile, `last${windowDays}d.json missing for ${row.genre}/${row.chain}.`);
        continue;
      }

      const payload = readJson(file);
      if (!Array.isArray(payload)) {
        addFinding(findings, "fail", "D-005", "WINDOW_FILE_NOT_ARRAY", relativeFile, `last${windowDays}d.json must contain an array.`);
        continue;
      }

      const expectedDays = row.days.slice(-Math.min(windowDays, row.days.length));
      const observedDays = payload.map((item) => fileDateFromJson(item, null));

      if (!arrayEquals(observedDays, expectedDays)) {
        addFinding(
          findings,
          "fail",
          "D-005",
          "WINDOW_DATES_MISMATCH",
          relativeFile,
          `last${windowDays}d.json dates do not match last ${expectedDays.length} day files. Observed tail=${observedDays.slice(-5).join(", ")} expected tail=${expectedDays.slice(-5).join(", ")}.`
        );
      }

      payload.forEach((item, index) => {
        const date = observedDays[index];
        const expected = dayObjectsByDate.get(date);

        if (!expected) {
          addFinding(findings, "fail", "D-005", "WINDOW_ITEM_WITHOUT_DAY_FILE", relativeFile, `Window item date ${date} has no matching day file.`);
          return;
        }

        if (stableJson(item) !== stableJson(expected)) {
          addFinding(findings, "fail", "D-005", "WINDOW_ITEM_CONTENT_MISMATCH", relativeFile, `Window item ${date} does not exactly match its day file.`);
        }
      });
    }
  }
}

function evaluateDerivedLineage(findings) {
  let checked = 0;
  let withSource = 0;

  for (const chain of CHAINS) {
    const derivedDays = loadDayObjects("derived", chain);
    const goldDays = new Set(loadDayObjects("gold", chain).map((item) => item.date));

    for (const item of derivedDays) {
      checked += 1;
      const source = item.json?.derived?.source;

      if (!isPlainObject(source)) {
        addFinding(findings, "warn", "D-006", "DERIVED_SOURCE_SIGNATURE_MISSING", item.relativeFile, "Derived day file has no derived.source lineage block. This is allowed for older artifacts only if explicitly documented.");
        continue;
      }

      withSource += 1;

      if (source.chain !== chain) {
        addFinding(findings, "fail", "D-006", "DERIVED_SOURCE_CHAIN_MISMATCH", item.relativeFile, `derived.source.chain=${source.chain}, expected ${chain}.`);
      }

      if (source.date !== item.date) {
        addFinding(findings, "fail", "D-006", "DERIVED_SOURCE_DATE_MISMATCH", item.relativeFile, `derived.source.date=${source.date}, expected ${item.date}.`);
      }

      if (!goldDays.has(item.date)) {
        addFinding(findings, "fail", "D-006", "DERIVED_SOURCE_GOLD_DAY_MISSING", item.relativeFile, `Derived date ${item.date} has no matching gold day file.`);
      }

      if (typeof source.gold_sha256 !== "string" || source.gold_sha256.length < 32) {
        addFinding(findings, "fail", "D-006", "DERIVED_SOURCE_GOLD_HASH_MISSING", item.relativeFile, "derived.source.gold_sha256 is missing or malformed.");
      }

      if (!Array.isArray(source.rolling_windows) || !arrayEquals(source.rolling_windows, [7, 30])) {
        addFinding(findings, "fail", "D-006", "DERIVED_SOURCE_WINDOWS_MISMATCH", item.relativeFile, "derived.source.rolling_windows must be [7,30].");
      }
    }
  }

  return { checked, withSource };
}

function evaluate() {
  const findings = [];

  if (!fs.existsSync(publishedRoot)) {
    addFinding(findings, "fail", "D-001", "PUBLISHED_ROOT_MISSING", path.relative(root, publishedRoot), "Published v1 root does not exist.");
  }

  const inventory = evaluateArtifactInventory(findings);
  const dataset = evaluateDatasetIndex(findings, inventory);
  evaluateManifest(findings, inventory);
  evaluateLatestPointers(findings, inventory);
  evaluateWindowFiles(findings, inventory);
  const derivedLineage = evaluateDerivedLineage(findings);

  return {
    generatedAtUtc: new Date().toISOString(),
    result: findings.some((finding) => finding.severity === "fail") ? "FAIL" : "PASS",
    publishedRoot: path.relative(root, publishedRoot) || ".",
    searchedPublishedRoots: candidatePublishedRoots().map((candidate) => path.relative(root, candidate) || "."),
    datasetPresent: !!dataset,
    inventory,
    derivedLineage,
    findings,
  };
}

function markdownReport(result) {
  const lines = [];

  lines.push("# Publication Integrity Audit");
  lines.push("");
  lines.push(`Generated at UTC: ${result.generatedAtUtc}`);
  lines.push(`Result: ${result.result}`);
  lines.push(`Published root: ${result.publishedRoot}`);
  lines.push("");
  lines.push("## Artifact inventory");
  lines.push("");
  lines.push(tableRow(["Genre", "Chain", "Day files", "First", "Latest", "Directory"]));
  lines.push(tableRow(["---", "---", "---", "---", "---", "---"]));

  for (const row of result.inventory) {
    lines.push(tableRow([row.genre, row.chain, row.count, row.first ?? "n/a", row.latest ?? "n/a", row.dir]));
  }

  lines.push("");
  lines.push("## Derived lineage");
  lines.push("");
  lines.push(`Checked derived day files: ${result.derivedLineage.checked}`);
  lines.push(`With derived.source lineage block: ${result.derivedLineage.withSource}`);
  lines.push("");
  lines.push("Note: this audit verifies lineage block presence and source/date/window consistency. It does not recompute Python canonical JSON hashes because Python and JavaScript serialize floating-point numbers differently.");
  lines.push("");
  lines.push("## Findings");
  lines.push("");

  if (result.findings.length === 0) {
    lines.push("No publication-integrity findings.");
  } else {
    lines.push(tableRow(["Severity", "Audit item", "Code", "File", "Detail"]));
    lines.push(tableRow(["---", "---", "---", "---", "---"]));

    for (const finding of result.findings) {
      lines.push(tableRow([finding.severity, finding.auditItem, finding.code, finding.file, finding.detail]));
    }
  }

  lines.push("");
  lines.push("## Coverage");
  lines.push("");
  lines.push("- D-001 Published Artifact Inventory: checks genre/chain directories and dated day-file presence.");
  lines.push("- D-002 Dataset Index Consistency: checks dataset.json supported chains/genres/windows and coverage/asof values.");
  lines.push("- D-003 Manifest Validity: checks manifest existence, sorted unique available_days, ISO dates, and asof.");
  lines.push("- D-004 Manifest-to-File Consistency: compares manifest.available_days against actual YYYY-MM-DD.json files.");
  lines.push("- D-005 Latest and Window Pointer Consistency: verifies latest.json and lastXd.json content against day files.");
  lines.push("- D-006 Derived Lineage Presence: verifies derived.source metadata exists and aligns with chain/date/window/gold presence.");
  lines.push("");
  lines.push("This script does not yet validate API runtime delivery, CDN/cache invalidation, entitlement-specific published subsets, or Python-level recomputation of stored source hashes.");

  return `${lines.join("\n")}\n`;
}

const result = evaluate();

ensureReportDir();
writeJson(reportJsonPath, result);
fs.writeFileSync(reportMarkdownPath, markdownReport(result), "utf8");

if (result.findings.some((finding) => finding.severity === "fail")) {
  console.error("Publication integrity audit failed.");
  console.error(`Report: ${path.relative(root, reportMarkdownPath)}`);
  console.error("");

  const failures = result.findings.filter((finding) => finding.severity === "fail");
  const visibleFailures = failures.slice(0, 50);

  for (const finding of visibleFailures) {
    console.error(`[${finding.severity.toUpperCase()}] ${finding.auditItem} ${finding.code} :: ${finding.file}`);
    console.error(`  Detail: ${finding.detail}`);
  }

  if (failures.length > visibleFailures.length) {
    console.error("");
    console.error(`Terminal output capped at 50 of ${failures.length} failure(s). Full detail is in ${path.relative(root, reportMarkdownPath)} and ${path.relative(root, reportJsonPath)}.`);
  }

  process.exit(1);
}

const warnings = result.findings.filter((finding) => finding.severity === "warn");

if (warnings.length > 0) {
  console.warn(`Publication integrity audit passed with ${warnings.length} warning(s).`);
  console.warn(`Report: ${path.relative(root, reportMarkdownPath)}`);
  process.exit(0);
}

console.log("Publication integrity audit passed.");
console.log(`Report: ${path.relative(root, reportMarkdownPath)}`);
/*END FILE*/