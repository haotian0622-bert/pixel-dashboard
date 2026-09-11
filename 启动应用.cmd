@echo off
cd /d "%~dp0"
title PixelConsole
mode con cols=80 lines=22

echo.
echo  ============================================
echo    Pixel Console - Starting...
echo  ============================================
echo.

rem ===== Find Node.exe =====
set "NODE_EXE="
where node >nul 2>nul
if not errorlevel 1 (
    for /f "delims=" %%i in ('where node') do set "NODE_EXE=%%i"
)
if not defined NODE_EXE (
    if exist "C:\Program Files\nodejs\node.exe" set "NODE_EXE=C:\Program Files\nodejs\node.exe"
)
if not defined NODE_EXE (
    if exist "%ProgramFiles(x86)%\nodejs\node.exe" set "NODE_EXE=%ProgramFiles(x86)%\nodejs\node.exe"
)
if not defined NODE_EXE (
    echo  [ERROR] Node.js not found.
    echo  Install: https://nodejs.org/
    echo.
    pause
    exit /b 1
)
echo  Node: %NODE_EXE%

rem ===== Check serve.cjs =====
if not exist "%~dp0serve.cjs" (
    echo  [ERROR] serve.cjs not found.
    echo.
    pause
    exit /b 1
)

rem ===== Check dist =====
if not exist "%~dp0dist\index.html" (
    echo  [INIT] Building app, please wait 1-2 min...
    echo.
    call npm install
    if errorlevel 1 goto fail
    call npx vite build
    if errorlevel 1 goto fail
    echo.
    echo  [INIT] Done.
    echo.
)

rem ===== Start server =====
echo.
echo  Starting server...
echo  Browser will open http://localhost:5173/
echo  [TIP] Close this window to stop.
echo.
"%NODE_EXE%" "%~dp0serve.cjs"
goto end

:fail
echo.
echo  [ERROR] Startup failed.
echo.
pause
exit /b 1

:end
echo.
echo  App stopped.
pause
