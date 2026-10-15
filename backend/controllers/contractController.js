const db = require('../models');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const {
  getEntitlementsForUser,
  getEffectiveEntitlementsForUser
} = require('../services/entitlementService');
const { logAudit } = require('../services/auditService');
const { sendSimpleHtmlEmail } = require('../services/emailService');
const {
  notifyContractUpdated,
  notifyContractActivity
} = require('../services/supplierNotificationService');

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

function contractIsWritable(contract) {
  return contract && contract.status === 'active';
}

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

async function notifyBuyerContractActivity(contract, summary) {
  const entity =
    contract.procuringEntity ||
    (await db.ProcuringEntity.findByPk(contract.procuringEntityId, {
      include: [{ model: db.User, as: 'user', attributes: ['email', 'firstName', 'lastName'] }]
    }));
  const email = entity?.user?.email;
  if (!email) return;
  const subject = `Contract update: ${contract.title}`;
  const html = `<p>${summary}</p><p>Log in to Prequaliq to view the contract thread.</p>`;
  sendSimpleHtmlEmail(email, subject, html).catch((err) => {
    console.error('Failed to email buyer about contract activity:', err);
  });
}

async function notifySupplierOnContract(contract, summary) {
  if (!contract.supplierId) return;
  const supplier =
    contract.supplier ||
    (await db.Supplier.findByPk(contract.supplierId, {
      include: [{ model: db.User, as: 'user', attributes: ['email', 'firstName', 'lastName'] }]
    }));
  if (supplier) {
    await notifyContractActivity(supplier, contract.title, summary);
    const email = supplier.user?.email;
    if (email) {
      const subject = `Contract update: ${contract.title}`;
      const html = `<p>${summary}</p><p>Log in to Prequaliq to view the contract.</p>`;
      sendSimpleHtmlEmail(email, subject, html).catch((err) => {
        console.error('Failed to email supplier about contract:', err);
      });
    }
  }
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

    const contract = await db.Contract.create({
      procuringEntityId: entity.id,
      supplierId: req.body.supplierId || null,
      procedureId: req.body.procedureId || null,
      title,
      contractNumber: req.body.contractNumber || null,
      contractType: req.body.contractType || 'standard',
      parentContractId: req.body.parentContractId || null,
      startDate: req.body.startDate || null,
      endDate: req.body.endDate || null,
      valueAmount: req.body.valueAmount ?? null,
      status: req.body.status || 'draft',
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
    const updates = {};
    ['title', 'contractNumber', 'contractType', 'status', 'notes', 'startDate', 'endDate', 'supplierId', 'procedureId'].forEach((k) => {
      if (req.body[k] !== undefined) updates[k] = req.body[k];
    });
    if (req.body.valueAmount !== undefined) updates.valueAmount = req.body.valueAmount;
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
      supplierId: req.body.supplierId || parent.supplierId,
      procedureId: req.body.procedureId || null,
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
    await runContractUpload(req, res);
    const contract = await db.Contract.findByPk(req.params.contractId);
    const access = await assertContractAccess(req, contract);
    if (!access.ok) return res.status(access.status).json({ message: access.message });
    if (!contractIsWritable(contract)) {
      return res.status(403).json({ message: 'Contract is read-only' });
    }
    const body = (req.body.body || req.body.message || '').trim();
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
    if (senderRole === 'supplier') {
      await notifyBuyerContractActivity(contract, summary);
    } else {
      await notifySupplierOnContract(contract, summary);
    }
    const full = await loadContractForDetail(contract.id);
    res.status(201).json({ message: 'Message posted', contract: serializeContractDetail(full) });
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
