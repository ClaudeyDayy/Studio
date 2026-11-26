@echo off
rem Fix round 2: S01 S02a S03 S04 cheese S07b S11 to studio\out\frames-wald-bomber
cd /d "%~dp0"
node render.mjs check
echo.
node render.mjs 45,180,438,510,700,900,1374
echo.
echo Finished. You can close this window.
pause
