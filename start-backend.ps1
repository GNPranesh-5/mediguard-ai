<#
.SYNOPSIS
  Starts the MediGuard AI FastAPI backend server.
#>
$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location -Path $ProjectRoot

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Starting MediGuard AI Backend Server  " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Project Root: $ProjectRoot"

# Check port 8001
$portInUse = Get-NetTCPConnection -LocalPort 8001 -State Listen -ErrorAction SilentlyContinue
if ($portInUse) {
    Write-Host "[WARNING] Port 8001 is already in use by process ID $($portInUse.OwningProcess)." -ForegroundColor Yellow
    Write-Host "Please close the process using port 8001 before starting the backend." -ForegroundColor Yellow
    exit 1
}

# Check .env file
$EnvPath = Join-Path $ProjectRoot ".env"
if (-not (Test-Path $EnvPath)) {
    Write-Host "[ERROR] Missing .env file at $EnvPath. Please provide DATABASE_URL and JWT_SECRET_KEY." -ForegroundColor Red
    exit 1
}

# Check Python environment
$PythonExe = Join-Path $ProjectRoot ".venv\Scripts\python.exe"
if (-not (Test-Path $PythonExe)) {
    Write-Host "[ERROR] Backend virtual environment not found at $PythonExe." -ForegroundColor Red
    exit 1
}

# Check OCR Python environment
$OcrPythonExe = Join-Path $ProjectRoot ".venv-ocr\Scripts\python.exe"
if (-not (Test-Path $OcrPythonExe)) {
    Write-Host "[WARNING] Dedicated OCR environment not found at $OcrPythonExe." -ForegroundColor Yellow
}

Write-Host "Backend starting at http://127.0.0.1:8001 ..." -ForegroundColor Green
Write-Host "Documentation: http://127.0.0.1:8001/docs" -ForegroundColor Green

& $PythonExe -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8001
