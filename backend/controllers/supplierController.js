const db = require('../models');
const { Op } = require('sequelize');

// Get supplier profile
const getProfile = async (req, res) => {
  try {
    const supplier = await db.Supplier.findOne({
      where: { userId: req.user.id },
      include: [
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
      ]
    });

    if (!supplier) {
      return res.status(404).json({ message: 'Supplier profile not found' });
    }

    res.json({ supplier });
  } catch (error) {
    console.error('Get supplier profile error:', error);
    res.status(500).json({ message: 'Error fetching profile', error: error.message });
  }
};

// Update supplier profile
const updateProfile = async (req, res) => {
  try {
    const supplier = await db.Supplier.findOne({ where: { userId: req.user.id } });
    if (!supplier) {
      return res.status(404).json({ message: 'Supplier profile not found' });
    }

    await supplier.update(req.body);

    // Update user info if provided
    if (req.body.firstName || req.body.lastName || req.body.phone) {
      await db.User.update(
        {
          ...(req.body.firstName && { firstName: req.body.firstName }),
          ...(req.body.lastName && { lastName: req.body.lastName }),
          ...(req.body.phone && { phone: req.body.phone })
        },
        { where: { id: req.user.id } }
      );
    }

    const updatedSupplier = await db.Supplier.findByPk(supplier.id, {
      include: [
        {
          model: db.User,
          as: 'user',
          attributes: { exclude: ['password'] }
        },
        {
          model: db.CPVCode,
          as: 'cpvCodes',
          through: { attributes: [] }
        }
      ]
    });

    res.json({ message: 'Profile updated successfully', supplier: updatedSupplier });
  } catch (error) {
    console.error('Update supplier profile error:', error);
    res.status(500).json({ message: 'Error updating profile', error: error.message });
  }
};

// Update CPV codes
const updateCPVCodes = async (req, res) => {
  try {
    const { cpvCodeIds } = req.body;

    const supplier = await db.Supplier.findOne({ where: { userId: req.user.id } });
    if (!supplier) {
      return res.status(404).json({ message: 'Supplier profile not found' });
    }

    await supplier.setCpvCodes(cpvCodeIds);

    const updatedSupplier = await db.Supplier.findByPk(supplier.id, {
      include: [
        {
          model: db.CPVCode,
          as: 'cpvCodes',
          through: { attributes: [] }
        }
      ]
    });

    res.json({ message: 'CPV codes updated successfully', supplier: updatedSupplier });
  } catch (error) {
    console.error('Update CPV codes error:', error);
    res.status(500).json({ message: 'Error updating CPV codes', error: error.message });
  }
};

// Get active questionnaires
const getActiveQuestionnaires = async (req, res) => {
  try {
    const supplier = await db.Supplier.findOne({ where: { userId: req.user.id } });
    if (!supplier || supplier.status !== 'approved') {
      return res.status(403).json({ message: 'Supplier not approved' });
    }

    // Get supplier's CPV codes (must have saved CPV codes in profile)
    const supplierCPVs = await db.SupplierCPV.findAll({
      where: { supplierId: supplier.id }
    });
    const cpvIds = supplierCPVs.map(sc => sc.cpvCodeId);

    // No CPV codes selected → no matching questionnaires
    if (cpvIds.length === 0) {
      return res.json({ questionnaires: [] });
    }

    // Find questionnaires matching supplier's CPV codes
    // Include questionnaires where deadline is today or in the future
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Start of today

    const questionnaires = await db.Questionnaire.findAll({
      where: {
        cpvCodeId: { [Op.in]: cpvIds },
        isActive: true,
        deadline: { [Op.gte]: now }
      },
      include: [
        {
          model: db.ProcuringEntity,
          as: 'procuringEntity',
          include: [
            {
              model: db.User,
              as: 'user',
              attributes: ['firstName', 'lastName']
            }
          ]
        },
        {
          model: db.CPVCode,
          as: 'cpvCode'
        },
        {
          model: db.Question,
          as: 'questions',
          order: [['order', 'ASC']]
        },
        {
          model: db.QuestionnaireResponse,
          as: 'responses',
          where: { supplierId: supplier.id },
          required: false
        }
      ],
      order: [['deadline', 'ASC']]
    });

    res.json({ questionnaires });
  } catch (error) {
    console.error('Get active questionnaires error:', error);
    res.status(500).json({ message: 'Error fetching questionnaires', error: error.message });
  }
};

// Get questionnaire history
const getQuestionnaireHistory = async (req, res) => {
  try {
    const supplier = await db.Supplier.findOne({ where: { userId: req.user.id } });
    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found' });
    }

    const responses = await db.QuestionnaireResponse.findAll({
      where: {
        supplierId: supplier.id,
        status: 'submitted'
      },
      include: [
        {
          model: db.Questionnaire,
          as: 'questionnaire',
          include: [
            {
              model: db.ProcuringEntity,
              as: 'procuringEntity'
            },
            {
              model: db.CPVCode,
              as: 'cpvCode'
            },
            {
              model: db.Question,
              as: 'questions',
              order: [['order', 'ASC']]
            }
          ]
        }
      ],
      order: [['submittedAt', 'DESC']]
    });

    res.json({ responses });
  } catch (error) {
    console.error('Get questionnaire history error:', error);
    res.status(500).json({ message: 'Error fetching history', error: error.message });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  updateCPVCodes,
  getActiveQuestionnaires,
  getQuestionnaireHistory
};
