require('dotenv').config();
const db = require('../models');
const { hashPassword } = require('../utils/password');

async function updateAdminPassword() {
  try {
    const email = process.argv[2] || 'admin@prequaliq.com';
    const newPassword = process.argv[3];

    if (!newPassword) {
      console.error('Error: New password is required.');
      console.log('Usage: node scripts/updateAdminPassword.js <email> <newPassword>');
      process.exit(1);
    }

    // Find the admin user
    const admin = await db.User.findOne({ where: { email } });
    if (!admin) {
      console.error(`Error: User with email "${email}" not found.`);
      process.exit(1);
    }

    // Hash the new password
    const hashedPassword = await hashPassword(newPassword);

    // Update the password
    await admin.update({ password: hashedPassword });

    console.log('✓ Admin password updated successfully!');
    console.log('Email:', email);
    console.log('New password:', newPassword);
    console.log('\nPlease log in with the new password.');

    await db.sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('Error updating admin password:', error);
    await db.sequelize.close();
    process.exit(1);
  }
}

updateAdminPassword();
