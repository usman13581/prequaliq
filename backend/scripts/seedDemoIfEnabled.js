/**
 * Optionally reset + reload demo/E2E test data on backend start.
 *
 * Enable:
 *   SEED_DEMO_DATA=1          (+ CONFIRM_PROD_SEED=YES in production)
 *   SEED_DEMO_DATA=wipe       (production one-shot: enable + confirm in one var)
 *
 * Runs seedRichDemoData in a child process so process.exit there does not
 * stop the rest of `npm start`.
 *
 * WARNING: Destructive — removes prior demo/@prequaliq.demo/*.e2e buyers & suppliers
 * and related transactional data, then reseeds. Keeps admin + CPV/NUTS.
 */
const { spawnSync } = require('child_process');
const path = require('path');

const rawSeed = String(process.env.SEED_DEMO_DATA || '').trim();
const rawConfirm = String(process.env.CONFIRM_PROD_SEED || '').trim();
const flag = rawSeed.toLowerCase();
const confirmUp = rawConfirm.toUpperCase();

// wipe = single-var production confirm (easier on Railway)
const wantSeed = flag === '1' || flag === 'true' || flag === 'yes' || flag === 'wipe';
const isProd = String(process.env.NODE_ENV || '').toLowerCase() === 'production';
const confirmed =
  flag === 'wipe' ||
  confirmUp === 'YES' ||
  confirmUp === '1' ||
  confirmUp === 'TRUE';

if (wantSeed) {
  if (isProd && !confirmed) {
    console.error('[seedDemoIfEnabled] Refusing production wipe.');
    console.error(
      `[seedDemoIfEnabled] Saw SEED_DEMO_DATA=${JSON.stringify(rawSeed || '(empty)')} CONFIRM_PROD_SEED=${JSON.stringify(rawConfirm || '(empty)')}`
    );
    console.error(
      '[seedDemoIfEnabled] On backend service Variables set EITHER:\n' +
        '  A) SEED_DEMO_DATA=wipe\n' +
        '  B) SEED_DEMO_DATA=1  AND  CONFIRM_PROD_SEED=YES\n' +
        'Then redeploy. Remove the flag(s) after Demo seed complete.'
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
  '[seedDemoIfEnabled] Skipping demo seed. To wipe & reload on production set SEED_DEMO_DATA=wipe (then remove after seed).'
);
process.exit(0);
