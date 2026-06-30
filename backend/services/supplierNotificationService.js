const db = require('../models');

async function createNotification(supplierId, { type, title, message, linkTab = null }) {
  if (!db.SupplierNotification) return null;
  return db.SupplierNotification.create({
    supplierId,
    type,
    title,
    message,
    linkTab,
    isRead: false
  });
}

async function notifyProfileApproved(supplier) {
  return createNotification(supplier.id, {
    type: 'profile_approved',
    title: 'Qualification approved',
    message: 'Your supplier qualification has been approved.',
    linkTab: 'overview'
  });
}

async function notifyProfileRejected(supplier, reason) {
  return createNotification(supplier.id, {
    type: 'profile_rejected',
    title: 'Qualification rejected',
    message: reason || 'Your qualification was rejected. Please review and resubmit.',
    linkTab: 'profile'
  });
}

async function notifyRequalificationRequired(supplier, expiresAt) {
  return createNotification(supplier.id, {
    type: 'requalification_required',
    title: 'Annual re-qualification required',
    message: `Please update your profile before ${expiresAt ? new Date(expiresAt).toLocaleDateString() : 'the due date'}.`,
    linkTab: 'profile'
  });
}

async function notifyDocumentExpiring(supplier, count) {
  return createNotification(supplier.id, {
    type: 'document_expiring',
    title: 'Documents expiring soon',
    message: `${count} document(s) will expire within 30 days.`,
    linkTab: 'profile'
  });
}

module.exports = {
  createNotification,
  notifyProfileApproved,
  notifyProfileRejected,
  notifyRequalificationRequired,
  notifyDocumentExpiring
};
