const validator = require('validator');

/**
 * Accept real emails plus local E2E / test domains (e.g. *.e2e)
 * that validator.js rejects (unknown TLD list).
 */
function isAllowedEmail(value) {
  if (!value || typeof value !== 'string') return false;
  const email = value.trim();
  if (validator.isEmail(email)) return true;
  // Structure OK but TLD not in validator allow-list (e.g. .e2e)
  return (
    validator.isEmail(email, { require_tld: false }) &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  );
}

module.exports = { isAllowedEmail };
