const jwt = require('jsonwebtoken');
const { WEAK_JWT_SECRETS, isProduction } = require('./securityConfig');

function getJwtSecret() {
  const secret = (process.env.JWT_SECRET || '').trim();
  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }
  if (isProduction() && (WEAK_JWT_SECRETS.has(secret) || secret.length < 32)) {
    throw new Error('JWT_SECRET is too weak for production');
  }
  return secret;
}

const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    getJwtSecret(),
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

module.exports = { generateToken, getJwtSecret };
