# sync-published-data.ps1
[CmdletBinding()]
param(
    [string]$SourceRoot = "D:\css\main\data\published\v1",
    [string]$TargetRoot = "D:\css\main\web-v1-app\.private-data\published\v1",
    [switch]$SkipGitStatus
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-Step {
    param([string]$Message)
    Write-Host ""
    Write-Host "==> $Message" -ForegroundColor Cyan
}

function Fail {
    param([string]$Message)
    throw $Message
}

function Resolve-NormalizedPath {
    param([Parameter(Mandatory = $true)][string]$PathValue)

    try {
        $resolved = Resolve-Path -LiteralPath $PathValue -ErrorAction Stop
        return [System.IO.Path]::GetFullPath($resolved.Path).TrimEnd('\')
    }
    catch {
        return [System.IO.Path]::GetFullPath($PathValue).TrimEnd('\')
    }
}

function Ensure-DirectoryExists {
    param([Parameter(Mandatory = $true)][string]$PathValue)

    if (-not (Test-Path -LiteralPath $PathValue)) {
        New-Item -ItemType Directory -Path $PathValue -Force | Out-Null
    }
}

function Remove-PathIfExists {
    param([Parameter(Mandatory = $true)][string]$PathValue)

    if (Test-Path -LiteralPath $PathValue) {
        Remove-Item -LiteralPath $PathValue -Recurse -Force
    }
}

function Get-GitRoot {
    param([Parameter(Mandatory = $true)][string]$WorkingDir)

    try {
        Push-Location $WorkingDir
        $gitRoot = git rev-parse --show-toplevel 2>$null
        Pop-Location
        if (-not $gitRoot) {
            return $null
        }
        return $gitRoot.Trim()
    }
    catch {
        try {
            Pop-Location
        }
        catch {
        }
        return $null
    }
}

function Show-GitSummary {
    param([Parameter(Mandatory = $true)][string]$WorkingDir)

    $gitRoot = Get-GitRoot -WorkingDir $WorkingDir

    if (-not $gitRoot) {
        Write-Host "Git repo not detected from '$WorkingDir'. Skipping git summary." -ForegroundColor Yellow
        return
    }

    Write-Step "Git status for private published-data mirror after sync"
    Push-Location $gitRoot
    try {
        git status --short -- web-v1-app/.private-data/published/v1
    }
    finally {
        Pop-Location
    }
}

function Copy-TreeAsRealFiles {
    param(
        [Parameter(Mandatory = $true)][string]$Source,
        [Parameter(Mandatory = $true)][string]$Target
    )

    $sourceItem = Get-Item -LiteralPath $Source -Force
    if (-not $sourceItem.PSIsContainer) {
        Fail "Source path is not a directory: $Source"
    }

    Get-ChildItem -LiteralPath $Source -Recurse -Force | ForEach-Object {
        $relative = $_.FullName.Substring($Source.Length).TrimStart('\')
        if ([string]::IsNullOrWhiteSpace($relative)) {
            return
        }

        $targetPath = Join-Path $Target $relative

        if ($_.PSIsContainer) {
            Ensure-DirectoryExists -PathValue $targetPath
            return
        }

        $parent = Split-Path -Parent $targetPath
        Ensure-DirectoryExists -PathValue $parent

        $bytes = [System.IO.File]::ReadAllBytes($_.FullName)
        [System.IO.File]::WriteAllBytes($targetPath, $bytes)
    }
}

function Get-ReparsePointItems {
    param([Parameter(Mandatory = $true)][string]$PathValue)

    if (-not (Test-Path -LiteralPath $PathValue)) {
        return @()
    }

    $items = Get-ChildItem -LiteralPath $PathValue -Recurse -Force | Where-Object {
        ($_.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0
    }

    return @($items)
}

Write-Step "Validating source and target paths"

$normalizedSource = Resolve-NormalizedPath -PathValue $SourceRoot
$normalizedTarget = Resolve-NormalizedPath -PathValue $TargetRoot

if (-not (Test-Path -LiteralPath $normalizedSource)) {
    Fail "Source path does not exist: $normalizedSource"
}

if ($normalizedSource -ieq $normalizedTarget) {
    Fail "Source and target resolve to the same path. Refusing to continue."
}

Write-Host "Source: $normalizedSource" -ForegroundColor Green
Write-Host "Target: $normalizedTarget" -ForegroundColor Green

$targetParent = Split-Path -Parent $normalizedTarget
Ensure-DirectoryExists -PathValue $targetParent

Write-Step "Removing previous deploy copy"
Remove-PathIfExists -PathValue $normalizedTarget
Ensure-DirectoryExists -PathValue $normalizedTarget

Write-Step "Copying published data as real files"
Copy-TreeAsRealFiles -Source $normalizedSource -Target $normalizedTarget

Write-Step "Verifying critical output"
$datasetJson = Join-Path $normalizedTarget "dataset.json"
if (Test-Path -LiteralPath $datasetJson) {
    Write-Host "Found dataset.json" -ForegroundColor Green
}
else {
    Fail "dataset.json was not found in target after sync."
}

$contractJson = Join-Path $normalizedTarget "contract.json"
if (Test-Path -LiteralPath $contractJson) {
    Write-Host "Found contract.json" -ForegroundColor Green
}
else {
    Fail "contract.json was not found in target after sync."
}

Write-Step "Checking for actual reparse points"
$reparseItems = @(Get-ReparsePointItems -PathValue $normalizedTarget)
if ($reparseItems.Count -gt 0) {
    Write-Host "Found unexpected reparse points after sync:" -ForegroundColor Red
    $reparseItems | Select-Object FullName, Attributes | Format-Table -AutoSize
    Fail "Sync completed, but $($reparseItems.Count) item(s) under '$normalizedTarget' are still actual reparse points."
}
else {
    Write-Host "No actual reparse points detected." -ForegroundColor Green
}

if (-not $SkipGitStatus) {
    Show-GitSummary -WorkingDir (Split-Path -Parent $normalizedTarget)
}

Write-Step "Sync complete"
Write-Host "Published data is now mirrored into the private web app data folder as real files." -ForegroundColor Green
Write-Host "Next steps: npm run build, then git add/commit/push if the output looks correct." -ForegroundColor Green
