@echo off
rem Round 2 fixes: S05 S07a S12 S13 S14 to studio\out\frames-wald-bomber
cd /d "%~dp0"
node render.mjs check
echo.
node render.mjs 590,780,1505,1550,1680
echo.
echo Finished. You can close this window.
pause
