-- NanoFlowEMS Database Schema
-- Generated from schema.ts
-- PostgreSQL Database

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- CORE TABLES
-- =============================================

-- Companies table
CREATE TABLE companies (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Departments table
CREATE TABLE departments (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id VARCHAR NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    manager_id VARCHAR REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Designations table
CREATE TABLE designations (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id VARCHAR NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    level INTEGER, -- hierarchy level
    department_id VARCHAR REFERENCES departments(id),
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Users/Employees table
CREATE TABLE users (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id VARCHAR NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'employee', -- admin, hr, employee
    department_id VARCHAR REFERENCES departments(id),
    department TEXT, -- legacy field, kept for compatibility
    designation_id VARCHAR REFERENCES designations(id),
    position TEXT, -- legacy field
    manager_id VARCHAR REFERENCES users(id),
    phone TEXT,
    photo TEXT,
    skills TEXT[],
    bio TEXT,
    address TEXT,
    emergency_contact TEXT,
    emergency_phone TEXT,
    date_of_birth TIMESTAMP,
    join_date TIMESTAMP DEFAULT NOW() NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    -- Location-based login fields
    allowed_latitude DECIMAL(10,8),
    allowed_longitude DECIMAL(11,8),
    allowed_radius DECIMAL(8,2) DEFAULT 100, -- meters
    enable_location_auth BOOLEAN DEFAULT FALSE NOT NULL
);

-- =============================================
-- ATTENDANCE & TIME TRACKING
-- =============================================

-- Attendance records
CREATE TABLE attendance (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    check_in TIMESTAMP NOT NULL,
    check_out TIMESTAMP,
    location TEXT,
    check_in_coordinates TEXT, -- lat,long
    check_out_coordinates TEXT, -- lat,long
    status TEXT NOT NULL DEFAULT 'present', -- present, absent, half-day, leave
    date TIMESTAMP NOT NULL,
    total_hours DECIMAL(5,2),
    overtime_hours DECIMAL(5,2) DEFAULT 0,
    break_minutes INTEGER DEFAULT 0,
    remarks TEXT
);

-- Attendance Breaks - track breaks during work hours
CREATE TABLE attendance_breaks (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    attendance_id VARCHAR NOT NULL REFERENCES attendance(id) ON DELETE CASCADE,
    break_start TIMESTAMP NOT NULL,
    break_end TIMESTAMP,
    break_type TEXT DEFAULT 'general', -- lunch, tea, general
    duration_minutes INTEGER
);

-- =============================================
-- LEAVE MANAGEMENT
-- =============================================

-- Leave Types - configurable leave categories
CREATE TABLE leave_types (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id VARCHAR NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL, -- Sick Leave, Casual Leave, Vacation, etc.
    code TEXT NOT NULL, -- SL, CL, VL, etc.
    max_days INTEGER NOT NULL, -- annual entitlement
    carry_forward BOOLEAN DEFAULT FALSE NOT NULL,
    is_paid BOOLEAN DEFAULT TRUE NOT NULL,
    requires_approval BOOLEAN DEFAULT TRUE NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Leave applications
CREATE TABLE leaves (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    leave_type_id VARCHAR REFERENCES leave_types(id),
    leave_type TEXT NOT NULL, -- legacy: sick, casual, vacation, unpaid
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    total_days DECIMAL(5,2) NOT NULL,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected, cancelled
    approved_by VARCHAR REFERENCES users(id),
    approved_at TIMESTAMP,
    remarks TEXT,
    applied_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Leave Balances - track available leave days per user
CREATE TABLE leave_balances (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    leave_type_id VARCHAR NOT NULL REFERENCES leave_types(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    total_days DECIMAL(5,2) NOT NULL,
    used_days DECIMAL(5,2) DEFAULT 0 NOT NULL,
    remaining_days DECIMAL(5,2) NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- =============================================
-- TRAVEL & EXPENSE MANAGEMENT
-- =============================================

-- Travel Requests - separate from expenses for better workflow
CREATE TABLE travel_requests (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    destination TEXT NOT NULL,
    purpose TEXT NOT NULL,
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    estimated_cost DECIMAL(10,2),
    advance_amount DECIMAL(10,2) DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected, completed
    approved_by VARCHAR REFERENCES users(id),
    remarks TEXT,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Expense Categories - master data for travel expenses
CREATE TABLE expense_categories (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id VARCHAR NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL, -- Transport, Accommodation, Meals, etc.
    code TEXT NOT NULL,
    max_limit DECIMAL(10,2),
    requires_receipt BOOLEAN DEFAULT TRUE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL
);

-- Travel claims/reimbursements
CREATE TABLE travel_claims (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    travel_request_id VARCHAR REFERENCES travel_requests(id),
    amount DECIMAL(10,2) NOT NULL,
    description TEXT NOT NULL,
    date TIMESTAMP NOT NULL,
    category_id VARCHAR REFERENCES expense_categories(id),
    category TEXT NOT NULL, -- legacy: transport, accommodation, meals, other
    receipts TEXT[],
    status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected
    approved_by VARCHAR REFERENCES users(id),
    approved_at TIMESTAMP,
    remarks TEXT,
    submitted_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- =============================================
-- SALARY MANAGEMENT
-- =============================================

-- Salary Structures - define salary templates
CREATE TABLE salary_structures (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id VARCHAR NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    currency TEXT DEFAULT 'INR' NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Salary Components - building blocks of salary (basic, HRA, DA, etc.)
CREATE TABLE salary_components (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    structure_id VARCHAR NOT NULL REFERENCES salary_structures(id) ON DELETE CASCADE,
    name TEXT NOT NULL, -- Basic, HRA, DA, PF, Tax
    type TEXT NOT NULL, -- earning, deduction
    calculation_type TEXT NOT NULL, -- fixed, percentage
    value DECIMAL(10,2) NOT NULL,
    is_statutory BOOLEAN DEFAULT FALSE NOT NULL, -- PF, ESI, Tax
    display_order INTEGER DEFAULT 0 NOT NULL
);

-- Salary records
CREATE TABLE salaries (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    structure_id VARCHAR REFERENCES salary_structures(id),
    month TEXT NOT NULL, -- YYYY-MM format
    basic_salary DECIMAL(10,2) NOT NULL,
    allowances DECIMAL(10,2) DEFAULT 0 NOT NULL,
    deductions DECIMAL(10,2) DEFAULT 0 NOT NULL,
    tax DECIMAL(10,2) DEFAULT 0 NOT NULL,
    net_salary DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'INR' NOT NULL,
    payment_method TEXT DEFAULT 'bank_transfer', -- bank_transfer, cash, cheque
    status TEXT NOT NULL DEFAULT 'pending', -- pending, processed, paid
    processed_at TIMESTAMP,
    paid_at TIMESTAMP,
    remarks TEXT
);

-- =============================================
-- SYSTEM TABLES
-- =============================================

-- Daily activity logs
CREATE TABLE activity_logs (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date TIMESTAMP NOT NULL,
    activities TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Notifications
CREATE TABLE notifications (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR REFERENCES users(id) ON DELETE CASCADE,
    company_id VARCHAR REFERENCES companies(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- info, success, warning, approval
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Settings - company-wide configurations
CREATE TABLE settings (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id VARCHAR NOT NULL REFERENCES companies(id) ON DELETE CASCADE UNIQUE,
    working_hours_per_day DECIMAL(4,2) DEFAULT 8 NOT NULL,
    working_days_per_week INTEGER DEFAULT 5 NOT NULL,
    weekend_days TEXT[] DEFAULT ARRAY['Saturday', 'Sunday'] NOT NULL,
    overtime_rate DECIMAL(5,2) DEFAULT 1.5 NOT NULL,
    currency TEXT DEFAULT 'INR' NOT NULL,
    timezone TEXT DEFAULT 'Asia/Kolkata' NOT NULL,
    date_format TEXT DEFAULT 'DD/MM/YYYY' NOT NULL,
    fiscal_year_start TEXT DEFAULT '04-01' NOT NULL, -- MM-DD format
    enable_biometric_auth BOOLEAN DEFAULT FALSE NOT NULL,
    enable_geofencing BOOLEAN DEFAULT FALSE NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Holidays - company holidays calendar
CREATE TABLE holidays (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id VARCHAR NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    date TIMESTAMP NOT NULL,
    type TEXT DEFAULT 'public', -- public, optional, regional
    is_optional BOOLEAN DEFAULT FALSE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Audit Logs - track all system changes for compliance
CREATE TABLE audit_logs (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id VARCHAR NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id VARCHAR REFERENCES users(id),
    action TEXT NOT NULL, -- CREATE, UPDATE, DELETE, LOGIN, LOGOUT
    entity TEXT NOT NULL, -- users, attendance, leaves, salaries, etc.
    entity_id VARCHAR,
    old_values TEXT, -- JSON string
    new_values TEXT, -- JSON string
    ip_address TEXT,
    user_agent TEXT,
    timestamp TIMESTAMP DEFAULT NOW() NOT NULL
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- User indexes
CREATE INDEX idx_users_company_id ON users(company_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_department_id ON users(department_id);
CREATE INDEX idx_users_manager_id ON users(manager_id);
CREATE INDEX idx_users_role ON users(role);

-- Attendance indexes
CREATE INDEX idx_attendance_user_id ON attendance(user_id);
CREATE INDEX idx_attendance_date ON attendance(date);
CREATE INDEX idx_attendance_status ON attendance(status);

-- Leave indexes
CREATE INDEX idx_leaves_user_id ON leaves(user_id);
CREATE INDEX idx_leaves_status ON leaves(status);
CREATE INDEX idx_leaves_start_date ON leaves(start_date);
CREATE INDEX idx_leaves_end_date ON leaves(end_date);

-- Salary indexes
CREATE INDEX idx_salaries_user_id ON salaries(user_id);
CREATE INDEX idx_salaries_month ON salaries(month);
CREATE INDEX idx_salaries_status ON salaries(status);

-- Travel indexes
CREATE INDEX idx_travel_requests_user_id ON travel_requests(user_id);
CREATE INDEX idx_travel_requests_status ON travel_requests(status);
CREATE INDEX idx_travel_claims_user_id ON travel_claims(user_id);
CREATE INDEX idx_travel_claims_status ON travel_claims(status);

-- Notification indexes
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_company_id ON notifications(company_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);

-- Audit log indexes
CREATE INDEX idx_audit_logs_company_id ON audit_logs(company_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE companies IS 'Company information and master data';
COMMENT ON TABLE departments IS 'Organizational departments within companies';
COMMENT ON TABLE designations IS 'Job titles and positions within departments';
COMMENT ON TABLE users IS 'Employee/user accounts and profiles';
COMMENT ON TABLE attendance IS 'Daily attendance records with check-in/out times';
COMMENT ON TABLE attendance_breaks IS 'Break tracking during work hours';
COMMENT ON TABLE leave_types IS 'Configurable leave categories (Sick, Casual, etc.)';
COMMENT ON TABLE leaves IS 'Leave applications and approvals';
COMMENT ON TABLE leave_balances IS 'Available leave days per user per year';
COMMENT ON TABLE travel_requests IS 'Travel authorization requests';
COMMENT ON TABLE expense_categories IS 'Master data for expense types';
COMMENT ON TABLE travel_claims IS 'Travel expense claims and reimbursements';
COMMENT ON TABLE salary_structures IS 'Salary templates and configurations';
COMMENT ON TABLE salary_components IS 'Salary building blocks (Basic, HRA, etc.)';
COMMENT ON TABLE salaries IS 'Monthly salary records and payments';
COMMENT ON TABLE activity_logs IS 'Daily work activity logs';
COMMENT ON TABLE notifications IS 'System notifications for users';
COMMENT ON TABLE settings IS 'Company-wide configuration settings';
COMMENT ON TABLE holidays IS 'Company holiday calendar';
COMMENT ON TABLE audit_logs IS 'System audit trail for compliance';

-- =============================================
-- SAMPLE DATA (Optional - Uncomment if needed)
-- =============================================

/*
-- Sample Company
INSERT INTO companies (id, name, email) VALUES 
('comp-001', 'NanoFlows AI Technologies Pvt Ltd', 'admin@nanoflows.ai');

-- Sample Department
INSERT INTO departments (id, company_id, name, description) VALUES 
('dept-001', 'comp-001', 'Engineering', 'Software development and engineering team');

-- Sample Designation
INSERT INTO designations (id, company_id, title, level, department_id) VALUES 
('desig-001', 'comp-001', 'Senior Software Engineer', 3, 'dept-001');

-- Sample Leave Types
INSERT INTO leave_types (id, company_id, name, code, max_days, carry_forward, is_paid, requires_approval) VALUES 
('lt-001', 'comp-001', 'Sick Leave', 'SL', 12, FALSE, TRUE, TRUE),
('lt-002', 'comp-001', 'Casual Leave', 'CL', 12, TRUE, TRUE, TRUE),
('lt-003', 'comp-001', 'Annual Leave', 'AL', 21, TRUE, TRUE, TRUE);

-- Sample Expense Categories
INSERT INTO expense_categories (id, company_id, name, code, max_limit, requires_receipt) VALUES 
('ec-001', 'comp-001', 'Transportation', 'TRANS', 5000.00, TRUE),
('ec-002', 'comp-001', 'Accommodation', 'ACCOM', 10000.00, TRUE),
('ec-003', 'comp-001', 'Meals', 'MEALS', 2000.00, TRUE);

-- Sample Settings
INSERT INTO settings (id, company_id) VALUES 
('settings-001', 'comp-001');
*/
