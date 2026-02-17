/**
 * Seed NUTS codes (Swedish regions) on production.
 * Idempotent: safe to run multiple times.
 * Run after migrations so nuts_codes table exists.
 */
require('dotenv').config();
const { execSync } = require('child_process');
const path = require('path');

console.log('[Seed NUTS] Starting NUTS codes seed...');
console.log('NODE_ENV:', process.env.NODE_ENV || 'not set');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');

try {
  process.env.NODE_ENV = process.env.NODE_ENV || 'production';
  const seedName = '20240216000001-seed-nuts-codes.js';
  execSync(`npx sequelize-cli db:seed --seed ${seedName}`, {
    stdio: 'inherit',
    env: process.env,
    cwd: path.join(__dirname, '..')
  });
  console.log('[Seed NUTS] ✓ NUTS codes seed completed');
} catch (err) {
  // Don't fail deploy if table doesn't exist yet or already seeded
  console.warn('[Seed NUTS] Seed failed or already applied:', err.message || err);
  console.log('[Seed NUTS] Continuing (non-fatal)...');
}
