module.exports = (sequelize, DataTypes) => {
  const SupplierNUTS = sequelize.define('SupplierNUTS', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    supplierId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'suppliers',
        key: 'id'
      }
    },
    nutsCodeId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'nuts_codes',
        key: 'id'
      }
    }
  }, {
    tableName: 'supplier_nuts',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['supplierId', 'nutsCodeId']
      }
    ]
  });

  return SupplierNUTS;
};
