param(
  # Repo root (defaults to two levels up from this script: ...\pipeline\tools -> ...\main)
  [string]$Root = "",

  # If set, only print what would happen
  [switch]$DryRun
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

try {
  $thisScript = $MyInvocation.MyCommand.Path
  $toolsDir = Split-Path -Parent $thisScript
  $pythonScript = Join-Path $toolsDir 'sync_web_data.py'

  if (-not (Test-Path $pythonScript)) {
    throw "Missing Python sync script: $pythonScript"
  }

  $python = [Environment]::GetEnvironmentVariable('CSS_PYTHON')
  if ([string]::IsNullOrWhiteSpace($python)) {
    $python = 'python'
  }

  $pythonArgs = @('-u', $pythonScript)

  if (-not [string]::IsNullOrWhiteSpace($Root)) {
    $pythonArgs += @('--root', $Root)
  }

  if ($DryRun) {
    $pythonArgs += '--dry-run'
  }

  & $python @pythonArgs
  exit $LASTEXITCODE
}
catch {
  Write-Error $_
  exit 1
}
