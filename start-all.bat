@echo off
echo Starting Customer Care Bot...
echo.

echo Starting Backend...
start cmd /k "cd backend && venv\Scripts\activate && uvicorn app.main:app --reload"

timeout /t 3

echo Starting Frontend...
start cmd /k "cd frontend && npm start"

echo.
echo ========================================
echo Both servers are starting...
echo ========================================
echo Backend: http://localhost:8000
echo Frontend: http://localhost:4200
echo API Docs: http://localhost:8000/docs
echo ========================================
