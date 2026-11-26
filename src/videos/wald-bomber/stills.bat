@echo off
rem Round 2: S02b S05 S07a S09 S12 S13 S14 S15 (S16 ends on the approved S01 frame) to studio\out\frames-wald-bomber
cd /d "%~dp0"
node render.mjs check
echo.
node render.mjs 300,590,780,1060,1505,1550,1680,1760
echo.
echo Finished. You can close this window.
pause
