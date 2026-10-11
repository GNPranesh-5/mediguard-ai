<#
.SYNOPSIS
  Starts the MediGuard AI Vite/React frontend server.
#>
$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$FrontendDir = Join-Path $ProjectRoot "frontend"

if (-not (Test-Path $FrontendDir)) {
    Write-Host "[ERROR] Frontend directory not found at $FrontendDir" -ForegroundColor Red
    exit 1
}

Set-Location -Path $FrontendDir

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Starting MediGuard AI Frontend Server " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Frontend Directory: $FrontendDir"

# Check Node and npm
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] npm is not found in PATH. Please install Node.js." -ForegroundColor Red
    exit 1
}

# Check port 5173
$portInUse = Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue
if ($portInUse) {
    Write-Host "[INFO] Port 5173 is already in use; Vite will pick the next available port." -ForegroundColor Yellow
}

# Check node_modules
$NodeModulesDir = Join-Path $FrontendDir "node_modules"
if (-not (Test-Path $NodeModulesDir)) {
    Write-Host "[INFO] node_modules not found. Running npm install..." -ForegroundColor Yellow
    npm install
}

Write-Host "Starting Vite development server..." -ForegroundColor Green
npm run dev
