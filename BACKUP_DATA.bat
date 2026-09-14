@echo off
setlocal
cd /d "%~dp0"
echo.
echo Laxminarayan Group - Database Backup
node scripts\backup-database.js
if errorlevel 1 (
  echo.
  echo Backup failed. Make sure Node.js and dependencies are installed.
  pause
  exit /b 1
)
echo.
echo Backup completed successfully.
pause
