@echo off
rem Renders this video (muted mp4 in studio\out\<folder name>.mp4), then runs the frame checker.
cd /d "%~dp0"
node render.mjs
if errorlevel 1 goto end
node ..\..\engine\qa.mjs
:end
echo.
echo Finished. You can close this window.
pause
