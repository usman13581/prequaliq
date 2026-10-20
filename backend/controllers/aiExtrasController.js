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

const completenessCheck = async (req, res) => {
  try {
    const ent = await assertEntitlement(req.user.id, 'ai.completeness_conflict');
    if (!ent.ok) return res.status(403).json({ message: ent.message });

    const { runCompletenessAiCheck } = require('../services/supplierCompletenessAiService');
    const language = String(req.query.language || req.headers['accept-language'] || 'en').slice(0, 2);
    const result = await runCompletenessAiCheck(req.user.id, { language });
    res.json(result);
  } catch (error) {
    console.error('Completeness check error:', error);
    if (error.code === 'SUPPLIER_NOT_FOUND') {
      return res.status(404).json({ message: 'Supplier not found', code: error.code });
    }
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

    const entity = await db.ProcuringEntity.findOne({ where: { userId: req.user.id } });
    if (!entity) return res.status(404).json({ message: 'Procuring entity not found' });

    const language = String(req.query.language || req.body?.language || 'en').slice(0, 2);
    const procedure = await db.Procedure.findByPk(req.params.procedureId, {
      include: [
        {
          model: db.Questionnaire,
          as: 'questionnaire',
          include: db.Question
            ? [{ model: db.Question, as: 'questions', required: false }]
            : [],
        },
        {
          model: db.BidEvaluation,
          as: 'evaluations',
          include: [{ model: db.Supplier, as: 'supplier', attributes: ['id', 'companyName'] }],
        },
      ],
    });
    if (!procedure || procedure.procuringEntityId !== entity.id) {
      return res.status(404).json({ message: 'Procedure not found' });
    }
    if (['awarded', 'standstill', 'closed'].includes(procedure.status)) {
      return res.status(403).json({
        message: 'Evaluation is read-only after award.',
      });
    }

    const questions = (procedure.questionnaire?.questions || [])
      .slice()
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((q) => ({
        id: q.id,
        questionText: q.questionText,
        questionType: q.questionType,
        isRequired: q.isRequired,
        requiresDocument: q.requiresDocument,
      }));

    let responses = [];
    if (db.QuestionnaireResponse && procedure.questionnaireId) {
      const rows = await db.QuestionnaireResponse.findAll({
        where: {
          questionnaireId: procedure.questionnaireId,
          status: 'submitted',
          [Op.or]: [{ procedureId: procedure.id }, { procedureId: null }],
        },
        include: [
          { model: db.Supplier, as: 'supplier', attributes: ['id', 'companyName'] },
          {
            model: db.Answer,
            as: 'answers',
            required: false,
            include: db.Question
              ? [{ model: db.Question, as: 'question', attributes: ['id', 'questionText', 'questionType'] }]
              : [],
          },
        ],
        order: [['submittedAt', 'DESC']],
      });
      const bySupplier = new Map();
      for (const r of rows) {
        const prev = bySupplier.get(r.supplierId);
        if (!prev || (r.procedureId === procedure.id && prev.procedureId !== procedure.id)) {
          bySupplier.set(r.supplierId, r);
        }
      }
      responses = Array.from(bySupplier.values()).map((r) => ({
        responseId: r.id,
        supplierId: r.supplierId,
        companyName: r.supplier?.companyName || 'Supplier',
        submittedAt: r.submittedAt,
        answers: (r.answers || []).map((a) => ({
          questionId: a.questionId,
          questionText: a.question?.questionText || null,
          answerText: a.answerText || null,
          answerValue: a.answerValue ?? null,
          hasDocument: Boolean(a.documentId),
        })),
      }));
    }

    const existingScores = (procedure.evaluations || []).map((e) => ({
      supplierId: e.supplierId,
      companyName: e.supplier?.companyName,
      score: e.score != null ? Number(e.score) : null,
      notes: e.notes || null,
    }));

    const heuristicProposals = responses.map((r) => {
      const answered = r.answers.filter(
        (a) => String(a.answerText || a.answerValue || '').trim() || a.hasDocument
      ).length;
      const total = Math.max(questions.length, 1);
      const coverage = answered / total;
      const score = Math.round(40 + coverage * 55);
      return {
        supplierId: r.supplierId,
        companyName: r.companyName,
        responseId: r.responseId,
        score,
        notes: `Heuristic draft from answer coverage (${answered}/${total}). Review before saving.`,
        rationale: 'Fallback scoring from submission completeness only — GPU evaluation unavailable.',
      };
    });

    const fallbackSummary =
      responses.length === 0
        ? `No submitted bids found for "${procedure.title}". AI evaluation needs submitted questionnaire answers.`
        : `Draft evaluation for "${procedure.title}" covering ${responses.length} submitted bid(s). Review proposed scores before applying.`;

    if (!isAiConfigured() || responses.length === 0) {
      return res.json({
        summary: fallbackSummary,
        proposals: heuristicProposals,
        source: responses.length ? 'heuristic' : 'rules',
      });
    }

    try {
      const data = await callAi(
        '/generate/evaluation',
        {
          language,
          procedure: {
            title: procedure.title,
            referenceNumber: procedure.referenceNumber,
            description: procedure.description,
            status: procedure.status,
          },
          underlag: procedure.questionnaire
            ? { title: procedure.questionnaire.title, description: procedure.questionnaire.description }
            : null,
          questions,
          submissions: responses,
          existingScores,
        },
        120000
      );

      const known = new Map(responses.map((r) => [r.supplierId, r]));
      const rawProposals = Array.isArray(data.proposals) ? data.proposals : [];
      const proposals = [];
      for (const p of rawProposals) {
        if (!p || typeof p !== 'object') continue;
        const sid = String(p.supplierId || '').trim();
        if (!sid || !known.has(sid)) continue;
        const base = known.get(sid);
        let score = Number(p.score);
        if (!Number.isFinite(score)) score = null;
        else score = Math.max(0, Math.min(100, Math.round(score * 100) / 100));
        proposals.push({
          supplierId: sid,
          companyName: base.companyName,
          responseId: base.responseId,
          score,
          notes: String(p.notes || p.rationale || '').trim().slice(0, 2000),
          rationale: String(p.rationale || '').trim().slice(0, 800),
        });
      }
      // Ensure every submission has a proposal row
      for (const r of responses) {
        if (!proposals.some((p) => p.supplierId === r.supplierId)) {
          const h = heuristicProposals.find((x) => x.supplierId === r.supplierId);
          if (h) proposals.push(h);
        }
      }

      return res.json({
        summary: String(data.summary || fallbackSummary).trim().slice(0, 4000),
        proposals,
        recommendation: data.recommendation || null,
        source: 'ai',
      });
    } catch (aiErr) {
      console.warn('Evaluation AI fallback:', aiErr.code || aiErr.message);
      return res.json({
        summary: fallbackSummary,
        proposals: heuristicProposals,
        source: 'heuristic',
      });
    }
  } catch (error) {
    console.error('Evaluation copilot error:', error);
    res.status(500).json({ message: 'Error drafting evaluation summary', error: error.message });
  }
};

const qaDraftReply = async (req, res) => {
  try {
    const ent = await assertEntitlement(req.user.id, 'ai.qa_draft_replies');
    if (!ent.ok) return res.status(403).json({ message: ent.message });

    const procedureId = req.body.procedureId || req.body.procedure_id;
    const threadSupplierId = req.body.threadSupplierId || req.body.supplierId || null;
    const language = String(req.body.language || 'en').slice(0, 2);
    let question = String(req.body.question || '').trim();

    if (!procedureId) {
      return res.status(400).json({ message: 'procedureId is required' });
    }

    const entity = await db.ProcuringEntity.findOne({ where: { userId: req.user.id } });
    if (!entity) return res.status(404).json({ message: 'Procuring entity not found' });

    const procedure = await db.Procedure.findByPk(procedureId, {
      include: [
        {
          model: db.Questionnaire,
          as: 'questionnaire',
          attributes: ['id', 'title', 'description'],
          required: false,
        },
      ],
    });
    if (!procedure || procedure.procuringEntityId !== entity.id) {
      return res.status(404).json({ message: 'Procedure not found' });
    }

    let supplierName = null;
    if (threadSupplierId) {
      const supplier = await db.Supplier.findByPk(threadSupplierId, {
        attributes: ['id', 'companyName'],
      });
      if (!supplier) return res.status(404).json({ message: 'Supplier not found' });
      supplierName = supplier.companyName;
    }

    let thread = [];
    if (db.ProcedureQaMessage && threadSupplierId) {
      const rows = await db.ProcedureQaMessage.findAll({
        where: { procedureId: procedure.id, threadSupplierId },
        order: [['createdAt', 'ASC']],
        limit: 30,
        attributes: ['authorRole', 'body', 'createdAt'],
      });
      thread = rows.map((m) => ({
        authorRole: m.authorRole,
        body: String(m.body || '').slice(0, 800),
        at: m.createdAt,
      }));
      if (!question) {
        const lastSupplier = [...rows].reverse().find((m) => m.authorRole === 'supplier');
        question = String(lastSupplier?.body || '').trim();
      }
    }

    if (!question) {
      return res.status(400).json({ message: 'No supplier question found to draft a reply for' });
    }

    const procedurePayload = {
      title: procedure.title,
      referenceNumber: procedure.referenceNumber,
      procedureType: procedure.procedureType,
      status: procedure.status,
      bidDeadline: procedure.bidDeadline,
      qaDeadline: procedure.qaDeadline,
      description: procedure.description,
      announcementText: procedure.announcementText,
    };
    const underlag = procedure.questionnaire
      ? {
          title: procedure.questionnaire.title,
          description: procedure.questionnaire.description,
        }
      : null;

    const vague =
      question.length < 40 ||
      /more details|more information|can you (share|tell|explain)|vad menar|fler detaljer/i.test(
        question
      );

    const clarifyingFallback = [
      'Thank you for your question.',
      '',
      'To answer accurately and fairly to all tenderers, please clarify what you need, for example:',
      '• Scope / volumes / locations',
      '• Working hours (day vs night)',
      '• Mandatory certifications or chemicals requirements',
      '• Start date / mobilisation expectations',
      '',
      'Once we have a specific question, we can point you to the relevant part of the published underlag (or confirm if it is not specified there).',
      '',
      `Procedure: ${procedure.title}${procedure.referenceNumber ? ` (${procedure.referenceNumber})` : ''}.`,
    ].join('\n');

    const groundedFallback = [
      'Thank you for your question.',
      '',
      `Regarding: ${question}`,
      '',
      procedure.description
        ? `From the published procedure description: ${String(procedure.description).slice(0, 400)}`
        : 'Please refer to the published underlag and announcement for the binding requirements.',
      '',
      'If anything remains unclear after reading the underlag, please ask a more specific follow-up before the Q&A deadline.',
    ].join('\n');

    const fallback = vague ? clarifyingFallback : groundedFallback;

    if (!isAiConfigured()) {
      return res.json({
        draft: fallback,
        needsClarification: vague,
        source: 'heuristic',
      });
    }

    try {
      const data = await callAi(
        '/generate/qa-reply',
        {
          language,
          question,
          procedure: procedurePayload,
          underlag,
          thread,
          supplierName,
        },
        90000
      );
      const draft = String(data.draft || '').trim();
      if (!draft) {
        return res.json({ draft: fallback, needsClarification: vague, source: 'heuristic' });
      }
      return res.json({
        draft,
        needsClarification: Boolean(data.needsClarification),
        rationale: data.rationale || null,
        source: 'ai',
      });
    } catch (aiErr) {
      console.warn('Q&A AI draft fallback:', aiErr.code || aiErr.message);
      return res.json({
        draft: fallback,
        needsClarification: vague,
        source: 'heuristic',
      });
    }
  } catch (error) {
    console.error('Q&A draft error:', error);
    res.status(500).json({ message: 'Error drafting Q&A reply', error: error.message });
  }
};

const announcementDraft = async (req, res) => {
  try {
    const ent = await assertEntitlement(req.user.id, 'ai.announcement_draft');
    if (!ent.ok) return res.status(403).json({ message: ent.message });

    const entity = await db.ProcuringEntity.findOne({ where: { userId: req.user.id } });
    if (!entity) return res.status(404).json({ message: 'Procuring entity not found' });

    const language = String(req.query.language || req.body?.language || 'en').slice(0, 2);
    const procedure = await db.Procedure.findByPk(req.params.procedureId);
    if (!procedure || procedure.procuringEntityId !== entity.id) {
      return res.status(404).json({ message: 'Procedure not found' });
    }

    const procedurePayload = {
      title: procedure.title,
      referenceNumber: procedure.referenceNumber,
      procedureType: procedure.procedureType,
      bidDeadline: procedure.bidDeadline,
      qaDeadline: procedure.qaDeadline,
      description: procedure.description,
      announcementText: procedure.announcementText,
      status: procedure.status,
    };

    const fallback =
      `${procedure.title}\n` +
      `Reference: ${procedure.referenceNumber || 'n/a'}\n` +
      `Type: ${procedure.procedureType}\n` +
      `Bid deadline: ${procedure.bidDeadline || 'TBD'}\n\n` +
      `${procedure.description || 'See underlag for full requirements.'}`;

    if (!isAiConfigured()) {
      return res.json({ draft: fallback, source: 'heuristic' });
    }

    try {
      const data = await callAi(
        '/generate/announcement',
        { language, procedure: procedurePayload },
        90000
      );
      const draft = String(data.draft || '').trim();
      if (!draft) return res.json({ draft: fallback, source: 'heuristic' });
      return res.json({
        draft: draft.slice(0, 4000),
        rationale: data.rationale || null,
        source: 'ai',
      });
    } catch (aiErr) {
      console.warn('Announcement AI draft fallback:', aiErr.code || aiErr.message);
      return res.json({ draft: fallback, source: 'heuristic' });
    }
  } catch (error) {
    console.error('Announcement draft error:', error);
    res.status(500).json({ message: 'Error drafting announcement', error: error.message });
  }
};

const awardMemoDraft = async (req, res) => {
  try {
    const ent = await assertEntitlement(req.user.id, 'ai.award_memo');
    if (!ent.ok) return res.status(403).json({ message: ent.message });

    const entity = await db.ProcuringEntity.findOne({ where: { userId: req.user.id } });
    if (!entity) return res.status(404).json({ message: 'Procuring entity not found' });

    const language = String(req.query.language || req.body?.language || 'en').slice(0, 2);
    const winnerSupplierId = String(
      req.query.winnerSupplierId || req.body?.winnerSupplierId || ''
    ).trim();
    const winnerNameParam = String(req.query.winnerName || req.body?.winnerName || '').trim();
    const standstillEndsAt =
      req.query.standstillEndsAt || req.body?.standstillEndsAt || null;

    const procedure = await db.Procedure.findByPk(req.params.procedureId, {
      include: [
        {
          model: db.BidEvaluation,
          as: 'evaluations',
          include: [{ model: db.Supplier, as: 'supplier', attributes: ['id', 'companyName'] }],
        },
        {
          model: db.AwardDecision,
          as: 'awardDecision',
          include: [{ model: db.Supplier, as: 'winner', attributes: ['id', 'companyName'] }],
        },
      ],
    });
    if (!procedure || procedure.procuringEntityId !== entity.id) {
      return res.status(404).json({ message: 'Procedure not found' });
    }

    const evaluations = (procedure.evaluations || []).map((e) => ({
      supplierId: e.supplierId,
      companyName: e.supplier?.companyName || 'Supplier',
      score: e.score != null ? Number(e.score) : null,
      notes: e.notes || null,
    }));

    // Default winner = highest evaluation score (buyer can override via query)
    const byHighestScore = [...evaluations]
      .filter((e) => e.score != null && Number.isFinite(e.score))
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return String(a.companyName).localeCompare(String(b.companyName));
      });
    const topEval = byHighestScore[0] || null;

    let winnerName =
      procedure.awardDecision?.winner?.companyName || winnerNameParam || null;
    let winnerId = procedure.awardDecision?.winnerSupplierId || winnerSupplierId || null;
    if (!winnerId && topEval) {
      winnerId = topEval.supplierId;
      winnerName = topEval.companyName;
    }
    if (!winnerName && winnerSupplierId) {
      const s = await db.Supplier.findByPk(winnerSupplierId, {
        attributes: ['id', 'companyName'],
      });
      if (s) {
        winnerName = s.companyName;
        winnerId = s.id;
      }
    }
    if (!winnerName && topEval) {
      winnerName = topEval.companyName;
      winnerId = topEval.supplierId;
    }
    if (!winnerName) winnerName = 'the selected tenderer';

    const scoreLines =
      evaluations
        .map((e) => `• ${e.companyName}: ${e.score ?? '—'}${e.notes ? ` — ${e.notes}` : ''}`)
        .join('\n') || '• (scores pending)';

    const fallback =
      `Award decision memo — ${procedure.title}\n\n` +
      `The contracting authority intends to award the contract to ${winnerName}.\n` +
      `Evaluation overview:\n${scoreLines}\n\n` +
      (standstillEndsAt ? `Standstill ends: ${standstillEndsAt}.\n\n` : '') +
      `This is a draft for review by the responsible buyer before any formal decision.`;

    const winnerPayload = {
      winnerSupplierId: winnerId || null,
      winnerName: winnerName,
      selectedByHighestScore: Boolean(topEval && topEval.supplierId === winnerId),
    };

    if (!isAiConfigured()) {
      return res.json({ draft: fallback, source: 'heuristic', ...winnerPayload });
    }

    try {
      const data = await callAi(
        '/generate/award-memo',
        {
          language,
          procedure: {
            title: procedure.title,
            referenceNumber: procedure.referenceNumber,
            procedureType: procedure.procedureType,
            description: procedure.description,
            status: procedure.status,
          },
          winner: { supplierId: winnerId, companyName: winnerName },
          evaluations,
          standstillEndsAt: standstillEndsAt || null,
        },
        90000
      );
      const draft = String(data.draft || '').trim();
      if (!draft) return res.json({ draft: fallback, source: 'heuristic', ...winnerPayload });
      return res.json({
        draft: draft.slice(0, 4000),
        rationale: data.rationale || null,
        source: 'ai',
        ...winnerPayload,
      });
    } catch (aiErr) {
      console.warn('Award memo AI draft fallback:', aiErr.code || aiErr.message);
      return res.json({ draft: fallback, source: 'heuristic', ...winnerPayload });
    }
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
