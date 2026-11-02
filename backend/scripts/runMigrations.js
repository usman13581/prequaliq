require('dotenv').config();
const { execSync } = require('child_process');

console.log('Starting database migrations...');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');
console.log('NODE_ENV:', process.env.NODE_ENV || 'not set');
// Safe debug: host/user only (never password) — helps catch stale DB_* overrides
try {
  if (process.env.DATABASE_URL) {
    const u = new URL(process.env.DATABASE_URL);
    console.log('DB target:', `${u.username}@${u.hostname}:${u.port || 5432}/${(u.pathname || '').replace(/^\//, '')}`);
  } else {
    console.log('DB target:', `${process.env.DB_USER || '?'}@${process.env.DB_HOST || '?'}/${process.env.DB_NAME || '?'}`);
  }
} catch (_e) {
  console.log('DB target: (unparseable DATABASE_URL)');
}

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
