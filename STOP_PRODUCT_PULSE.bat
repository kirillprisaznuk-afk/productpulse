@echo off
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\local-product.ps1" -Action stop
if errorlevel 1 (
  pause
  exit /b 1
)
