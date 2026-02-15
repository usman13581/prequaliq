module.exports = (sequelize, DataTypes) => {
  const CPVCode = sequelize.define('CPVCode', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    code: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    parentCode: {
      type: DataTypes.STRING,
      references: {
        model: 'cpv_codes',
        key: 'code'
      }
    },
    level: {
      type: DataTypes.INTEGER,
      defaultValue: 1
    }
  }, {
    tableName: 'cpv_codes',
    timestamps: true
  });

  CPVCode.associate = (models) => {
    CPVCode.hasMany(models.Questionnaire, { foreignKey: 'cpvCodeId', as: 'questionnaires' });
    CPVCode.hasMany(models.Announcement, { foreignKey: 'cpvCodeId', as: 'announcements' });
    CPVCode.belongsToMany(models.Supplier, {
      through: 'SupplierCPV',
      foreignKey: 'cpvCodeId',
      as: 'suppliers'
    });
  };

  return CPVCode;
};
