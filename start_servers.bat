@echo off
title Logistics Full Stack (Single Window)
cls

:: -----------------------------
:: CONFIGURE PORTS HERE
:: -----------------------------
set FRONTEND_PORT=5174
set GO_PORT=8080
set SIM_PORT=9090
:: -----------------------------

echo ===============================
echo Starting all logistics services
echo ===============================
echo.

echo ▶ Starting Backend (.NET Simulator) on %SIM_PORT% ...
start /b cmd /c "cd service\LogisticsSim && dotnet run --urls=http://localhost:%SIM_PORT%"

echo ▶ Starting Go API Backend on %GO_PORT% ...
start /b cmd /c "cd logistics-backend && set PORT=%GO_PORT% && go run ./cmd/server"

echo ▶ Starting Frontend (Vite) on %FRONTEND_PORT% ...
start /b cmd /c "cd logistics-frontend && npm run dev -- --port %FRONTEND_PORT%"

echo.
echo Waiting for frontend to boot...
timeout /t 8 >nul

echo 🌐 Opening browser at http://localhost:%FRONTEND_PORT%
start http://localhost:%FRONTEND_PORT%

echo.
echo ===============================
echo All services are running!
echo ===============================
echo Press CTRL + C anytime to stop.
echo (It will NOT auto-stop processes.)
echo.

pause
