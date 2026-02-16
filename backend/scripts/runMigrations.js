require('dotenv').config();
const { execSync } = require('child_process');

console.log('Starting database migrations...');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');
console.log('NODE_ENV:', process.env.NODE_ENV || 'not set');

try {
  // Set NODE_ENV to production if not already set
  process.env.NODE_ENV = process.env.NODE_ENV || 'production';
  
  // Run migrations
  execSync('npx sequelize-cli db:migrate', {
    stdio: 'inherit',
    env: process.env
  });
  
  console.log('✓ Migrations completed successfully');
} catch (error) {
  console.error('✗ Migration failed:', error.message);
  process.exit(1);
}
