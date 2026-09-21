@echo off
setlocal
cd /d "%~dp0"
echo ================================================================
echo    LAXMINARAYAN GROUP - RUNNING CLOUD BACKUP
echo ================================================================
node scripts\cloud-backup.js
if errorlevel 1 (
  echo.
  echo [ERROR] The backup encountered an issue. Check the logs above.
) else (
  echo.
  echo [SUCCESS] Backup completed successfully.
)
echo.
pause
