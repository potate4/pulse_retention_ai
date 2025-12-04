@echo off
REM ===================================================================
REM  Pulse Retention AI - Dummy Website Launcher
REM  This script starts the backend and dummy website servers
REM ===================================================================

echo.
echo ╔═══════════════════════════════════════════════════════════════╗
echo ║     Pulse Retention AI - Dummy Website with Widget        ║
echo ╚═══════════════════════════════════════════════════════════════╝
echo.

REM Check if we're in the correct directory
if not exist "backend" (
    echo ❌ ERROR: backend folder not found!
    echo Please run this script from the project root directory.
    pause
    exit /b 1
)

if not exist "dummy-client-website" (
    echo ❌ ERROR: dummy-client-website folder not found!
    pause
    exit /b 1
)

echo ✅ Project folders found
echo.

REM Step 1: Start Backend Server
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo  STEP 1: Starting Backend Server (Port 8000)
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.

echo Starting backend in new window...
start "Pulse Backend (Port 8000)" cmd /k "cd backend && .\venv\Scripts\activate && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

echo ⏳ Waiting 5 seconds for backend to start...
timeout /t 5 /nobreak >nul

echo.

REM Step 2: Start Dummy Website Server
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo  STEP 2: Starting Dummy Website Server (Port 8080)
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.

echo Starting dummy website in new window...
start "Dummy Website (Port 8080)" cmd /k "cd dummy-client-website && python -m http.server 8080"

echo ⏳ Waiting 3 seconds for website server to start...
timeout /t 3 /nobreak >nul

echo.

REM Step 3: Open Test Pages
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo  STEP 3: Opening Test Pages in Browser
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.

echo Opening Simple Test Page...
start http://localhost:8080/test-simple.html

timeout /t 2 /nobreak >nul

echo.
echo ╔═══════════════════════════════════════════════════════════════╗
echo ║                    ✅ ALL SERVERS STARTED!                    ║
echo ╚═══════════════════════════════════════════════════════════════╝
echo.
echo 🌐 Servers Running:
echo    - Backend API:      http://localhost:8000
echo    - Dummy Website:    http://localhost:8080
echo.
echo 🧪 Test Pages:
echo    - Simple Test:      http://localhost:8080/test-simple.html  ⭐ OPENED
echo    - Full Demo:        http://localhost:8080/login.html
echo    - API Docs:         http://localhost:8000/docs
echo.
echo 📊 Expected Behavior:
echo    1. Test page loads in browser
echo    2. After 2.5 seconds, popup appears
echo    3. Popup shows personalized offer
echo    4. Click X or outside to close
echo.
echo 🔍 Debugging:
echo    - Press F12 to open DevTools
echo    - Check Console tab for widget logs
echo    - Check Network tab for API calls
echo.
echo ⚠️  To stop servers:
echo    - Close the two server windows that opened
echo    - Or press Ctrl+C in each window
echo.
echo 📖 For detailed guide, see: START_DUMMY_WEBSITE.md
echo.

pause



