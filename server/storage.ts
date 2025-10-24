// Referenced from javascript_database blueprint
import { 
  companies, users, attendance, leaves, travelClaims, salaries, activityLogs, notifications,
  departments, designations, leaveTypes, leaveBalances, attendanceBreaks,
  salaryStructures, salaryComponents, travelRequests, expenseCategories,
  settings, holidays, auditLogs,
  type Company, type InsertCompany,
  type User, type InsertUser,
  type Attendance, type InsertAttendance,
  type Leave, type InsertLeave,
  type TravelClaim, type InsertTravelClaim,
  type Salary, type InsertSalary,
  type ActivityLog, type InsertActivityLog,
  type Notification, type InsertNotification,
  type Department, type InsertDepartment,
  type Designation, type InsertDesignation,
  type LeaveType, type InsertLeaveType,
  type LeaveBalance, type InsertLeaveBalance,
  type AttendanceBreak, type InsertAttendanceBreak,
  type SalaryStructure, type InsertSalaryStructure,
  type SalaryComponent, type InsertSalaryComponent,
  type TravelRequest, type InsertTravelRequest,
  type ExpenseCategory, type InsertExpenseCategory,
  type Settings, type InsertSettings,
  type Holiday, type InsertHoliday,
  type AuditLog, type InsertAuditLog,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, desc, or, like, sql } from "drizzle-orm";

export interface IStorage {
  // Companies
  createCompany(company: InsertCompany): Promise<Company>;
  getCompanyByEmail(email: string): Promise<Company | undefined>;
  getCompanyById(id: string): Promise<Company | undefined>;
  updateCompany(id: string, company: Partial<InsertCompany>): Promise<Company>;
  
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser & { companyId: string }): Promise<User>;
  updateUser(id: string, user: Partial<InsertUser>): Promise<User>;
  getUsersByCompany(companyId: string): Promise<User[]>;
  
  // Attendance
  createAttendance(attendance: InsertAttendance): Promise<Attendance>;
  getAttendanceByUser(userId: string, startDate?: Date, endDate?: Date): Promise<Attendance[]>;
  getTodayAttendance(userId: string): Promise<Attendance | undefined>;
  updateAttendance(id: string, attendance: Partial<InsertAttendance>): Promise<Attendance>;
  getAllAttendanceToday(companyId: string): Promise<Attendance[]>;
  getAttendanceByCompany(companyId: string, startDate?: Date, endDate?: Date): Promise<Attendance[]>;
  
  // Leaves
  createLeave(leave: InsertLeave): Promise<Leave>;
  getLeavesByUser(userId: string): Promise<Leave[]>;
  getPendingLeaves(companyId: string): Promise<Leave[]>;
  getAllLeavesWithUsers(companyId: string): Promise<any[]>;
  updateLeaveStatus(id: string, status: string, approvedBy: string, remarks?: string): Promise<Leave>;
  
  // Travel Claims
  createTravelClaim(claim: InsertTravelClaim & { status: string }): Promise<TravelClaim>;
  getTravelClaimsByUser(userId: string): Promise<TravelClaim[]>;
  getPendingTravelClaims(companyId: string): Promise<TravelClaim[]>;
  getAllTravelRequestsWithUsers(companyId: string): Promise<any[]>;
  getTravelClaimsByCompany(companyId: string, status?: string, startDate?: Date, endDate?: Date): Promise<(TravelClaim & { user: { id: string; fullName: string; email: string; role: string; department: string | null; position: string | null } })[]>;
  updateTravelClaimStatus(id: string, status: string, approvedBy: string, remarks?: string): Promise<TravelClaim>;
  
  // Salaries
  createSalary(salary: InsertSalary): Promise<Salary>;
  getSalariesByUser(userId: string): Promise<Salary[]>;
  getSalaryByUserAndMonth(userId: string, month: string): Promise<Salary | undefined>;
  
  // Activity Logs
  createActivityLog(log: InsertActivityLog): Promise<ActivityLog>;
  getActivityLogsByUser(userId: string, date?: Date): Promise<ActivityLog[]>;
  getActivityLogsByCompany(companyId: string, startDate?: Date, endDate?: Date, userId?: string): Promise<(ActivityLog & { user: { id: string; fullName: string; email: string; role: string; department: string | null; position: string | null } })[]>;
  
  // Notifications
  createNotification(notification: InsertNotification): Promise<Notification>;
  getNotificationsByUser(userId: string): Promise<Notification[]>;
  markNotificationAsRead(id: string): Promise<Notification>;
  
  // Departments
  createDepartment(department: InsertDepartment): Promise<Department>;
  getDepartmentsByCompany(companyId: string): Promise<Department[]>;
  getDepartment(id: string): Promise<Department | undefined>;
  updateDepartment(id: string, department: Partial<InsertDepartment>): Promise<Department>;
  deleteDepartment(id: string): Promise<void>;
  
  // Designations
  createDesignation(designation: InsertDesignation): Promise<Designation>;
  getDesignationsByCompany(companyId: string): Promise<Designation[]>;
  getDesignationsByDepartment(departmentId: string): Promise<Designation[]>;
  getDesignation(id: string): Promise<Designation | undefined>;
  updateDesignation(id: string, designation: Partial<InsertDesignation>): Promise<Designation>;
  deleteDesignation(id: string): Promise<void>;
  
  // Leave Types
  createLeaveType(leaveType: InsertLeaveType): Promise<LeaveType>;
  getLeaveTypesByCompany(companyId: string): Promise<LeaveType[]>;
  getActiveLeaveTypes(companyId: string): Promise<LeaveType[]>;
  getLeaveType(id: string): Promise<LeaveType | undefined>;
  updateLeaveType(id: string, leaveType: Partial<InsertLeaveType>): Promise<LeaveType>;
  
  // Leave Balances
  createLeaveBalance(balance: InsertLeaveBalance): Promise<LeaveBalance>;
  getLeaveBalancesByUser(userId: string, year?: number): Promise<LeaveBalance[]>;
  getLeaveBalance(userId: string, leaveTypeId: string, year: number): Promise<LeaveBalance | undefined>;
  updateLeaveBalance(id: string, balance: Partial<InsertLeaveBalance>): Promise<LeaveBalance>;
  initializeLeaveBalancesForUser(userId: string, year: number, companyId: string): Promise<void>;
  
  // Attendance Breaks
  createAttendanceBreak(breakRecord: InsertAttendanceBreak): Promise<AttendanceBreak>;
  getBreaksByAttendance(attendanceId: string): Promise<AttendanceBreak[]>;
  updateAttendanceBreak(id: string, breakData: Partial<InsertAttendanceBreak>): Promise<AttendanceBreak>;
  
  // Salary Structures
  createSalaryStructure(structure: InsertSalaryStructure): Promise<SalaryStructure>;
  getSalaryStructuresByCompany(companyId: string): Promise<SalaryStructure[]>;
  getActiveSalaryStructures(companyId: string): Promise<SalaryStructure[]>;
  getSalaryStructure(id: string): Promise<SalaryStructure | undefined>;
  updateSalaryStructure(id: string, structure: Partial<InsertSalaryStructure>): Promise<SalaryStructure>;
  
  // Salary Components
  createSalaryComponent(component: InsertSalaryComponent): Promise<SalaryComponent>;
  getComponentsByStructure(structureId: string): Promise<SalaryComponent[]>;
  updateSalaryComponent(id: string, component: Partial<InsertSalaryComponent>): Promise<SalaryComponent>;
  deleteSalaryComponent(id: string): Promise<void>;
  
  // Travel Requests
  createTravelRequest(request: InsertTravelRequest & { userId: string }): Promise<TravelRequest>;
  getTravelRequestsByUser(userId: string): Promise<TravelRequest[]>;
  getPendingTravelRequests(companyId: string): Promise<TravelRequest[]>;
  getTravelRequestsByCompany(companyId: string, status?: string, startDate?: Date, endDate?: Date): Promise<(TravelRequest & { user: { id: string; fullName: string; email: string; role: string; department: string | null; position: string | null } })[]>;
  getTravelRequest(id: string): Promise<TravelRequest | undefined>;
  updateTravelRequestStatus(id: string, status: string, approvedBy: string, remarks?: string): Promise<TravelRequest>;
  updateTravelRequest(id: string, request: Partial<InsertTravelRequest>): Promise<TravelRequest>;
  
  // Expense Categories
  createExpenseCategory(category: InsertExpenseCategory): Promise<ExpenseCategory>;
  getExpenseCategoriesByCompany(companyId: string): Promise<ExpenseCategory[]>;
  getActiveExpenseCategories(companyId: string): Promise<ExpenseCategory[]>;
  updateExpenseCategory(id: string, category: Partial<InsertExpenseCategory>): Promise<ExpenseCategory>;
  
  // Settings
  createSettings(settings: InsertSettings): Promise<Settings>;
  getSettingsByCompany(companyId: string): Promise<Settings | undefined>;
  updateSettings(companyId: string, settings: Partial<InsertSettings>): Promise<Settings>;
  
  // Holidays
  createHoliday(holiday: InsertHoliday): Promise<Holiday>;
  getHolidaysByCompany(companyId: string, year?: number): Promise<Holiday[]>;
  getHoliday(id: string): Promise<Holiday | undefined>;
  updateHoliday(id: string, holiday: Partial<InsertHoliday>): Promise<Holiday>;
  deleteHoliday(id: string): Promise<void>;
  
  // Audit Logs
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getAuditLogsByCompany(companyId: string, startDate?: Date, endDate?: Date): Promise<AuditLog[]>;
  getAuditLogsByUser(userId: string, startDate?: Date, endDate?: Date): Promise<AuditLog[]>;
  getAuditLogsByEntity(entity: string, entityId: string): Promise<AuditLog[]>;
  
  // Enhanced Employee Search/Filter
  searchEmployees(companyId: string, filters?: {
    search?: string;
    departmentId?: string;
    role?: string;
    isActive?: boolean;
  }): Promise<User[]>;
}

export class DatabaseStorage implements IStorage {
  // Companies
  async createCompany(insertCompany: InsertCompany): Promise<Company> {
    const [company] = await db.insert(companies).values(insertCompany).returning();
    return company;
  }

  async getCompanyByEmail(email: string): Promise<Company | undefined> {
    const [company] = await db.select().from(companies).where(eq(companies.email, email));
    return company || undefined;
  }

  async getCompanyById(id: string): Promise<Company | undefined> {
    const [company] = await db.select().from(companies).where(eq(companies.id, id));
    return company || undefined;
  }

  async updateCompany(id: string, updateData: Partial<InsertCompany>): Promise<Company> {
    const [company] = await db.update(companies)
      .set(updateData)
      .where(eq(companies.id, id))
      .returning();
    return company;
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser & { companyId: string }): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: string, updateData: Partial<InsertUser>): Promise<User> {
    const [user] = await db.update(users).set(updateData).where(eq(users.id, id)).returning();
    return user;
  }

  async getUsersByCompany(companyId: string): Promise<User[]> {
    return await db.select().from(users).where(eq(users.companyId, companyId));
  }

  // Attendance
  async createAttendance(insertAttendance: InsertAttendance): Promise<Attendance> {
    const [record] = await db.insert(attendance).values(insertAttendance).returning();
    return record;
  }

  async getAttendanceByUser(userId: string, startDate?: Date, endDate?: Date): Promise<Attendance[]> {
    const conditions = [eq(attendance.userId, userId)];
    
    if (startDate && endDate) {
      conditions.push(gte(attendance.date, startDate));
      conditions.push(lte(attendance.date, endDate));
    }
    
    return await db.select().from(attendance)
      .where(and(...conditions))
      .orderBy(desc(attendance.date));
  }

  async getTodayAttendance(userId: string): Promise<Attendance | undefined> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const [record] = await db.select().from(attendance).where(
      and(
        eq(attendance.userId, userId),
        gte(attendance.date, today)
      )
    );
    return record || undefined;
  }

  async updateAttendance(id: string, updateData: Partial<InsertAttendance>): Promise<Attendance> {
    const [record] = await db.update(attendance).set(updateData).where(eq(attendance.id, id)).returning();
    return record;
  }

  async getAllAttendanceToday(companyId: string): Promise<Attendance[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    console.log('getAllAttendanceToday Debug:', {
      companyId,
      today: today.toISOString(),
      tomorrow: tomorrow.toISOString()
    });
    
    const results = await db.select().from(attendance)
      .innerJoin(users, eq(attendance.userId, users.id))
      .where(
        and(
          eq(users.companyId, companyId),
          gte(attendance.date, today),
          lte(attendance.date, tomorrow)
        )
      );
    
    console.log('getAllAttendanceToday Results:', {
      resultsCount: results.length,
      results: results.map(r => ({
        attendanceId: r.attendance.id,
        userId: r.attendance.userId,
        checkIn: r.attendance.checkIn,
        status: r.attendance.status,
        date: r.attendance.date
      }))
    });
    
    // Extract only the attendance data from the join result
    return results.map(result => result.attendance);
  }

  async getAttendanceByCompany(companyId: string, startDate?: Date, endDate?: Date): Promise<Attendance[]> {
    const conditions = [eq(users.companyId, companyId)];
    
    if (startDate) {
      conditions.push(gte(attendance.date, startDate));
    }
    if (endDate) {
      conditions.push(lte(attendance.date, endDate));
    }
    
    const results = await db.select().from(attendance)
      .innerJoin(users, eq(attendance.userId, users.id))
      .where(and(...conditions))
      .orderBy(desc(attendance.date));
    
    return results.map(result => result.attendance);
  }

  // Leaves
  async createLeave(insertLeave: InsertLeave): Promise<Leave> {
    const [leave] = await db.insert(leaves).values(insertLeave).returning();
    return leave;
  }

  async getLeavesByUser(userId: string): Promise<Leave[]> {
    return await db.select().from(leaves).where(eq(leaves.userId, userId)).orderBy(desc(leaves.appliedAt));
  }

  async getPendingLeaves(companyId: string): Promise<any[]> {
    const results = await db.select({
      id: leaves.id,
      userId: leaves.userId,
      leaveType: leaves.leaveType,
      startDate: leaves.startDate,
      endDate: leaves.endDate,
      totalDays: leaves.totalDays,
      reason: leaves.reason,
      status: leaves.status,
      appliedAt: leaves.appliedAt,
      approvedBy: leaves.approvedBy,
      remarks: leaves.remarks,
      // User fields
      userFullName: users.fullName,
      userEmail: users.email,
      userPosition: users.position,
      userDepartment: users.department,
      userRole: users.role,
    })
      .from(leaves)
      .innerJoin(users, eq(leaves.userId, users.id))
      .where(
        and(
          eq(users.companyId, companyId),
          eq(leaves.status, 'pending')
        )
      )
      .orderBy(desc(leaves.appliedAt));
    return results;
  }

  async getAllLeavesWithUsers(companyId: string): Promise<any[]> {
    const results = await db.select({
      id: leaves.id,
      userId: leaves.userId,
      leaveType: leaves.leaveType,
      startDate: leaves.startDate,
      endDate: leaves.endDate,
      totalDays: leaves.totalDays,
      reason: leaves.reason,
      status: leaves.status,
      appliedAt: leaves.appliedAt,
      approvedBy: leaves.approvedBy,
      remarks: leaves.remarks,
      // User fields
      userFullName: users.fullName,
      userEmail: users.email,
      userPosition: users.position,
      userDepartment: users.department,
      userRole: users.role,
    })
      .from(leaves)
      .innerJoin(users, eq(leaves.userId, users.id))
      .where(eq(users.companyId, companyId))
      .orderBy(desc(leaves.appliedAt));
    return results;
  }

  async updateLeaveStatus(id: string, status: string, approvedBy: string, remarks?: string): Promise<Leave> {
    const [leave] = await db.update(leaves)
      .set({ status, approvedBy, remarks })
      .where(eq(leaves.id, id))
      .returning();
    return leave;
  }

  // Travel Claims
  async createTravelClaim(insertClaim: InsertTravelClaim & { status: string }): Promise<TravelClaim> {
    const [claim] = await db.insert(travelClaims).values(insertClaim).returning();
    return claim;
  }

  async getTravelClaimsByUser(userId: string): Promise<TravelClaim[]> {
    return await db.select().from(travelClaims).where(eq(travelClaims.userId, userId)).orderBy(desc(travelClaims.submittedAt));
  }

  async getPendingTravelClaims(companyId: string): Promise<any[]> {
    // Returns pending travel REQUESTS (not expense claims)
    const results = await db.select({
      id: travelRequests.id,
      userId: travelRequests.userId,
      destination: travelRequests.destination,
      purpose: travelRequests.purpose,
      startDate: travelRequests.startDate,
      endDate: travelRequests.endDate,
      estimatedCost: travelRequests.estimatedCost,
      status: travelRequests.status,
      createdAt: travelRequests.createdAt,
      approvedBy: travelRequests.approvedBy,
      remarks: travelRequests.remarks,
      // User fields
      userFullName: users.fullName,
      userEmail: users.email,
      userPosition: users.position,
      userDepartment: users.department,
      userRole: users.role,
    })
      .from(travelRequests)
      .innerJoin(users, eq(travelRequests.userId, users.id))
      .where(
        and(
          eq(users.companyId, companyId),
          eq(travelRequests.status, 'pending')
        )
      )
      .orderBy(desc(travelRequests.createdAt));
    return results;
  }

  async getAllTravelRequestsWithUsers(companyId: string): Promise<any[]> {
    // Returns ALL travel requests with user information (similar to getAllLeavesWithUsers)
    const results = await db.select({
      id: travelRequests.id,
      userId: travelRequests.userId,
      destination: travelRequests.destination,
      purpose: travelRequests.purpose,
      startDate: travelRequests.startDate,
      endDate: travelRequests.endDate,
      estimatedCost: travelRequests.estimatedCost,
      status: travelRequests.status,
      createdAt: travelRequests.createdAt,
      approvedBy: travelRequests.approvedBy,
      remarks: travelRequests.remarks,
      // User fields
      userFullName: users.fullName,
      userEmail: users.email,
      userPosition: users.position,
      userDepartment: users.department,
      userRole: users.role,
    })
      .from(travelRequests)
      .innerJoin(users, eq(travelRequests.userId, users.id))
      .where(eq(users.companyId, companyId))
      .orderBy(desc(travelRequests.createdAt));
    return results;
  }

  async getTravelClaimsByCompany(companyId: string, status?: string, startDate?: Date, endDate?: Date): Promise<(TravelClaim & { user: { id: string; fullName: string; email: string; role: string; department: string | null; position: string | null } })[]> {
    const conditions = [eq(users.companyId, companyId)];
    
    if (status) {
      conditions.push(eq(travelClaims.status, status));
    }
    
    if (startDate) {
      conditions.push(gte(travelClaims.submittedAt, startDate));
    }
    
    if (endDate) {
      conditions.push(lte(travelClaims.submittedAt, endDate));
    }

    return await db
      .select({
        id: travelClaims.id,
        userId: travelClaims.userId,
        travelRequestId: travelClaims.travelRequestId,
        amount: travelClaims.amount,
        description: travelClaims.description,
        date: travelClaims.date,
        categoryId: travelClaims.categoryId,
        category: travelClaims.category,
        receipts: travelClaims.receipts,
        status: travelClaims.status,
        approvedBy: travelClaims.approvedBy,
        approvedAt: travelClaims.approvedAt,
        remarks: travelClaims.remarks,
        submittedAt: travelClaims.submittedAt,
        user: {
          id: users.id,
          fullName: users.fullName,
          email: users.email,
          role: users.role,
          department: users.department,
          position: users.position,
        }
      })
      .from(travelClaims)
      .innerJoin(users, eq(travelClaims.userId, users.id))
      .where(and(...conditions))
      .orderBy(desc(travelClaims.submittedAt));
  }

  async updateTravelClaimStatus(id: string, status: string, approvedBy: string, remarks?: string): Promise<any> {
    // Updates travel REQUEST status (not expense claim)
    const [request] = await db.update(travelRequests)
      .set({ status, approvedBy, remarks })
      .where(eq(travelRequests.id, id))
      .returning();
    return request;
  }

  // Salaries
  async createSalary(insertSalary: InsertSalary): Promise<Salary> {
    const [salary] = await db.insert(salaries).values(insertSalary).returning();
    return salary;
  }

  async getSalariesByUser(userId: string): Promise<Salary[]> {
    return await db.select().from(salaries).where(eq(salaries.userId, userId)).orderBy(desc(salaries.month));
  }

  async getSalaryByUserAndMonth(userId: string, month: string): Promise<Salary | undefined> {
    const [salary] = await db.select().from(salaries).where(
      and(
        eq(salaries.userId, userId),
        eq(salaries.month, month)
      )
    );
    return salary || undefined;
  }

  // Activity Logs
  async createActivityLog(insertLog: InsertActivityLog): Promise<ActivityLog> {
    const [log] = await db.insert(activityLogs).values(insertLog).returning();
    return log;
  }

  async getActivityLogsByUser(userId: string, date?: Date): Promise<ActivityLog[]> {
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      return await db.select().from(activityLogs).where(
        and(
          eq(activityLogs.userId, userId),
          gte(activityLogs.date, startOfDay),
          lte(activityLogs.date, endOfDay)
        )
      ).orderBy(desc(activityLogs.createdAt));
    }
    
    return await db.select().from(activityLogs).where(eq(activityLogs.userId, userId)).orderBy(desc(activityLogs.createdAt));
  }

  async getActivityLogsByCompany(companyId: string, startDate?: Date, endDate?: Date, userId?: string): Promise<(ActivityLog & { user: { id: string; fullName: string; email: string; role: string; department: string | null; position: string | null } })[]> {
    const conditions = [eq(users.companyId, companyId)];
    
    if (userId) {
      conditions.push(eq(activityLogs.userId, userId));
    }
    
    if (startDate) {
      conditions.push(gte(activityLogs.date, startDate));
    }
    
    if (endDate) {
      conditions.push(lte(activityLogs.date, endDate));
    }

    return await db
      .select({
        id: activityLogs.id,
        userId: activityLogs.userId,
        date: activityLogs.date,
        activities: activityLogs.activities,
        createdAt: activityLogs.createdAt,
        user: {
          id: users.id,
          fullName: users.fullName,
          email: users.email,
          role: users.role,
          department: users.department,
          position: users.position,
        }
      })
      .from(activityLogs)
      .innerJoin(users, eq(activityLogs.userId, users.id))
      .where(and(...conditions))
      .orderBy(desc(activityLogs.createdAt));
  }

  // Notifications
  async createNotification(insertNotification: InsertNotification): Promise<Notification> {
    const [notification] = await db.insert(notifications).values(insertNotification).returning();
    return notification;
  }

  async getNotificationsByUser(userId: string): Promise<Notification[]> {
    return await db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt));
  }

  async markNotificationAsRead(id: string): Promise<Notification> {
    const [notification] = await db.update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, id))
      .returning();
    return notification;
  }

  // Departments
  async createDepartment(insertDepartment: InsertDepartment): Promise<Department> {
    const [department] = await db.insert(departments).values(insertDepartment).returning();
    return department;
  }

  async getDepartmentsByCompany(companyId: string): Promise<Department[]> {
    return await db.select().from(departments).where(eq(departments.companyId, companyId));
  }

  async getDepartment(id: string): Promise<Department | undefined> {
    const [department] = await db.select().from(departments).where(eq(departments.id, id));
    return department || undefined;
  }

  async updateDepartment(id: string, updateData: Partial<InsertDepartment>): Promise<Department> {
    const [department] = await db.update(departments).set(updateData).where(eq(departments.id, id)).returning();
    return department;
  }

  async deleteDepartment(id: string): Promise<void> {
    await db.delete(departments).where(eq(departments.id, id));
  }

  // Designations
  async createDesignation(insertDesignation: InsertDesignation): Promise<Designation> {
    const [designation] = await db.insert(designations).values(insertDesignation).returning();
    return designation;
  }

  async getDesignationsByCompany(companyId: string): Promise<Designation[]> {
    return await db.select().from(designations).where(eq(designations.companyId, companyId));
  }

  async getDesignationsByDepartment(departmentId: string): Promise<Designation[]> {
    return await db.select().from(designations).where(eq(designations.departmentId, departmentId));
  }

  async getDesignation(id: string): Promise<Designation | undefined> {
    const [designation] = await db.select().from(designations).where(eq(designations.id, id));
    return designation || undefined;
  }

  async updateDesignation(id: string, updateData: Partial<InsertDesignation>): Promise<Designation> {
    const [designation] = await db.update(designations).set(updateData).where(eq(designations.id, id)).returning();
    return designation;
  }

  async deleteDesignation(id: string): Promise<void> {
    await db.delete(designations).where(eq(designations.id, id));
  }

  // Leave Types
  async createLeaveType(insertLeaveType: InsertLeaveType): Promise<LeaveType> {
    const [leaveType] = await db.insert(leaveTypes).values(insertLeaveType).returning();
    return leaveType;
  }

  async getLeaveTypesByCompany(companyId: string): Promise<LeaveType[]> {
    return await db.select().from(leaveTypes).where(eq(leaveTypes.companyId, companyId));
  }

  async getActiveLeaveTypes(companyId: string): Promise<LeaveType[]> {
    return await db.select().from(leaveTypes).where(
      and(
        eq(leaveTypes.companyId, companyId),
        eq(leaveTypes.isActive, true)
      )
    );
  }

  async getLeaveType(id: string): Promise<LeaveType | undefined> {
    const [leaveType] = await db.select().from(leaveTypes).where(eq(leaveTypes.id, id));
    return leaveType || undefined;
  }

  async updateLeaveType(id: string, updateData: Partial<InsertLeaveType>): Promise<LeaveType> {
    const [leaveType] = await db.update(leaveTypes).set(updateData).where(eq(leaveTypes.id, id)).returning();
    return leaveType;
  }

  // Leave Balances
  async createLeaveBalance(insertBalance: InsertLeaveBalance): Promise<LeaveBalance> {
    const [balance] = await db.insert(leaveBalances).values(insertBalance).returning();
    return balance;
  }

  async getLeaveBalancesByUser(userId: string, year?: number): Promise<LeaveBalance[]> {
    if (year) {
      return await db.select().from(leaveBalances).where(
        and(
          eq(leaveBalances.userId, userId),
          eq(leaveBalances.year, year)
        )
      );
    }
    return await db.select().from(leaveBalances).where(eq(leaveBalances.userId, userId));
  }

  async getLeaveBalance(userId: string, leaveTypeId: string, year: number): Promise<LeaveBalance | undefined> {
    const [balance] = await db.select().from(leaveBalances).where(
      and(
        eq(leaveBalances.userId, userId),
        eq(leaveBalances.leaveTypeId, leaveTypeId),
        eq(leaveBalances.year, year)
      )
    );
    return balance || undefined;
  }

  async updateLeaveBalance(id: string, updateData: Partial<InsertLeaveBalance>): Promise<LeaveBalance> {
    const [balance] = await db.update(leaveBalances).set(updateData).where(eq(leaveBalances.id, id)).returning();
    return balance;
  }

  async initializeLeaveBalancesForUser(userId: string, year: number, companyId: string): Promise<void> {
    // Get user to find their company
    const user = await this.getUser(userId);
    if (!user) return;

    // Get all active leave types for the company
    const types = await this.getActiveLeaveTypes(companyId);

    // Create leave balances for each type
    for (const type of types) {
      // Check if balance already exists
      const existing = await this.getLeaveBalance(userId, type.id, year);
      if (!existing) {
        await this.createLeaveBalance({
          userId,
          leaveTypeId: type.id,
          year,
          totalDays: type.maxDays.toString(),
          usedDays: "0",
          remainingDays: type.maxDays.toString(),
        });
      }
    }
  }

  // Attendance Breaks
  async createAttendanceBreak(insertBreak: InsertAttendanceBreak): Promise<AttendanceBreak> {
    const [breakRecord] = await db.insert(attendanceBreaks).values(insertBreak).returning();
    return breakRecord;
  }

  async getBreaksByAttendance(attendanceId: string): Promise<AttendanceBreak[]> {
    return await db.select().from(attendanceBreaks).where(eq(attendanceBreaks.attendanceId, attendanceId));
  }

  async updateAttendanceBreak(id: string, updateData: Partial<InsertAttendanceBreak>): Promise<AttendanceBreak> {
    const [breakRecord] = await db.update(attendanceBreaks).set(updateData).where(eq(attendanceBreaks.id, id)).returning();
    return breakRecord;
  }

  // Salary Structures
  async createSalaryStructure(insertStructure: InsertSalaryStructure): Promise<SalaryStructure> {
    const [structure] = await db.insert(salaryStructures).values(insertStructure).returning();
    return structure;
  }

  async getSalaryStructuresByCompany(companyId: string): Promise<SalaryStructure[]> {
    return await db.select().from(salaryStructures).where(eq(salaryStructures.companyId, companyId));
  }

  async getActiveSalaryStructures(companyId: string): Promise<SalaryStructure[]> {
    return await db.select().from(salaryStructures).where(
      and(
        eq(salaryStructures.companyId, companyId),
        eq(salaryStructures.isActive, true)
      )
    );
  }

  async getSalaryStructure(id: string): Promise<SalaryStructure | undefined> {
    const [structure] = await db.select().from(salaryStructures).where(eq(salaryStructures.id, id));
    return structure || undefined;
  }

  async updateSalaryStructure(id: string, updateData: Partial<InsertSalaryStructure>): Promise<SalaryStructure> {
    const [structure] = await db.update(salaryStructures).set(updateData).where(eq(salaryStructures.id, id)).returning();
    return structure;
  }

  // Salary Components
  async createSalaryComponent(insertComponent: InsertSalaryComponent): Promise<SalaryComponent> {
    const [component] = await db.insert(salaryComponents).values(insertComponent).returning();
    return component;
  }

  async getComponentsByStructure(structureId: string): Promise<SalaryComponent[]> {
    return await db.select().from(salaryComponents)
      .where(eq(salaryComponents.structureId, structureId))
      .orderBy(salaryComponents.displayOrder);
  }

  async updateSalaryComponent(id: string, updateData: Partial<InsertSalaryComponent>): Promise<SalaryComponent> {
    const [component] = await db.update(salaryComponents).set(updateData).where(eq(salaryComponents.id, id)).returning();
    return component;
  }

  async deleteSalaryComponent(id: string): Promise<void> {
    await db.delete(salaryComponents).where(eq(salaryComponents.id, id));
  }

  // Travel Requests
  async createTravelRequest(insertRequest: InsertTravelRequest & { userId: string }): Promise<TravelRequest> {
    const [request] = await db.insert(travelRequests).values(insertRequest).returning();
    return request;
  }

  async getTravelRequestsByUser(userId: string): Promise<TravelRequest[]> {
    return await db.select().from(travelRequests)
      .where(eq(travelRequests.userId, userId))
      .orderBy(desc(travelRequests.createdAt));
  }

  async getPendingTravelRequests(companyId: string): Promise<any[]> {
    const results = await db.select({
      id: travelRequests.id,
      userId: travelRequests.userId,
      userName: users.fullName,
      destination: travelRequests.destination,
      purpose: travelRequests.purpose,
      startDate: travelRequests.startDate,
      endDate: travelRequests.endDate,
      estimatedCost: travelRequests.estimatedCost,
      advanceAmount: travelRequests.advanceAmount,
      status: travelRequests.status,
      createdAt: travelRequests.createdAt,
      approvedBy: travelRequests.approvedBy,
      remarks: travelRequests.remarks,
    })
      .from(travelRequests)
      .innerJoin(users, eq(travelRequests.userId, users.id))
      .where(
        and(
          eq(users.companyId, companyId),
          eq(travelRequests.status, 'pending')
        )
      )
      .orderBy(desc(travelRequests.createdAt));
    return results;
  }

  async getTravelRequestsByCompany(companyId: string, status?: string, startDate?: Date, endDate?: Date): Promise<(TravelRequest & { user: { id: string; fullName: string; email: string; role: string; department: string | null; position: string | null } })[]> {
    const conditions = [eq(users.companyId, companyId)];
    
    if (status && status !== 'all') {
      conditions.push(eq(travelRequests.status, status));
    }
    
    if (startDate) {
      conditions.push(gte(travelRequests.startDate, startDate));
    }
    
    if (endDate) {
      conditions.push(lte(travelRequests.endDate, endDate));
    }

    return await db
      .select({
        id: travelRequests.id,
        userId: travelRequests.userId,
        destination: travelRequests.destination,
        purpose: travelRequests.purpose,
        startDate: travelRequests.startDate,
        endDate: travelRequests.endDate,
        estimatedCost: travelRequests.estimatedCost,
        advanceAmount: travelRequests.advanceAmount,
        status: travelRequests.status,
        createdAt: travelRequests.createdAt,
        approvedBy: travelRequests.approvedBy,
        remarks: travelRequests.remarks,
        user: {
          id: users.id,
          fullName: users.fullName,
          email: users.email,
          role: users.role,
          department: users.department,
          position: users.position,
        }
      })
      .from(travelRequests)
      .innerJoin(users, eq(travelRequests.userId, users.id))
      .where(and(...conditions))
      .orderBy(desc(travelRequests.createdAt));
  }

  async getTravelRequest(id: string): Promise<TravelRequest | undefined> {
    const [request] = await db.select().from(travelRequests).where(eq(travelRequests.id, id));
    return request || undefined;
  }

  async updateTravelRequestStatus(id: string, status: string, approvedBy: string, remarks?: string): Promise<TravelRequest> {
    const [request] = await db.update(travelRequests)
      .set({ status, approvedBy, remarks })
      .where(eq(travelRequests.id, id))
      .returning();
    return request;
  }

  async updateTravelRequest(id: string, updateData: Partial<InsertTravelRequest>): Promise<TravelRequest> {
    const [request] = await db.update(travelRequests).set(updateData).where(eq(travelRequests.id, id)).returning();
    return request;
  }

  // Expense Categories
  async createExpenseCategory(insertCategory: InsertExpenseCategory): Promise<ExpenseCategory> {
    const [category] = await db.insert(expenseCategories).values(insertCategory).returning();
    return category;
  }

  async getExpenseCategoriesByCompany(companyId: string): Promise<ExpenseCategory[]> {
    return await db.select().from(expenseCategories).where(eq(expenseCategories.companyId, companyId));
  }

  async getActiveExpenseCategories(companyId: string): Promise<ExpenseCategory[]> {
    return await db.select().from(expenseCategories).where(
      and(
        eq(expenseCategories.companyId, companyId),
        eq(expenseCategories.isActive, true)
      )
    );
  }

  async updateExpenseCategory(id: string, updateData: Partial<InsertExpenseCategory>): Promise<ExpenseCategory> {
    const [category] = await db.update(expenseCategories).set(updateData).where(eq(expenseCategories.id, id)).returning();
    return category;
  }

  // Settings
  async createSettings(insertSettings: InsertSettings): Promise<Settings> {
    const [settingsRecord] = await db.insert(settings).values(insertSettings).returning();
    return settingsRecord;
  }

  async getSettingsByCompany(companyId: string): Promise<Settings | undefined> {
    const [companySettings] = await db.select().from(settings).where(eq(settings.companyId, companyId));
    return companySettings || undefined;
  }

  async updateSettings(companyId: string, updateData: Partial<InsertSettings>): Promise<Settings> {
    const [updatedSettings] = await db.update(settings)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(settings.companyId, companyId))
      .returning();
    return updatedSettings;
  }

  // Holidays
  async createHoliday(insertHoliday: InsertHoliday): Promise<Holiday> {
    const [holiday] = await db.insert(holidays).values(insertHoliday).returning();
    return holiday;
  }

  async getHolidaysByCompany(companyId: string, year?: number): Promise<Holiday[]> {
    if (year) {
      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year, 11, 31);
      return await db.select().from(holidays).where(
        and(
          eq(holidays.companyId, companyId),
          gte(holidays.date, startDate),
          lte(holidays.date, endDate)
        )
      );
    }
    return await db.select().from(holidays).where(eq(holidays.companyId, companyId));
  }

  async getHoliday(id: string): Promise<Holiday | undefined> {
    const [holiday] = await db.select().from(holidays).where(eq(holidays.id, id));
    return holiday || undefined;
  }

  async updateHoliday(id: string, updateData: Partial<InsertHoliday>): Promise<Holiday> {
    const [holiday] = await db.update(holidays).set(updateData).where(eq(holidays.id, id)).returning();
    return holiday;
  }

  async deleteHoliday(id: string): Promise<void> {
    await db.delete(holidays).where(eq(holidays.id, id));
  }

  // Audit Logs
  async createAuditLog(insertLog: InsertAuditLog): Promise<AuditLog> {
    const [log] = await db.insert(auditLogs).values(insertLog).returning();
    return log;
  }

  async getAuditLogsByCompany(companyId: string, startDate?: Date, endDate?: Date): Promise<AuditLog[]> {
    const conditions = [eq(auditLogs.companyId, companyId)];

    if (startDate && endDate) {
      conditions.push(gte(auditLogs.timestamp, startDate));
      conditions.push(lte(auditLogs.timestamp, endDate));
    }

    return await db.select().from(auditLogs)
      .where(and(...conditions))
      .orderBy(desc(auditLogs.timestamp));
  }

  async getAuditLogsByUser(userId: string, startDate?: Date, endDate?: Date): Promise<AuditLog[]> {
    const conditions = [eq(auditLogs.userId, userId)];

    if (startDate && endDate) {
      conditions.push(gte(auditLogs.timestamp, startDate));
      conditions.push(lte(auditLogs.timestamp, endDate));
    }

    return await db.select().from(auditLogs)
      .where(and(...conditions))
      .orderBy(desc(auditLogs.timestamp));
  }

  async getAuditLogsByEntity(entity: string, entityId: string): Promise<AuditLog[]> {
    return await db.select().from(auditLogs).where(
      and(
        eq(auditLogs.entity, entity),
        eq(auditLogs.entityId, entityId)
      )
    ).orderBy(desc(auditLogs.timestamp));
  }

  // Enhanced Employee Search/Filter
  async searchEmployees(companyId: string, filters?: {
    search?: string;
    departmentId?: string;
    role?: string;
    isActive?: boolean;
  }): Promise<User[]> {
    const conditions = [eq(users.companyId, companyId)];

    if (filters?.departmentId) {
      conditions.push(eq(users.departmentId, filters.departmentId));
    }

    if (filters?.role) {
      conditions.push(eq(users.role, filters.role));
    }

    if (filters?.isActive !== undefined) {
      conditions.push(eq(users.isActive, filters.isActive));
    }

    // Search by name or email
    if (filters?.search) {
      const searchTerm = `%${filters.search}%`;
      const searchCondition = or(
        like(users.fullName, searchTerm),
        like(users.email, searchTerm)
      );
      if (searchCondition) {
        conditions.push(searchCondition);
      }
    }

    return await db.select().from(users)
      .where(and(...conditions))
      .orderBy(users.fullName);
  }
}

export const storage = new DatabaseStorage();
