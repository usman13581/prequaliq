const db = require('../models');
const { Op } = require('sequelize');
const { getEffectiveEntitlementsForUser } = require('../services/entitlementService');
const { isAiConfigured, callAi } = require('../services/aiExtractionService');

async function assertEntitlement(userId, key) {
  try {
    const map = await getEffectiveEntitlementsForUser(userId);
    if (map[key] === false) return { ok: false, message: `Feature not enabled: ${key}` };
  } catch (_e) {}
  return { ok: true };
}

async function draftText(prompt, fallback) {
  if (!isAiConfigured()) return { draft: fallback, source: 'heuristic' };
  try {
    // Prefer a generic generate endpoint if present on GPU service
    const data = await callAi('/generate/text', { prompt, max_tokens: 600 }, 60000);
    const draft = data.text || data.draft || data.content || fallback;
    return { draft, source: 'ai' };
  } catch (_e) {
    return { draft: fallback, source: 'heuristic' };
  }
}

const completenessCheck = async (req, res) => {
  try {
    const ent = await assertEntitlement(req.user.id, 'ai.completeness_conflict');
    if (!ent.ok) return res.status(403).json({ message: ent.message });
    const supplier = await db.Supplier.findOne({
      where: { userId: req.user.id },
      include: [{ model: db.Document, as: 'documents', required: false }]
    });
    if (!supplier) return res.status(404).json({ message: 'Supplier not found' });

    const issues = [];
    if (!supplier.companyName) issues.push({ code: 'company_name', severity: 'error', message: 'Company name missing' });
    if (!supplier.registrationNumber) issues.push({ code: 'reg_number', severity: 'warning', message: 'Registration number missing' });
    if (!supplier.address) issues.push({ code: 'address', severity: 'warning', message: 'Address missing' });
    const docs = supplier.documents || [];
    const expired = docs.filter((d) => d.validTo && new Date(d.validTo) < new Date());
    if (expired.length) {
      issues.push({ code: 'expired_docs', severity: 'error', message: `${expired.length} document(s) expired` });
    }
    const ready = !issues.some((i) => i.severity === 'error');
    res.json({ ready, issues, source: 'rules' });
  } catch (error) {
    console.error('Completeness check error:', error);
    res.status(500).json({ message: 'Error running completeness check', error: error.message });
  }
};

const qualificationRisk = async (req, res) => {
  try {
    const ent = await assertEntitlement(req.user.id, 'ai.qualification_risk');
    if (!ent.ok) return res.status(403).json({ message: ent.message });
    const supplier = await db.Supplier.findByPk(req.params.supplierId, {
      include: [{ model: db.Document, as: 'documents', required: false }]
    });
    if (!supplier) return res.status(404).json({ message: 'Supplier not found' });
    const flags = [];
    if (supplier.status !== 'approved') flags.push({ code: 'not_approved', severity: 'high', message: 'Supplier not approved' });
    const expired = (supplier.documents || []).filter((d) => d.validTo && new Date(d.validTo) < new Date());
    if (expired.length) flags.push({ code: 'expired_docs', severity: 'high', message: 'Expired documents present' });
    if (!supplier.groundsForExclusion) flags.push({ code: 'exclusion_blank', severity: 'medium', message: 'Exclusion grounds field empty' });
    res.json({ flags, source: 'rules' });
  } catch (error) {
    console.error('Qualification risk error:', error);
    res.status(500).json({ message: 'Error running risk flags', error: error.message });
  }
};

const evaluationCopilot = async (req, res) => {
  try {
    const ent = await assertEntitlement(req.user.id, 'ai.evaluation_copilot');
    if (!ent.ok) return res.status(403).json({ message: ent.message });
    const procedure = await db.Procedure.findByPk(req.params.procedureId, {
      include: [{ model: db.BidEvaluation, as: 'evaluations', include: [{ model: db.Supplier, as: 'supplier' }] }]
    });
    if (!procedure) return res.status(404).json({ message: 'Procedure not found' });
    const lines = (procedure.evaluations || []).map(
      (e) => `- ${e.supplier?.companyName || e.supplierId}: score ${e.score ?? 'n/a'} ${e.notes ? `(${e.notes})` : ''}`
    );
    const fallback = `Evaluation summary for "${procedure.title}":\n${lines.join('\n') || 'No scores yet.'}\n\nDraft recommendation: review highest compliant score and document rationale before award.`;
    const result = await draftText(
      `Summarize these bid evaluations for a Swedish public procurement buyer. Keep concise.\n${fallback}`,
      fallback
    );
    res.json({ summary: result.draft, source: result.source });
  } catch (error) {
    console.error('Evaluation copilot error:', error);
    res.status(500).json({ message: 'Error drafting evaluation summary', error: error.message });
  }
};

const qaDraftReply = async (req, res) => {
  try {
    const ent = await assertEntitlement(req.user.id, 'ai.qa_draft_replies');
    if (!ent.ok) return res.status(403).json({ message: ent.message });
    const question = (req.body.question || '').trim();
    const context = (req.body.context || '').trim();
    const fallback = `Thank you for your question.\n\nRegarding: ${question || '—'}\n\nBased on the tender documentation${context ? ` (${context.slice(0, 200)})` : ''}, please refer to the published underlag. If clarification is still needed, contact the procuring entity before the Q&A deadline.\n\n[AI draft — review before posting]`;
    const result = await draftText(
      `Draft a professional procurement Q&A reply in English.\nQuestion: ${question}\nContext: ${context}`,
      fallback
    );
    res.json({ draft: result.draft, source: result.source });
  } catch (error) {
    console.error('Q&A draft error:', error);
    res.status(500).json({ message: 'Error drafting Q&A reply', error: error.message });
  }
};

const announcementDraft = async (req, res) => {
  try {
    const ent = await assertEntitlement(req.user.id, 'ai.announcement_draft');
    if (!ent.ok) return res.status(403).json({ message: ent.message });
    const procedure = await db.Procedure.findByPk(req.params.procedureId);
    if (!procedure) return res.status(404).json({ message: 'Procedure not found' });
    const fallback = `Announcement: ${procedure.title}\nReference: ${procedure.referenceNumber || 'n/a'}\nType: ${procedure.procedureType}\nBid deadline: ${procedure.bidDeadline || 'TBD'}\n\n${procedure.description || 'See underlag for full requirements.'}\n\n[AI draft — review before publish]`;
    const result = await draftText(`Draft a short public procurement announcement from: ${fallback}`, fallback);
    res.json({ draft: result.draft, source: result.source });
  } catch (error) {
    console.error('Announcement draft error:', error);
    res.status(500).json({ message: 'Error drafting announcement', error: error.message });
  }
};

const awardMemoDraft = async (req, res) => {
  try {
    const ent = await assertEntitlement(req.user.id, 'ai.award_memo');
    if (!ent.ok) return res.status(403).json({ message: ent.message });
    const procedure = await db.Procedure.findByPk(req.params.procedureId, {
      include: [
        { model: db.BidEvaluation, as: 'evaluations', include: [{ model: db.Supplier, as: 'supplier' }] },
        { model: db.AwardDecision, as: 'awardDecision', include: [{ model: db.Supplier, as: 'winner' }] }
      ]
    });
    if (!procedure) return res.status(404).json({ message: 'Procedure not found' });
    const winner = procedure.awardDecision?.winner?.companyName || req.body.winnerName || 'the selected tenderer';
    const fallback = `Award decision memo — ${procedure.title}\n\nThe contracting authority intends to award the contract to ${winner}.\nEvaluation overview:\n${(procedure.evaluations || []).map((e) => `• ${e.supplier?.companyName}: ${e.score ?? '—'}`).join('\n') || '• (scores pending)'}\n\nStandstill applies as configured. This is an AI draft and must be reviewed by the responsible buyer.`;
    const result = await draftText(`Draft a formal award decision memo:\n${fallback}`, fallback);
    res.json({ draft: result.draft, source: result.source });
  } catch (error) {
    console.error('Award memo error:', error);
    res.status(500).json({ message: 'Error drafting award memo', error: error.message });
  }
};

const cpvRecommend = async (req, res) => {
  try {
    const ent = await assertEntitlement(req.user.id, 'ai.cpv_recommender');
    if (!ent.ok) return res.status(403).json({ message: ent.message });
    const text = (req.body.text || '').trim();
    if (!text) return res.status(400).json({ message: 'text is required' });
    const tokens = text.toLowerCase().split(/[^a-z0-9åäö]+/).filter((t) => t.length > 3).slice(0, 6);
    let codes = [];
    if (tokens.length) {
      codes = await db.CPVCode.findAll({
        where: {
          [Op.or]: tokens.flatMap((t) => [
            { description: { [Op.iLike]: `%${t}%` } },
            { code: { [Op.iLike]: `${t}%` } }
          ])
        },
        limit: 15,
        attributes: ['id', 'code', 'description']
      });
    }
    if (!codes.length) {
      codes = await db.CPVCode.findAll({ limit: 10, order: [['code', 'ASC']], attributes: ['id', 'code', 'description'] });
    }
    res.json({ recommendations: codes, source: 'catalog-search' });
  } catch (error) {
    console.error('CPV recommend error:', error);
    res.status(500).json({ message: 'Error recommending CPV', error: error.message });
  }
};

const supplierMatching = async (req, res) => {
  try {
    const ent = await assertEntitlement(req.user.id, 'ai.supplier_matching');
    if (!ent.ok) return res.status(403).json({ message: ent.message });
    const procedure = await db.Procedure.findByPk(req.params.procedureId, {
      include: [{ model: db.Questionnaire, as: 'questionnaire', include: [{ model: db.CPVCode, as: 'cpvCode' }] }]
    });
    if (!procedure) return res.status(404).json({ message: 'Procedure not found' });
    const cpvId = procedure.questionnaire?.cpvCodeId;
    let suppliers = [];
    if (cpvId) {
      suppliers = await db.Supplier.findAll({
        where: { status: 'approved' },
        include: [
          { model: db.CPVCode, as: 'cpvCodes', where: { id: cpvId }, through: { attributes: [] }, required: true },
          { model: db.User, as: 'user', attributes: ['email'], where: { isActive: true }, required: true }
        ],
        limit: 25
      });
    }
    if (!suppliers.length) {
      suppliers = await db.Supplier.findAll({
        where: { status: 'approved' },
        include: [{ model: db.User, as: 'user', attributes: ['email'], where: { isActive: true }, required: true }],
        limit: 25,
        order: [['companyName', 'ASC']]
      });
    }
    res.json({
      matches: suppliers.map((s) => ({
        id: s.id,
        companyName: s.companyName,
        reason: cpvId ? 'Matching CPV on underlag' : 'Approved supplier (no CPV link on procedure)'
      })),
      source: 'rules'
    });
  } catch (error) {
    console.error('Supplier matching error:', error);
    res.status(500).json({ message: 'Error matching suppliers', error: error.message });
  }
};

module.exports = {
  completenessCheck,
  qualificationRisk,
  evaluationCopilot,
  qaDraftReply,
  announcementDraft,
  awardMemoDraft,
  cpvRecommend,
  supplierMatching
};
