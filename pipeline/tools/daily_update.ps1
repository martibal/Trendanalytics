# ============================
# CSS DAILY UPDATE (features + gold)
# Portable version for bundled repo-root (e.g. D:\CSS\full)
#
# Responsibilities:
#  1) Build missing daily feature JSONs from RAW (per-chain, per-day)
#  2) Build/refresh GOLD timeseries from features
#
# Notes:
#  - RAW is expected under:   <repo_root>\raw\<chain>\{transactions,blocks}\<day-partitions>\*.parquet
#  - Features are written to: <repo_root>\features_agg\<chain>\YYYY-MM-DD.json
#  - GOLD is written to:      <repo_root>\prod\gold\<chain>\*.json (implementation-specific)
# ============================

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function CountOf($x) { return @($x).Count }

# Repo root = parent of tools/
$REPO_ROOT = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)  # main root

$RAW_ROOT = Join-Path (Join-Path $REPO_ROOT "data") "raw"
$FEAT_ROOT = Join-Path (Join-Path (Join-Path $REPO_ROOT "pipeline") "_work") "features"
$PROD_ROOT = Join-Path (Join-Path (Join-Path $REPO_ROOT "pipeline") "_work") "prod"
$GOLD_ROOT     = Join-Path $PROD_ROOT "gold"
$GOLD_WEEKLY_ROOT = Join-Path $PROD_ROOT "gold_weekly"
$STATUS_ROOT   = Join-Path $PROD_ROOT "ml_status"
$REPORTS_DIR   = Join-Path $PROD_ROOT "reports"
$SRC_ROOT = Join-Path (Join-Path $REPO_ROOT "pipeline") "src"

$PY_FEATURE = Join-Path $SRC_ROOT "feature_daily_agg.py"
$PY_GOLD    = Join-Path $SRC_ROOT "build_gold_timeseries.py"
$PY_GOLD_WEEKLY = Join-Path $SRC_ROOT "build_gold_weekly.py"

if (!(Test-Path $RAW_ROOT))    { throw "RAW root missing: $RAW_ROOT" }
if (!(Test-Path $SRC_ROOT))    { throw "SRC root missing: $SRC_ROOT" }
if (!(Test-Path $PY_FEATURE))  { throw "Missing: $PY_FEATURE" }
if (!(Test-Path $PY_GOLD))     { throw "Missing: $PY_GOLD" }
if (!(Test-Path $PY_GOLD_WEEKLY)) { throw "Missing: $PY_GOLD_WEEKLY" }

# Ensure output dirs exist
foreach ($p in @($FEAT_ROOT, $PROD_ROOT, $GOLD_ROOT, $GOLD_WEEKLY_ROOT, $STATUS_ROOT, $REPORTS_DIR)) {
  if (!(Test-Path $p)) { New-Item -ItemType Directory -Path $p | Out-Null }
}

$CHAINS = @("ethereum","bitcoin","base","arbitrum")
$TABLES = @("transactions","blocks")

Write-Host "=== CSS DAILY UPDATE ==="
Write-Host "Repo root : $REPO_ROOT"
Write-Host "RAW       : $RAW_ROOT"
Write-Host "FEATURES  : $FEAT_ROOT"
Write-Host "GOLD      : $GOLD_ROOT"
Write-Host "GOLD_W    : $GOLD_WEEKLY_ROOT"
Write-Host "STATUS    : $STATUS_ROOT"
Write-Host "REPORTS   : $REPORTS_DIR"

function Normalize-DayName([string]$name) {
  # Accept: "day=2026-01-02", "dt=2026-01-02", "2026-01-02"
  if ($name -match '(\d{4}-\d{2}-\d{2})') { return $Matches[1] }
  return $null
}

function Get-DayFolders([string]$dir) {
  if (!(Test-Path $dir)) { return @() }
  $days = @()
  $folders = @(Get-ChildItem -Path $dir -Directory -ErrorAction SilentlyContinue)
  foreach ($f in $folders) {
    $d = Normalize-DayName $f.Name
    if ($null -ne $d) { $days += $d }
  }
  # de-dup + sort
  return @($days | Sort-Object -Unique)
}

function Get-FeatureDays([string]$featChainDir) {
  if (!(Test-Path $featChainDir)) { return @() }
  # Features are written as .parquet (one per day). Keep .json for backward compatibility.
  $files = @(Get-ChildItem -Path $featChainDir -File -Filter "*.parquet" -ErrorAction SilentlyContinue)
  $files += @(Get-ChildItem -Path $featChainDir -File -Filter "*.json" -ErrorAction SilentlyContinue)
  $days = @()
  foreach ($f in $files) {
    $d = Normalize-DayName $f.BaseName
    if ($null -ne $d) { $days += $d }
  }
  return @($days | Sort-Object -Unique)
}

# ============================
# STEP 1: FEATURE DAILY AGG (only missing days)
# ============================
Write-Host "=== STEP 1: FEATURE DAILY AGG (only missing days with raw present) ==="

foreach ($ch in $CHAINS) {
  $txDir   = Join-Path (Join-Path $RAW_ROOT $ch) "transactions"
  $blkDir  = Join-Path (Join-Path $RAW_ROOT $ch) "blocks"
  $outDir  = Join-Path $FEAT_ROOT $ch

  if (!(Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir | Out-Null }

  $txDays  = Get-DayFolders $txDir
  $blkDays = Get-DayFolders $blkDir

  # Intersection of days where both tables exist
  $rawDays = @()
  $txSet = @{}
  foreach ($d in $txDays) { $txSet[$d] = $true }
  foreach ($d in $blkDays) {
    if ($txSet.ContainsKey($d)) { $rawDays += $d }
  }
  $rawDays = @($rawDays | Sort-Object -Unique)

  $featDays = Get-FeatureDays $outDir
  $featSet = @{}
  foreach ($d in $featDays) { $featSet[$d] = $true }

  $missing = @()
  foreach ($d in $rawDays) {
    if (-not $featSet.ContainsKey($d)) { $missing += $d }
  }

  Write-Host ("[FEATURE] {0}: raw_days={1}, feat_days={2}, missing={3}" -f $ch, (CountOf $rawDays), (CountOf $featDays), (CountOf $missing))

  foreach ($d in $missing) {
    Write-Host ("[FEATURE] {0}: building date={1}" -f $ch, $d)

    python $PY_FEATURE `
      --chain $ch `
      --date $d `
      --raw_root "$RAW_ROOT" `
      --out_root "$FEAT_ROOT" | Out-Host

    if ($LASTEXITCODE -ne 0) {
      throw "feature_daily_agg.py failed chain=$ch date=$d rc=$LASTEXITCODE"
    }
  }
}

# ============================
# STEP 2B: BUILD GOLD WEEKLY (from gold daily)
# ============================
Write-Host "=== STEP 2B: BUILD GOLD WEEKLY ==="

foreach ($ch in $CHAINS) {
  Write-Host ("[GOLD_WEEKLY] building weekly dataset for {0}" -f $ch)

  python $PY_GOLD_WEEKLY `
    --chain $ch `
    --gold_root "$GOLD_ROOT" `
    --gold_weekly_root "$GOLD_WEEKLY_ROOT" | Out-Host

  if ($LASTEXITCODE -ne 0) {
    throw "build_gold_weekly.py failed chain=$ch rc=$LASTEXITCODE"
  }
}

# ============================
# STEP 2: BUILD GOLD (from features)
# ============================
Write-Host "=== STEP 2: BUILD GOLD ==="

foreach ($ch in $CHAINS) {
  Write-Host ("[GOLD] building timeseries for {0}" -f $ch)

  python $PY_GOLD `
    --chain $ch `
    --features_root "$FEAT_ROOT" `
    --gold_root "$GOLD_ROOT" `
    --status_root "$STATUS_ROOT" `
    --reports_dir "$REPORTS_DIR" | Out-Host

  if ($LASTEXITCODE -ne 0) {
    throw "build_gold_timeseries.py failed chain=$ch rc=$LASTEXITCODE"
  }
}



# ============================
# STEP 2B: BUILD GOLD WEEKLY (from daily gold)
# ============================
Write-Host "=== STEP 2B: BUILD GOLD WEEKLY ==="

foreach ($ch in $CHAINS) {
  Write-Host ("[GOLD_WEEKLY] building weekly dataset for {0}" -f $ch)

  python $PY_GOLD_WEEKLY `
    --chain $ch `
    --gold_root "$GOLD_ROOT" `
    --gold_weekly_root "$GOLD_WEEKLY_ROOT" | Out-Host

  if ($LASTEXITCODE -ne 0) {
    throw "build_gold_weekly.py failed chain=$ch rc=$LASTEXITCODE"
  }
}



# ============================
# STEP 3: PRODUCTION QUALITY GATE (gold parquet)
# ============================
Write-Host "=== STEP 3: VALIDATE GOLD (PRODUCTION GATE) ==="

$PY_VALIDATE = Join-Path (Join-Path (Join-Path $REPO_ROOT "pipeline") "tools") "validate_gold_parquet.py"
if (!(Test-Path $PY_VALIDATE)) { throw "Missing: $PY_VALIDATE" }

# By default we run a non-strict gate: freshness breaches become WARN (not fatal)
# This matches the product's "delayed vs current" semantics: we do not block serving
# when upstream data simply hasn't arrived yet.
# Set CSS_STRICT_GATE=1 to fail-closed (CI/release).
$STRICT = ($env:CSS_STRICT_GATE -eq "1")

if ($STRICT) {
  python $PY_VALIDATE --gold-root "$GOLD_ROOT" --strict | Out-Host
} else {
  python $PY_VALIDATE --gold-root "$GOLD_ROOT" | Out-Host
}

if ($LASTEXITCODE -ne 0) {
  throw "validate_gold_parquet.py FAILED rc=$LASTEXITCODE"
}


Write-Host "=== DONE (ML handled by GUI/orchestrator) ==="
exit 0
