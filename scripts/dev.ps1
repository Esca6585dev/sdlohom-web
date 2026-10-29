# Starts the Go API (8090) and the Next.js dev server (3002) in two windows.
$root = Split-Path -Parent $PSScriptRoot
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\backend'; go run ./cmd/api"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\frontend'; npm run dev"
Write-Host "API:   http://localhost:8090/api/v1/health"
Write-Host "Site:  http://localhost:3002/tm"
Write-Host "Admin: http://localhost:3002/admin"
