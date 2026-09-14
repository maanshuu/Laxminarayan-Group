@echo off
title Laxminarayan Group
echo Installing website backend...
call npm install
if errorlevel 1 (
  echo.
  echo Installation failed, so the website was not started.
  echo Please resolve the npm error above, then run this file again.
  pause
  exit /b 1
)
echo.
echo Starting Laxminarayan Group website...
npm start
if errorlevel 1 (
  echo.
  echo The website backend did not start. Review the error above, then run this file again.
)
pause
