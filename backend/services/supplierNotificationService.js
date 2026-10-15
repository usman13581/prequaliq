const db = require('../models');

async function createNotification(supplierId, { type, title, message, linkTab = null, meta = null }) {
  if (!db.SupplierNotification) return null;
  return db.SupplierNotification.create({
    supplierId,
    type,
    title,
    message,
    linkTab,
    meta,
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

async function notifyTenderInvite(supplier, procedureTitle) {
  return createNotification(supplier.id, {
    type: 'tender_invite',
    title: 'Tender invitation',
    message: `You are invited to: ${procedureTitle}`,
    linkTab: 'tenders'
  });
}

async function notifyAwardDecision(supplier, procedureTitle, isWinner) {
  return createNotification(supplier.id, {
    type: 'award_decision',
    title: isWinner ? 'Award — intended winner' : 'Award decision',
    message: isWinner
      ? `Your company is the intended winner for ${procedureTitle}.`
      : `An award decision was published for ${procedureTitle}.`,
    linkTab: 'tenders'
  });
}

async function notifyComplementRequest(supplier, procedureTitle, { procedureId, complementId } = {}) {
  const meta =
    procedureId || complementId
      ? {
          ...(procedureId ? { procedureId } : {}),
          ...(complementId ? { complementId } : {})
        }
      : null;
  return createNotification(supplier.id, {
    type: 'complement_request',
    title: 'Complement requested',
    message: `Please complement your bid for ${procedureTitle}.`,
    linkTab: 'tenders',
    meta
  });
}

async function notifyTenderUnpublished(supplier, procedureTitle) {
  return createNotification(supplier.id, {
    type: 'tender_unpublished',
    title: 'Tender withdrawn',
    message: `The tender "${procedureTitle}" is no longer published.`,
    linkTab: 'tenders'
  });
}

async function notifyContractUpdated(supplier, contractTitle, changedFields = []) {
  const fields = changedFields.length ? changedFields.join(', ') : 'contract details';
  return createNotification(supplier.id, {
    type: 'contract_updated',
    title: 'Contract updated',
    message: `"${contractTitle}" was updated (${fields}).`,
    linkTab: 'contracts'
  });
}

async function notifyContractActivity(supplier, contractTitle, summary) {
  return createNotification(supplier.id, {
    type: 'contract_activity',
    title: 'Contract activity',
    message: `${contractTitle}: ${summary}`,
    linkTab: 'contracts'
  });
}

module.exports = {
  createNotification,
  notifyProfileApproved,
  notifyProfileRejected,
  notifyRequalificationRequired,
  notifyDocumentExpiring,
  notifyTenderInvite,
  notifyAwardDecision,
  notifyComplementRequest,
  notifyTenderUnpublished,
  notifyContractUpdated,
  notifyContractActivity
};
