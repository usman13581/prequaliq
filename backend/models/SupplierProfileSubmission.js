module.exports = (sequelize, DataTypes) => {
  const SupplierProfileSubmission = sequelize.define('SupplierProfileSubmission', {
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
    version: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected'),
      defaultValue: 'pending'
    },
    rejectionReason: {
      type: DataTypes.TEXT
    },
    submittedAt: {
      type: DataTypes.DATE,
      allowNull: false
    },
    reviewedAt: {
      type: DataTypes.DATE
    }
  }, {
    tableName: 'supplier_profile_submissions',
    timestamps: true
  });

  SupplierProfileSubmission.associate = (models) => {
    SupplierProfileSubmission.belongsTo(models.Supplier, { foreignKey: 'supplierId', as: 'supplier' });
  };

  return SupplierProfileSubmission;
};
