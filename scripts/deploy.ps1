# BIR BUÝRUK BILEN DEPLOY (lokal -> serwer, SSH alias arkaly; serwerde GitHub gerek däl)
#   .\scripts\deploy.ps1                       # commit + push (bar bolsa) + bundle + scp + serwerde install.sh
#   .\scripts\deploy.ps1 -Message "habar"      # commit habary
#   .\scripts\deploy.ps1 -Server sdlohom       # başga SSH alias/ulanyjy@IP
#   .\scripts\deploy.ps1 -NoPush               # GitHub-a push etmezden
#   .\scripts\deploy.ps1 -Full                 # doly bundle (serwerdäki repo bozulan bolsa)
# Talap: ~/.ssh/config-da "Host sdlohom" (açar bilen giriş), serwerde parolsyz sudo.
param(
  [string]$Server = "sdlohom",
  [string]$Message = "",
  [string]$AppDir = "/var/www/sdlohom-web",
  [switch]$NoPush,
  [switch]$Full,
  [string]$AdminPassword = ""      # ilkinji gurnamada admin paroly (boş = tötänleýin, ekranda görkezilýär)
)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

function Step($t) { Write-Host "`n==> $t" -ForegroundColor Cyan }

Step "Commit"
if (-not $Message) { $Message = "update " + (Get-Date -Format "yyyy-MM-dd HH:mm") }
git add -A
if (git status --porcelain) { git commit -q -m $Message; Write-Host "commit: $Message" } else { Write-Host "üýtgeşme ýok" }
$head = (git rev-parse main).Trim()

if (-not $NoPush) {
  Step "GitHub push (şowsuz bolsa dowam edýär)"
  try { git push origin main 2>&1 | Out-Host } catch { Write-Warning "push bolmady: $_" }
}

Step "Bundle (diňe serwerde ýok commitler)"
$bundle = Join-Path $env:TEMP "sdlohom.bundle"
$base = ""
if (-not $Full) {
  try { $base = (ssh -o BatchMode=yes $Server "sudo git -C $AppDir rev-parse HEAD 2>/dev/null || git -C $AppDir rev-parse HEAD 2>/dev/null" 2>$null | Select-Object -Last 1).Trim() } catch { $base = "" }
  if ($base -and -not ($base -match '^[0-9a-f]{40}$')) { $base = "" }
  if ($base) { git cat-file -e "$base^{commit}" 2>$null; if ($LASTEXITCODE -ne 0) { $base = "" } }
}
if ($base) {
  Write-Host "serwer: $($base.Substring(0,7))  lokal: $($head.Substring(0,7))"
  if ($base -eq $head) { git bundle create $bundle "$base^..main" | Out-Null }   # üýtgeşme ýok: 1 commitlik bundle (no-op)
  else { git bundle create $bundle "$base..main" | Out-Null }
} else {
  Write-Host "doly bundle"
  git bundle create $bundle main | Out-Null
}
Write-Host ("{0:N1} KB" -f ((Get-Item $bundle).Length / 1KB))

Step "Serwere ibermek ($Server)"
scp -q $bundle "$root\deploy\install.sh" "${Server}:~/"
if ($LASTEXITCODE -ne 0) { throw "scp şowsuz" }

Step "Serwerde install.sh (build + restart; birnäçe minut)"
$envs = "BUNDLE=~/sdlohom.bundle"
if ($AdminPassword) { $envs += " ADMIN_PASSWORD='$AdminPassword'" }
ssh $Server "sudo $envs bash ~/install.sh"
if ($LASTEXITCODE -ne 0) { throw "serwerde install.sh ýalňyşlyk berdi (ýokardaky gyzyl ýazga serediň)" }

Step "Barlag"
ssh $Server "curl -fsS -o /dev/null -w 'API %{http_code}\n' http://127.0.0.1:8090/api/v1/health; curl -s -o /dev/null -w 'WEB %{http_code}\n' http://127.0.0.1:3002/tm; sudo git -C $AppDir log --oneline -1; test -f $AppDir/backend/initial-admin-password.txt && echo 'ADMIN:' && sudo cat $AppDir/backend/initial-admin-password.txt || true"
Write-Host "`nTAMAM: https://www.sdlohom.edu.tm/tm  |  https://www.sdlohom.edu.tm/admin" -ForegroundColor Green
