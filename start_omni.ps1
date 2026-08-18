# start_omni.ps1
param(
    [switch]$ShowWindows
)

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "⚛️  Starting Aegis Intelligence Nexus (Windows Native)" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

$scriptPath = $PSScriptRoot
$processes = @()
$targetPorts = @(3050, 3000, 8000, 5173, 8001)

function Stop-AegisPorts {
    param([int[]]$Ports)
    foreach ($port in $Ports) {
        try {
            $conns = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
            if ($conns) {
                foreach ($conn in $conns) {
                    if ($conn.OwningProcess -gt 0 -and $conn.OwningProcess -ne $PID) {
                        Write-Host "  -> Releasing Port $port (Terminating PID: $($conn.OwningProcess))..." -ForegroundColor DarkYellow
                        Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
                    }
                }
            }
        } catch {}
    }
}

# Pre-flight check: Clean up any lingering processes on Aegis ports
Write-Host "Checking for lingering processes on Aegis ports..." -ForegroundColor DarkGray
Stop-AegisPorts -Ports $targetPorts

function Start-Server {
    param(
        [string]$Name,
        [string]$Path,
        [string]$Command
    )
    Write-Host "-> Starting $Name..." -ForegroundColor Green
    
    $windowStyle = if ($ShowWindows) { "Normal" } else { "Hidden" }
    $proc = Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit -Command `"cd '$Path'; $Command`"" -WindowStyle $windowStyle -PassThru
    $script:processes += $proc
}

try {
    # 1. DockMind Backend
    Start-Server -Name "DockMind Backend (Port 8001)" -Path "$scriptPath\dockmind\backend" -Command "python -m uvicorn main:app --port 8001 --reload"

    # 2. DockMind Frontend
    Start-Server -Name "DockMind Frontend (Port 5173)" -Path "$scriptPath\dockmind\frontend" -Command "npm run dev"

    # 3. Wayfarer Backend
    Start-Server -Name "Wayfarer Backend (Port 8000)" -Path "$scriptPath\wayfarer\backend" -Command "python run.py"

    # 4. Wayfarer Frontend
    Start-Server -Name "Wayfarer Frontend (Port 3000)" -Path "$scriptPath\wayfarer\frontend" -Command "npm run dev"

    # 5. Omni App Shell
    Start-Server -Name "Omni App Shell (Port 3050)" -Path "$scriptPath\omni_shell" -Command "npm run dev -- --port 3050"

    Write-Host ""
    Write-Host "=============================================" -ForegroundColor Cyan
    if ($ShowWindows) {
        Write-Host "🚀 Aegis System is active in separate windows!" -ForegroundColor Green
    } else {
        Write-Host "🚀 Aegis System is running silently in the background!" -ForegroundColor Green
        Write-Host "   (Pass '-ShowWindows' if you ever want visible terminal windows for debugging)" -ForegroundColor DarkGray
    }
    Write-Host "   - Omni Launchpad: http://localhost:3050" -ForegroundColor White
    Write-Host "   - Wayfarer UI:   http://localhost:3000" -ForegroundColor DarkCyan
    Write-Host "   - DockMind UI:   http://localhost:5173" -ForegroundColor DarkGreen
    Write-Host ""
    Write-Host "👉 Press Ctrl+C in this terminal to safely shut down all 5 servers and free all ports." -ForegroundColor Yellow
    Write-Host "=============================================" -ForegroundColor Cyan

    # Keep script alive and responsive to Ctrl+C
    while ($true) {
        Start-Sleep -Seconds 1
    }
}
finally {
    Write-Host "`n🛑 Shutting down all Aegis servers and freeing ports..." -ForegroundColor Red
    
    # 1. Kill process tree for spawned PowerShell instances
    foreach ($proc in $processes) {
        if (-not $proc.HasExited) {
            taskkill /PID $proc.Id /T /F 2>$null | Out-Null
        }
    }

    # 2. Direct TCP connection purge: ensure ports 3050, 3000, 8000, 5173, 8001 are guaranteed free
    Stop-AegisPorts -Ports $targetPorts

    Write-Host "✅ All 5 Aegis servers stopped and ports (3050, 3000, 8000, 5173, 8001) successfully freed!" -ForegroundColor Green
}
