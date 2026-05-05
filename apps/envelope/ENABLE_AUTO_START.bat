@echo off
setlocal enabledelayedexpansion
title ENVELOPE PRO - AUTO START SETUP
echo ===================================================
echo   ENVELOPE PRO - FULL AUTOMATION SETUP
echo ===================================================
echo.

set "PROJ_DIR=%~dp0"
set "PROJ_DIR=!PROJ_DIR:~0,-1!"
set "STARTUP_FOLDER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "VBS_NAME=start_envelope_pro.vbs"
set "NODE_PATH=C:\Program Files\nodejs\node.exe"

echo [1/5] Cleaning up old startup entries...
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "EnvelopeProServer" /f >nul 2>&1
del /q "!STARTUP_FOLDER!\start_background.vbs" >nul 2>&1
echo ✅ Cleaned.

echo [2/5] Registering background service with absolute path...
(
echo Set WshShell = CreateObject^("WScript.Shell"^)
echo WshShell.CurrentDirectory = "!PROJ_DIR!"
echo WshShell.Run "cmd /c ""!NODE_PATH!"" server.js >> startup_log.txt 2>&1", 0, False
) > "!STARTUP_FOLDER!\!VBS_NAME!"

echo [3/5] Creating Desktop Shortcut...
set "DESKTOP_DIR=D:\Desktop"
set "SHORTCUT_PATH=!DESKTOP_DIR!\Envelope Pro.lnk"
set "TARGET_PATH=!PROJ_DIR!\RUN_ENVELOPE_PRO.bat"
set "ICON_PATH=C:\Windows\System32\shell32.dll,197"

powershell -Command "$s=(New-Object -COM WScript.Shell).CreateShortcut('!SHORTCUT_PATH!');$s.TargetPath='!TARGET_PATH!';$s.WorkingDirectory='!PROJ_DIR!';$s.IconLocation='!ICON_PATH!';$s.Save()"
echo ✅ Desktop Shortcut created at: !SHORTCUT_PATH!

echo [4/5] Checking Firewall...
netsh advfirewall firewall show rule name="Envelope Pro Server" >nul 2>&1
if !errorLevel! neq 0 (
    echo [TIP] You might need to run SETUP_FIREWALL.bat for network access.
) else (
    echo ✅ Firewall configured.
)

echo [5/5] Restarting background service...
taskkill /F /IM node.exe /T >nul 2>&1
start /b "" wscript "!STARTUP_FOLDER!\!VBS_NAME!"
echo ✅ System is live in background!

echo.
echo ===================================================
echo DONE! Envelope Pro is now fully automatic.
echo It will work quietly every time you turn on your PC.
echo.
echo Project Path: !PROJ_DIR!
echo Check "startup_log.txt" to verify performance.
echo ===================================================
pause
