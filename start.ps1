# ProtectHer one-click launcher (PowerShell version)
# Run with:  powershell -ExecutionPolicy Bypass -File start.ps1
$ErrorActionPreference = "Stop"
Set-Location -Path $PSScriptRoot

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  ProtectHer - one-click launcher" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# --- Frontend deps ---
if (-not (Test-Path "node_modules")) {
    Write-Host "[1/4] Installing frontend deps (first run only)..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) { Write-Host "npm install failed" -ForegroundColor Red; exit 1 }
} else {
    Write-Host "[1/4] Frontend deps already installed." -ForegroundColor Green
}

# --- Pick a Python: existing venv -> system Python (skip venv creation entirely
#     since your system Python already has Flask + TF + cv2). Avoids the
#     ensurepip hang seen on some Windows Pythons.
$pyCmd = "python"
$activatePrefix = ""
if (Test-Path "server\venv\Scripts\python.exe") {
    Write-Host "[2/4] Using existing venv at server\venv." -ForegroundColor Green
    $pyCmd = "$PSScriptRoot\server\venv\Scripts\python.exe"
    $activatePrefix = "call venv\Scripts\activate.bat && "
} else {
    # Verify system Python has the backend deps
    & python -c "import flask, flask_cors, tensorflow, cv2" 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[2/4] System Python is missing required packages. Install with:" -ForegroundColor Red
        Write-Host "      pip install -r server\requirements.txt" -ForegroundColor Red
        exit 1
    }
    Write-Host "[2/4] Using system Python (already has Flask + TF + cv2)." -ForegroundColor Green
}

# --- Launch backend in a new cmd window ---
Write-Host "[3/4] Starting harassment backend on http://127.0.0.1:5005 ..." -ForegroundColor Yellow
$backendCmd = "title ProtectHer backend && cd /d `"$PSScriptRoot\server`" && $activatePrefix" + "python app.py"
Start-Process -FilePath "cmd.exe" -ArgumentList "/k", $backendCmd

# --- Launch frontend in a new cmd window ---
Write-Host "[4/4] Starting frontend on http://localhost:5173 ..." -ForegroundColor Yellow
Start-Process -FilePath "cmd.exe" -ArgumentList "/k", "title ProtectHer frontend && cd /d `"$PSScriptRoot`" && npm run dev"

Start-Sleep -Seconds 5
Start-Process "http://localhost:5173"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Both servers running. Close their" -ForegroundColor Cyan
Write-Host "  windows to shut down." -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan
Read-Host "Press Enter to close this launcher window"
