module.exports = (sequelize, DataTypes) => {
  const Supplier = sequelize.define('Supplier', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    companyName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    registrationNumber: {
      type: DataTypes.STRING
    },
    taxId: {
      type: DataTypes.STRING
    },
    address: {
      type: DataTypes.TEXT
    },
    city: {
      type: DataTypes.STRING
    },
    country: {
      type: DataTypes.STRING
    },
    phone: {
      type: DataTypes.STRING
    },
    website: {
      type: DataTypes.STRING
    },
    turnover: {
      type: DataTypes.DECIMAL(15, 2)
    },
    employeeCount: {
      type: DataTypes.INTEGER
    },
    yearEstablished: {
      type: DataTypes.INTEGER
    },
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected'),
      defaultValue: 'pending'
    },
    approvedAt: {
      type: DataTypes.DATE
    },
    approvedBy: {
      type: DataTypes.UUID,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    rejectionReason: {
      type: DataTypes.TEXT
    }
  }, {
    tableName: 'suppliers',
    timestamps: true
  });

  Supplier.associate = (models) => {
    Supplier.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    Supplier.belongsTo(models.User, { foreignKey: 'approvedBy', as: 'approver' });
    Supplier.hasMany(models.Document, { foreignKey: 'supplierId', as: 'documents' });
    Supplier.hasMany(models.QuestionnaireResponse, { foreignKey: 'supplierId', as: 'questionnaireResponses' });
    Supplier.belongsToMany(models.CPVCode, {
      through: 'SupplierCPV',
      foreignKey: 'supplierId',
      as: 'cpvCodes'
    });
    // NUTS codes association - only if NUTSCode model exists (after migrations)
    if (models.NUTSCode) {
      Supplier.belongsToMany(models.NUTSCode, {
        through: 'SupplierNUTS',
        foreignKey: 'supplierId',
        as: 'nutsCodes'
      });
    }
  };

  return Supplier;
};
