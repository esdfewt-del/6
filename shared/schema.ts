import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, decimal } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Companies table
export const companies = pgTable("companies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Departments table
export const departments = pgTable("departments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  description: text("description"),
  managerId: varchar("manager_id").references((): any => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Designations table
export const designations = pgTable("designations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: 'cascade' }),
  title: text("title").notNull(),
  level: integer("level"), // hierarchy level
  departmentId: varchar("department_id").references(() => departments.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Users/Employees table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: 'cascade' }),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  role: text("role").notNull().default("employee"), // admin, hr, employee
  departmentId: varchar("department_id").references(() => departments.id),
  department: text("department"), // legacy field, kept for compatibility
  designationId: varchar("designation_id").references(() => designations.id),
  position: text("position"), // legacy field
  managerId: varchar("manager_id").references((): any => users.id),
  phone: text("phone"),
  photo: text("photo"),
  skills: text("skills").array(),
  bio: text("bio"),
  address: text("address"),
  emergencyContact: text("emergency_contact"),
  emergencyPhone: text("emergency_phone"),
  dateOfBirth: timestamp("date_of_birth"),
  joinDate: timestamp("join_date").defaultNow().notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  // Location-based login fields
  allowedLatitude: decimal("allowed_latitude", { precision: 10, scale: 8 }),
  allowedLongitude: decimal("allowed_longitude", { precision: 11, scale: 8 }),
  allowedRadius: decimal("allowed_radius", { precision: 8, scale: 2 }).default("100"), // meters
  enableLocationAuth: boolean("enable_location_auth").default(false).notNull(),
});

// Attendance records
export const attendance = pgTable("attendance", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  checkIn: timestamp("check_in").notNull(),
  checkOut: timestamp("check_out"),
  location: text("location"),
  checkInCoordinates: text("check_in_coordinates"), // lat,long
  checkOutCoordinates: text("check_out_coordinates"), // lat,long
  status: text("status").notNull().default("present"), // present, absent, half-day, leave
  date: timestamp("date").notNull(),
  totalHours: decimal("total_hours", { precision: 5, scale: 2 }),
  overtimeHours: decimal("overtime_hours", { precision: 5, scale: 2 }).default("0"),
  breakMinutes: integer("break_minutes").default(0),
  remarks: text("remarks"),
});

// Leave applications
export const leaves = pgTable("leaves", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  leaveTypeId: varchar("leave_type_id").references((): any => leaveTypes.id),
  leaveType: text("leave_type").notNull(), // legacy: sick, casual, vacation, unpaid
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  totalDays: decimal("total_days", { precision: 5, scale: 2 }).notNull(),
  reason: text("reason").notNull(),
  status: text("status").notNull().default("pending"), // pending, approved, rejected, cancelled
  approvedBy: varchar("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  remarks: text("remarks"),
  appliedAt: timestamp("applied_at").defaultNow().notNull(),
});

// Travel claims/reimbursements
export const travelClaims = pgTable("travel_claims", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  travelRequestId: varchar("travel_request_id").references((): any => travelRequests.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  description: text("description").notNull(),
  date: timestamp("date").notNull(),
  categoryId: varchar("category_id").references((): any => expenseCategories.id),
  category: text("category").notNull(), // legacy: transport, accommodation, meals, other
  receipts: text("receipts").array(),
  status: text("status").notNull().default("pending"), // pending, approved, rejected
  approvedBy: varchar("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  remarks: text("remarks"),
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
});

// Salary records
export const salaries = pgTable("salaries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  structureId: varchar("structure_id").references((): any => salaryStructures.id),
  month: text("month").notNull(), // YYYY-MM format
  basicSalary: decimal("basic_salary", { precision: 10, scale: 2 }).notNull(),
  allowances: decimal("allowances", { precision: 10, scale: 2 }).default("0").notNull(),
  deductions: decimal("deductions", { precision: 10, scale: 2 }).default("0").notNull(),
  tax: decimal("tax", { precision: 10, scale: 2 }).default("0").notNull(),
  netSalary: decimal("net_salary", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").default("INR").notNull(),
  paymentMethod: text("payment_method").default("bank_transfer"), // bank_transfer, cash, cheque
  status: text("status").notNull().default("pending"), // pending, processed, paid
  processedAt: timestamp("processed_at"),
  paidAt: timestamp("paid_at"),
  remarks: text("remarks"),
});

// Daily activity logs
export const activityLogs = pgTable("activity_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  date: timestamp("date").notNull(),
  activities: text("activities").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Notifications
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }),
  companyId: varchar("company_id").references(() => companies.id, { onDelete: 'cascade' }),
  type: text("type").notNull(), // info, success, warning, approval
  title: text("title").notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Leave Types - configurable leave categories
export const leaveTypes = pgTable("leave_types", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: 'cascade' }),
  name: text("name").notNull(), // Sick Leave, Casual Leave, Vacation, etc.
  code: text("code").notNull(), // SL, CL, VL, etc.
  maxDays: integer("max_days").notNull(), // annual entitlement
  carryForward: boolean("carry_forward").default(false).notNull(),
  isPaid: boolean("is_paid").default(true).notNull(),
  requiresApproval: boolean("requires_approval").default(true).notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Leave Balances - track available leave days per user
export const leaveBalances = pgTable("leave_balances", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  leaveTypeId: varchar("leave_type_id").notNull().references(() => leaveTypes.id, { onDelete: 'cascade' }),
  year: integer("year").notNull(),
  totalDays: decimal("total_days", { precision: 5, scale: 2 }).notNull(),
  usedDays: decimal("used_days", { precision: 5, scale: 2 }).default("0").notNull(),
  remainingDays: decimal("remaining_days", { precision: 5, scale: 2 }).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Attendance Breaks - track breaks during work hours
export const attendanceBreaks = pgTable("attendance_breaks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  attendanceId: varchar("attendance_id").notNull().references(() => attendance.id, { onDelete: 'cascade' }),
  breakStart: timestamp("break_start").notNull(),
  breakEnd: timestamp("break_end"),
  breakType: text("break_type").default("general"), // lunch, tea, general
  durationMinutes: integer("duration_minutes"),
});

// Salary Structures - define salary templates
export const salaryStructures = pgTable("salary_structures", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  description: text("description"),
  currency: text("currency").default("INR").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Salary Components - building blocks of salary (basic, HRA, DA, etc.)
export const salaryComponents = pgTable("salary_components", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  structureId: varchar("structure_id").notNull().references(() => salaryStructures.id, { onDelete: 'cascade' }),
  name: text("name").notNull(), // Basic, HRA, DA, PF, Tax
  type: text("type").notNull(), // earning, deduction
  calculationType: text("calculation_type").notNull(), // fixed, percentage
  value: decimal("value", { precision: 10, scale: 2 }).notNull(),
  isStatutory: boolean("is_statutory").default(false).notNull(), // PF, ESI, Tax
  displayOrder: integer("display_order").default(0).notNull(),
});

// Travel Requests - separate from expenses for better workflow
export const travelRequests = pgTable("travel_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  destination: text("destination").notNull(),
  purpose: text("purpose").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  estimatedCost: decimal("estimated_cost", { precision: 10, scale: 2 }),
  advanceAmount: decimal("advance_amount", { precision: 10, scale: 2 }).default("0"),
  status: text("status").notNull().default("pending"), // pending, approved, rejected, completed
  approvedBy: varchar("approved_by").references(() => users.id),
  remarks: text("remarks"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Expense Categories - master data for travel expenses
export const expenseCategories = pgTable("expense_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: 'cascade' }),
  name: text("name").notNull(), // Transport, Accommodation, Meals, etc.
  code: text("code").notNull(),
  maxLimit: decimal("max_limit", { precision: 10, scale: 2 }),
  requiresReceipt: boolean("requires_receipt").default(true).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
});

// Settings - company-wide configurations
export const settings = pgTable("settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: 'cascade' }).unique(),
  workingHoursPerDay: decimal("working_hours_per_day", { precision: 4, scale: 2 }).default("8").notNull(),
  workingDaysPerWeek: integer("working_days_per_week").default(5).notNull(),
  weekendDays: text("weekend_days").array().default(sql`ARRAY['Saturday', 'Sunday']`).notNull(),
  overtimeRate: decimal("overtime_rate", { precision: 5, scale: 2 }).default("1.5").notNull(),
  currency: text("currency").default("INR").notNull(),
  timezone: text("timezone").default("Asia/Kolkata").notNull(),
  dateFormat: text("date_format").default("DD/MM/YYYY").notNull(),
  fiscalYearStart: text("fiscal_year_start").default("04-01").notNull(), // MM-DD format
  enableBiometricAuth: boolean("enable_biometric_auth").default(false).notNull(),
  enableGeofencing: boolean("enable_geofencing").default(false).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Holidays - company holidays calendar
export const holidays = pgTable("holidays", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  date: timestamp("date").notNull(),
  type: text("type").default("public"), // public, optional, regional
  isOptional: boolean("is_optional").default(false).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Audit Logs - track all system changes for compliance
export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").references(() => users.id),
  action: text("action").notNull(), // CREATE, UPDATE, DELETE, LOGIN, LOGOUT
  entity: text("entity").notNull(), // users, attendance, leaves, salaries, etc.
  entityId: varchar("entity_id"),
  oldValues: text("old_values"), // JSON string
  newValues: text("new_values"), // JSON string
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

// Relations
export const companiesRelations = relations(companies, ({ many }) => ({
  users: many(users),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  company: one(companies, {
    fields: [users.companyId],
    references: [companies.id],
  }),
  department: one(departments, {
    fields: [users.departmentId],
    references: [departments.id],
  }),
  designation: one(designations, {
    fields: [users.designationId],
    references: [designations.id],
  }),
  manager: one(users, {
    fields: [users.managerId],
    references: [users.id],
    relationName: "manager",
  }),
  managedEmployees: many(users, {
    relationName: "manager",
  }),
  attendance: many(attendance),
  leaves: many(leaves),
  travelClaims: many(travelClaims),
  travelRequests: many(travelRequests),
  salaries: many(salaries),
  activityLogs: many(activityLogs),
  notifications: many(notifications),
  leaveBalances: many(leaveBalances),
}));

export const attendanceRelations = relations(attendance, ({ one, many }) => ({
  user: one(users, {
    fields: [attendance.userId],
    references: [users.id],
  }),
  breaks: many(attendanceBreaks),
}));

export const leavesRelations = relations(leaves, ({ one }) => ({
  user: one(users, {
    fields: [leaves.userId],
    references: [users.id],
  }),
  leaveType: one(leaveTypes, {
    fields: [leaves.leaveTypeId],
    references: [leaveTypes.id],
  }),
  approver: one(users, {
    fields: [leaves.approvedBy],
    references: [users.id],
  }),
}));

export const travelClaimsRelations = relations(travelClaims, ({ one }) => ({
  user: one(users, {
    fields: [travelClaims.userId],
    references: [users.id],
  }),
  travelRequest: one(travelRequests, {
    fields: [travelClaims.travelRequestId],
    references: [travelRequests.id],
  }),
  category: one(expenseCategories, {
    fields: [travelClaims.categoryId],
    references: [expenseCategories.id],
  }),
  approver: one(users, {
    fields: [travelClaims.approvedBy],
    references: [users.id],
  }),
}));

export const salariesRelations = relations(salaries, ({ one }) => ({
  user: one(users, {
    fields: [salaries.userId],
    references: [users.id],
  }),
  structure: one(salaryStructures, {
    fields: [salaries.structureId],
    references: [salaryStructures.id],
  }),
}));

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  user: one(users, {
    fields: [activityLogs.userId],
    references: [users.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
  company: one(companies, {
    fields: [notifications.companyId],
    references: [companies.id],
  }),
}));

export const departmentsRelations = relations(departments, ({ one, many }) => ({
  company: one(companies, {
    fields: [departments.companyId],
    references: [companies.id],
  }),
  manager: one(users, {
    fields: [departments.managerId],
    references: [users.id],
  }),
  users: many(users),
  designations: many(designations),
}));

export const designationsRelations = relations(designations, ({ one, many }) => ({
  company: one(companies, {
    fields: [designations.companyId],
    references: [companies.id],
  }),
  department: one(departments, {
    fields: [designations.departmentId],
    references: [departments.id],
  }),
  users: many(users),
}));

export const leaveTypesRelations = relations(leaveTypes, ({ one, many }) => ({
  company: one(companies, {
    fields: [leaveTypes.companyId],
    references: [companies.id],
  }),
  balances: many(leaveBalances),
}));

export const leaveBalancesRelations = relations(leaveBalances, ({ one }) => ({
  user: one(users, {
    fields: [leaveBalances.userId],
    references: [users.id],
  }),
  leaveType: one(leaveTypes, {
    fields: [leaveBalances.leaveTypeId],
    references: [leaveTypes.id],
  }),
}));

export const attendanceBreaksRelations = relations(attendanceBreaks, ({ one }) => ({
  attendance: one(attendance, {
    fields: [attendanceBreaks.attendanceId],
    references: [attendance.id],
  }),
}));

export const salaryStructuresRelations = relations(salaryStructures, ({ one, many }) => ({
  company: one(companies, {
    fields: [salaryStructures.companyId],
    references: [companies.id],
  }),
  components: many(salaryComponents),
  salaries: many(salaries),
}));

export const salaryComponentsRelations = relations(salaryComponents, ({ one }) => ({
  structure: one(salaryStructures, {
    fields: [salaryComponents.structureId],
    references: [salaryStructures.id],
  }),
}));

export const travelRequestsRelations = relations(travelRequests, ({ one, many }) => ({
  user: one(users, {
    fields: [travelRequests.userId],
    references: [users.id],
  }),
  approver: one(users, {
    fields: [travelRequests.approvedBy],
    references: [users.id],
  }),
  claims: many(travelClaims),
}));

export const expenseCategoriesRelations = relations(expenseCategories, ({ one, many }) => ({
  company: one(companies, {
    fields: [expenseCategories.companyId],
    references: [companies.id],
  }),
  claims: many(travelClaims),
}));

export const settingsRelations = relations(settings, ({ one }) => ({
  company: one(companies, {
    fields: [settings.companyId],
    references: [companies.id],
  }),
}));

export const holidaysRelations = relations(holidays, ({ one }) => ({
  company: one(companies, {
    fields: [holidays.companyId],
    references: [companies.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  company: one(companies, {
    fields: [auditLogs.companyId],
    references: [companies.id],
  }),
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertCompanySchema = createInsertSchema(companies).omit({
  id: true,
  createdAt: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  companyId: true, // Set server-side from session
  joinDate: true,
  // Don't omit isActive - let it default to true from schema
});

export const insertAttendanceSchema = createInsertSchema(attendance).omit({
  id: true,
});

export const insertLeaveSchema = createInsertSchema(leaves).omit({
  id: true,
  appliedAt: true,
  status: true,
  approvedBy: true,
  remarks: true,
});

export const insertTravelClaimSchema = createInsertSchema(travelClaims).omit({
  id: true,
  submittedAt: true,
  status: true,
  approvedBy: true,
  remarks: true,
});

export const insertSalarySchema = createInsertSchema(salaries).omit({
  id: true,
  processedAt: true,
});

export const insertActivityLogSchema = createInsertSchema(activityLogs).omit({
  id: true,
  createdAt: true,
}).extend({
  date: z.coerce.date(), // Accept ISO string and convert to Date
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
  isRead: true,
});

export const insertDepartmentSchema = createInsertSchema(departments).omit({
  id: true,
  createdAt: true,
});

export const insertDesignationSchema = createInsertSchema(designations).omit({
  id: true,
  createdAt: true,
});

export const insertLeaveTypeSchema = createInsertSchema(leaveTypes).omit({
  id: true,
  createdAt: true,
});

export const insertLeaveBalanceSchema = createInsertSchema(leaveBalances).omit({
  id: true,
  updatedAt: true,
});

export const insertAttendanceBreakSchema = createInsertSchema(attendanceBreaks).omit({
  id: true,
});

export const insertSalaryStructureSchema = createInsertSchema(salaryStructures).omit({
  id: true,
  createdAt: true,
});

export const insertSalaryComponentSchema = createInsertSchema(salaryComponents).omit({
  id: true,
});

// Base schema for travel requests
const baseTravelRequestSchema = createInsertSchema(travelRequests).omit({
  id: true,
  userId: true, // Set server-side from session
  createdAt: true,
  status: true,
  approvedBy: true,
  remarks: true,
});

// API schema accepts ISO date strings, coerces and validates them as proper dates
export const insertTravelRequestSchema = baseTravelRequestSchema.extend({
  startDate: z.coerce.date({
    required_error: "Start date is required",
    invalid_type_error: "Start date must be a valid date",
  }),
  endDate: z.coerce.date({
    required_error: "End date is required",
    invalid_type_error: "End date must be a valid date",
  }),
  estimatedCost: z.string().optional(),
  advanceAmount: z.string().optional(),
});

export const insertExpenseCategorySchema = createInsertSchema(expenseCategories).omit({
  id: true,
});

export const insertSettingsSchema = createInsertSchema(settings).omit({
  id: true,
  updatedAt: true,
});

export const insertHolidaySchema = createInsertSchema(holidays).omit({
  id: true,
  createdAt: true,
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  timestamp: true,
});

// Types
export type Company = typeof companies.$inferSelect;
export type InsertCompany = z.infer<typeof insertCompanySchema>;

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Attendance = typeof attendance.$inferSelect;
export type InsertAttendance = z.infer<typeof insertAttendanceSchema>;

export type Leave = typeof leaves.$inferSelect;
export type InsertLeave = z.infer<typeof insertLeaveSchema>;

export type TravelClaim = typeof travelClaims.$inferSelect;
export type InsertTravelClaim = z.infer<typeof insertTravelClaimSchema>;

export type Salary = typeof salaries.$inferSelect;
export type InsertSalary = z.infer<typeof insertSalarySchema>;

export type ActivityLog = typeof activityLogs.$inferSelect;
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

export type Department = typeof departments.$inferSelect;
export type InsertDepartment = z.infer<typeof insertDepartmentSchema>;

export type Designation = typeof designations.$inferSelect;
export type InsertDesignation = z.infer<typeof insertDesignationSchema>;

export type LeaveType = typeof leaveTypes.$inferSelect;
export type InsertLeaveType = z.infer<typeof insertLeaveTypeSchema>;

export type LeaveBalance = typeof leaveBalances.$inferSelect;
export type InsertLeaveBalance = z.infer<typeof insertLeaveBalanceSchema>;

export type AttendanceBreak = typeof attendanceBreaks.$inferSelect;
export type InsertAttendanceBreak = z.infer<typeof insertAttendanceBreakSchema>;

export type SalaryStructure = typeof salaryStructures.$inferSelect;
export type InsertSalaryStructure = z.infer<typeof insertSalaryStructureSchema>;

export type SalaryComponent = typeof salaryComponents.$inferSelect;
export type InsertSalaryComponent = z.infer<typeof insertSalaryComponentSchema>;

export type TravelRequest = typeof travelRequests.$inferSelect;
export type InsertTravelRequest = z.infer<typeof insertTravelRequestSchema>;

export type ExpenseCategory = typeof expenseCategories.$inferSelect;
export type InsertExpenseCategory = z.infer<typeof insertExpenseCategorySchema>;

export type Settings = typeof settings.$inferSelect;
export type InsertSettings = z.infer<typeof insertSettingsSchema>;

export type Holiday = typeof holidays.$inferSelect;
export type InsertHoliday = z.infer<typeof insertHolidaySchema>;

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
