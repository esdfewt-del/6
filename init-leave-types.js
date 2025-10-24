// Simple script to initialize leave types
import { storage } from './server/storage.js';
import { db } from './server/db.js';
import { companies, leaveTypes } from './shared/schema.js';
import { eq } from 'drizzle-orm';

async function initializeLeaveTypes() {
  console.log('Initializing leave types...');

  try {
    // Get all companies
    const allCompanies = await db.select().from(companies);
    console.log(`Found ${allCompanies.length} companies`);
    
    for (const company of allCompanies) {
      console.log(`Processing company: ${company.name} (${company.id})`);
      
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
        
        console.log(`Created ${defaultLeaveTypes.length} leave types for ${company.name}`);
      } else {
        console.log(`${company.name} already has ${existingLeaveTypes.length} leave types`);
      }
    }

    console.log('Leave types initialization completed successfully!');
  } catch (error) {
    console.error('Error initializing leave types:', error);
  }
}

// Run the initialization
initializeLeaveTypes().then(() => {
  console.log('Script completed');
  process.exit(0);
}).catch((error) => {
  console.error('Script failed:', error);
  process.exit(1);
});
