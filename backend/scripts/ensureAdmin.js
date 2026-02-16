require('dotenv').config();
const db = require('../models');
const { hashPassword } = require('../utils/password');

async function ensureAdmin() {
  try {
    const email = 'admin@prequaliq.com';
    const password = 'Admin123!';
    const firstName = 'Admin';
    const lastName = 'User';

    // Check if admin already exists
    const existingUser = await db.User.findOne({ where: { email } });
    if (existingUser) {
      console.log('✓ Admin user already exists');
      await db.sequelize.close();
      return;
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

    console.log('✓ Admin user created successfully!');
    console.log('Email:', email);
    console.log('Password:', password);

    await db.sequelize.close();
  } catch (error) {
    console.error('Error ensuring admin user:', error.message);
    await db.sequelize.close();
    // Don't exit with error - let server start anyway
  }
}

ensureAdmin();
