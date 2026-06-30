module.exports = (sequelize, DataTypes) => {
  const SupplierNotification = sequelize.define('SupplierNotification', {
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
    type: {
      type: DataTypes.STRING,
      allowNull: false
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    message: {
      type: DataTypes.TEXT
    },
    linkTab: {
      type: DataTypes.STRING
    },
    isRead: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  }, {
    tableName: 'supplier_notifications',
    timestamps: true
  });

  SupplierNotification.associate = (models) => {
    SupplierNotification.belongsTo(models.Supplier, { foreignKey: 'supplierId', as: 'supplier' });
  };

  return SupplierNotification;
};
