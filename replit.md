# Nano Flows EMS - Employee Management System

## Overview
Nano Flows EMS is a modern, intelligent Employee Management System designed for Nano Flows AI Technologies Pvt. Ltd. This comprehensive HR platform streamlines attendance tracking, leave management, salary processing, travel claim submissions, and employee data management. It features robust multi-role authentication for client, employee, and admin access, aiming to enhance operational efficiency and employee experience for startups to enterprises.

## User Preferences
I want iterative development. Ask before making major changes.

## System Architecture
The system is built with a modern web stack:
-   **Frontend**: React, TypeScript, Tailwind CSS, Shadcn UI for a consistent design system, Wouter for routing, and TanStack Query for data fetching. The UI adheres to Nano Flows AI branding with a primary blue (#0ea5e9) and accent cyan (#06b6d4) color scheme, using Inter, Space Grotesk, and JetBrains Mono for typography, and supporting both light and dark modes.
-   **Backend**: Node.js with Express.js.
-   **Database**: PostgreSQL, hosted on Neon.
-   **Authentication**: Implemented with `bcryptjs` for secure password hashing and supports multi-role access (Client, Employee, Admin).
-   **Core Modules**:
    -   **Multi-Role Authentication**: Secure login for company clients, employees, and system administrators.
    -   **Employee Dashboard**: Features attendance, leave status, salary info, activity logs, travel claim submission, and profile management.
    -   **Admin Dashboard**: Provides employee overview, attendance and leave management, salary processing, travel claim approvals, and notification broadcasting.
    -   **Attendance System**: Real-time check-in/out with location capture.
    -   **Leave Management**: Application and approval workflow.
    -   **Travel & Reimbursement**: Expense claim submission and approval.
    -   **Salary Management**: Payslip generation and processing.
    -   **Activity Logs**: Daily work activity tracking.
    -   **Notifications**: System-wide alerts.
-   **Technical Implementations**: All modules are designed to integrate seamlessly, providing a unified HR platform. The system uses a `client` directory for the React app, a `server` directory for the Express app with `db.ts` for database connection, `storage.ts` for data access, and `routes.ts` for API endpoints, and a `shared` directory for common types and schemas.

## External Dependencies
-   **Database**: PostgreSQL (via Neon)
-   **Frontend Libraries**: React, TypeScript, Tailwind CSS, Shadcn UI, Wouter, TanStack Query
-   **Backend Libraries**: Express.js, Node.js, bcryptjs
-   **API Integrations**: None explicitly mentioned beyond core system APIs.