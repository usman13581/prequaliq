module.exports = (sequelize, DataTypes) => {
  const OrgInvite = sequelize.define('OrgInvite', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    email: { type: DataTypes.STRING, allowNull: false },
    ownerType: { type: DataTypes.ENUM('procuring_entity', 'supplier'), allowNull: false },
    ownerId: { type: DataTypes.UUID, allowNull: false },
    departmentId: { type: DataTypes.UUID, allowNull: true },
    membershipRole: { type: DataTypes.ENUM('admin', 'member'), allowNull: false, defaultValue: 'member' },
    token: { type: DataTypes.STRING, allowNull: false, unique: true },
    invitedBy: { type: DataTypes.UUID, allowNull: true },
    status: { type: DataTypes.ENUM('pending', 'accepted', 'revoked'), allowNull: false, defaultValue: 'pending' },
    acceptedUserId: { type: DataTypes.UUID, allowNull: true },
    expiresAt: { type: DataTypes.DATE, allowNull: true }
  }, { tableName: 'org_invites', timestamps: true });

  OrgInvite.associate = (models) => {
    OrgInvite.belongsTo(models.User, { foreignKey: 'invitedBy', as: 'inviter' });
    OrgInvite.belongsTo(models.Department, { foreignKey: 'departmentId', as: 'department' });
  };

  return OrgInvite;
};
