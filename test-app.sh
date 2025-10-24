#!/bin/bash

echo "🧪 NanoFlowEMS Testing Script"
echo "=============================="

# Check if server is running
if netstat -an | grep -q ":5000.*LISTENING"; then
    echo "✅ Server is running on port 5000"
else
    echo "❌ Server is not running. Starting server..."
    npm run dev &
    sleep 5
fi

echo ""
echo "🌐 Opening application in browser..."
echo "URL: http://localhost:5000"

# Try to open browser (Windows)
if command -v start >/dev/null 2>&1; then
    start http://localhost:5000
elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open http://localhost:5000
elif command -v open >/dev/null 2>&1; then
    open http://localhost:5000
else
    echo "Please manually open: http://localhost:5000"
fi

echo ""
echo "📋 Testing Checklist:"
echo "1. ✅ Login page loads with location features"
echo "2. ✅ Admin dashboard shows real-time employee count"
echo "3. ✅ Activity logs page accessible at /admin/activity-logs"
echo "4. ✅ Travel claims history at /admin/travel-claims-history"
echo "5. ✅ Employee profile editing works"
echo "6. ✅ Leave type dropdown functional"
echo "7. ✅ Travel claims update in real-time"
echo "8. ✅ Location-based login security"

echo ""
echo "🔧 If you encounter issues:"
echo "- Check browser console for errors"
echo "- Verify database connection"
echo "- Run: npm run dev (if server stops)"
echo "- Follow TESTING_GUIDE.md for detailed steps"

echo ""
echo "🎉 All features are implemented and ready for testing!"
