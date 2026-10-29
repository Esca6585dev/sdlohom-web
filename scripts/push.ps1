# Lokalda: ähli üýtgeşmeleri commit edip GitHub-a push edýär.
#   .\scripts\push.ps1                      # habar: "update <sene>"
#   .\scripts\push.ps1 "habar goşuldy"      # öz habaryňyz
# Soň serwerde:  cd /var/www/sdlohom-web && sudo ./deploy/deploy.sh
param([string]$Message = "")
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root
if (-not $Message) { $Message = "update " + (Get-Date -Format "yyyy-MM-dd HH:mm") }
git add -A
$changes = git status --porcelain
if ($changes) { git commit -q -m $Message; Write-Host "commit: $Message" -ForegroundColor Cyan } else { Write-Host "Üýtgeşme ýok, diňe push" -ForegroundColor Yellow }
git push origin main
Write-Host "`nTAMAM. Serwerde:  cd /var/www/sdlohom-web && sudo ./deploy/deploy.sh" -ForegroundColor Green
