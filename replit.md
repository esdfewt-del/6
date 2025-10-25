# Nano Flows EMS - Employee Management System

## Overview
A modern, intelligent Employee Management System built for Nano Flows AI Technologies Pvt. Ltd. This comprehensive HR platform manages attendance, leaves, salary processing, travel claims, and employee data with role-based access control.

## Tech Stack
- **Frontend**: React, TypeScript, Tailwind CSS, Shadcn UI, Wouter (routing), TanStack Query
- **Backend**: Express.js, Node.js
- **Database**: PostgreSQL (Neon)
- **Authentication**: bcryptjs for password hashing

## Features
### Multi-Role Authentication
- **Client Login**: Company creation and admin access
- **Employee Login**: Individual employee portal
- **Admin Login**: Full system management access

### Employee Dashboard
- Attendance tracking with check-in/check-out
- Leave status and balance
- Salary information and payslips
- Daily activity log
- Travel claims submission
- Profile management

### Admin Dashboard
- Employee overview and statistics
- Attendance management and reports
- Leave approval workflow
- Salary processing and management
- Travel claim approvals
- Notification broadcasting (Email/WhatsApp)

### Core Modules
1. **Attendance System**: Real-time check-in/out with date, time, location capture
2. **Leave Management**: Application submission and approval workflow
3. **Travel & Reimbursement**: Expense claim submission and approval
4. **Salary Management**: Payslip generation and processing
5. **Activity Logs**: Daily work activity tracking
6. **Notifications**: System-wide alerts and updates

## Database Schema
- `companies` - Company information
- `users` - Employee/admin accounts with role-based access
- `attendance` - Check-in/check-out records
- `leaves` - Leave applications and approvals
- `travelClaims` - Travel expense claims
- `salaries` - Monthly salary records
- `activityLogs` - Daily employee activity logs
- `notifications` - System notifications

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Company creation
- `POST /api/auth/login` - User login

### Employees
- `GET /api/employees?companyId=` - Get all employees
- `POST /api/employees` - Create employee
- `PUT /api/employees/:id` - Update employee
- `GET /api/employees/:id` - Get employee by ID

### Attendance
- `POST /api/attendance` - Check in
- `PUT /api/attendance/:id` - Check out
- `GET /api/attendance/user/:userId` - Get user attendance history
- `GET /api/attendance/today/:userId` - Get today's attendance
- `GET /api/attendance/company/:companyId` - Get company attendance

### Leaves
- `POST /api/leaves` - Apply for leave
- `GET /api/leaves/user/:userId` - Get user leaves
- `GET /api/leaves/pending/:companyId` - Get pending leaves
- `PUT /api/leaves/:id/status` - Approve/reject leave

### Travel Claims
- `POST /api/travel-claims` - Submit claim
- `GET /api/travel-claims/user/:userId` - Get user claims
- `GET /api/travel-claims/pending/:companyId` - Get pending claims
- `PUT /api/travel-claims/:id/status` - Approve/reject claim

### Salaries
- `POST /api/salaries` - Create salary record
- `GET /api/salaries/user/:userId` - Get user salaries
- `GET /api/salaries/user/:userId/month/:month` - Get specific month salary

### Activity Logs
- `POST /api/activity-logs` - Create log
- `GET /api/activity-logs/user/:userId` - Get user logs

### Notifications
- `POST /api/notifications` - Create notification
- `GET /api/notifications/user/:userId` - Get user notifications
- `PUT /api/notifications/:id/read` - Mark as read

## Design System
Following Nano Flows AI branding:
- **Primary Color**: Blue (#0ea5e9) - Vibrant brand blue
- **Accent Color**: Cyan (#06b6d4) - Highlight color
- **Typography**: Inter (UI), Space Grotesk (Headers), JetBrains Mono (Data)
- **Theme**: Light/Dark mode support
- **Components**: Shadcn UI with custom Nano Flows styling

## Project Structure
```
/client - Frontend React app
  /src
    /assets - Logo and images
    /components - Reusable UI components
    /pages - Application pages
    /lib - Utilities and contexts
/server - Backend Express app
  db.ts - Database connection
  storage.ts - Data access layer
  routes.ts - API endpoints
/shared - Shared types and schemas
```

## Development
- Frontend runs on Vite dev server
- Backend runs on Express
- Database connection via PostgreSQL (Neon)
- Both served on same port in production

## Company Information
**Nano Flows AI Software Technologies**
- Launch Date: November 1, 2025
- Location: TF-301, 1-152, Sapthagiri Nagar, Revenue Ward-70, Near Chinamushidiwada, Visakhapatnam – 530051
- Based in: Visakhapatnam (Vizag), India

**Services:**
- Generative AI Solutions
- Machine Learning & Data Science
- Chatbot & Workflow Automation
- Custom Web & App Development
- AI Tools & Resources

**Contact:**
- Website: http://nanoflows.in
- Email: nanoflowsvizag@gmail.com | nanoflowsai@gmail.com
- Phone: +91 80193 58855 | +91 80196 58855
- Facebook: https://www.facebook.com/profile.php?id=61581861941980

**Target Audience:** Startups to Enterprises

## Admin Credentials
**Company Admin Account:**
- Email: nanoflowsvizag@gmail.com
- Password: Kiran@1234#

## Recent Changes

### October 25, 2025 - Reports & Analytics Page Redesign ✅
- **KPI Cards Update**:
  - ✅ Changed "Pending Leaves" to "Leaves Approved This Month"
  - ✅ Shows current month's approved leaves count dynamically
  - ✅ Displays current month name (e.g., "October 2025")
  
- **Independent Date Ranges**:
  - ✅ Attendance Report has its own start/end date filters
  - ✅ Leave Report has separate, independent start/end date filters
  - ✅ Both default to current month (October 1-31, 2025)
  - ✅ No more shared date state between reports
  
- **Attendance Report Enhancements**:
  - ✅ Line chart shows only present employees (monthly data)
  - ✅ Default view set to current month instead of 6 months
  - ✅ Clear visualization of present employees per month
  - ✅ Statistics: Total Present, Total Records, Attendance Rate
  
- **Leave Report (Approved) Enhancements**:
  - ✅ Replaced Radar Chart with Area Chart (capability analysis)
  - ✅ Beautiful blue gradient fill for better visualization
  - ✅ Shows approved leaves distribution across months
  - ✅ All leaves render properly in the area chart
  - ✅ Statistics: Total Approved, Total Days, Avg Days/Leave
  
- **Data Source**:
  - ✅ All data loaded from PostgreSQL database only
  - ✅ No sample or mock data
  - ✅ Real-time queries to attendance and leave tables
  - ✅ Proper date range filtering on backend

### October 24, 2025 - Attendance Management Complete Rebuild ✅
- **Admin Dashboard - Attendance Management** (Completely Redesigned):
  - ✅ Daily attendance view for ALL employees (not just present ones)
  - ✅ Top stats: Total Employees, Present Today, On Leave (real-time data)
  - ✅ Donut chart (pie with center circle) showing attendance distribution:
    - Selected day breakdown: Present (green), Absent (red), On Leave (orange)
    - Total employees displayed in center of donut
    - Date selector to view any day's distribution
  - ✅ Daily Attendance bar chart showing last 7 days:
    - All 7 days displayed (even days with zero attendance)
    - Clear visualization of employees present per day
  - ✅ Export to Excel downloads ALL employees shown in table:
    - Includes present, absent, and on-leave employees
    - Handles missing check-in/check-out times properly
    - One-click export for selected date
  - ✅ Attendance Records table shows ALL employees:
    - Sorted by status (present first, then leave, then absent)
    - Color-coded status badges (green/orange/red)
    - Employee names, check-in/out times, total hours, location
    - Handles absent employees (no check-in data) gracefully
  - ✅ Real-time updates every 30 seconds
  
- **Admin Dashboard - Enhanced Reports**:
  - ✅ Day-wise Absents/Leaves line chart with date range filtering
  - ✅ Overall Employee Attendance bar chart (present/absent/leave breakdown)
  - ✅ Attendance Distribution pie chart
  - ✅ Loading states and empty state messages
  - ✅ Interactive date range selection
  
- **Admin Dashboard - Leave Management**:
  - ✅ Actions column removed from Leave Requests table as requested
  - ✅ Cleaner, streamlined interface
  
- **Employee Dashboard - Complete Redesign**:
  - ✅ Settings section removed entirely
  - ✅ Daily Attendance Graph with month selection dropdown (bar chart)
  - ✅ Monthly Summary Pie Chart showing present/absent/leave distribution
  - ✅ Notifications section added
  - ✅ Proper date handling for attendance records
  - ✅ Loading states and empty states throughout
  - ✅ Real-time data updates every 30 seconds
  
- **Backend Improvements**:
  - ✅ `/api/attendance/company` endpoint enhanced with employee name joins
  - ✅ Date range filtering support added to attendance queries
  - ✅ Optimized database queries with proper joins
  
- **Code Quality**:
  - ✅ All LSP diagnostics resolved
  - ✅ Architect review passed
  - ✅ No regressions or breaking changes
  - ✅ Proper error handling and loading states

### October 21, 2025 - Logos Integrated & Delete Filter Fixed ✅
- **Logo Integration**: Added official Nano Flows logos
  - JPG logo (blue gradient wave) above "Employee Management System" on login page
  - PNG logo in sidebar and mobile view
  - Professional branding throughout app
  
- **Delete Functionality Fixed**: Employee deletion now fully working
  - **Bug Fixed**: Filter was checking non-existent `status` field instead of `isActive` boolean
  - **Fix Applied**: Updated filter logic, status display, and active count to use `isActive`
  - Deleted employees now correctly appear in "Inactive" filter
  - Status badges properly show "active" or "inactive"
  - Soft delete (isActive: false) working end-to-end
  - Backend endpoint `/api/employees/:id` DELETE verified

### October 21, 2025 - Backend API Routes Fixed ✅
- **Missing API Routes Added**:
  - `GET /api/leaves/user/:userId` - Get all leaves for a user
  - `GET /api/attendance/user/:userId` - Get all attendance records for a user
  - Both routes verify company ownership and return JSON
  
- **Activity Log Schema Fixed**:
  - Updated `insertActivityLogSchema` to accept ISO date strings
  - Added `z.coerce.date()` for automatic date conversion
  - No more "Expected date, received string" errors

### October 21, 2025 - All Buttons Activated & Backend Connected ✅
  
- **Employee Dashboard Enhancements**:
  - ✅ Quick action buttons now navigate to respective pages
    - Check In/Out → /attendance
    - Apply Leave → /leaves
    - Add Travel → /travel
    - View Payslip → /salary
    - Update Profile → /profile
  - ✅ Daily activity log save functionality connected to backend
    - POST /api/activity-logs with validation
    - Success toast feedback
    - Proper query cache invalidation
  
- **Admin Dashboard Improvements**:
  - ✅ All navigation buttons connected
    - "View All Leave Requests" → /admin/leaves
    - "View All Travel Claims" → /admin/travel
    - "Manage Salaries" → /admin/salary
  - ✅ Leave/travel cards navigate to detail pages
  
- **Critical Bug Fix - Travel Claims**:
  - Fixed 500 error on GET /api/travel-claims/pending
  - Root cause: Function was querying wrong table (travelClaims vs travelRequests)
  - Solution: Updated `getPendingTravelClaims()` and `updateTravelClaimStatus()` to use `travelRequests` table
  - Travel approval workflow now works correctly
  
- **API Corrections**:
  - Fixed admin travel endpoints: `/api/travel-claims/:id/status`
  - Correct query keys: `/api/travel-claims/pending`
  - All apiRequest calls use correct signature: `apiRequest(method, url, data)`

### October 21, 2025 - UX Improvements & Full CRUD ✅
- **Login Redirect Fix**: Eliminated double-click issue for admin login
  - Fixed race condition by deferring redirect with setTimeout
  - Admin/HR users now redirect to dashboard in single click
  
- **Employee Management Enhancement**: Added full CRUD operations
  - ✅ Create - Add new employees
  - ✅ Read - View and filter employee list
  - ✅ Update - Edit employee details with dialog (password optional)
  - ✅ Delete - Remove employees with confirmation dialog
  - Actions column with Edit (pencil) and Delete (trash) buttons
  - Real-time UI updates after operations
  - Proper validation and error handling

### October 21, 2025 - Testing & Bug Fixes Complete ✅
- **Comprehensive E2E Testing**: All core workflows tested and verified working
  - Employee creation, attendance check-in, leave application, travel claims
  - Admin approval workflows (leaves & travel)
  - Cross-workflow verification (approvals reflect on employee side)
  
- **Critical Bug Fixes**:
  - Fixed travel claim date validation (malformed date issue resolved)
  - Fixed admin queryKey patterns (removed companyId from keys)
  - Fixed storage layer join queries (proper flat object mapping)
  - Fixed field name mismatches (appliedAt, createdAt, estimatedCost)
  - Removed non-existent `approvedAt` field from travelRequests queries
  
- **Date Validation Enhancement**:
  - Added frontend regex validation for YYYY-MM-DD format
  - User-friendly error messages for invalid dates
  - Proper ISO format conversion before backend submission
  - Backend `z.coerce.date()` validation working correctly
  
- **System Status**: Production-ready MVP
  - All employee workflows functional
  - All admin workflows functional
  - Multi-tenant security working (company isolation)
  - Session-based authentication stable
  - Query invalidation updating UI properly

### Initial Implementation
- Complete authentication system with role-based access
- All core modules implemented (attendance, leaves, salary, travel claims)
- PostgreSQL database schema created and migrated
- Frontend connected to backend APIs
- Beautiful UI with Nano Flows branding
