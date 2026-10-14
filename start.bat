@echo off
setlocal
title DashTask - SAFe Dashboard
cd /d "%~dp0"

echo ============================================================
echo   DashTask - SAFe Role-Based Dashboard
echo   React + Express + Local JSON Database (MVC)
echo ============================================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js no esta instalado.
  echo Descarga e instala Node.js LTS desde https://nodejs.org
  pause
  exit /b 1
)

echo [0/3] Liberando puertos 4100 y 5173 si estan en uso...
powershell -NoProfile -Command "foreach ($port in 4100,5173) { Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue } }" >nul 2>nul

echo [1/3] Instalando dependencias...
call npm install
if errorlevel 1 (
  echo [ERROR] Fallo la instalacion de dependencias.
  pause
  exit /b 1
)

if not exist "server\src\data\db.json" (
  echo [2/3] Generando base de datos local...
  call npm run seed
) else (
  echo [2/3] Base de datos local encontrada.
)

echo [3/3] Iniciando servidor y cliente...
echo.
echo   API -^> http://localhost:4100
echo   Web -^> http://localhost:5173
echo.
echo   Password de prueba: demo123
echo   Usuario intake   : ing.intake@dashtask.io
echo.
echo   Presiona CTRL+C para detener.
echo ============================================================
echo.

start "" powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 7; Start-Process 'http://localhost:5173'"

call npm run dev

endlocal
