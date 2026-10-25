# Open any pull request as a localhost preview.
#   preview 312              -> cloud app (dashboard) on http://localhost:4000
#   preview 312 marketing    -> marketing site on http://localhost:3000
# Uses the backend named in .env.local and refuses to run unless that is the
# staging Convex deployment, so live keys are never touched.
param(
  [Parameter(Mandatory = $true, Position = 0)][int]$Pr,
  [Parameter(Position = 1)][ValidateSet("cloud", "marketing")][string]$Target = "cloud"
)
$ErrorActionPreference = "Stop"
$StagingConvex = "first-malamute-177"
$LiveConvex = "jovial-owl-711"

Set-Location (Split-Path -Parent $PSScriptRoot)

# 1. Safety: staging backend only.
if (-not (Test-Path ".env.local")) { throw ".env.local not found. Copy your staging settings into C:\Tracify\.env.local first." }
$convexLine = Select-String -Path ".env.local" -Pattern "^\s*NEXT_PUBLIC_CONVEX_URL\s*=" | Select-Object -Last 1
if (-not $convexLine) { throw "NEXT_PUBLIC_CONVEX_URL is missing from .env.local." }
if ($convexLine.Line -match $LiveConvex -or $convexLine.Line -notmatch $StagingConvex) {
  throw "Stopped: .env.local does not point at the staging backend ($StagingConvex)."
}

# 2. Safety: don't clobber unsaved work.
if (git status --porcelain --untracked-files=no) { throw "You have uncommitted changes in C:\Tracify. Commit or stash them first." }

# 3. Fetch and check out the PR in its own local branch.
$before = (git rev-parse "HEAD:package-lock.json" 2>$null)
git fetch origin "pull/$Pr/head:pr-$Pr" --force
if ($LASTEXITCODE -ne 0) { throw "Could not fetch PR $Pr." }
git checkout "pr-$Pr"
if ($LASTEXITCODE -ne 0) { throw "Could not check out PR $Pr." }

# 4. Install packages only when needed.
$after = (git rev-parse "HEAD:package-lock.json" 2>$null)
if (-not (Test-Path "node_modules") -or $before -ne $after) { npm install }

# 5. Run it.
Write-Host "Previewing PR $Pr ($Target). Press Ctrl+C to stop. Go back to main with: git checkout main"
npm run "dev:$Target"
