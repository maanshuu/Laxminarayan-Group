@echo off
title Trust Localhost SSL Certificate - Laxminarayan Group
echo ======================================================================
echo  Trust Localhost SSL Certificate for Laxminarayan Group
echo ======================================================================
echo.
set CERT_PATH=%APPDATA%\LaxminarayanGroup\certs\cert.pem

if not exist "%CERT_PATH%" (
  echo [ERROR] Certificate file not found at:
  echo "%CERT_PATH%"
  echo Please make sure START_BACKEND.bat has been run at least once.
  pause
  exit /b 1
)

echo Adding certificate to your Windows Current User Root Store...
certutil -addstore -user Root "%CERT_PATH%"

echo.
echo ----------------------------------------------------------------------
echo Done! If Windows showed a security confirmation dialog, click [Yes].
echo Then close and restart Chrome. 
echo Chrome will now recognize https://localhost:5000 as trusted!
echo ----------------------------------------------------------------------
pause
