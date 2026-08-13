@echo off
cd /d "%~dp0.."
python scripts/upload_firmware.py %*
pause
