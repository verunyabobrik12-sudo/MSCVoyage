@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"

set PORT=8080
set URL=http://localhost:%PORT%

node --version >nul 2>nul
if %errorlevel%==0 (
  echo Запускаю сервер на %URL% ...
  start "" cmd /c "timeout /t 1 >nul & start "" "%URL%""
  node tools\serve.mjs
  goto :eof
)

python --version >nul 2>nul
if %errorlevel%==0 (
  echo Node.js не найден, пробую через Python...
  start "" cmd /c "timeout /t 1 >nul & start "" "%URL%""
  python -m http.server %PORT%
  goto :eof
)

py --version >nul 2>nul
if %errorlevel%==0 (
  echo Node.js не найден, пробую через Python (py)...
  start "" cmd /c "timeout /t 1 >nul & start "" "%URL%""
  py -m http.server %PORT%
  goto :eof
)

echo Не найден ни Node.js, ни Python.
echo Установите Node.js (https://nodejs.org) или Python (https://python.org) — достаточно одного из них.
pause
