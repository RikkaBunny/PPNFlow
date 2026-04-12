@echo off
setlocal
cd /d "%~dp0"
title PPNFlow Engine (Admin)

echo [*] Stopping any previous ws_server.py process...
wmic process where "CommandLine like '%%ws_server%%' and Name='python.exe'" call terminate >nul 2>&1
timeout /t 1 >nul

echo [*] Removing Python cache folders...
for /d /r "engine" %%d in (__pycache__) do rd /s /q "%%d" 2>nul

echo [*] Starting Python WebSocket engine...
python -B -X utf8 engine\ws_server.py
pause
