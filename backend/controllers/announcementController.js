const db = require('../models');
const { Op } = require('sequelize');

// Create announcement (Admin or Procuring Entity)
const createAnnouncement = async (req, res) => {
  try {
    const { title, content, targetAudience, cpvCodeId, expiryDate } = req.body;

    let procuringEntityId = null;
    if (req.user.role === 'procuring_entity') {
      const procuringEntity = await db.ProcuringEntity.findOne({
        where: { userId: req.user.id }
      });
      if (!procuringEntity) {
        return res.status(404).json({ message: 'Procuring entity not found' });
      }
      procuringEntityId = procuringEntity.id;
    }

    const announcement = await db.Announcement.create({
      title,
      content,
      targetAudience: targetAudience || 'all',
      cpvCodeId,
      expiryDate,
      createdBy: req.user.id,
      procuringEntityId
    });

    const createdAnnouncement = await db.Announcement.findByPk(announcement.id, {
      include: [
        {
          model: db.CPVCode,
          as: 'cpvCode'
        },
        {
          model: db.User,
          as: 'creator',
          attributes: ['firstName', 'lastName']
        }
      ]
    });

    res.status(201).json({
      message: 'Announcement created successfully',
      announcement: createdAnnouncement
    });
  } catch (error) {
    console.error('Create announcement error:', error);
    res.status(500).json({ message: 'Error creating announcement', error: error.message });
  }
};

// Get announcements (All users)
const getAnnouncements = async (req, res) => {
  try {
    const where = {
      isActive: true,
      expiryDate: { [Op.gt]: new Date() }
    };

    // Filter by target audience
    if (req.user.role === 'supplier') {
      where.targetAudience = { [Op.in]: ['suppliers', 'all'] };
    } else if (req.user.role === 'procuring_entity') {
      where.targetAudience = { [Op.in]: ['procuring_entities', 'all'] };
    }

    // If supplier, filter by CPV codes
    if (req.user.role === 'supplier') {
      const supplier = await db.Supplier.findOne({ where: { userId: req.user.id } });
      if (supplier) {
        const supplierCPVs = await db.SupplierCPV.findAll({
          where: { supplierId: supplier.id }
        });
        const cpvIds = supplierCPVs.map(sc => sc.cpvCodeId);

        where[Op.or] = [
          { cpvCodeId: { [Op.in]: cpvIds } },
          { cpvCodeId: null }
        ];
      }
    }

    const announcements = await db.Announcement.findAll({
      where,
      include: [
        {
          model: db.CPVCode,
          as: 'cpvCode'
        },
        {
          model: db.User,
          as: 'creator',
          attributes: ['firstName', 'lastName']
        },
        {
          model: db.ProcuringEntity,
          as: 'procuringEntity'
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({ announcements });
  } catch (error) {
    console.error('Get announcements error:', error);
    res.status(500).json({ message: 'Error fetching announcements', error: error.message });
  }
};

// Get all announcements (Admin)
const getAllAnnouncements = async (req, res) => {
  try {
    const announcements = await db.Announcement.findAll({
      include: [
        {
          model: db.CPVCode,
          as: 'cpvCode'
        },
        {
          model: db.User,
          as: 'creator',
          attributes: ['firstName', 'lastName']
        },
        {
          model: db.ProcuringEntity,
          as: 'procuringEntity'
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({ announcements });
  } catch (error) {
    console.error('Get all announcements error:', error);
    res.status(500).json({ message: 'Error fetching announcements', error: error.message });
  }
};

// Update announcement (Admin only)
const updateAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, targetAudience, cpvCodeId, expiryDate, isActive } = req.body;

    const announcement = await db.Announcement.findByPk(id);
    if (!announcement) {
      return res.status(404).json({ message: 'Announcement not found' });
    }

    await announcement.update({
      ...(title !== undefined && { title }),
      ...(content !== undefined && { content }),
      ...(targetAudience !== undefined && { targetAudience }),
      ...(cpvCodeId !== undefined && { cpvCodeId: cpvCodeId || null }),
      ...(expiryDate !== undefined && { expiryDate }),
      ...(isActive !== undefined && { isActive })
    });

    const updated = await db.Announcement.findByPk(id, {
      include: [
        { model: db.CPVCode, as: 'cpvCode' },
        { model: db.User, as: 'creator', attributes: ['firstName', 'lastName'] }
      ]
    });

    res.json({ message: 'Announcement updated successfully', announcement: updated });
  } catch (error) {
    console.error('Update announcement error:', error);
    res.status(500).json({ message: 'Error updating announcement', error: error.message });
  }
};

// Delete announcement (Admin only)
const deleteAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;

    const announcement = await db.Announcement.findByPk(id);
    if (!announcement) {
      return res.status(404).json({ message: 'Announcement not found' });
    }

    await announcement.destroy();
    res.json({ message: 'Announcement deleted successfully' });
  } catch (error) {
    console.error('Delete announcement error:', error);
    res.status(500).json({ message: 'Error deleting announcement', error: error.message });
  }
};

module.exports = {
  createAnnouncement,
  getAnnouncements,
  getAllAnnouncements,
  updateAnnouncement,
  deleteAnnouncement
};
