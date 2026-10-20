const db = require('../models');
const { Op } = require('sequelize');

/**
 * Create an in-app notification for any user (admin / buyer / supplier).
 */
async function createForUser(userId, { type, title, message, linkTab = null, linkPath = null, meta = null, id = null }) {
  if (!db.UserNotification || !userId) return null;
  const payload = {
    userId,
    type,
    title,
    message,
    linkTab,
    linkPath,
    meta,
    isRead: false
  };
  if (id) payload.id = id;
  return db.UserNotification.create(payload);
}

async function notifyAdmins({ type, title, message, linkTab = 'suppliers', meta = null }) {
  if (!db.User || !db.UserNotification) return [];
  const admins = await db.User.findAll({
    where: { role: 'admin', isActive: true },
    attributes: ['id']
  });
  const created = [];
  for (const admin of admins) {
    const n = await createForUser(admin.id, { type, title, message, linkTab, meta });
    if (n) created.push(n);
  }
  return created;
}

async function listForUser(userId, { search = '', page = 1, pageSize = 10, unreadOnly = false } = {}) {
  if (!db.UserNotification) {
    return { notifications: [], total: 0, page: 1, pageSize, unreadCount: 0 };
  }

  const where = { userId };
  if (unreadOnly) where.isRead = false;
  const q = (search || '').trim();
  if (q) {
    where[Op.or] = [
      { title: { [Op.iLike]: `%${q}%` } },
      { message: { [Op.iLike]: `%${q}%` } },
      { type: { [Op.iLike]: `%${q}%` } }
    ];
  }

  const limit = Math.min(Math.max(Number(pageSize) || 10, 1), 100);
  const currentPage = Math.max(Number(page) || 1, 1);
  const offset = (currentPage - 1) * limit;

  const [rows, total, unreadCount] = await Promise.all([
    db.UserNotification.findAll({
      where,
      order: [['createdAt', 'DESC']],
      limit,
      offset
    }),
    db.UserNotification.count({ where }),
    db.UserNotification.count({ where: { userId, isRead: false } })
  ]);

  return {
    notifications: rows,
    total,
    page: currentPage,
    pageSize: limit,
    unreadCount
  };
}

/** Prefetch for top-bar dropdown (newest first, capped). */
async function previewForUser(userId, limit = 10) {
  if (!db.UserNotification) {
    return { notifications: [], unreadCount: 0 };
  }
  const [notifications, unreadCount] = await Promise.all([
    db.UserNotification.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
      limit: Math.min(Math.max(Number(limit) || 10, 1), 10)
    }),
    db.UserNotification.count({ where: { userId, isRead: false } })
  ]);
  return { notifications, unreadCount };
}

async function markRead(userId, notificationId) {
  if (!db.UserNotification) return null;
  const notification = await db.UserNotification.findOne({
    where: { id: notificationId, userId }
  });
  if (!notification) return null;
  await notification.update({ isRead: true });

  // Keep legacy supplier_notifications in sync when ids match
  if (db.SupplierNotification) {
    await db.SupplierNotification.update(
      { isRead: true },
      { where: { id: notificationId } }
    ).catch(() => {});
  }
  return notification;
}

async function markAllRead(userId) {
  if (!db.UserNotification) return 0;
  const [count] = await db.UserNotification.update(
    { isRead: true },
    { where: { userId, isRead: false } }
  );

  if (db.SupplierNotification && db.Supplier) {
    const supplier = await db.Supplier.findOne({ where: { userId }, attributes: ['id'] });
    if (supplier) {
      await db.SupplierNotification.update(
        { isRead: true },
        { where: { supplierId: supplier.id, isRead: false } }
      ).catch(() => {});
    }
  }
  return count;
}

module.exports = {
  createForUser,
  notifyAdmins,
  listForUser,
  previewForUser,
  markRead,
  markAllRead
};
