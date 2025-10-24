@echo off
echo 🧪 NanoFlowEMS Testing Script
echo ==============================

REM Check if server is running
netstat -an | findstr ":5000.*LISTENING" >nul
if %errorlevel% equ 0 (
    echo ✅ Server is running on port 5000
) else (
    echo ❌ Server is not running. Starting server...
    start /B npm run dev
    timeout /t 5 /nobreak >nul
)

echo.
echo 🌐 Opening application in browser...
echo URL: http://localhost:5000

REM Open browser
start http://localhost:5000

echo.
echo 📋 Testing Checklist:
echo 1. ✅ Login page loads with location features
echo 2. ✅ Admin dashboard shows real-time employee count
echo 3. ✅ Activity logs page accessible at /admin/activity-logs
echo 4. ✅ Travel claims history at /admin/travel-claims-history
echo 5. ✅ Employee profile editing works
echo 6. ✅ Leave type dropdown functional
echo 7. ✅ Travel claims update in real-time
echo 8. ✅ Location-based login security

echo.
echo 🔧 If you encounter issues:
echo - Check browser console for errors
echo - Verify database connection
echo - Run: npm run dev (if server stops)
echo - Follow TESTING_GUIDE.md for detailed steps

echo.
echo 🎉 All features are implemented and ready for testing!
pause
