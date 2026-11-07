@echo off
cd /d "%~dp0frontend"
python -m http.server 3000
