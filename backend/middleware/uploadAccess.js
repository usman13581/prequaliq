const jwt = require('jsonwebtoken');
const { getJwtSecret } = require('../utils/jwt');

/**
 * Gate static /uploads — require valid JWT via Authorization header or ?token=
 * (rule 01: uploads stay under controlled access).
 */
function requireUploadAccess(req, res, next) {
  const header = req.header('Authorization')?.replace(/^Bearer\s+/i, '');
  const token = header || req.query.token;
  if (!token || typeof token !== 'string') {
    return res.status(401).json({ message: 'Authentication required to access uploads' });
  }
  try {
    jwt.verify(token, getJwtSecret());
    return next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

module.exports = { requireUploadAccess };
