# BIR BUÝRUK BILEN DEPLOY (lokal -> serwer, SSH alias arkaly; serwerde GitHub gerek däl)
#   .\scripts\deploy.ps1                       # commit + push (bar bolsa) + bundle + scp + serwerde install.sh
#   .\scripts\deploy.ps1 -Message "habar"      # commit habary
#   .\scripts\deploy.ps1 -Server sdlohom       # başga SSH alias/ulanyjy@IP
#   .\scripts\deploy.ps1 -NoPush               # GitHub-a push etmezden
# Talap: ~/.ssh/config-da "Host sdlohom" (açar bilen giriş), serwerde parolsyz sudo.
param(
  [string]$Server = "sdlohom",
  [string]$Message = "",
  [switch]$NoPush,
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

if (-not $NoPush) {
  Step "GitHub push (şowsuz bolsa dowam edýär)"
  try { git push origin main 2>&1 | Out-Host } catch { Write-Warning "push bolmady: $_" }
}

Step "Bundle"
$bundle = Join-Path $env:TEMP "sdlohom.bundle"
git bundle create $bundle main | Out-Null
Write-Host ("{0:N1} MB" -f ((Get-Item $bundle).Length / 1MB))

Step "Serwere ibermek ($Server)"
scp -q $bundle "$root\deploy\install.sh" "${Server}:~/"
if ($LASTEXITCODE -ne 0) { throw "scp şowsuz" }

Step "Serwerde install.sh (build + restart; birnäçe minut)"
$env = "BUNDLE=~/sdlohom.bundle"
if ($AdminPassword) { $env += " ADMIN_PASSWORD='$AdminPassword'" }
ssh -t $Server "sudo $env bash ~/install.sh"
if ($LASTEXITCODE -ne 0) { throw "serwerde install.sh ýalňyşlyk berdi (ýokardaky gyzyl ýazga serediň)" }

Step "Barlag"
ssh $Server "curl -fsS -o /dev/null -w 'API %{http_code}\n' http://127.0.0.1:8090/api/v1/health; curl -s -o /dev/null -w 'WEB %{http_code}\n' http://127.0.0.1:3002/tm; test -f /var/www/sdlohom-web/backend/initial-admin-password.txt && echo 'ADMIN:' && sudo cat /var/www/sdlohom-web/backend/initial-admin-password.txt || true"
Write-Host "`nTAMAM: https://www.sdlohom.edu.tm/tm  |  https://www.sdlohom.edu.tm/admin" -ForegroundColor Green
