# publish-web-data.ps1
[CmdletBinding()]
param(
    [string]$RepoRoot = "",
    [string]$WebAppRoot = "",
    [string]$SyncScriptPath = "",
    [string]$SourceRoot = "",
    [string]$TargetRoot = "",
    [string]$Branch = "main",
    [string]$CommitMessage = "",
    [switch]$SkipBuild,
    [switch]$SkipPush,
    [switch]$DryRun
)
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
function Write-Step { param([string]$Message) Write-Host ""; Write-Host "==> $Message" -ForegroundColor Cyan }
function Fail { param([string]$Message) throw $Message }
function Ensure-PathExists { param([string]$PathValue,[string]$Label) if (-not (Test-Path -LiteralPath $PathValue)) { Fail "$Label not found: $PathValue" } }
function Invoke-Native { param([string]$WorkingDirectory,[string]$FilePath,[string[]]$Arguments=@()) Push-Location $WorkingDirectory; try { & $FilePath @Arguments; if ($LASTEXITCODE -ne 0) { Fail "Command failed with exit code ${LASTEXITCODE}: $FilePath $($Arguments -join ' ')" } } finally { Pop-Location } }
function Get-CurrentTimestampForCommit { return (Get-Date).ToString("yyyy-MM-dd HH:mm:ss") }

if ([string]::IsNullOrWhiteSpace($RepoRoot)) { $RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot ".")).Path }
if ([string]::IsNullOrWhiteSpace($WebAppRoot)) { $WebAppRoot = Join-Path $RepoRoot "web-v1-app" }
if ([string]::IsNullOrWhiteSpace($SyncScriptPath)) { $SyncScriptPath = Join-Path $RepoRoot "sync-published-data.ps1" }
if ([string]::IsNullOrWhiteSpace($SourceRoot)) { $SourceRoot = Join-Path $RepoRoot "data\published\v1" }
if ([string]::IsNullOrWhiteSpace($TargetRoot)) { $TargetRoot = Join-Path $WebAppRoot ".private-data\published\v1" }
Ensure-PathExists $RepoRoot "Repo root"; Ensure-PathExists $WebAppRoot "Web app root"; Ensure-PathExists $SyncScriptPath "Sync script"; Ensure-PathExists $SourceRoot "Published source root"
$schemaContractScript = Join-Path $RepoRoot "pipeline\tools\ensure_artifact_schema_versions.py"

Write-Step "Publish configuration"
Write-Host "SourceRoot: $SourceRoot"; Write-Host "TargetRoot: $TargetRoot"; Write-Host "SkipBuild: $SkipBuild"; Write-Host "SkipPush: $SkipPush"; Write-Host "DryRun: $DryRun"
if ($DryRun) { Write-Host "Would enforce artifact schema versions, sync canonical published data to the web mirror, build/audit when enabled, and stage both canonical + mirror artifacts."; exit 0 }

if (Test-Path -LiteralPath $schemaContractScript) {
    Write-Step "Enforcing self-describing schema_version on published artifacts"
    Invoke-Native $RepoRoot "python" @($schemaContractScript,"--root",$SourceRoot)
    Invoke-Native $RepoRoot "python" @($schemaContractScript,"--root",$SourceRoot,"--check")
}

Write-Step "Running published-data sync"
Invoke-Native $RepoRoot "powershell" @("-NoProfile","-ExecutionPolicy","Bypass","-File",$SyncScriptPath,"-SourceRoot",$SourceRoot,"-TargetRoot",$TargetRoot)
if (-not $SkipBuild) { Write-Step "Running production build"; Invoke-Native $WebAppRoot "npm" @("run","build") } else { Write-Step "Skipping build" }
if (-not $SkipPush) { Write-Step "Running audit gates"; Invoke-Native $WebAppRoot "npm" @("run","check:audit-gates:no-build") } else { Write-Step "Skipping audit gates inside publish-web-data because -SkipPush was provided" }

Write-Step "Staging sync script and published data"
Invoke-Native $RepoRoot "git" @("add","--","data/published/v1","web-v1-app/.private-data/published/v1","sync-published-data.ps1")
Push-Location $RepoRoot
try {
    $statusOutput = git status --short -- data/published/v1 web-v1-app/.private-data/published/v1 sync-published-data.ps1
    $statusOutput = @($statusOutput | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
    if ($statusOutput.Count -eq 0) { Write-Host "Nothing to commit. Published snapshot is already up to date." -ForegroundColor Yellow; return }
    if ($SkipPush) { Write-Step "Skipping commit/push because -SkipPush was provided"; return }
    $finalCommitMessage = $CommitMessage
    if ([string]::IsNullOrWhiteSpace($finalCommitMessage)) { $finalCommitMessage = "Update published data snapshot $(Get-CurrentTimestampForCommit)" }
    Write-Step "Creating commit"
    Invoke-Native $RepoRoot "git" @("commit","-m",$finalCommitMessage)
    Write-Step "Pushing to origin/$Branch"
    Invoke-Native $RepoRoot "git" @("push","origin",$Branch)
} finally { Pop-Location }
