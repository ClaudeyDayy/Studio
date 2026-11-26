@echo off
rem Fix round: S01 S02a S03 S04 S06 S10 S11 (+ the cheese close-up) to studio\out\frames-wald-bomber
cd /d "%~dp0"
node render.mjs check
echo.
node render.mjs 45,180,438,510,645,700,1185,1374
echo.
echo Finished. You can close this window.
pause
