const path = require('path');
const fs = require('fs');
const { Op } = require('sequelize');
const db = require('../models');

const SAFE_FILE_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

function uploadsRoot() {
  return path.resolve(process.env.UPLOAD_PATH || './uploads');
}

/** Absolute path of a stored document, or null when it is missing or outside the uploads folder. */
function resolveStoredFile(filePath) {
  const base = path.basename(String(filePath || ''));
  if (!SAFE_FILE_NAME.test(base)) return null;
  const full = path.join(uploadsRoot(), base);
  return fs.existsSync(full) ? full : null;
}

function findDocumentByFileName(fileName) {
  if (!SAFE_FILE_NAME.test(fileName)) return null;
  return db.Document.findOne({
    where: { [Op.or]: [{ filePath: fileName }, { filePath: { [Op.endsWith]: `/${fileName}` } }] }
  });
}

function isSealedNow(procedure) {
  if (!procedure?.isSealed) return false;
  const until = procedure.sealedUntil ? new Date(procedure.sealedUntil) : null;
  return !until || until > new Date();
}

/**
 * Who may open a stored document:
 * - platform admin: everything
 * - supplier: their own files, and files a buyer attached to a question
 * - buyer: their own files; a supplier's bid attachment only when the bid was submitted to
 *   one of their questionnaires and the procedure is unsealed; a supplier's profile
 *   documents (certificates, insurance) as before
 */
async function canAccessDocument(user, doc) {
  if (!user || !doc) return false;
  if (user.role === 'admin') return true;

  if (user.role === 'supplier') {
    const supplier = await db.Supplier.findOne({ where: { userId: user.id }, attributes: ['id'] });
    if (!supplier) return false;
    if (doc.supplierId) return doc.supplierId === supplier.id;
    const attached = await db.Question.count({ where: { attachedDocumentId: doc.id } });
    return attached > 0;
  }

  if (user.role === 'procuring_entity') {
    const entity = await db.ProcuringEntity.findOne({ where: { userId: user.id }, attributes: ['id'] });
    if (!entity) return false;
    if (doc.procuringEntityId) return doc.procuringEntityId === entity.id;
    if (!doc.supplierId) return false;

    // Profile documents (certificates, insurance) stay visible to buyers as before.
    if (doc.documentType !== 'questionnaire_answer') return true;

    const answers = await db.Answer.findAll({
      where: { documentId: doc.id },
      attributes: ['id'],
      include: [{
        model: db.QuestionnaireResponse,
        as: 'response',
        attributes: ['id', 'status', 'procedureId', 'questionnaireId'],
        required: true,
        include: [{
          model: db.Questionnaire,
          as: 'questionnaire',
          attributes: ['id', 'procuringEntityId'],
          required: true
        }]
      }]
    });
    for (const answer of answers) {
      const response = answer.response;
      if (response.status !== 'submitted') continue;
      if (response.questionnaire.procuringEntityId !== entity.id) continue;
      const procedure = await db.Procedure.findOne({
        where: response.procedureId
          ? { id: response.procedureId, procuringEntityId: entity.id }
          : { questionnaireId: response.questionnaireId, procuringEntityId: entity.id },
        order: [['updatedAt', 'DESC']]
      });
      if (!isSealedNow(procedure)) return true;
    }
    return false;
  }

  return false;
}

module.exports = { canAccessDocument, resolveStoredFile, findDocumentByFileName, SAFE_FILE_NAME };
