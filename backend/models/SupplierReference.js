module.exports = (sequelize, DataTypes) => {
  const SupplierReference = sequelize.define('SupplierReference', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    supplierId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'suppliers', key: 'id' }
    },
    projectName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    clientName: {
      type: DataTypes.STRING
    },
    yearFrom: {
      type: DataTypes.INTEGER
    },
    yearTo: {
      type: DataTypes.INTEGER
    },
    contractValue: {
      type: DataTypes.STRING
    },
    description: {
      type: DataTypes.TEXT
    },
    contactName: {
      type: DataTypes.STRING
    },
    contactEmail: {
      type: DataTypes.STRING
    },
    contactPhone: {
      type: DataTypes.STRING
    }
  }, {
    tableName: 'supplier_references',
    timestamps: true
  });

  SupplierReference.associate = (models) => {
    SupplierReference.belongsTo(models.Supplier, { foreignKey: 'supplierId', as: 'supplier' });
  };

  return SupplierReference;
};
