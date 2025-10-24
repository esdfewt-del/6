@echo off
echo 🚀 Setting up NanoFlowEMS...

REM Check if .env file exists
if not exist .env (
    echo 📝 Creating .env file...
    (
        echo # Database Configuration
        echo DATABASE_URL="postgresql://username:password@localhost:5432/nanoflowems"
        echo.
        echo # Session Configuration
        echo SESSION_SECRET="your-super-secret-session-key-change-this-in-production"
        echo.
        echo # Environment
        echo NODE_ENV="development"
        echo.
        echo # Optional: Location Services
        echo ENABLE_LOCATION_AUTH="true"
    ) > .env
    echo ✅ .env file created. Please update DATABASE_URL with your database credentials.
) else (
    echo ✅ .env file already exists.
)

REM Install dependencies
echo 📦 Installing dependencies...
npm install

REM Check if database is accessible
echo 🔍 Checking database connection...
npx tsx -e "import { db } from './server/db'; try { await db.execute('SELECT 1'); console.log('✅ Database connection successful'); process.exit(0); } catch (error) { console.log('❌ Database connection failed:', error.message); process.exit(1); }"

if %errorlevel% equ 0 (
    echo ✅ Database connection verified.
    
    REM Run database migration
    echo 🗄️ Running database migrations...
    npx tsx scripts/initialize-default-data.ts
    
    echo 🎉 Setup complete! You can now run:
    echo    npm run dev
    echo.
    echo 📋 Next steps:
    echo    1. Update DATABASE_URL in .env file
    echo    2. Run: npm run dev
    echo    3. Open http://localhost:5173
    echo    4. Follow TESTING_GUIDE.md for verification
) else (
    echo ❌ Database connection failed.
    echo Please check your DATABASE_URL in .env file and ensure PostgreSQL is running.
)

pause
