@echo off
setlocal
cd /d "%~dp0"
echo ================================================================
echo    LAXMINARAYAN GROUP - STARTING PRODUCTION SERVER
echo ================================================================

where pm2 >nul 2>&1
if errorlevel 1 (
  echo [INFO] PM2 not detected globally. Starting via Node with auto-recovery...
  echo (To install PM2: npm install -g pm2)
  echo.
  node server.js
) else (
  echo [INFO] Starting application under PM2 process manager...
  pm2 start ecosystem.config.js
  pm2 save
  echo.
  echo [SUCCESS] Server running under PM2 daemon.
  pm2 status
)
pause
