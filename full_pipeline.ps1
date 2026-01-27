# CSS MAIN - Full pipeline runner
# Expected location: <MAIN>\pipeline\tools\full_pipeline.ps1

param(
  [ValidateSet('incremental','rebuild')]
  [string]$Mode = 'incremental'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$env:CSS_PIPELINE_MODE = $Mode

function Write-Log([string]$msg) {
  $ts = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
  Write-Host "[$ts] $msg"
}

function Ensure-Dir([string]$p) {
  if (-not (Test-Path $p)) { New-Item -ItemType Directory -Force -Path $p | Out-Null }
}

function Parse-IsoDate([string]$s) {
  return [DateTime]::ParseExact($s, 'yyyy-MM-dd', $null)
}

function Format-IsoDate([DateTime]$d) {
  return $d.ToString('yyyy-MM-dd')
}

function Get-LatestRawDay([string]$rawRoot) {
  # Prefer a cheap probe in bitcoin/blocks if present; else fall back to a recurse scan.
  $probe = Join-Path $rawRoot 'bitcoin\blocks'
  $candidates = @()
  if (Test-Path $probe) {
    $candidates = @(Get-ChildItem -Path $probe -Directory -ErrorAction SilentlyContinue |
      Where-Object { $_.Name -match '^\d{4}-\d{2}-\d{2}$' } |
      Select-Object -ExpandProperty Name)
  }
  if (-not $candidates -or $candidates.Count -eq 0) {
    $candidates = @(Get-ChildItem -Path $rawRoot -Directory -Recurse -ErrorAction SilentlyContinue |
      Where-Object { $_.Name -match '^\d{4}-\d{2}-\d{2}$' } |
      Select-Object -ExpandProperty Name)
  }
  if (-not $candidates -or $candidates.Count -eq 0) { return $null }
  $dates = @($candidates | Sort-Object -Unique)
  return Parse-IsoDate($dates[-1])
}

function Get-RawDaysForChain([string]$rawRoot, [string]$chain) {
  # Use blocks dir as the canonical day list.
  $blocksDir = Join-Path $rawRoot (Join-Path $chain 'blocks')
  if (-not (Test-Path $blocksDir)) { return @() }
  return @(Get-ChildItem -Path $blocksDir -Directory -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -match '^\d{4}-\d{2}-\d{2}$' } |
    Select-Object -ExpandProperty Name |
    Sort-Object)
}

function Get-MissingFeatureDays([string]$featuresRoot, [string]$chain, [string[]]$rawDays, [DateTime]$startDate) {
  Ensure-Dir (Join-Path $featuresRoot $chain)
  $existing = @{}
  Get-ChildItem -Path (Join-Path $featuresRoot $chain) -File -Filter '*.parquet' -ErrorAction SilentlyContinue |
    ForEach-Object {
      if ($_.BaseName -match '^\d{4}-\d{2}-\d{2}$') { $existing[$_.BaseName] = $true }
    }

  $missing = New-Object System.Collections.Generic.List[string]
  foreach ($d in $rawDays) {
    $dt = Parse-IsoDate($d)
    if ($dt -lt $startDate) { continue }
    if (-not $existing.ContainsKey($d)) { $missing.Add($d) | Out-Null }
  }
  return $missing
}

try {
  Write-Log '=== PIPELINE START ==='
    Write-Log "Mode: $Mode"

  # Detect roots
  $TOOLS_ROOT = Split-Path -Parent $MyInvocation.MyCommand.Path   # ...\pipeline\tools
  $PIPELINE_ROOT = Resolve-Path (Join-Path $TOOLS_ROOT '..') | Select-Object -ExpandProperty Path
  $MAIN_ROOT = Resolve-Path (Join-Path $TOOLS_ROOT '..\..') | Select-Object -ExpandProperty Path

  $PY = $env:CSS_PYTHON
  if ([string]::IsNullOrWhiteSpace($PY)) { $PY = 'python' }

  # Canonical dirs (main)
  $DATA_ROOT = Join-Path $MAIN_ROOT 'data'
  $RAW_ROOT  = Join-Path $DATA_ROOT 'raw'
  $CALC_ROOT = Join-Path $DATA_ROOT 'calculated'
  $GOLD_JSON_ROOT = Join-Path $CALC_ROOT 'gold'
  $META_JSON_ROOT = Join-Path $CALC_ROOT 'meta'

  # Work dirs (pipeline)
  $WORK_ROOT = Join-Path $PIPELINE_ROOT '_work'
  $PROD_ROOT = Join-Path $WORK_ROOT 'prod'
  # NOTE: feature_daily_agg.py refuses the legacy path '...\prod\features'.
  # The canonical output root is '...\prod\features_agg'.
  $FEATURES_ROOT = Join-Path $PROD_ROOT 'features_agg'
  $GOLD_ROOT = Join-Path $PROD_ROOT 'gold'
  $GOLD_WEEKLY_ROOT = Join-Path $PROD_ROOT 'gold_weekly'
  $ML_STATUS_ROOT = Join-Path $PROD_ROOT 'ml_status'

  $REPORTS_DIR = Join-Path $MAIN_ROOT 'reports'

  # Scripts
  $PY_INGEST = Join-Path $TOOLS_ROOT 'download_up_to_date_minimal.py'
  $PY_META_EXPORT = Join-Path $TOOLS_ROOT 'export_meta_json_history.py'
  $PY_SYNC_GOLD_JSON = Join-Path $TOOLS_ROOT 'sync_gold_json_history.py'

  $SRC_ROOT = Join-Path $PIPELINE_ROOT 'src'
  $PY_FEATURE = Join-Path $SRC_ROOT 'feature_daily_agg.py'
  $PY_GOLD = Join-Path $SRC_ROOT 'build_gold_timeseries.py'
  $PY_GOLD_WEEKLY = Join-Path $SRC_ROOT 'build_gold_weekly.py'

  $WEB_BUILD = Join-Path $MAIN_ROOT 'web\build.py'

  # Validate
  foreach ($p in @($DATA_ROOT, $RAW_ROOT, $CALC_ROOT, $GOLD_JSON_ROOT, $META_JSON_ROOT)) { Ensure-Dir $p }
  foreach ($p in @($WORK_ROOT, $PROD_ROOT, $FEATURES_ROOT, $GOLD_ROOT, $GOLD_WEEKLY_ROOT, $ML_STATUS_ROOT)) { Ensure-Dir $p }
  Ensure-Dir $REPORTS_DIR

  foreach ($p in @($PY_INGEST, $PY_META_EXPORT, $PY_SYNC_GOLD_JSON, $PY_FEATURE, $PY_GOLD, $PY_GOLD_WEEKLY, $WEB_BUILD)) {
    if (-not (Test-Path $p)) { throw "Missing required script: $p" }
  }

  # Supported chains (keep in sync with API)
  $CHAINS = @('bitcoin','ethereum','arbitrum','base')

  # Start date policy
  $HARD_START = Parse-IsoDate '2024-12-01'

  $latest = Get-LatestRawDay $RAW_ROOT
  if ($null -eq $latest) {
    Write-Log "Latest local RAW day could not be determined under: $RAW_ROOT"
    Write-Log "Using hard start date: 2024-12-01"
    $startDate = $HARD_START
  } else {
    $startDate = $latest.AddDays(-7)
    if ($startDate -lt $HARD_START) { $startDate = $HARD_START }
    Write-Log ("Latest local RAW day appears to be: {0} => start={1} (clamped to >= 2024-12-01)" -f (Format-IsoDate $latest), (Format-IsoDate $startDate))
  }

  Push-Location $MAIN_ROOT
  try {
    # STEP 1: Download RAW (missing only)
    Write-Log 'STEP 1: Download RAW (missing only)'
    & $PY -u $PY_INGEST --root $MAIN_ROOT --raw-root $RAW_ROOT --start (Format-IsoDate $startDate)
    if ($LASTEXITCODE -ne 0) { throw "download_up_to_date_minimal.py failed rc=$LASTEXITCODE" }

    # STEP 2: Build FEATURES daily parquet only for missing days
    Write-Log 'STEP 2: Build FEATURES daily parquet (missing only)'
    foreach ($chain in $CHAINS) {
      $rawDays = @(Get-RawDaysForChain $RAW_ROOT $chain)
      if (-not $rawDays -or $rawDays.Count -eq 0) {
        Write-Log "[FEATURES] $($chain): no raw days found (skipping)"
        continue
      }
      $missing = @(Get-MissingFeatureDays $FEATURES_ROOT $chain $rawDays $startDate)
      if ($missing.Count -eq 0) {
        Write-Log "[FEATURES] $($chain): nothing to do"
        continue
      }
      Write-Log ("[FEATURES] {0}: building {1} day(s)" -f $chain, $missing.Count)
      foreach ($day in $missing) {
        & $PY $PY_FEATURE --chain $chain --date $day --raw_root $RAW_ROOT --out_root $FEATURES_ROOT
        if ($LASTEXITCODE -ne 0) { throw "feature_daily_agg.py failed chain=$chain date=$day rc=$LASTEXITCODE" }
      }
    }

    # STEP 3: Build GOLD parquet + status
    Write-Log 'STEP 3: Build GOLD parquet + ml_status'
    foreach ($chain in $CHAINS) {
      & $PY $PY_GOLD --chain $chain --features_root $FEATURES_ROOT --gold_root $GOLD_ROOT --status_root $ML_STATUS_ROOT --reports_dir $REPORTS_DIR
      if ($LASTEXITCODE -ne 0) { throw "build_gold_timeseries.py failed chain=$chain rc=$LASTEXITCODE" }

      & $PY $PY_GOLD_WEEKLY --chain $chain --gold_root $GOLD_ROOT --gold_weekly_root $GOLD_WEEKLY_ROOT
      if ($LASTEXITCODE -ne 0) { throw "build_gold_weekly.py failed chain=$chain rc=$LASTEXITCODE" }
    }

    # STEP 4: Sync GOLD JSON history (and latest/last30d) into data/calculated/gold
    Write-Log 'STEP 4: Sync GOLD JSON history -> data/calculated/gold'
    $env:GOLD_ROOT = $GOLD_ROOT
    $env:GOLD_JSON_ROOT = $GOLD_JSON_ROOT
    & $PY -u $PY_SYNC_GOLD_JSON
    if ($LASTEXITCODE -ne 0) { throw "sync_gold_json_history.py failed rc=$LASTEXITCODE" }# STEP 5: Export META (overview) JSON history into data/calculated/meta
Write-Log 'STEP 5: Export META JSON history -> data/calculated/meta'
$metaArgs = @('--root', $MAIN_ROOT, '--out-root', $META_JSON_ROOT, '--start', '2024-12-01', '--mode', $Mode, '--windows', '7,30,90,180,365')
if ($Mode -eq 'rebuild') { $metaArgs += '--force' }
& $PY -u $PY_META_EXPORT @metaArgs
if ($LASTEXITCODE -ne 0) { throw "export_meta_json_history.py failed rc=$LASTEXITCODE" }


    # STEP 6: Build web dist
    Write-Log 'STEP 6: Build web dist'
    & $PY -u $WEB_BUILD
    if ($LASTEXITCODE -ne 0) { throw "web\\build.py failed rc=$LASTEXITCODE" }

    Write-Log '=== PIPELINE OK ==='
  }
  finally {
    Pop-Location
  }

  Write-Log '=== PIPELINE DONE (OK) ==='
  exit 0
}
catch {
  Write-Log "PIPELINE FAILED: $($_.Exception.Message)"
  Write-Error $_
  exit 1
}
