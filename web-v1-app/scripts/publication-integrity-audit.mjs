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