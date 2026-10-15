const db = require('../models');

async function resolveOwnerForUser(user) {
  if (user.role === 'procuring_entity') {
    const entity = await db.ProcuringEntity.findOne({ where: { userId: user.id } });
    if (!entity) return null;
    return { ownerType: 'procuring_entity', ownerId: entity.id };
  }
  if (user.role === 'supplier') {
    const supplier = await db.Supplier.findOne({ where: { userId: user.id } });
    if (!supplier) return null;
    return { ownerType: 'supplier', ownerId: supplier.id };
  }
  return null;
}

const listMyDepartments = async (req, res) => {
  try {
    const owner = await resolveOwnerForUser(req.user);
    if (!owner) {
      return res.status(404).json({ message: 'Organization not found for user' });
    }
    const departments = await db.Department.findAll({
      where: { ownerType: owner.ownerType, ownerId: owner.ownerId },
      order: [['name', 'ASC']]
    });
    res.json({ departments, ...owner });
  } catch (error) {
    console.error('List departments error:', error);
    res.status(500).json({ message: 'Error listing departments', error: error.message });
  }
};

const createMyDepartment = async (req, res) => {
  try {
    const owner = await resolveOwnerForUser(req.user);
    if (!owner) {
      return res.status(404).json({ message: 'Organization not found for user' });
    }
    const name = (req.body.name || '').trim();
    if (!name) {
      return res.status(400).json({ message: 'Department name is required' });
    }
    const department = await db.Department.create({
      ownerType: owner.ownerType,
      ownerId: owner.ownerId,
      name,
      description: req.body.description?.trim() || null
    });
    res.status(201).json({ message: 'Department created', department });
  } catch (error) {
    console.error('Create department error:', error);
    res.status(500).json({ message: 'Error creating department', error: error.message });
  }
};

const updateDepartment = async (req, res) => {
  try {
    const { departmentId } = req.params;
    const department = await db.Department.findByPk(departmentId);
    if (!department) {
      return res.status(404).json({ message: 'Department not found' });
    }

    // Admin can edit any; org users only their own
    if (req.user.role !== 'admin') {
      const owner = await resolveOwnerForUser(req.user);
      if (!owner || owner.ownerType !== department.ownerType || owner.ownerId !== department.ownerId) {
        return res.status(403).json({ message: 'Not allowed to update this department' });
      }
    }

    const updates = {};
    if (req.body.name !== undefined) updates.name = String(req.body.name).trim();
    if (req.body.description !== undefined) updates.description = req.body.description?.trim() || null;
    if (req.body.isActive !== undefined) updates.isActive = !!req.body.isActive;
    await department.update(updates);
    res.json({ message: 'Department updated', department });
  } catch (error) {
    console.error('Update department error:', error);
    res.status(500).json({ message: 'Error updating department', error: error.message });
  }
};

const deleteDepartment = async (req, res) => {
  try {
    const { departmentId } = req.params;
    const department = await db.Department.findByPk(departmentId);
    if (!department) {
      return res.status(404).json({ message: 'Department not found' });
    }
    if (req.user.role !== 'admin') {
      const owner = await resolveOwnerForUser(req.user);
      if (!owner || owner.ownerType !== department.ownerType || owner.ownerId !== department.ownerId) {
        return res.status(403).json({ message: 'Not allowed to delete this department' });
      }
    }
    await department.destroy();
    res.json({ message: 'Department deleted' });
  } catch (error) {
    console.error('Delete department error:', error);
    res.status(500).json({ message: 'Error deleting department', error: error.message });
  }
};

const adminListDepartments = async (req, res) => {
  try {
    const where = {};
    if (req.query.ownerType) where.ownerType = req.query.ownerType;
    if (req.query.ownerId) where.ownerId = req.query.ownerId;
    const departments = await db.Department.findAll({
      where,
      order: [['ownerType', 'ASC'], ['name', 'ASC']]
    });
    res.json({ departments });
  } catch (error) {
    console.error('Admin list departments error:', error);
    res.status(500).json({ message: 'Error listing departments', error: error.message });
  }
};

const adminCreateDepartment = async (req, res) => {
  try {
    const { ownerType, ownerId, name, description } = req.body;
    if (!ownerType || !ownerId || !name?.trim()) {
      return res.status(400).json({ message: 'ownerType, ownerId, and name are required' });
    }
    if (!['procuring_entity', 'supplier', 'company'].includes(ownerType)) {
      return res.status(400).json({ message: 'Invalid ownerType' });
    }
    const department = await db.Department.create({
      ownerType,
      ownerId,
      name: name.trim(),
      description: description?.trim() || null
    });
    res.status(201).json({ message: 'Department created', department });
  } catch (error) {
    console.error('Admin create department error:', error);
    res.status(500).json({ message: 'Error creating department', error: error.message });
  }
};

module.exports = {
  listMyDepartments,
  createMyDepartment,
  updateDepartment,
  deleteDepartment,
  adminListDepartments,
  adminCreateDepartment
};
