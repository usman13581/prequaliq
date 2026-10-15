module.exports = (sequelize, DataTypes) => {
  const Department = sequelize.define('Department', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    ownerType: {
      type: DataTypes.ENUM('procuring_entity', 'supplier', 'company'),
      allowNull: false
    },
    ownerId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  }, {
    tableName: 'departments',
    timestamps: true
  });

  Department.associate = (models) => {
    Department.hasMany(models.OrgMembership, { foreignKey: 'departmentId', as: 'memberships' });
  };

  return Department;
};
