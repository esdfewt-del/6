# NanoFlowEMS Setup Instructions

## Issue: Leave Types Not Showing in Dropdown

The error "Using default leave types. No leave types configured in database." occurs because the database is not properly configured or the server is not running.

## Quick Fix (Temporary)

The application already has fallback leave types that will work even without a database. The dropdown should show:
- Sick Leave
- Casual Leave  
- Annual Leave
- Maternity Leave
- Paternity Leave

## Complete Setup (Recommended)

### 1. Database Setup

You need a PostgreSQL database. You can use:

**Option A: Local PostgreSQL**
1. Install PostgreSQL on your system
2. Create a database named `nanoflowems`
3. Create a `.env` file in the project root with:
```
DATABASE_URL="postgresql://username:password@localhost:5432/nanoflowems"
SESSION_SECRET="your-super-secret-session-key"
NODE_ENV="development"
```

**Option B: Cloud Database (Neon, Supabase, etc.)**
1. Sign up for a cloud PostgreSQL service
2. Get your connection string
3. Create a `.env` file with your connection string

### 2. Start the Server

1. Open terminal in the project directory
2. Run: `npm install` (if not already done)
3. Run: `npm run dev`

### 3. Initialize Data

Once the server is running, the leave types will be automatically created when you first start the server.

## Testing

1. Open http://localhost:5173 in your browser
2. Login to the application
3. Go to the Leave Management section
4. Try to apply for leave - the dropdown should now show the leave types

## Troubleshooting

- If the server won't start, check that you have a valid DATABASE_URL in your .env file
- If you see "Using default leave types" message, the fallback system is working
- The application will work with fallback data, but for full functionality, you need a database

## Files Modified

- `server/index.ts` - Added automatic leave types initialization
- `client/src/pages/admin/leaves.tsx` - Fixed date parsing errors
- Created setup scripts for easier deployment
