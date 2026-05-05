@echo off
setlocal enabledelayedexpansion
echo ===================================================
echo   ENVELOPE PRO - FIREWALL SETUP (ADMIN REQUIRED)
echo ===================================================
echo.
echo This will allow other devices to access the printer app.
echo.

netsession >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERROR] PLEASE RUN THIS FILE AS ADMINISTRATOR!
    echo Right-click this file and select "Run as Administrator".
    pause
    exit /b
)

echo [1/2] Resetting Firewall Rules for Port 3000...
netsh advfirewall firewall delete rule name="Envelope Pro Server" >nul 2>&1
netsh advfirewall firewall add rule name="Envelope Pro Server" dir=in action=allow protocol=TCP localport=3000

echo [2/2] Detecting your Network Address (IP)...
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4 Address"') do (
    set "MYIP=%%a"
    set "MYIP=!MYIP: =!"
    echo SUCCESS: Your local IP is !MYIP!
)

echo.
echo ===================================================
echo FIREWALL SETUP COMPLETE!
echo.
if defined MYIP (
    echo You can now visit Envelope Pro on other devices at:
    echo http://!MYIP!:3000
) else (
    echo Rule added successfully. 
    echo Please check your Wi-Fi settings for your device IP.
)
echo ===================================================
pause
