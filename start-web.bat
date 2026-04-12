@echo off
setlocal
chcp 65001 >nul 2>&1
title PPNFlow Web Dev
cd /d "%~dp0"

echo.
echo ==========================================
echo   PPNFlow Web Development
echo ==========================================
echo.

call :FIND_NODE
if errorlevel 1 goto :NO_NODE

echo [*] Cleaning up old processes...
call :KILL_PORT 1420
call :KILL_PORT 9320

if not exist "node_modules" (
    echo [*] Installing npm dependencies...
    call npm install
    if errorlevel 1 (
        echo [!] npm install failed.
        pause
        exit /b 1
    )
)

where python >nul 2>&1
if %errorlevel% equ 0 (
    if exist "engine\requirements.txt" (
        echo [*] Checking Python dependencies...
        pip install -q -r engine\requirements.txt >nul 2>&1
    )
    echo [*] Starting Python backend on ws://localhost:9320
    start "PPNFlow Backend" /min cmd /c "cd /d \"%~dp0\" && python engine/ws_server.py --port 9320"
) else (
    echo [!] Python not found. The frontend will fall back to mock execution.
)

echo [*] Starting frontend on http://localhost:1420
echo [*] Opening browser...
echo.
start "" cmd /c "timeout /t 3 /nobreak >nul && start http://localhost:1420"
call npm run dev:web -- --port 1420

echo.
echo [*] Cleaning up backend process...
call :KILL_PORT 9320
pause
exit /b 0

:KILL_PORT
for /f "tokens=5" %%P in ('netstat -ano 2^>nul ^| findstr ":%~1 " ^| findstr "LISTENING"') do (
    taskkill /F /PID %%P >nul 2>&1
)
exit /b 0

:FIND_NODE
where node >nul 2>&1
if %errorlevel% equ 0 (
    for /f "tokens=*" %%V in ('node --version 2^>nul') do echo [OK] Node.js %%V
    exit /b 0
)
for %%P in (
    "C:\Program Files\nodejs"
    "%LOCALAPPDATA%\Programs\nodejs"
    "%ProgramFiles%\nodejs"
) do (
    if exist "%%~P\node.exe" (
        set "PATH=%%~P;%PATH%"
        for /f "tokens=*" %%V in ('"%%~P\node.exe" --version 2^>nul') do echo [OK] Node.js %%V
        exit /b 0
    )
)
if exist "%APPDATA%\nvm\nvm.exe" (
    for /f "tokens=*" %%V in ('"%APPDATA%\nvm\nvm.exe" current 2^>nul') do (
        if exist "%APPDATA%\nvm\v%%V\node.exe" (
            set "PATH=%APPDATA%\nvm\v%%V;%PATH%"
            echo [OK] Node.js %%V (nvm)
            exit /b 0
        )
    )
)
exit /b 1

:NO_NODE
echo.
echo [!] Node.js not found.
echo     Install Node.js 20+ from:
echo     https://nodejs.org/
echo.
pause
exit /b 1
