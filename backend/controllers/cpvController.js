const db = require('../models');

// Get CPV count (for debugging empty list)
const getCPVCount = async (req, res) => {
  try {
    const count = await db.CPVCode.count();
    res.json({ count });
  } catch (error) {
    console.error('Get CPV count error:', error);
    res.status(500).json({ message: 'Error', error: error.message });
  }
};

// Get all CPV codes (with optional search and limit to avoid huge responses)
const getCPVCodes = async (req, res) => {
  try {
    const { search, level, limit: limitParam } = req.query;

    const where = {};
    if (search && typeof search === 'string' && search.trim()) {
      const term = `%${search.trim()}%`;
      where[db.Sequelize.Op.or] = [
        { code: { [db.Sequelize.Op.iLike]: term } },
        { description: { [db.Sequelize.Op.iLike]: term } }
      ];
    }
    if (level) {
      where.level = parseInt(level);
    }

    const limit = Math.min(parseInt(limitParam, 10) || 2000, 5000);
    const cpvCodes = await db.CPVCode.findAll({
      where,
      order: [['code', 'ASC']],
      limit
    });

    console.log('[CPV] Returning', cpvCodes.length, 'codes (limit', limit + ')');
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
  getCPVCount,
  getCPVCodes,
  getCPVCodeById,
  createCPVCode
};
