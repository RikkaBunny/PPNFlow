@echo off
title PPNFlow Dev Server
cd /d "%~dp0"

echo ============================================
echo   PPNFlow - Starting Dev Server...
echo ============================================
echo.

:: Check node
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found. Please install Node.js v20+
    echo         https://nodejs.org/
    pause
    exit /b 1
)

:: Install deps if needed
if not exist "node_modules" (
    echo [INFO] Installing dependencies...
    call npm install
    echo.
)

:: Open browser after 3 seconds
start "" cmd /c "timeout /t 3 /nobreak >nul && start http://localhost:1420"

:: Start dev server
echo [INFO] Starting on http://localhost:1420
echo [INFO] Press Ctrl+C to stop
echo.
call npx vite --port 1420 --open
