const db = require('../models');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { Op } = require('sequelize');
const {
  getEntitlementsForUser,
  getEffectiveEntitlementsForUser
} = require('../services/entitlementService');
const { logAudit } = require('../services/auditService');

/** Sealed-until instant for a DATEONLY bid deadline (end of that UTC calendar day). */
function sealedUntilFromBidDeadline(bidDeadline) {
  if (bidDeadline == null || bidDeadline === '') return null;
  const d = new Date(bidDeadline);
  if (Number.isNaN(d.getTime())) return null;
  d.setUTCHours(23, 59, 59, 999);
  return d;
}

const complementStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(process.env.UPLOAD_PATH || './uploads', 'complements');
    if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname || '').toLowerCase();
    const safeExt = ['.jpeg', '.jpg', '.png', '.pdf', '.doc', '.docx', '.xls', '.xlsx'].includes(ext)
      ? ext
      : '';
    cb(null, `complement-${uniqueSuffix}${safeExt}`);
  }
});

const COMPLEMENT_MIME_BY_EXT = {
  '.jpg': ['image/jpeg'],
  '.jpeg': ['image/jpeg'],
  '.png': ['image/png'],
  '.pdf': ['application/pdf'],
  '.doc': ['application/msword'],
  '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  '.xls': ['application/vnd.ms-excel'],
  '.xlsx': ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
};

const complementFileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname || '').toLowerCase();
  const allowedMimes = COMPLEMENT_MIME_BY_EXT[ext];
  // Require both whitelisted extension AND matching MIME (rule 01 — never trust filename alone)
  if (allowedMimes && allowedMimes.includes(file.mimetype)) return cb(null, true);
  cb(new Error('Invalid file type. Only images, PDFs, and Office documents are allowed.'));
};

const complementUpload = multer({
  storage: complementStorage,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 10 * 1024 * 1024, files: 10 },
  fileFilter: complementFileFilter
}).array('files', 10);

function runComplementUpload(req, res) {
  return new Promise((resolve, reject) => {
    complementUpload(req, res, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

const complementMessageInclude = [
  { model: db.User, as: 'author', attributes: ['id', 'firstName', 'lastName', 'role'] },
  { model: db.ComplementAttachment, as: 'attachments', required: false }
];

const UNPUBLISHABLE_PROCEDURE_STATUSES = ['published', 'qa_open', 'bidding'];
const UNDERLAG_EDIT_PROCEDURE_STATUSES = ['draft', 'planned', 'underlag_ready'];

function isProcedureSealedForLock(procedure, now = new Date()) {
  if (!procedure?.isSealed) return false;
  const until = procedure.sealedUntil ? new Date(procedure.sealedUntil) : null;
  return !until || until > now;
}

async function applyUnsealIfDue(procedure) {
  if (!procedure?.isSealed) return procedure;
  const now = new Date();
  const until = procedure.sealedUntil ? new Date(procedure.sealedUntil) : null;
  if (until && until <= now) {
    await procedure.update({
      isSealed: false,
      status: ['bidding', 'published', 'qa_open'].includes(procedure.status) ? 'evaluation' : procedure.status
    });
    await procedure.reload();
  }
  return procedure;
}

async function assertProcedureUnsealedForBuyerAction(procedure) {
  const refreshed = await applyUnsealIfDue(procedure);
  if (isProcedureSealedForLock(refreshed)) {
    return {
      ok: false,
      message:
        'This procedure is sealed. Unseal it before award decisions, complement requests, or follow-up messages.',
      sealedUntil: refreshed.sealedUntil
    };
  }
  return { ok: true, procedure: refreshed };
}

async function saveComplementAttachments(messageId, files, userId) {
  if (!files || !files.length || !db.ComplementAttachment) return [];
  const rows = [];
  for (const file of files) {
    const relPath = path.join('complements', file.filename).replace(/\\/g, '/');
    const row = await db.ComplementAttachment.create({
      messageId,
      fileName: file.originalname,
      filePath: relPath,
      mimeType: file.mimetype,
      fileSize: file.size,
      uploadedBy: userId
    });
    rows.push(row);
  }
  return rows;
}

async function loadComplementWithThread(complementId) {
  return db.ComplementRequest.findByPk(complementId, {
    include: [
      { model: db.Supplier, as: 'supplier', attributes: ['id', 'companyName'] },
      { model: db.Procedure, as: 'procedure', attributes: ['id', 'title', 'status', 'procuringEntityId'] },
      {
        model: db.ComplementMessage,
        as: 'messages',
        separate: true,
        order: [['createdAt', 'ASC']],
        include: complementMessageInclude
      }
    ]
  });
}

/** Build history from messages, or legacy message/responseText fields */
function serializeComplementThread(complement) {
  const json = complement.toJSON ? complement.toJSON() : complement;
  let messages = json.messages || [];
  if (!messages.length) {
    const legacy = [];
    if (json.message) {
      legacy.push({
        id: `${json.id}-request`,
        authorRole: 'procuring_entity',
        body: json.message,
        createdAt: json.createdAt,
        attachments: []
      });
    }
    if (json.responseText) {
      legacy.push({
        id: `${json.id}-response`,
        authorRole: 'supplier',
        body: json.responseText,
        createdAt: json.respondedAt || json.updatedAt,
        attachments: []
      });
    }
    messages = legacy;
  }
  const normalized = messages.map((m) => ({
    ...m,
    attachments: Array.isArray(m.attachments) ? m.attachments : []
  }));
  return {
    ...json,
    messages: normalized,
    history: normalized
  };
}

async function assertCanAccessComplement(req, complement) {
  if (!complement) return { ok: false, status: 404, message: 'Complement request not found' };
  if (req.user.role === 'admin') return { ok: true };
  if (req.user.role === 'supplier') {
    const supplier = await db.Supplier.findOne({ where: { userId: req.user.id } });
    if (!supplier || complement.supplierId !== supplier.id) {
      return { ok: false, status: 403, message: 'Access denied' };
    }
    return { ok: true, supplier };
  }
  if (req.user.role === 'procuring_entity') {
    const entity = await getBuyerEntity(req.user.id);
    const procedure =
      complement.procedure ||
      (await db.Procedure.findByPk(complement.procedureId));
    if (!entity || !procedure || procedure.procuringEntityId !== entity.id) {
      return { ok: false, status: 403, message: 'Access denied' };
    }
    return { ok: true, entity, procedure };
  }
  return { ok: false, status: 403, message: 'Access denied' };
}

async function getBuyerEntity(userId) {
  return db.ProcuringEntity.findOne({ where: { userId } });
}

async function assertBuyerApproved(entity) {
  if (!entity) return { ok: false, status: 404, message: 'Procuring entity not found' };
  if (entity.status && entity.status !== 'approved') {
    return { ok: false, status: 403, message: 'Account must be approved before managing procedures' };
  }
  return { ok: true };
}

async function assertEntitlement(userId, key) {
  try {
    const map = String(key).startsWith('ai.')
      ? await getEffectiveEntitlementsForUser(userId)
      : await getEntitlementsForUser(userId);
    if (map[key] === false) {
      return { ok: false, message: `Feature not enabled: ${key}` };
    }
  } catch (_e) {
    // ignore if table missing
  }
  return { ok: true };
}

const listBuyerProcedures = async (req, res) => {
  try {
    const entity = await getBuyerEntity(req.user.id);
    const check = await assertBuyerApproved(entity);
    if (!check.ok) return res.status(check.status).json({ message: check.message });

    const procedures = await db.Procedure.findAll({
      where: { procuringEntityId: entity.id },
      include: [
        { model: db.Questionnaire, as: 'questionnaire', attributes: ['id', 'title', 'deadline', 'isActive'] },
        { model: db.AwardDecision, as: 'awardDecision', include: [{ model: db.Supplier, as: 'winner', attributes: ['id', 'companyName'] }] }
      ],
      order: [['updatedAt', 'DESC']]
    });
    res.json({ procedures });
  } catch (error) {
    console.error('List procedures error:', error);
    res.status(500).json({ message: 'Error listing procedures', error: error.message });
  }
};

const createProcedure = async (req, res) => {
  try {
    const ent = await assertEntitlement(req.user.id, 'tender.procedure_setup');
    if (!ent.ok) return res.status(403).json({ message: ent.message });

    const entity = await getBuyerEntity(req.user.id);
    const check = await assertBuyerApproved(entity);
    if (!check.ok) return res.status(check.status).json({ message: check.message });

    const title = (req.body.title || '').trim();
    if (!title) return res.status(400).json({ message: 'Title is required' });

    const questionnaireId = req.body.questionnaireId || null;
    if (questionnaireId) {
      const q = await db.Questionnaire.findOne({
        where: { id: questionnaireId, procuringEntityId: entity.id }
      });
      if (!q) return res.status(404).json({ message: 'Questionnaire not found' });
      const { findOtherProcedureUsingQuestionnaire } = require('./questionnaireController');
      const other = await findOtherProcedureUsingQuestionnaire(questionnaireId, entity.id, null);
      if (other) {
        return res.status(409).json({
          code: 'QUESTIONNAIRE_IN_USE',
          message:
            'This questionnaire is already linked to another procedure. Create a copy and link the unused copy instead.',
          usedBy: {
            id: other.id,
            title: other.title,
            status: other.status,
            referenceNumber: other.referenceNumber || null
          }
        });
      }
    }

    const procedure = await db.Procedure.create({
      procuringEntityId: entity.id,
      title,
      referenceNumber: req.body.referenceNumber?.trim() || null,
      procedureType: req.body.procedureType || 'open',
      description: req.body.description?.trim() || null,
      status: 'draft',
      plannedPublishAt: req.body.plannedPublishAt || null,
      bidDeadline: req.body.bidDeadline || null,
      qaDeadline: req.body.qaDeadline || null,
      notes: req.body.notes?.trim() || null,
      questionnaireId,
      createdBy: req.user.id
    });

    res.status(201).json({ message: 'Procedure created', procedure });
  } catch (error) {
    console.error('Create procedure error:', error);
    res.status(500).json({ message: 'Error creating procedure', error: error.message });
  }
};

const getProcedure = async (req, res) => {
  try {
    // Resolve supplier thread scope before include (private 1:1 Q&A)
    let qaWhere = undefined;
    let viewingSupplier = null;
    if (req.user.role === 'supplier') {
      viewingSupplier = await db.Supplier.findOne({ where: { userId: req.user.id } });
      if (!viewingSupplier) {
        return res.status(403).json({ message: 'Supplier profile not found' });
      }
      qaWhere = { threadSupplierId: viewingSupplier.id };
    }

    const procedure = await db.Procedure.findByPk(req.params.procedureId, {
      include: [
        { model: db.Questionnaire, as: 'questionnaire' },
        {
          model: db.ProcedureQaMessage,
          as: 'qaMessages',
          where: qaWhere,
          required: false,
          include: [
            { model: db.User, as: 'author', attributes: ['id', 'firstName', 'lastName', 'role'] },
            { model: db.Supplier, as: 'threadSupplier', attributes: ['id', 'companyName'] }
          ],
          separate: true,
          order: [['createdAt', 'ASC']]
        },
        {
          model: db.BidEvaluation,
          as: 'evaluations',
          include: [{ model: db.Supplier, as: 'supplier', attributes: ['id', 'companyName'] }]
        },
        {
          model: db.AwardDecision,
          as: 'awardDecision',
          include: [{ model: db.Supplier, as: 'winner', attributes: ['id', 'companyName'] }]
        }
      ]
    });
    if (!procedure) return res.status(404).json({ message: 'Procedure not found' });

    // Buyer own or supplier if published+
    if (req.user.role === 'procuring_entity') {
      const entity = await getBuyerEntity(req.user.id);
      if (!entity || procedure.procuringEntityId !== entity.id) {
        return res.status(403).json({ message: 'Access denied' });
      }
    } else if (req.user.role === 'supplier') {
      const openStatuses = ['published', 'qa_open', 'bidding', 'evaluation', 'awarded', 'standstill', 'closed'];
      if (!openStatuses.includes(procedure.status)) {
        return res.status(403).json({ message: 'Procedure not available' });
      }
    } else if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const json = procedure.toJSON();

    // Attach ESPD status: supplier sees own; buyer sees all for this procedure
    if (db.EspdDeclaration) {
      if (req.user.role === 'supplier' && viewingSupplier) {
        const myEspd = await db.EspdDeclaration.findOne({
          where: { procedureId: procedure.id, supplierId: viewingSupplier.id }
        });
        json.myEspd = myEspd
          ? {
              id: myEspd.id,
              exclusionGroundsOk: myEspd.exclusionGroundsOk,
              declarationText: myEspd.declarationText,
              submittedAt: myEspd.submittedAt,
              submitted: Boolean(myEspd.submittedAt)
            }
          : null;
      } else if (req.user.role === 'procuring_entity' || req.user.role === 'admin') {
        const espds = await db.EspdDeclaration.findAll({
          where: { procedureId: procedure.id },
          include: [{ model: db.Supplier, as: 'supplier', attributes: ['id', 'companyName'] }],
          order: [['submittedAt', 'DESC']]
        });
        json.espdDeclarations = espds.map((e) => ({
          id: e.id,
          supplierId: e.supplierId,
          companyName: e.supplier?.companyName,
          exclusionGroundsOk: e.exclusionGroundsOk,
          submittedAt: e.submittedAt,
          submitted: Boolean(e.submittedAt)
        }));
      }
    }

    // Buyer: thread list (one private chat per supplier). Suppliers never see other threads.
    if (req.user.role === 'procuring_entity' || req.user.role === 'admin') {
      const threadMap = new Map();
      for (const m of json.qaMessages || []) {
        if (!m.threadSupplierId) continue;
        const prev = threadMap.get(m.threadSupplierId);
        if (!prev) {
          threadMap.set(m.threadSupplierId, {
            supplierId: m.threadSupplierId,
            companyName: m.threadSupplier?.companyName || 'Supplier',
            lastMessageAt: m.createdAt,
            lastPreview: m.body,
            messageCount: 1
          });
        } else {
          prev.messageCount += 1;
          if (new Date(m.createdAt) >= new Date(prev.lastMessageAt)) {
            prev.lastMessageAt = m.createdAt;
            prev.lastPreview = m.body;
          }
        }
      }
      json.qaThreads = Array.from(threadMap.values()).sort(
        (a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt)
      );

      // Submitted bids for evaluation UI (supplier + answer count)
      if (db.QuestionnaireResponse) {
        const bidWhere = procedure.questionnaireId
          ? {
              questionnaireId: procedure.questionnaireId,
              status: 'submitted',
              [Op.or]: [
                { procedureId: procedure.id },
                { procedureId: null }
              ]
            }
          : { procedureId: procedure.id, status: 'submitted' };
        const bids = await db.QuestionnaireResponse.findAll({
          where: bidWhere,
          include: [
            { model: db.Supplier, as: 'supplier', attributes: ['id', 'companyName'] },
            ...(db.Answer
              ? [{ model: db.Answer, as: 'answers', attributes: ['id'], required: false }]
              : [])
          ],
          order: [['submittedAt', 'DESC']]
        });
        // Prefer procedure-scoped response when both exist
        const bySupplier = new Map();
        for (const b of bids) {
          const sid = b.supplierId;
          const prev = bySupplier.get(sid);
          if (!prev || (b.procedureId === procedure.id && prev.procedureId !== procedure.id)) {
            bySupplier.set(sid, b);
          }
        }
        json.bidResponses = Array.from(bySupplier.values()).map((b) => ({
          id: b.id,
          supplierId: b.supplierId,
          companyName: b.supplier?.companyName || 'Supplier',
          submittedAt: b.submittedAt,
          answerCount: Array.isArray(b.answers) ? b.answers.length : 0,
          procedureId: b.procedureId
        }));
      } else {
        json.bidResponses = [];
      }
    } else {
      // Strip peer identity from supplier view (only role + own thread)
      json.qaMessages = (json.qaMessages || []).map((m) => ({
        id: m.id,
        body: m.body,
        authorRole: m.authorRole,
        createdAt: m.createdAt,
        threadSupplierId: m.threadSupplierId,
        // Show buyer org contact first name only for chat labels — never other suppliers
        author:
          m.authorRole === 'procuring_entity'
            ? { firstName: m.author?.firstName || 'Buyer', lastName: '' }
            : { firstName: 'You', lastName: '' }
      }));
      json.qaThreads = viewingSupplier
        ? [{ supplierId: viewingSupplier.id, companyName: viewingSupplier.companyName, messageCount: json.qaMessages.length }]
        : [];

      if (viewingSupplier && db.ProcedureWatch) {
        const watch = await db.ProcedureWatch.findOne({
          where: { procedureId: procedure.id, supplierId: viewingSupplier.id }
        });
        json.watching = Boolean(watch);
      } else {
        json.watching = false;
      }
    }

    res.json({ procedure: json });
  } catch (error) {
    console.error('Get procedure error:', error);
    res.status(500).json({ message: 'Error fetching procedure', error: error.message });
  }
};

const updateProcedure = async (req, res) => {
  try {
    const ent = await assertEntitlement(req.user.id, 'tender.procedure_setup');
    if (!ent.ok) return res.status(403).json({ message: ent.message });

    const entity = await getBuyerEntity(req.user.id);
    const check = await assertBuyerApproved(entity);
    if (!check.ok) return res.status(check.status).json({ message: check.message });

    const procedure = await db.Procedure.findByPk(req.params.procedureId);
    if (!procedure || procedure.procuringEntityId !== entity.id) {
      return res.status(404).json({ message: 'Procedure not found' });
    }

    const fields = [
      'title', 'referenceNumber', 'procedureType', 'description', 'status',
      'plannedPublishAt', 'bidDeadline', 'qaDeadline', 'standstillEndsAt', 'notes', 'questionnaireId'
    ];
    const updates = {};
    for (const f of fields) {
      if (req.body[f] !== undefined) updates[f] = req.body[f];
    }
    if (updates.title) updates.title = String(updates.title).trim();
    if (updates.bidDeadline !== undefined && (procedure.isSealed || procedure.sealedUntil)) {
      updates.sealedUntil = sealedUntilFromBidDeadline(updates.bidDeadline);
    }
    if (
      updates.questionnaireId !== undefined &&
      updates.questionnaireId &&
      updates.questionnaireId !== procedure.questionnaireId
    ) {
      const q = await db.Questionnaire.findOne({
        where: { id: updates.questionnaireId, procuringEntityId: entity.id }
      });
      if (!q) return res.status(404).json({ message: 'Questionnaire not found' });
      const { findOtherProcedureUsingQuestionnaire } = require('./questionnaireController');
      const other = await findOtherProcedureUsingQuestionnaire(
        updates.questionnaireId,
        entity.id,
        procedure.id
      );
      if (other) {
        return res.status(409).json({
          code: 'QUESTIONNAIRE_IN_USE',
          message:
            'This questionnaire is already linked to another procedure. Create a copy and link the unused copy instead.',
          usedBy: {
            id: other.id,
            title: other.title,
            status: other.status,
            referenceNumber: other.referenceNumber || null
          }
        });
      }
    }
    await procedure.update(updates);
    await logAudit({
      actorUserId: req.user.id,
      action: 'procedure.update',
      entityType: 'procedure',
      entityId: procedure.id,
      meta: { fields: Object.keys(updates) }
    });
    res.json({ message: 'Procedure updated', procedure });
  } catch (error) {
    console.error('Update procedure error:', error);
    res.status(500).json({ message: 'Error updating procedure', error: error.message });
  }
};

const listPublishedForSupplier = async (req, res) => {
  try {
    const ent = await assertEntitlement(req.user.id, 'tender.search_watch');
    if (!ent.ok) return res.status(403).json({ message: ent.message });

    const { Op } = require('sequelize');
    const supplier = await db.Supplier.findOne({ where: { userId: req.user.id } });
    const scope = String(req.query.scope || 'open').toLowerCase();
    const openStatuses = ['published', 'qa_open', 'bidding', 'evaluation'];
    const historyStatuses = ['awarded', 'standstill', 'closed'];
    let statusFilter =
      scope === 'history'
        ? historyStatuses
        : scope === 'all'
          ? [...openStatuses, ...historyStatuses]
          : openStatuses;

    // Optional fine-grained status (must stay within the list scope)
    const statusParam = String(req.query.status || '').trim();
    if (statusParam && statusFilter.includes(statusParam)) {
      statusFilter = [statusParam];
    }

    const q = String(req.query.q || req.query.keyword || '').trim();
    const cpvCodeId = String(req.query.cpvCodeId || '').trim() || null;
    // NUTS is not stored on procedures/procuring entities yet — ignored server-side.

    let invitedProcedureIds = [];
    if (supplier && db.ProcedureInvite) {
      const invites = await db.ProcedureInvite.findAll({
        where: { supplierId: supplier.id },
        attributes: ['procedureId']
      });
      invitedProcedureIds = invites.map((i) => i.procedureId);
    }

    const where = {
      status: { [Op.in]: statusFilter },
      [Op.or]: [
        { procedureType: { [Op.ne]: 'direct' } },
        ...(invitedProcedureIds.length ? [{ id: { [Op.in]: invitedProcedureIds } }] : [{ id: null }])
      ]
    };

    const questionnaireInclude = {
      model: db.Questionnaire,
      as: 'questionnaire',
      attributes: ['id', 'title', 'deadline', 'isActive', 'cpvCodeId'],
      required: Boolean(cpvCodeId),
      ...(cpvCodeId ? { where: { cpvCodeId } } : {}),
      include: db.CPVCode
        ? [{ model: db.CPVCode, as: 'cpvCode', attributes: ['id', 'code', 'description'] }]
        : []
    };

    // Open procedures OR directly invited (even if type=direct with invites only)
    const procedures = await db.Procedure.findAll({
      where,
      include: [
        { model: db.ProcuringEntity, as: 'procuringEntity', attributes: ['id', 'entityName', 'city', 'country'] },
        questionnaireInclude,
        ...(db.AwardDecision
          ? [{ model: db.AwardDecision, as: 'awardDecision', include: [{ model: db.Supplier, as: 'winner', attributes: ['id', 'companyName'] }] }]
          : [])
      ],
      order: [['bidDeadline', 'ASC'], ['updatedAt', 'DESC']]
    });

    // Keyword matches title / ref / description / buyer name (post-filter keeps entity-name matches)
    let list = procedures;
    if (q) {
      const qLower = q.toLowerCase();
      list = procedures.filter((p) => {
        const json = p.toJSON ? p.toJSON() : p;
        return (
          (json.title || '').toLowerCase().includes(qLower) ||
          (json.referenceNumber || '').toLowerCase().includes(qLower) ||
          (json.description || '').toLowerCase().includes(qLower) ||
          (json.procuringEntity?.entityName || '').toLowerCase().includes(qLower)
        );
      });
    }

    // Mark which are watched / invited
    let watchIds = new Set();
    if (supplier && db.ProcedureWatch) {
      const watches = await db.ProcedureWatch.findAll({
        where: { supplierId: supplier.id },
        attributes: ['procedureId']
      });
      watchIds = new Set(watches.map((w) => w.procedureId));
    }
    const inviteSet = new Set(invitedProcedureIds);
    res.json({
      procedures: list.map((p) => ({
        ...p.toJSON(),
        watching: watchIds.has(p.id),
        invited: inviteSet.has(p.id)
      }))
    });
  } catch (error) {
    console.error('List published procedures error:', error);
    res.status(500).json({ message: 'Error listing procedures', error: error.message });
  }
};

const postQaMessage = async (req, res) => {
  try {
    const ent = await assertEntitlement(req.user.id, 'tender.qa');
    if (!ent.ok) return res.status(403).json({ message: ent.message });

    const procedure = await db.Procedure.findByPk(req.params.procedureId);
    if (!procedure) return res.status(404).json({ message: 'Procedure not found' });

    const body = (req.body.body || '').trim();
    if (!body) return res.status(400).json({ message: 'Message body is required' });

    let authorRole;
    let threadSupplierId = null;

    if (req.user.role === 'procuring_entity') {
      const entity = await getBuyerEntity(req.user.id);
      if (!entity || procedure.procuringEntityId !== entity.id) {
        return res.status(403).json({ message: 'Access denied' });
      }
      authorRole = 'procuring_entity';
      // Buyer must target a specific supplier thread (private 1:1)
      threadSupplierId = req.body.threadSupplierId || req.body.supplierId || null;
      if (!threadSupplierId) {
        return res.status(400).json({ message: 'Select a supplier thread to reply' });
      }
      const supplier = await db.Supplier.findByPk(threadSupplierId);
      if (!supplier) return res.status(404).json({ message: 'Supplier not found' });
    } else if (req.user.role === 'supplier') {
      const openStatuses = ['published', 'qa_open', 'bidding'];
      if (!openStatuses.includes(procedure.status)) {
        return res.status(403).json({ message: 'Q&A is not open for this procedure' });
      }
      const supplier = await db.Supplier.findOne({ where: { userId: req.user.id } });
      if (!supplier) return res.status(403).json({ message: 'Supplier profile not found' });
      authorRole = 'supplier';
      threadSupplierId = supplier.id;
    } else {
      return res.status(403).json({ message: 'Access denied' });
    }

    const message = await db.ProcedureQaMessage.create({
      procedureId: procedure.id,
      threadSupplierId,
      authorUserId: req.user.id,
      authorRole,
      parentId: req.body.parentId || null,
      body,
      isPublic: false
    });

    if (procedure.status === 'published') {
      await procedure.update({ status: 'qa_open' });
    }

    const full = await db.ProcedureQaMessage.findByPk(message.id, {
      include: [
        { model: db.User, as: 'author', attributes: ['id', 'firstName', 'lastName', 'role'] },
        { model: db.Supplier, as: 'threadSupplier', attributes: ['id', 'companyName'] }
      ]
    });
    res.status(201).json({ message: 'Q&A message posted', qaMessage: full });
  } catch (error) {
    console.error('Post Q&A error:', error);
    res.status(500).json({ message: 'Error posting Q&A', error: error.message });
  }
};

const upsertEvaluation = async (req, res) => {
  try {
    const ent = await assertEntitlement(req.user.id, 'evaluation.scoring');
    if (!ent.ok) return res.status(403).json({ message: ent.message });

    const entity = await getBuyerEntity(req.user.id);
    const check = await assertBuyerApproved(entity);
    if (!check.ok) return res.status(check.status).json({ message: check.message });

    const procedure = await db.Procedure.findByPk(req.params.procedureId);
    if (!procedure || procedure.procuringEntityId !== entity.id) {
      return res.status(404).json({ message: 'Procedure not found' });
    }

    if (['awarded', 'standstill', 'closed'].includes(procedure.status)) {
      return res.status(403).json({
        message: 'Evaluation is read-only after award. Scores cannot be changed.'
      });
    }

    const { supplierId, score, notes, responseId } = req.body;
    if (!supplierId) return res.status(400).json({ message: 'supplierId is required' });

    const [row] = await db.BidEvaluation.findOrCreate({
      where: { procedureId: procedure.id, supplierId },
      defaults: {
        score: score ?? null,
        notes: notes || null,
        responseId: responseId || null,
        evaluatedBy: req.user.id
      }
    });
    await row.update({
      score: score ?? row.score,
      notes: notes !== undefined ? notes : row.notes,
      responseId: responseId !== undefined ? responseId : row.responseId,
      evaluatedBy: req.user.id
    });

    if (procedure.status !== 'evaluation') {
      await procedure.update({ status: 'evaluation' });
    }

    await logAudit({
      actorUserId: req.user.id,
      action: 'procedure.evaluation',
      entityType: 'procedure',
      entityId: procedure.id,
      meta: { supplierId, score: score ?? null }
    });

    const full = await db.BidEvaluation.findByPk(row.id, {
      include: [{ model: db.Supplier, as: 'supplier', attributes: ['id', 'companyName'] }]
    });
    res.json({ message: 'Evaluation saved', evaluation: full });
  } catch (error) {
    console.error('Upsert evaluation error:', error);
    res.status(500).json({ message: 'Error saving evaluation', error: error.message });
  }
};

const createAward = async (req, res) => {
  try {
    const ent = await assertEntitlement(req.user.id, 'tender.award');
    if (!ent.ok) return res.status(403).json({ message: ent.message });

    const entity = await getBuyerEntity(req.user.id);
    const check = await assertBuyerApproved(entity);
    if (!check.ok) return res.status(check.status).json({ message: check.message });

    let procedure = await db.Procedure.findByPk(req.params.procedureId);
    if (!procedure || procedure.procuringEntityId !== entity.id) {
      return res.status(404).json({ message: 'Procedure not found' });
    }

    const sealCheck = await assertProcedureUnsealedForBuyerAction(procedure);
    if (!sealCheck.ok) {
      return res.status(403).json({ message: sealCheck.message, sealedUntil: sealCheck.sealedUntil });
    }
    procedure = sealCheck.procedure;

    if (['awarded', 'standstill', 'closed'].includes(procedure.status)) {
      return res.status(400).json({
        message: 'Award is read-only after it has been saved. Winner and standstill cannot be changed.'
      });
    }

    const { winnerSupplierId, decisionMemo, standstillEndsAt } = req.body;
    if (winnerSupplierId) {
      const evaluated = await db.BidEvaluation.findOne({
        where: { procedureId: procedure.id, supplierId: winnerSupplierId }
      });
      if (!evaluated) {
        return res.status(400).json({
          message: 'Winner must be a supplier that has been evaluated for this procedure.'
        });
      }
    }
    const now = new Date();
    let award = await db.AwardDecision.findOne({ where: { procedureId: procedure.id } });
    if (award) {
      return res.status(400).json({
        message: 'Award is read-only after it has been saved. Winner and standstill cannot be changed.'
      });
    }
    award = await db.AwardDecision.create({
      procedureId: procedure.id,
      winnerSupplierId: winnerSupplierId || null,
      decisionMemo: decisionMemo || null,
      awardedAt: now,
      standstillEndsAt: standstillEndsAt || null,
      notifiedAt: now,
      createdBy: req.user.id
    });

    await procedure.update({
      status: standstillEndsAt ? 'standstill' : 'awarded',
      standstillEndsAt: standstillEndsAt || procedure.standstillEndsAt
    });

    // Notify all bidders (evaluations + questionnaire responses on linked underlag)
    try {
      const { sendAwardDecisionEmail } = require('../services/emailService');
      const { notifyAwardDecision } = require('../services/supplierNotificationService');
      const bidderIds = new Set();
      const evals = await db.BidEvaluation.findAll({ where: { procedureId: procedure.id } });
      evals.forEach((e) => bidderIds.add(e.supplierId));
      if (procedure.questionnaireId) {
        const responses = await db.QuestionnaireResponse.findAll({
          where: {
            questionnaireId: procedure.questionnaireId,
            status: 'submitted',
            [Op.or]: [
              { procedureId: procedure.id },
              // Legacy bids saved before procedure-scoped responses
              { procedureId: null }
            ]
          },
          attributes: ['supplierId']
        });
        responses.forEach((r) => bidderIds.add(r.supplierId));
      }
      if (winnerSupplierId) bidderIds.add(winnerSupplierId);

      for (const sid of bidderIds) {
        const supplier = await db.Supplier.findByPk(sid, {
          include: [{ model: db.User, as: 'user', attributes: ['email', 'firstName'] }]
        });
        if (!supplier) continue;
        const isWinner = sid === winnerSupplierId;
        await notifyAwardDecision(supplier, procedure.title, isWinner);
        if (supplier.user?.email) {
          sendAwardDecisionEmail(
            supplier.user.email,
            supplier.user.firstName,
            procedure.title,
            isWinner,
            standstillEndsAt || null
          ).catch((err) => console.error('Award email failed:', err.message));
        }
      }
    } catch (notifyErr) {
      console.warn('Award notify skipped:', notifyErr.message);
    }

    await logAudit({
      actorUserId: req.user.id,
      action: 'procedure.award',
      entityType: 'procedure',
      entityId: procedure.id,
      meta: { winnerSupplierId }
    });

    const full = await db.AwardDecision.findByPk(award.id, {
      include: [{ model: db.Supplier, as: 'winner', attributes: ['id', 'companyName'] }]
    });

    // Ensure a contract exists for the winner so buyer can continue in Contracts
    let contract = null;
    if (winnerSupplierId && db.Contract) {
      contract = await db.Contract.findOne({
        where: { procedureId: procedure.id, supplierId: winnerSupplierId }
      });
      if (!contract) {
        const winner = await db.Supplier.findByPk(winnerSupplierId);
        const year = new Date().getFullYear();
        contract = await db.Contract.create({
          procuringEntityId: entity.id,
          supplierId: winnerSupplierId,
          procedureId: procedure.id,
          title: `${procedure.title} — ${winner?.companyName || 'Winner'}`,
          contractNumber: `CTR-${(procedure.referenceNumber || procedure.id.slice(0, 8)).toString().toUpperCase()}-${year}`,
          contractType: procedure.procedureType === 'framework' || procedure.procedureType === 'dis' ? 'framework' : 'standard',
          startDate: new Date().toISOString().slice(0, 10),
          endDate: null,
          status: 'active',
          notes: decisionMemo
            ? `Created from award decision.\n\n${decisionMemo}`
            : 'Created automatically from award decision.',
          createdBy: req.user.id
        });
        await logAudit({
          actorUserId: req.user.id,
          action: 'contract.create_from_award',
          entityType: 'contract',
          entityId: contract.id,
          meta: { procedureId: procedure.id, supplierId: winnerSupplierId }
        });
      }
    }

    res.json({
      message: 'Award decision saved',
      awardDecision: full,
      procedure,
      contract
    });
  } catch (error) {
    console.error('Create award error:', error);
    res.status(500).json({ message: 'Error saving award', error: error.message });
  }
};

const linkQuestionnaire = async (req, res) => {
  try {
    const ent = await assertEntitlement(req.user.id, 'tender.requirements');
    if (!ent.ok) return res.status(403).json({ message: ent.message });

    const entity = await getBuyerEntity(req.user.id);
    const check = await assertBuyerApproved(entity);
    if (!check.ok) return res.status(check.status).json({ message: check.message });

    const procedure = await db.Procedure.findByPk(req.params.procedureId);
    if (!procedure || procedure.procuringEntityId !== entity.id) {
      return res.status(404).json({ message: 'Procedure not found' });
    }

    if (!UNDERLAG_EDIT_PROCEDURE_STATUSES.includes(procedure.status)) {
      return res.status(400).json({
        message: 'Underlag cannot be changed after the procedure is published. Unpublish the procedure first.'
      });
    }

    const { questionnaireId } = req.body;
    if (questionnaireId) {
      const q = await db.Questionnaire.findOne({
        where: { id: questionnaireId, procuringEntityId: entity.id }
      });
      if (!q) return res.status(404).json({ message: 'Questionnaire not found' });

      // One questionnaire may be linked to only one procedure
      if (procedure.questionnaireId !== questionnaireId) {
        const { findOtherProcedureUsingQuestionnaire } = require('./questionnaireController');
        const other = await findOtherProcedureUsingQuestionnaire(
          questionnaireId,
          entity.id,
          procedure.id
        );
        if (other) {
          return res.status(409).json({
            code: 'QUESTIONNAIRE_IN_USE',
            message:
              'This questionnaire is already linked to another procedure. Create a copy and link the unused copy instead.',
            usedBy: {
              id: other.id,
              title: other.title,
              status: other.status,
              referenceNumber: other.referenceNumber || null
            }
          });
        }
      }
    }

    await procedure.update({
      questionnaireId: questionnaireId || null,
      status: questionnaireId && procedure.status === 'draft' ? 'underlag_ready' : procedure.status
    });
    await logAudit({
      actorUserId: req.user.id,
      action: 'procedure.link_underlag',
      entityType: 'procedure',
      entityId: procedure.id,
      meta: { questionnaireId: questionnaireId || null }
    });
    res.json({ message: 'Underlag linked', procedure });
  } catch (error) {
    console.error('Link questionnaire error:', error);
    res.status(500).json({ message: 'Error linking underlag', error: error.message });
  }
};

const publishProcedure = async (req, res) => {
  try {
    const ent = await assertEntitlement(req.user.id, 'tender.publish');
    if (!ent.ok) return res.status(403).json({ message: ent.message });
    const entity = await getBuyerEntity(req.user.id);
    const check = await assertBuyerApproved(entity);
    if (!check.ok) return res.status(check.status).json({ message: check.message });
    const procedure = await db.Procedure.findByPk(req.params.procedureId);
    if (!procedure || procedure.procuringEntityId !== entity.id) {
      return res.status(404).json({ message: 'Procedure not found' });
    }
    if (!procedure.questionnaireId) {
      return res.status(400).json({
        message: 'Link an underlag (questionnaire) before publishing'
      });
    }
    if (!procedure.bidDeadline) {
      return res.status(400).json({
        message: 'Set a bid deadline before publishing'
      });
    }
    if (procedure.procedureType !== 'direct' && !procedure.qaDeadline) {
      return res.status(400).json({
        message: 'Set a Q&A deadline before publishing'
      });
    }

    const supplierIds = Array.isArray(req.body.supplierIds) ? req.body.supplierIds.filter(Boolean) : [];
    // Direct procedures are invite-only: at least one supplier must be selected
    if (procedure.procedureType === 'direct' && supplierIds.length === 0) {
      return res.status(400).json({
        message: 'Direct procedures require inviting at least one supplier before publish'
      });
    }

    const sealedUntil = req.body.sealedUntil
      ? new Date(req.body.sealedUntil)
      : sealedUntilFromBidDeadline(procedure.bidDeadline);
    await procedure.update({
      status: 'published',
      announcementText: req.body.announcementText !== undefined ? req.body.announcementText : procedure.announcementText,
      isSealed: req.body.isSealed !== undefined ? !!req.body.isSealed : true,
      sealedUntil
    });

    if (db.QuestionnaireResponse) {
      await db.QuestionnaireResponse.update(
        { isActive: true },
        { where: { procedureId: procedure.id } }
      );
    }

    // Optional notify emails (or required invites for direct procedures)
    const invited = [];
    if (supplierIds.length && db.ProcedureInvite) {
      const {
        sendTenderInviteEmail
      } = require('../services/emailService');
      const { notifyTenderInvite } = require('../services/supplierNotificationService');
      for (const supplierId of supplierIds) {
        const [invite] = await db.ProcedureInvite.findOrCreate({
          where: { procedureId: procedure.id, supplierId },
          defaults: { invitedBy: req.user.id, notifiedAt: new Date() }
        });
        invited.push(invite);
        const supplier = await db.Supplier.findByPk(supplierId, {
          include: [{ model: db.User, as: 'user', attributes: ['email', 'firstName'] }]
        });
        if (supplier) {
          await notifyTenderInvite(supplier, procedure.title);
          if (supplier.user?.email) {
            sendTenderInviteEmail(
              supplier.user.email,
              supplier.user.firstName,
              procedure.title,
              procedure.referenceNumber
            ).catch((err) => console.error('Invite email failed:', err.message));
          }
        }
      }
    }

    await logAudit({
      actorUserId: req.user.id,
      action: 'procedure.publish',
      entityType: 'procedure',
      entityId: procedure.id,
      meta: { title: procedure.title, invitedCount: invited.length }
    });
    res.json({ message: 'Procedure published', procedure, invitedCount: invited.length });
  } catch (error) {
    console.error('Publish procedure error:', error);
    res.status(500).json({ message: 'Error publishing procedure', error: error.message });
  }
};

const unpublishProcedure = async (req, res) => {
  try {
    const ent = await assertEntitlement(req.user.id, 'tender.publish');
    if (!ent.ok) return res.status(403).json({ message: ent.message });

    const entity = await getBuyerEntity(req.user.id);
    const check = await assertBuyerApproved(entity);
    if (!check.ok) return res.status(check.status).json({ message: check.message });

    const procedure = await db.Procedure.findByPk(req.params.procedureId);
    if (!procedure || procedure.procuringEntityId !== entity.id) {
      return res.status(404).json({ message: 'Procedure not found' });
    }

    if (!UNPUBLISHABLE_PROCEDURE_STATUSES.includes(procedure.status)) {
      return res.status(400).json({
        message: 'Only published procedures in Q&A or bidding can be unpublished.'
      });
    }

    const previousStatus = procedure.status;
    const nextStatus = procedure.questionnaireId ? 'underlag_ready' : 'planned';

    await procedure.update({
      status: nextStatus,
      isSealed: false,
      sealedUntil: null
    });

    if (db.QuestionnaireResponse) {
      await db.QuestionnaireResponse.update(
        { isActive: false },
        { where: { procedureId: procedure.id } }
      );
    }

    const supplierIds = new Set();
    if (db.ProcedureInvite) {
      const invites = await db.ProcedureInvite.findAll({
        where: { procedureId: procedure.id },
        attributes: ['supplierId']
      });
      invites.forEach((i) => supplierIds.add(i.supplierId));
    }
    if (db.ProcedureWatch) {
      const watches = await db.ProcedureWatch.findAll({
        where: { procedureId: procedure.id },
        attributes: ['supplierId']
      });
      watches.forEach((w) => supplierIds.add(w.supplierId));
    }
    if (procedure.questionnaireId) {
      const bidRows = await db.QuestionnaireResponse.findAll({
        where: { procedureId: procedure.id },
        attributes: ['supplierId']
      });
      bidRows.forEach((r) => supplierIds.add(r.supplierId));
    }

    try {
      const { notifyTenderUnpublished } = require('../services/supplierNotificationService');
      for (const supplierId of supplierIds) {
        const supplier = await db.Supplier.findByPk(supplierId);
        if (supplier) {
          await notifyTenderUnpublished(supplier, procedure.title);
        }
      }
    } catch (notifyErr) {
      console.warn('Unpublish notify skipped:', notifyErr.message);
    }

    await logAudit({
      actorUserId: req.user.id,
      action: 'procedure.unpublish',
      entityType: 'procedure',
      entityId: procedure.id,
      meta: { previousStatus, nextStatus }
    });

    await procedure.reload();
    res.json({ message: 'Procedure unpublished', procedure });
  } catch (error) {
    console.error('Unpublish procedure error:', error);
    res.status(500).json({ message: 'Error unpublishing procedure', error: error.message });
  }
};

const closeProcedure = async (req, res) => {
  try {
    const ent = await assertEntitlement(req.user.id, 'tender.after_announce_close');
    if (!ent.ok) return res.status(403).json({ message: ent.message });

    const entity = await getBuyerEntity(req.user.id);
    const check = await assertBuyerApproved(entity);
    if (!check.ok) return res.status(check.status).json({ message: check.message });
    const procedure = await db.Procedure.findByPk(req.params.procedureId);
    if (!procedure || procedure.procuringEntityId !== entity.id) {
      return res.status(404).json({ message: 'Procedure not found' });
    }
    await procedure.update({
      status: 'closed',
      closedAt: new Date(),
      afterAnnounceText: req.body.afterAnnounceText !== undefined ? req.body.afterAnnounceText : procedure.afterAnnounceText
    });
    await logAudit({
      actorUserId: req.user.id,
      action: 'procedure.close',
      entityType: 'procedure',
      entityId: procedure.id
    });
    res.json({ message: 'Procedure closed', procedure });
  } catch (error) {
    console.error('Close procedure error:', error);
    res.status(500).json({ message: 'Error closing procedure', error: error.message });
  }
};

const toggleWatch = async (req, res) => {
  try {
    const ent = await assertEntitlement(req.user.id, 'tender.search_watch');
    if (!ent.ok) return res.status(403).json({ message: ent.message });

    const supplier = await db.Supplier.findOne({ where: { userId: req.user.id } });
    if (!supplier) return res.status(404).json({ message: 'Supplier not found' });
    const procedure = await db.Procedure.findByPk(req.params.procedureId);
    if (!procedure) return res.status(404).json({ message: 'Procedure not found' });
    const existing = await db.ProcedureWatch.findOne({
      where: { procedureId: procedure.id, supplierId: supplier.id }
    });
    if (existing) {
      await existing.destroy();
      return res.json({ watching: false });
    }
    await db.ProcedureWatch.create({ procedureId: procedure.id, supplierId: supplier.id });
    res.json({ watching: true });
  } catch (error) {
    console.error('Toggle watch error:', error);
    res.status(500).json({ message: 'Error updating watch', error: error.message });
  }
};

const createComplement = async (req, res) => {
  try {
    await runComplementUpload(req, res);
    const ent = await assertEntitlement(req.user.id, 'tender.complements');
    if (!ent.ok) return res.status(403).json({ message: ent.message });
    const entity = await getBuyerEntity(req.user.id);
    const check = await assertBuyerApproved(entity);
    if (!check.ok) return res.status(check.status).json({ message: check.message });
    let procedure = await db.Procedure.findByPk(req.params.procedureId);
    if (!procedure || procedure.procuringEntityId !== entity.id) {
      return res.status(404).json({ message: 'Procedure not found' });
    }

    const sealCheck = await assertProcedureUnsealedForBuyerAction(procedure);
    if (!sealCheck.ok) {
      return res.status(403).json({ message: sealCheck.message, sealedUntil: sealCheck.sealedUntil });
    }
    procedure = sealCheck.procedure;

    const message = (req.body.message || '').trim();
    if (!message || !req.body.supplierId) {
      return res.status(400).json({ message: 'supplierId and message are required' });
    }
    const complement = await db.ComplementRequest.create({
      procedureId: procedure.id,
      supplierId: req.body.supplierId,
      requestedBy: req.user.id,
      message,
      deadline: req.body.deadline || null,
      status: 'open'
    });

    if (db.ComplementMessage) {
      const msg = await db.ComplementMessage.create({
        complementRequestId: complement.id,
        authorUserId: req.user.id,
        authorRole: 'procuring_entity',
        body: message
      });
      await saveComplementAttachments(msg.id, req.files, req.user.id);
    }

    try {
      const { sendComplementRequestEmail } = require('../services/emailService');
      const { notifyComplementRequest } = require('../services/supplierNotificationService');
      const supplier = await db.Supplier.findByPk(req.body.supplierId, {
        include: [{ model: db.User, as: 'user', attributes: ['email', 'firstName'] }]
      });
      if (supplier) {
        await notifyComplementRequest(supplier, procedure.title, {
          procedureId: procedure.id,
          complementId: complement.id
        });
        if (supplier.user?.email) {
          sendComplementRequestEmail(
            supplier.user.email,
            supplier.user.firstName,
            procedure.title,
            req.body.deadline || null
          ).catch((err) => console.error('Complement email failed:', err.message));
        }
      }
    } catch (notifyErr) {
      console.warn('Complement notify skipped:', notifyErr.message);
    }

    await logAudit({
      actorUserId: req.user.id,
      action: 'complement.request',
      entityType: 'procedure',
      entityId: procedure.id,
      meta: { supplierId: req.body.supplierId, files: (req.files || []).length }
    });

    const full = await loadComplementWithThread(complement.id);
    res.status(201).json({ message: 'Complement requested', complement: serializeComplementThread(full) });
  } catch (error) {
    console.error('Create complement error:', error);
    res.status(500).json({ message: 'Error creating complement', error: error.message });
  }
};

const listProcedureComplements = async (req, res) => {
  try {
    const procedure = await db.Procedure.findByPk(req.params.procedureId);
    if (!procedure) return res.status(404).json({ message: 'Procedure not found' });

    const threadInclude = db.ComplementMessage
      ? [
          {
            model: db.ComplementMessage,
            as: 'messages',
            separate: true,
            order: [['createdAt', 'ASC']],
            include: complementMessageInclude
          }
        ]
      : [];

    if (req.user.role === 'procuring_entity') {
      const entity = await getBuyerEntity(req.user.id);
      if (!entity || procedure.procuringEntityId !== entity.id) {
        return res.status(403).json({ message: 'Access denied' });
      }
    } else if (req.user.role === 'supplier') {
      const supplier = await db.Supplier.findOne({ where: { userId: req.user.id } });
      const complements = await db.ComplementRequest.findAll({
        where: { procedureId: procedure.id, supplierId: supplier.id },
        include: threadInclude,
        order: [['createdAt', 'DESC']]
      });
      return res.json({ complements: complements.map(serializeComplementThread) });
    }

    const complements = await db.ComplementRequest.findAll({
      where: { procedureId: procedure.id },
      include: [
        { model: db.Supplier, as: 'supplier', attributes: ['id', 'companyName'] },
        ...threadInclude
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json({ complements: complements.map(serializeComplementThread) });
  } catch (error) {
    console.error('List procedure complements error:', error);
    res.status(500).json({ message: 'Error listing complements', error: error.message });
  }
};

const respondComplement = async (req, res) => {
  try {
    const ent = await assertEntitlement(req.user.id, 'tender.complements');
    if (!ent.ok) return res.status(403).json({ message: ent.message });

    await runComplementUpload(req, res);
    const supplier = await db.Supplier.findOne({ where: { userId: req.user.id } });
    if (!supplier) return res.status(404).json({ message: 'Supplier not found' });
    const complement = await db.ComplementRequest.findByPk(req.params.complementId, {
      include: [{ model: db.Procedure, as: 'procedure' }]
    });
    if (!complement || complement.supplierId !== supplier.id) {
      return res.status(404).json({ message: 'Complement request not found' });
    }
    if (complement.procedure) {
      const sealCheck = await assertProcedureUnsealedForBuyerAction(complement.procedure);
      if (!sealCheck.ok) {
        return res.status(403).json({ message: sealCheck.message, sealedUntil: sealCheck.sealedUntil });
      }
    }
    const responseText = (req.body.responseText || req.body.message || '').trim();
    const files = req.files || [];
    if (!responseText && files.length === 0) {
      return res.status(400).json({ message: 'Reply text or at least one attachment is required' });
    }
    const body = responseText || '(Documents attached)';

    if (db.ComplementMessage) {
      const msg = await db.ComplementMessage.create({
        complementRequestId: complement.id,
        authorUserId: req.user.id,
        authorRole: 'supplier',
        body
      });
      await saveComplementAttachments(msg.id, files, req.user.id);
    }

    await complement.update({
      responseText: body,
      status: 'responded',
      respondedAt: new Date()
    });

    await logAudit({
      actorUserId: req.user.id,
      action: 'procedure.complement_respond',
      entityType: 'complement_request',
      entityId: complement.id,
      meta: { procedureId: complement.procedureId }
    });

    const full = await loadComplementWithThread(complement.id);
    res.json({ message: 'Complement response saved', complement: serializeComplementThread(full) });
  } catch (error) {
    console.error('Respond complement error:', error);
    res.status(500).json({ message: 'Error responding to complement', error: error.message });
  }
};

/** Buyer or supplier follow-up on an existing complement thread */
const postComplementMessage = async (req, res) => {
  try {
    const ent = await assertEntitlement(req.user.id, 'tender.complements');
    if (!ent.ok) return res.status(403).json({ message: ent.message });

    await runComplementUpload(req, res);
    const complement = await db.ComplementRequest.findByPk(req.params.complementId, {
      include: [{ model: db.Procedure, as: 'procedure' }]
    });
    const access = await assertCanAccessComplement(req, complement);
    if (!access.ok) return res.status(access.status).json({ message: access.message });

    const procedureForSeal =
      complement.procedure || (await db.Procedure.findByPk(complement.procedureId));
    if (procedureForSeal) {
      const sealCheck = await assertProcedureUnsealedForBuyerAction(procedureForSeal);
      if (!sealCheck.ok) {
        return res.status(403).json({ message: sealCheck.message, sealedUntil: sealCheck.sealedUntil });
      }
    }

    const body = (req.body.message || req.body.responseText || '').trim();
    const files = req.files || [];
    if (!body && files.length === 0) {
      return res.status(400).json({ message: 'Message text or at least one attachment is required' });
    }

    const authorRole = req.user.role === 'supplier' ? 'supplier' : 'procuring_entity';
    const text = body || '(Documents attached)';
    const msg = await db.ComplementMessage.create({
      complementRequestId: complement.id,
      authorUserId: req.user.id,
      authorRole,
      body: text
    });
    await saveComplementAttachments(msg.id, files, req.user.id);

    const updates = {};
    if (authorRole === 'supplier') {
      updates.responseText = text;
      updates.status = 'responded';
      updates.respondedAt = new Date();
    } else if (complement.status === 'responded') {
      updates.status = 'open'; // buyer asked for more
    }
    if (Object.keys(updates).length) await complement.update(updates);

    await logAudit({
      actorUserId: req.user.id,
      action: 'procedure.complement_message',
      entityType: 'complement_request',
      entityId: complement.id,
      meta: { authorRole, attachmentCount: files.length }
    });

    const full = await loadComplementWithThread(complement.id);
    res.status(201).json({ message: 'Message added', complement: serializeComplementThread(full) });
  } catch (error) {
    console.error('Post complement message error:', error);
    res.status(500).json({ message: 'Error posting complement message', error: error.message });
  }
};

const downloadComplementAttachment = async (req, res) => {
  try {
    const attachment = await db.ComplementAttachment.findByPk(req.params.attachmentId, {
      include: [
        {
          model: db.ComplementMessage,
          as: 'message',
          include: [{ model: db.ComplementRequest, as: 'complement', include: [{ model: db.Procedure, as: 'procedure' }] }]
        }
      ]
    });
    if (!attachment?.message?.complement) {
      return res.status(404).json({ message: 'Attachment not found' });
    }
    const access = await assertCanAccessComplement(req, attachment.message.complement);
    if (!access.ok) return res.status(access.status).json({ message: access.message });

    const abs = path.isAbsolute(attachment.filePath)
      ? attachment.filePath
      : path.join(process.env.UPLOAD_PATH || './uploads', attachment.filePath.replace(/^complements[\\/]/, 'complements/'));
    // Prefer uploads/complements/<file>
    const candidates = [
      abs,
      path.join(process.env.UPLOAD_PATH || './uploads', attachment.filePath),
      path.join(process.env.UPLOAD_PATH || './uploads', 'complements', path.basename(attachment.filePath))
    ];
    const fileOnDisk = candidates.find((p) => fs.existsSync(p));
    if (!fileOnDisk) return res.status(404).json({ message: 'File missing on server' });

    res.download(fileOnDisk, attachment.fileName);
  } catch (error) {
    console.error('Download complement attachment error:', error);
    res.status(500).json({ message: 'Error downloading attachment', error: error.message });
  }
};

const listMyComplements = async (req, res) => {
  try {
    const supplier = await db.Supplier.findOne({ where: { userId: req.user.id } });
    if (!supplier) return res.status(404).json({ message: 'Supplier not found' });
    const threadInclude = db.ComplementMessage
      ? [
          {
            model: db.ComplementMessage,
            as: 'messages',
            separate: true,
            order: [['createdAt', 'ASC']],
            include: complementMessageInclude
          }
        ]
      : [];
    const complements = await db.ComplementRequest.findAll({
      where: { supplierId: supplier.id },
      include: [
        { model: db.Procedure, as: 'procedure', attributes: ['id', 'title', 'status'] },
        ...threadInclude
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json({ complements: complements.map(serializeComplementThread) });
  } catch (error) {
    console.error('List complements error:', error);
    res.status(500).json({ message: 'Error listing complements', error: error.message });
  }
};

const submitEspd = async (req, res) => {
  try {
    const ent = await assertEntitlement(req.user.id, 'tender.espd_exclusion');
    if (!ent.ok) return res.status(403).json({ message: ent.message });
    const supplier = await db.Supplier.findOne({ where: { userId: req.user.id } });
    if (!supplier) return res.status(404).json({ message: 'Supplier not found' });
    const procedure = await db.Procedure.findByPk(req.params.procedureId);
    if (!procedure) return res.status(404).json({ message: 'Procedure not found' });
    const [row] = await db.EspdDeclaration.findOrCreate({
      where: { procedureId: procedure.id, supplierId: supplier.id },
      defaults: {
        exclusionGroundsOk: !!req.body.exclusionGroundsOk,
        declarationText: req.body.declarationText || null,
        submittedAt: new Date()
      }
    });
    await row.update({
      exclusionGroundsOk: !!req.body.exclusionGroundsOk,
      declarationText: req.body.declarationText !== undefined ? req.body.declarationText : row.declarationText,
      submittedAt: new Date()
    });
    await logAudit({
      actorUserId: req.user.id,
      action: 'procedure.espd_submit',
      entityType: 'procedure',
      entityId: procedure.id,
      meta: { supplierId: supplier.id }
    });
    res.json({ message: 'ESPD declaration saved', espd: row });
  } catch (error) {
    console.error('Submit ESPD error:', error);
    res.status(500).json({ message: 'Error saving ESPD', error: error.message });
  }
};

const unsealIfDue = async (req, res) => {
  try {
    const ent = await assertEntitlement(req.user.id, 'tender.sealed_deadline');
    if (!ent.ok) return res.status(403).json({ message: ent.message });

    const entity = await getBuyerEntity(req.user.id);
    const check = await assertBuyerApproved(entity);
    if (!check.ok) return res.status(check.status).json({ message: check.message });
    const procedure = await db.Procedure.findByPk(req.params.procedureId);
    if (!procedure || procedure.procuringEntityId !== entity.id) {
      return res.status(404).json({ message: 'Procedure not found' });
    }
    const now = new Date();
    const until = procedure.sealedUntil ? new Date(procedure.sealedUntil) : null;
    if (procedure.isSealed && until && until > now) {
      return res.status(403).json({ message: 'Bids remain sealed until deadline', sealedUntil: procedure.sealedUntil });
    }
    await procedure.update({ isSealed: false, status: procedure.status === 'bidding' || procedure.status === 'published' || procedure.status === 'qa_open' ? 'evaluation' : procedure.status });
    await logAudit({
      actorUserId: req.user.id,
      action: 'procedure.unseal',
      entityType: 'procedure',
      entityId: procedure.id
    });
    res.json({ message: 'Procedure unsealed', procedure });
  } catch (error) {
    console.error('Unseal error:', error);
    res.status(500).json({ message: 'Error unsealing', error: error.message });
  }
};

const listAuditForProcedure = async (req, res) => {
  try {
    const events = await db.AuditEvent.findAll({
      where: { entityType: 'procedure', entityId: req.params.procedureId },
      order: [['createdAt', 'DESC']],
      limit: 100
    });
    res.json({ events });
  } catch (error) {
    console.error('List audit error:', error);
    res.status(500).json({ message: 'Error listing audit events', error: error.message });
  }
};

module.exports = {
  listBuyerProcedures,
  createProcedure,
  getProcedure,
  updateProcedure,
  listPublishedForSupplier,
  postQaMessage,
  upsertEvaluation,
  createAward,
  linkQuestionnaire,
  publishProcedure,
  unpublishProcedure,
  closeProcedure,
  toggleWatch,
  createComplement,
  respondComplement,
  postComplementMessage,
  downloadComplementAttachment,
  listMyComplements,
  listProcedureComplements,
  submitEspd,
  unsealIfDue,
  listAuditForProcedure
};
