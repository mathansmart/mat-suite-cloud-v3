@echo off
echo Installing Envelope Pro Background Service...
cd /d "c:\Users\Milton\.gemini\antigravity\scratch\envelope-pro"

echo 1. Installing dependencies (Express, CORS)...
call npm install express cors --save

echo 2. Registering background startup script...
copy /y "c:\Users\Milton\.gemini\antigravity\scratch\envelope-pro\start_background.vbs" "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\"

echo 3. Starting server now...
start /b "" wscript "c:\Users\Milton\.gemini\antigravity\scratch\envelope-pro\start_background.vbs"

echo ==========================================
echo SETUP COMPLETE!
echo Envelope Pro is now running in the background.
echo It will also start automatically when your PC turns on.
echo You can access it at: http://localhost:3000
echo Check your D:\Desktop\PRINTER folder for data.
echo ==========================================
pause
