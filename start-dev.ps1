<#
.SYNOPSIS
  Launches both MediGuard AI Backend and Frontend in separate PowerShell windows.
#>
$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

$BackendScript = Join-Path $ProjectRoot "start-backend.ps1"
$FrontendScript = Join-Path $ProjectRoot "start-frontend.ps1"

Write-Host "Launching MediGuard AI Backend in a new window..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-File", "`"$BackendScript`""

Start-Sleep -Seconds 2

Write-Host "Launching MediGuard AI Frontend in a new window..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-File", "`"$FrontendScript`""

Write-Host "`nBoth services launched!" -ForegroundColor Green
Write-Host "Backend:  http://127.0.0.1:8000" -ForegroundColor Gray
Write-Host "Swagger:  http://127.0.0.1:8000/docs" -ForegroundColor Gray
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Gray
