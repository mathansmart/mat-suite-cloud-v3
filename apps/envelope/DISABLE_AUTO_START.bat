@echo off
echo ===================================================
echo   ENVELOPE PRO - DISABLE AUTO-START
echo ===================================================
echo.

set "STARTUP_FOLDER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"

echo 1. Removing shortcut from Startup folder...
del /q "%STARTUP_FOLDER%\start_background.vbs"

echo 2. Turning off active background server...
taskkill /F /FI "WINDOWTITLE eq Envelope Pro - Active Server" >nul 2>&1
taskkill /F /IM node.exe /FI "MODULES eq server.js" >nul 2>&1
:: Failsafe: kill any node process listening on 3000
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000') do taskkill /F /PID %%a >nul 2>&1

echo.
echo ===================================================
echo AUTO-START DISABLED.
echo The server will no longer start automatically.
echo ===================================================
pause
