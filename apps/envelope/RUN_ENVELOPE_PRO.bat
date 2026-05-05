@echo off
setlocal enabledelayedexpansion
title Envelope Pro - Active Server
echo ===================================================
echo           ENVELOPE PRO - PRINTING SUITE
echo ===================================================
echo.

cd /d "%~dp0"

:: 1. Check if server is already running (Fastest Check)
echo [1/3] Checking server status...
powershell -Command "$t = New-Object Net.Sockets.TcpClient; try { $t.Connect('127.0.0.1', 3000); $t.Close(); exit 0 } catch { exit 1 }"
if %errorLevel% equ 0 (
    echo [INFO] Server is already active. Opening browser...
    start "" "http://localhost:3000"
    exit /b
)

:: 2. Start the server in background if not running
echo [1/3] Starting Local Server in background...
start /b "" cmd /c "node server.js >> startup_log.txt 2>&1"

:: 3. Poll for readiness (Wait up to 15 seconds)
echo [2/3] Waiting for server to initialize...
set "ready=0"
for /l %%x in (1, 1, 15) do (
    if !ready! equ 0 (
        powershell -Command "$t = New-Object Net.Sockets.TcpClient; try { $t.Connect('127.0.0.1', 3000); $t.Close(); exit 0 } catch { exit 1 }"
        if !errorLevel! equ 0 (
            set "ready=1"
        ) else (
            <nul set /p "=."
            timeout /t 1 >nul
        )
    )
)
echo.

if "!ready!"=="1" (
    echo [3/3] Server ready!
    timeout /t 1 >nul
    echo Opening Envelope Pro...
    start "" "http://localhost:3000"
) else (
    echo.
    echo [ERROR] Server failed to start within 15 seconds.
    echo.
    echo [TIP] Try running 'FINAL_DIAGNOSTIC_FIX.bat' as Administrator.
    echo.
    pause
)
