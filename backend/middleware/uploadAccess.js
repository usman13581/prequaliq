const jwt = require('jsonwebtoken');
const db = require('../models');
const { getJwtSecret } = require('../utils/jwt');
const { canAccessDocument, findDocumentByFileName, SAFE_FILE_NAME } = require('../utils/documentAccess');

/**
 * Gate static /uploads (rule 01: uploads stay under controlled access).
 * A valid login is not enough: the file must belong to something the user may see.
 * - profile pictures: any signed-in user
 * - documents: the same rule as GET /api/documents/:id/download
 * - contract and complement files: only through their own download endpoints
 */
async function requireUploadAccess(req, res, next) {
  const header = req.header('Authorization')?.replace(/^Bearer\s+/i, '');
  const token = header || req.query.token;
  if (!token || typeof token !== 'string') {
    return res.status(401).json({ message: 'Authentication required to access uploads' });
  }
  let decoded;
  try {
    decoded = jwt.verify(token, getJwtSecret());
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
  try {
    const user = await db.User.findByPk(decoded.userId, { attributes: ['id', 'role', 'isActive'] });
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'User not found or inactive' });
    }
    let fileName;
    try {
      fileName = decodeURIComponent(req.path.replace(/^\/+/, ''));
    } catch {
      return res.status(400).json({ message: 'Bad file name' });
    }
    // Only files directly in the uploads folder are served here.
    if (!SAFE_FILE_NAME.test(fileName)) {
      return res.status(404).json({ message: 'File not found' });
    }
    if (fileName.startsWith('profilePicture-')) {
      const owner = await db.User.count({ where: { profilePicture: fileName } });
      return owner > 0 ? next() : res.status(404).json({ message: 'File not found' });
    }
    const doc = await findDocumentByFileName(fileName);
    if (!doc || !(await canAccessDocument(user, doc))) {
      return res.status(404).json({ message: 'File not found' });
    }
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, no-store');
    return next();
  } catch (error) {
    console.error('Upload access error:', error.message);
    return res.status(500).json({ message: 'Error checking file access' });
  }
}

module.exports = { requireUploadAccess };
