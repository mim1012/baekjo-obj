param(
    [string]$SourceRepo = 'D:\Project\BAGJO1',
    [string]$TargetRepo = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path,
    [switch]$IncludeProduction
)

$ErrorActionPreference = 'Stop'

function Read-EnvFile {
    param([string]$Path)

    $values = @{}
    foreach ($line in Get-Content -LiteralPath $Path) {
        if ($line -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$') {
            $values[$Matches[1]] = $Matches[2].Trim().Trim('"').Trim("'")
        }
    }
    return $values
}

function Assert-StagingTestEnv {
    param([string]$Path)

    $values = Read-EnvFile -Path $Path
    $required = @(
        'SUPABASE_URL',
        'SUPABASE_ACCESS_TOKEN',
        'SUPABASE_SECRET_KEY',
        'TEST_SUPABASE_PROJECT_REF',
        'E2E_ADMIN_EMAIL',
        'E2E_ADMIN_PASSWORD',
        'E2E_MEMBER_EMAIL',
        'E2E_MEMBER_PASSWORD'
    )
    $missing = @($required | Where-Object {
        -not $values.ContainsKey($_) -or [string]::IsNullOrWhiteSpace([string]$values[$_])
    })
    if ($missing.Count -gt 0) {
        throw "$Path is missing required staging-test keys: $($missing -join ', ')"
    }

    if ($values['SUPABASE_URL'] -notmatch '^https://([a-z0-9]{20})\.supabase\.co/?$') {
        throw "$Path must use a Supabase project URL"
    }
    $urlRef = $Matches[1]
    if ($urlRef -eq 'vgeqpbyyggxxaeowtbtj') {
        throw "$Path points to the production Supabase project"
    }
    if ($urlRef -ne $values['TEST_SUPABASE_PROJECT_REF']) {
        throw "$Path SUPABASE_URL does not match TEST_SUPABASE_PROJECT_REF"
    }
}

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
    if ($name -eq '.env.test.local') {
        Assert-StagingTestEnv -Path $target
        Write-Host "$name synced ($keyCount keys; staging ref verified; values hidden)"
    } else {
        Write-Host "$name synced ($keyCount keys; values hidden)"
    }
}

Write-Host "Environment files synced to $TargetRepo"
