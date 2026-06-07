#!/usr/bin/env node
/*START FILE*/
import crypto from "node:crypto";
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
const privateMirrorRoot = path.resolve(path.join(root, ".private-data", "published", "v1"));
const publicPublishedRoot = path.resolve(path.join(root, "public", "data", "published", "v1"));
const fileApiRoutePath = path.join(root, "src", "app", "api", "v1", "files", "[...path]", "route.ts");
const fileApiDocsPath = path.join(root, "src", "app", "api-docs", "page.tsx");
const storageIndexPath = path.join(root, "src", "lib", "storage", "index.ts");
const localStoragePath = path.join(root, "src", "lib", "storage", "localDev.ts");
const s3StoragePath = path.join(root, "src", "lib", "storage", "s3.ts");
const runDailyPipelinePath = path.join(root, "..", "run-daily-pipeline.ps1");
const snapshotMetadataHarmonizerPath = path.join(root, "..", "harmonize-published-snapshot-metadata.ps1");
const githubPipelineWorkflowPath = path.join(root, "..", ".github", "workflows", "pipeline.yml");

function ensureReportDir() {
  fs.mkdirSync(reportDir, { recursive: true });
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function writeJson(file, obj) {
  fs.writeFileSync(file, `${JSON.stringify(obj, null, 2)}\n`, "utf8");
}

function sha256File(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function normalizeRelativePath(value) {
  return value.split(path.sep).join("/");
}

function listFilesRecursive(dir) {
  if (!fs.existsSync(dir)) {
    return [];
  }

  const out = [];
  const stack = [dir];

  while (stack.length > 0) {
    const current = stack.pop();

    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name);

      if (entry.isDirectory()) {
        stack.push(fullPath);
        continue;
      }

      if (entry.isFile()) {
        out.push(fullPath);
      }
    }
  }

  return out.sort();
}

function hasUtf8Bom(file) {
  if (!fs.existsSync(file)) {
    return false;
  }

  const fd = fs.openSync(file, "r");

  try {
    const buffer = Buffer.alloc(3);
    const bytesRead = fs.readSync(fd, buffer, 0, 3, 0);

    return bytesRead === 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf;
  } finally {
    fs.closeSync(fd);
  }
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

function evaluatePrivateMirrorConsistency(findings) {
  const sourceFiles = listFilesRecursive(publishedRoot);
  const mirrorFiles = listFilesRecursive(privateMirrorRoot);
  const mirrorByRelativePath = new Map();

  let compared = 0;
  let missing = 0;
  let mismatched = 0;
  let extra = 0;

  if (!fs.existsSync(privateMirrorRoot)) {
    addFinding(
      findings,
      "fail",
      "D-007",
      "PRIVATE_MIRROR_ROOT_MISSING",
      path.relative(root, privateMirrorRoot),
      "The private webapp published-data mirror is missing. Run publish-web-data.ps1 -SkipPush before build/deploy."
    );

    return {
      sourceFiles: sourceFiles.length,
      mirrorFiles: 0,
      compared,
      missing: sourceFiles.length,
      mismatched,
      extra,
    };
  }

  for (const file of mirrorFiles) {
    const relative = normalizeRelativePath(path.relative(privateMirrorRoot, file));
    mirrorByRelativePath.set(relative, file);
  }

  for (const sourceFile of sourceFiles) {
    const relative = normalizeRelativePath(path.relative(publishedRoot, sourceFile));
    const mirrorFile = mirrorByRelativePath.get(relative);

    if (!mirrorFile) {
      missing += 1;
      addFinding(
        findings,
        "fail",
        "D-007",
        "PRIVATE_MIRROR_FILE_MISSING",
        path.relative(root, path.join(privateMirrorRoot, relative)),
        `Private mirror is missing source published file ${relative}.`
      );
      continue;
    }

    compared += 1;

    if (sha256File(sourceFile) !== sha256File(mirrorFile)) {
      mismatched += 1;
      addFinding(
        findings,
        "fail",
        "D-007",
        "PRIVATE_MIRROR_FILE_MISMATCH",
        path.relative(root, mirrorFile),
        `Private mirror file does not byte-match source published file ${relative}.`
      );
    }
  }

  const sourceRelativePaths = new Set(
    sourceFiles.map((file) => normalizeRelativePath(path.relative(publishedRoot, file)))
  );

  for (const mirrorFile of mirrorFiles) {
    const relative = normalizeRelativePath(path.relative(privateMirrorRoot, mirrorFile));

    if (!sourceRelativePaths.has(relative)) {
      extra += 1;
      addFinding(
        findings,
        "warn",
        "D-007",
        "PRIVATE_MIRROR_EXTRA_FILE",
        path.relative(root, mirrorFile),
        `Private mirror contains a file not present in source published root: ${relative}.`
      );
    }
  }

  return {
    sourceFiles: sourceFiles.length,
    mirrorFiles: mirrorFiles.length,
    compared,
    missing,
    mismatched,
    extra,
  };
}

function evaluatePublicExposureBoundary(findings) {
  const forbiddenGenres = ["gold", "meta", "derived"];
  let forbiddenFiles = 0;
  let checkedDirectories = 0;

  if (!fs.existsSync(publicPublishedRoot)) {
    return {
      publicRootExists: false,
      checkedDirectories,
      forbiddenFiles,
    };
  }

  for (const genre of forbiddenGenres) {
    const dir = path.join(publicPublishedRoot, genre);
    checkedDirectories += 1;

    const files = listFilesRecursive(dir);
    forbiddenFiles += files.length;

    for (const file of files.slice(0, 100)) {
      addFinding(
        findings,
        "fail",
        "D-008",
        "SUBSCRIBER_ARTIFACT_PUBLICLY_EXPOSED",
        path.relative(root, file),
        `${genre} artifact exists under web-v1-app/public/data/published/v1. Subscriber-bound datasets must be served from the private mirror/API gate, not the public static directory.`
      );
    }

    if (files.length > 100) {
      addFinding(
        findings,
        "fail",
        "D-008",
        "SUBSCRIBER_ARTIFACT_PUBLIC_EXPOSURE_CAPPED",
        path.relative(root, dir),
        `${files.length} ${genre} files exist under the public static published-data tree; terminal/report findings were capped.`
      );
    }
  }

  return {
    publicRootExists: true,
    checkedDirectories,
    forbiddenFiles,
  };
}

function evaluateFileApiRouteContract(findings) {
  const relativeFile = path.relative(root, fileApiRoutePath);

  const result = {
    routeExists: fs.existsSync(fileApiRoutePath),
    hasPrivateStoragePathPrefix: false,
    hasEntitlementEvaluation: false,
    readsStorageObject: false,
    entitlementBeforeStorageRead: false,
    hasPrivateNoStoreCache: false,
    hasRequestIdHeader: false,
  };

  if (!result.routeExists) {
    addFinding(
      findings,
      "fail",
      "D-009",
      "FILE_API_ROUTE_MISSING",
      relativeFile,
      "Expected subscriber file-delivery route is missing."
    );

    return result;
  }

  const source = fs.readFileSync(fileApiRoutePath, "utf8").replace(/^\uFEFF/u, "");

  result.hasPrivateStoragePathPrefix =
    source.includes('path.posix.join("data", "published", "v1"') ||
    source.includes("path.posix.join('data', 'published', 'v1'");

  result.hasEntitlementEvaluation = source.includes("evaluateFileEntitlement(");
  result.readsStorageObject = source.includes("readStorageObject(storagePath)");
  result.hasPrivateNoStoreCache = source.includes('"Cache-Control": "private, no-store"') || source.includes("'Cache-Control': 'private, no-store'");
  result.hasRequestIdHeader = source.includes('"X-Request-Id"') || source.includes("'X-Request-Id'");

  const entitlementIndex = source.indexOf("evaluateFileEntitlement(");
  const readIndex = source.indexOf("readStorageObject(storagePath)");
  result.entitlementBeforeStorageRead = entitlementIndex >= 0 && readIndex >= 0 && entitlementIndex < readIndex;

  if (!result.hasPrivateStoragePathPrefix) {
    addFinding(
      findings,
      "fail",
      "D-009",
      "FILE_API_STORAGE_PREFIX_CONTRACT_MISSING",
      relativeFile,
      "File API route must build storage paths under data/published/v1."
    );
  }

  if (!result.hasEntitlementEvaluation) {
    addFinding(
      findings,
      "fail",
      "D-009",
      "FILE_API_ENTITLEMENT_EVALUATION_MISSING",
      relativeFile,
      "File API route must evaluate subscriber entitlement before serving files."
    );
  }

  if (!result.readsStorageObject) {
    addFinding(
      findings,
      "fail",
      "D-009",
      "FILE_API_STORAGE_READ_MISSING",
      relativeFile,
      "File API route must read files through readStorageObject(storagePath)."
    );
  }

  if (!result.entitlementBeforeStorageRead) {
    addFinding(
      findings,
      "fail",
      "D-009",
      "FILE_API_STORAGE_READ_BEFORE_ENTITLEMENT",
      relativeFile,
      "File API route must evaluate entitlement before reading the storage object."
    );
  }

  if (!result.hasPrivateNoStoreCache) {
    addFinding(
      findings,
      "fail",
      "D-009",
      "FILE_API_PRIVATE_CACHE_HEADER_MISSING",
      relativeFile,
      "File API route must return Cache-Control: private, no-store for subscriber-bound file responses."
    );
  }

  if (!result.hasRequestIdHeader) {
    addFinding(
      findings,
      "fail",
      "D-009",
      "FILE_API_REQUEST_ID_HEADER_MISSING",
      relativeFile,
      "File API route should include X-Request-Id for auditability."
    );
  }

  return result;
}

function evaluateJsonEncodingAndParse(findings) {
  const jsonFiles = [
    path.join(root, "package.json"),
    ...listFilesRecursive(publishedRoot).filter((file) => file.endsWith(".json")),
    ...listFilesRecursive(privateMirrorRoot).filter((file) => file.endsWith(".json")),
  ];

  const textFilesThatMustNotHaveBom = [
    path.join(root, "package.json"),
    path.join(root, "scripts", "publication-integrity-audit.mjs"),
  ];

  let parsedJsonFiles = 0;
  let jsonFilesWithBom = 0;
  let invalidJsonFiles = 0;
  let textFilesWithBom = 0;

  for (const file of textFilesThatMustNotHaveBom) {
    if (hasUtf8Bom(file)) {
      textFilesWithBom += 1;
      addFinding(
        findings,
        "fail",
        "D-010",
        "TEXT_FILE_HAS_UTF8_BOM",
        path.relative(root, file),
        "Text file starts with a UTF-8 BOM. This has previously broken package parsing/build behavior and should not be reintroduced."
      );
    }
  }

  for (const file of jsonFiles) {
    if (hasUtf8Bom(file)) {
      jsonFilesWithBom += 1;
      addFinding(
        findings,
        "fail",
        "D-010",
        "JSON_FILE_HAS_UTF8_BOM",
        path.relative(root, file),
        "JSON file starts with a UTF-8 BOM."
      );
    }

    try {
      JSON.parse(fs.readFileSync(file, "utf8").replace(/^\uFEFF/u, ""));
      parsedJsonFiles += 1;
    } catch (error) {
      invalidJsonFiles += 1;
      addFinding(
        findings,
        "fail",
        "D-010",
        "JSON_FILE_PARSE_ERROR",
        path.relative(root, file),
        error instanceof Error ? error.message : "JSON parse failed."
      );
    }
  }

  return {
    parsedJsonFiles,
    jsonFilesWithBom,
    invalidJsonFiles,
    textFilesWithBom,
  };
}
function expectedArtifactPathForApiSegments(segments) {
  if (!Array.isArray(segments) || segments.length < 3) {
    return null;
  }

  const [genre, chain, third, fourth] = segments;

  if (!GENRES.includes(genre) || !CHAINS.includes(chain)) {
    return null;
  }

  if (segments.length === 3 && third === "latest.json") {
    return path.join(privateMirrorRoot, genre, chain, "latest.json");
  }

  if (segments.length === 4 && fourth === "latest.json") {
    const windowMap = new Map([
      ["7d", "last7d.json"],
      ["30d", "last30d.json"],
      ["90d", "last90d.json"],
      ["180d", "last180d.json"],
      ["365d", "last365d.json"],
    ]);

    const windowFile = windowMap.get(third);
    return windowFile ? path.join(privateMirrorRoot, genre, chain, windowFile) : null;
  }

  return null;
}

function documentedFileApiPatterns() {
  if (!fs.existsSync(fileApiDocsPath)) {
    return [];
  }

  const source = fs.readFileSync(fileApiDocsPath, "utf8").replace(/^\uFEFF/u, "");
  const patterns = new Set();
  const regex = /\/api\/v1\/files\/[^"`<>\s)]+/gu;
  let match = regex.exec(source);

  while (match) {
    patterns.add(match[0]);
    match = regex.exec(source);
  }

  return [...patterns].sort();
}

function sampleApiFilePaths() {
  const out = [];

  for (const genre of GENRES) {
    for (const chain of CHAINS) {
      out.push({
        apiPath: `/api/v1/files/${genre}/${chain}/latest.json`,
        segments: [genre, chain, "latest.json"],
      });

      for (const windowDays of WINDOWS) {
        out.push({
          apiPath: `/api/v1/files/${genre}/${chain}/${windowDays}d/latest.json`,
          segments: [genre, chain, `${windowDays}d`, "latest.json"],
        });
      }
    }
  }

  return out;
}

function evaluateFileApiArtifactMapping(findings) {
  const documentedPatterns = documentedFileApiPatterns();
  const samples = sampleApiFilePaths();

  let checked = 0;
  let missingExpectedArtifacts = 0;
  let impossibleMappings = 0;

  for (const sample of samples) {
    const expectedArtifact = expectedArtifactPathForApiSegments(sample.segments);

    if (!expectedArtifact) {
      impossibleMappings += 1;
      addFinding(
        findings,
        "fail",
        "D-011",
        "FILE_API_PATH_HAS_NO_ARTIFACT_MAPPING",
        sample.apiPath,
        "The API file path shape cannot be mapped to a known published artifact file."
      );
      continue;
    }

    checked += 1;

    if (!fs.existsSync(expectedArtifact)) {
      missingExpectedArtifacts += 1;
      addFinding(
        findings,
        "fail",
        "D-011",
        "FILE_API_EXPECTED_ARTIFACT_MISSING",
        sample.apiPath,
        `Expected private artifact is missing: ${path.relative(root, expectedArtifact)}.`
      );
    }
  }

  const routeSource = fs.existsSync(fileApiRoutePath)
    ? fs.readFileSync(fileApiRoutePath, "utf8").replace(/^\uFEFF/u, "")
    : "";

  const usesRawSegmentsAsStoragePath =
    routeSource.includes("buildStoragePath(parsedPath.storageSegments)") &&
    routeSource.includes("path.posix.join(\"data\", \"published\", \"v1\", ...segments)");

  if (usesRawSegmentsAsStoragePath) {
    addFinding(
      findings,
      "fail",
      "D-011",
      "FILE_API_ROUTE_USES_RAW_WINDOW_SEGMENTS",
      path.relative(root, fileApiRoutePath),
      "The file API route appears to use raw request segments as the storage path. Documented paths such as /90d/latest.json must be translated to last90d.json before storage read."
    );
  }

  const docsMentionWindowLatest = documentedPatterns.some((pattern) =>
    pattern.includes("[window]/latest.json") ||
    /\/(7d|30d|90d|180d|365d)\/latest\.json$/u.test(pattern)
  );

  if (!docsMentionWindowLatest) {
    addFinding(
      findings,
      "warn",
      "D-011",
      "FILE_API_DOCS_DO_NOT_SHOW_WINDOW_LATEST_SHAPE",
      path.relative(root, fileApiDocsPath),
      "API docs do not appear to document the window/latest.json authenticated file shape."
    );
  }

  return {
    documentedPatterns,
    sampledPaths: samples.length,
    checked,
    missingExpectedArtifacts,
    impossibleMappings,
    routeUsesRawSegmentsAsStoragePath: usesRawSegmentsAsStoragePath,
  };
}
function normalizeStoragePathForAudit(storagePath) {
  const cleaned = String(storagePath).replace(/^\/+/u, "");

  if (cleaned.startsWith("data/published/v1/")) {
    return cleaned.slice("data/published/v1/".length);
  }

  if (cleaned === "data/published/v1") {
    return "";
  }

  return cleaned;
}

function localStorageCandidateRootsForAudit() {
  return [
    path.resolve(path.join(root, "..", "data", "published", "v1")),
    path.resolve(path.join(root, "data", "published", "v1")),
    privateMirrorRoot,
    publicPublishedRoot,
  ];
}

function firstExistingCandidateForStoragePath(storagePath) {
  const normalizedPath = normalizeStoragePathForAudit(storagePath);

  for (const candidateRoot of localStorageCandidateRootsForAudit()) {
    const absolutePath = path.join(candidateRoot, normalizedPath);

    if (fs.existsSync(absolutePath)) {
      return {
        normalizedPath,
        candidateRoot,
        absolutePath,
      };
    }
  }

  return {
    normalizedPath,
    candidateRoot: null,
    absolutePath: null,
  };
}

function localStorageSmokeSamples() {
  return [
    "data/published/v1/gold/bitcoin/latest.json",
    "data/published/v1/gold/base/latest.json",
    "data/published/v1/meta/bitcoin/last90d.json",
    "data/published/v1/meta/arbitrum/last365d.json",
    "data/published/v1/derived/ethereum/last30d.json",
    "data/published/v1/derived/base/last7d.json",
  ];
}

function evaluateLocalStorageResolution(findings) {
  const storageIndexSource = fs.existsSync(storageIndexPath)
    ? fs.readFileSync(storageIndexPath, "utf8").replace(/^\uFEFF/u, "")
    : "";

  const localStorageSource = fs.existsSync(localStoragePath)
    ? fs.readFileSync(localStoragePath, "utf8").replace(/^\uFEFF/u, "")
    : "";

  const result = {
    storageIndexExists: fs.existsSync(storageIndexPath),
    localStorageExists: fs.existsSync(localStoragePath),
    stripsPublishedPrefix: false,
    includesPrivateMirrorRoot: false,
    includesPublicFallback: false,
    publicFallbackAfterPrivateMirror: false,
    samplesChecked: 0,
    samplesResolved: 0,
    samplesResolvedToPublic: 0,
    sampleResolutions: [],
  };

  if (!result.storageIndexExists) {
    addFinding(
      findings,
      "fail",
      "D-012",
      "STORAGE_INDEX_MODULE_MISSING",
      path.relative(root, storageIndexPath),
      "Storage index module is missing."
    );
  } else {
    result.stripsPublishedPrefix =
      storageIndexSource.includes('cleaned.startsWith("data/published/v1/")') &&
      storageIndexSource.includes('cleaned.slice("data/published/v1/".length)');

    if (!result.stripsPublishedPrefix) {
      addFinding(
        findings,
        "fail",
        "D-012",
        "STORAGE_PATH_PREFIX_NORMALIZATION_MISSING",
        path.relative(root, storageIndexPath),
        "Storage index must normalize data/published/v1/* API storage paths before resolving local/S3 objects."
      );
    }
  }

  if (!result.localStorageExists) {
    addFinding(
      findings,
      "fail",
      "D-012",
      "LOCAL_STORAGE_MODULE_MISSING",
      path.relative(root, localStoragePath),
      "Local storage module is missing."
    );
  } else {
    result.includesPrivateMirrorRoot = localStorageSource.includes('".private-data"') || localStorageSource.includes("'.private-data'");
    result.includesPublicFallback = localStorageSource.includes('"public"') || localStorageSource.includes("'public'");

    const privateIndex = localStorageSource.indexOf('".private-data"') >= 0
      ? localStorageSource.indexOf('".private-data"')
      : localStorageSource.indexOf("'.private-data'");

    const publicIndex = localStorageSource.indexOf('"public"') >= 0
      ? localStorageSource.indexOf('"public"')
      : localStorageSource.indexOf("'public'");

    result.publicFallbackAfterPrivateMirror =
      privateIndex >= 0 &&
      publicIndex >= 0 &&
      privateIndex < publicIndex;

    if (!result.includesPrivateMirrorRoot) {
      addFinding(
        findings,
        "fail",
        "D-012",
        "LOCAL_STORAGE_PRIVATE_MIRROR_ROOT_MISSING",
        path.relative(root, localStoragePath),
        "Local storage resolution must include web-v1-app/.private-data/published/v1 for subscriber-bound artifacts."
      );
    }

    if (result.includesPublicFallback && !result.publicFallbackAfterPrivateMirror) {
      addFinding(
        findings,
        "fail",
        "D-012",
        "LOCAL_STORAGE_PUBLIC_FALLBACK_PRECEDES_PRIVATE_MIRROR",
        path.relative(root, localStoragePath),
        "If public static data is a fallback, it must come after .private-data so subscriber artifacts do not resolve from public before private."
      );
    }
  }

  for (const sampleStoragePath of localStorageSmokeSamples()) {
    result.samplesChecked += 1;

    const resolution = firstExistingCandidateForStoragePath(sampleStoragePath);
    const sourceEquivalent = path.join(publishedRoot, resolution.normalizedPath);
    const privateEquivalent = path.join(privateMirrorRoot, resolution.normalizedPath);

    const resolutionRow = {
      storagePath: sampleStoragePath,
      normalizedPath: resolution.normalizedPath,
      resolvedRoot: resolution.candidateRoot ? path.relative(root, resolution.candidateRoot) || "." : null,
      resolvedFile: resolution.absolutePath ? path.relative(root, resolution.absolutePath) : null,
    };

    result.sampleResolutions.push(resolutionRow);

    if (!resolution.absolutePath) {
      addFinding(
        findings,
        "fail",
        "D-012",
        "LOCAL_STORAGE_SAMPLE_DID_NOT_RESOLVE",
        sampleStoragePath,
        `No local candidate root resolved normalized path ${resolution.normalizedPath}.`
      );
      continue;
    }

    result.samplesResolved += 1;

    if (path.resolve(resolution.candidateRoot) === publicPublishedRoot) {
      result.samplesResolvedToPublic += 1;
      addFinding(
        findings,
        "fail",
        "D-012",
        "LOCAL_STORAGE_SAMPLE_RESOLVED_TO_PUBLIC",
        path.relative(root, resolution.absolutePath),
        "Subscriber-bound sample resolved from public static data instead of source/private storage."
      );
    }

    if (fs.existsSync(sourceEquivalent) && sha256File(resolution.absolutePath) !== sha256File(sourceEquivalent)) {
      addFinding(
        findings,
        "fail",
        "D-012",
        "LOCAL_STORAGE_SAMPLE_DIFFERS_FROM_SOURCE_PUBLISHED",
        path.relative(root, resolution.absolutePath),
        `Resolved file does not byte-match source published artifact ${path.relative(root, sourceEquivalent)}.`
      );
    }

    if (fs.existsSync(privateEquivalent) && sha256File(resolution.absolutePath) !== sha256File(privateEquivalent)) {
      addFinding(
        findings,
        "fail",
        "D-012",
        "LOCAL_STORAGE_SAMPLE_DIFFERS_FROM_PRIVATE_MIRROR",
        path.relative(root, resolution.absolutePath),
        `Resolved file does not byte-match private mirror artifact ${path.relative(root, privateEquivalent)}.`
      );
    }
  }

  return result;
}
function s3SmokeSamples() {
  return [
    "gold/bitcoin/latest.json",
    "gold/base/latest.json",
    "meta/bitcoin/last90d.json",
    "meta/arbitrum/last365d.json",
    "derived/ethereum/last30d.json",
    "derived/base/last7d.json",
  ];
}

function productionS3PrefixFromEnv() {
  const raw = process.env.S3_PREFIX ?? "published/v1";
  return raw.replace(/^\/+|\/+$/g, "");
}

function joinS3KeyForAudit(prefix, storagePath) {
  const cleanedPath = String(storagePath).replace(/^\/+/u, "");
  return prefix ? `${prefix}/${cleanedPath}` : cleanedPath;
}

function evaluateS3StorageContract(findings) {
  const result = {
    s3ModuleExists: fs.existsSync(s3StoragePath),
    hasDefaultPublishedV1Prefix: false,
    trimsS3Prefix: false,
    joinsPrefixAndCleanedPath: false,
    usesGetObjectCommand: false,
    returnsNullForMissingObjects: false,
    envPrefix: productionS3PrefixFromEnv(),
    sampleKeys: [],
  };

  if (!result.s3ModuleExists) {
    addFinding(
      findings,
      "fail",
      "D-013",
      "S3_STORAGE_MODULE_MISSING",
      path.relative(root, s3StoragePath),
      "S3 storage adapter is missing."
    );

    return result;
  }

  const source = fs.readFileSync(s3StoragePath, "utf8").replace(/^\uFEFF/u, "");

  result.hasDefaultPublishedV1Prefix = source.includes('process.env.S3_PREFIX ?? "published/v1"');
  result.trimsS3Prefix = source.includes('replace(/^\\/+|\\/+$/g, "")') || source.includes("replace(/^\\\\/+|\\\\/+$/g, \"\")");
  result.joinsPrefixAndCleanedPath = source.includes('return prefix ? `${prefix}/${cleanedPath}` : cleanedPath;');
  result.usesGetObjectCommand = source.includes("new GetObjectCommand(") && source.includes("Key: joinS3Key(storagePath)");
  result.returnsNullForMissingObjects =
    source.includes("NoSuchKey") &&
    source.includes("The specified key does not exist") &&
    source.includes("NotFound") &&
    source.includes("return null;");

  if (!result.hasDefaultPublishedV1Prefix) {
    addFinding(
      findings,
      "fail",
      "D-013",
      "S3_DEFAULT_PREFIX_NOT_PUBLISHED_V1",
      path.relative(root, s3StoragePath),
      "S3 storage adapter must default S3_PREFIX to published/v1 so production object keys match the published artifact tree."
    );
  }

  if (!result.trimsS3Prefix) {
    addFinding(
      findings,
      "fail",
      "D-013",
      "S3_PREFIX_TRIM_MISSING",
      path.relative(root, s3StoragePath),
      "S3 storage adapter must trim leading/trailing slashes from S3_PREFIX."
    );
  }

  if (!result.joinsPrefixAndCleanedPath) {
    addFinding(
      findings,
      "fail",
      "D-013",
      "S3_PREFIX_JOIN_CONTRACT_MISSING",
      path.relative(root, s3StoragePath),
      "S3 storage adapter must join prefix and normalized storage path as prefix/path."
    );
  }

  if (!result.usesGetObjectCommand) {
    addFinding(
      findings,
      "fail",
      "D-013",
      "S3_GET_OBJECT_KEY_CONTRACT_MISSING",
      path.relative(root, s3StoragePath),
      "S3 storage adapter must read objects using Key: joinS3Key(storagePath)."
    );
  }

  if (!result.returnsNullForMissingObjects) {
    addFinding(
      findings,
      "fail",
      "D-013",
      "S3_MISSING_OBJECT_NULL_CONTRACT_MISSING",
      path.relative(root, s3StoragePath),
      "S3 storage adapter must return null for missing objects so the API route can return a clean 404."
    );
  }

  for (const normalizedStoragePath of s3SmokeSamples()) {
    const sourceArtifact = path.join(publishedRoot, normalizedStoragePath);
    const privateArtifact = path.join(privateMirrorRoot, normalizedStoragePath);
    const s3Key = joinS3KeyForAudit(result.envPrefix, normalizedStoragePath);

    result.sampleKeys.push({
      normalizedStoragePath,
      s3Key,
      sourceArtifactExists: fs.existsSync(sourceArtifact),
      privateArtifactExists: fs.existsSync(privateArtifact),
    });

    if (!s3Key.startsWith("published/v1/")) {
      addFinding(
        findings,
        "warn",
        "D-013",
        "S3_SAMPLE_KEY_PREFIX_NONSTANDARD",
        s3Key,
        "Computed S3 key does not start with published/v1/. This is only acceptable if production S3_PREFIX intentionally differs from the default."
      );
    }

    if (!fs.existsSync(sourceArtifact)) {
      addFinding(
        findings,
        "fail",
        "D-013",
        "S3_SAMPLE_SOURCE_ARTIFACT_MISSING",
        path.relative(root, sourceArtifact),
        `Sample S3 key ${s3Key} has no matching source published artifact.`
      );
    }

    if (!fs.existsSync(privateArtifact)) {
      addFinding(
        findings,
        "fail",
        "D-013",
        "S3_SAMPLE_PRIVATE_ARTIFACT_MISSING",
        path.relative(root, privateArtifact),
        `Sample S3 key ${s3Key} has no matching private mirror artifact.`
      );
    }
  }

  return result;
}
function indexOfOrMinusOne(source, pattern) {
  return source.indexOf(pattern);
}

function firstIndexOfAny(source, patterns) {
  const found = patterns
    .map((pattern) => source.indexOf(pattern))
    .filter((index) => index >= 0);

  return found.length > 0 ? Math.min(...found) : -1;
}

function evaluatePipelinePublishOrderContract(findings) {
  const result = {
    runDailyPipelineExists: fs.existsSync(runDailyPipelinePath),
    githubPipelineWorkflowExists: fs.existsSync(githubPipelineWorkflowPath),

    runDaily: {
      publishCallIndex: -1,
      briefsBuilderIndex: -1,
      metaValidationIndex: -1,
      commitSnapshotIndex: -1,
      briefsBeforePublish: false,
      metaValidationBeforeCommit: false,
      publishBeforeCommit: false,
    },

    workflow: {
      runDailyPipelineIndex: -1,
      auditGatesIndex: -1,
      pushDataIndex: -1,
      vercelDeployIndex: -1,
      auditGatesPresent: false,
      auditGatesAfterPipeline: false,
      auditGatesBeforePush: false,
      auditGatesBeforeDeploy: false,
      usesGateRunner: false,
    },
  };

  if (!result.runDailyPipelineExists) {
    addFinding(
      findings,
      "fail",
      "D-014",
      "RUN_DAILY_PIPELINE_SCRIPT_MISSING",
      path.relative(root, runDailyPipelinePath),
      "run-daily-pipeline.ps1 is missing, so publish order cannot be audited."
    );
  } else {
    const source = fs.readFileSync(runDailyPipelinePath, "utf8").replace(/^\uFEFF/u, "");

    result.runDaily.publishCallIndex = indexOfOrMinusOne(source, 'Write-Log "STEP 3: Publish web data"');
    result.runDaily.briefsBuilderIndex = indexOfOrMinusOne(source, "Invoke-WebBriefsBuilderIfPresent -RepoRoot $RootDir");
    result.runDaily.metaValidationIndex = indexOfOrMinusOne(source, "Validate-WebPublishedMetaIfPresent -RepoRoot $RootDir");
    result.runDaily.commitSnapshotIndex = indexOfOrMinusOne(source, "Commit-PublishedSnapshotIfNeeded -RepoRoot $RootDir");

    result.runDaily.briefsBeforePublish =
      result.runDaily.briefsBuilderIndex >= 0 &&
      result.runDaily.publishCallIndex >= 0 &&
      result.runDaily.briefsBuilderIndex < result.runDaily.publishCallIndex;

    result.runDaily.metaValidationBeforeCommit =
      result.runDaily.metaValidationIndex >= 0 &&
      result.runDaily.commitSnapshotIndex >= 0 &&
      result.runDaily.metaValidationIndex < result.runDaily.commitSnapshotIndex;

    result.runDaily.publishBeforeCommit =
      result.runDaily.publishCallIndex >= 0 &&
      result.runDaily.commitSnapshotIndex >= 0 &&
      result.runDaily.publishCallIndex < result.runDaily.commitSnapshotIndex;

    if (result.runDaily.publishCallIndex < 0) {
      addFinding(
        findings,
        "fail",
        "D-014",
        "RUN_DAILY_PUBLISH_STEP_MISSING",
        path.relative(root, runDailyPipelinePath),
        "run-daily-pipeline.ps1 does not contain the expected publish-web-data step marker."
      );
    }

    if (result.runDaily.briefsBuilderIndex < 0) {
      addFinding(
        findings,
        "fail",
        "D-014",
        "RUN_DAILY_BRIEFS_BUILDER_CALL_MISSING",
        path.relative(root, runDailyPipelinePath),
        "run-daily-pipeline.ps1 does not call Invoke-WebBriefsBuilderIfPresent."
      );
    }

    if (!result.runDaily.briefsBeforePublish) {
      addFinding(
        findings,
        "fail",
        "D-014",
        "RUN_DAILY_BRIEFS_BUILT_AFTER_PRIVATE_SYNC",
        path.relative(root, runDailyPipelinePath),
        "Regime Briefs must be rebuilt before publish-web-data syncs data/published/v1 into web-v1-app/.private-data. Otherwise canonical briefs and private mirror briefs can diverge."
      );
    }

    if (result.runDaily.metaValidationIndex < 0) {
      addFinding(
        findings,
        "fail",
        "D-014",
        "RUN_DAILY_META_VALIDATION_CALL_MISSING",
        path.relative(root, runDailyPipelinePath),
        "run-daily-pipeline.ps1 does not call Validate-WebPublishedMetaIfPresent."
      );
    }

    if (result.runDaily.commitSnapshotIndex >= 0 && !result.runDaily.metaValidationBeforeCommit) {
      addFinding(
        findings,
        "fail",
        "D-014",
        "RUN_DAILY_VALIDATION_AFTER_COMMIT",
        path.relative(root, runDailyPipelinePath),
        "Canonical validation must happen before Commit-PublishedSnapshotIfNeeded."
      );
    }

    if (result.runDaily.commitSnapshotIndex >= 0 && !result.runDaily.publishBeforeCommit) {
      addFinding(
        findings,
        "fail",
        "D-014",
        "RUN_DAILY_COMMIT_BEFORE_PUBLISH",
        path.relative(root, runDailyPipelinePath),
        "Published snapshot commit must happen after publish-web-data has synced private data."
      );
    }
  }

  if (!result.githubPipelineWorkflowExists) {
    addFinding(
      findings,
      "fail",
      "D-014",
      "GITHUB_PIPELINE_WORKFLOW_MISSING",
      path.relative(root, githubPipelineWorkflowPath),
      ".github/workflows/pipeline.yml is missing, so CI publish gates cannot be audited."
    );
  } else {
    const source = fs.readFileSync(githubPipelineWorkflowPath, "utf8").replace(/^\uFEFF/u, "");

    result.workflow.runDailyPipelineIndex = firstIndexOfAny(source, [
      "run-daily-pipeline.ps1 -SkipPush",
      ".\\run-daily-pipeline.ps1 -SkipPush",
      "run-daily-pipeline.ps1",
    ]);

    result.workflow.auditGatesIndex = firstIndexOfAny(source, [
      "npm run check:audit-gates",
      "npm run check:audit-gates:no-build",
      "node scripts/run-audit-gates.mjs",
    ]);

    result.workflow.pushDataIndex = firstIndexOfAny(source, [
      "Push local published-data commit with remote sync",
      "git push origin HEAD:main",
      "git push",
    ]);

    result.workflow.vercelDeployIndex = firstIndexOfAny(source, [
      "Trigger Vercel production deployment",
      "VERCEL_DEPLOY_HOOK_URL",
    ]);

    result.workflow.auditGatesPresent = result.workflow.auditGatesIndex >= 0;
    result.workflow.usesGateRunner = source.includes("check:audit-gates") || source.includes("run-audit-gates.mjs");

    result.workflow.auditGatesAfterPipeline =
      result.workflow.auditGatesIndex >= 0 &&
      result.workflow.runDailyPipelineIndex >= 0 &&
      result.workflow.runDailyPipelineIndex < result.workflow.auditGatesIndex;

    result.workflow.auditGatesBeforePush =
      result.workflow.auditGatesIndex >= 0 &&
      result.workflow.pushDataIndex >= 0 &&
      result.workflow.auditGatesIndex < result.workflow.pushDataIndex;

    result.workflow.auditGatesBeforeDeploy =
      result.workflow.auditGatesIndex >= 0 &&
      result.workflow.vercelDeployIndex >= 0 &&
      result.workflow.auditGatesIndex < result.workflow.vercelDeployIndex;

    if (result.workflow.runDailyPipelineIndex < 0) {
      addFinding(
        findings,
        "fail",
        "D-014",
        "WORKFLOW_RUN_DAILY_PIPELINE_CALL_MISSING",
        path.relative(root, githubPipelineWorkflowPath),
        "pipeline.yml does not appear to call run-daily-pipeline.ps1."
      );
    }

    if (!result.workflow.auditGatesPresent) {
      addFinding(
        findings,
        "fail",
        "D-014",
        "WORKFLOW_AUDIT_GATES_MISSING",
        path.relative(root, githubPipelineWorkflowPath),
        "pipeline.yml must run npm run check:audit-gates or npm run check:audit-gates:no-build after pipeline generation and before push/deploy."
      );
    }

    if (result.workflow.auditGatesPresent && !result.workflow.auditGatesAfterPipeline) {
      addFinding(
        findings,
        "fail",
        "D-014",
        "WORKFLOW_AUDIT_GATES_BEFORE_PIPELINE_OUTPUT",
        path.relative(root, githubPipelineWorkflowPath),
        "Audit gates must run after run-daily-pipeline.ps1 has generated/synced outputs."
      );
    }

    if (result.workflow.auditGatesPresent && !result.workflow.auditGatesBeforePush) {
      addFinding(
        findings,
        "fail",
        "D-014",
        "WORKFLOW_AUDIT_GATES_AFTER_PUSH",
        path.relative(root, githubPipelineWorkflowPath),
        "Audit gates must run before the workflow pushes published-data commits."
      );
    }

    if (result.workflow.auditGatesPresent && !result.workflow.auditGatesBeforeDeploy) {
      addFinding(
        findings,
        "fail",
        "D-014",
        "WORKFLOW_AUDIT_GATES_AFTER_DEPLOY",
        path.relative(root, githubPipelineWorkflowPath),
        "Audit gates must run before triggering Vercel deployment."
      );
    }

    if (result.workflow.auditGatesPresent && !result.workflow.usesGateRunner) {
      addFinding(
        findings,
        "fail",
        "D-014",
        "WORKFLOW_DOES_NOT_USE_GATE_RUNNER",
        path.relative(root, githubPipelineWorkflowPath),
        "Workflow should use the central gate runner rather than a loose list of npm commands, so the job stops at the first red gate."
      );
    }
  }

  return result;
}
function isIsoTimestamp(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/u.test(value);
}

function timestampSkewSeconds(left, right) {
  if (!isIsoTimestamp(left) || !isIsoTimestamp(right)) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.abs((Date.parse(left) - Date.parse(right)) / 1000);
}
function expectedSchemaVersionForGenre(genre, dataset) {
  return dataset?.schema_versions?.[genre] ?? `${genre}.v1`;
}

function evaluateRevisionProvenanceContract(findings, inventory) {
  const datasetFile = path.join(publishedRoot, "dataset.json");
  const result = {
    datasetPresent: fs.existsSync(datasetFile),
    datasetId: null,
    revisionId: null,
    computedAtUtc: null,
    methodologyVersion: null,
    manifestsChecked: 0,
    manifestsWithMatchingDatasetId: 0,
    manifestsWithMatchingRevisionId: 0,
    manifestsWithMatchingComputedAtUtc: 0,
    manifestsWithinComputedAtSkew: 0,
    maxComputedAtSkewSeconds: 0,
    allowedComputedAtSkewSeconds: 300,
    manifestsWithMatchingMethodologyVersion: 0,
    manifestsWithMatchingSchemaVersion: 0,
    manifestsWithValidFilesBlock: 0,
  };

  if (!result.datasetPresent) {
    addFinding(
      findings,
      "fail",
      "D-015",
      "REVISION_DATASET_INDEX_MISSING",
      path.relative(root, datasetFile),
      "dataset.json is required for revision/provenance validation."
    );

    return result;
  }

  const dataset = readJson(datasetFile);

  result.datasetId = dataset.dataset_id ?? null;
  result.revisionId = dataset.revision_id ?? null;
  result.computedAtUtc = dataset.computed_at_utc ?? null;
  result.methodologyVersion = dataset.methodology_version ?? null;

  if (typeof dataset.dataset_id !== "string" || dataset.dataset_id.trim() === "") {
    addFinding(
      findings,
      "fail",
      "D-015",
      "DATASET_ID_MISSING",
      path.relative(root, datasetFile),
      "dataset.json must contain a non-empty dataset_id so published snapshots can be identified."
    );
  }

  if (!Number.isInteger(dataset.revision_id) || dataset.revision_id <= 0) {
    addFinding(
      findings,
      "fail",
      "D-015",
      "DATASET_REVISION_ID_MISSING_OR_INVALID",
      path.relative(root, datasetFile),
      "dataset.json must contain a positive integer revision_id."
    );
  }

  if (!isIsoTimestamp(dataset.computed_at_utc)) {
    addFinding(
      findings,
      "fail",
      "D-015",
      "DATASET_COMPUTED_AT_UTC_INVALID",
      path.relative(root, datasetFile),
      "dataset.computed_at_utc must be an ISO UTC timestamp in YYYY-MM-DDTHH:mm:ssZ format."
    );
  }

  if (typeof dataset.methodology_version !== "string" || dataset.methodology_version.trim() === "") {
    addFinding(
      findings,
      "fail",
      "D-015",
      "DATASET_METHODOLOGY_VERSION_MISSING",
      path.relative(root, datasetFile),
      "dataset.json must contain methodology_version."
    );
  }

  for (const genre of GENRES) {
    if (typeof dataset.schema_versions?.[genre] !== "string" || dataset.schema_versions[genre].trim() === "") {
      addFinding(
        findings,
        "fail",
        "D-015",
        "DATASET_SCHEMA_VERSION_MISSING",
        path.relative(root, datasetFile),
        `dataset.schema_versions.${genre} must be present.`
      );
    }
  }

  const derivedDefinition = dataset.derived_definition;

  if (!isPlainObject(derivedDefinition)) {
    addFinding(
      findings,
      "fail",
      "D-015",
      "DATASET_DERIVED_DEFINITION_MISSING",
      path.relative(root, datasetFile),
      "dataset.derived_definition must be present so rolling-derived semantics are versioned."
    );
  } else {
    if (derivedDefinition.method !== "rolling_mean") {
      addFinding(
        findings,
        "fail",
        "D-015",
        "DATASET_DERIVED_METHOD_UNEXPECTED",
        path.relative(root, datasetFile),
        `derived_definition.method must be rolling_mean, got ${derivedDefinition.method}.`
      );
    }

    if (derivedDefinition.min_periods !== 1) {
      addFinding(
        findings,
        "fail",
        "D-015",
        "DATASET_DERIVED_MIN_PERIODS_UNEXPECTED",
        path.relative(root, datasetFile),
        `derived_definition.min_periods must be 1, got ${derivedDefinition.min_periods}.`
      );
    }

    if (!arrayEquals(derivedDefinition.windows_days, [7, 30])) {
      addFinding(
        findings,
        "fail",
        "D-015",
        "DATASET_DERIVED_WINDOWS_UNEXPECTED",
        path.relative(root, datasetFile),
        "derived_definition.windows_days must be [7,30]."
      );
    }

    if (derivedDefinition.suffix_format !== "__ma{window}") {
      addFinding(
        findings,
        "fail",
        "D-015",
        "DATASET_DERIVED_SUFFIX_FORMAT_UNEXPECTED",
        path.relative(root, datasetFile),
        `derived_definition.suffix_format must be __ma{window}, got ${derivedDefinition.suffix_format}.`
      );
    }
  }

  for (const row of inventory) {
    const file = manifestPath(row.genre, row.chain);
    const relativeFile = path.relative(root, file);

    if (!fs.existsSync(file)) {
      continue;
    }

    const manifest = readJson(file);
    result.manifestsChecked += 1;

    if (manifest.dataset_id === dataset.dataset_id) {
      result.manifestsWithMatchingDatasetId += 1;
    } else {
      addFinding(
        findings,
        "fail",
        "D-015",
        "MANIFEST_DATASET_ID_MISMATCH",
        relativeFile,
        `${row.genre}/${row.chain}: manifest.dataset_id=${manifest.dataset_id}, dataset.dataset_id=${dataset.dataset_id}.`
      );
    }

    if (manifest.revision_id === dataset.revision_id) {
      result.manifestsWithMatchingRevisionId += 1;
    } else {
      addFinding(
        findings,
        "fail",
        "D-015",
        "MANIFEST_REVISION_ID_MISMATCH",
        relativeFile,
        `${row.genre}/${row.chain}: manifest.revision_id=${manifest.revision_id}, dataset.revision_id=${dataset.revision_id}.`
      );
    }

    const computedAtSkewSeconds = timestampSkewSeconds(manifest.computed_at_utc, dataset.computed_at_utc);
    result.maxComputedAtSkewSeconds = Math.max(result.maxComputedAtSkewSeconds, computedAtSkewSeconds);

    if (manifest.computed_at_utc === dataset.computed_at_utc) {
      result.manifestsWithMatchingComputedAtUtc += 1;
      result.manifestsWithinComputedAtSkew += 1;
    } else if (computedAtSkewSeconds <= result.allowedComputedAtSkewSeconds) {
      result.manifestsWithinComputedAtSkew += 1;
    } else {
      addFinding(
        findings,
        "fail",
        "D-015",
        "MANIFEST_COMPUTED_AT_UTC_SKEW_EXCEEDS_LIMIT",
        relativeFile,
        `${row.genre}/${row.chain}: manifest.computed_at_utc=${manifest.computed_at_utc}, dataset.computed_at_utc=${dataset.computed_at_utc}, skew_seconds=${computedAtSkewSeconds}, allowed_seconds=${result.allowedComputedAtSkewSeconds}.`
      );
    }

    if (manifest.methodology_version === dataset.methodology_version) {
      result.manifestsWithMatchingMethodologyVersion += 1;
    } else {
      addFinding(
        findings,
        "fail",
        "D-015",
        "MANIFEST_METHODOLOGY_VERSION_MISMATCH",
        relativeFile,
        `${row.genre}/${row.chain}: manifest.methodology_version=${manifest.methodology_version}, dataset.methodology_version=${dataset.methodology_version}.`
      );
    }

    const expectedSchema = expectedSchemaVersionForGenre(row.genre, dataset);
    if (manifest.schema_version === expectedSchema) {
      result.manifestsWithMatchingSchemaVersion += 1;
    } else {
      addFinding(
        findings,
        "fail",
        "D-015",
        "MANIFEST_SCHEMA_VERSION_MISMATCH",
        relativeFile,
        `${row.genre}/${row.chain}: manifest.schema_version=${manifest.schema_version}, expected ${expectedSchema}.`
      );
    }

    if (manifest.chain !== row.chain) {
      addFinding(
        findings,
        "fail",
        "D-015",
        "MANIFEST_CHAIN_MISMATCH",
        relativeFile,
        `${row.genre}/${row.chain}: manifest.chain=${manifest.chain}, expected ${row.chain}.`
      );
    }

    if (manifest.genre !== row.genre) {
      addFinding(
        findings,
        "fail",
        "D-015",
        "MANIFEST_GENRE_MISMATCH",
        relativeFile,
        `${row.genre}/${row.chain}: manifest.genre=${manifest.genre}, expected ${row.genre}.`
      );
    }

    if (manifest.available_days_count !== row.days.length) {
      addFinding(
        findings,
        "fail",
        "D-015",
        "MANIFEST_AVAILABLE_DAYS_COUNT_MISMATCH",
        relativeFile,
        `${row.genre}/${row.chain}: available_days_count=${manifest.available_days_count}, actual day count=${row.days.length}.`
      );
    }

    const windows = manifest.files?.windows;
    const hasValidFilesBlock =
      manifest.files?.latest === "latest.json" &&
      isPlainObject(windows) &&
      WINDOWS.every((windowDays) => windows[String(windowDays)] === `last${windowDays}d.json`);

    if (hasValidFilesBlock) {
      result.manifestsWithValidFilesBlock += 1;
    } else {
      addFinding(
        findings,
        "fail",
        "D-015",
        "MANIFEST_FILES_BLOCK_INVALID",
        relativeFile,
        `${row.genre}/${row.chain}: manifest.files must map latest to latest.json and all supported windows to lastXd.json.`
      );
    }
  }

  return result;
}
function setDifference(left, right) {
  const rightSet = new Set(right);
  return left.filter((value) => !rightSet.has(value));
}

function inventoryAsofForRow(row) {
  if (!row) {
    return null;
  }

  if (typeof row.asof === "string" && row.asof.trim() !== "") {
    return row.asof;
  }

  if (typeof row.latestDay === "string" && row.latestDay.trim() !== "") {
    return row.latestDay;
  }

  if (Array.isArray(row.days) && row.days.length > 0) {
    return [...row.days].sort().at(-1) ?? null;
  }

  return null;
}
function evaluateHistoricalDerivedCoverageContract(findings, inventory) {
  const datasetFile = path.join(publishedRoot, "dataset.json");
  const dataset = fs.existsSync(datasetFile) ? readJson(datasetFile) : null;

  const result = {
    chainsChecked: 0,
    chainsWithMatchingGoldDerivedDays: 0,
    chainsWithMatchingGoldDerivedAsof: 0,
    chainsWithMatchingDatasetAsof: 0,
    rows: [],
  };

  for (const chain of CHAINS) {
    const goldRow = inventory.find((row) => row.genre === "gold" && row.chain === chain);
    const derivedRow = inventory.find((row) => row.genre === "derived" && row.chain === chain);

    result.chainsChecked += 1;

    const rowResult = {
      chain,
      goldDays: goldRow?.days?.length ?? 0,
      derivedDays: derivedRow?.days?.length ?? 0,
      goldAsof: inventoryAsofForRow(goldRow),
      derivedAsof: inventoryAsofForRow(derivedRow),
      missingDerivedDays: [],
      extraDerivedDays: [],
      manifestDaysMatch: false,
      manifestAsofMatch: false,
      datasetAsofMatch: false,
    };

    result.rows.push(rowResult);

    if (!goldRow) {
      addFinding(
        findings,
        "fail",
        "D-016",
        "HISTORICAL_GOLD_INVENTORY_MISSING",
        `gold/${chain}`,
        `Missing GOLD inventory row for ${chain}.`
      );
      continue;
    }

    if (!derivedRow) {
      addFinding(
        findings,
        "fail",
        "D-016",
        "HISTORICAL_DERIVED_INVENTORY_MISSING",
        `derived/${chain}`,
        `Missing DERIVED inventory row for ${chain}.`
      );
      continue;
    }

    rowResult.missingDerivedDays = setDifference(goldRow.days, derivedRow.days);
    rowResult.extraDerivedDays = setDifference(derivedRow.days, goldRow.days);

    if (rowResult.missingDerivedDays.length === 0 && rowResult.extraDerivedDays.length === 0) {
      result.chainsWithMatchingGoldDerivedDays += 1;
    } else {
      addFinding(
        findings,
        "fail",
        "D-016",
        "DERIVED_HISTORY_DATES_DO_NOT_MATCH_GOLD",
        path.relative(root, path.join(publishedRoot, "derived", chain)),
        `${chain}: derived day-files must cover exactly the same dates as gold. Missing derived days: ${rowResult.missingDerivedDays.slice(0, 10).join(", ") || "none"}${rowResult.missingDerivedDays.length > 10 ? " ..." : ""}. Extra derived days: ${rowResult.extraDerivedDays.slice(0, 10).join(", ") || "none"}${rowResult.extraDerivedDays.length > 10 ? " ..." : ""}.`
      );
    }

    if (rowResult.goldAsof === rowResult.derivedAsof) {
      result.chainsWithMatchingGoldDerivedAsof += 1;
    } else {
      addFinding(
        findings,
        "fail",
        "D-016",
        "DERIVED_ASOF_DOES_NOT_MATCH_GOLD",
        path.relative(root, path.join(publishedRoot, "derived", chain, "manifest.json")),
        `${chain}: derived asof ${rowResult.derivedAsof} must match gold asof ${rowResult.goldAsof}.`
      );
    }

    const goldManifestFile = manifestPath("gold", chain);
    const derivedManifestFile = manifestPath("derived", chain);

    if (fs.existsSync(goldManifestFile) && fs.existsSync(derivedManifestFile)) {
      const goldManifest = readJson(goldManifestFile);
      const derivedManifest = readJson(derivedManifestFile);

      rowResult.manifestDaysMatch = arrayEquals(goldManifest.available_days, derivedManifest.available_days);
      rowResult.manifestAsofMatch = goldManifest.asof === derivedManifest.asof;

      if (!rowResult.manifestDaysMatch) {
        addFinding(
          findings,
          "fail",
          "D-016",
          "DERIVED_MANIFEST_AVAILABLE_DAYS_DO_NOT_MATCH_GOLD",
          path.relative(root, derivedManifestFile),
          `${chain}: derived manifest available_days must equal gold manifest available_days.`
        );
      }

      if (!rowResult.manifestAsofMatch) {
        addFinding(
          findings,
          "fail",
          "D-016",
          "DERIVED_MANIFEST_ASOF_DOES_NOT_MATCH_GOLD",
          path.relative(root, derivedManifestFile),
          `${chain}: derived manifest asof ${derivedManifest.asof} must match gold manifest asof ${goldManifest.asof}.`
        );
      }

      if (derivedManifest.available_days_count !== goldManifest.available_days_count) {
        addFinding(
          findings,
          "fail",
          "D-016",
          "DERIVED_MANIFEST_DAY_COUNT_DOES_NOT_MATCH_GOLD",
          path.relative(root, derivedManifestFile),
          `${chain}: derived manifest available_days_count ${derivedManifest.available_days_count} must match gold manifest available_days_count ${goldManifest.available_days_count}.`
        );
      }
    }

    const datasetGoldAsof = dataset?.asof_by_genre_chain?.gold?.[chain] ?? null;
    const datasetDerivedAsof = dataset?.asof_by_genre_chain?.derived?.[chain] ?? null;
    const datasetGoldCoverageAsof = dataset?.coverage?.[chain]?.gold?.asof ?? null;
    const datasetDerivedCoverageAsof = dataset?.coverage?.[chain]?.derived?.asof ?? null;

    rowResult.datasetAsofMatch =
      datasetGoldAsof === datasetDerivedAsof &&
      datasetGoldCoverageAsof === datasetDerivedCoverageAsof &&
      datasetGoldAsof === rowResult.goldAsof &&
      datasetDerivedAsof === rowResult.derivedAsof;

    if (rowResult.datasetAsofMatch) {
      result.chainsWithMatchingDatasetAsof += 1;
    } else {
      addFinding(
        findings,
        "fail",
        "D-016",
        "DATASET_GOLD_DERIVED_ASOF_MISMATCH",
        path.relative(root, datasetFile),
        `${chain}: dataset asof values must align with inventory. dataset gold=${datasetGoldAsof}, dataset derived=${datasetDerivedAsof}, dataset coverage gold=${datasetGoldCoverageAsof}, dataset coverage derived=${datasetDerivedCoverageAsof}, inventory gold=${rowResult.goldAsof}, inventory derived=${rowResult.derivedAsof}.`
      );
    }
  }

  return result;
}
function evaluateSnapshotMetadataHarmonizerContract(findings) {
  const result = {
    harmonizerExists: fs.existsSync(snapshotMetadataHarmonizerPath),
    runDailyExists: fs.existsSync(runDailyPipelinePath),
    harmonizerMentionsDatasetJson: false,
    harmonizerMentionsManifestJson: false,
    harmonizerWritesComputedAtUtc: false,
    harmonizerUsesUtf8NoBomJson: false,
    runDailyCallsHarmonizer: false,
    harmonizerAfterValidation: false,
    harmonizerBeforePublish: false,
    harmonizerBeforeCommit: false,
  };

  if (!result.harmonizerExists) {
    addFinding(
      findings,
      "fail",
      "D-017",
      "SNAPSHOT_METADATA_HARMONIZER_MISSING",
      path.relative(root, snapshotMetadataHarmonizerPath),
      "A permanent snapshot metadata harmonizer is required so dataset.json and manifests keep consistent computed_at_utc after all canonical artifacts are generated."
    );

    return result;
  }

  const harmonizerSource = fs.readFileSync(snapshotMetadataHarmonizerPath, "utf8").replace(/^\uFEFF/u, "");

  result.harmonizerMentionsDatasetJson = harmonizerSource.includes("dataset.json");
  result.harmonizerMentionsManifestJson = harmonizerSource.includes("manifest.json");
  result.harmonizerWritesComputedAtUtc = harmonizerSource.includes("computed_at_utc") && harmonizerSource.includes("Get-MaxSnapshotComputedAtUtc");
  result.harmonizerUsesUtf8NoBomJson = harmonizerSource.includes("Write-Utf8NoBomJson") && harmonizerSource.includes("ConvertTo-Json -Depth 100");

  if (!result.harmonizerMentionsDatasetJson) {
    addFinding(
      findings,
      "fail",
      "D-017",
      "SNAPSHOT_METADATA_HARMONIZER_DATASET_MISSING",
      path.relative(root, snapshotMetadataHarmonizerPath),
      "Snapshot metadata harmonizer must update dataset.json."
    );
  }

  if (!result.harmonizerMentionsManifestJson) {
    addFinding(
      findings,
      "fail",
      "D-017",
      "SNAPSHOT_METADATA_HARMONIZER_MANIFESTS_MISSING",
      path.relative(root, snapshotMetadataHarmonizerPath),
      "Snapshot metadata harmonizer must update genre/chain manifest.json files."
    );
  }

  if (!result.harmonizerWritesComputedAtUtc) {
    addFinding(
      findings,
      "fail",
      "D-017",
      "SNAPSHOT_METADATA_HARMONIZER_COMPUTED_AT_MISSING",
      path.relative(root, snapshotMetadataHarmonizerPath),
      "Snapshot metadata harmonizer must set computed_at_utc consistently across dataset.json and manifests."
    );
  }

  if (!result.harmonizerUsesUtf8NoBomJson) {
    addFinding(
      findings,
      "fail",
      "D-017",
      "SNAPSHOT_METADATA_HARMONIZER_UTF8_JSON_MISSING",
      path.relative(root, snapshotMetadataHarmonizerPath),
      "Snapshot metadata harmonizer must write JSON as UTF-8 without BOM using deep JSON serialization."
    );
  }

  if (!result.runDailyExists) {
    addFinding(
      findings,
      "fail",
      "D-017",
      "RUN_DAILY_PIPELINE_SCRIPT_MISSING_FOR_HARMONIZER",
      path.relative(root, runDailyPipelinePath),
      "run-daily-pipeline.ps1 is required to audit harmonizer call order."
    );

    return result;
  }

  const runDailySource = fs.readFileSync(runDailyPipelinePath, "utf8").replace(/^\uFEFF/u, "");

  const validationIndex = runDailySource.indexOf("Validate-WebPublishedMetaIfPresent -RepoRoot $RootDir");
  const harmonizerIndex = runDailySource.indexOf("Invoke-PublishedSnapshotMetadataHarmonizerIfPresent -RepoRoot $RootDir");
  const publishIndex = runDailySource.indexOf('Write-Log "STEP 3: Publish web data"');
  const commitIndex = runDailySource.indexOf("Commit-PublishedSnapshotIfNeeded -RepoRoot $RootDir");

  result.runDailyCallsHarmonizer = harmonizerIndex >= 0;
  result.harmonizerAfterValidation = validationIndex >= 0 && harmonizerIndex >= 0 && validationIndex < harmonizerIndex;
  result.harmonizerBeforePublish = harmonizerIndex >= 0 && publishIndex >= 0 && harmonizerIndex < publishIndex;
  result.harmonizerBeforeCommit = harmonizerIndex >= 0 && commitIndex >= 0 && harmonizerIndex < commitIndex;

  if (!result.runDailyCallsHarmonizer) {
    addFinding(
      findings,
      "fail",
      "D-017",
      "RUN_DAILY_HARMONIZER_CALL_MISSING",
      path.relative(root, runDailyPipelinePath),
      "run-daily-pipeline.ps1 must call Invoke-PublishedSnapshotMetadataHarmonizerIfPresent before publish-web-data syncs private data."
    );
  }

  if (!result.harmonizerAfterValidation) {
    addFinding(
      findings,
      "fail",
      "D-017",
      "RUN_DAILY_HARMONIZER_NOT_AFTER_VALIDATION",
      path.relative(root, runDailyPipelinePath),
      "Snapshot metadata harmonizer should run after canonical META validation."
    );
  }

  if (!result.harmonizerBeforePublish) {
    addFinding(
      findings,
      "fail",
      "D-017",
      "RUN_DAILY_HARMONIZER_NOT_BEFORE_PUBLISH_SYNC",
      path.relative(root, runDailyPipelinePath),
      "Snapshot metadata harmonizer must run before publish-web-data syncs data/published/v1 into .private-data."
    );
  }

  if (!result.harmonizerBeforeCommit) {
    addFinding(
      findings,
      "fail",
      "D-017",
      "RUN_DAILY_HARMONIZER_NOT_BEFORE_COMMIT",
      path.relative(root, runDailyPipelinePath),
      "Snapshot metadata harmonizer must run before published snapshot commits are created."
    );
  }

  return result;
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
  const privateMirrorAudit = evaluatePrivateMirrorConsistency(findings);
  const publicExposureAudit = evaluatePublicExposureBoundary(findings);
  const fileApiRouteContract = evaluateFileApiRouteContract(findings);
  const jsonEncodingAudit = evaluateJsonEncodingAndParse(findings);
  const fileApiArtifactMapping = evaluateFileApiArtifactMapping(findings);
  const localStorageResolution = evaluateLocalStorageResolution(findings);
  const s3StorageContract = evaluateS3StorageContract(findings);
  const pipelinePublishOrderContract = evaluatePipelinePublishOrderContract(findings);
  const revisionProvenanceContract = evaluateRevisionProvenanceContract(findings, inventory);
  const historicalDerivedCoverageContract = evaluateHistoricalDerivedCoverageContract(findings, inventory);
  const snapshotMetadataHarmonizerContract = evaluateSnapshotMetadataHarmonizerContract(findings);

  return {
    generatedAtUtc: new Date().toISOString(),
    result: findings.some((finding) => finding.severity === "fail") ? "FAIL" : "PASS",
    publishedRoot: path.relative(root, publishedRoot) || ".",
    searchedPublishedRoots: candidatePublishedRoots().map((candidate) => path.relative(root, candidate) || "."),
    datasetPresent: !!dataset,
    inventory,
    derivedLineage,
    privateMirrorAudit,
    publicExposureAudit,
    fileApiRouteContract,
    jsonEncodingAudit,
    fileApiArtifactMapping,
    localStorageResolution,
    s3StorageContract,
    pipelinePublishOrderContract,
    revisionProvenanceContract,
    historicalDerivedCoverageContract,
    snapshotMetadataHarmonizerContract,
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
  lines.push("");
  lines.push("## Private mirror consistency");
  lines.push("");
  lines.push(`Source published files: ${result.privateMirrorAudit.sourceFiles}`);
  lines.push(`Private mirror files: ${result.privateMirrorAudit.mirrorFiles}`);
  lines.push(`Compared files: ${result.privateMirrorAudit.compared}`);
  lines.push(`Missing in mirror: ${result.privateMirrorAudit.missing}`);
  lines.push(`Mismatched mirror files: ${result.privateMirrorAudit.mismatched}`);
  lines.push(`Extra mirror files: ${result.privateMirrorAudit.extra}`);
  lines.push("");

  lines.push("## Public exposure boundary");
  lines.push("");
  lines.push(`Public published root exists: ${result.publicExposureAudit.publicRootExists}`);
  lines.push(`Checked subscriber-bound public directories: ${result.publicExposureAudit.checkedDirectories}`);
  lines.push(`Forbidden public files: ${result.publicExposureAudit.forbiddenFiles}`);
  lines.push("");

  lines.push("## File API route contract");
  lines.push("");
  lines.push(`Route exists: ${result.fileApiRouteContract.routeExists}`);
  lines.push(`Storage prefix under data/published/v1: ${result.fileApiRouteContract.hasPrivateStoragePathPrefix}`);
  lines.push(`Entitlement evaluation present: ${result.fileApiRouteContract.hasEntitlementEvaluation}`);
  lines.push(`Storage read present: ${result.fileApiRouteContract.readsStorageObject}`);
  lines.push(`Entitlement before storage read: ${result.fileApiRouteContract.entitlementBeforeStorageRead}`);
  lines.push(`Private no-store cache header: ${result.fileApiRouteContract.hasPrivateNoStoreCache}`);
  lines.push(`Request id header: ${result.fileApiRouteContract.hasRequestIdHeader}`);
  lines.push("");

  lines.push("## Snapshot metadata harmonizer contract");
  lines.push("");
  lines.push(`Harmonizer exists: ${result.snapshotMetadataHarmonizerContract.harmonizerExists}`);
  lines.push(`run-daily-pipeline.ps1 exists: ${result.snapshotMetadataHarmonizerContract.runDailyExists}`);
  lines.push(`Updates dataset.json: ${result.snapshotMetadataHarmonizerContract.harmonizerMentionsDatasetJson}`);
  lines.push(`Updates manifest.json files: ${result.snapshotMetadataHarmonizerContract.harmonizerMentionsManifestJson}`);
  lines.push(`Writes computed_at_utc: ${result.snapshotMetadataHarmonizerContract.harmonizerWritesComputedAtUtc}`);
  lines.push(`Writes UTF-8 no-BOM JSON: ${result.snapshotMetadataHarmonizerContract.harmonizerUsesUtf8NoBomJson}`);
  lines.push(`run-daily calls harmonizer: ${result.snapshotMetadataHarmonizerContract.runDailyCallsHarmonizer}`);
  lines.push(`Harmonizer after validation: ${result.snapshotMetadataHarmonizerContract.harmonizerAfterValidation}`);
  lines.push(`Harmonizer before publish sync: ${result.snapshotMetadataHarmonizerContract.harmonizerBeforePublish}`);
  lines.push(`Harmonizer before commit: ${result.snapshotMetadataHarmonizerContract.harmonizerBeforeCommit}`);
  lines.push("");
  lines.push("## Historical derived coverage contract");
  lines.push("");
  lines.push(`Chains checked: ${result.historicalDerivedCoverageContract.chainsChecked}`);
  lines.push(`Chains with matching gold/derived day dates: ${result.historicalDerivedCoverageContract.chainsWithMatchingGoldDerivedDays}`);
  lines.push(`Chains with matching gold/derived asof: ${result.historicalDerivedCoverageContract.chainsWithMatchingGoldDerivedAsof}`);
  lines.push(`Chains with matching dataset asof: ${result.historicalDerivedCoverageContract.chainsWithMatchingDatasetAsof}`);
  lines.push("");
  lines.push(tableRow(["Chain", "Gold days", "Derived days", "Gold asof", "Derived asof", "Missing derived", "Extra derived"]));
  lines.push(tableRow(["---", "---", "---", "---", "---", "---", "---"]));
  for (const row of result.historicalDerivedCoverageContract.rows) {
    lines.push(tableRow([
      row.chain,
      row.goldDays,
      row.derivedDays,
      row.goldAsof ?? "n/a",
      row.derivedAsof ?? "n/a",
      row.missingDerivedDays.length,
      row.extraDerivedDays.length,
    ]));
  }
  lines.push("");
  lines.push("## Revision provenance contract");
  lines.push("");
  lines.push(`Dataset present: ${result.revisionProvenanceContract.datasetPresent}`);
  lines.push(`Dataset ID: ${result.revisionProvenanceContract.datasetId ?? "n/a"}`);
  lines.push(`Revision ID: ${result.revisionProvenanceContract.revisionId ?? "n/a"}`);
  lines.push(`Computed at UTC: ${result.revisionProvenanceContract.computedAtUtc ?? "n/a"}`);
  lines.push(`Methodology version: ${result.revisionProvenanceContract.methodologyVersion ?? "n/a"}`);
  lines.push(`Manifests checked: ${result.revisionProvenanceContract.manifestsChecked}`);
  lines.push(`Manifests matching dataset_id: ${result.revisionProvenanceContract.manifestsWithMatchingDatasetId}`);
  lines.push(`Manifests matching revision_id: ${result.revisionProvenanceContract.manifestsWithMatchingRevisionId}`);
  lines.push(`Manifests matching computed_at_utc exactly: ${result.revisionProvenanceContract.manifestsWithMatchingComputedAtUtc}`);
  lines.push(`Manifests within computed_at_utc skew: ${result.revisionProvenanceContract.manifestsWithinComputedAtSkew}`);
  lines.push(`Max computed_at_utc skew seconds: ${result.revisionProvenanceContract.maxComputedAtSkewSeconds}`);
  lines.push(`Allowed computed_at_utc skew seconds: ${result.revisionProvenanceContract.allowedComputedAtSkewSeconds}`);
  lines.push(`Manifests matching methodology_version: ${result.revisionProvenanceContract.manifestsWithMatchingMethodologyVersion}`);
  lines.push(`Manifests matching schema_version: ${result.revisionProvenanceContract.manifestsWithMatchingSchemaVersion}`);
  lines.push(`Manifests with valid files block: ${result.revisionProvenanceContract.manifestsWithValidFilesBlock}`);
  lines.push("");
  lines.push("## Pipeline publish order contract");
  lines.push("");
  lines.push(`run-daily-pipeline.ps1 exists: ${result.pipelinePublishOrderContract.runDailyPipelineExists}`);
  lines.push(`pipeline.yml exists: ${result.pipelinePublishOrderContract.githubPipelineWorkflowExists}`);
  lines.push("");
  lines.push("### run-daily-pipeline.ps1 order");
  lines.push("");
  lines.push(`Publish step index: ${result.pipelinePublishOrderContract.runDaily.publishCallIndex}`);
  lines.push(`Briefs builder index: ${result.pipelinePublishOrderContract.runDaily.briefsBuilderIndex}`);
  lines.push(`META validation index: ${result.pipelinePublishOrderContract.runDaily.metaValidationIndex}`);
  lines.push(`Commit snapshot index: ${result.pipelinePublishOrderContract.runDaily.commitSnapshotIndex}`);
  lines.push(`Briefs before private sync/publish: ${result.pipelinePublishOrderContract.runDaily.briefsBeforePublish}`);
  lines.push(`META validation before commit: ${result.pipelinePublishOrderContract.runDaily.metaValidationBeforeCommit}`);
  lines.push(`Publish before commit: ${result.pipelinePublishOrderContract.runDaily.publishBeforeCommit}`);
  lines.push("");
  lines.push("### GitHub Actions pipeline.yml order");
  lines.push("");
  lines.push(`run-daily-pipeline index: ${result.pipelinePublishOrderContract.workflow.runDailyPipelineIndex}`);
  lines.push(`audit-gates index: ${result.pipelinePublishOrderContract.workflow.auditGatesIndex}`);
  lines.push(`push-data index: ${result.pipelinePublishOrderContract.workflow.pushDataIndex}`);
  lines.push(`Vercel deploy index: ${result.pipelinePublishOrderContract.workflow.vercelDeployIndex}`);
  lines.push(`Audit gates present: ${result.pipelinePublishOrderContract.workflow.auditGatesPresent}`);
  lines.push(`Audit gates after pipeline: ${result.pipelinePublishOrderContract.workflow.auditGatesAfterPipeline}`);
  lines.push(`Audit gates before push: ${result.pipelinePublishOrderContract.workflow.auditGatesBeforePush}`);
  lines.push(`Audit gates before deploy: ${result.pipelinePublishOrderContract.workflow.auditGatesBeforeDeploy}`);
  lines.push(`Uses central gate runner: ${result.pipelinePublishOrderContract.workflow.usesGateRunner}`);
  lines.push("");
  lines.push("## S3 storage contract");
  lines.push("");
  lines.push(`S3 module exists: ${result.s3StorageContract.s3ModuleExists}`);
  lines.push(`Default S3 prefix is published/v1: ${result.s3StorageContract.hasDefaultPublishedV1Prefix}`);
  lines.push(`Trims S3 prefix slashes: ${result.s3StorageContract.trimsS3Prefix}`);
  lines.push(`Joins prefix and cleaned path: ${result.s3StorageContract.joinsPrefixAndCleanedPath}`);
  lines.push(`Uses GetObjectCommand key contract: ${result.s3StorageContract.usesGetObjectCommand}`);
  lines.push(`Returns null for missing objects: ${result.s3StorageContract.returnsNullForMissingObjects}`);
  lines.push(`Effective audit S3 prefix: ${result.s3StorageContract.envPrefix}`);
  lines.push("");
  lines.push(tableRow(["Normalized storage path", "Computed S3 key", "Source exists", "Private exists"]));
  lines.push(tableRow(["---", "---", "---", "---"]));
  for (const row of result.s3StorageContract.sampleKeys) {
    lines.push(tableRow([row.normalizedStoragePath, row.s3Key, row.sourceArtifactExists, row.privateArtifactExists]));
  }
  lines.push("");
  lines.push("## Local storage resolution");
  lines.push("");
  lines.push(`Storage index exists: ${result.localStorageResolution.storageIndexExists}`);
  lines.push(`Local storage module exists: ${result.localStorageResolution.localStorageExists}`);
  lines.push(`Strips data/published/v1 prefix: ${result.localStorageResolution.stripsPublishedPrefix}`);
  lines.push(`Includes private mirror root: ${result.localStorageResolution.includesPrivateMirrorRoot}`);
  lines.push(`Includes public fallback: ${result.localStorageResolution.includesPublicFallback}`);
  lines.push(`Public fallback after private mirror: ${result.localStorageResolution.publicFallbackAfterPrivateMirror}`);
  lines.push(`Sample storage paths checked: ${result.localStorageResolution.samplesChecked}`);
  lines.push(`Sample storage paths resolved: ${result.localStorageResolution.samplesResolved}`);
  lines.push(`Sample storage paths resolved to public: ${result.localStorageResolution.samplesResolvedToPublic}`);
  lines.push("");
  lines.push(tableRow(["Storage path", "Normalized path", "Resolved root", "Resolved file"]));
  lines.push(tableRow(["---", "---", "---", "---"]));
  for (const row of result.localStorageResolution.sampleResolutions) {
    lines.push(tableRow([row.storagePath, row.normalizedPath, row.resolvedRoot ?? "n/a", row.resolvedFile ?? "n/a"]));
  }
  lines.push("");
  lines.push("## File API artifact mapping");
  lines.push("");
  lines.push(`Documented file API patterns: ${result.fileApiArtifactMapping.documentedPatterns.join(", ") || "none"}`);
  lines.push(`Sampled API file paths: ${result.fileApiArtifactMapping.sampledPaths}`);
  lines.push(`Mapped artifact checks: ${result.fileApiArtifactMapping.checked}`);
  lines.push(`Missing expected artifacts: ${result.fileApiArtifactMapping.missingExpectedArtifacts}`);
  lines.push(`Impossible mappings: ${result.fileApiArtifactMapping.impossibleMappings}`);
  lines.push(`Route uses raw request segments as storage path: ${result.fileApiArtifactMapping.routeUsesRawSegmentsAsStoragePath}`);
  lines.push("");
  lines.push("## JSON and encoding integrity");
  lines.push("");
  lines.push(`Parsed JSON files: ${result.jsonEncodingAudit.parsedJsonFiles}`);
  lines.push(`JSON files with UTF-8 BOM: ${result.jsonEncodingAudit.jsonFilesWithBom}`);
  lines.push(`Invalid JSON files: ${result.jsonEncodingAudit.invalidJsonFiles}`);
  lines.push(`Protected text files with UTF-8 BOM: ${result.jsonEncodingAudit.textFilesWithBom}`);
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
  lines.push("- D-017 Snapshot Metadata Harmonizer Contract: verifies the pipeline permanently harmonizes dataset/manifests computed_at_utc before private sync and commit.");
  lines.push("- D-016 Historical Derived Coverage Contract: verifies derived day-files/manifests/dataset asof align exactly with gold per chain.");
  lines.push("- D-015 Revision Provenance Contract: checks dataset/manifests share dataset_id, revision_id, bounded computed_at_utc skew, methodology_version, schema versions, and files/window mappings.");
  lines.push("- D-014 Pipeline Publish Order Contract: checks publish/brief/sync/commit order and requires CI audit gates before push/deploy.");
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