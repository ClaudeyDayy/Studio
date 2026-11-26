@echo off
rem Gets Claude's newest files from GitHub into this studio folder.
rem Your renders (out), backups (_old) and node_modules are never touched.
cd /d "%~dp0"
git fetch --depth 1 origin main
git reset --hard origin/main
echo.
echo Done. You have the newest files.
pause
