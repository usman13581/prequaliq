const db = require('../models');

// Get all CPV codes
const getCPVCodes = async (req, res) => {
  try {
    const { search, level } = req.query;

    const where = {};
    if (search) {
      where[db.Sequelize.Op.or] = [
        { code: { [db.Sequelize.Op.iLike]: `%${search}%` } },
        { description: { [db.Sequelize.Op.iLike]: `%${search}%` } }
      ];
    }
    if (level) {
      where.level = parseInt(level);
    }

    const cpvCodes = await db.CPVCode.findAll({
      where,
      order: [['code', 'ASC']]
    });

    res.json({ cpvCodes });
  } catch (error) {
    console.error('Get CPV codes error:', error);
    res.status(500).json({ message: 'Error fetching CPV codes', error: error.message });
  }
};

// Get CPV code by ID
const getCPVCodeById = async (req, res) => {
  try {
    const { cpvId } = req.params;

    const cpvCode = await db.CPVCode.findByPk(cpvId);
    if (!cpvCode) {
      return res.status(404).json({ message: 'CPV code not found' });
    }

    res.json({ cpvCode });
  } catch (error) {
    console.error('Get CPV code error:', error);
    res.status(500).json({ message: 'Error fetching CPV code', error: error.message });
  }
};

// Create CPV code (Admin only - for seeding)
const createCPVCode = async (req, res) => {
  try {
    const cpvCode = await db.CPVCode.create(req.body);
    res.status(201).json({
      message: 'CPV code created successfully',
      cpvCode
    });
  } catch (error) {
    console.error('Create CPV code error:', error);
    res.status(500).json({ message: 'Error creating CPV code', error: error.message });
  }
};

module.exports = {
  getCPVCodes,
  getCPVCodeById,
  createCPVCode
};
