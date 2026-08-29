param(
    [string]$SourceRepo = 'D:\Project\BAGJO1',
    [string]$TargetRepo = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path,
    [switch]$IncludeProduction
)

$ErrorActionPreference = 'Stop'

$envFiles = @('.env.local', '.env.test.local')
if ($IncludeProduction) {
    $envFiles += '.env.production.local'
}

foreach ($name in $envFiles) {
    $source = Join-Path $SourceRepo $name
    $target = Join-Path $TargetRepo $name

    if (-not (Test-Path -LiteralPath $source -PathType Leaf)) {
        throw "Source environment file not found: $source"
    }

    Copy-Item -LiteralPath $source -Destination $target -Force
    $keyCount = (Get-Content -LiteralPath $target |
        Where-Object { $_ -match '^\s*[A-Za-z_][A-Za-z0-9_]*\s*=' }).Count
    Write-Host "$name synced ($keyCount keys; values hidden)"
}

Write-Host "Environment files synced to $TargetRepo"
