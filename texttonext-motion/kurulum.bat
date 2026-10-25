@echo off
REM texttonext-motion — tek tıkla kurulum (Windows)
cd /d "%~dp0"
where node >nul 2>nul || winget install -e --id OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
call npm install
call npm run senkron
echo Kurulum tamam. Onizleme icin: npm run dev
pause
