@echo off
REM Build wgc_capture.dll using MSVC x64
REM Run from VS Developer Command Prompt, or let this script find vcvarsall

setlocal

REM Find vcvarsall.bat
set VCVARS="C:\Program Files\Microsoft Visual Studio\2022\Community\VC\Auxiliary\Build\vcvarsall.bat"
if not exist %VCVARS% (
    echo ERROR: vcvarsall.bat not found
    exit /b 1
)

REM Set up x64 environment
call %VCVARS% x64 >nul 2>&1

REM Compile
echo Building wgc_capture.dll...
cl /nologo /EHsc /O2 /std:c++17 /LD ^
    /I"%WindowsSdkDir%Include\%WindowsSDKVersion%cppwinrt" ^
    wgc_capture.cpp ^
    /Fe:wgc_capture.dll ^
    /link d3d11.lib dxgi.lib windowsapp.lib ole32.lib

if %ERRORLEVEL% neq 0 (
    echo BUILD FAILED
    exit /b 1
)

echo BUILD OK: wgc_capture.dll
dir wgc_capture.dll

REM Cleanup intermediate files
del /q wgc_capture.obj wgc_capture.lib wgc_capture.exp 2>nul

endlocal
