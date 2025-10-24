import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { storage } from "./storage";
import { db } from "./db";
import { companies, leaveTypes, users, attendance, holidays } from "../shared/schema";
import { eq } from "drizzle-orm";
import os from 'os';
import bcrypt from "bcryptjs";

// Function to seed initial data
async function seedInitialData() {
  try {
    console.log('Checking for initial data setup...');
    
    // Check if any companies exist
    const existingCompanies = await db.select().from(companies);
    
    if (existingCompanies.length === 0) {
      console.log('Creating demo company...');
      
      // Create company
      const company = await storage.createCompany({
        name: 'Nano Flows AI Software Technologies',
        email: 'admin@nanoflows.com',
      });
      
      console.log(`✅ Created company: ${company.name}`);
      
      // Create admin user
      const hashedAdminPassword = await bcrypt.hash('admin123', 10);
      const adminUser = await storage.createUser({
        companyId: company.id,
        email: 'admin@nanoflows.com',
        password: hashedAdminPassword,
        fullName: 'Admin User',
        role: 'admin',
        department: 'Management',
        position: 'System Administrator',
        phone: '+1234567890',
        isActive: true,
      });
      
      console.log(`✅ Created admin user: ${adminUser.email} / password: admin123`);
      
      // Create employee user
      const hashedEmployeePassword = await bcrypt.hash('employee123', 10);
      const employeeUser = await storage.createUser({
        companyId: company.id,
        email: 'employee@nanoflows.com',
        password: hashedEmployeePassword,
        fullName: 'John Employee',
        role: 'employee',
        department: 'Engineering',
        position: 'Software Developer',
        phone: '+1234567891',
        isActive: true,
      });
      
      console.log(`✅ Created employee user: ${employeeUser.email} / password: employee123`);
      
      // Create some sample attendance records for the employee
      const today = new Date();
      for (let i = 0; i < 15; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        
        // Skip weekends
        if (date.getDay() === 0 || date.getDay() === 6) {
          continue;
        }
        
        const checkIn = new Date(date);
        checkIn.setHours(9, 0, 0, 0);
        
        const checkOut = new Date(date);
        checkOut.setHours(17 + Math.floor(Math.random() * 3), 0, 0, 0);
        
        const totalHours = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
        
        await storage.createAttendance({
          userId: employeeUser.id,
          checkIn,
          checkOut,
          date,
          status: 'present',
          totalHours: totalHours.toString(),
          location: 'Office',
        });
      }
      
      console.log('✅ Created sample attendance records');
      
      // Create some holidays
      const currentYear = new Date().getFullYear();
      const holidayDates = [
        { name: 'New Year', date: new Date(currentYear, 0, 1) },
        { name: 'Independence Day', date: new Date(currentYear, 6, 4) },
        { name: 'Christmas', date: new Date(currentYear, 11, 25) },
      ];
      
      for (const holiday of holidayDates) {
        await storage.createHoliday({
          companyId: company.id,
          name: holiday.name,
          date: holiday.date,
          type: 'public',
          isOptional: false,
        });
      }
      
      console.log('✅ Created sample holidays');
      
      console.log('\n========================================');
      console.log('DEMO CREDENTIALS CREATED:');
      console.log('========================================');
      console.log('Admin Login:');
      console.log('  Email: admin@nanoflows.com');
      console.log('  Password: admin123');
      console.log('');
      console.log('Employee Login:');
      console.log('  Email: employee@nanoflows.com');
      console.log('  Password: employee123');
      console.log('========================================\n');
    } else {
      console.log('✅ Demo data already exists');
    }
  } catch (error) {
    console.error('❌ Error seeding initial data:', error);
  }
}

// Function to initialize default leave types
async function initializeDefaultLeaveTypes() {
  try {
    console.log('Checking for leave types...');
    
    // Get all companies
    const allCompanies = await db.select().from(companies);
    console.log(`Found ${allCompanies.length} companies`);
    
    for (const company of allCompanies) {
      console.log(`Checking leave types for company: ${company.name} (${company.id})`);
      
      // Check if company already has leave types
      const existingLeaveTypes = await db.select().from(leaveTypes).where(eq(leaveTypes.companyId, company.id));
      
      if (existingLeaveTypes.length === 0) {
        console.log(`Creating default leave types for ${company.name}`);
        
        // Create default leave types
        const defaultLeaveTypes = [
          {
            companyId: company.id,
            name: 'Sick Leave',
            code: 'SL',
            maxDays: 12,
            carryForward: false,
            isPaid: true,
            requiresApproval: true,
            description: 'Medical leave for illness or health issues',
            isActive: true,
          },
          {
            companyId: company.id,
            name: 'Casual Leave',
            code: 'CL',
            maxDays: 12,
            carryForward: true,
            isPaid: true,
            requiresApproval: true,
            description: 'Personal leave for casual purposes',
            isActive: true,
          },
          {
            companyId: company.id,
            name: 'Annual Leave',
            code: 'AL',
            maxDays: 21,
            carryForward: true,
            isPaid: true,
            requiresApproval: true,
            description: 'Annual vacation leave',
            isActive: true,
          },
          {
            companyId: company.id,
            name: 'Maternity Leave',
            code: 'ML',
            maxDays: 90,
            carryForward: false,
            isPaid: true,
            requiresApproval: true,
            description: 'Maternity leave for female employees',
            isActive: true,
          },
          {
            companyId: company.id,
            name: 'Paternity Leave',
            code: 'PL',
            maxDays: 15,
            carryForward: false,
            isPaid: true,
            requiresApproval: true,
            description: 'Paternity leave for male employees',
            isActive: true,
          },
        ];

        for (const leaveType of defaultLeaveTypes) {
          await storage.createLeaveType(leaveType);
        }
        
        console.log(`✅ Created ${defaultLeaveTypes.length} leave types for ${company.name}`);
      } else {
        console.log(`✅ ${company.name} already has ${existingLeaveTypes.length} leave types`);
      }
    }

    console.log('✅ Leave types initialization completed!');
  } catch (error) {
    console.error('❌ Error initializing leave types:', error);
  }
}

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'nano-flows-ems-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);

// Request logger for API routes
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Seed initial data (company, admin, employee, etc.)
  await seedInitialData();
  
  // Initialize default leave types
  await initializeDefaultLeaveTypes();
  
  const server = await registerRoutes(app);

  // Global error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // Setup Vite only in development
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Determine host based on platform
  const port = parseInt(process.env.PORT || '5000', 10);
  const host = os.platform() === 'win32' ? 'localhost' : '0.0.0.0';

  server.listen(port, host, () => {
    log(`serving on port ${port} (${host})`);
  });
})();
