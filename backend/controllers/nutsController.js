const db = require('../models');
const { Op } = require('sequelize');

// Get all NUTS codes
const getNUTSCodes = async (req, res) => {
  try {
    const { search, level } = req.query;
    const where = {};

    if (search && search.trim()) {
      where[Op.or] = [
        { code: { [Op.iLike]: `%${search.trim()}%` } },
        { name: { [Op.iLike]: `%${search.trim()}%` } },
        { nameSwedish: { [Op.iLike]: `%${search.trim()}%` } }
      ];
    }

    if (level) {
      where.level = parseInt(level);
    }

    const nutsCodes = await db.NUTSCode.findAll({
      where,
      order: [['code', 'ASC']]
    });

    res.json({ nutsCodes });
  } catch (error) {
    console.error('Get NUTS codes error:', error);
    res.status(500).json({ message: 'Error fetching NUTS codes', error: error.message });
  }
};

// Get NUTS code count (public endpoint)
const getNUTSCount = async (req, res) => {
  try {
    const count = await db.NUTSCode.count();
    res.json({ count });
  } catch (error) {
    console.error('Get NUTS count error:', error);
    res.status(500).json({ message: 'Error fetching NUTS count', error: error.message });
  }
};

module.exports = {
  getNUTSCodes,
  getNUTSCount
};
