@echo off
echo Initializing leave types...
cd /d "%~dp0"
npx tsx scripts/initialize-default-data.ts
pause
