const crypto = require('crypto');
const db = require('../models');
const { sendOrgInviteEmail } = require('../services/emailService');

async function resolveOwnerForUser(user) {
  if (user.role === 'procuring_entity') {
    const entity = await db.ProcuringEntity.findOne({ where: { userId: user.id } });
    if (!entity) return null;
    return {
      ownerType: 'procuring_entity',
      ownerId: entity.id,
      orgName: entity.entityName || 'Organization',
      status: entity.status
    };
  }
  if (user.role === 'supplier') {
    const supplier = await db.Supplier.findOne({ where: { userId: user.id } });
    if (!supplier) return null;
    return {
      ownerType: 'supplier',
      ownerId: supplier.id,
      orgName: supplier.companyName || 'Organization',
      status: supplier.status
    };
  }
  return null;
}

async function assertOrgAdmin(user, owner) {
  if (!db.OrgMembership) return true;
  const membership = await db.OrgMembership.findOne({
    where: {
      userId: user.id,
      ownerType: owner.ownerType,
      ownerId: owner.ownerId
    }
  });
  if (!membership) {
    // Legacy single-user org: treat primary user as admin
    return true;
  }
  return ['owner', 'admin'].includes(membership.membershipRole);
}

const listMyInvites = async (req, res) => {
  try {
    if (!db.OrgInvite) return res.json({ invites: [] });
    const owner = await resolveOwnerForUser(req.user);
    if (!owner) return res.status(404).json({ message: 'Organization not found' });
    const invites = await db.OrgInvite.findAll({
      where: { ownerType: owner.ownerType, ownerId: owner.ownerId },
      include: [
        { model: db.Department, as: 'department', attributes: ['id', 'name'], required: false },
        { model: db.User, as: 'inviter', attributes: ['id', 'firstName', 'lastName', 'email'], required: false }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json({ invites });
  } catch (error) {
    console.error('List org invites error:', error);
    res.status(500).json({ message: 'Error listing invites', error: error.message });
  }
};

const listMyMembers = async (req, res) => {
  try {
    if (!db.OrgMembership) return res.json({ members: [] });
    const owner = await resolveOwnerForUser(req.user);
    if (!owner) return res.status(404).json({ message: 'Organization not found' });
    const members = await db.OrgMembership.findAll({
      where: { ownerType: owner.ownerType, ownerId: owner.ownerId },
      include: [
        { model: db.User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'email', 'role'] },
        { model: db.Department, as: 'department', attributes: ['id', 'name'], required: false }
      ],
      order: [['createdAt', 'ASC']]
    });
    res.json({ members });
  } catch (error) {
    console.error('List org members error:', error);
    res.status(500).json({ message: 'Error listing members', error: error.message });
  }
};

const createInvite = async (req, res) => {
  try {
    if (!db.OrgInvite) {
      return res.status(503).json({ message: 'Org invites not available' });
    }
    const owner = await resolveOwnerForUser(req.user);
    if (!owner) return res.status(404).json({ message: 'Organization not found' });
    if (owner.status && owner.status !== 'approved') {
      return res.status(403).json({ message: 'Organization must be approved before inviting users' });
    }
    const allowed = await assertOrgAdmin(req.user, owner);
    if (!allowed) return res.status(403).json({ message: 'Only org admins can invite users' });

    const email = String(req.body.email || '').trim().toLowerCase();
    if (!email || !email.includes('@')) {
      return res.status(400).json({ message: 'Valid email is required' });
    }

    const membershipRole = req.body.membershipRole === 'admin' ? 'admin' : 'member';
    const departmentId = req.body.departmentId || null;
    if (departmentId) {
      const dept = await db.Department.findByPk(departmentId);
      if (!dept || dept.ownerType !== owner.ownerType || dept.ownerId !== owner.ownerId) {
        return res.status(400).json({ message: 'Invalid department' });
      }
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    const invite = await db.OrgInvite.create({
      email,
      ownerType: owner.ownerType,
      ownerId: owner.ownerId,
      departmentId,
      membershipRole,
      token,
      invitedBy: req.user.id,
      status: 'pending',
      expiresAt
    });

    const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
    const acceptUrl = `${frontendUrl}/accept-invite?token=${token}`;
    sendOrgInviteEmail(email, owner.orgName, acceptUrl).catch((err) =>
      console.error('Org invite email failed:', err.message)
    );

    res.status(201).json({ message: 'Invitation sent', invite: { ...invite.toJSON(), token: undefined } });
  } catch (error) {
    console.error('Create org invite error:', error);
    res.status(500).json({ message: 'Error creating invite', error: error.message });
  }
};

const revokeInvite = async (req, res) => {
  try {
    if (!db.OrgInvite) return res.status(404).json({ message: 'Invite not found' });
    const owner = await resolveOwnerForUser(req.user);
    if (!owner) return res.status(404).json({ message: 'Organization not found' });
    const allowed = await assertOrgAdmin(req.user, owner);
    if (!allowed) return res.status(403).json({ message: 'Only org admins can revoke invites' });

    const invite = await db.OrgInvite.findByPk(req.params.inviteId);
    if (!invite || invite.ownerType !== owner.ownerType || invite.ownerId !== owner.ownerId) {
      return res.status(404).json({ message: 'Invite not found' });
    }
    await invite.update({ status: 'revoked' });
    res.json({ message: 'Invite revoked', invite });
  } catch (error) {
    console.error('Revoke org invite error:', error);
    res.status(500).json({ message: 'Error revoking invite', error: error.message });
  }
};

const acceptInvite = async (req, res) => {
  try {
    if (!db.OrgInvite || !db.OrgMembership) {
      return res.status(503).json({ message: 'Org invites not available' });
    }
    const token = String(req.body.token || req.query.token || '').trim();
    if (!token) return res.status(400).json({ message: 'Invite token is required' });

    const invite = await db.OrgInvite.findOne({ where: { token, status: 'pending' } });
    if (!invite) return res.status(404).json({ message: 'Invite not found or already used' });
    if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
      return res.status(410).json({ message: 'Invite has expired' });
    }

    const userEmail = String(req.user.email || '').toLowerCase();
    if (userEmail !== String(invite.email).toLowerCase()) {
      return res.status(403).json({
        message: `This invite was sent to ${invite.email}. Please log in with that email.`
      });
    }

    // Role must match org type
    if (invite.ownerType === 'procuring_entity' && req.user.role !== 'procuring_entity') {
      return res.status(403).json({ message: 'Buyer account required to accept this invite' });
    }
    if (invite.ownerType === 'supplier' && req.user.role !== 'supplier') {
      return res.status(403).json({ message: 'Supplier account required to accept this invite' });
    }

    const [membership] = await db.OrgMembership.findOrCreate({
      where: {
        userId: req.user.id,
        ownerType: invite.ownerType,
        ownerId: invite.ownerId
      },
      defaults: {
        departmentId: invite.departmentId,
        membershipRole: invite.membershipRole === 'admin' ? 'admin' : 'member'
      }
    });
    if (membership.departmentId !== invite.departmentId || membership.membershipRole !== invite.membershipRole) {
      await membership.update({
        departmentId: invite.departmentId,
        membershipRole: invite.membershipRole === 'admin' ? 'admin' : 'member'
      });
    }

    await invite.update({ status: 'accepted', acceptedUserId: req.user.id });
    res.json({ message: 'Invitation accepted', membership });
  } catch (error) {
    console.error('Accept org invite error:', error);
    res.status(500).json({ message: 'Error accepting invite', error: error.message });
  }
};

const previewInvite = async (req, res) => {
  try {
    if (!db.OrgInvite) return res.status(404).json({ message: 'Invite not found' });
    const token = String(req.query.token || '').trim();
    if (!token) return res.status(400).json({ message: 'token is required' });
    const invite = await db.OrgInvite.findOne({
      where: { token },
      attributes: ['id', 'email', 'ownerType', 'membershipRole', 'status', 'expiresAt']
    });
    if (!invite) return res.status(404).json({ message: 'Invite not found' });
    res.json({ invite });
  } catch (error) {
    console.error('Preview org invite error:', error);
    res.status(500).json({ message: 'Error loading invite', error: error.message });
  }
};

module.exports = {
  listMyInvites,
  listMyMembers,
  createInvite,
  revokeInvite,
  acceptInvite,
  previewInvite
};
