# Open any pull request as a localhost preview, without touching your working folder.
#   preview 312              -> cloud app (dashboard) on http://localhost:4000
#   preview 312 marketing    -> marketing site on http://localhost:3000
# The PR is checked out in a separate folder next to this repo (<repo>-preview),
# so whatever branch or unsaved work you have here is never touched.
# The backend is always forced to staging; it refuses to run if live is mentioned.
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

# 1. Settings: your .env.local, with the backend swapped to staging.
# Your own .env.local is never edited. The result is written to the preview folder only.
$envFile = Join-Path $Repo ".env.local"
if (-not (Test-Path $envFile)) { throw ".env.local not found in $Repo." }
$stagingEnv = (Get-Content $envFile) |
  Where-Object { $_ -notmatch "^\s*(CONVEX_DEPLOYMENT|CONVEX_DEPLOY_KEY|NEXT_PUBLIC_CONVEX_URL|NEXT_PUBLIC_CONVEX_SITE_URL)\s*=" }
$stagingEnv += "NEXT_PUBLIC_CONVEX_URL=https://$StagingConvex.convex.cloud"
$stagingEnv += "NEXT_PUBLIC_CONVEX_SITE_URL=https://$StagingConvex.convex.site"
if (($stagingEnv -join "`n") -match $LiveConvex) { throw "Stopped: settings mention the live backend ($LiveConvex)." }

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
Set-Content -Path (Join-Path $Preview ".env.local") -Value $stagingEnv

# 4. Install packages only when needed.
$lockAfter = if (Test-Path "package-lock.json") { (Get-FileHash package-lock.json).Hash } else { "" }
if (-not (Test-Path "node_modules") -or $lockBefore -ne $lockAfter) { npm install }

# 5. Run it.
Write-Host "Previewing PR $Pr ($Target). Press Ctrl+C to stop."
npm run "dev:$Target"
