# harmonize-published-snapshot-metadata.ps1
[CmdletBinding()]
param(
    [string]$Root = "",
    [string]$PublishedRoot = "",
    [string[]]$Genres = @("gold", "derived", "meta"),
    [string[]]$Chains = @("bitcoin", "ethereum", "arbitrum", "base")
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Fail {
    param([string]$Message)
    throw $Message
}

function Write-Utf8NoBomJson {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)]$Value
    )

    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    $json = $Value | ConvertTo-Json -Depth 100
    [System.IO.File]::WriteAllText($Path, $json + [Environment]::NewLine, $utf8NoBom)
}

function Read-JsonFile {
    param([Parameter(Mandatory = $true)][string]$Path)

    if (-not (Test-Path -LiteralPath $Path)) {
        Fail "Missing JSON file: $Path"
    }

    return Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json
}

function Get-ManifestPaths {
    param([Parameter(Mandatory = $true)][string]$BaseRoot)

    $paths = New-Object System.Collections.Generic.List[string]

    foreach ($genre in $Genres) {
        foreach ($chain in $Chains) {
            $manifestPath = Join-Path $BaseRoot "$genre\$chain\manifest.json"
            if (Test-Path -LiteralPath $manifestPath) {
                $paths.Add($manifestPath)
            }
        }
    }

    return $paths
}

function Convert-ToUtcSecondText {
    param([Parameter(Mandatory = $true)][string]$Value)

    $dt = [DateTime]::Parse(
        $Value,
        [System.Globalization.CultureInfo]::InvariantCulture,
        [System.Globalization.DateTimeStyles]::AssumeUniversal -bor [System.Globalization.DateTimeStyles]::AdjustToUniversal
    )

    return $dt.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
}

function Get-MaxSnapshotComputedAtUtc {
    param([Parameter(Mandatory = $true)][string]$BaseRoot)

    $datasetPath = Join-Path $BaseRoot "dataset.json"
    $dataset = Read-JsonFile -Path $datasetPath

    $timestamps = New-Object System.Collections.Generic.List[string]

    if (-not [string]::IsNullOrWhiteSpace([string]$dataset.computed_at_utc)) {
        $timestamps.Add([string]$dataset.computed_at_utc)
    }

    $manifestPaths = Get-ManifestPaths -BaseRoot $BaseRoot

    if ($manifestPaths.Count -eq 0) {
        Fail "No manifest files found under $BaseRoot"
    }

    foreach ($manifestPath in $manifestPaths) {
        $manifest = Read-JsonFile -Path $manifestPath
        $raw = [string]$manifest.computed_at_utc

        if ([string]::IsNullOrWhiteSpace($raw)) {
            Fail "Manifest is missing computed_at_utc: $manifestPath"
        }

        $timestamps.Add($raw)
    }

    $maxDate = $null

    foreach ($timestamp in $timestamps) {
        $dt = [DateTime]::Parse(
            $timestamp,
            [System.Globalization.CultureInfo]::InvariantCulture,
            [System.Globalization.DateTimeStyles]::AssumeUniversal -bor [System.Globalization.DateTimeStyles]::AdjustToUniversal
        )

        if ($null -eq $maxDate -or $dt -gt $maxDate) {
            $maxDate = $dt
        }
    }

    return $maxDate.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
}

if ([string]::IsNullOrWhiteSpace($Root)) {
    $Root = (Resolve-Path (Join-Path $PSScriptRoot ".")).Path
}

if ([string]::IsNullOrWhiteSpace($PublishedRoot)) {
    $PublishedRoot = Join-Path $Root "data\published\v1"
}

if (-not (Test-Path -LiteralPath $PublishedRoot)) {
    Fail "Published root not found: $PublishedRoot"
}

$datasetPath = Join-Path $PublishedRoot "dataset.json"
$computedAtUtc = Get-MaxSnapshotComputedAtUtc -BaseRoot $PublishedRoot

Write-Host "Harmonizing published snapshot computed_at_utc"
Write-Host "PublishedRoot   : $PublishedRoot"
Write-Host "computed_at_utc : $computedAtUtc"

$dataset = Read-JsonFile -Path $datasetPath
$oldDatasetComputedAt = [string]$dataset.computed_at_utc
$dataset.computed_at_utc = $computedAtUtc
Write-Utf8NoBomJson -Path $datasetPath -Value $dataset

Write-Host "dataset.json"
Write-Host "  Old: $oldDatasetComputedAt"
Write-Host "  New: $computedAtUtc"

foreach ($manifestPath in (Get-ManifestPaths -BaseRoot $PublishedRoot)) {
    $manifest = Read-JsonFile -Path $manifestPath
    $oldManifestComputedAt = [string]$manifest.computed_at_utc
    $manifest.computed_at_utc = $computedAtUtc
    Write-Utf8NoBomJson -Path $manifestPath -Value $manifest

    $relative = $manifestPath.Substring($PublishedRoot.Length).TrimStart("\", "/")
    Write-Host $relative
    Write-Host "  Old: $oldManifestComputedAt"
    Write-Host "  New: $computedAtUtc"
}

Write-Host "Published snapshot metadata harmonized."