#!/usr/bin/env node
/*START FILE*/
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const repoRoot = path.resolve(path.join(root, ".."));
const prismaSchemaPath = path.join(root, "prisma", "schema.prisma");
const apiKeysPath = path.join(root, "src", "lib", "auth", "apiKeys.ts");
const validateTokenPath = path.join(root, "src", "lib", "auth", "validateToken.ts");
const rateLimitPath = path.join(root, "src", "lib", "auth", "rateLimit.ts");
const entitlementsPath = path.join(root, "src", "lib", "auth", "entitlements.ts");
const webPublicPublishedRoot = path.join(root, "public", "data", "published", "v1");

const CHAINS = ["bitcoin", "ethereum", "arbitrum", "base"];
const GENRES = ["gold", "meta", "derived"];
const WINDOWS = [7, 30, 90, 180, 365];

const reportDir = path.join(root, ".audit", "publication-integrity");
const reportJsonPath = path.join(reportDir, "publication-integrity.json");
const reportMarkdownPath = path.join(reportDir, "publication-integrity.md");
const gitignorePath = path.join(repoRoot, ".gitignore");

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
const publishWebDataPath = path.join(root, "..", "publish-web-data.ps1");
const syncPublishedDataPath = path.join(root, "..", "sync-published-data.ps1");
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
function gitOutput(args) {
  const result = spawnSync("git", args, {
    cwd: repoRoot,
    encoding: "utf8",
    shell: process.platform === "win32",
  });

  if (result.error) {
    return {
      ok: false,
      stdout: "",
      stderr: result.error.message,
      status: 1,
    };
  }

  return {
    ok: result.status === 0,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    status: result.status ?? 0,
  };
}

function normalizeGitPath(value) {
  return String(value).replace(/\\/gu, "/");
}

function gitTrackedFiles() {
  const result = gitOutput(["ls-files"]);

  if (!result.ok) {
    return null;
  }

  return result.stdout
    .split(/\r?\n/u)
    .map((line) => normalizeGitPath(line.trim()))
    .filter(Boolean);
}

function evaluateRepoHygieneContract(findings) {
  const result = {
    gitignoreExists: fs.existsSync(gitignorePath),
    requiredIgnorePatternsPresent: 0,
    requiredAllowPatternsPresent: 0,
    trackedForbiddenArtifacts: [],
    trackedRequiredPermanentScripts: [],
    requiredPermanentScriptsMissing: [],
  };

  const requiredIgnorePatterns = [
    ".audit/",
    "audit/",
    "web-v1-app/.audit/",
    "web-v1-app/audit/",
    "patch-*.ps1",
    "repair-*.ps1",
    "audit-code.patch",
  ];

  const requiredAllowPatterns = [
    "!run-daily-pipeline.ps1",
    "!publish-web-data.ps1",
    "!sync-published-data.ps1",
    "!harmonize-published-snapshot-metadata.ps1",
  ];

  if (!result.gitignoreExists) {
    addFinding(
      findings,
      "fail",
      "D-018",
      "GITIGNORE_MISSING",
      path.relative(root, gitignorePath),
      ".gitignore is required to keep audit reports and patch scratch out of commits."
    );
  } else {
    const gitignore = fs.readFileSync(gitignorePath, "utf8").replace(/^\uFEFF/u, "");
    const gitignoreLines = new Set(
      gitignore
        .split(/\r?\n/u)
        .map((line) => line.trim())
        .filter(Boolean)
    );

    for (const pattern of requiredIgnorePatterns) {
      if (gitignoreLines.has(pattern)) {
        result.requiredIgnorePatternsPresent += 1;
      } else {
        addFinding(
          findings,
          "fail",
          "D-018",
          "GITIGNORE_REQUIRED_IGNORE_PATTERN_MISSING",
          path.relative(root, gitignorePath),
          `Missing required ignore pattern: ${pattern}`
        );
      }
    }

    for (const pattern of requiredAllowPatterns) {
      if (gitignoreLines.has(pattern)) {
        result.requiredAllowPatternsPresent += 1;
      } else {
        addFinding(
          findings,
          "fail",
          "D-018",
          "GITIGNORE_REQUIRED_ALLOW_PATTERN_MISSING",
          path.relative(root, gitignorePath),
          `Missing required allow-list pattern for permanent script: ${pattern}`
        );
      }
    }
  }

  const tracked = gitTrackedFiles();

  if (!tracked) {
    addFinding(
      findings,
      "warn",
      "D-018",
      "GIT_LS_FILES_UNAVAILABLE",
      path.relative(root, gitignorePath),
      "Could not run git ls-files; tracked artifact hygiene could not be checked."
    );

    return result;
  }

  const forbiddenTrackedPatterns = [
    /^web-v1-app\/\.audit\//u,
    /^web-v1-app\/audit\//u,
    /^\.audit\//u,
    /^audit\//u,
    /^patch-.*\.ps1$/u,
    /^repair-.*\.ps1$/u,
    /^audit-code\.patch$/u,
  ];

  result.trackedForbiddenArtifacts = tracked.filter((file) =>
    forbiddenTrackedPatterns.some((pattern) => pattern.test(file))
  );

  if (result.trackedForbiddenArtifacts.length > 0) {
    for (const file of result.trackedForbiddenArtifacts.slice(0, 50)) {
      addFinding(
        findings,
        "fail",
        "D-018",
        "FORBIDDEN_AUDIT_OR_PATCH_ARTIFACT_TRACKED",
        file,
        "Audit reports and local patch/repair scratch must not be tracked in git."
      );
    }

    if (result.trackedForbiddenArtifacts.length > 50) {
      addFinding(
        findings,
        "fail",
        "D-018",
        "FORBIDDEN_AUDIT_OR_PATCH_ARTIFACT_TRACKED_CAPPED",
        "git ls-files",
        `${result.trackedForbiddenArtifacts.length} forbidden tracked files found; terminal/report findings capped.`
      );
    }
  }

  const requiredPermanentScripts = [
    "run-daily-pipeline.ps1",
    "publish-web-data.ps1",
    "sync-published-data.ps1",
    "harmonize-published-snapshot-metadata.ps1",
  ];

  for (const scriptPath of requiredPermanentScripts) {
    if (tracked.includes(scriptPath)) {
      result.trackedRequiredPermanentScripts.push(scriptPath);
    } else {
      result.requiredPermanentScriptsMissing.push(scriptPath);
      addFinding(
        findings,
        "fail",
        "D-018",
        "REQUIRED_PERMANENT_SCRIPT_NOT_TRACKED",
        scriptPath,
        "This permanent pipeline script must be tracked. If it is ignored by *.ps1, use git add -f after verifying it is not a local patch script."
      );
    }
  }

  return result;
}
function evaluatePublishScriptGateContract(findings) {
  const result = {
    publishScriptExists: fs.existsSync(publishWebDataPath),
    hasAuditGateCommand: false,
    hasNoBuildGateRunner: false,
    auditGateBeforeStaging: false,
    auditGateBeforeCommit: false,
    auditGateBeforePush: false,
    skipPushSkipsInternalGate: false,
  };

  if (!result.publishScriptExists) {
    addFinding(
      findings,
      "fail",
      "D-019",
      "PUBLISH_WEB_DATA_SCRIPT_MISSING",
      path.relative(root, publishWebDataPath),
      "publish-web-data.ps1 is missing, so the manual publish path cannot be audited."
    );

    return result;
  }

  const source = fs.readFileSync(publishWebDataPath, "utf8").replace(/^\uFEFF/u, "");

  const auditGateTextIndex = source.indexOf("check:audit-gates:no-build");
  const stagingIndex = source.indexOf('Write-Step "Staging sync script and published data"');
  const commitIndex = source.indexOf('Write-Step "Creating commit"');
  const pushIndex = source.indexOf('Write-Step "Pushing to origin/$Branch"');
  const skipPushSkipIndex = source.indexOf('Skipping audit gates inside publish-web-data because -SkipPush was provided');

  result.hasAuditGateCommand = auditGateTextIndex >= 0;
  result.hasNoBuildGateRunner = source.includes("check:audit-gates:no-build");
  result.auditGateBeforeStaging = auditGateTextIndex >= 0 && stagingIndex >= 0 && auditGateTextIndex < stagingIndex;
  result.auditGateBeforeCommit = auditGateTextIndex >= 0 && commitIndex >= 0 && auditGateTextIndex < commitIndex;
  result.auditGateBeforePush = auditGateTextIndex >= 0 && pushIndex >= 0 && auditGateTextIndex < pushIndex;
  result.skipPushSkipsInternalGate = skipPushSkipIndex >= 0 && source.includes("if (-not $SkipPush)");

  if (!result.hasAuditGateCommand) {
    addFinding(
      findings,
      "fail",
      "D-019",
      "PUBLISH_SCRIPT_AUDIT_GATES_MISSING",
      path.relative(root, publishWebDataPath),
      "publish-web-data.ps1 must run the central audit gate runner before it can commit or push."
    );
  }

  if (!result.hasNoBuildGateRunner) {
    addFinding(
      findings,
      "fail",
      "D-019",
      "PUBLISH_SCRIPT_NO_BUILD_GATE_RUNNER_MISSING",
      path.relative(root, publishWebDataPath),
      "publish-web-data.ps1 should use npm run check:audit-gates:no-build because build is handled separately in the script."
    );
  }

  if (!result.auditGateBeforeStaging) {
    addFinding(
      findings,
      "fail",
      "D-019",
      "PUBLISH_SCRIPT_AUDIT_GATES_AFTER_STAGING",
      path.relative(root, publishWebDataPath),
      "publish-web-data.ps1 must run audit gates before staging sync/published-data changes."
    );
  }

  if (!result.auditGateBeforeCommit) {
    addFinding(
      findings,
      "fail",
      "D-019",
      "PUBLISH_SCRIPT_AUDIT_GATES_AFTER_COMMIT",
      path.relative(root, publishWebDataPath),
      "publish-web-data.ps1 must run audit gates before creating a commit."
    );
  }

  if (!result.auditGateBeforePush) {
    addFinding(
      findings,
      "fail",
      "D-019",
      "PUBLISH_SCRIPT_AUDIT_GATES_AFTER_PUSH",
      path.relative(root, publishWebDataPath),
      "publish-web-data.ps1 must run audit gates before pushing to origin."
    );
  }

  if (!result.skipPushSkipsInternalGate) {
    addFinding(
      findings,
      "fail",
      "D-019",
      "PUBLISH_SCRIPT_SKIP_PUSH_GATE_BEHAVIOR_MISSING",
      path.relative(root, publishWebDataPath),
      "-SkipPush local sync mode should skip the internal publish-script gate and rely on the caller's subsequent gate-runner invocation."
    );
  }

  return result;
}
function evaluatePostRebaseWorkflowGateContract(findings) {
  const result = {
    workflowExists: fs.existsSync(githubPipelineWorkflowPath),
    hasRebase: false,
    hasPostRebaseGateMarker: false,
    hasNoBuildGateCommand: false,
    postRebaseGateAfterRebase: false,
    postRebaseGateBeforePush: false,
    postRebaseGateInsidePushLoop: false,
    postRebaseGateRefusesPushOnFailure: false,
  };

  if (!result.workflowExists) {
    addFinding(
      findings,
      "fail",
      "D-020",
      "WORKFLOW_MISSING_FOR_POST_REBASE_GATE",
      path.relative(root, githubPipelineWorkflowPath),
      ".github/workflows/pipeline.yml is missing, so post-rebase gate behavior cannot be audited."
    );

    return result;
  }

  const source = fs.readFileSync(githubPipelineWorkflowPath, "utf8").replace(/^\uFEFF/u, "");

  const rebaseIndex = source.indexOf("git pull --rebase origin main");
  const postRebaseGateIndex = source.indexOf("Re-running audit gates after rebase and before push");
  const noBuildGateIndex = source.indexOf("npm run check:audit-gates:no-build", postRebaseGateIndex >= 0 ? postRebaseGateIndex : 0);
  const pushIndex = source.indexOf("git push origin HEAD:main");
  const loopIndex = source.indexOf("for ($attempt = 1; $attempt -le $maxAttempts; $attempt++)");
  const failureMessageIndex = source.indexOf("Post-rebase audit gates failed; refusing to push.");

  result.hasRebase = rebaseIndex >= 0;
  result.hasPostRebaseGateMarker = postRebaseGateIndex >= 0;
  result.hasNoBuildGateCommand = noBuildGateIndex >= 0;
  result.postRebaseGateAfterRebase = rebaseIndex >= 0 && postRebaseGateIndex >= 0 && rebaseIndex < postRebaseGateIndex;
  result.postRebaseGateBeforePush = postRebaseGateIndex >= 0 && pushIndex >= 0 && postRebaseGateIndex < pushIndex;
  result.postRebaseGateInsidePushLoop =
    loopIndex >= 0 &&
    rebaseIndex >= 0 &&
    postRebaseGateIndex >= 0 &&
    pushIndex >= 0 &&
    loopIndex < rebaseIndex &&
    rebaseIndex < postRebaseGateIndex &&
    postRebaseGateIndex < pushIndex;
  result.postRebaseGateRefusesPushOnFailure = failureMessageIndex >= 0 && failureMessageIndex < pushIndex;

  if (!result.hasRebase) {
    addFinding(
      findings,
      "fail",
      "D-020",
      "WORKFLOW_REBASE_STEP_MISSING",
      path.relative(root, githubPipelineWorkflowPath),
      "Workflow push step must explicitly rebase on origin/main or otherwise prove it is pushing a fresh tree."
    );
  }

  if (!result.hasPostRebaseGateMarker) {
    addFinding(
      findings,
      "fail",
      "D-020",
      "WORKFLOW_POST_REBASE_AUDIT_GATE_MISSING",
      path.relative(root, githubPipelineWorkflowPath),
      "Workflow must re-run audit gates after git pull --rebase and before git push, because rebase can change published data after the earlier gate run."
    );
  }

  if (!result.hasNoBuildGateCommand) {
    addFinding(
      findings,
      "fail",
      "D-020",
      "WORKFLOW_POST_REBASE_NO_BUILD_GATE_MISSING",
      path.relative(root, githubPipelineWorkflowPath),
      "Workflow post-rebase gate should use npm run check:audit-gates:no-build to avoid a redundant build inside the push retry loop."
    );
  }

  if (!result.postRebaseGateAfterRebase) {
    addFinding(
      findings,
      "fail",
      "D-020",
      "WORKFLOW_POST_REBASE_GATE_BEFORE_REBASE",
      path.relative(root, githubPipelineWorkflowPath),
      "Post-rebase audit gates must run after git pull --rebase origin main."
    );
  }

  if (!result.postRebaseGateBeforePush) {
    addFinding(
      findings,
      "fail",
      "D-020",
      "WORKFLOW_POST_REBASE_GATE_AFTER_PUSH",
      path.relative(root, githubPipelineWorkflowPath),
      "Post-rebase audit gates must run before git push origin HEAD:main."
    );
  }

  if (!result.postRebaseGateInsidePushLoop) {
    addFinding(
      findings,
      "fail",
      "D-020",
      "WORKFLOW_POST_REBASE_GATE_OUTSIDE_PUSH_LOOP",
      path.relative(root, githubPipelineWorkflowPath),
      "Post-rebase audit gates must run inside the push retry loop so every rebase attempt is validated before push."
    );
  }

  if (!result.postRebaseGateRefusesPushOnFailure) {
    addFinding(
      findings,
      "fail",
      "D-020",
      "WORKFLOW_POST_REBASE_GATE_DOES_NOT_REFUSE_PUSH",
      path.relative(root, githubPipelineWorkflowPath),
      "Workflow must throw/refuse push if post-rebase audit gates fail."
    );
  }

  return result;
}
function evaluateWorkflowDeployContract(findings) {
  const result = {
    workflowExists: fs.existsSync(githubPipelineWorkflowPath),
    deployStepPresent: false,
    deployHookSecretReferenced: false,
    deployHookMissingCheckPresent: false,
    deployAfterPush: false,
    deployAfterPostRebaseGate: false,
    deployNotAlways: false,
    pushStepIndex: -1,
    postRebaseGateIndex: -1,
    deployStepIndex: -1,
  };

  if (!result.workflowExists) {
    addFinding(
      findings,
      "fail",
      "D-021",
      "WORKFLOW_MISSING_FOR_DEPLOY_CONTRACT",
      path.relative(root, githubPipelineWorkflowPath),
      ".github/workflows/pipeline.yml is missing, so deploy ordering cannot be audited."
    );

    return result;
  }

  const source = fs.readFileSync(githubPipelineWorkflowPath, "utf8").replace(/^\uFEFF/u, "");

  result.pushStepIndex = firstIndexOfAny(source, [
    "git push origin HEAD:main",
    "Push local published-data commit with remote sync",
  ]);

  result.postRebaseGateIndex = firstIndexOfAny(source, [
    "Re-running audit gates after rebase and before push",
    "Post-rebase audit gates failed; refusing to push.",
  ]);

  result.deployStepIndex = firstIndexOfAny(source, [
    "Trigger Vercel production deployment",
    "VERCEL_DEPLOY_HOOK_URL",
  ]);

  result.deployStepPresent = result.deployStepIndex >= 0;
  result.deployHookSecretReferenced =
    source.includes("secrets.VERCEL_DEPLOY_HOOK_URL") ||
    source.includes("$env:VERCEL_DEPLOY_HOOK_URL") ||
    source.includes("${{ secrets.VERCEL_DEPLOY_HOOK_URL }}");

  result.deployHookMissingCheckPresent =
    source.includes("VERCEL_DEPLOY_HOOK_URL") &&
    (
      source.includes("Missing VERCEL_DEPLOY_HOOK_URL") ||
      source.includes("VERCEL_DEPLOY_HOOK_URL is not configured") ||
      source.includes("Vercel deploy hook")
    );

  result.deployAfterPush =
    result.pushStepIndex >= 0 &&
    result.deployStepIndex >= 0 &&
    result.pushStepIndex < result.deployStepIndex;

  result.deployAfterPostRebaseGate =
    result.postRebaseGateIndex >= 0 &&
    result.deployStepIndex >= 0 &&
    result.postRebaseGateIndex < result.deployStepIndex;

  const deploySectionStart = result.deployStepIndex >= 0 ? result.deployStepIndex : 0;
  const deploySectionEnd = result.deployStepIndex >= 0
    ? source.indexOf("\n      - name:", result.deployStepIndex + 1)
    : -1;

  const deploySection = result.deployStepIndex >= 0
    ? source.slice(deploySectionStart, deploySectionEnd >= 0 ? deploySectionEnd : source.length)
    : "";

  result.deployNotAlways = result.deployStepPresent && !deploySection.includes("if: always()");

  if (!result.deployStepPresent) {
    addFinding(
      findings,
      "fail",
      "D-021",
      "WORKFLOW_DEPLOY_STEP_MISSING",
      path.relative(root, githubPipelineWorkflowPath),
      "Workflow must contain an explicit Vercel deployment trigger step after a validated push."
    );
  }

  if (!result.deployHookSecretReferenced) {
    addFinding(
      findings,
      "fail",
      "D-021",
      "WORKFLOW_DEPLOY_HOOK_SECRET_NOT_REFERENCED",
      path.relative(root, githubPipelineWorkflowPath),
      "Workflow deploy step must use the VERCEL_DEPLOY_HOOK_URL secret rather than a hard-coded URL."
    );
  }

  if (!result.deployHookMissingCheckPresent) {
    addFinding(
      findings,
      "fail",
      "D-021",
      "WORKFLOW_DEPLOY_HOOK_MISSING_CHECK_ABSENT",
      path.relative(root, githubPipelineWorkflowPath),
      "Workflow deploy step should explicitly fail or skip safely if VERCEL_DEPLOY_HOOK_URL is missing."
    );
  }

  if (!result.deployAfterPush) {
    addFinding(
      findings,
      "fail",
      "D-021",
      "WORKFLOW_DEPLOY_BEFORE_VALIDATED_PUSH",
      path.relative(root, githubPipelineWorkflowPath),
      "Vercel deployment must trigger only after the workflow push step succeeds."
    );
  }

  if (!result.deployAfterPostRebaseGate) {
    addFinding(
      findings,
      "fail",
      "D-021",
      "WORKFLOW_DEPLOY_BEFORE_POST_REBASE_GATE",
      path.relative(root, githubPipelineWorkflowPath),
      "Vercel deployment must occur after post-rebase audit gates, so the deployed commit has been validated."
    );
  }

  if (!result.deployNotAlways) {
    addFinding(
      findings,
      "fail",
      "D-021",
      "WORKFLOW_DEPLOY_USES_ALWAYS",
      path.relative(root, githubPipelineWorkflowPath),
      "Vercel deployment step must not use if: always(); it must depend on prior push/audit success."
    );
  }

  return result;
}
function evaluateSyncScriptMirrorContract(findings) {
  const result = {
    syncScriptExists: fs.existsSync(syncPublishedDataPath),
    removesPreviousTarget: false,
    copiesAsRealFiles: false,
    usesByteCopy: false,
    checksReparsePoints: false,
    refusesSameSourceAndTarget: false,
    datasetJsonHardFail: false,
    contractJsonHardFail: false,
    gitStatusScopedToPrivateMirror: false,
  };

  if (!result.syncScriptExists) {
    addFinding(
      findings,
      "fail",
      "D-022",
      "SYNC_PUBLISHED_DATA_SCRIPT_MISSING",
      path.relative(root, syncPublishedDataPath),
      "sync-published-data.ps1 is missing, so private mirror sync behavior cannot be audited."
    );

    return result;
  }

  const source = fs.readFileSync(syncPublishedDataPath, "utf8").replace(/^\uFEFF/u, "");

  result.removesPreviousTarget =
    source.includes('Write-Step "Removing previous deploy copy"') &&
    source.includes("Remove-PathIfExists -PathValue $normalizedTarget");

  result.copiesAsRealFiles =
    source.includes('Write-Step "Copying published data as real files"') &&
    source.includes("Copy-TreeAsRealFiles -Source $normalizedSource -Target $normalizedTarget");

  result.usesByteCopy =
    source.includes("[System.IO.File]::ReadAllBytes($_.FullName)") &&
    source.includes("[System.IO.File]::WriteAllBytes($targetPath, $bytes)");

  result.checksReparsePoints =
    source.includes("Get-ReparsePointItems") &&
    source.includes("No actual reparse points detected.") &&
    source.includes("are still actual reparse points");

  result.refusesSameSourceAndTarget =
    source.includes("$normalizedSource -ieq $normalizedTarget") &&
    source.includes("Source and target resolve to the same path. Refusing to continue.");

  result.datasetJsonHardFail = source.includes('Fail "dataset.json was not found in target after sync."');
  result.contractJsonHardFail = source.includes('Fail "contract.json was not found in target after sync."');

  result.gitStatusScopedToPrivateMirror =
    source.includes("git status --short -- web-v1-app/.private-data/published/v1");

  if (!result.removesPreviousTarget) {
    addFinding(
      findings,
      "fail",
      "D-022",
      "SYNC_SCRIPT_DOES_NOT_REMOVE_PREVIOUS_TARGET",
      path.relative(root, syncPublishedDataPath),
      "sync-published-data.ps1 must remove the previous private mirror target before copying, otherwise stale files can survive."
    );
  }

  if (!result.copiesAsRealFiles) {
    addFinding(
      findings,
      "fail",
      "D-022",
      "SYNC_SCRIPT_REAL_FILE_COPY_MISSING",
      path.relative(root, syncPublishedDataPath),
      "sync-published-data.ps1 must copy published data as real files, not symlinks/reparse points."
    );
  }

  if (!result.usesByteCopy) {
    addFinding(
      findings,
      "fail",
      "D-022",
      "SYNC_SCRIPT_BYTE_COPY_CONTRACT_MISSING",
      path.relative(root, syncPublishedDataPath),
      "sync-published-data.ps1 must byte-copy files so private mirror files can byte-match canonical source artifacts."
    );
  }

  if (!result.checksReparsePoints) {
    addFinding(
      findings,
      "fail",
      "D-022",
      "SYNC_SCRIPT_REPARSE_POINT_CHECK_MISSING",
      path.relative(root, syncPublishedDataPath),
      "sync-published-data.ps1 must fail if any reparse points remain in the private mirror."
    );
  }

  if (!result.refusesSameSourceAndTarget) {
    addFinding(
      findings,
      "fail",
      "D-022",
      "SYNC_SCRIPT_SAME_SOURCE_TARGET_GUARD_MISSING",
      path.relative(root, syncPublishedDataPath),
      "sync-published-data.ps1 must refuse to run if source and target resolve to the same path."
    );
  }

  if (!result.datasetJsonHardFail) {
    addFinding(
      findings,
      "fail",
      "D-022",
      "SYNC_SCRIPT_DATASET_JSON_NOT_HARD_FAIL",
      path.relative(root, syncPublishedDataPath),
      "sync-published-data.ps1 must fail, not warn, when dataset.json is missing after sync."
    );
  }

  if (!result.contractJsonHardFail) {
    addFinding(
      findings,
      "fail",
      "D-022",
      "SYNC_SCRIPT_CONTRACT_JSON_NOT_HARD_FAIL",
      path.relative(root, syncPublishedDataPath),
      "sync-published-data.ps1 must fail, not warn, when contract.json is missing after sync."
    );
  }

  if (!result.gitStatusScopedToPrivateMirror) {
    addFinding(
      findings,
      "warn",
      "D-022",
      "SYNC_SCRIPT_GIT_STATUS_SCOPE_MISSING",
      path.relative(root, syncPublishedDataPath),
      "sync-published-data.ps1 should scope git status output to web-v1-app/.private-data/published/v1."
    );
  }

  return result;
}
function countJsonFilesUnder(dir) {
  if (!fs.existsSync(dir)) {
    return 0;
  }

  return listFilesRecursive(dir).filter((file) => file.endsWith(".json")).length;
}
function evaluatePublicPrivateArtifactBoundaryContract(findings) {
  const result = {
    localStorageExists: fs.existsSync(localStoragePath),
    localStorageHasPublicFallback: false,
    publicPublishedRootExists: fs.existsSync(webPublicPublishedRoot),
    publicGoldJsonFiles: 0,
    publicMetaJsonFiles: 0,
    publicDerivedJsonFiles: 0,
    publicSubscriberJsonFiles: 0,
    gitignoreBlocksPublicPublishedRoot: false,
  };

  if (!result.localStorageExists) {
    addFinding(
      findings,
      "fail",
      "D-023",
      "LOCAL_STORAGE_MODULE_MISSING_FOR_BOUNDARY",
      path.relative(root, localStoragePath),
      "localDev.ts is missing, so local public/private storage resolution cannot be audited."
    );
  } else {
    const source = fs.readFileSync(localStoragePath, "utf8").replace(/^\uFEFF/u, "");

    result.localStorageHasPublicFallback =
      /path\.join\(\s*appRoot\s*,\s*["']public["']\s*,\s*["']data["']\s*,\s*["']published["']\s*,\s*["']v1["']\s*\)/u.test(source);

    if (result.localStorageHasPublicFallback) {
      addFinding(
        findings,
        "fail",
        "D-023",
        "LOCAL_STORAGE_PUBLIC_PUBLISHED_FALLBACK_PRESENT",
        path.relative(root, localStoragePath),
        "localDev storage must not resolve subscriber-bound published artifacts from web-v1-app/public/data/published/v1. Use canonical data/published/v1 or .private-data only."
      );
    }
  }

  const publicGoldRoot = path.join(webPublicPublishedRoot, "gold");
  const publicMetaRoot = path.join(webPublicPublishedRoot, "meta");
  const publicDerivedRoot = path.join(webPublicPublishedRoot, "derived");

  result.publicGoldJsonFiles = countJsonFilesUnder(publicGoldRoot);
  result.publicMetaJsonFiles = countJsonFilesUnder(publicMetaRoot);
  result.publicDerivedJsonFiles = countJsonFilesUnder(publicDerivedRoot);
  result.publicSubscriberJsonFiles =
    result.publicGoldJsonFiles + result.publicMetaJsonFiles + result.publicDerivedJsonFiles;

  if (result.publicSubscriberJsonFiles > 0) {
    addFinding(
      findings,
      "fail",
      "D-023",
      "SUBSCRIBER_ARTIFACTS_PRESENT_UNDER_PUBLIC",
      path.relative(root, webPublicPublishedRoot),
      `Subscriber-bound gold/meta/derived JSON files must not exist under public/. Counts: gold=${result.publicGoldJsonFiles}, meta=${result.publicMetaJsonFiles}, derived=${result.publicDerivedJsonFiles}.`
    );
  }

  if (fs.existsSync(gitignorePath)) {
    const gitignore = fs.readFileSync(gitignorePath, "utf8").replace(/^\uFEFF/u, "");
    result.gitignoreBlocksPublicPublishedRoot =
      gitignore.split(/\r?\n/u).map((line) => line.trim()).includes("web-v1-app/public/data/published/v1/");
  }

  if (!result.gitignoreBlocksPublicPublishedRoot) {
    addFinding(
      findings,
      "fail",
      "D-023",
      "GITIGNORE_PUBLIC_PUBLISHED_ROOT_RULE_MISSING",
      path.relative(root, gitignorePath),
      ".gitignore must block web-v1-app/public/data/published/v1/ so subscriber-bound artifacts cannot be committed under public."
    );
  }

  return result;
}
function sourceIndex(source, needle) {
  return source.indexOf(needle);
}

function evaluateFileApiResponseBoundaryContract(findings) {
  const result = {
    routeExists: fs.existsSync(fileApiRoutePath),
    hasPreAuthRateLimit: false,
    hasApiKeyValidation: false,
    hasPathSanitization: false,
    rejectsTraversalAndNullBytes: false,
    hasAllowedGenreAndChainLists: false,
    usesParsedStorageSegments: false,
    entitlementBeforeStorageRead: false,
    authBeforeStorageRead: false,
    rateLimitBeforeStorageRead: false,
    returnsPrivateNoStore: false,
    returnsEntitlementHeaders: false,
    returnsRequestIdHeader: false,
    touchesApiKeyAfterServed: false,
    logsFileServed: false,
    hidesProductionErrorDetails: false,
  };

  if (!result.routeExists) {
    addFinding(
      findings,
      "fail",
      "D-024",
      "FILE_API_ROUTE_MISSING",
      path.relative(root, fileApiRoutePath),
      "The subscriber file API route is missing, so response-boundary behavior cannot be audited."
    );

    return result;
  }

  const source = fs.readFileSync(fileApiRoutePath, "utf8").replace(/^\uFEFF/u, "");

  const preAuthRateLimitIndex = sourceIndex(source, "enforcePreAuthRateLimit(request,");
  const validateApiKeyIndex = sourceIndex(source, "validateRequestApiKey(request)");
  const accountRateLimitIndex = sourceIndex(source, "enforceAccountRateLimit(");
  const dailyQuotaIndex = sourceIndex(source, "enforceDailyApiQuota(");
  const entitlementIndex = sourceIndex(source, "evaluateFileEntitlement(");
  const storagePathIndex = sourceIndex(source, "const storagePath = buildStoragePath(parsedPath.storageSegments);");
  const storageReadIndex = sourceIndex(source, "readStorageObject(storagePath)");
  const fileServedLogIndex = sourceIndex(source, 'eventType: "file_served"');
  const touchLastUsedIndex = sourceIndex(source, "touchPersistedApiKeyLastUsedAt(");

  result.hasPreAuthRateLimit = preAuthRateLimitIndex >= 0;
  result.hasApiKeyValidation = validateApiKeyIndex >= 0;
  result.hasPathSanitization = source.includes("function sanitizeSegments(") && source.includes("sanitizeSegments(resolved.path)");
  result.rejectsTraversalAndNullBytes =
    source.includes('segment.includes("..")') &&
    source.includes('segment.includes("\\\\")') &&
    source.includes('segment.includes("\\0")');

  result.hasAllowedGenreAndChainLists =
    source.includes('const ALLOWED_GENRES') &&
    source.includes('const ALLOWED_CHAINS') &&
    source.includes('isFileGenre(') &&
    source.includes('isChainId(');

  result.usesParsedStorageSegments = storagePathIndex >= 0;
  result.entitlementBeforeStorageRead = entitlementIndex >= 0 && storageReadIndex >= 0 && entitlementIndex < storageReadIndex;
  result.authBeforeStorageRead = validateApiKeyIndex >= 0 && storageReadIndex >= 0 && validateApiKeyIndex < storageReadIndex;
  result.rateLimitBeforeStorageRead =
    storageReadIndex >= 0 &&
    preAuthRateLimitIndex >= 0 &&
    preAuthRateLimitIndex < storageReadIndex &&
    accountRateLimitIndex >= 0 &&
    accountRateLimitIndex < storageReadIndex &&
    dailyQuotaIndex >= 0 &&
    dailyQuotaIndex < storageReadIndex;

  result.returnsPrivateNoStore = source.includes('"Cache-Control": "private, no-store"');
  result.returnsEntitlementHeaders =
    source.includes('"X-Entitlement-Tier": authResult.entitlement.tier') &&
    source.includes('"X-Entitlement-Window": inferredWindow');

  result.returnsRequestIdHeader =
    source.includes("function withRequestId(") &&
    source.includes('"X-Request-Id": requestId') &&
    source.includes("...withRequestId(requestId");

  result.touchesApiKeyAfterServed =
    touchLastUsedIndex >= 0 &&
    storageReadIndex >= 0 &&
    storageReadIndex < touchLastUsedIndex;

  result.logsFileServed =
    fileServedLogIndex >= 0 &&
    storageReadIndex >= 0 &&
    storageReadIndex < fileServedLogIndex;

  result.hidesProductionErrorDetails =
    source.includes("function publicFileErrorDetail(") &&
    source.includes('process.env.NODE_ENV !== "production"') &&
    source.includes('return "not_found";') &&
    source.includes('return "forbidden";') &&
    source.includes('return "unauthenticated";');

  if (!result.hasPreAuthRateLimit) {
    addFinding(
      findings,
      "fail",
      "D-024",
      "FILE_API_PRE_AUTH_RATE_LIMIT_MISSING",
      path.relative(root, fileApiRoutePath),
      "File API route must enforce pre-auth rate limiting before API key validation."
    );
  }

  if (!result.hasApiKeyValidation) {
    addFinding(
      findings,
      "fail",
      "D-024",
      "FILE_API_KEY_VALIDATION_MISSING",
      path.relative(root, fileApiRoutePath),
      "File API route must validate API keys before resolving subscriber-bound files."
    );
  }

  if (!result.hasPathSanitization || !result.rejectsTraversalAndNullBytes) {
    addFinding(
      findings,
      "fail",
      "D-024",
      "FILE_API_PATH_SANITIZATION_INCOMPLETE",
      path.relative(root, fileApiRoutePath),
      "File API route must sanitize path segments and reject traversal, backslashes, and null bytes."
    );
  }

  if (!result.hasAllowedGenreAndChainLists) {
    addFinding(
      findings,
      "fail",
      "D-024",
      "FILE_API_ALLOWED_GENRE_CHAIN_CONTRACT_MISSING",
      path.relative(root, fileApiRoutePath),
      "File API route must constrain paths to explicit allowed genres and chains."
    );
  }

  if (!result.usesParsedStorageSegments) {
    addFinding(
      findings,
      "fail",
      "D-024",
      "FILE_API_STORAGE_PATH_USES_UNPARSED_SEGMENTS",
      path.relative(root, fileApiRoutePath),
      "File API route must build storage paths from parsedPath.storageSegments, not raw request segments."
    );
  }

  if (!result.authBeforeStorageRead) {
    addFinding(
      findings,
      "fail",
      "D-024",
      "FILE_API_STORAGE_READ_BEFORE_AUTH",
      path.relative(root, fileApiRoutePath),
      "File API route must authenticate before readStorageObject."
    );
  }

  if (!result.rateLimitBeforeStorageRead) {
    addFinding(
      findings,
      "fail",
      "D-024",
      "FILE_API_STORAGE_READ_BEFORE_RATE_LIMITS",
      path.relative(root, fileApiRoutePath),
      "File API route must enforce pre-auth/account/daily rate limits before readStorageObject."
    );
  }

  if (!result.entitlementBeforeStorageRead) {
    addFinding(
      findings,
      "fail",
      "D-024",
      "FILE_API_STORAGE_READ_BEFORE_ENTITLEMENT",
      path.relative(root, fileApiRoutePath),
      "File API route must evaluate entitlement before readStorageObject."
    );
  }

  if (!result.returnsPrivateNoStore) {
    addFinding(
      findings,
      "fail",
      "D-024",
      "FILE_API_PRIVATE_NO_STORE_CACHE_HEADER_MISSING",
      path.relative(root, fileApiRoutePath),
      "Subscriber-bound file responses must return Cache-Control: private, no-store."
    );
  }

  if (!result.returnsEntitlementHeaders) {
    addFinding(
      findings,
      "fail",
      "D-024",
      "FILE_API_ENTITLEMENT_RESPONSE_HEADERS_MISSING",
      path.relative(root, fileApiRoutePath),
      "File API responses must expose entitlement tier/window headers for client/debug visibility."
    );
  }

  if (!result.returnsRequestIdHeader) {
    addFinding(
      findings,
      "fail",
      "D-024",
      "FILE_API_REQUEST_ID_HEADER_MISSING",
      path.relative(root, fileApiRoutePath),
      "File API responses and errors must include X-Request-Id."
    );
  }

  if (!result.touchesApiKeyAfterServed) {
    addFinding(
      findings,
      "fail",
      "D-024",
      "FILE_API_LAST_USED_UPDATE_MISSING",
      path.relative(root, fileApiRoutePath),
      "File API route must update API-key last-used metadata after a successful file read."
    );
  }

  if (!result.logsFileServed) {
    addFinding(
      findings,
      "fail",
      "D-024",
      "FILE_API_FILE_SERVED_AUDIT_LOG_MISSING",
      path.relative(root, fileApiRoutePath),
      "File API route must log successful file_served events after storage reads."
    );
  }

  if (!result.hidesProductionErrorDetails) {
    addFinding(
      findings,
      "fail",
      "D-024",
      "FILE_API_PRODUCTION_ERROR_DETAIL_GUARD_MISSING",
      path.relative(root, fileApiRoutePath),
      "File API route must avoid exposing raw internal error/storage details in production responses."
    );
  }

  return result;
}
function evaluateEntitlementMatrixContract(findings) {
  const result = {
    entitlementsExists: fs.existsSync(entitlementsPath),
    hasTierUnion: false,
    hasStatusUnion: false,
    hasGenreUnion: false,
    hasWindowUnion: false,
    hasAllChains: false,
    hasAllGenres: false,
    basicWindowsCorrect: false,
    proWindowsCorrect: false,
    publicHasNoFileAccess: false,
    basicSingleChain: false,
    basicMaxWindow90: false,
    basicHistoryDepth90UnlessUnlocked: false,
    basicCustomThresholdsFalse: false,
    proAllChains: false,
    proMaxWindow365: false,
    proHistoryDepth365UnlessUnlocked: false,
    proCustomThresholdsTrue: false,
    evaluatesPublicAsInactive: false,
    checksInactiveBeforeAccess: false,
    checksChainBeforeGenreWindow: false,
    checksGenreBeforeWindow: false,
    checksWindowBeforeDateRange: false,
    validatesBothDateBounds: false,
    validatesDateOrdering: false,
    enforcesHistoryDepth: false,
    exportsFactoryHelpers: false,
  };

  if (!result.entitlementsExists) {
    addFinding(
      findings,
      "fail",
      "D-025",
      "ENTITLEMENTS_MODULE_MISSING",
      path.relative(root, entitlementsPath),
      "Entitlement matrix module is missing."
    );

    return result;
  }

  const source = fs.readFileSync(entitlementsPath, "utf8").replace(/^\uFEFF/u, "");

  result.hasTierUnion = source.includes('export type SubscriptionTier = "public" | "basic" | "pro";');
  result.hasStatusUnion = source.includes('export type SubscriptionStatus = "active" | "inactive";');
  result.hasGenreUnion = source.includes('export type FileGenre = "gold" | "meta" | "derived" | "briefs";');
  result.hasWindowUnion = source.includes('export type WindowToken = "latest" | "7d" | "30d" | "90d" | "180d" | "365d";');

  result.hasAllChains = source.includes('const ALL_CHAINS: ChainId[] = ["bitcoin", "ethereum", "arbitrum", "base"];');
  result.hasAllGenres = source.includes('const ALL_GENRES: FileGenre[] = ["gold", "meta", "derived", "briefs"];');
  result.basicWindowsCorrect = source.includes('const BASIC_WINDOWS: WindowToken[] = ["latest", "7d", "30d", "90d"];');
  result.proWindowsCorrect = source.includes('const PRO_WINDOWS: WindowToken[] = ["latest", "7d", "30d", "90d", "180d", "365d"];');

  result.publicHasNoFileAccess =
    source.includes('tier: "public"') &&
    source.includes("allowedChains: []") &&
    source.includes("allowedGenres: []") &&
    source.includes("allowedWindows: []") &&
    source.includes("maxWindowDays: 0") &&
    source.includes("historyDepthDays: 0") &&
    source.includes("fullHistory: false") &&
    source.includes("customThresholdFeeds: false");

  result.basicSingleChain =
    source.includes("const allowedChains = input.entitledChain ? [input.entitledChain] : [];") &&
    source.includes("allowedChains,") &&
    source.includes('tier: "basic"');

  result.basicMaxWindow90 =
    source.includes('tier: "basic"') &&
    source.includes("allowedWindows: cloneWindows(BASIC_WINDOWS)") &&
    source.includes("maxWindowDays: 90");

  result.basicHistoryDepth90UnlessUnlocked =
    source.includes("historyDepthDays: input.historyUnlocked ? null : 90") &&
    source.includes("fullHistory: input.historyUnlocked");

  result.basicCustomThresholdsFalse =
    source.includes('tier: "basic"') &&
    source.includes("customThresholdFeeds: false");

  result.proAllChains =
    source.includes('tier: "pro"') &&
    source.includes("allowedChains: cloneChains(ALL_CHAINS)");

  result.proMaxWindow365 =
    source.includes('tier: "pro"') &&
    source.includes("allowedWindows: cloneWindows(PRO_WINDOWS)") &&
    source.includes("maxWindowDays: 365");

  result.proHistoryDepth365UnlessUnlocked =
    source.includes("historyDepthDays: input.historyUnlocked ? null : 365") &&
    source.includes("fullHistory: input.historyUnlocked");

  result.proCustomThresholdsTrue =
    source.includes('tier: "pro"') &&
    source.includes("customThresholdFeeds: true");

  const publicCheckIndex = source.indexOf('if (snapshot.tier === "public")');
  const inactiveCheckIndex = source.indexOf('if (snapshot.status !== "active")');
  const chainCheckIndex = source.indexOf("if (!canAccessChain(snapshot, scope.chain))");
  const genreCheckIndex = source.indexOf("if (!canAccessGenre(snapshot, scope.genre))");
  const windowCheckIndex = source.indexOf("if (!canAccessWindow(snapshot, scope.window))");
  const dateRangeCheckIndex = source.indexOf("const dateRangeDecision = validateDateRangeWithinHistory(");

  result.evaluatesPublicAsInactive =
    publicCheckIndex >= 0 &&
    source.includes("Public users do not have authenticated file-delivery access.") &&
    source.includes('code: "inactive_subscription"');

  result.checksInactiveBeforeAccess =
    publicCheckIndex >= 0 &&
    inactiveCheckIndex >= 0 &&
    chainCheckIndex >= 0 &&
    publicCheckIndex < inactiveCheckIndex &&
    inactiveCheckIndex < chainCheckIndex;

  result.checksChainBeforeGenreWindow =
    chainCheckIndex >= 0 &&
    genreCheckIndex >= 0 &&
    windowCheckIndex >= 0 &&
    chainCheckIndex < genreCheckIndex &&
    genreCheckIndex < windowCheckIndex;

  result.checksGenreBeforeWindow =
    genreCheckIndex >= 0 &&
    windowCheckIndex >= 0 &&
    genreCheckIndex < windowCheckIndex;

  result.checksWindowBeforeDateRange =
    windowCheckIndex >= 0 &&
    dateRangeCheckIndex >= 0 &&
    windowCheckIndex < dateRangeCheckIndex;

  result.validatesBothDateBounds =
    source.includes("if (!startDate || !endDate)") &&
    source.includes("Both startDate and endDate must be present");

  result.validatesDateOrdering =
    source.includes("if (end < start)") &&
    source.includes("endDate must be on or after startDate.");

  result.enforcesHistoryDepth =
    source.includes("const inclusiveDays = Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1;") &&
    source.includes("inclusiveDays > snapshot.historyDepthDays") &&
    source.includes('code: "forbidden_history_range"');

  result.exportsFactoryHelpers =
    source.includes("export function createPublicEntitlement()") &&
    source.includes("export function createBasicEntitlement(") &&
    source.includes("export function createProEntitlement(");

  const requiredChecks = [
    ["ENTITLEMENT_TIER_UNION_INVALID", result.hasTierUnion, "SubscriptionTier must be exactly public | basic | pro."],
    ["ENTITLEMENT_STATUS_UNION_INVALID", result.hasStatusUnion, "SubscriptionStatus must be exactly active | inactive."],
    ["ENTITLEMENT_GENRE_UNION_INVALID", result.hasGenreUnion, "FileGenre must include gold, meta, derived, briefs."],
    ["ENTITLEMENT_WINDOW_UNION_INVALID", result.hasWindowUnion, "WindowToken must include latest, 7d, 30d, 90d, 180d, 365d."],
    ["ENTITLEMENT_ALL_CHAINS_INVALID", result.hasAllChains, "ALL_CHAINS must cover bitcoin, ethereum, arbitrum, base."],
    ["ENTITLEMENT_ALL_GENRES_INVALID", result.hasAllGenres, "ALL_GENRES must cover gold, meta, derived, briefs."],
    ["ENTITLEMENT_BASIC_WINDOWS_INVALID", result.basicWindowsCorrect, "BASIC_WINDOWS must be latest, 7d, 30d, 90d."],
    ["ENTITLEMENT_PRO_WINDOWS_INVALID", result.proWindowsCorrect, "PRO_WINDOWS must be latest, 7d, 30d, 90d, 180d, 365d."],
    ["ENTITLEMENT_PUBLIC_ACCESS_NOT_EMPTY", result.publicHasNoFileAccess, "Public tier must have no subscriber file access."],
    ["ENTITLEMENT_BASIC_SINGLE_CHAIN_INVALID", result.basicSingleChain, "Basic tier must be limited to exactly the entitled chain."],
    ["ENTITLEMENT_BASIC_MAX_WINDOW_INVALID", result.basicMaxWindow90, "Basic tier must be capped at 90d windows."],
    ["ENTITLEMENT_BASIC_HISTORY_DEPTH_INVALID", result.basicHistoryDepth90UnlessUnlocked, "Basic tier history depth must be 90d unless historyUnlocked."],
    ["ENTITLEMENT_BASIC_CUSTOM_THRESHOLDS_INVALID", result.basicCustomThresholdsFalse, "Basic tier must not include customThresholdFeeds."],
    ["ENTITLEMENT_PRO_CHAIN_ACCESS_INVALID", result.proAllChains, "Pro tier must include all chains."],
    ["ENTITLEMENT_PRO_MAX_WINDOW_INVALID", result.proMaxWindow365, "Pro tier must include windows through 365d."],
    ["ENTITLEMENT_PRO_HISTORY_DEPTH_INVALID", result.proHistoryDepth365UnlessUnlocked, "Pro tier history depth must be 365d unless historyUnlocked."],
    ["ENTITLEMENT_PRO_CUSTOM_THRESHOLDS_INVALID", result.proCustomThresholdsTrue, "Pro tier must include customThresholdFeeds."],
    ["ENTITLEMENT_PUBLIC_DECISION_INVALID", result.evaluatesPublicAsInactive, "Public file entitlement must be denied as inactive_subscription."],
    ["ENTITLEMENT_INACTIVE_CHECK_ORDER_INVALID", result.checksInactiveBeforeAccess, "Inactive subscription must be checked before chain/genre/window access."],
    ["ENTITLEMENT_CHAIN_GENRE_WINDOW_ORDER_INVALID", result.checksChainBeforeGenreWindow, "Entitlement evaluation must check chain before genre before window."],
    ["ENTITLEMENT_WINDOW_DATE_ORDER_INVALID", result.checksWindowBeforeDateRange, "Window entitlement must be checked before date-range/history access."],
    ["ENTITLEMENT_DATE_BOUNDS_VALIDATION_MISSING", result.validatesBothDateBounds, "Date-range access must require both startDate and endDate."],
    ["ENTITLEMENT_DATE_ORDER_VALIDATION_MISSING", result.validatesDateOrdering, "Date-range access must reject endDate before startDate."],
    ["ENTITLEMENT_HISTORY_DEPTH_ENFORCEMENT_MISSING", result.enforcesHistoryDepth, "Date-range access must enforce historyDepthDays."],
    ["ENTITLEMENT_FACTORY_HELPERS_MISSING", result.exportsFactoryHelpers, "Entitlement factory helpers must remain exported for tests/routes."]
  ];

  for (const [code, ok, detail] of requiredChecks) {
    if (!ok) {
      addFinding(
        findings,
        "fail",
        "D-025",
        code,
        path.relative(root, entitlementsPath),
        detail
      );
    }
  }

  return result;
}
function evaluateRateLimitQuotaContract(findings) {
  const result = {
    rateLimitModuleExists: fs.existsSync(rateLimitPath),
    hasUpstashImports: false,
    tierTypeBasicProOnly: false,
    decisionSourcesIncludeFailClosed: false,
    perMinuteWindow60s: false,
    basicPerMinute60: false,
    proPerMinute300: false,
    failClosedRetryAfter60: false,
    dailyQuotaDefaultsValid: false,
    invalidDailyQuotaFallbacksValid: false,
    productionRuntimeDetection: false,
    redisRequiresUrlAndToken: false,
    upstashSlidingWindowConfigured: false,
    memoryFallbackOutsideProduction: false,
    failClosedWhenRedisMissingInProduction: false,
    failClosedWhenRateLimitBackendThrowsInProduction: false,
    failClosedWhenDailyQuotaBackendThrowsInProduction: false,
    dailyQuotaKeyIncludesDayTierAccountKey: false,
    dailyQuotaExpiresAtUtcMidnight: false,
    rateLimitHeadersValid: false,
    dailyQuotaHeadersValid: false,
    exportedEnforcersPresent: false,
  };

  if (!result.rateLimitModuleExists) {
    addFinding(
      findings,
      "fail",
      "D-026",
      "RATE_LIMIT_MODULE_MISSING",
      path.relative(root, rateLimitPath),
      "Rate-limit module is missing."
    );

    return result;
  }

  const source = fs.readFileSync(rateLimitPath, "utf8").replace(/^\uFEFF/u, "");

  result.hasUpstashImports =
    source.includes('import { Ratelimit } from "@upstash/ratelimit";') &&
    source.includes('import { Redis } from "@upstash/redis";');

  result.tierTypeBasicProOnly =
    source.includes('export type RateLimitTier = Extract<SubscriptionTier, "basic" | "pro">;');

  result.decisionSourcesIncludeFailClosed =
    source.includes('source: "upstash" | "memory" | "fail_closed";');

  result.perMinuteWindow60s = source.includes("const WINDOW_MS = 60_000;");
  result.basicPerMinute60 = source.includes("const BASIC_LIMIT = 60;");
  result.proPerMinute300 = source.includes("const PRO_LIMIT = 300;");
  result.failClosedRetryAfter60 = source.includes("const FAIL_CLOSED_RETRY_AFTER_SECONDS = 60;");

  result.dailyQuotaDefaultsValid =
    source.includes('process.env.BASIC_DAILY_API_QUOTA ?? "500"') &&
    source.includes('process.env.PRO_DAILY_API_QUOTA ?? "5000"');

  result.invalidDailyQuotaFallbacksValid =
    source.includes('return tier === "pro" ? 5_000 : 500;') &&
    source.includes("return Math.floor(value);");

  result.productionRuntimeDetection =
    source.includes('process.env.NODE_ENV === "production"') &&
    source.includes('process.env.VERCEL_ENV === "production"');

  result.redisRequiresUrlAndToken =
    source.includes("process.env.UPSTASH_REDIS_REST_URL") &&
    source.includes("process.env.UPSTASH_REDIS_REST_TOKEN") &&
    source.includes("if (!url || !token)") &&
    source.includes("return null;");

  result.upstashSlidingWindowConfigured =
    source.includes("Ratelimit.slidingWindow(getLimitForTier(tier), \"60 s\")") &&
    source.includes("prefix: `ta:rl:${tier}`");

  result.memoryFallbackOutsideProduction =
    source.includes("return applyMemoryRateLimit(accountId, tier);") &&
    source.includes("return applyMemoryDailyQuota(accountId, apiKeyId, tier);");

  result.failClosedWhenRedisMissingInProduction =
    source.includes("production rate-limit backend is not configured; failing closed") &&
    source.includes("return buildFailClosedDecision(tier);") &&
    source.includes("production daily quota backend is not configured; failing closed") &&
    source.includes("return buildDailyQuotaFailClosedDecision(tier);");

  result.failClosedWhenRateLimitBackendThrowsInProduction =
    source.includes("[rateLimit] rate-limit backend failed") &&
    source.includes("if (isProductionRuntime())") &&
    source.includes("return buildFailClosedDecision(tier);");

  result.failClosedWhenDailyQuotaBackendThrowsInProduction =
    source.includes("[rateLimit] daily quota backend failed") &&
    source.includes("return buildDailyQuotaFailClosedDecision(tier);");

  result.dailyQuotaKeyIncludesDayTierAccountKey =
    source.includes("function buildDailyQuotaMemoryKey(accountId: string, apiKeyId: string, tier: RateLimitTier): string") &&
    source.includes("return `${getUtcDayToken()}:${tier}:${accountId}:${apiKeyId}`;") &&
    source.includes("const key = `ta:quota:${day}:${tier}:${accountId}:${apiKeyId}`;");

  result.dailyQuotaExpiresAtUtcMidnight =
    source.includes("function getNextUtcMidnightMs(nowMs = Date.now()): number") &&
    source.includes("Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0)") &&
    source.includes("redis.expire(key, ttlSeconds)");

  result.rateLimitHeadersValid =
    source.includes('"X-RateLimit-Limit": String(decision.limit)') &&
    source.includes('"X-RateLimit-Remaining": String(decision.remaining)') &&
    source.includes('"X-RateLimit-Reset": String(Math.floor(decision.reset / 1000))') &&
    source.includes('headers["Retry-After"] = String(decision.retryAfter);');

  result.dailyQuotaHeadersValid =
    source.includes('"X-DailyQuota-Limit": String(decision.limit)') &&
    source.includes('"X-DailyQuota-Remaining": String(decision.remaining)') &&
    source.includes('"X-DailyQuota-Reset": String(Math.floor(decision.reset / 1000))') &&
    source.includes('headers["Retry-After"] = String(decision.retryAfter);');

  result.exportedEnforcersPresent =
    source.includes("export async function enforceDailyApiQuota(") &&
    source.includes("export async function enforceAccountRateLimit(") &&
    source.includes("export function buildDailyQuotaHeaders(") &&
    source.includes("export function buildRateLimitHeaders(");

  const requiredChecks = [
    ["RATE_LIMIT_UPSTASH_IMPORTS_MISSING", result.hasUpstashImports, "Rate-limit module must use Upstash Redis/Ratelimit."],
    ["RATE_LIMIT_TIER_TYPE_INVALID", result.tierTypeBasicProOnly, "RateLimitTier must be limited to basic/pro subscriptions."],
    ["RATE_LIMIT_DECISION_SOURCE_INVALID", result.decisionSourcesIncludeFailClosed, "Rate-limit decisions must include upstash, memory, and fail_closed sources."],
    ["RATE_LIMIT_WINDOW_INVALID", result.perMinuteWindow60s, "Per-minute rate-limit window must be 60 seconds."],
    ["RATE_LIMIT_BASIC_LIMIT_INVALID", result.basicPerMinute60, "Basic per-minute limit must remain 60."],
    ["RATE_LIMIT_PRO_LIMIT_INVALID", result.proPerMinute300, "Pro per-minute limit must remain 300."],
    ["RATE_LIMIT_FAIL_CLOSED_RETRY_AFTER_INVALID", result.failClosedRetryAfter60, "Fail-closed retry-after must remain 60 seconds."],
    ["RATE_LIMIT_DAILY_QUOTA_DEFAULTS_INVALID", result.dailyQuotaDefaultsValid, "Daily quota defaults must be BASIC=500 and PRO=5000 unless overridden by env."],
    ["RATE_LIMIT_DAILY_QUOTA_FALLBACKS_INVALID", result.invalidDailyQuotaFallbacksValid, "Invalid daily quota env values must fall back to 500/5000."],
    ["RATE_LIMIT_PRODUCTION_DETECTION_MISSING", result.productionRuntimeDetection, "Production runtime detection must include NODE_ENV and VERCEL_ENV."],
    ["RATE_LIMIT_REDIS_CONFIG_GUARD_MISSING", result.redisRequiresUrlAndToken, "Redis client must require both UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN."],
    ["RATE_LIMIT_UPSTASH_SLIDING_WINDOW_MISSING", result.upstashSlidingWindowConfigured, "Upstash limiter must use a 60s sliding window with tier prefix."],
    ["RATE_LIMIT_MEMORY_FALLBACK_MISSING", result.memoryFallbackOutsideProduction, "Non-production mode must retain memory fallback for local development."],
    ["RATE_LIMIT_FAIL_CLOSED_MISSING_REDIS_MISSING", result.failClosedWhenRedisMissingInProduction, "Production must fail closed if Redis/rate-limit backend is not configured."],
    ["RATE_LIMIT_FAIL_CLOSED_RATE_BACKEND_THROW_MISSING", result.failClosedWhenRateLimitBackendThrowsInProduction, "Production must fail closed when account rate-limit backend throws."],
    ["RATE_LIMIT_FAIL_CLOSED_DAILY_BACKEND_THROW_MISSING", result.failClosedWhenDailyQuotaBackendThrowsInProduction, "Production must fail closed when daily quota backend throws."],
    ["RATE_LIMIT_DAILY_QUOTA_KEY_INVALID", result.dailyQuotaKeyIncludesDayTierAccountKey, "Daily quota keys must include UTC day, tier, account id, and API key id."],
    ["RATE_LIMIT_DAILY_QUOTA_TTL_INVALID", result.dailyQuotaExpiresAtUtcMidnight, "Daily quotas must reset at next UTC midnight and set Redis TTL."],
    ["RATE_LIMIT_HEADERS_INVALID", result.rateLimitHeadersValid, "Rate-limit response headers must include limit, remaining, reset, and Retry-After on failure."],
    ["RATE_LIMIT_DAILY_HEADERS_INVALID", result.dailyQuotaHeadersValid, "Daily quota response headers must include limit, remaining, reset, and Retry-After on failure."],
    ["RATE_LIMIT_EXPORTED_ENFORCERS_MISSING", result.exportedEnforcersPresent, "Rate-limit module must export enforcers and header builders used by API routes."]
  ];

  for (const [code, ok, detail] of requiredChecks) {
    if (!ok) {
      addFinding(
        findings,
        "fail",
        "D-026",
        code,
        path.relative(root, rateLimitPath),
        detail
      );
    }
  }

  return result;
}
function evaluateApiKeyAuthContract(findings) {
  const result = {
    validateTokenExists: fs.existsSync(validateTokenPath),
    apiKeysExists: fs.existsSync(apiKeysPath),

    headerOnlyXApiKey: false,
    productionLiveTokenShape: false,
    nonProductionLengthCap: false,
    productionRejectsDevKeys: false,
    tokenTrimmedBeforeValidation: false,
    invalidShapeBeforeLookup: false,
    persistedLookupBeforeDevLookup: false,
    missingTokenUnauthenticated: false,
    invalidTokenUnauthenticated: false,
    revokedUnauthenticated: false,
    suspendedForbidden: false,
    inactiveSubscriptionForbidden: false,
    successReturnsEntitlementSnapshotAndRecord: false,
    productionAuthDetailsRedacted: false,

    devHashUsesSha256: false,
    constantTimeHexCompare: false,
    persistedHashUsesScrypt: false,
    persistedHashRequiresScryptPrefix: false,
    persistedLookupByPrefix: false,
    persistedPrefixLength12: false,
    persistedSubscriptionLatestOnly: false,
    persistedHashVerifiedBeforeMapping: false,
    prismaStatusMapping: false,
    persistedEntitlementMapping: false,
    lastUsedThrottledFiveMinutes: false,
    lastUsedDoesNotUpdateRevoked: false,
    devKeysLoadedOnlyFromEnvJson: false,
  };

  if (!result.validateTokenExists) {
    addFinding(
      findings,
      "fail",
      "D-027",
      "VALIDATE_TOKEN_MODULE_MISSING",
      path.relative(root, validateTokenPath),
      "validateToken.ts is missing."
    );
  }

  if (!result.apiKeysExists) {
    addFinding(
      findings,
      "fail",
      "D-027",
      "API_KEYS_MODULE_MISSING",
      path.relative(root, apiKeysPath),
      "apiKeys.ts is missing."
    );
  }

  const validateSource = result.validateTokenExists
    ? fs.readFileSync(validateTokenPath, "utf8").replace(/^\uFEFF/u, "")
    : "";

  const apiKeysSource = result.apiKeysExists
    ? fs.readFileSync(apiKeysPath, "utf8").replace(/^\uFEFF/u, "")
    : "";

  if (validateSource) {
    const normalizedValidateSource = validateSource.replace(/\r\n/gu, "\n");
    const shapeIndex = normalizedValidateSource.indexOf("if (!isAllowedApiKeyShape(normalized))");
    const lookupIndex = normalizedValidateSource.indexOf("const record = await resolveApiKeyRecord(normalized);");
    const persistedLookupIndex = normalizedValidateSource.indexOf("const persistedRecord = await findPersistedApiKeyRecord(token);");
    const devKeysAllowedIndex = normalizedValidateSource.indexOf("if (!canUseDevelopmentApiKeys())");
    const revokedIndex = normalizedValidateSource.indexOf('if (record.state === "REVOKED")');
    const suspendedIndex = normalizedValidateSource.indexOf('if (record.state === "SUSPENDED")');
    const snapshotIndex = normalizedValidateSource.indexOf("const snapshot = buildEntitlementSnapshot(record.entitlement);");
    const inactiveIndex = normalizedValidateSource.indexOf('if (record.entitlement.status !== "active")');

    result.headerOnlyXApiKey =
      validateSource.includes('const API_KEY_HEADER = "x-api-key";') &&
      validateSource.includes("headers.get(API_KEY_HEADER)?.trim()") &&
      !validateSource.includes("authorization") &&
      !validateSource.includes("Bearer ");

    result.productionLiveTokenShape =
      validateSource.includes("const PERSISTED_API_KEY_PATTERN = /^ta_live_[a-f0-9]{48}$/;") &&
      validateSource.includes("return isPersistedApiKeyShape(token);");

    result.nonProductionLengthCap =
      validateSource.includes("const MAX_NON_PRODUCTION_API_KEY_LENGTH = 512;") &&
      validateSource.includes("return token.length <= MAX_NON_PRODUCTION_API_KEY_LENGTH;");

    result.productionRejectsDevKeys =
      validateSource.includes('process.env.NODE_ENV === "production"') &&
      validateSource.includes('process.env.VERCEL_ENV === "production"') &&
      validateSource.includes("return false;") &&
      validateSource.includes("DEV_API_KEYS_JSON");

    result.tokenTrimmedBeforeValidation =
      validateSource.includes("const normalized = token.trim();") &&
      validateSource.includes("if (!normalized)");

    result.invalidShapeBeforeLookup =
      shapeIndex >= 0 &&
      lookupIndex >= 0 &&
      shapeIndex < lookupIndex;

    result.persistedLookupBeforeDevLookup =
      persistedLookupIndex >= 0 &&
      devKeysAllowedIndex >= 0 &&
      persistedLookupIndex < devKeysAllowedIndex;

    result.missingTokenUnauthenticated =
      validateSource.includes('message: "Missing API key."') &&
      validateSource.includes('detail: "Provide X-API-Key header."') &&
      validateSource.includes('code: "unauthenticated"');

    result.invalidTokenUnauthenticated =
      validateSource.includes('message: "Invalid API key."') &&
      validateSource.includes('detail: "invalid_key_shape"') &&
      validateSource.includes("Token hash did not match any configured key.");

    result.revokedUnauthenticated =
      revokedIndex >= 0 &&
      validateSource.includes('message: "API key is revoked."') &&
      validateSource.includes('detail: "revoked_key"') &&
      validateSource.includes('code: "unauthenticated"');

    result.suspendedForbidden =
      suspendedIndex >= 0 &&
      validateSource.includes('message: "API key is suspended."') &&
      validateSource.includes('detail: "suspended_key"') &&
      validateSource.includes('code: "forbidden"');

    result.inactiveSubscriptionForbidden =
      inactiveIndex >= 0 &&
      snapshotIndex >= 0 &&
      validateSource.includes('message: "Subscription is inactive."') &&
      validateSource.includes('detail: "inactive_subscription"') &&
      validateSource.includes('code: "forbidden"');
    result.successReturnsEntitlementSnapshotAndRecord =
      snapshotIndex >= 0 &&
      inactiveIndex >= 0 &&
      snapshotIndex < inactiveIndex &&
      /return\s*\{\s*ok:\s*true,[\s\S]*?accountId:\s*record\.accountId[\s\S]*?userId:\s*record\.userId[\s\S]*?keyId:\s*record\.keyId[\s\S]*?entitlement:\s*record\.entitlement[\s\S]*?snapshot\s*,[\s\S]*?record\s*,[\s\S]*?\};/u.test(normalizedValidateSource);

    result.productionAuthDetailsRedacted =
      validateSource.includes("function publicAuthErrorDetail(") &&
      validateSource.includes('process.env.NODE_ENV !== "production"') &&
      validateSource.includes('process.env.VERCEL_ENV !== "production"') &&
      validateSource.includes('return result.code === "unauthenticated" ? "authentication_failed" : "request_forbidden";');
  }

  if (apiKeysSource) {
    const normalizedApiKeysSource = apiKeysSource.replace(/\r\n/gu, "\n");
    const persistedCandidateLoopIndex = normalizedApiKeysSource.indexOf("for (const candidate of candidates)");
    const persistedHashVerifyIndex = normalizedApiKeysSource.indexOf("verifyPersistedApiKeyHash(normalized, candidate.keyHash)");
    const mapCandidateIndex = normalizedApiKeysSource.indexOf("return mapPersistedCandidateToApiKeyRecord(candidate);");

    result.devHashUsesSha256 =
      apiKeysSource.includes('crypto.createHash("sha256").update(token, "utf8").digest("hex")');

    result.constantTimeHexCompare =
      apiKeysSource.includes("crypto.timingSafeEqual(aBuf, bBuf)") &&
      apiKeysSource.includes("if (aBuf.length !== bBuf.length)") &&
      apiKeysSource.includes("return false;");

    result.persistedHashUsesScrypt =
      apiKeysSource.includes("crypto.scryptSync(trimmedToken, salt, 64).toString(\"hex\")") &&
      apiKeysSource.includes("constantTimeHexEqual(actualDerived, expectedDerived)");

    result.persistedHashRequiresScryptPrefix =
      apiKeysSource.includes('!storedHash.startsWith("scrypt:")') &&
      apiKeysSource.includes("const parts = storedHash.split(\":\");") &&
      apiKeysSource.includes("if (parts.length !== 3)");

    result.persistedLookupByPrefix =
      apiKeysSource.includes("const keyPrefix = buildPersistedApiKeyPrefix(normalized);") &&
      /where:\s*\{\s*keyPrefix\s*,/u.test(normalizedApiKeysSource) &&
      apiKeysSource.includes("db.apiKey.findMany");

    result.persistedPrefixLength12 =
      apiKeysSource.includes("export function buildPersistedApiKeyPrefix(token: string): string") &&
      apiKeysSource.includes("return token.slice(0, Math.min(12, token.length));");

    result.persistedSubscriptionLatestOnly =
      apiKeysSource.includes("subscriptions: {") &&
      apiKeysSource.includes('updatedAt: "desc"') &&
      apiKeysSource.includes("take: 1") &&
      /const latestSubscription = \[\.\.\.candidate\.account\.subscriptions\]\.sort\(/u.test(normalizedApiKeysSource);

    result.persistedHashVerifiedBeforeMapping =
      persistedCandidateLoopIndex >= 0 &&
      persistedHashVerifyIndex >= 0 &&
      mapCandidateIndex >= 0 &&
      persistedCandidateLoopIndex < persistedHashVerifyIndex &&
      persistedHashVerifyIndex < mapCandidateIndex;

    result.prismaStatusMapping =
      apiKeysSource.includes("function mapPrismaApiKeyStatus(status: ApiKeyStatus): ApiKeyState") &&
      apiKeysSource.includes("ApiKeyStatus.suspended") &&
      apiKeysSource.includes("ApiKeyStatus.revoked") &&
      apiKeysSource.includes('return "ACTIVE";');

    result.persistedEntitlementMapping =
      apiKeysSource.includes("function buildPersistedEntitlement(candidate: PersistedApiKeyCandidate): EntitlementInput") &&
      apiKeysSource.includes("createPublicEntitlement()") &&
      apiKeysSource.includes("createBasicEntitlement(entitledChain") &&
      apiKeysSource.includes("createProEntitlement({") &&
      apiKeysSource.includes("normalizePersistedEntitledChain");

    result.lastUsedThrottledFiveMinutes =
      apiKeysSource.includes("const LAST_USED_UPDATE_INTERVAL_MS = 5 * 60 * 1000;") &&
      apiKeysSource.includes("Date.now() - parsed.getTime() >= LAST_USED_UPDATE_INTERVAL_MS");

    result.lastUsedDoesNotUpdateRevoked =
      apiKeysSource.includes("await db.apiKey.updateMany({") &&
      /status:\s*\{\s*not:\s*ApiKeyStatus\.revoked/u.test(normalizedApiKeysSource) &&
      apiKeysSource.includes("lastUsedAt: new Date()");

    result.devKeysLoadedOnlyFromEnvJson =
      apiKeysSource.includes("process.env.DEV_API_KEYS_JSON") &&
      apiKeysSource.includes("parseDevApiKeysJson(raw)") &&
      apiKeysSource.includes("return [];");
  }

  const requiredChecks = [
    ["API_AUTH_HEADER_CONTRACT_INVALID", result.headerOnlyXApiKey, "API key auth must use X-API-Key header only, not Authorization/Bearer."],
    ["API_AUTH_PRODUCTION_TOKEN_SHAPE_INVALID", result.productionLiveTokenShape, "Production API keys must match ta_live_[48 lowercase hex] shape."],
    ["API_AUTH_NON_PROD_LENGTH_CAP_MISSING", result.nonProductionLengthCap, "Non-production dev key shape must retain a finite max length cap."],
    ["API_AUTH_DEV_KEYS_ALLOWED_IN_PRODUCTION", result.productionRejectsDevKeys, "Development API keys must be disabled in production."],
    ["API_AUTH_TOKEN_TRIM_MISSING", result.tokenTrimmedBeforeValidation, "API keys must be trimmed and empty normalized tokens rejected."],
    ["API_AUTH_LOOKUP_BEFORE_SHAPE_CHECK", result.invalidShapeBeforeLookup, "Token shape must be validated before DB/dev lookup."],
    ["API_AUTH_DEV_LOOKUP_BEFORE_PERSISTED_LOOKUP", result.persistedLookupBeforeDevLookup, "Persisted key lookup must run before dev key lookup."],
    ["API_AUTH_MISSING_TOKEN_RESPONSE_INVALID", result.missingTokenUnauthenticated, "Missing token must return unauthenticated with X-API-Key guidance."],
    ["API_AUTH_INVALID_TOKEN_RESPONSE_INVALID", result.invalidTokenUnauthenticated, "Invalid token/shape must return unauthenticated."],
    ["API_AUTH_REVOKED_KEY_RESPONSE_INVALID", result.revokedUnauthenticated, "Revoked keys must be unauthenticated."],
    ["API_AUTH_SUSPENDED_KEY_RESPONSE_INVALID", result.suspendedForbidden, "Suspended keys must be forbidden."],
    ["API_AUTH_INACTIVE_SUBSCRIPTION_RESPONSE_INVALID", result.inactiveSubscriptionForbidden, "Inactive subscriptions must be forbidden."],
    ["API_AUTH_SUCCESS_PAYLOAD_INCOMPLETE", result.successReturnsEntitlementSnapshotAndRecord, "Successful validation must return entitlement snapshot and source record."],
    ["API_AUTH_PRODUCTION_DETAIL_REDACTION_MISSING", result.productionAuthDetailsRedacted, "Production auth errors must redact internal detail."],
    ["API_KEYS_DEV_HASH_INVALID", result.devHashUsesSha256, "Development key records must hash tokens with SHA-256."],
    ["API_KEYS_CONSTANT_TIME_COMPARE_MISSING", result.constantTimeHexCompare, "Hash comparison must use timingSafeEqual with length guard."],
    ["API_KEYS_PERSISTED_HASH_INVALID", result.persistedHashUsesScrypt, "Persisted API keys must verify scrypt-derived hashes."],
    ["API_KEYS_PERSISTED_HASH_PREFIX_GUARD_MISSING", result.persistedHashRequiresScryptPrefix, "Persisted hashes must require scrypt: prefix and expected parts."],
    ["API_KEYS_PERSISTED_PREFIX_LOOKUP_MISSING", result.persistedLookupByPrefix, "Persisted lookup must query by keyPrefix before hash verification."],
    ["API_KEYS_PERSISTED_PREFIX_LENGTH_INVALID", result.persistedPrefixLength12, "Persisted API key prefix must use first 12 chars."],
    ["API_KEYS_SUBSCRIPTION_LATEST_ONLY_INVALID", result.persistedSubscriptionLatestOnly, "Persisted entitlement must use latest subscription by updatedAt desc."],
    ["API_KEYS_HASH_VERIFY_BEFORE_MAPPING_INVALID", result.persistedHashVerifiedBeforeMapping, "Persisted candidate hash must be verified before mapping/returning a record."],
    ["API_KEYS_PRISMA_STATUS_MAPPING_INVALID", result.prismaStatusMapping, "Prisma API key statuses must map active/suspended/revoked correctly."],
    ["API_KEYS_PERSISTED_ENTITLEMENT_MAPPING_INVALID", result.persistedEntitlementMapping, "Persisted account subscription must map to public/basic/pro entitlement correctly."],
    ["API_KEYS_LAST_USED_THROTTLE_INVALID", result.lastUsedThrottledFiveMinutes, "lastUsedAt updates must be throttled to a 5-minute interval."],
    ["API_KEYS_LAST_USED_REVOKED_GUARD_MISSING", result.lastUsedDoesNotUpdateRevoked, "lastUsedAt update must not update revoked keys."],
    ["API_KEYS_DEV_ENV_JSON_CONTRACT_INVALID", result.devKeysLoadedOnlyFromEnvJson, "Development keys must load only from DEV_API_KEYS_JSON and invalid JSON must produce no keys."]
  ];

  for (const [code, ok, detail] of requiredChecks) {
    if (!ok) {
      addFinding(
        findings,
        "fail",
        "D-027",
        code,
        code.startsWith("API_KEYS_") ? path.relative(root, apiKeysPath) : path.relative(root, validateTokenPath),
        detail
      );
    }
  }

  return result;
}
function prismaModelBlock(source, modelName) {
  const pattern = new RegExp(`model\\s+${modelName}\\s+\\{([\\s\\S]*?)\\n\\}`, "u");
  const match = source.match(pattern);
  return match ? match[1] : "";
}

function prismaEnumBlock(source, enumName) {
  const pattern = new RegExp(`enum\\s+${enumName}\\s+\\{([\\s\\S]*?)\\n\\}`, "u");
  const match = source.match(pattern);
  return match ? match[1] : "";
}
function evaluateDatabaseAuthSchemaContract(findings) {
  const result = {
    prismaSchemaExists: fs.existsSync(prismaSchemaPath),
    datasourceUsesPostgresAndEnvUrls: false,
    subscriptionTierEnumValid: false,
    subscriptionStatusEnumValid: false,
    apiKeyStatusEnumValid: false,
    accountModelValid: false,
    subscriptionModelValid: false,
    subscriptionIndexesValid: false,
    apiKeyModelValid: false,
    apiKeyIndexesValid: false,
    customOutputModelValid: false,
    customOutputIndexesValid: false,
  };

  if (!result.prismaSchemaExists) {
    addFinding(
      findings,
      "fail",
      "D-028",
      "PRISMA_SCHEMA_MISSING",
      path.relative(root, prismaSchemaPath),
      "Prisma schema is missing."
    );

    return result;
  }

  const source = fs.readFileSync(prismaSchemaPath, "utf8").replace(/^\uFEFF/u, "");

  const subscriptionTier = prismaEnumBlock(source, "SubscriptionTier");
  const subscriptionStatus = prismaEnumBlock(source, "SubscriptionStatus");
  const apiKeyStatus = prismaEnumBlock(source, "ApiKeyStatus");
  const account = prismaModelBlock(source, "Account");
  const subscription = prismaModelBlock(source, "Subscription");
  const apiKey = prismaModelBlock(source, "ApiKey");
  const customOutput = prismaModelBlock(source, "CustomOutput");

  result.datasourceUsesPostgresAndEnvUrls =
    source.includes('provider  = "postgresql"') &&
    source.includes('url       = env("DATABASE_URL")') &&
    source.includes('directUrl = env("DIRECT_URL")');

  result.subscriptionTierEnumValid =
    /\bbasic\b/u.test(subscriptionTier) &&
    /\bpro\b/u.test(subscriptionTier) &&
    !/\bpublic\b/u.test(subscriptionTier);

  result.subscriptionStatusEnumValid =
    /\bactive\b/u.test(subscriptionStatus) &&
    /\binactive\b/u.test(subscriptionStatus);

  result.apiKeyStatusEnumValid =
    /\bactive\b/u.test(apiKeyStatus) &&
    /\bsuspended\b/u.test(apiKeyStatus) &&
    /\brevoked\b/u.test(apiKeyStatus);

  result.accountModelValid =
    account.includes("id                 String         @id @default(uuid()) @db.Uuid") &&
    account.includes("authProviderUserId String         @unique @map(\"auth_provider_user_id\")") &&
    account.includes("email              String?") &&
    account.includes("subscriptions      Subscription[]") &&
    account.includes("apiKeys            ApiKey[]") &&
    account.includes("customOutputs      CustomOutput[]") &&
    account.includes("@@map(\"accounts\")");

  result.subscriptionModelValid =
    subscription.includes("id                   String             @id @default(uuid()) @db.Uuid") &&
    subscription.includes("accountId            String             @map(\"account_id\") @db.Uuid") &&
    subscription.includes("stripeCustomerId     String             @unique @map(\"stripe_customer_id\")") &&
    subscription.includes("stripeSubscriptionId String?            @unique @map(\"stripe_subscription_id\")") &&
    subscription.includes("tier                 SubscriptionTier") &&
    subscription.includes("historyUnlocked      Boolean            @default(false) @map(\"history_unlocked\")") &&
    subscription.includes("entitledChain        String?            @map(\"entitled_chain\")") &&
    subscription.includes("status               SubscriptionStatus") &&
    subscription.includes("updatedAt            DateTime           @default(now()) @updatedAt @map(\"updated_at\") @db.Timestamptz(6)") &&
    subscription.includes("@relation(fields: [accountId], references: [id], onDelete: Cascade)") &&
    subscription.includes("@@map(\"subscriptions\")");

  result.subscriptionIndexesValid =
    subscription.includes("@@index([accountId], map: \"subscriptions_account_id_idx\")") &&
    subscription.includes("@@index([status], map: \"subscriptions_status_idx\")") &&
    subscription.includes("@@index([tier], map: \"subscriptions_tier_idx\")") &&
    subscription.includes("@@index([entitledChain], map: \"subscriptions_entitled_chain_idx\")");

  result.apiKeyModelValid =
    apiKey.includes("id          String       @id @default(uuid()) @db.Uuid") &&
    apiKey.includes("accountId   String       @map(\"account_id\") @db.Uuid") &&
    apiKey.includes("keyHash     String       @unique @map(\"key_hash\")") &&
    apiKey.includes("keyPrefix   String       @map(\"key_prefix\")") &&
    apiKey.includes("keyLast4    String?      @map(\"key_last4\")") &&
    apiKey.includes("label       String?") &&
    apiKey.includes("status      ApiKeyStatus") &&
    apiKey.includes("createdAt   DateTime     @default(now()) @map(\"created_at\") @db.Timestamptz(6)") &&
    apiKey.includes("lastUsedAt  DateTime?    @map(\"last_used_at\") @db.Timestamptz(6)") &&
    apiKey.includes("@relation(fields: [accountId], references: [id], onDelete: Cascade)") &&
    apiKey.includes("@@map(\"api_keys\")");

  result.apiKeyIndexesValid =
    apiKey.includes("@@index([accountId], map: \"api_keys_account_id_idx\")") &&
    apiKey.includes("@@index([status], map: \"api_keys_status_idx\")") &&
    apiKey.includes("@@index([keyPrefix], map: \"api_keys_key_prefix_idx\")");

  result.customOutputModelValid =
    customOutput.includes("id                  String    @id @default(uuid()) @db.Uuid") &&
    customOutput.includes("accountId           String    @map(\"account_id\") @db.Uuid") &&
    customOutput.includes("canonicalRevisionId Int       @map(\"canonical_revision_id\")") &&
    customOutput.includes("identityHash        String    @map(\"identity_hash\")") &&
    customOutput.includes("thresholdsJson      Json      @map(\"thresholds_json\")") &&
    customOutput.includes("storagePath         String    @map(\"storage_path\")") &&
    customOutput.includes("@relation(fields: [accountId], references: [id], onDelete: Cascade)") &&
    customOutput.includes("@@map(\"custom_outputs\")");

  result.customOutputIndexesValid =
    customOutput.includes("@@unique([accountId, identityHash], map: \"custom_outputs_account_id_identity_hash_key\")") &&
    customOutput.includes("@@index([accountId], map: \"custom_outputs_account_id_idx\")") &&
    customOutput.includes("@@index([canonicalRevisionId], map: \"custom_outputs_canonical_revision_id_idx\")");

  const requiredChecks = [
    ["PRISMA_DATASOURCE_INVALID", result.datasourceUsesPostgresAndEnvUrls, "Datasource must be PostgreSQL with DATABASE_URL and DIRECT_URL env vars."],
    ["PRISMA_SUBSCRIPTION_TIER_ENUM_INVALID", result.subscriptionTierEnumValid, "SubscriptionTier enum must be basic/pro only. Public is an entitlement state, not a persisted paid subscription tier."],
    ["PRISMA_SUBSCRIPTION_STATUS_ENUM_INVALID", result.subscriptionStatusEnumValid, "SubscriptionStatus enum must include active and inactive."],
    ["PRISMA_API_KEY_STATUS_ENUM_INVALID", result.apiKeyStatusEnumValid, "ApiKeyStatus enum must include active, suspended, revoked."],
    ["PRISMA_ACCOUNT_MODEL_INVALID", result.accountModelValid, "Account model must preserve auth provider id, subscriptions, API keys, and custom outputs relations."],
    ["PRISMA_SUBSCRIPTION_MODEL_INVALID", result.subscriptionModelValid, "Subscription model must preserve Stripe ids, tier/status, entitled chain, history unlock, updatedAt, and cascade account relation."],
    ["PRISMA_SUBSCRIPTION_INDEXES_INVALID", result.subscriptionIndexesValid, "Subscription indexes must cover accountId, status, tier, and entitledChain."],
    ["PRISMA_API_KEY_MODEL_INVALID", result.apiKeyModelValid, "ApiKey model must preserve hash, prefix, last4, status, timestamps, and cascade account relation."],
    ["PRISMA_API_KEY_INDEXES_INVALID", result.apiKeyIndexesValid, "ApiKey indexes must cover accountId, status, and keyPrefix."],
    ["PRISMA_CUSTOM_OUTPUT_MODEL_INVALID", result.customOutputModelValid, "CustomOutput model must preserve account, canonical revision, identity hash, thresholds JSON, and storage path."],
    ["PRISMA_CUSTOM_OUTPUT_INDEXES_INVALID", result.customOutputIndexesValid, "CustomOutput indexes must cover unique account+identityHash, accountId, and canonicalRevisionId."]
  ];

  for (const [code, ok, detail] of requiredChecks) {
    if (!ok) {
      addFinding(
        findings,
        "fail",
        "D-028",
        code,
        path.relative(root, prismaSchemaPath),
        detail
      );
    }
  }

  return result;
}
function evaluateStorageAdapterContract(findings) {
  const result = {
    storageIndexExists: fs.existsSync(storageIndexPath),
    localStorageExists: fs.existsSync(localStoragePath),
    s3StorageExists: fs.existsSync(s3StoragePath),

    indexDataSourceUnionValid: false,
    indexDefaultsToLocal: false,
    indexSelectsS3OnlyWhenExplicit: false,
    indexNormalizesPublishedPrefix: false,
    indexDispatchesByDataSource: false,

    localReturnsUniformShape: false,
    localInfersContentTypes: false,
    localSupportsConfiguredRoot: false,
    localCandidateRootsValid: false,
    localDoesNotUsePublicFallback: false,
    localReadsOnlyFiles: false,
    localEnoentReturnsNull: false,
    localUnexpectedErrorThrows: false,

    s3UsesAwsSdk: false,
    s3EnvContractValid: false,
    s3PrefixDefaultValid: false,
    s3OptionalEndpointCredentialsValid: false,
    s3ForcePathStyleValid: false,
    s3KeyJoinNormalizesLeadingSlash: false,
    s3FailsWhenNotConfigured: false,
    s3UsesGetObjectBucketKey: false,
    s3ReturnsUniformShape: false,
    s3NotFoundReturnsNull: false,
    s3UnexpectedErrorThrows: false,
  };

  if (!result.storageIndexExists) {
    addFinding(findings, "fail", "D-029", "STORAGE_INDEX_MODULE_MISSING", path.relative(root, storageIndexPath), "Storage index module is missing.");
  }

  if (!result.localStorageExists) {
    addFinding(findings, "fail", "D-029", "LOCAL_STORAGE_MODULE_MISSING", path.relative(root, localStoragePath), "Local storage module is missing.");
  }

  if (!result.s3StorageExists) {
    addFinding(findings, "fail", "D-029", "S3_STORAGE_MODULE_MISSING", path.relative(root, s3StoragePath), "S3 storage module is missing.");
  }

  const indexSource = result.storageIndexExists
    ? fs.readFileSync(storageIndexPath, "utf8").replace(/^\uFEFF/u, "")
    : "";

  const localSource = result.localStorageExists
    ? fs.readFileSync(localStoragePath, "utf8").replace(/^\uFEFF/u, "")
    : "";

  const s3Source = result.s3StorageExists
    ? fs.readFileSync(s3StoragePath, "utf8").replace(/^\uFEFF/u, "")
    : "";

  if (indexSource) {
    result.indexDataSourceUnionValid =
      indexSource.includes('export type DataSource = "local" | "s3";');

    result.indexDefaultsToLocal =
      indexSource.includes("return \"local\";") &&
      indexSource.includes("const raw = process.env.DATA_SOURCE?.trim().toLowerCase();");

    result.indexSelectsS3OnlyWhenExplicit =
      indexSource.includes('if (raw === "s3")') &&
      indexSource.includes('return "s3";');

    result.indexNormalizesPublishedPrefix =
      indexSource.includes('storagePath.replace(/^\\/+/, "")') &&
      indexSource.includes('cleaned.startsWith("data/published/v1/")') &&
      indexSource.includes('return cleaned.slice("data/published/v1/".length);') &&
      indexSource.includes('if (cleaned === "data/published/v1")') &&
      indexSource.includes('return "";');

    result.indexDispatchesByDataSource =
      indexSource.includes("const source = getDataSource();") &&
      indexSource.includes("const normalizedPath = normalizeStoragePath(storagePath);") &&
      indexSource.includes('if (source === "s3")') &&
      indexSource.includes("return readS3StorageObject(normalizedPath);") &&
      indexSource.includes("return readLocalStorageObject(normalizedPath);");
  }

  if (localSource) {
    result.localReturnsUniformShape =
      localSource.includes("body: ArrayBuffer;") &&
      localSource.includes("contentType: string;") &&
      localSource.includes("contentLength: number;") &&
      localSource.includes("etag: string | null;") &&
      localSource.includes("lastModified: string | null;") &&
      localSource.includes('source: "local";');

    result.localInfersContentTypes =
      localSource.includes('storagePath.endsWith(".json")') &&
      localSource.includes('"application/json; charset=utf-8"') &&
      localSource.includes('storagePath.endsWith(".csv")') &&
      localSource.includes('"text/csv; charset=utf-8"') &&
      localSource.includes('storagePath.endsWith(".parquet")') &&
      localSource.includes('"application/octet-stream"');

    result.localSupportsConfiguredRoot =
      localSource.includes("process.env.LOCAL_DATA_PATH?.trim()") &&
      localSource.includes("if (configured)") &&
      localSource.includes("return [configured];");

    result.localCandidateRootsValid =
      localSource.includes('path.join(appRoot, "..", "data", "published", "v1")') &&
      localSource.includes('path.join(appRoot, "data", "published", "v1")') &&
      localSource.includes('path.join(appRoot, ".private-data", "published", "v1")');

    result.localDoesNotUsePublicFallback =
      !/path\.join\(\s*appRoot\s*,\s*["']public["']\s*,\s*["']data["']\s*,\s*["']published["']\s*,\s*["']v1["']\s*\)/u.test(localSource);

    result.localReadsOnlyFiles =
      localSource.includes("const stat = await fs.stat(absolutePath);") &&
      localSource.includes("if (!stat.isFile())") &&
      localSource.includes("return null;");

    result.localEnoentReturnsNull =
      localSource.includes('if (code === "ENOENT")') &&
      localSource.includes("return null;");

    result.localUnexpectedErrorThrows =
      localSource.includes("throw new Error(") &&
      localSource.includes("Failed to read local storage object");
  }

  if (s3Source) {
    result.s3UsesAwsSdk =
      s3Source.includes('import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";');

    result.s3EnvContractValid =
      s3Source.includes('getEnv("S3_REGION")') &&
      s3Source.includes('getEnv("S3_BUCKET")') &&
      s3Source.includes('getEnv("S3_ENDPOINT")') &&
      s3Source.includes('getEnv("S3_ACCESS_KEY_ID")') &&
      s3Source.includes('getEnv("S3_SECRET_ACCESS_KEY")');

    result.s3PrefixDefaultValid =
      s3Source.includes('process.env.S3_PREFIX ?? "published/v1"') &&
      s3Source.includes('raw.replace(/^\\/+|\\/+$/g, "")');

    result.s3OptionalEndpointCredentialsValid =
      s3Source.includes("if (endpoint)") &&
      s3Source.includes("config.endpoint = endpoint;") &&
      s3Source.includes("if (accessKeyId && secretAccessKey)") &&
      s3Source.includes("config.credentials = {") &&
      s3Source.includes("accessKeyId,") &&
      s3Source.includes("secretAccessKey,");

    result.s3ForcePathStyleValid =
      s3Source.includes("process.env.S3_FORCE_PATH_STYLE?.trim().toLowerCase()") &&
      s3Source.includes('raw === "1" || raw === "true" || raw === "yes"') &&
      s3Source.includes("config.forcePathStyle = getS3ForcePathStyle();");

    result.s3KeyJoinNormalizesLeadingSlash =
      s3Source.includes('const cleanedPath = storagePath.replace(/^\\/+/, "");') &&
      s3Source.includes("return prefix ? `${prefix}/${cleanedPath}` : cleanedPath;");

    result.s3FailsWhenNotConfigured =
      s3Source.includes("if (!client || !bucket)") &&
      s3Source.includes("S3-compatible storage is not configured. Missing S3_REGION or S3_BUCKET.");

    result.s3UsesGetObjectBucketKey =
      s3Source.includes("const command = new GetObjectCommand({") &&
      s3Source.includes("Bucket: bucket,") &&
      s3Source.includes("Key: joinS3Key(storagePath),") &&
      s3Source.includes("const response = await client.send(command);");

    result.s3ReturnsUniformShape =
      s3Source.includes("body: ArrayBuffer;") &&
      s3Source.includes("contentType: string;") &&
      s3Source.includes("contentLength: number;") &&
      s3Source.includes("etag: string | null;") &&
      s3Source.includes("lastModified: string | null;") &&
      s3Source.includes('source: "s3";') &&
      s3Source.includes("contentType: response.ContentType ?? \"application/octet-stream\"") &&
      s3Source.includes("contentLength: response.ContentLength ?? body.byteLength") &&
      s3Source.includes("etag: response.ETag ?? null") &&
      s3Source.includes("lastModified: response.LastModified?.toISOString() ?? null");

    result.s3NotFoundReturnsNull =
      s3Source.includes('message.includes("NoSuchKey")') &&
      s3Source.includes('message.includes("The specified key does not exist")') &&
      s3Source.includes('message.includes("NotFound")') &&
      s3Source.includes("return null;");

    result.s3UnexpectedErrorThrows =
      s3Source.includes("throw error;");
  }

  const requiredChecks = [
    ["STORAGE_INDEX_DATA_SOURCE_UNION_INVALID", result.indexDataSourceUnionValid, "Storage data source must be local | s3."],
    ["STORAGE_INDEX_DEFAULT_LOCAL_INVALID", result.indexDefaultsToLocal, "Storage source must default to local unless DATA_SOURCE=s3."],
    ["STORAGE_INDEX_S3_SELECTION_INVALID", result.indexSelectsS3OnlyWhenExplicit, "S3 storage must only be selected by explicit DATA_SOURCE=s3."],
    ["STORAGE_INDEX_PREFIX_NORMALIZATION_INVALID", result.indexNormalizesPublishedPrefix, "Storage index must normalize leading slashes and data/published/v1 prefix."],
    ["STORAGE_INDEX_DISPATCH_INVALID", result.indexDispatchesByDataSource, "Storage index must dispatch normalized paths to S3/local readers."],

    ["LOCAL_STORAGE_RESULT_SHAPE_INVALID", result.localReturnsUniformShape, "Local storage result shape must match file API response expectations."],
    ["LOCAL_STORAGE_CONTENT_TYPES_INVALID", result.localInfersContentTypes, "Local storage must infer JSON/CSV/TXT/Parquet content types."],
    ["LOCAL_STORAGE_CONFIGURED_ROOT_INVALID", result.localSupportsConfiguredRoot, "Local storage must allow LOCAL_DATA_PATH override."],
    ["LOCAL_STORAGE_CANDIDATE_ROOTS_INVALID", result.localCandidateRootsValid, "Local storage roots must include canonical repo data, app data, and .private-data mirror."],
    ["LOCAL_STORAGE_PUBLIC_FALLBACK_PRESENT", result.localDoesNotUsePublicFallback, "Local storage must not read subscriber-bound data from web public published root."],
    ["LOCAL_STORAGE_FILE_ONLY_INVALID", result.localReadsOnlyFiles, "Local storage must only return regular files."],
    ["LOCAL_STORAGE_ENOENT_NULL_INVALID", result.localEnoentReturnsNull, "Local storage missing files must return null."],
    ["LOCAL_STORAGE_UNEXPECTED_ERROR_NOT_THROWN", result.localUnexpectedErrorThrows, "Local storage unexpected errors must throw."],

    ["S3_STORAGE_AWS_SDK_IMPORT_INVALID", result.s3UsesAwsSdk, "S3 storage must use AWS SDK S3Client/GetObjectCommand."],
    ["S3_STORAGE_ENV_CONTRACT_INVALID", result.s3EnvContractValid, "S3 storage must read S3_REGION, S3_BUCKET, S3_ENDPOINT, S3_ACCESS_KEY_ID, and S3_SECRET_ACCESS_KEY."],
    ["S3_STORAGE_PREFIX_DEFAULT_INVALID", result.s3PrefixDefaultValid, "S3 storage prefix must default to published/v1 and trim slashes."],
    ["S3_STORAGE_ENDPOINT_CREDENTIALS_INVALID", result.s3OptionalEndpointCredentialsValid, "S3 storage must support optional endpoint and explicit credentials."],
    ["S3_STORAGE_FORCE_PATH_STYLE_INVALID", result.s3ForcePathStyleValid, "S3 storage must support S3_FORCE_PATH_STYLE for S3-compatible storage."],
    ["S3_STORAGE_KEY_JOIN_INVALID", result.s3KeyJoinNormalizesLeadingSlash, "S3 storage must normalize leading slashes before prefixing keys."],
    ["S3_STORAGE_CONFIG_FAIL_INVALID", result.s3FailsWhenNotConfigured, "S3 storage must fail when S3_REGION or S3_BUCKET is missing."],
    ["S3_STORAGE_GET_OBJECT_INVALID", result.s3UsesGetObjectBucketKey, "S3 storage must read objects using bucket and joined storage key."],
    ["S3_STORAGE_RESULT_SHAPE_INVALID", result.s3ReturnsUniformShape, "S3 storage result shape must match file API response expectations."],
    ["S3_STORAGE_NOT_FOUND_NULL_INVALID", result.s3NotFoundReturnsNull, "S3 not-found errors must return null."],
    ["S3_STORAGE_UNEXPECTED_ERROR_NOT_THROWN", result.s3UnexpectedErrorThrows, "Unexpected S3 errors must be rethrown."]
  ];

  for (const [code, ok, detail] of requiredChecks) {
    if (!ok) {
      let targetPath = storageIndexPath;
      if (code.startsWith("LOCAL_STORAGE_")) targetPath = localStoragePath;
      if (code.startsWith("S3_STORAGE_")) targetPath = s3StoragePath;

      addFinding(
        findings,
        "fail",
        "D-029",
        code,
        path.relative(root, targetPath),
        detail
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
  const s3StorageContract = evaluateS3StorageContract(findings);
  const pipelinePublishOrderContract = evaluatePipelinePublishOrderContract(findings);
  const revisionProvenanceContract = evaluateRevisionProvenanceContract(findings, inventory);
  const historicalDerivedCoverageContract = evaluateHistoricalDerivedCoverageContract(findings, inventory);
  const snapshotMetadataHarmonizerContract = evaluateSnapshotMetadataHarmonizerContract(findings);
  const repoHygieneContract = evaluateRepoHygieneContract(findings);
  const publishScriptGateContract = evaluatePublishScriptGateContract(findings);
  const postRebaseWorkflowGateContract = evaluatePostRebaseWorkflowGateContract(findings);
  const workflowDeployContract = evaluateWorkflowDeployContract(findings);
  const syncScriptMirrorContract = evaluateSyncScriptMirrorContract(findings);
  const publicPrivateArtifactBoundaryContract = evaluatePublicPrivateArtifactBoundaryContract(findings);
  const fileApiResponseBoundaryContract = evaluateFileApiResponseBoundaryContract(findings);
  const entitlementMatrixContract = evaluateEntitlementMatrixContract(findings);
  const rateLimitQuotaContract = evaluateRateLimitQuotaContract(findings);
  const apiKeyAuthContract = evaluateApiKeyAuthContract(findings);
  const databaseAuthSchemaContract = evaluateDatabaseAuthSchemaContract(findings);
  const storageAdapterContract = evaluateStorageAdapterContract(findings);

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
    repoHygieneContract,
    publishScriptGateContract,
    postRebaseWorkflowGateContract,
    workflowDeployContract,
    syncScriptMirrorContract,
    publicPrivateArtifactBoundaryContract,
    fileApiResponseBoundaryContract,
    entitlementMatrixContract,
    rateLimitQuotaContract,
    apiKeyAuthContract,
    databaseAuthSchemaContract,
    storageAdapterContract,
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

  lines.push("## Storage adapter contract");
  lines.push("");
  lines.push(`Storage index exists: ${result.storageAdapterContract.storageIndexExists}`);
  lines.push(`Local storage exists: ${result.storageAdapterContract.localStorageExists}`);
  lines.push(`S3 storage exists: ${result.storageAdapterContract.s3StorageExists}`);
  lines.push(`Index data source union valid: ${result.storageAdapterContract.indexDataSourceUnionValid}`);
  lines.push(`Index defaults to local: ${result.storageAdapterContract.indexDefaultsToLocal}`);
  lines.push(`Index selects S3 only explicitly: ${result.storageAdapterContract.indexSelectsS3OnlyWhenExplicit}`);
  lines.push(`Index normalizes published prefix: ${result.storageAdapterContract.indexNormalizesPublishedPrefix}`);
  lines.push(`Index dispatches by data source: ${result.storageAdapterContract.indexDispatchesByDataSource}`);
  lines.push(`Local result shape valid: ${result.storageAdapterContract.localReturnsUniformShape}`);
  lines.push(`Local content types valid: ${result.storageAdapterContract.localInfersContentTypes}`);
  lines.push(`Local configured root supported: ${result.storageAdapterContract.localSupportsConfiguredRoot}`);
  lines.push(`Local candidate roots valid: ${result.storageAdapterContract.localCandidateRootsValid}`);
  lines.push(`Local public fallback absent: ${result.storageAdapterContract.localDoesNotUsePublicFallback}`);
  lines.push(`Local reads only files: ${result.storageAdapterContract.localReadsOnlyFiles}`);
  lines.push(`Local ENOENT returns null: ${result.storageAdapterContract.localEnoentReturnsNull}`);
  lines.push(`Local unexpected errors throw: ${result.storageAdapterContract.localUnexpectedErrorThrows}`);
  lines.push(`S3 uses AWS SDK: ${result.storageAdapterContract.s3UsesAwsSdk}`);
  lines.push(`S3 env contract valid: ${result.storageAdapterContract.s3EnvContractValid}`);
  lines.push(`S3 prefix default valid: ${result.storageAdapterContract.s3PrefixDefaultValid}`);
  lines.push(`S3 optional endpoint/credentials valid: ${result.storageAdapterContract.s3OptionalEndpointCredentialsValid}`);
  lines.push(`S3 force path style valid: ${result.storageAdapterContract.s3ForcePathStyleValid}`);
  lines.push(`S3 key join normalizes leading slash: ${result.storageAdapterContract.s3KeyJoinNormalizesLeadingSlash}`);
  lines.push(`S3 fails when not configured: ${result.storageAdapterContract.s3FailsWhenNotConfigured}`);
  lines.push(`S3 uses GetObject bucket/key: ${result.storageAdapterContract.s3UsesGetObjectBucketKey}`);
  lines.push(`S3 result shape valid: ${result.storageAdapterContract.s3ReturnsUniformShape}`);
  lines.push(`S3 not found returns null: ${result.storageAdapterContract.s3NotFoundReturnsNull}`);
  lines.push(`S3 unexpected errors throw: ${result.storageAdapterContract.s3UnexpectedErrorThrows}`);
  lines.push("");
  lines.push("## Database auth schema contract");
  lines.push("");
  lines.push(`Prisma schema exists: ${result.databaseAuthSchemaContract.prismaSchemaExists}`);
  lines.push(`Datasource uses PostgreSQL/env URLs: ${result.databaseAuthSchemaContract.datasourceUsesPostgresAndEnvUrls}`);
  lines.push(`SubscriptionTier enum valid: ${result.databaseAuthSchemaContract.subscriptionTierEnumValid}`);
  lines.push(`SubscriptionStatus enum valid: ${result.databaseAuthSchemaContract.subscriptionStatusEnumValid}`);
  lines.push(`ApiKeyStatus enum valid: ${result.databaseAuthSchemaContract.apiKeyStatusEnumValid}`);
  lines.push(`Account model valid: ${result.databaseAuthSchemaContract.accountModelValid}`);
  lines.push(`Subscription model valid: ${result.databaseAuthSchemaContract.subscriptionModelValid}`);
  lines.push(`Subscription indexes valid: ${result.databaseAuthSchemaContract.subscriptionIndexesValid}`);
  lines.push(`ApiKey model valid: ${result.databaseAuthSchemaContract.apiKeyModelValid}`);
  lines.push(`ApiKey indexes valid: ${result.databaseAuthSchemaContract.apiKeyIndexesValid}`);
  lines.push(`CustomOutput model valid: ${result.databaseAuthSchemaContract.customOutputModelValid}`);
  lines.push(`CustomOutput indexes valid: ${result.databaseAuthSchemaContract.customOutputIndexesValid}`);
  lines.push("");
  lines.push("## API key auth contract");
  lines.push("");
  lines.push(`validateToken.ts exists: ${result.apiKeyAuthContract.validateTokenExists}`);
  lines.push(`apiKeys.ts exists: ${result.apiKeyAuthContract.apiKeysExists}`);
  lines.push(`X-API-Key header only: ${result.apiKeyAuthContract.headerOnlyXApiKey}`);
  lines.push(`Production live token shape: ${result.apiKeyAuthContract.productionLiveTokenShape}`);
  lines.push(`Non-production length cap: ${result.apiKeyAuthContract.nonProductionLengthCap}`);
  lines.push(`Development keys disabled in production: ${result.apiKeyAuthContract.productionRejectsDevKeys}`);
  lines.push(`Token trimmed before validation: ${result.apiKeyAuthContract.tokenTrimmedBeforeValidation}`);
  lines.push(`Invalid shape before lookup: ${result.apiKeyAuthContract.invalidShapeBeforeLookup}`);
  lines.push(`Persisted lookup before dev lookup: ${result.apiKeyAuthContract.persistedLookupBeforeDevLookup}`);
  lines.push(`Missing token unauthenticated: ${result.apiKeyAuthContract.missingTokenUnauthenticated}`);
  lines.push(`Invalid token unauthenticated: ${result.apiKeyAuthContract.invalidTokenUnauthenticated}`);
  lines.push(`Revoked unauthenticated: ${result.apiKeyAuthContract.revokedUnauthenticated}`);
  lines.push(`Suspended forbidden: ${result.apiKeyAuthContract.suspendedForbidden}`);
  lines.push(`Inactive subscription forbidden: ${result.apiKeyAuthContract.inactiveSubscriptionForbidden}`);
  lines.push(`Success returns entitlement snapshot and record: ${result.apiKeyAuthContract.successReturnsEntitlementSnapshotAndRecord}`);
  lines.push(`Production auth details redacted: ${result.apiKeyAuthContract.productionAuthDetailsRedacted}`);
  lines.push(`Dev hash uses SHA-256: ${result.apiKeyAuthContract.devHashUsesSha256}`);
  lines.push(`Constant-time hash compare: ${result.apiKeyAuthContract.constantTimeHexCompare}`);
  lines.push(`Persisted hash uses scrypt: ${result.apiKeyAuthContract.persistedHashUsesScrypt}`);
  lines.push(`Persisted hash requires scrypt prefix: ${result.apiKeyAuthContract.persistedHashRequiresScryptPrefix}`);
  lines.push(`Persisted lookup by prefix: ${result.apiKeyAuthContract.persistedLookupByPrefix}`);
  lines.push(`Persisted prefix length 12: ${result.apiKeyAuthContract.persistedPrefixLength12}`);
  lines.push(`Latest subscription only: ${result.apiKeyAuthContract.persistedSubscriptionLatestOnly}`);
  lines.push(`Hash verified before mapping: ${result.apiKeyAuthContract.persistedHashVerifiedBeforeMapping}`);
  lines.push(`Prisma status mapping: ${result.apiKeyAuthContract.prismaStatusMapping}`);
  lines.push(`Persisted entitlement mapping: ${result.apiKeyAuthContract.persistedEntitlementMapping}`);
  lines.push(`lastUsedAt throttled 5 minutes: ${result.apiKeyAuthContract.lastUsedThrottledFiveMinutes}`);
  lines.push(`lastUsedAt does not update revoked keys: ${result.apiKeyAuthContract.lastUsedDoesNotUpdateRevoked}`);
  lines.push(`Dev keys loaded from env JSON only: ${result.apiKeyAuthContract.devKeysLoadedOnlyFromEnvJson}`);
  lines.push("");
  lines.push("## Rate limit quota contract");
  lines.push("");
  lines.push(`Rate-limit module exists: ${result.rateLimitQuotaContract.rateLimitModuleExists}`);
  lines.push(`Upstash imports present: ${result.rateLimitQuotaContract.hasUpstashImports}`);
  lines.push(`Tier type basic/pro only: ${result.rateLimitQuotaContract.tierTypeBasicProOnly}`);
  lines.push(`Decision sources include fail_closed: ${result.rateLimitQuotaContract.decisionSourcesIncludeFailClosed}`);
  lines.push(`60s per-minute window: ${result.rateLimitQuotaContract.perMinuteWindow60s}`);
  lines.push(`Basic per-minute limit 60: ${result.rateLimitQuotaContract.basicPerMinute60}`);
  lines.push(`Pro per-minute limit 300: ${result.rateLimitQuotaContract.proPerMinute300}`);
  lines.push(`Fail-closed retry-after 60: ${result.rateLimitQuotaContract.failClosedRetryAfter60}`);
  lines.push(`Daily quota defaults valid: ${result.rateLimitQuotaContract.dailyQuotaDefaultsValid}`);
  lines.push(`Invalid daily quota fallbacks valid: ${result.rateLimitQuotaContract.invalidDailyQuotaFallbacksValid}`);
  lines.push(`Production runtime detection: ${result.rateLimitQuotaContract.productionRuntimeDetection}`);
  lines.push(`Redis requires URL and token: ${result.rateLimitQuotaContract.redisRequiresUrlAndToken}`);
  lines.push(`Upstash sliding window configured: ${result.rateLimitQuotaContract.upstashSlidingWindowConfigured}`);
  lines.push(`Memory fallback outside production: ${result.rateLimitQuotaContract.memoryFallbackOutsideProduction}`);
  lines.push(`Fail-closed when Redis missing in production: ${result.rateLimitQuotaContract.failClosedWhenRedisMissingInProduction}`);
  lines.push(`Fail-closed when rate backend throws in production: ${result.rateLimitQuotaContract.failClosedWhenRateLimitBackendThrowsInProduction}`);
  lines.push(`Fail-closed when daily backend throws in production: ${result.rateLimitQuotaContract.failClosedWhenDailyQuotaBackendThrowsInProduction}`);
  lines.push(`Daily quota key includes day/tier/account/key: ${result.rateLimitQuotaContract.dailyQuotaKeyIncludesDayTierAccountKey}`);
  lines.push(`Daily quota expires at UTC midnight: ${result.rateLimitQuotaContract.dailyQuotaExpiresAtUtcMidnight}`);
  lines.push(`Rate-limit headers valid: ${result.rateLimitQuotaContract.rateLimitHeadersValid}`);
  lines.push(`Daily quota headers valid: ${result.rateLimitQuotaContract.dailyQuotaHeadersValid}`);
  lines.push(`Exported enforcers present: ${result.rateLimitQuotaContract.exportedEnforcersPresent}`);
  lines.push("");
  lines.push("## Entitlement matrix contract");
  lines.push("");
  lines.push(`Entitlements module exists: ${result.entitlementMatrixContract.entitlementsExists}`);
  lines.push(`Tier union valid: ${result.entitlementMatrixContract.hasTierUnion}`);
  lines.push(`Status union valid: ${result.entitlementMatrixContract.hasStatusUnion}`);
  lines.push(`Genre union valid: ${result.entitlementMatrixContract.hasGenreUnion}`);
  lines.push(`Window union valid: ${result.entitlementMatrixContract.hasWindowUnion}`);
  lines.push(`All chains valid: ${result.entitlementMatrixContract.hasAllChains}`);
  lines.push(`All genres valid: ${result.entitlementMatrixContract.hasAllGenres}`);
  lines.push(`Basic windows correct: ${result.entitlementMatrixContract.basicWindowsCorrect}`);
  lines.push(`Pro windows correct: ${result.entitlementMatrixContract.proWindowsCorrect}`);
  lines.push(`Public has no file access: ${result.entitlementMatrixContract.publicHasNoFileAccess}`);
  lines.push(`Basic single chain: ${result.entitlementMatrixContract.basicSingleChain}`);
  lines.push(`Basic max window 90: ${result.entitlementMatrixContract.basicMaxWindow90}`);
  lines.push(`Basic history depth 90 unless unlocked: ${result.entitlementMatrixContract.basicHistoryDepth90UnlessUnlocked}`);
  lines.push(`Basic custom thresholds false: ${result.entitlementMatrixContract.basicCustomThresholdsFalse}`);
  lines.push(`Pro all chains: ${result.entitlementMatrixContract.proAllChains}`);
  lines.push(`Pro max window 365: ${result.entitlementMatrixContract.proMaxWindow365}`);
  lines.push(`Pro history depth 365 unless unlocked: ${result.entitlementMatrixContract.proHistoryDepth365UnlessUnlocked}`);
  lines.push(`Pro custom thresholds true: ${result.entitlementMatrixContract.proCustomThresholdsTrue}`);
  lines.push(`Public denied as inactive: ${result.entitlementMatrixContract.evaluatesPublicAsInactive}`);
  lines.push(`Inactive checked before access: ${result.entitlementMatrixContract.checksInactiveBeforeAccess}`);
  lines.push(`Chain before genre/window: ${result.entitlementMatrixContract.checksChainBeforeGenreWindow}`);
  lines.push(`Window before date range: ${result.entitlementMatrixContract.checksWindowBeforeDateRange}`);
  lines.push(`Date bounds validation: ${result.entitlementMatrixContract.validatesBothDateBounds}`);
  lines.push(`Date ordering validation: ${result.entitlementMatrixContract.validatesDateOrdering}`);
  lines.push(`History depth enforcement: ${result.entitlementMatrixContract.enforcesHistoryDepth}`);
  lines.push(`Factory helpers exported: ${result.entitlementMatrixContract.exportsFactoryHelpers}`);
  lines.push("");
  lines.push("## File API response boundary contract");
  lines.push("");
  lines.push(`Route exists: ${result.fileApiResponseBoundaryContract.routeExists}`);
  lines.push(`Pre-auth rate limit present: ${result.fileApiResponseBoundaryContract.hasPreAuthRateLimit}`);
  lines.push(`API key validation present: ${result.fileApiResponseBoundaryContract.hasApiKeyValidation}`);
  lines.push(`Path sanitization present: ${result.fileApiResponseBoundaryContract.hasPathSanitization}`);
  lines.push(`Rejects traversal/backslash/null-byte paths: ${result.fileApiResponseBoundaryContract.rejectsTraversalAndNullBytes}`);
  lines.push(`Allowed genre/chain lists present: ${result.fileApiResponseBoundaryContract.hasAllowedGenreAndChainLists}`);
  lines.push(`Uses parsed storage segments: ${result.fileApiResponseBoundaryContract.usesParsedStorageSegments}`);
  lines.push(`Auth before storage read: ${result.fileApiResponseBoundaryContract.authBeforeStorageRead}`);
  lines.push(`Rate limits before storage read: ${result.fileApiResponseBoundaryContract.rateLimitBeforeStorageRead}`);
  lines.push(`Entitlement before storage read: ${result.fileApiResponseBoundaryContract.entitlementBeforeStorageRead}`);
  lines.push(`Returns private no-store: ${result.fileApiResponseBoundaryContract.returnsPrivateNoStore}`);
  lines.push(`Returns entitlement headers: ${result.fileApiResponseBoundaryContract.returnsEntitlementHeaders}`);
  lines.push(`Returns request id header: ${result.fileApiResponseBoundaryContract.returnsRequestIdHeader}`);
  lines.push(`Touches API key after served: ${result.fileApiResponseBoundaryContract.touchesApiKeyAfterServed}`);
  lines.push(`Logs file served: ${result.fileApiResponseBoundaryContract.logsFileServed}`);
  lines.push(`Hides production error details: ${result.fileApiResponseBoundaryContract.hidesProductionErrorDetails}`);
  lines.push("");
  lines.push("## Public/private artifact boundary contract");
  lines.push("");
  lines.push(`localDev.ts exists: ${result.publicPrivateArtifactBoundaryContract.localStorageExists}`);
  lines.push(`Local storage has public fallback: ${result.publicPrivateArtifactBoundaryContract.localStorageHasPublicFallback}`);
  lines.push(`Public published root exists: ${result.publicPrivateArtifactBoundaryContract.publicPublishedRootExists}`);
  lines.push(`Public gold JSON files: ${result.publicPrivateArtifactBoundaryContract.publicGoldJsonFiles}`);
  lines.push(`Public meta JSON files: ${result.publicPrivateArtifactBoundaryContract.publicMetaJsonFiles}`);
  lines.push(`Public derived JSON files: ${result.publicPrivateArtifactBoundaryContract.publicDerivedJsonFiles}`);
  lines.push(`Public subscriber JSON files: ${result.publicPrivateArtifactBoundaryContract.publicSubscriberJsonFiles}`);
  lines.push(`.gitignore blocks public published root: ${result.publicPrivateArtifactBoundaryContract.gitignoreBlocksPublicPublishedRoot}`);
  lines.push("");
  lines.push("## Sync script mirror contract");
  lines.push("");
  lines.push(`Sync script exists: ${result.syncScriptMirrorContract.syncScriptExists}`);
  lines.push(`Removes previous target: ${result.syncScriptMirrorContract.removesPreviousTarget}`);
  lines.push(`Copies as real files: ${result.syncScriptMirrorContract.copiesAsRealFiles}`);
  lines.push(`Uses byte copy: ${result.syncScriptMirrorContract.usesByteCopy}`);
  lines.push(`Checks reparse points: ${result.syncScriptMirrorContract.checksReparsePoints}`);
  lines.push(`Refuses same source/target: ${result.syncScriptMirrorContract.refusesSameSourceAndTarget}`);
  lines.push(`dataset.json missing is hard fail: ${result.syncScriptMirrorContract.datasetJsonHardFail}`);
  lines.push(`contract.json missing is hard fail: ${result.syncScriptMirrorContract.contractJsonHardFail}`);
  lines.push(`Git status scoped to private mirror: ${result.syncScriptMirrorContract.gitStatusScopedToPrivateMirror}`);
  lines.push("");
  lines.push("## Workflow deploy contract");
  lines.push("");
  lines.push(`Workflow exists: ${result.workflowDeployContract.workflowExists}`);
  lines.push(`Deploy step present: ${result.workflowDeployContract.deployStepPresent}`);
  lines.push(`Deploy hook secret referenced: ${result.workflowDeployContract.deployHookSecretReferenced}`);
  lines.push(`Deploy hook missing check present: ${result.workflowDeployContract.deployHookMissingCheckPresent}`);
  lines.push(`Deploy after push: ${result.workflowDeployContract.deployAfterPush}`);
  lines.push(`Deploy after post-rebase gate: ${result.workflowDeployContract.deployAfterPostRebaseGate}`);
  lines.push(`Deploy step does not use if: always(): ${result.workflowDeployContract.deployNotAlways}`);
  lines.push(`Push step index: ${result.workflowDeployContract.pushStepIndex}`);
  lines.push(`Post-rebase gate index: ${result.workflowDeployContract.postRebaseGateIndex}`);
  lines.push(`Deploy step index: ${result.workflowDeployContract.deployStepIndex}`);
  lines.push("");
  lines.push("## Post-rebase workflow gate contract");
  lines.push("");
  lines.push(`Workflow exists: ${result.postRebaseWorkflowGateContract.workflowExists}`);
  lines.push(`Has rebase step: ${result.postRebaseWorkflowGateContract.hasRebase}`);
  lines.push(`Has post-rebase gate marker: ${result.postRebaseWorkflowGateContract.hasPostRebaseGateMarker}`);
  lines.push(`Has no-build gate command: ${result.postRebaseWorkflowGateContract.hasNoBuildGateCommand}`);
  lines.push(`Post-rebase gate after rebase: ${result.postRebaseWorkflowGateContract.postRebaseGateAfterRebase}`);
  lines.push(`Post-rebase gate before push: ${result.postRebaseWorkflowGateContract.postRebaseGateBeforePush}`);
  lines.push(`Post-rebase gate inside push loop: ${result.postRebaseWorkflowGateContract.postRebaseGateInsidePushLoop}`);
  lines.push(`Post-rebase gate refuses push on failure: ${result.postRebaseWorkflowGateContract.postRebaseGateRefusesPushOnFailure}`);
  lines.push("");
  lines.push("## Publish script gate contract");
  lines.push("");
  lines.push(`Publish script exists: ${result.publishScriptGateContract.publishScriptExists}`);
  lines.push(`Has audit gate command: ${result.publishScriptGateContract.hasAuditGateCommand}`);
  lines.push(`Uses no-build gate runner: ${result.publishScriptGateContract.hasNoBuildGateRunner}`);
  lines.push(`Audit gates before staging: ${result.publishScriptGateContract.auditGateBeforeStaging}`);
  lines.push(`Audit gates before commit: ${result.publishScriptGateContract.auditGateBeforeCommit}`);
  lines.push(`Audit gates before push: ${result.publishScriptGateContract.auditGateBeforePush}`);
  lines.push(`SkipPush skips internal gate: ${result.publishScriptGateContract.skipPushSkipsInternalGate}`);
  lines.push("");
  lines.push("## Repo hygiene contract");
  lines.push("");
  lines.push(`.gitignore exists: ${result.repoHygieneContract.gitignoreExists}`);
  lines.push(`Required ignore patterns present: ${result.repoHygieneContract.requiredIgnorePatternsPresent}`);
  lines.push(`Required allow-list patterns present: ${result.repoHygieneContract.requiredAllowPatternsPresent}`);
  lines.push(`Forbidden tracked audit/patch artifacts: ${result.repoHygieneContract.trackedForbiddenArtifacts.length}`);
  lines.push(`Required permanent scripts tracked: ${result.repoHygieneContract.trackedRequiredPermanentScripts.length}`);
  lines.push(`Required permanent scripts missing from git: ${result.repoHygieneContract.requiredPermanentScriptsMissing.length}`);
  lines.push("");
  if (result.repoHygieneContract.trackedForbiddenArtifacts.length > 0) {
    lines.push("Tracked forbidden artifacts:");
    for (const file of result.repoHygieneContract.trackedForbiddenArtifacts.slice(0, 50)) {
      lines.push(`- ${file}`);
    }
    lines.push("");
  }
  if (result.repoHygieneContract.requiredPermanentScriptsMissing.length > 0) {
    lines.push("Missing permanent scripts:");
    for (const file of result.repoHygieneContract.requiredPermanentScriptsMissing) {
      lines.push(`- ${file}`);
    }
    lines.push("");
  }
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
  lines.push("- D-029 Storage Adapter Contract: verifies local/S3 storage path normalization, source selection, private-data roots, S3 env contract, content metadata, not-found behavior, and public fallback exclusion.");
  lines.push("- D-028 Database Auth Schema Contract: verifies Prisma auth/subscription/API-key/custom-output schema, indexes, and storage-critical fields.");
  lines.push("- D-027 API Key Auth Contract: verifies X-API-Key validation, production key shape, dev-key isolation, persisted scrypt verification, status handling, and auth error redaction.");
  lines.push("- D-026 Rate Limit Quota Contract: verifies per-minute limits, daily quotas, headers, Upstash config, memory fallback, and production fail-closed behavior.");
  lines.push("- D-025 Entitlement Matrix Contract: verifies public/basic/pro access matrix, chain/window/history limits, and entitlement decision order.");
  lines.push("- D-024 File API Response Boundary Contract: verifies file delivery authenticates, rate-limits, entitles, sanitizes paths, and returns private no-store responses before storage read.");
  lines.push("- D-023 Public/Private Artifact Boundary Contract: verifies subscriber-bound gold/meta/derived artifacts cannot resolve from or live under web public data.");
  lines.push("- D-022 Sync Script Mirror Contract: verifies private mirror sync removes stale targets, byte-copies real files, and hard-fails on missing critical outputs.");
  lines.push("- D-021 Workflow Deploy Contract: verifies Vercel deployment only happens after validated push and uses the deploy-hook secret safely.");
  lines.push("- D-020 Post-rebase Workflow Gate Contract: verifies GitHub Actions re-runs audit gates after rebase and before each push attempt.");
  lines.push("- D-019 Publish Script Gate Contract: verifies publish-web-data.ps1 runs central audit gates before manual commit/push paths.");
  lines.push("- D-018 Repo Hygiene Contract: verifies audit/patch scratch is ignored and permanent pipeline scripts are explicitly allowed/tracked.");
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