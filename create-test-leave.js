import { storage } from './server/storage';
import { db } from './server/db';
import { users, leaveTypes } from './shared/schema';
import { eq } from 'drizzle-orm';

async function createTestLeaveRequest() {
  try {
    console.log('Creating test leave request...');
    
    // Get the first company
    const companies = await db.select().from(require('./shared/schema').companies);
    if (companies.length === 0) {
      console.log('❌ No companies found. Please create a company first.');
      return;
    }
    
    const company = companies[0];
    console.log(`Using company: ${company.name}`);
    
    // Get the first employee (non-admin user)
    const allUsers = await db.select().from(users).where(eq(users.companyId, company.id));
    const employee = allUsers.find(u => u.role !== 'admin');
    
    if (!employee) {
      console.log('❌ No employees found. Please create an employee first.');
      return;
    }
    
    console.log(`Using employee: ${employee.fullName} (${employee.email})`);
    
    // Get the first leave type
    const companyLeaveTypes = await db.select().from(leaveTypes).where(eq(leaveTypes.companyId, company.id));
    if (companyLeaveTypes.length === 0) {
      console.log('❌ No leave types found. Please create leave types first.');
      return;
    }
    
    const leaveType = companyLeaveTypes[0];
    console.log(`Using leave type: ${leaveType.name}`);
    
    // Create a test leave request
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 7); // 1 week from now
    
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 2); // 3 days total
    
    const testLeave = await storage.createLeave({
      userId: employee.id,
      leaveTypeId: leaveType.id,
      leaveType: leaveType.code,
      startDate: startDate,
      endDate: endDate,
      totalDays: 3,
      reason: 'Test leave request for debugging Leave Approvals section',
    });
    
    console.log('✅ Test leave request created successfully!');
    console.log('Leave details:', {
      id: testLeave.id,
      employee: employee.fullName,
      leaveType: leaveType.name,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      days: 3,
      reason: 'Test leave request for debugging Leave Approvals section',
      status: 'pending'
    });
    
    console.log('💡 Now check the Admin Dashboard - Leave Approvals section should show this pending request.');
    
  } catch (error) {
    console.error('❌ Error creating test leave request:', error);
  }
}

createTestLeaveRequest();
