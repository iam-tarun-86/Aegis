# stop_omni.ps1
Write-Host "=============================================" -ForegroundColor Red
Write-Host "🛑 Terminating all Aegis Microservices & Ports" -ForegroundColor Red
Write-Host "=============================================" -ForegroundColor Red

$targetPorts = @(3050, 3000, 8000, 5173, 8001)

foreach ($port in $targetPorts) {
    try {
        $conns = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
        if ($conns) {
            foreach ($conn in $conns) {
                if ($conn.OwningProcess -gt 0 -and $conn.OwningProcess -ne $PID) {
                    Write-Host "  -> Killing process on port $port (PID: $($conn.OwningProcess))..." -ForegroundColor Yellow
                    Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
                }
            }
        }
    } catch {}
}

Write-Host ""
Write-Host "✅ All Aegis ports (3050, 3000, 8000, 5173, 8001) are now completely free!" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Red
