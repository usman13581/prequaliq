const db = require('../models');
const { hashPassword, comparePassword } = require('../utils/password');
const { generateToken } = require('../utils/jwt');

const register = async (req, res) => {
  try {
    const { email, password, firstName, lastName, phone, role } = req.body;

    const normalizedEmail = (email || '').trim().toLowerCase();
    // Check if user exists
    const existingUser = await db.User.findOne({ where: { email: normalizedEmail } });
    if (existingUser) {
      return res.status(400).json({ message: 'This email is already associated with another account. Please use a different email address.' });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const user = await db.User.create({
      email: normalizedEmail,
      password: hashedPassword,
      firstName,
      lastName,
      phone,
      role: role || 'supplier'
    });

    // Create role-specific records
    if (role === 'supplier') {
      await db.Supplier.create({
        userId: user.id,
        companyName: `${firstName} ${lastName} Company`
      });
    } else if (role === 'procuring_entity') {
      await db.ProcuringEntity.create({
        userId: user.id,
        entityName: `${firstName} ${lastName} Entity`
      });
    }

    const token = generateToken(user.id);

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Error registering user', error: error.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await db.User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await comparePassword(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({ message: 'Account is inactive' });
    }

    // Update last login
    await user.update({ lastLogin: new Date() });

    const token = generateToken(user.id);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Error during login', error: error.message });
  }
};

const getProfile = async (req, res) => {
  try {
    const user = await db.User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] },
      include: [
        {
          model: db.Supplier,
          as: 'supplier',
          include: [
            {
              model: db.CPVCode,
              as: 'cpvCodes',
              through: { attributes: [] }
            }
          ]
        },
        {
          model: db.ProcuringEntity,
          as: 'procuringEntity',
          include: [
            {
              model: db.Company,
              as: 'company'
            }
          ]
        }
      ]
    });

    res.json({ user });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Error fetching profile', error: error.message });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    console.log('Reset password request:', { userId, hasCurrentPassword: !!currentPassword, hasNewPassword: !!newPassword });

    // Find user with password (need to include password field for comparison)
    const user = await db.User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify current password
    const isMatch = await comparePassword(currentPassword, user.password);
    if (!isMatch) {
      console.log('Password mismatch');
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update password
    await user.update({ password: hashedPassword });

    console.log('Password reset successful for user:', userId);
    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Error resetting password', error: error.message });
  }
};

module.exports = { register, login, getProfile, resetPassword };
