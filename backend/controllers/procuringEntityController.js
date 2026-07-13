const db = require('../models');
const { Op } = require('sequelize');
const fs = require('fs');
const { profileAiUpload, mapAiErrorResponse } = require('../utils/profileAiUpload');
const { extractTextFromPdf } = require('../services/pdfTextService');
const { processDocumentsForProfile } = require('../services/procuringEntityProfileAiService');
const { generateQuestionnaireDraft, understandQuestionnaireDescription } = require('../services/questionnaireAiService');
const { validateQuestionnaireDescription } = require('../services/questionnaireDescriptionValidation');

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
      ...(phone !== undefined && { phone: phone?.trim() || null })
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
      page = 1,
      limit = 20
    } = req.query;

    // Questionnaire IDs belonging to this entity (optionally filter by CPV)
    const questionnaireWhere = { procuringEntityId: entity.id };
    if (cpvCodeId) questionnaireWhere.cpvCodeId = cpvCodeId;
    const entityQuestionnaires = await db.Questionnaire.findAll({
      where: questionnaireWhere,
      attributes: ['id']
    });
    const questionnaireIds = entityQuestionnaires.map((q) => q.id);
    if (questionnaireIds.length === 0) {
      return res.json({
        suppliers: [],
        pagination: { total: 0, page: parseInt(page), limit: parseInt(limit), totalPages: 0 }
      });
    }

    // Supplier IDs who submitted to any of these questionnaires
    const submittedResponses = await db.QuestionnaireResponse.findAll({
      where: {
        questionnaireId: { [Op.in]: questionnaireIds },
        status: 'submitted'
      },
      attributes: ['supplierId'],
      raw: true
    });
    const supplierIds = [...new Set(submittedResponses.map((r) => r.supplierId))];
    if (supplierIds.length === 0) {
      return res.json({
        suppliers: [],
        pagination: { total: 0, page: parseInt(page), limit: parseInt(limit), totalPages: 0 }
      });
    }

    const where = {
      [Op.and]: [
        { id: { [Op.in]: supplierIds } },
        { status: 'approved' }
      ]
    };
    if (city) where[Op.and].push({ city });
    if (country) where[Op.and].push({ country });
    const minT = minTurnover ? parseFloat(minTurnover) : null;
    const maxT = maxTurnover ? parseFloat(maxTurnover) : null;
    if (minT != null && !isNaN(minT)) where[Op.and].push({ turnover: { [Op.gte]: minT } });
    if (maxT != null && !isNaN(maxT)) where[Op.and].push({ turnover: { [Op.lte]: maxT } });

    if (search && search.trim()) {
      const term = String(search).trim().replace(/[%_\\]/g, '\\$&');
      const pattern = `%${term}%`;
      const searchOr = [
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
      ];
      where[Op.and].push({ [Op.or]: searchOr });
    }

    const include = [
      {
        model: db.User,
        as: 'user',
        attributes: ['id', 'email', 'firstName', 'lastName', 'phone'],
        required: !!(search && search.trim())
      },
      {
        model: db.CPVCode,
        as: 'cpvCodes',
        through: { attributes: [] }
      }
    ];

    // Filter by NUTS code when provided (only if NUTSCode model exists)
    if (nutsCodeId && db.NUTSCode) {
      include.push({
        model: db.NUTSCode,
        as: 'nutsCodes',
        through: { attributes: [] },
        required: true,
        where: { id: nutsCodeId }
      });
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows: suppliers } = await db.Supplier.findAndCountAll({
      where,
      include,
      limit: parseInt(limit),
      offset,
      order: [['companyName', 'ASC']],
      distinct: true
    });

    // Attach submitted questionnaire count per supplier
    const responsesBySupplier = await db.QuestionnaireResponse.findAll({
      where: {
        supplierId: { [Op.in]: supplierIds },
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
      ],
      raw: false
    });
    const submittedCountBySupplier = {};
    const questionnaireTitlesBySupplier = {};
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

    const suppliersWithCount = suppliers.map((s) => ({
      ...s.toJSON(),
      submittedQuestionnaireCount: submittedCountBySupplier[s.id] || 0,
      submittedQuestionnaires: questionnaireTitlesBySupplier[s.id] || []
    }));

    res.json({
      suppliers: suppliersWithCount,
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
        limit: 5,
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

module.exports = {
  getProfile,
  updateProfile,
  getSuppliers,
  getSupplierDetails,
  getDashboardStats,
  suggestProfileFromDocuments,
  suggestQuestionnaireUnderstand,
  suggestQuestionnaireFromDescription,
};
