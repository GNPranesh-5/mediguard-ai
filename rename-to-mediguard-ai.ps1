<#
.SYNOPSIS
  Safely renames mediguard-ai-frontend to MediGuard AI once the IDE has closed the workspace folder.
#>
$ParentDir = Split-Path -Parent $PSScriptRoot
if (-not $ParentDir) { $ParentDir = "C:\Users\prane\Downloads" }

$OldFolder = Join-Path $ParentDir "mediguard-ai-frontend"
$NewFolder = Join-Path $ParentDir "MediGuard AI"

if (-not (Test-Path $OldFolder)) {
    if (Test-Path $NewFolder) {
        Write-Host "[SUCCESS] The folder is already named 'MediGuard AI' at $NewFolder" -ForegroundColor Green
        exit 0
    }
    Write-Host "[ERROR] Could not find folder at $OldFolder" -ForegroundColor Red
    exit 1
}

try {
    Rename-Item -Path $OldFolder -NewName "MediGuard AI" -ErrorAction Stop
    Write-Host "`n[SUCCESS] Project folder renamed successfully to: $NewFolder" -ForegroundColor Green
    Write-Host "You can now open 'C:\Users\prane\Downloads\MediGuard AI' in your IDE." -ForegroundColor Cyan
} catch {
    Write-Host "`n[NOTICE] Windows reported that the directory is currently open in an active application (IDE or terminal)." -ForegroundColor Yellow
    Write-Host "To complete the rename: Close the IDE workspace window, then run from an external PowerShell terminal:" -ForegroundColor Yellow
    Write-Host "  cd 'C:\Users\prane\Downloads'; Rename-Item 'mediguard-ai-frontend' 'MediGuard AI'" -ForegroundColor Cyan
}
