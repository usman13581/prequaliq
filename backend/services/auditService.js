const db = require('../models');

async function logAudit({ actorUserId, action, entityType, entityId, meta }) {
  try {
    if (!db.AuditEvent) return null;
    return await db.AuditEvent.create({
      actorUserId: actorUserId || null,
      action,
      entityType,
      entityId: entityId || null,
      meta: meta || null
    });
  } catch (err) {
    console.warn('Audit log failed:', err.message);
    return null;
  }
}

module.exports = { logAudit };
