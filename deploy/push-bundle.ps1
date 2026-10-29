# Lokal kompýuterden serwere "bundle" ibermek — serwer GitHub-a baglanyp bilmese.
# Ulanyş (PowerShell, taslamanyň içinde):
#   .\deploy\push-bundle.ps1 -Server ubuntu@95.85.x.x            # kod + baza dumpy + install.sh
#   .\deploy\push-bundle.ps1 -Server ubuntu@IP -WithTools        # + Go we Node tarball (serwerde internet ýok bolsa)
# Soňra serwerde:
#   sudo BUNDLE=/home/ubuntu/sdlohom.bundle DB_DUMP=/home/ubuntu/sdlohom.sql bash /home/ubuntu/install.sh
param(
  [Parameter(Mandatory = $true)][string]$Server,   # mysal: ubuntu@95.85.125.10
  [string]$RemoteDir = "~",
  [string]$Branch = "main",
  [switch]$WithTools,
  [string]$GoVersion = "1.27.0",
  [string]$NodeMajor = "22"
)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

Write-Host "==> git bundle ($Branch)" -ForegroundColor Cyan
git bundle create "$env:TEMP\sdlohom.bundle" $Branch
$files = @("$env:TEMP\sdlohom.bundle", "$root\deploy\install.sh")

if (Test-Path "$root\database\sdlohom.sql") {
  $files += "$root\database\sdlohom.sql"
} else {
  Write-Host "==> baza dumpy döredilýär (mysqldump)" -ForegroundColor Cyan
  $dump = Get-Command mysqldump -ErrorAction SilentlyContinue
  if (-not $dump -and (Test-Path "C:\xampp\mysql\bin\mysqldump.exe")) { $dump = "C:\xampp\mysql\bin\mysqldump.exe" } else { $dump = $dump.Source }
  if ($dump) { & $dump -u root --default-character-set=utf8mb4 --single-transaction sdlohom | Out-File -Encoding utf8 "$root\database\sdlohom.sql"; $files += "$root\database\sdlohom.sql" }
  else { Write-Warning "mysqldump tapylmady — dump iberilmedi" }
}

if ($WithTools) {
  Write-Host "==> Go we Node tarball ýüklenýär" -ForegroundColor Cyan
  $go = "$env:TEMP\go$GoVersion.linux-amd64.tar.gz"
  if (-not (Test-Path $go)) { Invoke-WebRequest "https://go.dev/dl/go$GoVersion.linux-amd64.tar.gz" -OutFile $go }
  $sums = (Invoke-WebRequest "https://nodejs.org/dist/latest-v$NodeMajor.x/SHASUMS256.txt").Content
  $nodeName = ([regex]::Match($sums, "node-v[0-9.]+-linux-x64\.tar\.xz")).Value
  $node = "$env:TEMP\$nodeName"
  if (-not (Test-Path $node)) { Invoke-WebRequest "https://nodejs.org/dist/latest-v$NodeMajor.x/$nodeName" -OutFile $node }
  $files += $go, $node
}

Write-Host "==> scp → $Server`:$RemoteDir" -ForegroundColor Cyan
scp $files "$Server`:$RemoteDir/"

Write-Host @"

Serwerde işlediň:
  sudo BUNDLE=~/sdlohom.bundle DB_DUMP=~/sdlohom.sql bash ~/install.sh
$(if ($WithTools) { "  (offline: GO_TARBALL=~/go$GoVersion.linux-amd64.tar.gz NODE_TARBALL=~/$nodeName goşuň)" })
"@ -ForegroundColor Green
