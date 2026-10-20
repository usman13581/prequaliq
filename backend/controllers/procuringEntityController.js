const db = require('../models');
const { Op } = require('sequelize');
const fs = require('fs');
const { profileAiUpload, mapAiErrorResponse } = require('../utils/profileAiUpload');
const { extractTextFromPdf } = require('../services/pdfTextService');
const { processDocumentsForProfile } = require('../services/procuringEntityProfileAiService');
const { generateQuestionnaireDraft, understandQuestionnaireDescription } = require('../services/questionnaireAiService');
const { validateQuestionnaireDescription } = require('../services/questionnaireDescriptionValidation');
const { getEffectiveEntitlementsForUser } = require('../services/entitlementService');

async function assertEntitlement(userId, key) {
  const map = await getEffectiveEntitlementsForUser(userId);
  if (map[key] === false) {
    return { ok: false, message: `Feature not enabled: ${key}` };
  }
  return { ok: true };
}

/** Collect supplier IDs linked to this buyer via bids, invites, or contracts. */
async function collectMySupplierIds(entityId) {
  const related = new Set();
  const relationBySupplier = {};

  const ensure = (sid) => {
    if (!sid) return;
    related.add(sid);
    if (!relationBySupplier[sid]) {
      relationBySupplier[sid] = { applied: false, invited: false, contracted: false };
    }
  };

  const questionnaires = await db.Questionnaire.findAll({
    where: { procuringEntityId: entityId },
    attributes: ['id']
  });
  const questionnaireIds = questionnaires.map((q) => q.id);
  if (questionnaireIds.length) {
    const responses = await db.QuestionnaireResponse.findAll({
      where: {
        questionnaireId: { [Op.in]: questionnaireIds },
        status: 'submitted'
      },
      attributes: ['supplierId'],
      raw: true
    });
    responses.forEach((r) => {
      ensure(r.supplierId);
      relationBySupplier[r.supplierId].applied = true;
    });
  }

  if (db.Procedure && db.ProcedureInvite) {
    const procedures = await db.Procedure.findAll({
      where: { procuringEntityId: entityId },
      attributes: ['id']
    });
    const procedureIds = procedures.map((p) => p.id);
    if (procedureIds.length) {
      const invites = await db.ProcedureInvite.findAll({
        where: { procedureId: { [Op.in]: procedureIds } },
        attributes: ['supplierId'],
        raw: true
      });
      invites.forEach((inv) => {
        ensure(inv.supplierId);
        relationBySupplier[inv.supplierId].invited = true;
      });
    }
  }

  if (db.Contract) {
    const contracts = await db.Contract.findAll({
      where: {
        procuringEntityId: entityId,
        supplierId: { [Op.ne]: null }
      },
      attributes: ['supplierId'],
      raw: true
    });
    contracts.forEach((c) => {
      ensure(c.supplierId);
      relationBySupplier[c.supplierId].contracted = true;
    });
  }

  return { supplierIds: [...related], relationBySupplier };
}

// Get procuring entity profile
const getProfile = async (req, res) => {
  try {
    const entity = await db.ProcuringEntity.findOne({
      where: { userId: req.user.id },
      include: [
        {
          model: db.User,
          as: 'user',
          attributes: { exclude: ['password'] }
        },
        {
          model: db.Company,
          as: 'company'
        },
        {
          model: db.Document,
          as: 'documents',
          where: { documentType: { [Op.ne]: 'question_attachment' } },
          required: false
        }
      ]
    });

    if (!entity) {
      return res.status(404).json({ message: 'Procuring entity profile not found' });
    }

    res.json({ procuringEntity: entity });
  } catch (error) {
    console.error('Get procuring entity profile error:', error);
    res.status(500).json({ message: 'Error fetching profile', error: error.message });
  }
};

// Update procuring entity profile
const updateProfile = async (req, res) => {
  try {
    const entity = await db.ProcuringEntity.findOne({
      where: { userId: req.user.id },
      include: [{ model: db.User, as: 'user' }]
    });
    if (!entity) {
      return res.status(404).json({ message: 'Procuring entity profile not found' });
    }

    const { firstName, lastName, email, phone, entityName, address, city, country } = req.body;

    const materialFields = { entityName, address, city, country };
    const materialChanged = Object.entries(materialFields).some(([key, val]) => {
      if (val === undefined) return false;
      const normalized = typeof val === 'string' ? val.trim() : val;
      const old = entity.getDataValue(key);
      const oldNorm = old == null ? '' : String(old).trim();
      const newNorm = normalized == null ? '' : String(normalized);
      return oldNorm !== newNorm;
    });
    const statusUpdates =
      entity.status === 'approved' && materialChanged ? { status: 'pending' } : {};

    // Update User fields (firstName, lastName, email, phone)
    if (entity.user) {
      await entity.user.update({
        ...(firstName !== undefined && { firstName: firstName.trim() }),
        ...(lastName !== undefined && { lastName: lastName.trim() }),
        ...(email !== undefined && { email: email.trim() }),
        ...(phone !== undefined && { phone: phone?.trim() || null })
      });
    }

    // Update ProcuringEntity fields (entityName, address, city, country, phone)
    await entity.update({
      ...(entityName !== undefined && { entityName: entityName.trim() }),
      ...(address !== undefined && { address: address?.trim() || null }),
      ...(city !== undefined && { city: city?.trim() || null }),
      ...(country !== undefined && { country: country?.trim() || null }),
      ...(phone !== undefined && { phone: phone?.trim() || null }),
      ...statusUpdates
    });

    const updatedEntity = await db.ProcuringEntity.findByPk(entity.id, {
      include: [
        {
          model: db.User,
          as: 'user',
          attributes: { exclude: ['password'] }
        },
        {
          model: db.Company,
          as: 'company'
        },
        {
          model: db.Document,
          as: 'documents',
          where: { documentType: { [Op.ne]: 'question_attachment' } },
          required: false
        }
      ]
    });

    res.json({ message: 'Profile updated successfully', procuringEntity: updatedEntity });
  } catch (error) {
    console.error('Update procuring entity profile error:', error);
    res.status(500).json({ message: 'Error updating profile', error: error.message });
  }
};

// Get approved suppliers who submitted to current entity's questionnaires (Search Suppliers)
const getSuppliers = async (req, res) => {
  try {
    const entity = await db.ProcuringEntity.findOne({
      where: { userId: req.user.id }
    });
    if (!entity) {
      return res.status(404).json({ message: 'Procuring entity not found' });
    }

    const {
      search,
      city,
      country,
      minTurnover,
      maxTurnover,
      cpvCodeId,
      nutsCodeId,
      scope: scopeRaw = 'discover',
      page = 1,
      limit = 20
    } = req.query;

    const scope = String(scopeRaw).toLowerCase() === 'mine' ? 'mine' : 'discover';

    if (scope === 'discover') {
      const ent = await assertEntitlement(req.user.id, 'marketplace.supplier_discovery');
      if (!ent.ok) return res.status(403).json({ message: ent.message });
    }

    let relationBySupplier = {};
    const and = [{ status: 'approved' }];

    // Hide expired qualifications (still visible if never set)
    and.push({
      [Op.or]: [
        { qualificationExpiresAt: null },
        { qualificationExpiresAt: { [Op.gte]: new Date() } }
      ]
    });

    if (scope === 'mine') {
      const mine = await collectMySupplierIds(entity.id);
      if (mine.supplierIds.length === 0) {
        return res.json({
          suppliers: [],
          scope: 'mine',
          pagination: { total: 0, page: parseInt(page), limit: parseInt(limit), totalPages: 0 }
        });
      }
      and.push({ id: { [Op.in]: mine.supplierIds } });
      relationBySupplier = mine.relationBySupplier;
    }

    if (city) and.push({ city });
    if (country) and.push({ country });
    const minT = minTurnover ? parseFloat(minTurnover) : null;
    const maxT = maxTurnover ? parseFloat(maxTurnover) : null;
    if (minT != null && !isNaN(minT)) and.push({ turnover: { [Op.gte]: minT } });
    if (maxT != null && !isNaN(maxT)) and.push({ turnover: { [Op.lte]: maxT } });

    if (search && search.trim()) {
      const term = String(search).trim().replace(/[%_\\]/g, '\\$&');
      const pattern = `%${term}%`;
      and.push({
        [Op.or]: [
          { companyName: { [Op.iLike]: pattern } },
          { registrationNumber: { [Op.iLike]: pattern } },
          { taxId: { [Op.iLike]: pattern } },
          { address: { [Op.iLike]: pattern } },
          { city: { [Op.iLike]: pattern } },
          { country: { [Op.iLike]: pattern } },
          { website: { [Op.iLike]: pattern } },
          { phone: { [Op.iLike]: pattern } },
          { financialStability: { [Op.iLike]: pattern } },
          { qualityManagementSystem: { [Op.iLike]: pattern } },
          { environmentalManagementSystem: { [Op.iLike]: pattern } },
          { socialResponsibilityManagementSystem: { [Op.iLike]: pattern } },
          { ohsManagementSystem: { [Op.iLike]: pattern } },
          { groundsForExclusion: { [Op.iLike]: pattern } },
          { laborLawRegulations: { [Op.iLike]: pattern } },
          { sanctionsRussiaBelarus: { [Op.iLike]: pattern } },
          { technicalCapacityProfessionalExperience: { [Op.iLike]: pattern } },
          { '$user.firstName$': { [Op.iLike]: pattern } },
          { '$user.lastName$': { [Op.iLike]: pattern } },
          { '$user.email$': { [Op.iLike]: pattern } }
        ]
      });
    }

    const include = [
      {
        model: db.User,
        as: 'user',
        attributes: ['id', 'email', 'firstName', 'lastName', 'phone', 'isActive'],
        required: true,
        where: { isActive: true }
      },
      {
        model: db.CPVCode,
        as: 'cpvCodes',
        through: { attributes: [] },
        attributes: ['id', 'code', 'description'],
        required: Boolean(cpvCodeId),
        ...(cpvCodeId ? { where: { id: cpvCodeId } } : {})
      }
    ];

    if (db.NUTSCode) {
      include.push({
        model: db.NUTSCode,
        as: 'nutsCodes',
        through: { attributes: [] },
        attributes: ['id', 'code', 'name', 'nameSwedish'],
        required: Boolean(nutsCodeId),
        ...(nutsCodeId ? { where: { id: nutsCodeId } } : {})
      });
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { count, rows: suppliers } = await db.Supplier.findAndCountAll({
      where: { [Op.and]: and },
      include,
      limit: parseInt(limit),
      offset,
      order: [['companyName', 'ASC']],
      distinct: true
    });

    let submittedCountBySupplier = {};
    let questionnaireTitlesBySupplier = {};
    if (scope === 'mine' && suppliers.length) {
      const entityQuestionnaires = await db.Questionnaire.findAll({
        where: { procuringEntityId: entity.id },
        attributes: ['id']
      });
      const questionnaireIds = entityQuestionnaires.map((q) => q.id);
      const pageIds = suppliers.map((s) => s.id);
      if (questionnaireIds.length && pageIds.length) {
        const responsesBySupplier = await db.QuestionnaireResponse.findAll({
          where: {
            supplierId: { [Op.in]: pageIds },
            questionnaireId: { [Op.in]: questionnaireIds },
            status: 'submitted'
          },
          attributes: ['supplierId', 'questionnaireId'],
          include: [
            {
              model: db.Questionnaire,
              as: 'questionnaire',
              attributes: ['id', 'title'],
              include: [{ model: db.CPVCode, as: 'cpvCode', attributes: ['id', 'code', 'description'] }]
            }
          ]
        });
        responsesBySupplier.forEach((r) => {
          const sid = r.supplierId;
          submittedCountBySupplier[sid] = (submittedCountBySupplier[sid] || 0) + 1;
          if (!questionnaireTitlesBySupplier[sid]) questionnaireTitlesBySupplier[sid] = [];
          const title = r.questionnaire?.title || 'Questionnaire';
          const code = r.questionnaire?.cpvCode?.code;
          if (!questionnaireTitlesBySupplier[sid].some((t) => t.title === title && t.code === code)) {
            questionnaireTitlesBySupplier[sid].push({
              title: r.questionnaire?.title,
              code: r.questionnaire?.cpvCode?.code,
              description: r.questionnaire?.cpvCode?.description
            });
          }
        });
      }
    }

    const suppliersWithMeta = suppliers.map((s) => {
      const json = s.toJSON();
      const relation = relationBySupplier[s.id] || null;
      return {
        ...json,
        scope,
        relation,
        submittedQuestionnaireCount: submittedCountBySupplier[s.id] || 0,
        submittedQuestionnaires: questionnaireTitlesBySupplier[s.id] || []
      };
    });

    res.json({
      suppliers: suppliersWithMeta,
      scope,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get suppliers error:', error);
    res.status(500).json({ message: 'Error fetching suppliers', error: error.message });
  }
};

// Get supplier details: profile + submitted responses to this entity's questionnaires (with answers and documents)
const getSupplierDetails = async (req, res) => {
  try {
    const { supplierId } = req.params;

    const entity = await db.ProcuringEntity.findOne({
      where: { userId: req.user.id }
    });
    if (!entity) {
      return res.status(404).json({ message: 'Procuring entity not found' });
    }

    const include = [
      {
        model: db.User,
        as: 'user',
        attributes: { exclude: ['password'] }
      },
      {
        model: db.CPVCode,
        as: 'cpvCodes',
        through: { attributes: [] }
      },
      {
        model: db.Document,
        as: 'documents'
      }
    ];

    // Add NUTS codes if model exists
    if (db.NUTSCode) {
      include.push({
        model: db.NUTSCode,
        as: 'nutsCodes',
        through: { attributes: [] }
      });
    }

    const supplier = await db.Supplier.findByPk(supplierId, {
      include
    });

    if (!supplier || supplier.status !== 'approved') {
      return res.status(404).json({ message: 'Supplier not found or not approved' });
    }

    // Submitted responses by this supplier to this entity's questionnaires
    const entityQuestionnaireIds = (
      await db.Questionnaire.findAll({
        where: { procuringEntityId: entity.id },
        attributes: ['id']
      })
    ).map((q) => q.id);

    const responses = await db.QuestionnaireResponse.findAll({
      where: {
        supplierId: supplier.id,
        questionnaireId: { [Op.in]: entityQuestionnaireIds },
        status: 'submitted'
      },
      include: [
        {
          model: db.Questionnaire,
          as: 'questionnaire',
          include: [{ model: db.CPVCode, as: 'cpvCode' }]
        },
        {
          model: db.Answer,
          as: 'answers',
          include: [
            { model: db.Question, as: 'question' },
            { model: db.Document, as: 'document' }
          ]
        }
      ],
      order: [['submittedAt', 'DESC']]
    });

    res.json({ supplier, responses });
  } catch (error) {
    console.error('Get supplier details error:', error);
    res.status(500).json({ message: 'Error fetching supplier details', error: error.message });
  }
};

const getDashboardStats = async (req, res) => {
  try {
    const entity = await db.ProcuringEntity.findOne({
      where: { userId: req.user.id },
      attributes: ['id', 'entityName']
    });
    if (!entity) {
      return res.status(404).json({ message: 'Procuring entity not found' });
    }

    const now = new Date();
    const entityId = entity.id;
    const questionnaireWhere = { procuringEntityId: entityId };
    const questionnaireJoin = {
      model: db.Questionnaire,
      as: 'questionnaire',
      where: questionnaireWhere,
      attributes: [],
      required: true
    };

    const [
      questionnairesTotal,
      questionnairesActive,
      questionnairesOverdue,
      questionnairesOpen,
      responsesSubmitted,
      responsesDraft,
      matchingSuppliers,
      recentQuestionnaires,
      nearestQuestionnaire
    ] = await Promise.all([
      db.Questionnaire.count({ where: questionnaireWhere }),
      db.Questionnaire.count({ where: { ...questionnaireWhere, isActive: true } }),
      db.Questionnaire.count({
        where: { ...questionnaireWhere, isActive: true, deadline: { [Op.lt]: now } }
      }),
      db.Questionnaire.count({
        where: { ...questionnaireWhere, isActive: true, deadline: { [Op.gte]: now } }
      }),
      db.QuestionnaireResponse.count({
        where: { status: 'submitted' },
        include: [questionnaireJoin]
      }),
      db.QuestionnaireResponse.count({
        where: { status: 'draft' },
        include: [questionnaireJoin]
      }),
      db.QuestionnaireResponse.count({
        distinct: true,
        col: 'supplierId',
        where: { status: 'submitted' },
        include: [questionnaireJoin]
      }),
      db.Questionnaire.findAll({
        where: questionnaireWhere,
        order: [['createdAt', 'DESC']],
        include: [{ model: db.CPVCode, as: 'cpvCode', attributes: ['code', 'description'] }],
        attributes: ['id', 'title', 'deadline', 'isActive', 'createdAt']
      }),
      db.Questionnaire.findOne({
        where: { procuringEntityId: entityId, isActive: true, deadline: { [Op.gte]: now } },
        order: [['deadline', 'ASC']],
        attributes: ['id', 'title', 'deadline']
      })
    ]);

    let nextAction = { labelKey: 'allSet', tab: null };
    if (questionnairesTotal === 0) {
      nextAction = { labelKey: 'createQuestionnaire', tab: 'questionnaires' };
    } else if (questionnairesOverdue > 0) {
      nextAction = { labelKey: 'reviewOverdue', tab: 'questionnaires' };
    } else if (responsesDraft > 0) {
      nextAction = { labelKey: 'reviewDrafts', tab: 'questionnaires' };
    } else if (matchingSuppliers === 0 && questionnairesOpen > 0) {
      nextAction = { labelKey: 'awaitingResponses', tab: 'questionnaires' };
    } else if (matchingSuppliers > 0) {
      nextAction = { labelKey: 'searchSuppliers', tab: 'suppliers' };
    }

    res.json({
      stats: {
        entityName: entity.entityName,
        questionnaires: {
          total: questionnairesTotal,
          active: questionnairesActive,
          overdue: questionnairesOverdue,
          open: questionnairesOpen
        },
        responses: {
          submitted: responsesSubmitted,
          draft: responsesDraft,
          total: responsesSubmitted + responsesDraft
        },
        matchingSuppliers,
        nearestDeadline: nearestQuestionnaire?.deadline || null,
        nearestDeadlineTitle: nearestQuestionnaire?.title || null,
        recentQuestionnaires,
        nextAction
      }
    });
  } catch (error) {
    console.error('Get procuring entity dashboard stats error:', error);
    res.status(500).json({ message: 'Error fetching dashboard stats', error: error.message });
  }
};

const suggestProfileFromDocuments = (req, res) => {
  profileAiUpload(req, res, async (uploadErr) => {
    const tmpPaths = (req.files || []).map((f) => f.path);
    try {
      if (uploadErr) {
        return res.status(400).json({ message: uploadErr.message || 'Upload failed' });
      }
      const ent = await assertEntitlement(req.user.id, 'ai.profile_assist');
      if (!ent.ok) return res.status(403).json({ message: ent.message, code: 'FEATURE_DISABLED' });
      if (!req.files?.length) {
        return res.status(400).json({ message: 'No PDF documents uploaded' });
      }

      const entity = await db.ProcuringEntity.findOne({
        where: { userId: req.user.id },
        include: [{ model: db.User, as: 'user' }],
      });
      if (!entity) {
        return res.status(404).json({ message: 'Procuring entity profile not found' });
      }

      const language = (req.body?.language || 'en').slice(0, 2);
      const documents = [];

      for (const file of req.files) {
        try {
          const text = await extractTextFromPdf(file.path);
          documents.push({ fileName: file.originalname, text });
        } catch (pdfErr) {
          documents.push({
            fileName: file.originalname,
            text: '',
            error: pdfErr.message || 'Could not read PDF text',
          });
        }
      }

      if (!documents.some((doc) => doc.text && doc.text.length >= 20)) {
        return res.status(400).json({
          message:
            'Could not extract text from any uploaded PDF. Use text-based PDFs (not scanned images only).',
          code: 'PDF_TEXT_EMPTY',
        });
      }

      const user = entity.user || {};
      const currentProfile = {
        entityName: entity.entityName,
        address: entity.address,
        city: entity.city,
        country: entity.country,
        phone: user.phone || entity.phone,
        firstName: user.firstName,
        lastName: user.lastName,
      };

      const result = await processDocumentsForProfile(documents, {
        language,
        currentProfile,
      });

      res.json(result);
    } catch (error) {
      console.error('Procuring entity profile AI suggest error:', error);
      return mapAiErrorResponse(res, error);
    } finally {
      for (const p of tmpPaths) {
        if (p && fs.existsSync(p)) fs.unlink(p, () => {});
      }
    }
  });
};

const suggestQuestionnaireUnderstand = async (req, res) => {
  try {
    const ent = await assertEntitlement(req.user.id, 'ai.requirements_builder');
    if (!ent.ok) return res.status(403).json({ message: ent.message, code: 'FEATURE_DISABLED' });

    const entity = await db.ProcuringEntity.findOne({ where: { userId: req.user.id } });
    if (!entity) {
      return res.status(404).json({ message: 'Procuring entity profile not found' });
    }

    const description = String(req.body?.description || '').trim();
    const language = (req.body?.language || 'en').slice(0, 2);

    const result = await understandQuestionnaireDescription(description, { language });
    return res.json({
      ...result,
      userDescription: description,
    });
  } catch (error) {
    console.error('Questionnaire AI understand error:', error);
    const validationCodes = new Set(['DESCRIPTION_TOO_SHORT', 'DESCRIPTION_TOO_LONG']);
    if (validationCodes.has(error.code)) {
      return res.status(400).json({ message: error.message, code: error.code });
    }
    return mapAiErrorResponse(res, error);
  }
};

const suggestQuestionnaireFromDescription = async (req, res) => {
  try {
    const ent = await assertEntitlement(req.user.id, 'ai.requirements_builder');
    if (!ent.ok) return res.status(403).json({ message: ent.message, code: 'FEATURE_DISABLED' });

    const entity = await db.ProcuringEntity.findOne({ where: { userId: req.user.id } });
    if (!entity) {
      return res.status(404).json({ message: 'Procuring entity profile not found' });
    }

    const description = String(req.body?.description || '').trim();
    const language = (req.body?.language || 'en').slice(0, 2);

    const validation = validateQuestionnaireDescription(description, language);
    if (!validation.valid) {
      return res.status(400).json({
        message: validation.message,
        code: validation.code,
      });
    }

    const result = await generateQuestionnaireDraft(description, { language });
    return res.json(result);
  } catch (error) {
    console.error('Questionnaire AI suggest error:', error);
    const validationCodes = new Set(['DESCRIPTION_TOO_SHORT', 'DESCRIPTION_TOO_LONG']);
    if (validationCodes.has(error.code)) {
      return res.status(400).json({ message: error.message, code: error.code });
    }
    return mapAiErrorResponse(res, error);
  }
};

/**
 * Approved suppliers for tender invite / direct inform.
 * Optional ?cpvCodeId= filters to suppliers whose profile includes that CPV.
 */
const listInviteCandidates = async (req, res) => {
  try {
    const entity = await db.ProcuringEntity.findOne({ where: { userId: req.user.id } });
    if (!entity) return res.status(404).json({ message: 'Procuring entity not found' });

    const cpvCodeId = req.query.cpvCodeId || null;
    const include = [
      {
        model: db.User,
        as: 'user',
        attributes: ['id', 'email', 'firstName', 'lastName']
      },
      {
        model: db.CPVCode,
        as: 'cpvCodes',
        through: { attributes: [] },
        attributes: ['id', 'code', 'description'],
        required: Boolean(cpvCodeId),
        ...(cpvCodeId ? { where: { id: cpvCodeId } } : {})
      }
    ];

    const suppliers = await db.Supplier.findAll({
      where: { status: 'approved' },
      include,
      order: [['companyName', 'ASC']],
      limit: 200
    });

    // Also return “all approved” count context when filtering by CPV
    let allApprovedCount = suppliers.length;
    if (cpvCodeId) {
      allApprovedCount = await db.Supplier.count({ where: { status: 'approved' } });
    }

    res.json({
      suppliers: suppliers.map((s) => ({
        id: s.id,
        companyName: s.companyName,
        email: s.user?.email || null,
        cpvCodes: (s.cpvCodes || []).map((c) => ({ id: c.id, code: c.code, description: c.description })),
        cpvMatched: Boolean(cpvCodeId)
      })),
      filter: { cpvCodeId },
      allApprovedCount
    });
  } catch (error) {
    console.error('List invite candidates error:', error);
    res.status(500).json({ message: 'Error listing invite candidates', error: error.message });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  getSuppliers,
  listInviteCandidates,
  getSupplierDetails,
  getDashboardStats,
  suggestProfileFromDocuments,
  suggestQuestionnaireUnderstand,
  suggestQuestionnaireFromDescription,
};
