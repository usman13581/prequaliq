module.exports = (sequelize, DataTypes) => {
  const OrgMembership = sequelize.define('OrgMembership', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' }
    },
    ownerType: {
      type: DataTypes.ENUM('procuring_entity', 'supplier'),
      allowNull: false
    },
    ownerId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    departmentId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'departments', key: 'id' }
    },
    membershipRole: {
      type: DataTypes.ENUM('owner', 'admin', 'member'),
      allowNull: false,
      defaultValue: 'member'
    }
  }, {
    tableName: 'org_memberships',
    timestamps: true
  });

  OrgMembership.associate = (models) => {
    OrgMembership.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    OrgMembership.belongsTo(models.Department, { foreignKey: 'departmentId', as: 'department' });
  };

  return OrgMembership;
};
