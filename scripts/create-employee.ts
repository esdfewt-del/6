import { db } from '../server/db';
import { companies, users } from '../shared/schema';
import bcrypt from 'bcryptjs';

async function createEmployee() {
  try {
    // Get the existing company
    const [company] = await db.select().from(companies).limit(1);
    
    if (!company) {
      console.error('No company found. Please run create-admin.ts first.');
      process.exit(1);
    }

    console.log('Using company:', company.name);

    // Create employee user
    const hashedPassword = await bcrypt.hash('Employee@123', 10);
    
    const [user] = await db.insert(users).values({
      companyId: company.id,
      email: 'employee@nanoflows.com',
      password: hashedPassword,
      fullName: 'John Doe',
      role: 'employee',
      department: 'Development',
      position: 'Software Engineer',
      phone: '+91 98765 43210',
    }).returning();

    console.log('Employee user created:', { ...user, password: '[HIDDEN]' });
    console.log('\nEmployee Login credentials:');
    console.log('Email: employee@nanoflows.com');
    console.log('Password: Employee@123');
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating employee:', error);
    process.exit(1);
  }
}

createEmployee();
