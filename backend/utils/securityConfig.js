/**
 * Production security guards (rule 01).
 * Call assertSecurityConfig() once at process start before listening.
 */

const WEAK_JWT_SECRETS = new Set([
  '',
  'your_super_secret_jwt_key_change_this_in_production',
  'secret',
  'jwt_secret',
  'changeme',
  'local_dev_jwt_secret_change_me'
]);

function isProduction() {
  return process.env.NODE_ENV === 'production';
}

function assertSecurityConfig() {
  const secret = (process.env.JWT_SECRET || '').trim();

  if (!secret) {
    if (isProduction()) {
      console.error('[security] JWT_SECRET is required in production');
      process.exit(1);
    }
    console.warn('[security] JWT_SECRET is not set — auth will fail until configured');
    return;
  }

  if (isProduction() && (WEAK_JWT_SECRETS.has(secret) || secret.length < 32)) {
    console.error(
      '[security] JWT_SECRET is missing, too short (<32), or a known placeholder. Refusing to start in production.'
    );
    process.exit(1);
  }
}

function resolveCorsOrigin() {
  const configured = (process.env.FRONTEND_URL || '').trim();
  if (isProduction()) {
    if (!configured) {
      console.error('[security] FRONTEND_URL is required in production for CORS');
      process.exit(1);
    }
    return configured;
  }
  return configured || 'http://localhost:5173';
}

module.exports = {
  isProduction,
  assertSecurityConfig,
  resolveCorsOrigin,
  WEAK_JWT_SECRETS
};
