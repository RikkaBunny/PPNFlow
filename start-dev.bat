@echo off
setlocal
chcp 65001 >nul 2>&1
title PPNFlow Desktop Dev
cd /d "%~dp0"

echo.
echo ==========================================
echo   PPNFlow Desktop Development
echo ==========================================
echo.

call :FIND_NODE
if errorlevel 1 goto :NO_NODE

call :FIND_PYTHON
if errorlevel 1 goto :NO_PYTHON

call :FIND_RUST
if errorlevel 1 exit /b 1

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

if exist "engine\requirements.txt" (
    echo [*] Checking Python dependencies with %PY_CMD%...
    %PY_CMD% -m pip install -q -r engine\requirements.txt >nul 2>&1
)

echo [*] Starting Python backend on ws://localhost:9320 using %PY_CMD%
start "PPNFlow Backend" /min %PY_CMD% engine/ws_server.py --port 9320
call :WAIT_PORT 9320 10
if errorlevel 1 (
    echo [!] Python backend failed to start on ws://localhost:9320
    echo     Try running this manually in an administrator terminal:
    echo     %PY_CMD% engine\ws_server.py --port 9320
    echo.
) else (
    echo [OK] Python backend is listening on ws://localhost:9320
)

echo [*] Starting Tauri desktop shell...
echo     Frontend: Web UI inside Tauri
echo     Backend : Python over WebSocket JSON
echo.
call npm run dev:desktop

echo.
echo [*] Cleaning up backend process...
call :KILL_PORT 9320
pause
exit /b 0

:WAIT_PORT
set "PORT=%~1"
set "TRIES=%~2"
if "%TRIES%"=="" set "TRIES=10"
:WAIT_PORT_LOOP
for /f "tokens=5" %%P in ('netstat -ano 2^>nul ^| findstr ":%PORT% " ^| findstr "LISTENING"') do (
    exit /b 0
)
set /a TRIES-=1
if %TRIES% LEQ 0 exit /b 1
timeout /t 1 /nobreak >nul
goto :WAIT_PORT_LOOP

:KILL_PORT
for /f "tokens=5" %%P in ('netstat -ano 2^>nul ^| findstr ":%~1 " ^| findstr "LISTENING"') do (
    taskkill /F /PID %%P >nul 2>&1
)
exit /b 0

:FIND_PYTHON
where py >nul 2>&1
if %errorlevel% equ 0 (
    set "PY_CMD=py"
    for /f "tokens=*" %%V in ('py --version 2^>nul') do echo [OK] %%V
    exit /b 0
)
where python >nul 2>&1
if %errorlevel% equ 0 (
    set "PY_CMD=python"
    for /f "tokens=*" %%V in ('python --version 2^>nul') do echo [OK] %%V
    exit /b 0
)
exit /b 1

:FIND_RUST
where rustc >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] Rust not found.
    echo     Install it from: https://rustup.rs/
    echo     Then restart this terminal and try again.
    echo.
    pause
    exit /b 1
)
for /f "tokens=*" %%V in ('rustc --version 2^>nul') do echo [OK] %%V
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
echo     Then restart this terminal and run start-dev.bat again.
echo.
pause
exit /b 1

:NO_PYTHON
echo.
echo [!] Python not found.
echo     Install Python 3 and make sure either `py` or `python` works in CMD.
echo.
echo     Example manual backend start:
echo     py engine\ws_server.py --port 9320
echo.
pause
exit /b 1
