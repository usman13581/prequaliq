const db = require('../models');
const { Sequelize } = require('sequelize');
const { hashPassword } = require('../utils/password');
const { sendAccountCreatedEmail, sendAccountActivatedEmail, sendAccountDeactivatedEmail, sendPasswordResetByAdminEmail, sendSupplierApprovedEmail, sendSupplierRejectedEmail } = require('../services/emailService');

// Create supplier account
const createSupplier = async (req, res) => {
  try {
    const { email, password, firstName, lastName, phone } = req.body;

    const trimmedEmail = (email || '').trim().toLowerCase();
    if (!trimmedEmail) {
      return res.status(400).json({ message: 'Email is required' });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return res.status(400).json({ message: 'Invalid email address' });
    }
    const existingUser = await db.User.findOne({ where: { email: trimmedEmail } });
    if (existingUser) {
      return res.status(400).json({ 
        message: 'This email is already associated with another account. Please use a different email address.' 
      });
    }

    const hashedPassword = await hashPassword(password);
    const user = await db.User.create({
      email: trimmedEmail,
      password: hashedPassword,
      firstName,
      lastName,
      phone,
      role: 'supplier'
    });

    await db.Supplier.create({
      userId: user.id,
      companyName: `${firstName} ${lastName} Company`,
      status: 'pending'
    });

    // Send welcome email to the new supplier
    sendAccountCreatedEmail(user.email, firstName, lastName, 'supplier').catch((err) =>
      console.error('Failed to send account created email:', err)
    );

    res.status(201).json({
      message: 'Supplier account created successfully',
      user: {
        id: user.id,
        email: user.email,
        name: `${user.firstName} ${user.lastName}`
      }
    });
  } catch (error) {
    console.error('Create supplier error:', error);
    res.status(500).json({ message: 'Error creating supplier', error: error.message });
  }
};

// Create procuring entity
const createProcuringEntity = async (req, res) => {
  try {
    const { email, password, firstName, lastName, phone, entityName, companyId } = req.body;

    console.log('Create procuring entity request:', { 
      email, 
      firstName, 
      lastName, 
      entityName, 
      companyId,
      companyIdType: typeof companyId,
      hasCompanyId: !!companyId
    });

    // Validate required fields
    if (!email || !password || !firstName || !lastName || !entityName) {
      console.log('Missing required fields:', { email: !!email, password: !!password, firstName: !!firstName, lastName: !!lastName, entityName: !!entityName });
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const trimmedEmail = (email || '').trim().toLowerCase();
    if (!trimmedEmail) {
      return res.status(400).json({ message: 'Email is required' });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return res.status(400).json({ message: 'Invalid email address' });
    }
    const existingUser = await db.User.findOne({ where: { email: trimmedEmail } });
    if (existingUser) {
      return res.status(400).json({ 
        message: 'This email is already associated with another account. Please use a different email address.' 
      });
    }

    // Validate companyId if provided (optional field)
    let validCompanyId = null;
    if (companyId && (typeof companyId === 'string' || typeof companyId === 'number')) {
      const companyIdStr = String(companyId).trim();
      if (companyIdStr !== '' && companyIdStr !== 'null' && companyIdStr !== 'undefined') {
        try {
          const company = await db.Company.findByPk(companyIdStr);
          if (!company) {
            console.log('Invalid company ID:', companyIdStr);
            return res.status(400).json({ message: 'Invalid company ID' });
          }
          validCompanyId = companyIdStr;
          console.log('Valid company ID:', validCompanyId);
        } catch (err) {
          console.log('Error checking company:', err.message);
          // If company lookup fails, just proceed without company
          validCompanyId = null;
        }
      }
    }
    
    if (!validCompanyId) {
      console.log('No company ID provided, creating without company');
    }

    console.log('Hashing password...');
    const hashedPassword = await hashPassword(password);
    
    console.log('Creating user...');
    const user = await db.User.create({
      email: trimmedEmail,
      password: hashedPassword,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone?.trim() || null,
      role: 'procuring_entity'
    });
    console.log('User created successfully:', user.id);

    console.log('Creating procuring entity with data:', {
      userId: user.id,
      entityName: entityName.trim(),
      companyId: validCompanyId
    });
    
    const procuringEntity = await db.ProcuringEntity.create({
      userId: user.id,
      entityName: entityName.trim(),
      companyId: validCompanyId
    });
    console.log('Procuring entity created successfully:', procuringEntity.id);

    // Send welcome email to the new procuring entity
    sendAccountCreatedEmail(user.email, firstName, lastName, 'procuring_entity').catch((err) =>
      console.error('Failed to send account created email:', err)
    );

    res.status(201).json({
      message: 'Procuring entity created successfully',
      user: {
        id: user.id,
        email: user.email,
        entityName: entityName.trim()
      }
    });
  } catch (error) {
    console.error('Create procuring entity error:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    // Provide more specific error messages
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ 
        message: 'Validation error', 
        errors: error.errors.map(e => e.message) 
      });
    }
    if (error.name === 'SequelizeForeignKeyConstraintError') {
      return res.status(400).json({ 
        message: 'Invalid reference (e.g., company ID does not exist)' 
      });
    }
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ 
        message: 'A record with this information already exists' 
      });
    }
    
    res.status(500).json({ 
      message: 'Error creating procuring entity', 
      error: error.message 
    });
  }
};

// Create company
const createCompany = async (req, res) => {
  try {
    const company = await db.Company.create(req.body);
    res.status(201).json({ message: 'Company created successfully', company });
  } catch (error) {
    console.error('Create company error:', error);
    res.status(500).json({ message: 'Error creating company', error: error.message });
  }
};

// Get all suppliers (pending approval)
const getSuppliers = async (req, res) => {
  try {
    const { status } = req.query;
    const where = {};
    if (status) where.status = status;

    const suppliers = await db.Supplier.findAll({
      where,
      include: [
        {
          model: db.User,
          as: 'user',
          attributes: ['id', 'email', 'firstName', 'lastName', 'phone', 'isActive']
        },
        {
          model: db.CPVCode,
          as: 'cpvCodes',
          through: { attributes: [] }
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({ suppliers });
  } catch (error) {
    console.error('Get suppliers error:', error);
    res.status(500).json({ message: 'Error fetching suppliers', error: error.message });
  }
};

// Approve/reject supplier
const reviewSupplier = async (req, res) => {
  try {
    const { supplierId } = req.params;
    const { action, rejectionReason } = req.body; // action: 'approve' or 'reject'

    const supplier = await db.Supplier.findByPk(supplierId, {
      include: [{ model: db.User, as: 'user', attributes: ['id', 'email', 'firstName', 'lastName'] }]
    });
    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found' });
    }

    if (action === 'approve') {
      await supplier.update({
        status: 'approved',
        approvedAt: new Date(),
        approvedBy: req.user.id,
        rejectionReason: null
      });
      if (supplier.user && supplier.user.email) {
        sendSupplierApprovedEmail(
          supplier.user.email,
          supplier.user.firstName,
          supplier.user.lastName
        ).catch((err) => console.error('Failed to send supplier approved email:', err));
      }
      res.json({ message: 'Supplier approved successfully', supplier });
    } else if (action === 'reject') {
      await supplier.update({
        status: 'rejected',
        approvedBy: req.user.id,
        rejectionReason
      });
      if (supplier.user && supplier.user.email) {
        sendSupplierRejectedEmail(
          supplier.user.email,
          supplier.user.firstName,
          supplier.user.lastName,
          rejectionReason
        ).catch((err) => console.error('Failed to send supplier rejected email:', err));
      }
      res.json({ message: 'Supplier rejected', supplier });
    } else {
      return res.status(400).json({ message: 'Invalid action. Use "approve" or "reject"' });
    }
  } catch (error) {
    console.error('Review supplier error:', error);
    res.status(500).json({ message: 'Error reviewing supplier', error: error.message });
  }
};

// Get all procuring entities
const getProcuringEntities = async (req, res) => {
  try {
    const entities = await db.ProcuringEntity.findAll({
      include: [
        {
          model: db.User,
          as: 'user',
          attributes: ['id', 'email', 'firstName', 'lastName', 'isActive']
        },
        {
          model: db.Company,
          as: 'company'
        }
      ]
    });

    res.json({ procuringEntities: entities });
  } catch (error) {
    console.error('Get procuring entities error:', error);
    res.status(500).json({ message: 'Error fetching procuring entities', error: error.message });
  }
};

// Get all companies
const getCompanies = async (req, res) => {
  try {
    const companies = await db.Company.findAll({
      include: [
        {
          model: db.ProcuringEntity,
          as: 'procuringEntities'
        }
      ]
    });

    res.json({ companies });
  } catch (error) {
    console.error('Get companies error:', error);
    res.status(500).json({ message: 'Error fetching companies', error: error.message });
  }
};

// Update supplier (Admin)
const updateSupplier = async (req, res) => {
  try {
    const { supplierId } = req.params;
    const { firstName, lastName, phone, email, companyName, address, city, country, turnover, employeeCount, yearEstablished } = req.body;

    console.log('Update supplier request:', { supplierId, body: req.body });

    const supplier = await db.Supplier.findByPk(supplierId, {
      include: [{ model: db.User, as: 'user' }]
    });

    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found' });
    }

    // Update supplier info
    const supplierUpdates = {};
    if (companyName !== undefined && companyName !== null && companyName.trim() !== '') {
      supplierUpdates.companyName = companyName.trim();
    }
    if (address !== undefined && address !== null) {
      supplierUpdates.address = address.trim() || null;
    }
    if (city !== undefined && city !== null) {
      supplierUpdates.city = city.trim() || null;
    }
    if (country !== undefined && country !== null) {
      supplierUpdates.country = country.trim() || null;
    }
    if (turnover !== undefined && turnover !== null && turnover !== '') {
      const turnoverValue = parseFloat(turnover);
      if (!isNaN(turnoverValue)) supplierUpdates.turnover = turnoverValue;
    }
    if (employeeCount !== undefined && employeeCount !== null && employeeCount !== '') {
      const empCount = parseInt(employeeCount);
      if (!isNaN(empCount)) supplierUpdates.employeeCount = empCount;
    }
    if (yearEstablished !== undefined && yearEstablished !== null && yearEstablished !== '') {
      const year = parseInt(yearEstablished);
      if (!isNaN(year)) supplierUpdates.yearEstablished = year;
    }

    console.log('Supplier updates:', supplierUpdates);
    if (Object.keys(supplierUpdates).length > 0) {
      await supplier.update(supplierUpdates);
      console.log('Supplier updated');
    }

    // Update user info
    const userUpdates = {};
    if (firstName !== undefined && firstName !== null && firstName.trim() !== '') userUpdates.firstName = firstName.trim();
    if (lastName !== undefined && lastName !== null && lastName.trim() !== '') userUpdates.lastName = lastName.trim();
    if (phone !== undefined && phone !== null) userUpdates.phone = phone;
    if (email !== undefined && email !== null && email.trim() !== '') {
      const trimmedEmail = email.trim();
      // Check if email is already taken by another user
      const existingUser = await db.User.findOne({ 
        where: { email: trimmedEmail, id: { [Sequelize.Op.ne]: supplier.userId } } 
      });
      if (existingUser) {
        return res.status(400).json({ message: 'Email already in use' });
      }
      userUpdates.email = trimmedEmail;
    }

    console.log('User updates:', userUpdates);
    if (Object.keys(userUpdates).length > 0) {
      await db.User.update(userUpdates, { where: { id: supplier.userId } });
      console.log('User updated');
    }

    const updatedSupplier = await db.Supplier.findByPk(supplierId, {
      include: [
        {
          model: db.User,
          as: 'user',
          attributes: ['id', 'email', 'firstName', 'lastName', 'phone', 'isActive']
        },
        {
          model: db.CPVCode,
          as: 'cpvCodes',
          through: { attributes: [] }
        }
      ]
    });

    res.json({ message: 'Supplier updated successfully', supplier: updatedSupplier });
  } catch (error) {
    console.error('Update supplier error:', error);
    res.status(500).json({ message: 'Error updating supplier', error: error.message });
  }
};

// Update procuring entity (Admin)
const updateProcuringEntity = async (req, res) => {
  try {
    const { entityId } = req.params;
    const { firstName, lastName, phone, email, entityName, address, city, country, companyId } = req.body;

    console.log('Update entity request:', { entityId, body: req.body });

    const entity = await db.ProcuringEntity.findByPk(entityId, {
      include: [{ model: db.User, as: 'user' }]
    });

    if (!entity) {
      return res.status(404).json({ message: 'Procuring entity not found' });
    }

    // Update entity info
    const entityUpdates = {};
    if (entityName !== undefined && entityName !== null && entityName.trim() !== '') {
      entityUpdates.entityName = entityName.trim();
    }
    if (address !== undefined && address !== null) {
      entityUpdates.address = address.trim() || null;
    }
    if (city !== undefined && city !== null) {
      entityUpdates.city = city.trim() || null;
    }
    if (country !== undefined && country !== null) {
      entityUpdates.country = country.trim() || null;
    }
    if (companyId !== undefined && companyId !== null && companyId !== '') {
      entityUpdates.companyId = companyId;
    }

    console.log('Entity updates:', entityUpdates);
    if (Object.keys(entityUpdates).length > 0) {
      await entity.update(entityUpdates);
      console.log('Entity updated');
    }

    // Update user info
    const userUpdates = {};
    if (firstName !== undefined && firstName !== null && firstName.trim() !== '') userUpdates.firstName = firstName.trim();
    if (lastName !== undefined && lastName !== null && lastName.trim() !== '') userUpdates.lastName = lastName.trim();
    if (phone !== undefined && phone !== null) userUpdates.phone = phone;
    if (email !== undefined && email !== null && email.trim() !== '') {
      const trimmedEmail = email.trim();
      // Check if email is already taken by another user
      const existingUser = await db.User.findOne({ 
        where: { email: trimmedEmail, id: { [Sequelize.Op.ne]: entity.userId } } 
      });
      if (existingUser) {
        return res.status(400).json({ message: 'Email already in use' });
      }
      userUpdates.email = trimmedEmail;
    }

    console.log('User updates:', userUpdates);
    if (Object.keys(userUpdates).length > 0) {
      await db.User.update(userUpdates, { where: { id: entity.userId } });
      console.log('User updated');
    }

    const updatedEntity = await db.ProcuringEntity.findByPk(entityId, {
      include: [
        {
          model: db.User,
          as: 'user',
          attributes: ['id', 'email', 'firstName', 'lastName', 'phone']
        },
        {
          model: db.Company,
          as: 'company'
        }
      ]
    });

    res.json({ message: 'Procuring entity updated successfully', procuringEntity: updatedEntity });
  } catch (error) {
    console.error('Update procuring entity error:', error);
    res.status(500).json({ message: 'Error updating procuring entity', error: error.message });
  }
};

// Get single supplier by ID
const getSupplierById = async (req, res) => {
  try {
    const { supplierId } = req.params;

    const supplier = await db.Supplier.findByPk(supplierId, {
      include: [
        {
          model: db.User,
          as: 'user',
          attributes: ['id', 'email', 'firstName', 'lastName', 'phone']
        },
        {
          model: db.CPVCode,
          as: 'cpvCodes',
          through: { attributes: [] }
        }
      ]
    });

    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found' });
    }

    res.json({ supplier });
  } catch (error) {
    console.error('Get supplier error:', error);
    res.status(500).json({ message: 'Error fetching supplier', error: error.message });
  }
};

// Get single procuring entity by ID
const getProcuringEntityById = async (req, res) => {
  try {
    const { entityId } = req.params;

    const entity = await db.ProcuringEntity.findByPk(entityId, {
      include: [
        {
          model: db.User,
          as: 'user',
          attributes: ['id', 'email', 'firstName', 'lastName', 'phone', 'isActive']
        },
        {
          model: db.Company,
          as: 'company'
        }
      ]
    });

    if (!entity) {
      return res.status(404).json({ message: 'Procuring entity not found' });
    }

    res.json({ procuringEntity: entity });
  } catch (error) {
    console.error('Get procuring entity error:', error);
    res.status(500).json({ message: 'Error fetching procuring entity', error: error.message });
  }
};

// Toggle supplier active status
const toggleSupplierStatus = async (req, res) => {
  try {
    const { supplierId } = req.params;
    const { isActive } = req.body;

    const supplier = await db.Supplier.findByPk(supplierId, {
      include: [{ model: db.User, as: 'user' }]
    });

    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found' });
    }

    // Update user's active status
    await db.User.update(
      { isActive: isActive !== undefined ? isActive : !supplier.user.isActive },
      { where: { id: supplier.userId } }
    );

    // Also update entity's active status if it exists
    if (supplier.isActive !== undefined) {
      await supplier.update({ isActive: isActive !== undefined ? isActive : !supplier.isActive });
    }

    const updatedSupplier = await db.Supplier.findByPk(supplierId, {
      include: [
        {
          model: db.User,
          as: 'user',
          attributes: ['id', 'email', 'firstName', 'lastName', 'phone', 'isActive']
        }
      ]
    });

    const isNowActive = updatedSupplier.user && updatedSupplier.user.isActive;
    if (updatedSupplier.user && updatedSupplier.user.email) {
      const sendStatusEmail = isNowActive ? sendAccountActivatedEmail : sendAccountDeactivatedEmail;
      sendStatusEmail(
        updatedSupplier.user.email,
        updatedSupplier.user.firstName,
        updatedSupplier.user.lastName,
        'supplier'
      ).catch((err) => console.error('Failed to send supplier status change email:', err));
    }

    res.json({
      message: `Supplier ${isNowActive ? 'activated' : 'deactivated'} successfully`,
      supplier: updatedSupplier
    });
  } catch (error) {
    console.error('Toggle supplier status error:', error);
    res.status(500).json({ message: 'Error toggling supplier status', error: error.message });
  }
};

// Toggle procuring entity active status
const toggleProcuringEntityStatus = async (req, res) => {
  try {
    const { entityId } = req.params;
    const { isActive } = req.body;

    const entity = await db.ProcuringEntity.findByPk(entityId, {
      include: [{ model: db.User, as: 'user' }]
    });

    if (!entity) {
      return res.status(404).json({ message: 'Procuring entity not found' });
    }

    // Update user's active status
    await db.User.update(
      { isActive: isActive !== undefined ? isActive : !entity.user.isActive },
      { where: { id: entity.userId } }
    );

    // Also update entity's active status
    await entity.update({ isActive: isActive !== undefined ? isActive : !entity.isActive });

    const updatedEntity = await db.ProcuringEntity.findByPk(entityId, {
      include: [
        {
          model: db.User,
          as: 'user',
          attributes: ['id', 'email', 'firstName', 'lastName', 'phone', 'isActive']
        },
        {
          model: db.Company,
          as: 'company'
        }
      ]
    });

    const isNowActive = updatedEntity.user && updatedEntity.user.isActive;
    if (updatedEntity.user && updatedEntity.user.email) {
      const sendStatusEmail = isNowActive ? sendAccountActivatedEmail : sendAccountDeactivatedEmail;
      sendStatusEmail(
        updatedEntity.user.email,
        updatedEntity.user.firstName,
        updatedEntity.user.lastName,
        'procuring_entity'
      ).catch((err) => console.error('Failed to send entity status change email:', err));
    }

    res.json({
      message: `Procuring entity ${isNowActive ? 'activated' : 'deactivated'} successfully`,
      procuringEntity: updatedEntity
    });
  } catch (error) {
    console.error('Toggle procuring entity status error:', error);
    res.status(500).json({ message: 'Error toggling procuring entity status', error: error.message });
  }
};

// Reset supplier password (Admin only)
const resetSupplierPassword = async (req, res) => {
  try {
    const { supplierId } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters long' });
    }

    const supplier = await db.Supplier.findByPk(supplierId, {
      include: [{ model: db.User, as: 'user' }]
    });

    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found' });
    }

    const hashedPassword = await hashPassword(newPassword);
    await supplier.user.update({ password: hashedPassword });

    sendPasswordResetByAdminEmail(
      supplier.user.email,
      supplier.user.firstName,
      supplier.user.lastName,
      'supplier'
    ).catch((err) => console.error('Failed to send password reset email:', err));

    res.json({ message: 'Supplier password reset successfully' });
  } catch (error) {
    console.error('Reset supplier password error:', error);
    res.status(500).json({ message: 'Error resetting supplier password', error: error.message });
  }
};

// Reset procuring entity password (Admin only)
const resetProcuringEntityPassword = async (req, res) => {
  try {
    const { entityId } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters long' });
    }

    const procuringEntity = await db.ProcuringEntity.findByPk(entityId, {
      include: [{ model: db.User, as: 'user' }]
    });

    if (!procuringEntity) {
      return res.status(404).json({ message: 'Procuring entity not found' });
    }

    const hashedPassword = await hashPassword(newPassword);
    await procuringEntity.user.update({ password: hashedPassword });

    sendPasswordResetByAdminEmail(
      procuringEntity.user.email,
      procuringEntity.user.firstName,
      procuringEntity.user.lastName,
      'procuring_entity'
    ).catch((err) => console.error('Failed to send password reset email:', err));

    res.json({ message: 'Procuring entity password reset successfully' });
  } catch (error) {
    console.error('Reset procuring entity password error:', error);
    res.status(500).json({ message: 'Error resetting procuring entity password', error: error.message });
  }
};

module.exports = {
  createSupplier,
  createProcuringEntity,
  createCompany,
  getSuppliers,
  getSupplierById,
  reviewSupplier,
  updateSupplier,
  toggleSupplierStatus,
  resetSupplierPassword,
  getProcuringEntities,
  getProcuringEntityById,
  updateProcuringEntity,
  toggleProcuringEntityStatus,
  resetProcuringEntityPassword,
  getCompanies
};
