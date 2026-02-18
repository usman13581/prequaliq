const db = require('../models');
const { Op } = require('sequelize');

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
          as: 'documents'
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
          as: 'documents'
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
    if (minTurnover) where[Op.and].push({ turnover: { [Op.gte]: minTurnover } });
    if (maxTurnover) where[Op.and].push({ turnover: { [Op.lte]: maxTurnover } });
    if (search) {
      where[Op.and].push({
        [Op.or]: [
          { companyName: { [Op.iLike]: `%${search}%` } },
          { registrationNumber: { [Op.iLike]: `%${search}%` } }
        ]
      });
    }

    const include = [
      {
        model: db.User,
        as: 'user',
        attributes: ['id', 'email', 'firstName', 'lastName', 'phone'],
        ...(search && {
          required: true,
          where: {
            [Op.or]: [
              { firstName: { [Op.iLike]: `%${search}%` } },
              { lastName: { [Op.iLike]: `%${search}%` } },
              { email: { [Op.iLike]: `%${search}%` } }
            ]
          }
        })
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

module.exports = {
  getProfile,
  updateProfile,
  getSuppliers,
  getSupplierDetails
};
