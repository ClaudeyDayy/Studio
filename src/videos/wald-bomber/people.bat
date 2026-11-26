@echo off
rem Wald bomber, people test: copy this cast into public\library, then 8 stills to studio\out\frames-wald-bomber
cd /d "%~dp0..\..\.."
node tools\pick-assets.mjs src\videos\wald-bomber\cast-sheet.json
if errorlevel 1 goto end
cd /d "%~dp0"
node render.mjs 15,60,105,150,195,240,285,330
:end
echo.
echo Finished. You can close this window.
pause
