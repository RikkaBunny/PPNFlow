@echo off
chcp 65001 >nul 2>&1
title PPNFlow
cd /d "%~dp0"

echo.
echo   ╔═══════════════════════════════════════╗
echo   ║         PPNFlow - Starting...         ║
echo   ╚═══════════════════════════════════════╝
echo.

:: ── Find Node.js ──
call :FIND_NODE
if %errorlevel% neq 0 goto :NO_NODE

:: ── Kill previous instances ──
for /f "tokens=5" %%P in ('netstat -ano 2^>nul ^| findstr ":1420 " ^| findstr "LISTENING"') do (
    taskkill /F /PID %%P >nul 2>&1
)

:: ── Find Rust ──
where rustc >nul 2>&1
if %errorlevel% neq 0 (
    echo   [!] Rust not found.
    echo       Install from: https://rustup.rs/
    echo       Run rustup-init.exe, then restart terminal.
    echo.
    pause
    exit /b 1
)
for /f "tokens=*" %%V in ('rustc --version 2^>nul') do echo   [OK] %%V

:: ── Install npm deps ──
if not exist "node_modules" (
    echo.
    echo   [*] Installing npm dependencies...
    call npm install
    if %errorlevel% neq 0 (
        echo   [!] npm install failed.
        pause
        exit /b 1
    )
)

:: ── Install Python deps ──
where python >nul 2>&1
if %errorlevel% equ 0 (
    if exist "engine\requirements.txt" (
        echo   [*] Checking Python dependencies...
        pip install -q -r engine\requirements.txt >nul 2>&1
    )
)

:: ── Launch Tauri desktop app ──
echo.
echo   [*] Launching PPNFlow desktop app...
echo       First build takes a few minutes (compiling Rust).
echo       Subsequent starts are fast.
echo.
call npm run tauri dev
pause
goto :eof

:FIND_NODE
where node >nul 2>&1
if %errorlevel% equ 0 (
    for /f "tokens=*" %%V in ('node --version 2^>nul') do echo   [OK] Node.js %%V
    exit /b 0
)
:: Try common install paths
for %%P in (
    "C:\Program Files\nodejs"
    "%LOCALAPPDATA%\Programs\nodejs"
    "%ProgramFiles%\nodejs"
) do (
    if exist "%%~P\node.exe" (
        set "PATH=%%~P;%PATH%"
        for /f "tokens=*" %%V in ('"%%~P\node.exe" --version 2^>nul') do echo   [OK] Node.js %%V
        exit /b 0
    )
)
:: Try nvm
if exist "%APPDATA%\nvm\nvm.exe" (
    for /f "tokens=*" %%V in ('"%APPDATA%\nvm\nvm.exe" current 2^>nul') do (
        if exist "%APPDATA%\nvm\v%%V\node.exe" (
            set "PATH=%APPDATA%\nvm\v%%V;%PATH%"
            echo   [OK] Node.js %%V (nvm)
            exit /b 0
        )
    )
)
exit /b 1

:NO_NODE
echo.
echo   [!] Node.js not found.
echo.
echo       Please install Node.js v20+:
echo         https://nodejs.org/
echo.
echo       After installing, close and reopen this terminal.
echo.
pause
exit /b 1
