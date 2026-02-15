module.exports = (sequelize, DataTypes) => {
  const SupplierCPV = sequelize.define('SupplierCPV', {
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
    cpvCodeId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'cpv_codes',
        key: 'id'
      }
    }
  }, {
    tableName: 'supplier_cpv',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['supplierId', 'cpvCodeId']
      }
    ]
  });

  return SupplierCPV;
};
