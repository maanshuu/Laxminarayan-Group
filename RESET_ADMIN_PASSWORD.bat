@echo off
setlocal
cd /d "%~dp0"
if not exist node_modules (
  echo node_modules not found. Run npm install first.
  pause
  exit /b 1
)
node scripts\reset-admin-password.js
if errorlevel 1 (
  echo.
  echo The reset did not complete.
) else (
  echo.
  echo The admin password was reset successfully.
)
pause
