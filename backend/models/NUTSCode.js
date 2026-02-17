module.exports = (sequelize, DataTypes) => {
  const NUTSCode = sequelize.define('NUTSCode', {
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
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    nameSwedish: {
      type: DataTypes.STRING,
      allowNull: false
    },
    level: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: '1 = NUTS 1, 2 = NUTS 2, 3 = NUTS 3'
    },
    parentCode: {
      type: DataTypes.STRING,
      allowNull: true,
      references: {
        model: 'nuts_codes',
        key: 'code'
      }
    }
  }, {
    tableName: 'nuts_codes',
    timestamps: true
  });

  NUTSCode.associate = (models) => {
    NUTSCode.belongsToMany(models.Supplier, {
      through: 'SupplierNUTS',
      foreignKey: 'nutsCodeId',
      as: 'suppliers'
    });
  };

  return NUTSCode;
};
