@echo off
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\local-product.ps1" -Action start %*
if errorlevel 1 (
  echo ProductPulse could not start. See the message above.
  pause
  exit /b 1
)
