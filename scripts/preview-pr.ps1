# Open any pull request as a localhost preview, without touching your working folder.
#   preview 312              -> cloud app (dashboard) on http://localhost:4000
#   preview 312 marketing    -> marketing site on http://localhost:3000
# The PR is checked out in a separate folder next to this repo (<repo>-preview),
# so whatever branch or unsaved work you have here is never touched.
# Refuses to run unless .env.local points at the staging Convex deployment.
param(
  [Parameter(Mandatory = $true, Position = 0)][int]$Pr,
  [Parameter(Position = 1)][ValidateSet("cloud", "marketing")][string]$Target = "cloud"
)
$ErrorActionPreference = "Stop"
$StagingConvex = "first-malamute-177"
$LiveConvex = "jovial-owl-711"

$Repo = Split-Path -Parent $PSScriptRoot
$Preview = "$Repo-preview"
Set-Location $Repo

# 1. Safety: staging backend only.
$envFile = Join-Path $Repo ".env.local"
if (-not (Test-Path $envFile)) { throw ".env.local not found in $Repo." }
$convexLine = Select-String -Path $envFile -Pattern "^\s*NEXT_PUBLIC_CONVEX_URL\s*=" | Select-Object -Last 1
if (-not $convexLine) { throw "NEXT_PUBLIC_CONVEX_URL is missing from .env.local." }
if ($convexLine.Line -match $LiveConvex -or $convexLine.Line -notmatch $StagingConvex) {
  throw "Stopped: .env.local does not point at the staging backend ($StagingConvex)."
}

# 2. Fetch the PR.
git fetch origin "pull/$Pr/head"
if ($LASTEXITCODE -ne 0) { throw "Could not fetch PR $Pr." }
$sha = (git rev-parse FETCH_HEAD)

# 3. Separate preview folder (git worktree, shares history, no second download).
if (-not (Test-Path $Preview)) {
  git worktree add --detach $Preview $sha
  if ($LASTEXITCODE -ne 0) { throw "Could not create $Preview." }
}
Set-Location $Preview
$lockBefore = if (Test-Path "package-lock.json") { (Get-FileHash package-lock.json).Hash } else { "" }
git checkout --detach --force $sha
if ($LASTEXITCODE -ne 0) { throw "Could not check out PR $Pr." }
Copy-Item $envFile (Join-Path $Preview ".env.local") -Force

# 4. Install packages only when needed.
$lockAfter = if (Test-Path "package-lock.json") { (Get-FileHash package-lock.json).Hash } else { "" }
if (-not (Test-Path "node_modules") -or $lockBefore -ne $lockAfter) { npm install }

# 5. Run it.
Write-Host "Previewing PR $Pr ($Target). Press Ctrl+C to stop."
npm run "dev:$Target"
