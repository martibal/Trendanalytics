param(
  [string]$Root = "",
  [string]$Start = "",
  [switch]$SkipBriefs,
  [switch]$SkipWebSync
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
if ([string]::IsNullOrWhiteSpace($Root)) {
  $Root = $scriptRoot
}
$Root = Resolve-Path $Root | Select-Object -ExpandProperty Path

$tool = Join-Path $Root 'pipeline\tools\regenerate_json_safe.py'
if (-not (Test-Path $tool)) {
  throw "Missing regenerate_json_safe.py: $tool"
}

$argsList = @($tool, '--root', $Root)
if (-not [string]::IsNullOrWhiteSpace($Start)) {
  $argsList += @('--start', $Start)
}
if ($SkipBriefs.IsPresent) {
  $argsList += '--skip-briefs'
}
if ($SkipWebSync.IsPresent) {
  $argsList += '--skip-web-sync'
}

Write-Host "[regenerate-json-safe.ps1] Running: python $($argsList -join ' ')"
python @argsList
exit $LASTEXITCODE
