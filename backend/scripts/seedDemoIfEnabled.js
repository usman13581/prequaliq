/**
 * Optionally reset + reload demo/E2E test data on backend start.
 * Enable with: SEED_DEMO_DATA=1 (or true)
 *
 * Runs seedRichDemoData in a child process so process.exit there does not
 * stop the rest of `npm start`.
 *
 * WARNING: Destructive — removes prior demo/@prequaliq.demo/*.e2e buyers & suppliers
 * and related transactional data, then reseeds. Keeps admin + CPV/NUTS.
 */
const { spawnSync } = require('child_process');
const path = require('path');

const flag = String(process.env.SEED_DEMO_DATA || '').trim().toLowerCase();
const wantSeed = flag === '1' || flag === 'true' || flag === 'yes';
const isProd = String(process.env.NODE_ENV || '').toLowerCase() === 'production';
const confirmed = ['YES', '1', 'TRUE'].includes(String(process.env.CONFIRM_PROD_SEED || '').trim().toUpperCase());

if (wantSeed) {
  if (isProd && !confirmed) {
    console.error(
      '[seedDemoIfEnabled] Refusing production wipe: set CONFIRM_PROD_SEED=YES together with SEED_DEMO_DATA=1'
    );
    process.exit(1);
  }
  console.log('[seedDemoIfEnabled] SEED_DEMO_DATA enabled — running seedRichDemoData…');
  const result = spawnSync(process.execPath, [path.join(__dirname, 'seedRichDemoData.js')], {
    stdio: 'inherit',
    env: { ...process.env, CONFIRM_PROD_SEED: process.env.CONFIRM_PROD_SEED || 'YES' },
    cwd: path.join(__dirname, '..')
  });
  if (result.status !== 0) {
    console.error('[seedDemoIfEnabled] Demo seed failed with status', result.status);
    process.exit(result.status || 1);
  }
  console.log('[seedDemoIfEnabled] Demo seed finished.');
  process.exit(0);
}

console.log(
  '[seedDemoIfEnabled] Skipping demo seed (set SEED_DEMO_DATA=1' +
    (isProd ? ' and CONFIRM_PROD_SEED=YES' : '') +
    ' to wipe & reload test data).'
);
process.exit(0);
