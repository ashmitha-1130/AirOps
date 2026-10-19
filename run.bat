@echo off
echo ================================
echo     Starting AirOps Project
echo ================================

echo.
echo [1/2] Starting Backend...
start "AirOps Backend" cmd /k "cd /d c:\Users\Soham\Desktop\airops\backend && venv\Scripts\activate && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"

timeout /t 4 /nobreak >nul

echo [2/2] Starting Frontend...
start "AirOps Frontend" cmd /k "cd /d c:\Users\Soham\Desktop\airops\frontend && npm run dev"

timeout /t 6 /nobreak >nul

echo.
echo ================================
echo  App running at:
echo  Local:   http://localhost:5173
echo  Network: http://192.168.1.103:5173
echo ================================
echo.

start http://localhost:5173
