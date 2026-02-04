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

  robocopy $src $dst /E /NFL /NDL /NJH /NJS /NP /R:2 /W:1 | Out-Null
  $rc = $LASTEXITCODE
  if ($rc -ge 8) { throw "Robocopy failed (exit code $rc) copying $src -> $dst" }
}

try {
  $thisScript = $MyInvocation.MyCommand.Path
  $toolsDir = Split-Path -Parent $thisScript

  if ([string]::IsNullOrWhiteSpace($Root)) {
    $Root = Resolve-Path (Join-Path $toolsDir '..\..') | Select-Object -ExpandProperty Path
  } else {
    $Root = Resolve-Path $Root | Select-Object -ExpandProperty Path
  }

  $published = Join-Path $Root 'data\published\v1'

  $webV1 = Join-Path $Root 'web-v1'
  $webLegacy = Join-Path $Root 'web'

  $targetWeb = $null
  if (Test-Path $webV1) {
    $targetWeb = $webV1
  } elseif (Test-Path $webLegacy) {
    $targetWeb = $webLegacy
  } else {
    throw "Neither web-v1 nor web folder found under root. Expected: $webV1 or $webLegacy"
  }

  $dst = Join-Path $targetWeb 'public\data\published\v1'

  Write-Log "=== SYNC WEB DATA START ==="
  Write-Log "root        = $Root"
  Write-Log "published   = $published"
  Write-Log "targetWeb   = $targetWeb"
  Write-Log "dst         = $dst"
  Write-Log "dryRun      = $($DryRun.IsPresent)"

  if (-not (Test-Path $published)) { throw "Missing published dataset folder: $published" }

  Copy-Tree $published $dst

  Write-Log "=== SYNC WEB DATA OK ==="
  exit 0
}
catch {
  Write-Log ("=== SYNC WEB DATA FAILED === " + $_.Exception.Message)
  Write-Error $_
  exit 1
}
