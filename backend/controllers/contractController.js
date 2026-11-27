const db = require('../models');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const {
  getEntitlementsForUser,
  getEffectiveEntitlementsForUser
} = require('../services/entitlementService');
const { logAudit } = require('../services/auditService');
const { sendContractActivityEmail } = require('../services/emailService');
const { createForUser: createUserNotification } = require('../services/notificationService');
const {
  notifyContractUpdated,
  notifyContractActivity
} = require('../services/supplierNotificationService');
const { contractIsWritable } = require('../utils/contractWriteAccess');

const contractStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const uploadPath = path.join(process.env.UPLOAD_PATH || './uploads', 'contracts');
    if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname || '').toLowerCase();
    const safeExt = ['.jpeg', '.jpg', '.png', '.pdf', '.doc', '.docx', '.xls', '.xlsx'].includes(ext)
      ? ext
      : '';
    cb(null, `contract-${uniqueSuffix}${safeExt}`);
  }
});

const CONTRACT_MIME_BY_EXT = {
  '.jpg': ['image/jpeg'],
  '.jpeg': ['image/jpeg'],
  '.png': ['image/png'],
  '.pdf': ['application/pdf'],
  '.doc': ['application/msword'],
  '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  '.xls': ['application/vnd.ms-excel'],
  '.xlsx': ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
};

const contractFileFilter = (_req, file, cb) => {
  const ext = path.extname(file.originalname || '').toLowerCase();
  const allowedMimes = CONTRACT_MIME_BY_EXT[ext];
  if (allowedMimes && allowedMimes.includes(file.mimetype)) return cb(null, true);
  cb(new Error('Invalid file type. Only images, PDFs, and Office documents are allowed.'));
};

const contractUpload = multer({
  storage: contractStorage,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 10 * 1024 * 1024, files: 10 },
  fileFilter: contractFileFilter
}).array('files', 10);

function runContractUpload(req, res) {
  return new Promise((resolve, reject) => {
    contractUpload(req, res, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

const contractMessageInclude = [
  { model: db.User, as: 'sender', attributes: ['id', 'firstName', 'lastName', 'role'] },
  { model: db.ContractAttachment, as: 'attachments', required: false }
];

async function loadContractForDetail(contractId) {
  return db.Contract.findByPk(contractId, {
    include: [
      { model: db.Supplier, as: 'supplier', attributes: ['id', 'companyName', 'userId'] },
      { model: db.ProcuringEntity, as: 'procuringEntity', attributes: ['id', 'entityName', 'userId'] },
      { model: db.Procedure, as: 'procedure', attributes: ['id', 'title', 'status', 'referenceNumber'] },
      { model: db.Contract, as: 'callOffs', attributes: ['id', 'title', 'status', 'contractType'] },
      ...(db.ContractMessage
        ? [{
          model: db.ContractMessage,
          as: 'messages',
          separate: true,
          order: [['createdAt', 'ASC']],
          include: contractMessageInclude
        }]
        : [])
    ]
  });
}

function serializeContractDetail(contract) {
  const json = contract.toJSON ? contract.toJSON() : contract;
  return json;
}

async function assertContractAccess(req, contract) {
  if (!contract) return { ok: false, status: 404, message: 'Contract not found' };
  if (req.user.role === 'procuring_entity') {
    const entity = await db.ProcuringEntity.findOne({ where: { userId: req.user.id } });
    if (!entity || contract.procuringEntityId !== entity.id) {
      return { ok: false, status: 404, message: 'Contract not found' };
    }
    return { ok: true, entity };
  }
  if (req.user.role === 'supplier') {
    const supplier = await db.Supplier.findOne({ where: { userId: req.user.id } });
    if (!supplier || contract.supplierId !== supplier.id) {
      return { ok: false, status: 404, message: 'Contract not found' };
    }
    return { ok: true, supplier };
  }
  return { ok: false, status: 403, message: 'Forbidden' };
}

async function saveContractAttachments(contractId, messageId, files, userId) {
  if (!files || !files.length || !db.ContractAttachment) return [];
  const rows = [];
  for (const file of files) {
    const relPath = path.join('contracts', file.filename).replace(/\\/g, '/');
    const row = await db.ContractAttachment.create({
      contractId,
      messageId,
      fileName: file.originalname,
      filePath: relPath,
      mimeType: file.mimetype,
      size: file.size,
      uploadedByUserId: userId
    });
    rows.push(row);
  }
  return rows;
}

/** Loads the two parties with the sign-in user of each, for notices about a contract. */
async function loadContractParties(contract) {
  const userInclude = [{ model: db.User, as: 'user', attributes: ['id', 'email', 'firstName', 'lastName'] }];
  const [entity, supplier] = await Promise.all([
    db.ProcuringEntity.findByPk(contract.procuringEntityId, { include: userInclude }),
    contract.supplierId ? db.Supplier.findByPk(contract.supplierId, { include: userInclude }) : null
  ]);
  return { entity, supplier };
}

/** Buyer side: bell notification plus an email with the contract facts. extra: { message, reason } */
async function notifyBuyerContractActivity(contract, summary, extra = {}) {
  const { entity, supplier } = await loadContractParties(contract);
  if (!entity?.user) return;
  try {
    await createUserNotification(entity.user.id, {
      type: 'contract_activity',
      title: 'Contract activity',
      message: `${contract.title}: ${summary}`,
      linkTab: 'contracts',
      meta: { contractId: contract.id }
    });
  } catch (err) {
    console.warn('[contracts] buyer notification failed:', err.message);
  }
  if (!entity.user.email) return;
  sendContractActivityEmail(entity.user.email, entity.user.firstName, {
    contractTitle: contract.title,
    contractNumber: contract.contractNumber,
    counterpart: supplier?.companyName,
    counterpartLabel: 'Supplier',
    summary,
    ...extra
  }).catch((err) => {
    console.error('Failed to email buyer about contract activity:', err);
  });
}

/** Supplier side: bell notification plus an email with the contract facts. extra: { message, reason } */
async function notifySupplierOnContract(contract, summary, extra = {}) {
  if (!contract.supplierId) return;
  const { entity, supplier } = await loadContractParties(contract);
  if (!supplier) return;
  await notifyContractActivity(supplier, contract.title, summary);
  if (!supplier.user?.email) return;
  sendContractActivityEmail(supplier.user.email, supplier.user.firstName, {
    contractTitle: contract.title,
    contractNumber: contract.contractNumber,
    counterpart: entity?.entityName,
    counterpartLabel: 'Buyer',
    summary,
    ...extra
  }).catch((err) => {
    console.error('Failed to email supplier about contract:', err);
  });
}

async function assertEntitlement(userId, key) {
  try {
    const map = String(key).startsWith('ai.')
      ? await getEffectiveEntitlementsForUser(userId)
      : await getEntitlementsForUser(userId);
    if (map[key] === false) return { ok: false, message: `Feature not enabled: ${key}` };
  } catch (_e) {}
  return { ok: true };
}

const CREATABLE_CONTRACT_TYPES = ['standard', 'framework', 'dis'];
const CLOSED_CONTRACT_STATUSES = ['terminated', 'expired'];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** A buyer may only link an approved supplier and one of their own procedures. */
async function resolveContractLinks(entity, body) {
  let supplierId = null;
  let procedureId = null;
  if (body.supplierId) {
    if (!UUID_RE.test(String(body.supplierId))) return { ok: false, status: 400, message: 'Invalid supplier' };
    const supplier = await db.Supplier.findOne({ where: { id: body.supplierId, status: 'approved' } });
    if (!supplier) return { ok: false, status: 404, message: 'Supplier not found' };
    supplierId = supplier.id;
  }
  if (body.procedureId) {
    if (!UUID_RE.test(String(body.procedureId))) return { ok: false, status: 400, message: 'Invalid procedure' };
    const procedure = await db.Procedure.findOne({
      where: { id: body.procedureId, procuringEntityId: entity.id }
    });
    if (!procedure) return { ok: false, status: 404, message: 'Procedure not found' };
    procedureId = procedure.id;
  }
  return { ok: true, supplierId, procedureId };
}

function checkContractDates(startDate, endDate) {
  if (startDate && endDate && String(endDate).slice(0, 10) < String(startDate).slice(0, 10)) {
    return { ok: false, message: 'End date cannot be before the start date' };
  }
  return { ok: true };
}

async function nextContractNumber(entityId) {
  const year = new Date().getFullYear();
  const count = await db.Contract.count({ where: { procuringEntityId: entityId } });
  return `CTR-${year}-${String(1001 + count)}`;
}

const listBuyerContracts = async (req, res) => {
  try {
    const ent = await assertEntitlement(req.user.id, 'contracts.repository');
    if (!ent.ok) return res.status(403).json({ message: ent.message });
    const entity = await db.ProcuringEntity.findOne({ where: { userId: req.user.id } });
    if (!entity) return res.status(404).json({ message: 'Procuring entity not found' });
    const contracts = await db.Contract.findAll({
      where: { procuringEntityId: entity.id },
      include: [
        { model: db.Supplier, as: 'supplier', attributes: ['id', 'companyName'] },
        { model: db.Procedure, as: 'procedure', attributes: ['id', 'title', 'status', 'referenceNumber'] },
        { model: db.Contract, as: 'callOffs', attributes: ['id', 'title', 'status', 'contractType'] }
      ],
      order: [['updatedAt', 'DESC']]
    });
    res.json({ contracts });
  } catch (error) {
    console.error('List contracts error:', error);
    res.status(500).json({ message: 'Error listing contracts', error: error.message });
  }
};

const listSupplierContracts = async (req, res) => {
  try {
    const ent = await assertEntitlement(req.user.id, 'contracts.repository');
    if (!ent.ok) return res.status(403).json({ message: ent.message });
    const supplier = await db.Supplier.findOne({ where: { userId: req.user.id } });
    if (!supplier) return res.status(404).json({ message: 'Supplier not found' });
    const contracts = await db.Contract.findAll({
      where: { supplierId: supplier.id },
      include: [
        { model: db.ProcuringEntity, as: 'procuringEntity', attributes: ['id', 'entityName'] },
        { model: db.Procedure, as: 'procedure', attributes: ['id', 'title', 'status', 'referenceNumber'] }
      ],
      order: [['updatedAt', 'DESC']]
    });
    res.json({ contracts });
  } catch (error) {
    console.error('List supplier contracts error:', error);
    res.status(500).json({ message: 'Error listing contracts', error: error.message });
  }
};

const createContract = async (req, res) => {
  try {
    const ent = await assertEntitlement(req.user.id, 'contracts.repository');
    if (!ent.ok) return res.status(403).json({ message: ent.message });
    const entity = await db.ProcuringEntity.findOne({ where: { userId: req.user.id } });
    if (!entity || entity.status !== 'approved') {
      return res.status(403).json({ message: 'Approved procuring entity required' });
    }
    const title = (req.body.title || '').trim();
    if (!title) return res.status(400).json({ message: 'Title is required' });

    const links = await resolveContractLinks(entity, req.body);
    if (!links.ok) return res.status(links.status).json({ message: links.message });
    const contractType = CREATABLE_CONTRACT_TYPES.includes(req.body.contractType)
      ? req.body.contractType
      : 'standard';
    const dates = checkContractDates(req.body.startDate || null, req.body.endDate || null);
    if (!dates.ok) return res.status(400).json({ message: dates.message });

    const contract = await db.Contract.create({
      procuringEntityId: entity.id,
      supplierId: links.supplierId,
      procedureId: links.procedureId,
      title,
      contractNumber: String(req.body.contractNumber || '').trim() || (await nextContractNumber(entity.id)),
      contractType,
      parentContractId: null,
      startDate: req.body.startDate || null,
      endDate: req.body.endDate || null,
      valueAmount: req.body.valueAmount ?? null,
      // A contract starts as a draft or active. It ends only through the end-contract action.
      status: req.body.status === 'active' ? 'active' : 'draft',
      notes: req.body.notes || null,
      createdBy: req.user.id
    });
    await logAudit({
      actorUserId: req.user.id,
      action: 'contract.create',
      entityType: 'contract',
      entityId: contract.id
    });
    res.status(201).json({ message: 'Contract created', contract });
  } catch (error) {
    console.error('Create contract error:', error);
    res.status(500).json({ message: 'Error creating contract', error: error.message });
  }
};

const updateContract = async (req, res) => {
  try {
    const ent = await assertEntitlement(req.user.id, 'contracts.repository');
    if (!ent.ok) return res.status(403).json({ message: ent.message });
    const entity = await db.ProcuringEntity.findOne({ where: { userId: req.user.id } });
    if (!entity) return res.status(404).json({ message: 'Procuring entity not found' });
    const contract = await db.Contract.findByPk(req.params.contractId);
    if (!contract || contract.procuringEntityId !== entity.id) {
      return res.status(404).json({ message: 'Contract not found' });
    }
    if (CLOSED_CONTRACT_STATUSES.includes(contract.status)) {
      return res.status(409).json({ message: 'This contract has ended and can no longer be changed.' });
    }
    const isDraft = contract.status === 'draft';
    const updates = {};
    // Always editable while the contract is open.
    ['title', 'notes', 'endDate'].forEach((k) => {
      if (req.body[k] !== undefined) updates[k] = req.body[k];
    });
    if (updates.title !== undefined) {
      updates.title = String(updates.title || '').trim();
      if (!updates.title) return res.status(400).json({ message: 'Title is required' });
    }
    // Terms are fixed once the contract is active.
    if (isDraft) {
      ['startDate'].forEach((k) => {
        if (req.body[k] !== undefined) updates[k] = req.body[k] || null;
      });
      if (req.body.status === 'active') updates.status = 'active';
    }
    // The value is fixed once set; an award-created contract starts active without one.
    if (req.body.valueAmount !== undefined && (isDraft || contract.valueAmount == null)) {
      updates.valueAmount = req.body.valueAmount === '' ? null : req.body.valueAmount;
    }
    if (updates.endDate !== undefined) updates.endDate = updates.endDate || null;
    // Identity of the contract: number, type, supplier and procedure can be filled in
    // once while empty, and never changed afterwards.
    if (!contract.contractNumber && req.body.contractNumber) {
      updates.contractNumber = String(req.body.contractNumber).trim() || null;
    }
    if (!contract.supplierId || !contract.procedureId) {
      const links = await resolveContractLinks(entity, {
        supplierId: contract.supplierId ? null : req.body.supplierId,
        procedureId: contract.procedureId ? null : req.body.procedureId
      });
      if (!links.ok) return res.status(links.status).json({ message: links.message });
      if (!contract.supplierId && links.supplierId) updates.supplierId = links.supplierId;
      if (!contract.procedureId && links.procedureId) updates.procedureId = links.procedureId;
    }
    const dates = checkContractDates(
      updates.startDate !== undefined ? updates.startDate : contract.startDate,
      updates.endDate !== undefined ? updates.endDate : contract.endDate
    );
    if (!dates.ok) return res.status(400).json({ message: dates.message });
    const changedFields = Object.keys(updates).filter((k) => {
      const oldVal = contract.getDataValue(k);
      const newVal = updates[k];
      return String(oldVal ?? '') !== String(newVal ?? '');
    });
    await contract.update(updates);
    await contract.reload();
    if (changedFields.length && contract.supplierId) {
      const supplier = await db.Supplier.findByPk(contract.supplierId);
      if (supplier) {
        await notifyContractUpdated(supplier, contract.title, changedFields);
      }
    }
    await logAudit({
      actorUserId: req.user.id,
      action: 'contract.update',
      entityType: 'contract',
      entityId: contract.id,
      meta: { fields: changedFields.length ? changedFields : Object.keys(updates) }
    });
    res.json({ message: 'Contract updated', contract });
  } catch (error) {
    console.error('Update contract error:', error);
    res.status(500).json({ message: 'Error updating contract', error: error.message });
  }
};

const createCallOff = async (req, res) => {
  try {
    const ent = await assertEntitlement(req.user.id, 'contracts.call_offs');
    if (!ent.ok) return res.status(403).json({ message: ent.message });
    const entity = await db.ProcuringEntity.findOne({ where: { userId: req.user.id } });
    if (!entity) return res.status(404).json({ message: 'Procuring entity not found' });
    const parent = await db.Contract.findByPk(req.params.contractId);
    if (!parent || parent.procuringEntityId !== entity.id || parent.contractType !== 'framework') {
      return res.status(400).json({ message: 'Parent framework contract not found' });
    }
    const title = (req.body.title || `${parent.title} — call-off`).trim();
    const callOff = await db.Contract.create({
      procuringEntityId: entity.id,
      supplierId: parent.supplierId,
      procedureId: parent.procedureId || null,
      title,
      contractType: 'call_off',
      parentContractId: parent.id,
      startDate: req.body.startDate || null,
      endDate: req.body.endDate || null,
      valueAmount: req.body.valueAmount ?? null,
      status: 'active',
      notes: req.body.notes || null,
      createdBy: req.user.id
    });
    await logAudit({
      actorUserId: req.user.id,
      action: 'contract.call_off',
      entityType: 'contract',
      entityId: callOff.id,
      meta: { parentContractId: parent.id }
    });
    res.status(201).json({ message: 'Call-off created', contract: callOff });
  } catch (error) {
    console.error('Create call-off error:', error);
    res.status(500).json({ message: 'Error creating call-off', error: error.message });
  }
};

const applyDis = async (req, res) => {
  try {
    const ent = await assertEntitlement(req.user.id, 'tender.dis');
    if (!ent.ok) return res.status(403).json({ message: ent.message });
    const supplier = await db.Supplier.findOne({ where: { userId: req.user.id } });
    if (!supplier) return res.status(404).json({ message: 'Supplier not found' });
    const procedure = await db.Procedure.findByPk(req.params.procedureId);
    if (!procedure || procedure.procedureType !== 'dis') {
      return res.status(400).json({ message: 'DIS procedure not found' });
    }
    const [row] = await db.DisMembership.findOrCreate({
      where: { procedureId: procedure.id, supplierId: supplier.id },
      defaults: { status: 'applied', notes: req.body.notes || null }
    });
    await logAudit({
      actorUserId: req.user.id,
      action: 'dis.apply',
      entityType: 'procedure',
      entityId: procedure.id,
      meta: { supplierId: supplier.id }
    });
    res.json({ message: 'DIS application recorded', membership: row });
  } catch (error) {
    console.error('Apply DIS error:', error);
    res.status(500).json({ message: 'Error applying to DIS', error: error.message });
  }
};

const listDisMemberships = async (req, res) => {
  try {
    const ent = await assertEntitlement(req.user.id, 'tender.dis');
    if (!ent.ok) return res.status(403).json({ message: ent.message });
    const entity = await db.ProcuringEntity.findOne({ where: { userId: req.user.id } });
    if (!entity) return res.status(404).json({ message: 'Procuring entity not found' });
    const memberships = await db.DisMembership.findAll({
      include: [
        {
          model: db.Procedure,
          as: 'procedure',
          where: { procuringEntityId: entity.id, procedureType: 'dis' },
          attributes: ['id', 'title', 'status']
        },
        { model: db.Supplier, as: 'supplier', attributes: ['id', 'companyName'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json({ memberships });
  } catch (error) {
    console.error('List DIS memberships error:', error);
    res.status(500).json({ message: 'Error listing DIS memberships', error: error.message });
  }
};

const reviewDis = async (req, res) => {
  try {
    const ent = await assertEntitlement(req.user.id, 'tender.dis');
    if (!ent.ok) return res.status(403).json({ message: ent.message });
    const entity = await db.ProcuringEntity.findOne({ where: { userId: req.user.id } });
    if (!entity) return res.status(404).json({ message: 'Procuring entity not found' });
    const membership = await db.DisMembership.findByPk(req.params.membershipId, {
      include: [{ model: db.Procedure, as: 'procedure' }]
    });
    if (!membership || membership.procedure.procuringEntityId !== entity.id) {
      return res.status(404).json({ message: 'Membership not found' });
    }
    const status = req.body.status;
    if (!['admitted', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'status must be admitted or rejected' });
    }
    await membership.update({ status, notes: req.body.notes !== undefined ? req.body.notes : membership.notes });
    await logAudit({
      actorUserId: req.user.id,
      action: 'dis.review',
      entityType: 'dis_membership',
      entityId: membership.id,
      meta: { status }
    });
    res.json({ message: 'DIS membership updated', membership });
  } catch (error) {
    console.error('Review DIS error:', error);
    res.status(500).json({ message: 'Error reviewing DIS', error: error.message });
  }
};

const discoverSuppliers = async (req, res) => {
  try {
    const ent = await assertEntitlement(req.user.id, 'marketplace.supplier_discovery');
    if (!ent.ok) return res.status(403).json({ message: ent.message });
    const { Op } = require('sequelize');
    const q = (req.query.q || '').trim();
    const where = { status: 'approved' };
    if (q) {
      where.companyName = { [Op.iLike]: `%${q}%` };
    }
    const suppliers = await db.Supplier.findAll({
      where,
      include: [
        { model: db.User, as: 'user', attributes: ['email', 'isActive'], where: { isActive: true }, required: true },
        { model: db.CPVCode, as: 'cpvCodes', through: { attributes: [] }, attributes: ['id', 'code', 'description'], required: false }
      ],
      limit: 50,
      order: [['companyName', 'ASC']]
    });
    res.json({ suppliers });
  } catch (error) {
    console.error('Discover suppliers error:', error);
    res.status(500).json({ message: 'Error discovering suppliers', error: error.message });
  }
};

const analyticsSummary = async (req, res) => {
  try {
    const ent = await assertEntitlement(req.user.id, 'platform.analytics');
    if (!ent.ok) return res.status(403).json({ message: ent.message });
    const entity = await db.ProcuringEntity.findOne({ where: { userId: req.user.id } });
    if (!entity) return res.status(404).json({ message: 'Procuring entity not found' });
    const [procedures, contracts, awards] = await Promise.all([
      db.Procedure.count({ where: { procuringEntityId: entity.id } }),
      db.Contract.count({ where: { procuringEntityId: entity.id } }),
      db.AwardDecision.count({
        include: [{ model: db.Procedure, as: 'procedure', where: { procuringEntityId: entity.id }, required: true }]
      })
    ]);
    res.json({
      analytics: {
        procedures,
        contracts,
        awards,
        generatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ message: 'Error loading analytics', error: error.message });
  }
};

/** Buyer ends a draft or active contract. A reason is mandatory and is kept on the contract. */
const terminateContract = async (req, res) => {
  try {
    const ent = await assertEntitlement(req.user.id, 'contracts.repository');
    if (!ent.ok) return res.status(403).json({ message: ent.message });
    const contract = await db.Contract.findByPk(req.params.contractId);
    const access = await assertContractAccess(req, contract);
    if (!access.ok) return res.status(access.status).json({ message: access.message });
    if (CLOSED_CONTRACT_STATUSES.includes(contract.status)) {
      return res.status(409).json({ message: 'This contract has already ended.' });
    }
    const reason = String(req.body.reason || '').trim();
    if (reason.length < 10) {
      return res.status(400).json({ message: 'Give a reason of at least 10 characters for ending the contract.' });
    }
    if (reason.length > 2000) {
      return res.status(400).json({ message: 'The reason can be at most 2000 characters.' });
    }
    await contract.update({
      status: 'terminated',
      terminationReason: reason,
      terminatedAt: new Date(),
      terminatedByUserId: req.user.id
    });
    await db.ContractMessage.create({
      contractId: contract.id,
      senderUserId: req.user.id,
      senderRole: 'procuring_entity',
      kind: 'termination',
      body: reason
    });
    await logAudit({
      actorUserId: req.user.id,
      action: 'contract.terminate',
      entityType: 'contract',
      entityId: contract.id,
      meta: { reason }
    });
    try {
      await notifySupplierOnContract(contract, 'The buyer has ended this contract', { reason });
    } catch (notifyErr) {
      console.warn('[contracts] notify after termination failed:', notifyErr.message);
    }
    const full = await loadContractForDetail(contract.id);
    res.json({ message: 'Contract ended', contract: serializeContractDetail(full) });
  } catch (error) {
    console.error('Terminate contract error:', error);
    res.status(500).json({ message: 'Error ending contract', error: error.message });
  }
};

const getContractDetail = async (req, res) => {
  try {
    const ent = await assertEntitlement(req.user.id, 'contracts.repository');
    if (!ent.ok) return res.status(403).json({ message: ent.message });
    const contract = await loadContractForDetail(req.params.contractId);
    const access = await assertContractAccess(req, contract);
    if (!access.ok) return res.status(access.status).json({ message: access.message });
    res.json({ contract: serializeContractDetail(contract) });
  } catch (error) {
    console.error('Get contract detail error:', error);
    res.status(500).json({ message: 'Error loading contract', error: error.message });
  }
};

const postContractMessage = async (req, res) => {
  try {
    const ent = await assertEntitlement(req.user.id, 'contracts.repository');
    if (!ent.ok) return res.status(403).json({ message: ent.message });
    const contract = await db.Contract.findByPk(req.params.contractId);
    const access = await assertContractAccess(req, contract);
    if (!access.ok) return res.status(access.status).json({ message: access.message });
    if (!contractIsWritable(contract)) {
      return res.status(403).json({ message: 'Contract is read-only' });
    }
    // Files are only accepted once the sender is known to belong to this contract.
    try {
      await runContractUpload(req, res);
    } catch (uploadErr) {
      return res.status(400).json({ message: uploadErr.message || 'Upload failed' });
    }
    const body = String(req.body.body || req.body.message || '').trim().slice(0, 5000);
    if (!body && (!req.files || !req.files.length)) {
      return res.status(400).json({ message: 'Message or attachment is required' });
    }
    const senderRole = req.user.role === 'supplier' ? 'supplier' : 'procuring_entity';
    const msg = await db.ContractMessage.create({
      contractId: contract.id,
      senderUserId: req.user.id,
      senderRole,
      body: body || '(attachment)'
    });
    await saveContractAttachments(contract.id, msg.id, req.files, req.user.id);
    await logAudit({
      actorUserId: req.user.id,
      action: 'contract.message',
      entityType: 'contract',
      entityId: contract.id,
      meta: { messageId: msg.id }
    });
    const summary = senderRole === 'supplier' ? 'New message from supplier' : 'New message from buyer';
    // Notifications must not fail the post — message is already saved
    try {
      if (senderRole === 'supplier') {
        await notifyBuyerContractActivity(contract, summary, { message: body });
      } else {
        await notifySupplierOnContract(contract, summary, { message: body });
      }
    } catch (notifyErr) {
      console.warn('[contracts] notify after message failed:', notifyErr.message);
    }

    let full = null;
    try {
      full = await loadContractForDetail(contract.id);
    } catch (loadErr) {
      console.warn('[contracts] reload after message failed:', loadErr.message);
    }
    res.status(201).json({
      message: 'Message posted',
      contract: full ? serializeContractDetail(full) : { id: contract.id }
    });
  } catch (error) {
    console.error('Post contract message error:', error);
    res.status(500).json({ message: 'Error posting message', error: error.message });
  }
};

const downloadContractAttachment = async (req, res) => {
  try {
    const ent = await assertEntitlement(req.user.id, 'contracts.repository');
    if (!ent.ok) return res.status(403).json({ message: ent.message });
    const attachment = await db.ContractAttachment.findByPk(req.params.attachmentId, {
      include: [{ model: db.Contract, as: 'contract' }]
    });
    if (!attachment?.contract) return res.status(404).json({ message: 'Attachment not found' });
    const access = await assertContractAccess(req, attachment.contract);
    if (!access.ok) return res.status(access.status).json({ message: access.message });
    const candidates = [
      path.join(process.env.UPLOAD_PATH || './uploads', attachment.filePath),
      path.join(process.env.UPLOAD_PATH || './uploads', 'contracts', path.basename(attachment.filePath))
    ];
    const filePath = candidates.find((p) => fs.existsSync(p));
    if (!filePath) return res.status(404).json({ message: 'File not found' });
    res.download(filePath, attachment.fileName);
  } catch (error) {
    console.error('Download contract attachment error:', error);
    res.status(500).json({ message: 'Error downloading attachment', error: error.message });
  }
};

async function handleDeliveryAction(req, res, { role, action, mutate }) {
  try {
    const ent = await assertEntitlement(req.user.id, 'contracts.repository');
    if (!ent.ok) return res.status(403).json({ message: ent.message });
    const contract = await db.Contract.findByPk(req.params.contractId);
    const access = await assertContractAccess(req, contract);
    if (!access.ok) return res.status(access.status).json({ message: access.message });
    if (req.user.role !== role) return res.status(403).json({ message: 'Forbidden' });
    if (!contractIsWritable(contract)) {
      return res.status(403).json({ message: 'Contract is read-only' });
    }
    const result = await mutate(contract, access, req);
    if (result?.error) return res.status(result.status || 400).json({ message: result.error });
    await logAudit({
      actorUserId: req.user.id,
      action,
      entityType: 'contract',
      entityId: contract.id,
      meta: result?.meta || {}
    });
    const full = await loadContractForDetail(contract.id);
    res.json({ message: result?.message || 'Updated', contract: serializeContractDetail(full) });
  } catch (error) {
    console.error(`${action} error:`, error);
    res.status(500).json({ message: 'Error updating delivery status', error: error.message });
  }
}

const markDeliveryDone = (req, res) =>
  handleDeliveryAction(req, res, {
    role: 'supplier',
    action: 'contract.delivery.mark_done',
    mutate: async (contract) => {
      if (!['none', 'changes_requested'].includes(contract.deliveryStatus)) {
        return { error: 'Delivery cannot be marked done in the current state', status: 400 };
      }
      await contract.update({ deliveryStatus: 'marked_done' });
      await notifyBuyerContractActivity(contract, 'Supplier marked work as done');
      return { message: 'Work marked as done', meta: { deliveryStatus: 'marked_done' } };
    }
  });

const acceptDelivery = (req, res) =>
  handleDeliveryAction(req, res, {
    role: 'procuring_entity',
    action: 'contract.delivery.accept',
    mutate: async (contract) => {
      if (contract.deliveryStatus !== 'marked_done') {
        return { error: 'No delivery pending acceptance', status: 400 };
      }
      await contract.update({ deliveryStatus: 'accepted' });
      await notifySupplierOnContract(contract, 'Buyer accepted delivery');
      return { message: 'Delivery accepted', meta: { deliveryStatus: 'accepted' } };
    }
  });

const requestDeliveryChanges = (req, res) =>
  handleDeliveryAction(req, res, {
    role: 'procuring_entity',
    action: 'contract.delivery.request_changes',
    mutate: async (contract, _access, request) => {
      if (contract.deliveryStatus !== 'marked_done') {
        return { error: 'No delivery to review', status: 400 };
      }
      const message = (request.body.message || '').trim();
      if (!message) return { error: 'Message is required when requesting changes', status: 400 };
      await contract.update({ deliveryStatus: 'changes_requested' });
      await db.ContractMessage.create({
        contractId: contract.id,
        senderUserId: request.user.id,
        senderRole: 'procuring_entity',
        body: message
      });
      await notifySupplierOnContract(contract, 'Buyer requested changes to delivery');
      return { message: 'Changes requested', meta: { deliveryStatus: 'changes_requested' } };
    }
  });

const reopenDelivery = (req, res) =>
  handleDeliveryAction(req, res, {
    role: 'procuring_entity',
    action: 'contract.delivery.reopen',
    mutate: async (contract) => {
      if (contract.deliveryStatus !== 'accepted') {
        return { error: 'Only accepted deliveries can be reopened', status: 400 };
      }
      await contract.update({ deliveryStatus: 'none' });
      await notifySupplierOnContract(contract, 'Buyer reopened the contract for further work');
      return { message: 'Delivery reopened', meta: { deliveryStatus: 'none' } };
    }
  });

module.exports = {
  listBuyerContracts,
  listSupplierContracts,
  getContractDetail,
  terminateContract,
  createContract,
  updateContract,
  postContractMessage,
  downloadContractAttachment,
  markDeliveryDone,
  acceptDelivery,
  requestDeliveryChanges,
  reopenDelivery,
  createCallOff,
  applyDis,
  listDisMemberships,
  reviewDis,
  discoverSuppliers,
  analyticsSummary
};
