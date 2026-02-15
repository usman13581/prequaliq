require('dotenv').config();
const db = require('../models');
const { hashPassword } = require('../utils/password');

async function createAdmin() {
  try {
    const email = process.argv[2] || 'admin@prequaliq.com';
    const password = process.argv[3] || 'admin123';
    const firstName = process.argv[4] || 'Admin';
    const lastName = process.argv[5] || 'User';

    // Check if admin already exists
    const existingUser = await db.User.findOne({ where: { email } });
    if (existingUser) {
      console.log('Admin user already exists with this email.');
      process.exit(1);
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create admin user
    const admin = await db.User.create({
      email,
      password: hashedPassword,
      firstName,
      lastName,
      role: 'admin',
      isActive: true
    });

    console.log('Admin user created successfully!');
    console.log('Email:', email);
    console.log('Password:', password);
    console.log('User ID:', admin.id);
    console.log('\nPlease change the password after first login.');

    await db.sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin user:', error);
    await db.sequelize.close();
    process.exit(1);
  }
}

createAdmin();
