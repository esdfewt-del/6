import { db } from '../server/db';
import { companies, users } from '../shared/schema';
import bcrypt from 'bcryptjs';

async function createNanoFlowsAdmin() {
  try {
    // Create the company
    const [company] = await db.insert(companies).values({
      name: 'Nano Flows AI Software Technologies',
      email: 'nanoflowsvizag@gmail.com',
    }).returning();

    console.log('Company created:', company);

    // Create admin user
    const hashedPassword = await bcrypt.hash('Kiran@1234#', 10);
    
    const [user] = await db.insert(users).values({
      companyId: company.id,
      email: 'nanoflowsvizag@gmail.com',
      password: hashedPassword,
      fullName: 'Nano Flows Admin',
      role: 'admin',
      department: 'Management',
      position: 'Company Admin',
      phone: '+91 80193 58855',
    }).returning();

    console.log('Admin user created:', { ...user, password: '[HIDDEN]' });
    console.log('\nLogin credentials:');
    console.log('Email: nanoflowsvizag@gmail.com');
    console.log('Password: Kiran@1234#');
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin:', error);
    process.exit(1);
  }
}

createNanoFlowsAdmin();
