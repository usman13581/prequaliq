/**
 * Production / staging: wipe portal demo data and reload a full test dataset.
 *
 * NOT a schema migration — safe to re-run; keeps admin + CPV/NUTS catalogs.
 * Destructive for buyers/suppliers/procedures/contracts/notifications/etc.
 *
 * Railway (recommended):
 *   1. Backend Variables → set CONFIRM_PROD_SEED=YES and SEED_DEMO_DATA=1
 *   2. Redeploy once (start script runs seedDemoIfEnabled)
 *   3. Remove both flags after seed completes
 *
 * Or one-off from a machine with the public DB URL:
 *   cd backend
 *   CONFIRM_PROD_SEED=YES NODE_ENV=production DATABASE_URL='postgresql://…' npm run seed-prod-demo
 */
require('dotenv').config();
require('dotenv').config({ path: require('path').join(__dirname, '../.env.prod') });

const confirm = String(process.env.CONFIRM_PROD_SEED || '').trim().toUpperCase();
if (confirm !== 'YES' && confirm !== '1' && confirm !== 'TRUE') {
  console.error(`
Refusing to wipe/seed without confirmation.

Set CONFIRM_PROD_SEED=YES (or 1/true), then re-run:
  npm run seed-prod-demo

This deletes all procuring_entity/supplier users and related transactional data,
then reloads ~22 buyers, ~12+ suppliers, procedures, contracts, E2E AI kit accounts.
Admin (admin@prequaliq.com) and CPV/NUTS catalogs are kept.
`);
  process.exit(1);
}

process.env.NODE_ENV = process.env.NODE_ENV || 'production';
console.log('[seed-prod-demo] NODE_ENV=', process.env.NODE_ENV);
console.log('[seed-prod-demo] DATABASE_URL=', process.env.DATABASE_URL ? 'Set' : 'Not set');
console.log('[seed-prod-demo] Starting destructive wipe + rich demo seed…');

require('./seedRichDemoData');
