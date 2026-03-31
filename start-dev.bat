@echo off
chcp 65001 >nul 2>&1
title PPNFlow Dev Server
cd /d "%~dp0"

echo ============================================
echo   PPNFlow - Starting Dev Server...
echo ============================================
echo.

:: ── Try multiple ways to find Node.js ──

:: Method 1: PATH
where node >nul 2>&1
if %errorlevel% equ 0 goto :FOUND_NODE

:: Method 2: Common install locations
set "NODE_PATHS=C:\Program Files\nodejs;C:\Program Files (x86)\nodejs;%LOCALAPPDATA%\fnm_multishells;%USERPROFILE%\.nvm;%APPDATA%\nvm"
for %%P in ("%NODE_PATHS:;=" "%") do (
    if exist "%%~P\node.exe" (
        set "PATH=%%~P;%PATH%"
        goto :FOUND_NODE
    )
)

:: Method 3: nvm for Windows
if exist "%APPDATA%\nvm\nvm.exe" (
    for /f "tokens=*" %%V in ('"%APPDATA%\nvm\nvm.exe" current 2^>nul') do (
        if exist "%APPDATA%\nvm\v%%V\node.exe" (
            set "PATH=%APPDATA%\nvm\v%%V;%PATH%"
            goto :FOUND_NODE
        )
    )
)

:: Method 4: fnm
where fnm >nul 2>&1
if %errorlevel% equ 0 (
    for /f "tokens=*" %%V in ('fnm current 2^>nul') do (
        echo [INFO] Found fnm, using Node %%V
    )
    call fnm env --use-on-cd >nul 2>&1
    where node >nul 2>&1
    if %errorlevel% equ 0 goto :FOUND_NODE
)

:: Not found
echo.
echo [ERROR] Node.js not found!
echo.
echo   Please install Node.js v20+:
echo     https://nodejs.org/
echo.
echo   If already installed, try:
echo     1. Close and reopen this terminal
echo     2. Or add Node.js to your PATH manually
echo.
pause
exit /b 1

:FOUND_NODE
for /f "tokens=*" %%V in ('node --version 2^>nul') do echo [OK] Node.js %%V

:: ── Install dependencies if needed ──
if not exist "node_modules" (
    echo.
    echo [INFO] First run - installing dependencies...
    echo       This may take a minute...
    echo.
    call npm install
    if %errorlevel% neq 0 (
        echo.
        echo [ERROR] npm install failed. Check your network connection.
        pause
        exit /b 1
    )
    echo.
    echo [OK] Dependencies installed!
    echo.
)

:: ── Start dev server ──
echo [INFO] Starting on http://localhost:1420
echo [INFO] Press Ctrl+C to stop
echo.

:: Open browser after a short delay
start "" cmd /c "timeout /t 3 /nobreak >nul && start http://localhost:1420"

:: Run vite
call npx vite --port 1420 --host
