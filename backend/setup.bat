@echo off
echo Setting up Customer Care Bot Backend...
echo.

echo Creating virtual environment...
python -m venv venv

echo.
echo Activating virtual environment...
call venv\Scripts\activate

echo.
echo Installing dependencies...
pip install -r requirements.txt

echo.
echo Creating .env file from template...
if not exist .env (
    copy .env.example .env
    echo .env file created. Please update it with your configuration.
) else (
    echo .env file already exists.
)

echo.
echo Initializing database...
python init_db.py

echo.
echo ========================================
echo Setup complete!
echo ========================================
echo.
echo To start the server:
echo   1. Activate the virtual environment: venv\Scripts\activate
echo   2. Run: uvicorn app.main:app --reload
echo.
echo API will be available at: http://localhost:8000
echo API docs: http://localhost:8000/docs
echo.

pause
