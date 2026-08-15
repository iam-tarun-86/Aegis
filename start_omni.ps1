# start_omni.ps1

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "🌌 Starting Project Omni (Windows Native)" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

$scriptPath = $PSScriptRoot
$processes = @()

function Start-Server {
    param(
        [string]$Name,
        [string]$Path,
        [string]$Command
    )
    Write-Host "-> Starting $Name..." -ForegroundColor Green
    
    # Launch in a new window so you can see the logs for each server
    $proc = Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit -Command `"cd '$Path'; $Command`"" -PassThru
    $script:processes += $proc
}

try {
    # 1. DockMind Backend
    Start-Server -Name "DockMind Backend (Port 8001)" -Path "$scriptPath\dockmind\backend" -Command "uvicorn main:app --port 8001 --reload"

    # 2. DockMind Frontend
    Start-Server -Name "DockMind Frontend (Port 5173)" -Path "$scriptPath\dockmind\frontend" -Command "npm run dev"

    # 3. Wayfarer Backend
    Start-Server -Name "Wayfarer Backend (Port 8000)" -Path "$scriptPath\wayfarer\backend" -Command "python run.py"

    # 4. Wayfarer Frontend
    Start-Server -Name "Wayfarer Frontend (Port 3000)" -Path "$scriptPath\wayfarer\frontend" -Command "npm run dev"

    # 5. Omni App Shell
    Start-Server -Name "Omni App Shell (Port 3001)" -Path "$scriptPath\omni_shell" -Command "npm run dev -- --port 3001"

    Write-Host ""
    Write-Host "=============================================" -ForegroundColor Cyan
    Write-Host "🚀 Omni System is active in background windows!" -ForegroundColor Green
    Write-Host "   - Omni Shell: http://localhost:3001"
    Write-Host "   - Wayfarer UI: http://localhost:3000"
    Write-Host "   - DockMind UI: http://localhost:5173"
    Write-Host ""
    Write-Host "Press Ctrl+C here to safely shut down all servers." -ForegroundColor Yellow
    Write-Host "=============================================" -ForegroundColor Cyan

    # Wait indefinitely until Ctrl+C
    while ($true) {
        Start-Sleep -Seconds 1
    }
}
finally {
    Write-Host "`nShutting down all Omni servers..." -ForegroundColor Red
    foreach ($proc in $processes) {
        if (-not $proc.HasExited) {
            # taskkill with /T (Tree) ensures child node/python processes are killed too
            taskkill /PID $proc.Id /T /F | Out-Null
        }
    }
    Write-Host "All servers stopped." -ForegroundColor Green
}
