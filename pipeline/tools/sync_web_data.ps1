param(
  # Repo root (defaults to two levels up from this script: ...\pipeline\tools -> ...\main)
  [string]$Root = "",

  # If set, only print what would happen
  [switch]$DryRun
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Write-Log([string]$msg) {
  $ts = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
  Write-Host "[$ts] $msg"
}

function Ensure-Dir([string]$p) {
  if (-not (Test-Path $p)) { New-Item -ItemType Directory -Force -Path $p | Out-Null }
}

function Copy-Tree([string]$src, [string]$dst) {
  if (-not (Test-Path $src)) { throw "Source missing: $src" }
  Ensure-Dir $dst

  Write-Log "Copy: $src -> $dst"

  if ($DryRun) { return }

  # Mirror semantics without deleting destination by default.
  # We copy everything over; existing files are overwritten.
  # This keeps the operation safe even if someone has extra files locally.
  robocopy $src $dst /E /NFL /NDL /NJH /NJS /NP /R:2 /W:1 | Out-Null
  $rc = $LASTEXITCODE

  # Robocopy return codes: 0-7 are OK (success or minor differences). >=8 is failure.
  if ($rc -ge 8) { throw "Robocopy failed (exit code $rc) copying $src -> $dst" }
}

function Find-NodeExe() {
  $node = (Get-Command node.exe -ErrorAction SilentlyContinue)
  if ($node -and $node.Source) { return $node.Source }

  $node = (Get-Command node -ErrorAction SilentlyContinue)
  if ($node -and $node.Source) { return $node.Source }

  $pf = $env:ProgramFiles
  if (-not $pf) { $pf = 'C:\Program Files' }
  $candidate = Join-Path $pf 'nodejs\node.exe'
  if (Test-Path $candidate) { return $candidate }

  return $null
}

try {
  $thisScript = $MyInvocation.MyCommand.Path
  $toolsDir = Split-Path -Parent $thisScript

  if ([string]::IsNullOrWhiteSpace($Root)) {
    $Root = Resolve-Path (Join-Path $toolsDir '..\..') | Select-Object -ExpandProperty Path
  } else {
    $Root = Resolve-Path $Root | Select-Object -ExpandProperty Path
  }

  $calcGold = Join-Path $Root 'data\calculated\gold'
  $calcMeta = Join-Path $Root 'data\calculated\meta'

  $webDir   = Join-Path $Root 'web'
  $webGold  = Join-Path $webDir 'data\css_json'
  $webMeta  = Join-Path $webDir 'data\css_json_meta'
  $syncMjs  = Join-Path $webDir 'scripts\sync-data.mjs'

  Write-Log "=== SYNC WEB DATA START ==="
  Write-Log "root      = $Root"
  Write-Log "calcGold  = $calcGold"
  Write-Log "calcMeta  = $calcMeta"
  Write-Log "webGold   = $webGold"
  Write-Log "webMeta   = $webMeta"
  Write-Log "syncMjs   = $syncMjs"
  Write-Log "dryRun    = $($DryRun.IsPresent)"

  if (-not (Test-Path $calcGold)) { throw "Missing calculated gold folder: $calcGold" }
  if (-not (Test-Path $calcMeta)) { throw "Missing calculated meta folder: $calcMeta" }
  if (-not (Test-Path $webDir))   { throw "Missing web folder: $webDir" }
  if (-not (Test-Path $syncMjs))  { throw "Missing web script: $syncMjs" }

  # 1) Copy calculated -> web/data/*
  Copy-Tree $calcGold $webGold
  Copy-Tree $calcMeta $webMeta

  # 2) Run web sync into public/data/*
  $nodeExe = Find-NodeExe
  if (-not $nodeExe) { throw "Could not find node.exe. Install Node.js or ensure it is on PATH." }

  Write-Log "Run: node scripts/sync-data.mjs (cwd=$webDir)"
  if (-not $DryRun) {
    Push-Location $webDir
    try {
      & $nodeExe 'scripts/sync-data.mjs'
      if ($LASTEXITCODE -ne 0) { throw "scripts/sync-data.mjs failed rc=$LASTEXITCODE" }
    }
    finally {
      Pop-Location
    }
  }

  Write-Log "=== SYNC WEB DATA OK ==="
  exit 0
}
catch {
  Write-Log ("=== SYNC WEB DATA FAILED === " + $_.Exception.Message)
  Write-Error $_
  exit 1
}
