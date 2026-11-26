@echo off
rem Renders this video at 2K (1440x2560): muted mp4 in studio\out\<folder name>-2k.mp4
rem First test one frame: set RES=2k and run  node render.mjs 300
cd /d "%~dp0"
set RES=2k
node render.mjs
echo.
echo Finished. You can close this window.
pause
