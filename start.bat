@echo off
setlocal EnableDelayedExpansion
title ProtectHer launcher

REM Always run relative to this script's folder
cd /d "%~dp0"

echo ========================================
echo   ProtectHer - one-click launcher
echo ========================================
echo.

REM ---- Frontend deps ----
if not exist "node_modules" (
  echo [1/3] Installing frontend deps ^(first run only^)...
  call npm install || goto :error_npm
) else (
  echo [1/3] Frontend deps already installed.
)

REM ---- Launch frontend FIRST so the user sees the UI immediately ----
REM (The backend takes ~30s to load TensorFlow + the harass model; we kick it
REM  off in parallel and the webcam page auto-detects it via /health polling.)
echo [2/3] Starting frontend on http://localhost:5173 ...
start "ProtectHer frontend" cmd /k "cd /d %~dp0 && npm run dev"

REM ---- Decide which Python to use for the backend ----
set "ACTIVATE_LINE="
if exist "server\venv\Scripts\python.exe" (
  echo [3/3] Backend using existing venv at server\venv.
  set "ACTIVATE_LINE=call venv\Scripts\activate.bat ^&^& "
) else (
  python -c "import flask, flask_cors, tensorflow, cv2" 1>nul 2>nul
  if errorlevel 1 (
    echo.
    echo [WARN] Backend skipped: system Python is missing required packages.
    echo        Frontend is starting anyway with a simulated harassment score.
    echo        To enable the real model, run:
    echo            pip install -r server\requirements.txt
    echo        then re-run start.bat.
    echo.
    goto :open_browser
  )
  echo [3/3] Backend using system Python ^(already has Flask + TF + cv2^).
)

REM ---- Launch backend in the background (its own window, loads in parallel) ----
echo       Starting harassment backend on http://127.0.0.1:5005 ^(loads in ~30s^)...
start "ProtectHer backend" cmd /k "cd /d %~dp0server && %ACTIVATE_LINE%python app.py"

:open_browser
REM ---- Open the browser as soon as the frontend is up (much faster than the backend) ----
timeout /t 3 /nobreak >nul
start "" "http://localhost:5173"

echo.
echo ========================================
echo   Frontend: http://localhost:5173    ^(ready now^)
echo   Backend:  http://127.0.0.1:5005    ^(loading in background^)
echo.
echo   The webcam page will switch from
echo   "Backend offline" to "Backend live"
echo   automatically once the model finishes
echo   loading ^(usually within 30 seconds^).
echo.
echo   Close either server window to shut it down.
echo ========================================
echo.
pause
exit /b 0

:error_npm
echo.
echo [ERROR] npm install failed. Is Node.js installed and on PATH?
pause
exit /b 1

:error_pip
echo.
echo [ERROR] pip install failed. Check server\requirements.txt and your network.
pause
exit /b 1
