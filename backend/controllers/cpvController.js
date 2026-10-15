const db = require('../models');
const { sendServerError } = require('../utils/httpError');

// Get CPV count (for debugging empty list)
const getCPVCount = async (req, res) => {
  try {
    const count = await db.CPVCode.count();
    res.json({ count });
  } catch (error) {
    console.error('Get CPV count error:', error);
    return sendServerError(res, error, 'Error fetching CPV count');
  }
};

// Get CPV codes (search against full catalog; paginate — catalog is ~10k)
const getCPVCodes = async (req, res) => {
  try {
    const { search, level, limit: limitParam, offset: offsetParam } = req.query;

    const where = { isActive: true };
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

    const limit = Math.min(parseInt(limitParam, 10) || 500, 20000);
    const offset = Math.max(parseInt(offsetParam, 10) || 0, 0);
    const { rows: cpvCodes, count: total } = await db.CPVCode.findAndCountAll({
      where,
      order: [['code', 'ASC']],
      limit,
      offset
    });

    res.json({ cpvCodes, total, limit, offset });
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
