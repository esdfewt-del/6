import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertCompanySchema, 
  insertUserSchema, 
  insertAttendanceSchema, 
  insertLeaveSchema, 
  insertTravelClaimSchema,
  insertTravelRequestSchema,
  insertSalarySchema, 
  insertActivityLogSchema, 
  insertNotificationSchema,
  insertDepartmentSchema,
  insertDesignationSchema,
  insertAttendanceBreakSchema,
  insertSettingsSchema,
  insertHolidaySchema,
  type User,
  type Attendance
} from "@shared/schema";
import bcrypt from "bcryptjs";
import "./types"; // Import session types

// Helper function to calculate distance between two coordinates using Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180; // φ, λ in radians
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // Distance in meters
}

// Auth middleware
const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.session.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};

const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.session.user || (req.session.user.role !== 'admin' && req.session.user.role !== 'hr')) {
    return res.status(403).json({ message: "Forbidden - Admin access required" });
  }
  next();
};

// Helper to verify employee belongs to authenticated user's company
const verifyCompanyOwnership = async (req: Request, res: Response, employeeId: string) => {
  const employee = await storage.getUser(employeeId);
  if (!employee || employee.companyId !== req.session.user!.companyId) {
    return false;
  }
  return employee;
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication Routes
  
  // Company signup (Client)
  app.post("/api/auth/signup", async (req, res) => {
    try {
      const { companyName, fullName, email, password } = req.body;
      
      // Check if company already exists
      const existingCompany = await storage.getCompanyByEmail(email);
      if (existingCompany) {
        return res.status(400).json({ message: "Company with this email already exists" });
      }
      
      // Create company
      const company = await storage.createCompany({
        name: companyName,
        email: email,
      });
      
      // Create admin user for the company
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await storage.createUser({
        email: email,
        password: hashedPassword,
        fullName: fullName,
        role: "admin",
        department: "Management",
        position: "Company Admin",
        companyId: company.id,
      });
      
      // Store user in session
      const { password: _, ...userWithoutPassword } = user;
      req.session.user = userWithoutPassword;
      
      res.json({ user: userWithoutPassword, company });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Login
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password, latitude, longitude } = req.body;
      
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Location validation if enabled for user
      if (user.enableLocationAuth && user.allowedLatitude && user.allowedLongitude) {
        if (!latitude || !longitude) {
          return res.status(403).json({ 
            message: "Location verification required for this account. Please enable location access and try again." 
          });
        }

        // Calculate distance between user's current location and allowed location
        const distance = calculateDistance(
          parseFloat(latitude),
          parseFloat(longitude),
          parseFloat(user.allowedLatitude),
          parseFloat(user.allowedLongitude)
        );

        const allowedRadius = parseFloat(user.allowedRadius || '100'); // Default 100 meters
        
        if (distance > allowedRadius) {
          return res.status(403).json({ 
            message: `Login not permitted from this location. You are ${Math.round(distance)}m away from your allowed location (radius: ${allowedRadius}m).` 
          });
        }
      }
      
      // Store user in session
      const { password: _, ...userWithoutPassword } = user;
      req.session.user = userWithoutPassword;
      
      res.json({ user: userWithoutPassword });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Logout
  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Could not log out" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });
  
  // Get current user
  app.get("/api/auth/me", requireAuth, (req, res) => {
    res.json({ user: req.session.user });
  });

  // Update current user profile (self-update)
  app.put("/api/auth/profile", requireAuth, async (req, res) => {
    try {
      const userId = req.session.user!.id;
      const { fullName, phone, address } = req.body;
      
      // Validate input
      if (!fullName || typeof fullName !== 'string') {
        return res.status(400).json({ message: "Full name is required" });
      }
      
      const updateData: any = { fullName };
      if (phone !== undefined) updateData.phone = phone;
      if (address !== undefined) updateData.address = address;
      
      const user = await storage.updateUser(userId, updateData);
      const { password: _, ...userWithoutPassword } = user;
      
      // Update session
      req.session.user = userWithoutPassword;
      
      res.json(userWithoutPassword);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Update user location settings (admin only)
  app.put("/api/users/:id/location", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { latitude, longitude, radius, enableLocationAuth } = req.body;
      
      // Verify company ownership
      const existingEmployee = await verifyCompanyOwnership(req, res, id);
      if (!existingEmployee) {
        return res.status(404).json({ message: "Employee not found" });
      }
      
      const updateData: any = {};
      
      if (latitude !== undefined) updateData.allowedLatitude = latitude;
      if (longitude !== undefined) updateData.allowedLongitude = longitude;
      if (radius !== undefined) updateData.allowedRadius = radius;
      if (enableLocationAuth !== undefined) updateData.enableLocationAuth = enableLocationAuth;
      
      const user = await storage.updateUser(id, updateData);
      const { password: _, ...userWithoutPassword } = user;
      
      res.json(userWithoutPassword);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Employee Management Routes
  
  // Get all employees for a company with search/filter
  app.get("/api/employees", requireAdmin, async (req, res) => {
    try {
      const { search, departmentId, role, isActive } = req.query;
      
      const filters = {
        search: search as string | undefined,
        departmentId: departmentId as string | undefined,
        role: role as string | undefined,
        // Special handling for isActive:
        // - 'all' = undefined (no filter, return all)
        // - 'true' = true (active only)
        // - 'false' = false (inactive only)
        // - undefined = true (default to active only)
        isActive: isActive === 'all' ? undefined : 
                  isActive !== undefined ? isActive === 'true' : true,
      };
      
      // Use authenticated user's company
      const employees = await storage.searchEmployees(req.session.user!.companyId, filters);
      // Remove passwords
      const employeesWithoutPasswords = employees.map(({ password, ...rest }) => rest);
      res.json(employeesWithoutPasswords);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Create employee
  app.post("/api/employees", requireAdmin, async (req, res) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);
      const hashedPassword = await bcrypt.hash(validatedData.password, 10);
      
      // Force use of authenticated user's company
      const employee = await storage.createUser({
        ...validatedData,
        password: hashedPassword,
        companyId: req.session.user!.companyId,
      });
      
      const { password: _, ...employeeWithoutPassword } = employee;
      res.json(employeeWithoutPassword);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });
  
  // Update employee (admin only for full updates)
  app.put("/api/employees/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      // Verify company ownership
      const existingEmployee = await verifyCompanyOwnership(req, res, id);
      if (!existingEmployee) {
        return res.status(404).json({ message: "Employee not found" });
      }
      
      // If password is being updated, hash it
      if (updateData.password) {
        updateData.password = await bcrypt.hash(updateData.password, 10);
      }
      
      // Prevent changing companyId and id
      delete updateData.companyId;
      delete updateData.id;
      
      const employee = await storage.updateUser(id, updateData);
      const { password: _, ...employeeWithoutPassword } = employee;
      res.json(employeeWithoutPassword);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Get employee by ID
  app.get("/api/employees/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Verify company ownership
      const employee = await verifyCompanyOwnership(req, res, id);
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }
      
      const { password: _, ...employeeWithoutPassword } = employee;
      res.json(employeeWithoutPassword);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Soft delete employee
  app.delete("/api/employees/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Verify company ownership
      const existingEmployee = await verifyCompanyOwnership(req, res, id);
      if (!existingEmployee) {
        return res.status(404).json({ message: "Employee not found" });
      }
      
      const employee = await storage.updateUser(id, { isActive: false } as any);
      const { password: _, ...employeeWithoutPassword } = employee;
      res.json(employeeWithoutPassword);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Get employee skills
  app.get("/api/employees/:id/skills", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Verify company ownership
      const employee = await verifyCompanyOwnership(req, res, id);
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }
      
      res.json({ skills: employee.skills || [] });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Update employee status
  app.put("/api/employees/:id/status", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { isActive } = req.body;
      
      if (typeof isActive !== 'boolean') {
        return res.status(400).json({ message: "isActive must be a boolean" });
      }
      
      // Verify company ownership
      const existingEmployee = await verifyCompanyOwnership(req, res, id);
      if (!existingEmployee) {
        return res.status(404).json({ message: "Employee not found" });
      }
      
      const employee = await storage.updateUser(id, { isActive } as any);
      const { password: _, ...employeeWithoutPassword } = employee;
      res.json(employeeWithoutPassword);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Department Routes
  
  // Get all departments
  app.get("/api/departments", requireAuth, async (req, res) => {
    try {
      // Use authenticated user's company
      const departments = await storage.getDepartmentsByCompany(req.session.user!.companyId);
      res.json(departments);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Create department
  app.post("/api/departments", requireAdmin, async (req, res) => {
    try {
      const validatedData = insertDepartmentSchema.parse(req.body);
      // Force use of authenticated user's company
      const department = await storage.createDepartment({
        ...validatedData,
        companyId: req.session.user!.companyId,
      });
      res.json(department);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Designation Routes
  
  // Get all designations
  app.get("/api/designations", requireAuth, async (req, res) => {
    try {
      // Use authenticated user's company
      const designations = await storage.getDesignationsByCompany(req.session.user!.companyId);
      res.json(designations);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Create designation
  app.post("/api/designations", requireAdmin, async (req, res) => {
    try {
      const validatedData = insertDesignationSchema.parse(req.body);
      // Force use of authenticated user's company
      const designation = await storage.createDesignation({
        ...validatedData,
        companyId: req.session.user!.companyId,
      });
      res.json(designation);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Attendance Routes
  
  // Check-in
  app.post("/api/attendance/check-in", requireAuth, async (req, res) => {
    try {
      const { location } = req.body;
      
      // Check if user already has attendance record for today
      const existingAttendance = await storage.getTodayAttendance(req.session.user!.id);
      if (existingAttendance) {
        return res.status(400).json({ message: "Already checked in for today" });
      }
      
      // Create attendance record for authenticated user
      const attendance = await storage.createAttendance({
        userId: req.session.user!.id,
        date: new Date(),
        checkIn: new Date(),
        location: location || null,
      });
      res.json(attendance);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });
  
  // Check-out
  app.post("/api/attendance/check-out", requireAuth, async (req, res) => {
    try {
      const { location } = req.body;
      
      // Get today's attendance for the authenticated user
      const attendance = await storage.getTodayAttendance(req.session.user!.id);
      if (!attendance) {
        return res.status(400).json({ message: "No check-in found for today" });
      }
      
      if (attendance.checkOut) {
        return res.status(400).json({ message: "Already checked out for today" });
      }
      
      // Calculate total hours worked
      const checkOutTime = new Date();
      const hoursWorked = (checkOutTime.getTime() - attendance.checkIn.getTime()) / (1000 * 60 * 60);
      
      const updated = await storage.updateAttendance(attendance.id, {
        checkOut: checkOutTime,
        totalHours: Math.round(hoursWorked * 100) / 100 as any,
      });
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Start break
  app.post("/api/attendance/break-start", requireAuth, async (req, res) => {
    try {
      const { type } = req.body;
      
      // Get today's attendance
      const attendance = await storage.getTodayAttendance(req.session.user!.id);
      if (!attendance) {
        return res.status(400).json({ message: "No check-in found for today" });
      }
      
      if (attendance.checkOut) {
        return res.status(400).json({ message: "Cannot start break after checkout" });
      }
      
      // Check for existing active breaks
      const existingBreaks = await storage.getBreaksByAttendance(attendance.id);
      const activeBreak = existingBreaks.find(b => !b.breakEnd);
      if (activeBreak) {
        return res.status(400).json({ message: "You already have an active break. Please end it before starting a new one." });
      }
      
      // Create break record
      const breakRecord = await storage.createAttendanceBreak({
        attendanceId: attendance.id,
        breakType: type || 'general',
        breakStart: new Date(),
      });
      res.json(breakRecord);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });
  
  // End break
  app.post("/api/attendance/break-end", requireAuth, async (req, res) => {
    try {
      const { breakId } = req.body;
      
      if (!breakId) {
        return res.status(400).json({ message: "Break ID is required" });
      }
      
      // Get today's attendance for authenticated user
      const attendance = await storage.getTodayAttendance(req.session.user!.id);
      if (!attendance) {
        return res.status(400).json({ message: "No check-in found for today" });
      }
      
      // Get breaks for this attendance and verify ownership
      const breaks = await storage.getBreaksByAttendance(attendance.id);
      const targetBreak = breaks.find(b => b.id === breakId);
      
      if (!targetBreak) {
        return res.status(404).json({ message: "Break not found or does not belong to you" });
      }
      
      if (targetBreak.breakEnd) {
        return res.status(400).json({ message: "This break has already been ended" });
      }
      
      // Update break record with end time
      const breakRecord = await storage.updateAttendanceBreak(breakId, {
        breakEnd: new Date(),
      });
      res.json(breakRecord);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Get all attendance records for a user
  app.get("/api/attendance/user/:userId", requireAuth, async (req, res) => {
    try {
      const { userId } = req.params;
      
      // Verify company ownership
      const employee = await verifyCompanyOwnership(req, res, userId);
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }
      
      const attendance = await storage.getAttendanceByUser(userId);
      res.json(attendance);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Get today's attendance for user
  app.get("/api/attendance/today/:userId", requireAuth, async (req, res) => {
    try {
      const { userId } = req.params;
      
      // Verify company ownership
      const employee = await verifyCompanyOwnership(req, res, userId);
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }
      
      const attendance = await storage.getTodayAttendance(userId);
      res.json(attendance || null);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Get attendance history
  app.get("/api/attendance/history", requireAuth, async (req, res) => {
    try {
      const { userId, startDate, endDate } = req.query;
      
      // If userId provided, verify company ownership, otherwise use authenticated user
      const targetUserId = userId ? userId as string : req.session.user!.id;
      
      if (userId) {
        const employee = await verifyCompanyOwnership(req, res, targetUserId);
        if (!employee) {
          return res.status(404).json({ message: "Employee not found" });
        }
      }
      
      const attendance = await storage.getAttendanceByUser(
        targetUserId,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );
      res.json(attendance);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Get attendance summary with overtime
  app.get("/api/attendance/summary", requireAuth, async (req, res) => {
    try {
      const { userId, month } = req.query;
      
      // If userId provided, verify company ownership, otherwise use authenticated user
      const targetUserId = userId ? userId as string : req.session.user!.id;
      
      if (userId) {
        const employee = await verifyCompanyOwnership(req, res, targetUserId);
        if (!employee) {
          return res.status(404).json({ message: "Employee not found" });
        }
      }
      
      // Calculate date range for the month
      const targetMonth = month ? new Date(month as string) : new Date();
      const startDate = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), 1);
      const endDate = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0);
      
      const attendance = await storage.getAttendanceByUser(targetUserId, startDate, endDate);
      
      // Calculate summary
      const totalDays = attendance.length;
      const totalHours = attendance.reduce((sum, a) => sum + (parseFloat(a.totalHours || "0")), 0);
      const standardHoursPerDay = 8;
      const expectedHours = totalDays * standardHoursPerDay;
      const overtimeHours = Math.max(0, totalHours - expectedHours);
      const undertimeHours = Math.max(0, expectedHours - totalHours);
      
      res.json({
        userId: targetUserId,
        month: targetMonth.toISOString().substring(0, 7),
        totalDays,
        totalHours: Math.round(totalHours * 100) / 100,
        expectedHours,
        overtimeHours: Math.round(overtimeHours * 100) / 100,
        undertimeHours: Math.round(undertimeHours * 100) / 100,
        averageHoursPerDay: totalDays > 0 ? Math.round((totalHours / totalDays) * 100) / 100 : 0,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Get company attendance (admin only)
  app.get("/api/attendance/company", requireAdmin, async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      
      // Get all employees
      const employees = await storage.getUsersByCompany(req.session.user!.companyId);
      const employeeMap = new Map(employees.map(e => [e.id, e.fullName]));
      
      // Get attendance records
      let attendance;
      if (startDate && endDate) {
        attendance = await storage.getAttendanceByCompany(
          req.session.user!.companyId,
          new Date(startDate as string),
          new Date(endDate as string)
        );
      } else {
        attendance = await storage.getAllAttendanceToday(req.session.user!.companyId);
      }
      
      // Add employee names to attendance records
      const attendanceWithNames = attendance.map(a => ({
        ...a,
        userName: employeeMap.get(a.userId) || 'Unknown',
      }));
      
      res.json(attendanceWithNames);
    } catch (error: any) {
      console.error('Attendance API Error:', error);
      res.status(500).json({ message: error.message });
    }
  });

  // Leave Management Routes
  
  // Get all leave types for company
  app.get("/api/leave-types", requireAuth, async (req, res) => {
    try {
      const leaveTypes = await storage.getActiveLeaveTypes(req.session.user!.companyId);
      res.json(leaveTypes);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Create leave type (admin only)
  app.post("/api/leave-types", requireAdmin, async (req, res) => {
    try {
      const { name, code, maxDays, isPaid, description } = req.body;
      
      const leaveType = await storage.createLeaveType({
        companyId: req.session.user!.companyId,
        name,
        code,
        maxDays,
        isPaid,
        description,
        isActive: true,
      });
      res.json(leaveType);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });
  
  // Get leave balance for user
  app.get("/api/leaves/balance/:userId", requireAuth, async (req, res) => {
    try {
      const { userId } = req.params;
      const year = req.query.year ? parseInt(req.query.year as string) : new Date().getFullYear();
      
      // Verify company ownership
      const employee = await verifyCompanyOwnership(req, res, userId);
      if (!employee) {
        return res.status(404).json({ message: "User not found or does not belong to your company" });
      }
      
      const balances = await storage.getLeaveBalancesByUser(userId, year);
      res.json(balances);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Apply for leave
  app.post("/api/leaves/apply", requireAuth, async (req, res) => {
    try {
      const { leaveTypeId, startDate, endDate, totalDays, reason } = req.body;
      
      // Get leave type to populate legacy field
      const leaveTypeData = await storage.getLeaveType(leaveTypeId);
      if (!leaveTypeData) {
        return res.status(400).json({ message: "Invalid leave type" });
      }
      
      // Calculate total days if not provided
      const start = new Date(startDate);
      const end = new Date(endDate);
      const days = totalDays || Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      
      // Create leave application for authenticated user
      const leave = await storage.createLeave({
        userId: req.session.user!.id,
        leaveTypeId,
        leaveType: leaveTypeData.code, // Use code for legacy field
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        totalDays: days,
        reason,
      });
      res.json(leave);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });
  
  // Approve leave (admin only)
  app.put("/api/leaves/:id/approve", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { remarks } = req.body;
      
      // Get leave and verify company ownership
      const leaves = await storage.getPendingLeaves(req.session.user!.companyId);
      const leave = leaves.find(l => l.id === id);
      
      if (!leave) {
        return res.status(404).json({ message: "Leave application not found or does not belong to your company" });
      }
      
      const updatedLeave = await storage.updateLeaveStatus(
        id,
        'approved',
        req.session.user!.id,
        remarks
      );
      res.json(updatedLeave);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Reject leave (admin only)
  app.put("/api/leaves/:id/reject", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { remarks } = req.body;
      
      // Get leave and verify company ownership
      const leaves = await storage.getPendingLeaves(req.session.user!.companyId);
      const leave = leaves.find(l => l.id === id);
      
      if (!leave) {
        return res.status(404).json({ message: "Leave application not found or does not belong to your company" });
      }
      
      const updatedLeave = await storage.updateLeaveStatus(
        id,
        'rejected',
        req.session.user!.id,
        remarks
      );
      res.json(updatedLeave);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Get pending leaves for company (admin only)
  app.get("/api/leaves/pending", requireAdmin, async (req, res) => {
    try {
      // Use authenticated user's company
      const results = await storage.getPendingLeaves(req.session.user!.companyId);
      
      console.log('Pending Leaves API Debug:', {
        companyId: req.session.user!.companyId,
        resultsCount: results.length,
        results: results.map(r => ({
          id: r.id,
          userId: r.userId,
          leaveType: r.leaveType,
          status: r.status,
          userFullName: r.userFullName,
          userEmail: r.userEmail
        }))
      });
      
      // Map flat results to nested user objects
      const leaves = results.map((r: any) => ({
        id: r.id,
        userId: r.userId,
        leaveType: r.leaveType,
        startDate: r.startDate,
        endDate: r.endDate,
        totalDays: r.totalDays,
        reason: r.reason,
        status: r.status,
        appliedAt: r.appliedAt,
        approvedBy: r.approvedBy,
        remarks: r.remarks,
        user: {
          id: r.userId,
          fullName: r.userFullName,
          email: r.userEmail,
          position: r.userPosition,
          department: r.userDepartment,
          role: r.userRole,
        },
      }));
      
      console.log('Pending Leaves API Response:', {
        leavesCount: leaves.length,
        leaves: leaves.map(l => ({
          id: l.id,
          leaveType: l.leaveType,
          status: l.status,
          user: l.user ? {
            id: l.user.id,
            fullName: l.user.fullName,
            email: l.user.email
          } : null
        }))
      });
      
      res.json(leaves);
    } catch (error: any) {
      console.error('Pending Leaves API Error:', error);
      res.status(500).json({ message: error.message });
    }
  });
  
  // Get all leaves for a user
  app.get("/api/leaves/user/:userId", requireAuth, async (req, res) => {
    try {
      const { userId } = req.params;
      
      // Verify company ownership
      const employee = await verifyCompanyOwnership(req, res, userId);
      if (!employee) {
        return res.status(404).json({ message: "User not found or does not belong to your company" });
      }
      
      const leaves = await storage.getLeavesByUser(userId);
      res.json(leaves);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Get leave history for user
  app.get("/api/leaves/history/:userId", requireAuth, async (req, res) => {
    try {
      const { userId } = req.params;
      
      // Verify company ownership
      const employee = await verifyCompanyOwnership(req, res, userId);
      if (!employee) {
        return res.status(404).json({ message: "User not found or does not belong to your company" });
      }
      
      const leaves = await storage.getLeavesByUser(userId);
      res.json(leaves);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Get team leaves for manager
  app.get("/api/leaves/team/:managerId", requireAuth, async (req, res) => {
    try {
      const { managerId } = req.params;
      
      // Verify manager belongs to same company
      const manager = await verifyCompanyOwnership(req, res, managerId);
      if (!manager) {
        return res.status(404).json({ message: "Manager not found or does not belong to your company" });
      }
      
      // Get all employees reporting to this manager
      const employees = await storage.getUsersByCompany(req.session.user!.companyId);
      const teamMembers = employees.filter((emp: User) => emp.managerId === managerId);
      
      // Get leaves for all team members
      const teamLeaves = await Promise.all(
        teamMembers.map((emp: User) => storage.getLeavesByUser(emp.id))
      );
      
      // Flatten and sort by date
      const allLeaves = teamLeaves.flat().sort((a: any, b: any) => 
        new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
      );
      
      res.json(allLeaves);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Travel Claims Routes
  
  // Submit travel claim
  app.post("/api/travel-claims", requireAuth, async (req, res) => {
    try {
      // Validate input data with Zod schema
      const validatedData = insertTravelClaimSchema.parse(req.body);
      
      // Override userId from authenticated session
      const claim = await storage.createTravelClaim({
        ...validatedData,
        userId: req.session.user!.id,
        status: 'pending',
      });
      res.json(claim);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });
  
  // Get travel claims by user
  app.get("/api/travel-claims/user/:userId", requireAuth, async (req, res) => {
    try {
      const { userId } = req.params;
      
      // Verify company ownership
      const employee = await verifyCompanyOwnership(req, res, userId);
      if (!employee) {
        return res.status(404).json({ message: "User not found or does not belong to your company" });
      }
      
      const claims = await storage.getTravelClaimsByUser(userId);
      res.json(claims);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Get pending travel claims for company (admin only)
  app.get("/api/travel-claims/pending", requireAdmin, async (req, res) => {
    try {
      // Use authenticated user's company
      const results = await storage.getPendingTravelClaims(req.session.user!.companyId);
      
      // Map flat results to nested user objects
      const claims = results.map((r: any) => ({
        id: r.id,
        userId: r.userId,
        destination: r.destination,
        purpose: r.purpose,
        startDate: r.startDate,
        endDate: r.endDate,
        estimatedCost: r.estimatedCost,
        status: r.status,
        createdAt: r.createdAt,
        approvedBy: r.approvedBy,
        remarks: r.remarks,
        user: {
          id: r.userId,
          fullName: r.userFullName,
          email: r.userEmail,
          position: r.userPosition,
          department: r.userDepartment,
          role: r.userRole,
        },
      }));
      
      res.json(claims);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Approve/reject travel claim (admin only)
  app.put("/api/travel-claims/:id/status", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { status, remarks } = req.body;
      
      // Get pending claims and verify ownership
      const claims = await storage.getPendingTravelClaims(req.session.user!.companyId);
      const claim = claims.find(c => c.id === id);
      
      if (!claim) {
        return res.status(404).json({ message: "Travel claim not found or does not belong to your company" });
      }
      
      const updatedClaim = await storage.updateTravelClaimStatus(
        id,
        status,
        req.session.user!.id,
        remarks
      );
      res.json(updatedClaim);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Travel Request Routes (Full Workflow)
  
  // Create travel request
  app.post("/api/travel/request", requireAuth, async (req, res) => {
    try {
      // Validate and coerce input (accepts ISO strings, returns Date objects)
      const validatedData = insertTravelRequestSchema.parse(req.body);
      
      // Use coerced Date objects directly from validation
      const request = await storage.createTravelRequest({
        ...validatedData,
        userId: req.session.user!.id,
      });
      res.json(request);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      res.status(400).json({ message: error.message });
    }
  });
  
  // Approve travel request (admin only)
  app.put("/api/travel/:id/approve", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { remarks } = req.body;
      
      // Get travel request by ID and verify ownership
      const request = await storage.getTravelRequest(id);
      if (!request) {
        return res.status(404).json({ message: "Travel request not found" });
      }
      
      // Verify company ownership
      const employee = await storage.getUser(request.userId);
      if (!employee || employee.companyId !== req.session.user!.companyId) {
        return res.status(404).json({ message: "Travel request does not belong to your company" });
      }
      
      // Verify status is pending
      if (request.status !== 'pending') {
        return res.status(400).json({ message: `Cannot approve request with status: ${request.status}` });
      }
      
      const updatedRequest = await storage.updateTravelRequestStatus(
        id,
        'approved',
        req.session.user!.id,
        remarks
      );
      
      // Create travel claim when request is approved
      if (updatedRequest.status === 'approved') {
        await storage.createTravelClaim({
          userId: updatedRequest.userId,
          travelRequestId: updatedRequest.id,
          category: 'Travel Expense',
          description: `Travel to ${updatedRequest.destination} - ${updatedRequest.purpose}`,
          amount: updatedRequest.estimatedCost || '0',
          date: updatedRequest.startDate,
          status: 'pending',
        });
      }
      
      res.json(updatedRequest);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Reject travel request (admin only)
  app.put("/api/travel/:id/reject", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { remarks } = req.body;
      
      // Get travel request by ID and verify ownership
      const request = await storage.getTravelRequest(id);
      if (!request) {
        return res.status(404).json({ message: "Travel request not found" });
      }
      
      // Verify company ownership
      const employee = await storage.getUser(request.userId);
      if (!employee || employee.companyId !== req.session.user!.companyId) {
        return res.status(404).json({ message: "Travel request does not belong to your company" });
      }
      
      // Verify status is pending
      if (request.status !== 'pending') {
        return res.status(400).json({ message: `Cannot reject request with status: ${request.status}` });
      }
      
      const updatedRequest = await storage.updateTravelRequestStatus(
        id,
        'rejected',
        req.session.user!.id,
        remarks
      );
      res.json(updatedRequest);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Add expense to travel request
  app.post("/api/travel/:id/expenses", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Validate input data with Zod schema
      const validatedData = insertTravelClaimSchema.parse(req.body);
      
      // Get travel request and verify ownership
      const request = await storage.getTravelRequest(id);
      if (!request) {
        return res.status(404).json({ message: "Travel request not found" });
      }
      
      // Verify company ownership
      const employee = await storage.getUser(request.userId);
      if (!employee || employee.companyId !== req.session.user!.companyId) {
        return res.status(404).json({ message: "Travel request does not belong to your company" });
      }
      
      // Verify user owns the request (strict ownership check)
      if (request.userId !== req.session.user!.id) {
        return res.status(403).json({ message: "You can only add expenses to your own travel requests" });
      }
      
      // Create expense claim linked to travel request
      const expense = await storage.createTravelClaim({
        ...validatedData,
        userId: req.session.user!.id,
        travelRequestId: id,
        status: 'pending',
      });
      res.json(expense);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });
  
  // Record advance payment for travel
  app.put("/api/travel/:id/advance", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { advanceAmount } = req.body;
      
      // Validate input
      if (typeof advanceAmount !== 'number' && typeof advanceAmount !== 'string') {
        return res.status(400).json({ message: "Advance amount is required" });
      }
      
      // Get travel request by ID and verify ownership
      const request = await storage.getTravelRequest(id);
      if (!request) {
        return res.status(404).json({ message: "Travel request not found" });
      }
      
      // Verify company ownership
      const employee = await storage.getUser(request.userId);
      if (!employee || employee.companyId !== req.session.user!.companyId) {
        return res.status(404).json({ message: "Travel request does not belong to your company" });
      }
      
      // Verify status is approved
      if (request.status !== 'approved') {
        return res.status(400).json({ message: `Cannot set advance for request with status: ${request.status}` });
      }
      
      const updatedRequest = await storage.updateTravelRequest(id, {
        advanceAmount: String(advanceAmount),
      });
      res.json(updatedRequest);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Reconcile travel expenses (final settlement)
  app.put("/api/travel/:id/reconcile", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Get travel request by ID and verify ownership
      const request = await storage.getTravelRequest(id);
      if (!request) {
        return res.status(404).json({ message: "Travel request not found" });
      }
      
      // Verify company ownership
      const employee = await storage.getUser(request.userId);
      if (!employee || employee.companyId !== req.session.user!.companyId) {
        return res.status(404).json({ message: "Travel request does not belong to your company" });
      }
      
      // Verify status is approved (can't reconcile pending/rejected requests)
      if (request.status !== 'approved') {
        return res.status(400).json({ message: `Cannot reconcile request with status: ${request.status}` });
      }
      
      // Mark as completed
      const updatedRequest = await storage.updateTravelRequestStatus(
        id,
        'completed',
        req.session.user!.id,
        'Expenses reconciled'
      );
      res.json(updatedRequest);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Get pending travel requests (admin only)
  app.get("/api/travel/pending", requireAdmin, async (req, res) => {
    try {
      const requests = await storage.getPendingTravelRequests(req.session.user!.companyId);
      res.json(requests);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Get user's travel history
  app.get("/api/travel/history/:userId", requireAuth, async (req, res) => {
    try {
      const { userId } = req.params;
      
      // Verify company ownership
      const employee = await verifyCompanyOwnership(req, res, userId);
      if (!employee) {
        return res.status(404).json({ message: "User not found or does not belong to your company" });
      }
      
      const requests = await storage.getTravelRequestsByUser(userId);
      res.json(requests);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Get expense categories
  app.get("/api/expense-categories", requireAuth, async (req, res) => {
    try {
      const categories = await storage.getExpenseCategoriesByCompany(req.session.user!.companyId);
      res.json(categories);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Notification Routes
  
  // Broadcast notification to all employees (admin only)
  app.post("/api/notifications/broadcast", requireAdmin, async (req, res) => {
    try {
      const { title, message, type } = req.body;
      
      // Get all employees in the company
      const employees = await storage.getUsersByCompany(req.session.user!.companyId);
      
      // Create notification for each employee
      const notifications = await Promise.all(
        employees.map((emp: User) =>
          storage.createNotification({
            userId: emp.id,
            title,
            message,
            type: type || 'info',
          })
        )
      );
      
      res.json({
        message: `Notification broadcast to ${employees.length} employees`,
        count: employees.length,
      });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });
  
  // Get notifications for user
  app.get("/api/notifications/user/:userId", requireAuth, async (req, res) => {
    try {
      const { userId } = req.params;
      
      // Verify company ownership
      const employee = await verifyCompanyOwnership(req, res, userId);
      if (!employee) {
        return res.status(404).json({ message: "User not found or does not belong to your company" });
      }
      
      // Only allow users to view their own notifications, or admins/HR to view any
      const isOwner = userId === req.session.user!.id;
      const isAdmin = req.session.user!.role === 'admin' || req.session.user!.role === 'hr';
      
      if (!isOwner && !isAdmin) {
        return res.status(403).json({ message: "You can only view your own notifications" });
      }
      
      const notifications = await storage.getNotificationsByUser(userId);
      res.json(notifications);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Mark notification as read
  app.put("/api/notifications/:id/read", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Get all user notifications to verify ownership
      const notifications = await storage.getNotificationsByUser(req.session.user!.id);
      const notification = notifications.find(n => n.id === id);
      
      if (!notification) {
        return res.status(404).json({ message: "Notification not found or does not belong to you" });
      }
      
      const updatedNotification = await storage.markNotificationAsRead(id);
      res.json(updatedNotification);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Get notification templates
  app.get("/api/notification-templates", requireAuth, async (req, res) => {
    try {
      // Return common notification templates for the system
      const templates = [
        {
          id: 'leave_approved',
          title: 'Leave Approved',
          message: 'Your leave request from {{startDate}} to {{endDate}} has been approved.',
          type: 'success',
        },
        {
          id: 'leave_rejected',
          title: 'Leave Rejected',
          message: 'Your leave request from {{startDate}} to {{endDate}} has been rejected. Reason: {{remarks}}',
          type: 'warning',
        },
        {
          id: 'salary_processed',
          title: 'Salary Processed',
          message: 'Your salary for {{month}} has been processed. Net amount: {{netSalary}}',
          type: 'info',
        },
        {
          id: 'travel_approved',
          title: 'Travel Request Approved',
          message: 'Your travel request to {{destination}} has been approved.',
          type: 'success',
        },
        {
          id: 'expense_approved',
          title: 'Expense Approved',
          message: 'Your expense claim of {{amount}} has been approved.',
          type: 'success',
        },
      ];
      
      res.json(templates);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get all travel claims for company (Admin only)
  app.get("/api/travel-claims/company/:companyId", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { companyId } = req.params;
      const { status, startDate, endDate } = req.query;
      
      // Verify company ownership
      if (req.session.user!.companyId !== companyId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const claims = await storage.getTravelClaimsByCompany(
        companyId,
        status as string,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );
      res.json(claims);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get all travel claims for authenticated user's company (Admin only)
  app.get("/api/travel-claims/company", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { status, startDate, endDate } = req.query;
      const companyId = req.session.user!.companyId;

      console.log('Travel Claims API Debug:', {
        companyId,
        status,
        startDate,
        endDate,
        userId: req.session.user!.id
      });

      const claims = await storage.getTravelClaimsByCompany(
        companyId,
        status as string,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );

      console.log('Travel Claims API Response:', {
        claimsCount: claims.length,
        claims: claims.map(c => ({
          id: c.id,
          userId: c.userId,
          category: c.category,
          amount: c.amount,
          status: c.status,
          user: c.user ? { id: c.user.id, fullName: c.user.fullName } : null
        }))
      });

      res.json(claims);
    } catch (error: any) {
      console.error('Travel Claims API Error:', error);
      res.status(500).json({ message: error.message });
    }
  });


  // Salary Routes
  
  // Get all salary structures for company
  app.get("/api/salary-structures", requireAuth, async (req, res) => {
    try {
      const structures = await storage.getActiveSalaryStructures(req.session.user!.companyId);
      res.json(structures);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Create salary structure (admin only)
  app.post("/api/salary-structures", requireAdmin, async (req, res) => {
    try {
      const { name, currency, description } = req.body;
      
      const structure = await storage.createSalaryStructure({
        companyId: req.session.user!.companyId,
        name,
        currency: currency || 'INR',
        description,
        isActive: true,
      });
      res.json(structure);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });
  
  // Get salary components for a structure
  app.get("/api/salary-components", requireAuth, async (req, res) => {
    try {
      const { structureId } = req.query;
      
      if (!structureId || typeof structureId !== 'string') {
        return res.status(400).json({ message: "Structure ID is required" });
      }
      
      const components = await storage.getComponentsByStructure(structureId);
      res.json(components);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Get salaries for user
  app.get("/api/salaries/user/:userId", requireAuth, async (req, res) => {
    try {
      const { userId } = req.params;
      
      // Verify company ownership
      const employee = await verifyCompanyOwnership(req, res, userId);
      if (!employee) {
        return res.status(404).json({ message: "User not found or does not belong to your company" });
      }
      
      const salaries = await storage.getSalariesByUser(userId);
      res.json(salaries);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Process/generate salary (admin only)
  app.post("/api/salaries/process", requireAdmin, async (req, res) => {
    try {
      const { userId, month, year, basicSalary, allowances, deductions, netSalary, currency } = req.body;
      
      // Verify employee belongs to company
      const employee = await verifyCompanyOwnership(req, res, userId);
      if (!employee) {
        return res.status(404).json({ message: "Employee not found or does not belong to your company" });
      }
      
      // Create salary record
      const salary = await storage.createSalary({
        userId,
        month: `${year}-${String(month).padStart(2, '0')}`,
        basicSalary,
        allowances: allowances || 0,
        deductions: deductions || 0,
        netSalary,
        currency: currency || 'INR',
        status: 'processed',
      });
      res.json(salary);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });
  
  // Get specific payslip
  app.get("/api/salaries/payslip/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Get all salaries for user's company
      const allSalaries = await Promise.all(
        (await storage.getUsersByCompany(req.session.user!.companyId))
          .map((emp: User) => storage.getSalariesByUser(emp.id))
      );
      
      // Flatten and find the requested salary
      const salary = allSalaries.flat().find((s: any) => s.id === id);
      
      if (!salary) {
        return res.status(404).json({ message: "Payslip not found or does not belong to your company" });
      }
      
      res.json(salary);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Activity Log Routes
  
  // Create activity log
  app.post("/api/activity-logs", requireAuth, async (req, res) => {
    try {
      const validatedData = insertActivityLogSchema.parse(req.body);
      const log = await storage.createActivityLog(validatedData);
      res.json(log);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });
  
  // Get activity logs by user
  app.get("/api/activity-logs/user/:userId", requireAuth, async (req, res) => {
    try {
      const { userId } = req.params;
      const { date } = req.query;
      
      const logs = await storage.getActivityLogsByUser(
        userId,
        date ? new Date(date as string) : undefined
      );
      res.json(logs);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get all activity logs for company (Admin only)
  app.get("/api/activity-logs/company/:companyId", requireAuth, requireAdmin, async (req, res) => {
    try {
      const { companyId } = req.params;
      const { startDate, endDate, userId } = req.query;
      
      // Verify company ownership
      if (req.session.user!.companyId !== companyId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const logs = await storage.getActivityLogsByCompany(
        companyId,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined,
        userId as string
      );
      res.json(logs);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Reports & Analytics Routes
  
  // Get attendance report
  app.get("/api/reports/attendance", requireAdmin, async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const companyId = req.session.user!.companyId;
      
      // Get all attendance records for company within date range
      const attendanceRecords = await storage.getAttendanceByCompany(companyId);
      
      // Filter by date range if provided
      let filteredRecords = attendanceRecords;
      if (startDate) {
        filteredRecords = filteredRecords.filter((r: Attendance) => 
          new Date(r.date) >= new Date(startDate as string)
        );
      }
      if (endDate) {
        filteredRecords = filteredRecords.filter((r: Attendance) => 
          new Date(r.date) <= new Date(endDate as string)
        );
      }
      
      // Calculate statistics
      const totalDays = filteredRecords.length;
      const presentDays = filteredRecords.filter((r: Attendance) => r.status === 'present').length;
      const absentDays = filteredRecords.filter((r: Attendance) => r.status === 'absent').length;
      const totalOvertimeHours = filteredRecords.reduce((sum: number, r: Attendance) => 
        sum + parseFloat(r.overtimeHours || '0'), 0
      );
      
      res.json({
        totalDays,
        presentDays,
        absentDays,
        totalOvertimeHours,
        attendanceRate: totalDays > 0 ? (presentDays / totalDays) * 100 : 0,
        records: filteredRecords,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Get leave report
  app.get("/api/reports/leaves", requireAdmin, async (req, res) => {
    try {
      const { startDate, endDate, status } = req.query;
      const companyId = req.session.user!.companyId;
      
      // Get all leaves with user information
      const results = await storage.getAllLeavesWithUsers(companyId);
      
      // Map flat results to nested user objects
      const leaves = results.map((r: any) => ({
        id: r.id,
        userId: r.userId,
        leaveType: r.leaveType,
        startDate: r.startDate,
        endDate: r.endDate,
        totalDays: r.totalDays,
        reason: r.reason,
        status: r.status,
        appliedAt: r.appliedAt,
        approvedBy: r.approvedBy,
        remarks: r.remarks,
        user: {
          id: r.userId,
          fullName: r.userFullName,
          email: r.userEmail,
          position: r.userPosition,
          department: r.userDepartment,
          role: r.userRole,
        },
      }));
      
      // Filter by date range and status
      let filteredLeaves = leaves;
      
      // Use overlap logic: include any leave that overlaps the query range
      if (startDate && endDate) {
        const queryStart = new Date(startDate as string);
        const queryEnd = new Date(endDate as string);
        filteredLeaves = filteredLeaves.filter(l => {
          const leaveStart = new Date(l.startDate);
          const leaveEnd = new Date(l.endDate);
          // Include if leave overlaps query range: leaveStart <= queryEnd AND leaveEnd >= queryStart
          return leaveStart <= queryEnd && leaveEnd >= queryStart;
        });
      } else if (startDate) {
        const queryStart = new Date(startDate as string);
        filteredLeaves = filteredLeaves.filter(l => new Date(l.endDate) >= queryStart);
      } else if (endDate) {
        const queryEnd = new Date(endDate as string);
        filteredLeaves = filteredLeaves.filter(l => new Date(l.startDate) <= queryEnd);
      }
      
      if (status) {
        filteredLeaves = filteredLeaves.filter(l => l.status === status);
      }
      
      // Calculate statistics
      const totalLeaves = filteredLeaves.length;
      const approvedLeaves = filteredLeaves.filter(l => l.status === 'approved').length;
      const pendingLeaves = filteredLeaves.filter(l => l.status === 'pending').length;
      const rejectedLeaves = filteredLeaves.filter(l => l.status === 'rejected').length;
      const totalDays = filteredLeaves.reduce((sum, l) => {
        const start = new Date(l.startDate);
        const end = new Date(l.endDate);
        const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        return sum + days;
      }, 0);
      
      res.json({
        totalLeaves,
        approvedLeaves,
        pendingLeaves,
        rejectedLeaves,
        totalDays,
        approvalRate: totalLeaves > 0 ? (approvedLeaves / totalLeaves) * 100 : 0,
        leaves: filteredLeaves,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Get travel requests report
  app.get("/api/reports/travel-requests", requireAdmin, async (req, res) => {
    try {
      const { startDate, endDate, status } = req.query;
      const companyId = req.session.user!.companyId;
      
      // Get all travel requests with user information
      const results = await storage.getAllTravelRequestsWithUsers(companyId);
      
      // Map flat results to nested user objects
      const travelRequests = results.map((r: any) => ({
        id: r.id,
        userId: r.userId,
        destination: r.destination,
        purpose: r.purpose,
        startDate: r.startDate,
        endDate: r.endDate,
        estimatedCost: r.estimatedCost,
        status: r.status,
        createdAt: r.createdAt,
        approvedBy: r.approvedBy,
        remarks: r.remarks,
        user: {
          id: r.userId,
          fullName: r.userFullName,
          email: r.userEmail,
          position: r.userPosition,
          department: r.userDepartment,
          role: r.userRole,
        },
      }));
      
      // Filter by date range and status
      let filteredRequests = travelRequests;
      
      // Use overlap logic: include any travel that overlaps the query range
      if (startDate && endDate) {
        const queryStart = new Date(startDate as string);
        const queryEnd = new Date(endDate as string);
        filteredRequests = filteredRequests.filter(t => {
          const travelStart = new Date(t.startDate);
          const travelEnd = new Date(t.endDate);
          return travelStart <= queryEnd && travelEnd >= queryStart;
        });
      } else if (startDate) {
        const queryStart = new Date(startDate as string);
        filteredRequests = filteredRequests.filter(t => new Date(t.endDate) >= queryStart);
      } else if (endDate) {
        const queryEnd = new Date(endDate as string);
        filteredRequests = filteredRequests.filter(t => new Date(t.startDate) <= queryEnd);
      }
      
      if (status) {
        filteredRequests = filteredRequests.filter(t => t.status === status);
      }
      
      // Calculate statistics
      const totalRequests = filteredRequests.length;
      const approvedRequests = filteredRequests.filter(t => t.status === 'approved').length;
      const pendingRequests = filteredRequests.filter(t => t.status === 'pending').length;
      const rejectedRequests = filteredRequests.filter(t => t.status === 'rejected').length;
      const totalEstimatedCost = filteredRequests.reduce((sum, t) => 
        sum + parseFloat(t.estimatedCost || '0'), 0
      );
      
      res.json({
        totalRequests,
        approvedRequests,
        pendingRequests,
        rejectedRequests,
        totalEstimatedCost,
        approvalRate: totalRequests > 0 ? (approvedRequests / totalRequests) * 100 : 0,
        travelRequests: filteredRequests,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Get salary report
  app.get("/api/reports/salary", requireAdmin, async (req, res) => {
    try {
      const { month, year } = req.query;
      const companyId = req.session.user!.companyId;
      
      // Get all employees in company
      const employees = await storage.getUsersByCompany(companyId);
      
      // Get salaries for all employees
      const allSalaries = await Promise.all(
        employees.map((emp: User) => storage.getSalariesByUser(emp.id))
      );
      const salaries = allSalaries.flat();
      
      // Filter by month/year if provided
      let filteredSalaries = salaries;
      if (month && year) {
        const targetMonth = `${year}-${month.toString().padStart(2, '0')}`;
        filteredSalaries = filteredSalaries.filter(s => 
          s.month === targetMonth
        );
      }
      
      // Calculate statistics
      const totalSalaries = filteredSalaries.length;
      const totalGrossSalary = filteredSalaries.reduce((sum, s) => 
        sum + (parseFloat(s.basicSalary) + parseFloat(s.allowances || '0')), 0
      );
      const totalDeductions = filteredSalaries.reduce((sum, s) => 
        sum + parseFloat(s.deductions || '0'), 0
      );
      const totalNetSalary = filteredSalaries.reduce((sum, s) => 
        sum + parseFloat(s.netSalary), 0
      );
      const averageNetSalary = totalSalaries > 0 ? totalNetSalary / totalSalaries : 0;
      
      res.json({
        totalSalaries,
        totalGrossSalary,
        totalDeductions,
        totalNetSalary,
        averageNetSalary,
        salaries: filteredSalaries,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Get travel report
  app.get("/api/reports/travel", requireAdmin, async (req, res) => {
    try {
      const { startDate, endDate, status } = req.query;
      const companyId = req.session.user!.companyId;
      
      // Get all employees in company
      const employees = await storage.getUsersByCompany(companyId);
      
      // Get travel claims for all employees
      const allClaims = await Promise.all(
        employees.map((emp: User) => storage.getTravelClaimsByUser(emp.id))
      );
      const claims = allClaims.flat();
      
      // Filter by date range and status
      let filteredClaims = claims;
      
      // Use overlap logic: include any claim that overlaps the query range
      if (startDate && endDate) {
        const queryStart = new Date(startDate as string);
        const queryEnd = new Date(endDate as string);
        filteredClaims = filteredClaims.filter(c => {
          const claimDate = new Date(c.date);
          // Include if claim date is within query range
          return claimDate >= queryStart && claimDate <= queryEnd;
        });
      } else if (startDate) {
        const queryStart = new Date(startDate as string);
        filteredClaims = filteredClaims.filter(c => new Date(c.date) >= queryStart);
      } else if (endDate) {
        const queryEnd = new Date(endDate as string);
        filteredClaims = filteredClaims.filter(c => new Date(c.date) <= queryEnd);
      }
      
      if (status) {
        filteredClaims = filteredClaims.filter(c => c.status === status);
      }
      
      // Calculate statistics
      const totalClaims = filteredClaims.length;
      const approvedClaims = filteredClaims.filter(c => c.status === 'approved').length;
      const pendingClaims = filteredClaims.filter(c => c.status === 'pending').length;
      const rejectedClaims = filteredClaims.filter(c => c.status === 'rejected').length;
      const totalExpenses = filteredClaims.reduce((sum, c) => 
        sum + parseFloat(c.amount), 0
      );
      const totalAdvance = filteredClaims.reduce((sum, c) => 
        sum + 0, 0 // Travel claims don't have advance amount
      );
      const pendingSettlement = filteredClaims.reduce((sum, c) => 
        sum + parseFloat(c.amount), 0
      );
      
      res.json({
        totalClaims,
        approvedClaims,
        pendingClaims,
        rejectedClaims,
        totalExpenses,
        totalAdvance,
        pendingSettlement,
        claims: filteredClaims,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Get employee summary report
  app.get("/api/reports/employee-summary", requireAdmin, async (req, res) => {
    try {
      const companyId = req.session.user!.companyId;
      
      // Get all employees
      const employees = await storage.getUsersByCompany(companyId);
      
      // Calculate statistics
      const totalEmployees = employees.length;
      const activeEmployees = employees.filter((e: User) => e.isActive === true).length;
      const inactiveEmployees = employees.filter((e: User) => e.isActive === false).length;
      
      // Group by role
      const roleDistribution = employees.reduce((acc: any, e: User) => {
        acc[e.role] = (acc[e.role] || 0) + 1;
        return acc;
      }, {});
      
      // Group by department
      const departmentDistribution = employees.reduce((acc: any, e: User) => {
        if (e.department) {
          acc[e.department] = (acc[e.department] || 0) + 1;
        }
        return acc;
      }, {});
      
      res.json({
        totalEmployees,
        activeEmployees,
        inactiveEmployees,
        roleDistribution,
        departmentDistribution,
        employees,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Get analytics dashboard KPIs
  app.get("/api/analytics/dashboard", requireAdmin, async (req, res) => {
    try {
      const companyId = req.session.user!.companyId;
      
      // Get all employees
      const employees = await storage.getUsersByCompany(companyId);
      const totalEmployees = employees.length;
      const activeEmployees = employees.filter((e: User) => e.isActive === true).length;
      
      // Get today's attendance
      const today = new Date();
      const attendanceRecords = await storage.getAttendanceByCompany(companyId);
      const todayAttendance = attendanceRecords.filter((r: Attendance) => {
        const recordDate = new Date(r.date);
        return recordDate.toDateString() === today.toDateString();
      });
      const presentToday = todayAttendance.filter((r: Attendance) => r.status === 'present').length;
      const attendanceRate = activeEmployees > 0 ? (presentToday / activeEmployees) * 100 : 0;
      
      // Get pending leave requests
      const allLeaves = await Promise.all(
        employees.map((emp: User) => storage.getLeavesByUser(emp.id))
      );
      const pendingLeaves = allLeaves.flat().filter(l => l.status === 'pending').length;
      
      // Get pending travel claims
      const allClaims = await Promise.all(
        employees.map((emp: User) => storage.getTravelClaimsByUser(emp.id))
      );
      const pendingClaims = allClaims.flat().filter(c => c.status === 'pending').length;
      
      // Get this month's salary data
      const currentMonth = today.getMonth() + 1;
      const currentYear = today.getFullYear();
      const allSalaries = await Promise.all(
        employees.map((emp: User) => storage.getSalariesByUser(emp.id))
      );
      const currentMonthStr = `${currentYear}-${currentMonth.toString().padStart(2, '0')}`;
      const thisMonthSalaries = allSalaries.flat().filter(s => 
        s.month === currentMonthStr
      );
      const totalPayroll = thisMonthSalaries.reduce((sum, s) => sum + parseFloat(s.netSalary), 0);
      
      res.json({
        totalEmployees,
        activeEmployees,
        attendanceRate: Math.round(attendanceRate * 10) / 10,
        presentToday,
        pendingLeaves,
        pendingClaims,
        totalPayroll,
        processedSalaries: thisMonthSalaries.length,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Settings & Master Data Routes
  
  // Get company settings
  app.get("/api/settings/company", requireAuth, async (req, res) => {
    try {
      const companyId = req.session.user!.companyId;
      let settings = await storage.getSettingsByCompany(companyId);
      
      // Create default settings if none exist
      if (!settings) {
        settings = await storage.createSettings({
          companyId,
          workingHoursPerDay: "8",
          workingDaysPerWeek: 5,
          weekendDays: ['Saturday', 'Sunday'],
          overtimeRate: "1.5",
          currency: "INR",
          timezone: "Asia/Kolkata",
          dateFormat: "DD/MM/YYYY",
          fiscalYearStart: "04-01",
          enableBiometricAuth: false,
          enableGeofencing: false,
        });
      }
      
      res.json(settings);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Update company settings (admin only)
  app.put("/api/settings/company", requireAdmin, async (req, res) => {
    try {
      const companyId = req.session.user!.companyId;
      
      // Validate input with Zod schema (partial update)
      const updateData = insertSettingsSchema.partial().parse(req.body);
      
      // Ensure companyId cannot be changed
      delete (updateData as any).companyId;
      
      // Check if settings exist
      let settings = await storage.getSettingsByCompany(companyId);
      
      if (!settings) {
        // Create settings with defaults merged with update data
        const defaults = {
          workingHoursPerDay: "8",
          workingDaysPerWeek: 5,
          weekendDays: ['Saturday', 'Sunday'],
          overtimeRate: "1.5",
          currency: "INR",
          timezone: "Asia/Kolkata",
          dateFormat: "DD/MM/YYYY",
          fiscalYearStart: "04-01",
          enableBiometricAuth: false,
          enableGeofencing: false,
        };
        
        settings = await storage.createSettings({
          companyId,
          ...defaults,
          ...updateData, // Override defaults with client values
        });
      } else {
        // Update existing settings
        settings = await storage.updateSettings(companyId, updateData);
      }
      
      res.json(settings);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });
  
  // Get holidays for company
  app.get("/api/holidays", requireAuth, async (req, res) => {
    try {
      const { year } = req.query;
      const companyId = req.session.user!.companyId;
      
      const holidays = await storage.getHolidaysByCompany(
        companyId,
        year ? parseInt(year as string) : undefined
      );
      res.json(holidays);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Create holiday (admin only)
  app.post("/api/holidays", requireAdmin, async (req, res) => {
    try {
      // Validate input with Zod schema
      const validatedData = insertHolidaySchema.parse({
        ...req.body,
        companyId: req.session.user!.companyId, // Server-derived companyId
        date: new Date(req.body.date),
      });
      
      const holiday = await storage.createHoliday(validatedData);
      res.status(201).json(holiday);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });
  
  // Get company information
  app.get("/api/settings/company-info", requireAuth, async (req, res) => {
    try {
      const companyId = req.session.user!.companyId;
      const company = await storage.getCompanyById(companyId);
      
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      
      res.json(company);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Update company information (admin only)
  app.put("/api/settings/company-info", requireAdmin, async (req, res) => {
    try {
      const companyId = req.session.user!.companyId;
      const { name } = req.body;
      
      if (!name) {
        return res.status(400).json({ message: "Company name is required" });
      }
      
      const company = await storage.updateCompany(companyId, { name });
      res.json(company);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Update current user's location settings (admin only)
  app.put("/api/settings/location", requireAdmin, async (req, res) => {
    try {
      const userId = req.session.user!.id;
      const { allowedLatitude, allowedLongitude, allowedRadius, enableLocationAuth } = req.body;
      
      const updateData: any = {};
      
      if (allowedLatitude !== undefined) updateData.allowedLatitude = allowedLatitude;
      if (allowedLongitude !== undefined) updateData.allowedLongitude = allowedLongitude;
      if (allowedRadius !== undefined) updateData.allowedRadius = allowedRadius;
      if (enableLocationAuth !== undefined) updateData.enableLocationAuth = enableLocationAuth;
      
      const user = await storage.updateUser(userId, updateData);
      
      // Update session
      const { password: _, ...userWithoutPassword } = user;
      req.session.user = userWithoutPassword;
      
      res.json(userWithoutPassword);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
