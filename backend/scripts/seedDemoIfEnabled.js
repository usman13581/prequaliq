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
if (flag === '1' || flag === 'true' || flag === 'yes') {
  console.log('[seedDemoIfEnabled] SEED_DEMO_DATA enabled — running seedRichDemoData…');
  const result = spawnSync(process.execPath, [path.join(__dirname, 'seedRichDemoData.js')], {
    stdio: 'inherit',
    env: process.env,
    cwd: path.join(__dirname, '..')
  });
  if (result.status !== 0) {
    console.error('[seedDemoIfEnabled] Demo seed failed with status', result.status);
    process.exit(result.status || 1);
  }
  console.log('[seedDemoIfEnabled] Demo seed finished.');
  process.exit(0);
}

console.log('[seedDemoIfEnabled] Skipping demo seed (set SEED_DEMO_DATA=1 to wipe & reload test data).');
process.exit(0);
