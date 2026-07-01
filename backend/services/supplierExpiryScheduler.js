const db = require('../models');
const { Op } = require('sequelize');
const { getDocumentStatus, getActiveDocuments } = require('./supplierCompleteness');
const { notifyDocumentExpiring, notifyRequalificationRequired } = require('./supplierNotificationService');

const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000; // daily

async function checkSupplierDocumentExpiry(supplier) {
  if (!db.SupplierNotification || !supplier) return;
  const documents = await db.Document.findAll({
    where: { supplierId: supplier.id, isActive: true }
  });
  const expiringCount = getActiveDocuments(documents).filter(
    (d) => getDocumentStatus(d) === 'expiring_soon'
  ).length;
  if (expiringCount === 0) return;

  const recent = await db.SupplierNotification.findOne({
    where: {
      supplierId: supplier.id,
      type: 'document_expiring',
      createdAt: { [Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    }
  });
  if (!recent) {
    await notifyDocumentExpiring(supplier, expiringCount);
  }
}

async function checkSupplierRequalification(supplier) {
  if (!supplier || supplier.status !== 'approved' || !supplier.qualificationExpiresAt) return;
  const now = new Date();
  const expires = new Date(supplier.qualificationExpiresAt);
  const daysUntil = Math.ceil((expires - now) / (1000 * 60 * 60 * 24));
  if (daysUntil > 60) return;

  await supplier.update({ status: 'requalification_required' });
  const recent = db.SupplierNotification
    ? await db.SupplierNotification.findOne({
      where: {
        supplierId: supplier.id,
        type: 'requalification_required',
        createdAt: { [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      }
    })
    : null;
  if (!recent) {
    await notifyRequalificationRequired(supplier, supplier.qualificationExpiresAt);
  }
}

async function runExpiryChecks() {
  try {
    const suppliers = await db.Supplier.findAll({
      where: { status: ['approved', 'requalification_required'] }
    });
    for (const supplier of suppliers) {
      await checkSupplierDocumentExpiry(supplier);
      await checkSupplierRequalification(supplier);
    }
    console.log(`[supplierExpiryScheduler] Checked ${suppliers.length} suppliers`);
  } catch (error) {
    console.error('[supplierExpiryScheduler] Error:', error.message);
  }
}

function startSupplierExpiryScheduler() {
  setTimeout(runExpiryChecks, 15000);
  setInterval(runExpiryChecks, CHECK_INTERVAL_MS);
}

module.exports = { startSupplierExpiryScheduler, runExpiryChecks };
