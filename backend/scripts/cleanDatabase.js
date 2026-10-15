/**
 * Clear seeded / transactional app data for a clean E2E run.
 * Keeps: admin user, CPV codes, NUTS codes.
 * Removes: all other users, orgs, procedures, questionnaires, contracts, etc.
 *
 * Run: cd backend && npm run clean-db
 */
const db = require('../models');
const { Op } = require('sequelize');
const { hashPassword } = require('../utils/password');
const { ensureDefaultsForUser } = require('../services/entitlementService');

const ADMIN_EMAIL = 'admin@prequaliq.com';

async function safeDestroy(model, label) {
  if (!model) return 0;
  try {
    const n = await model.destroy({ where: {}, force: true });
    console.log(`✓ ${label || model.name}: ${n}`);
    return n;
  } catch (e) {
    console.warn(`⚠ ${label || model.name}: ${e.message}`);
    return 0;
  }
}

async function cleanDatabase() {
  try {
    await db.sequelize.authenticate();
    console.log('Cleaning seeded data (keeping admin + CPV/NUTS lookups)…\n');

    const order = [
      [db.ComplementAttachment, 'ComplementAttachment'],
      [db.ComplementMessage, 'ComplementMessage'],
      [db.Answer, 'Answer'],
      [db.QuestionnaireResponse, 'QuestionnaireResponse'],
      [db.ComplementRequest, 'ComplementRequest'],
      [db.EspdDeclaration, 'EspdDeclaration'],
      [db.ProcedureWatch, 'ProcedureWatch'],
      [db.ProcedureInvite, 'ProcedureInvite'],
      [db.ProcedureQaMessage, 'ProcedureQaMessage'],
      [db.BidEvaluation, 'BidEvaluation'],
      [db.AwardDecision, 'AwardDecision'],
      [db.DisMembership, 'DisMembership'],
      [db.ContractAttachment, 'ContractAttachment'],
      [db.ContractMessage, 'ContractMessage'],
      [db.Contract, 'Contract'],
      [db.OrgInvite, 'OrgInvite'],
      [db.OrgMembership, 'OrgMembership'],
      [db.Department, 'Department'],
      [db.FeatureEntitlement, 'FeatureEntitlement'],
      [db.SupplierNotification, 'SupplierNotification'],
      [db.SupplierProfileSubmission, 'SupplierProfileSubmission'],
      [db.SupplierReference, 'SupplierReference'],
      [db.Document, 'Document'],
      [db.AuditEvent, 'AuditEvent'],
      [db.Question, 'Question'],
      [db.Questionnaire, 'Questionnaire'],
      [db.Procedure, 'Procedure'],
      [db.AppLookup, 'AppLookup'],
      [db.LookupType, 'LookupType']
    ];

    for (const [model, label] of order) {
      await safeDestroy(model, label);
    }

    await db.sequelize.query('DELETE FROM supplier_nuts').catch(() => {});
    console.log('✓ supplier_nuts');
    await db.sequelize.query('DELETE FROM supplier_cpv').catch(() => {});
    console.log('✓ supplier_cpv');

    await safeDestroy(db.Supplier, 'Supplier');
    await safeDestroy(db.ProcuringEntity, 'ProcuringEntity');
    await safeDestroy(db.Company, 'Company');

    const deletedUsers = await db.User.destroy({
      where: {
        email: { [Op.ne]: ADMIN_EMAIL }
      }
    });
    console.log(`✓ Users (non-admin): ${deletedUsers}`);

    let admin = await db.User.findOne({ where: { email: ADMIN_EMAIL } });
    if (!admin) {
      admin = await db.User.create({
        email: ADMIN_EMAIL,
        password: await hashPassword('Admin123!'),
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
        isActive: true
      });
      console.log('✓ Admin user recreated');
    } else {
      await admin.update({ isActive: true, role: 'admin' });
      console.log('✓ Admin user kept');
    }
    await ensureDefaultsForUser(admin.id);

    const cpvCount = await db.CPVCode.count();
    const nutsCount = db.NUTSCode ? await db.NUTSCode.count() : 0;
    const userCount = await db.User.count();

    console.log('\n✅ Clean complete.');
    console.log(`Kept: ${userCount} user(s) [${ADMIN_EMAIL}], ${cpvCount} CPV, ${nutsCount} NUTS`);
    console.log('You can now create E2E accounts via Admin (see docs/E2E-SCENARIO-TO-CONTRACT.md).');

    await db.sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error cleaning database:', error);
    try {
      await db.sequelize.close();
    } catch (_) {}
    process.exit(1);
  }
}

cleanDatabase();
