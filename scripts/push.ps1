# Lokalda: ähli üýtgeşmeleri commit edip ähli remote-lara (GitHub + bar bolsa Gitea aýnasy) push edýär.
#   .\scripts\push.ps1                      # habar: "update <sene>"
#   .\scripts\push.ps1 "habar goşuldy"      # öz habaryňyz
# Soň serwerde:  sudo bash /var/www/sdlohom-web/deploy/install.sh
# Serwer GitHub-a baglanmasa:  .\deploy\push-bundle.ps1 -Server ubuntu@SERWER_IP
param([string]$Message = "")
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root
if (-not $Message) { $Message = "update " + (Get-Date -Format "yyyy-MM-dd HH:mm") }
git add -A
$changes = git status --porcelain
if ($changes) { git commit -q -m $Message; Write-Host "commit: $Message" -ForegroundColor Cyan } else { Write-Host "Üýtgeşme ýok, diňe push" -ForegroundColor Yellow }
foreach ($r in (git remote)) {
  Write-Host "push -> $r" -ForegroundColor Cyan
  git push $r main
}
Write-Host "`nTAMAM. Serwerde:  sudo bash /var/www/sdlohom-web/deploy/install.sh   (GitHub ýapyk bolsa: .\deploy\push-bundle.ps1 -Server ubuntu@IP)" -ForegroundColor Green
