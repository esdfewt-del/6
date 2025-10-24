#!/bin/bash

# NanoFlowEMS Setup Script
echo "🚀 Setting up NanoFlowEMS..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cat > .env << EOF
# Database Configuration
DATABASE_URL="postgresql://username:password@localhost:5432/nanoflowems"

# Session Configuration
SESSION_SECRET="your-super-secret-session-key-change-this-in-production"

# Environment
NODE_ENV="development"

# Optional: Location Services
ENABLE_LOCATION_AUTH="true"
EOF
    echo "✅ .env file created. Please update DATABASE_URL with your database credentials."
else
    echo "✅ .env file already exists."
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Check if database is accessible
echo "🔍 Checking database connection..."
if npx tsx -e "
import { db } from './server/db';
try {
  await db.execute('SELECT 1');
  console.log('✅ Database connection successful');
  process.exit(0);
} catch (error) {
  console.log('❌ Database connection failed:', error.message);
  process.exit(1);
}
"; then
    echo "✅ Database connection verified."
    
    # Run database migration
    echo "🗄️ Running database migrations..."
    npx tsx scripts/initialize-default-data.ts
    
    echo "🎉 Setup complete! You can now run:"
    echo "   npm run dev"
    echo ""
    echo "📋 Next steps:"
    echo "   1. Update DATABASE_URL in .env file"
    echo "   2. Run: npm run dev"
    echo "   3. Open http://localhost:5173"
    echo "   4. Follow TESTING_GUIDE.md for verification"
else
    echo "❌ Database connection failed."
    echo "Please check your DATABASE_URL in .env file and ensure PostgreSQL is running."
fi
