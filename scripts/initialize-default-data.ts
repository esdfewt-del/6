import { storage } from '../server/storage';
import { db } from '../server/db';
import { companies, leaveTypes, expenseCategories } from '../shared/schema';
import { eq } from 'drizzle-orm';

async function initializeDefaultData() {
  console.log('Initializing default data...');

  try {
    // Get all companies
    const allCompanies = await db.select().from(companies);
    
    for (const company of allCompanies) {
      console.log(`Initializing data for company: ${company.name}`);
      
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

      // Check if company already has expense categories
      const existingExpenseCategories = await db.select().from(expenseCategories).where(eq(expenseCategories.companyId, company.id));
      
      if (existingExpenseCategories.length === 0) {
        console.log(`Creating default expense categories for ${company.name}`);
        
        // Create default expense categories
        const defaultExpenseCategories = [
          {
            companyId: company.id,
            name: 'Transportation',
            code: 'TRANS',
            maxLimit: 5000.00,
            requiresReceipt: true,
            isActive: true,
          },
          {
            companyId: company.id,
            name: 'Accommodation',
            code: 'ACCOM',
            maxLimit: 10000.00,
            requiresReceipt: true,
            isActive: true,
          },
          {
            companyId: company.id,
            name: 'Meals',
            code: 'MEALS',
            maxLimit: 2000.00,
            requiresReceipt: true,
            isActive: true,
          },
          {
            companyId: company.id,
            name: 'Communication',
            code: 'COMM',
            maxLimit: 1000.00,
            requiresReceipt: true,
            isActive: true,
          },
          {
            companyId: company.id,
            name: 'Other Expenses',
            code: 'OTHER',
            maxLimit: 3000.00,
            requiresReceipt: true,
            isActive: true,
          },
        ];

        for (const category of defaultExpenseCategories) {
          await storage.createExpenseCategory(category);
        }
        
        console.log(`Created ${defaultExpenseCategories.length} expense categories for ${company.name}`);
      } else {
        console.log(`${company.name} already has ${existingExpenseCategories.length} expense categories`);
      }
    }

    console.log('Default data initialization completed successfully!');
  } catch (error) {
    console.error('Error initializing default data:', error);
  }
}

// Run the initialization
initializeDefaultData().then(() => {
  console.log('Script completed');
  process.exit(0);
}).catch((error) => {
  console.error('Script failed:', error);
  process.exit(1);
});
