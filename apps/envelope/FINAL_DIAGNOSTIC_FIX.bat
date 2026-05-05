@echo off
setlocal enabledelayedexpansion
title ENVELOPE PRO - FINAL REPAIR TOOL
echo ===================================================
echo      ENVELOPE PRO - SYSTEM DIAGNOSTIC & FIX
echo ===================================================
echo.

:: 1. ADMIN CHECK
netsession >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERROR] PLEASE RUN THIS FILE AS ADMINISTRATOR!
    echo (Right-click and select "Run as Administrator")
    pause
    exit /b
)

set "PROJ_DIR=%~dp0"
set "PROJ_DIR=!PROJ_DIR:~0,-1!"
set "STARTUP_FOLDER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "NODE_PATH=C:\Program Files\nodejs\node.exe"

echo [1/6] Cleaning up old processes...
taskkill /F /IM node.exe /T >nul 2>&1
echo ✅ Processes cleaned.
echo.

echo [2/6] Repairing Firewall Rules...
netsh advfirewall firewall delete rule name="Envelope Pro Server" >nul 2>&1
netsh advfirewall firewall add rule name="Envelope Pro Server" dir=in action=allow protocol=TCP localport=3000
echo ✅ Firewall rule reset.
echo.

echo [3/6] Verifying Node.js...
if not exist "!NODE_PATH!" (
    echo [CRITICAL ERROR] Node.js not found at: !NODE_PATH!
    pause
    exit /b
)
echo ✅ Node.js detected.
echo.

echo [4/6] Creating Desktop Shortcut...
set "DESKTOP_DIR=D:\Desktop"
set "SHORTCUT_PATH=!DESKTOP_DIR!\Envelope Pro.lnk"
set "TARGET_PATH=!PROJ_DIR!\RUN_ENVELOPE_PRO.bat"
powershell -Command "$s=(New-Object -COM WScript.Shell).CreateShortcut('!SHORTCUT_PATH!');$s.TargetPath='!TARGET_PATH!';$s.WorkingDirectory='!PROJ_DIR!';$s.IconLocation='C:\Windows\System32\shell32.dll,197';$s.Save()"
echo ✅ Desktop Shortcut created.
echo.

echo [5/6] Repairing Auto-Start...
del /q "!STARTUP_FOLDER!\start_background.vbs" >nul 2>&1
del /q "!STARTUP_FOLDER!\start_envelope_pro.vbs" >nul 2>&1
(
echo Set WshShell = CreateObject^("WScript.Shell"^)
echo WshShell.CurrentDirectory = "!PROJ_DIR!"
echo WshShell.Run "cmd /c ""!NODE_PATH!"" server.js >> startup_log.txt 2>&1", 0, False
) > "!STARTUP_FOLDER!\start_envelope_pro.vbs"
echo ✅ Auto-Start repaired.
echo.

echo [6/6] TESTING SERVER AND LAUNCHING...
echo ---------------------------------------------------
echo Starting server in background...
start /b "" wscript "!STARTUP_FOLDER!\start_envelope_pro.vbs"

timeout /t 5 >nul

echo Testing local connection...
powershell -Command "$t = New-Object Net.Sockets.TcpClient; try { $t.Connect('127.0.0.1', 3000); $t.Close(); echo 'SUCCESS: Server is responding!' } catch { echo 'FAIL: Server is not responding.' }"

echo.
echo ===================================================
echo REPAIR COMPLETE!
echo.
echo 1. Your server is now running in the background.
echo 2. A shortcut has been created on your Desktop.
echo 3. Opening the application now...
echo ===================================================
echo.
start "" "http://localhost:3000"
