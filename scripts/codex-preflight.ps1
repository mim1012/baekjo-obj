param(
    [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
    [string]$CodexHome = (Join-Path (Resolve-Path (Join-Path $PSScriptRoot "..")).Path ".codex-home")
)

$ErrorActionPreference = "Stop"

function Get-EnvLabel {
    param([string]$RepoRoot)

    $envPath = Join-Path $RepoRoot ".env.local"
    if (-not (Test-Path $envPath)) {
        return "unknown (.env.local missing)"
    }

    $supabaseUrl = Select-String -Path $envPath -Pattern "^SUPABASE_URL=" -ErrorAction SilentlyContinue |
        Select-Object -First 1 |
        ForEach-Object { $_.Line -replace "^SUPABASE_URL=", "" }

    switch -Regex ($supabaseUrl) {
        "aeooyivfijthfcrfrnyk" { return "local -> staging Supabase" }
        "vgeqpbyyggxxaeowtbtj" { return "local -> prod Supabase (CAUTION)" }
        default {
            if ([string]::IsNullOrWhiteSpace($supabaseUrl)) {
                return "unknown (SUPABASE_URL missing)"
            }
            return "custom Supabase URL"
        }
    }
}

function Get-TestEnvLabel {
    param([string]$RepoRoot)

    $envPath = Join-Path $RepoRoot ".env.test.local"
    if (-not (Test-Path $envPath)) {
        return "not ready (.env.test.local missing)"
    }

    $values = @{}
    foreach ($line in Get-Content -LiteralPath $envPath) {
        if ($line -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$') {
            $values[$Matches[1]] = $Matches[2].Trim().Trim('"').Trim("'")
        }
    }

    $required = @('SUPABASE_URL', 'SUPABASE_ACCESS_TOKEN', 'SUPABASE_SECRET_KEY', 'TEST_SUPABASE_PROJECT_REF')
    $missing = @($required | Where-Object {
        -not $values.ContainsKey($_) -or [string]::IsNullOrWhiteSpace([string]$values[$_])
    })
    if ($missing.Count -gt 0) {
        return "not ready (missing $($missing -join ', '))"
    }

    if ($values['SUPABASE_URL'] -notmatch '^https://([a-z0-9]{20})\.supabase\.co/?$') {
        return "not ready (invalid SUPABASE_URL)"
    }
    $urlRef = $Matches[1]
    if ($urlRef -eq 'vgeqpbyyggxxaeowtbtj') {
        return "blocked (production Supabase ref)"
    }
    if ($urlRef -ne $values['TEST_SUPABASE_PROJECT_REF']) {
        return "not ready (URL/test ref mismatch)"
    }
    return "staging test config ready"
}

function Get-DirtySummary {
    param([string]$RepoRoot)

    $status = git -C $RepoRoot status --short 2>$null
    if (-not $status) {
        return "clean"
    }

    $modified = ($status | Where-Object { $_ -match "^\s*M|^M|^A|^D|^R|^C|^UU|^AA|^DD" }).Count
    $untracked = ($status | Where-Object { $_ -match "^\?\?" }).Count
    return "$modified modified/staged, $untracked untracked"
}

$branch = git -C $RepoRoot branch --show-current 2>$null
if ([string]::IsNullOrWhiteSpace($branch)) {
    $branch = "(detached or unavailable)"
}

$sessionPath = Join-Path $RepoRoot "SESSION.md"
$sessionAge = "missing"
if (Test-Path $sessionPath) {
    $lastWrite = (Get-Item $sessionPath).LastWriteTime
    $hours = [Math]::Round(((Get-Date) - $lastWrite).TotalHours, 1)
    $sessionAge = "$hours hours old"
}

Write-Host ""
Write-Host "[BAGJO1 Codex preflight]"
Write-Host "repo:       $RepoRoot"
Write-Host "branch:     $branch"
Write-Host "env:        $(Get-EnvLabel -RepoRoot $RepoRoot)"
Write-Host "test env:   $(Get-TestEnvLabel -RepoRoot $RepoRoot)"
Write-Host "codex home: $CodexHome"
Write-Host "git dirty:  $(Get-DirtySummary -RepoRoot $RepoRoot)"
Write-Host "session:    SESSION.md $sessionAge"
Write-Host "must read:  AGENTS.md + SESSION.md before project-state work"
Write-Host "close:      scripts/session-close.ps1 -Apply on '세션 마감'"
Write-Host ""
