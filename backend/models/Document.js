module.exports = (sequelize, DataTypes) => {
  const Document = sequelize.define('Document', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    supplierId: {
      type: DataTypes.UUID,
      references: {
        model: 'suppliers',
        key: 'id'
      }
    },
    procuringEntityId: {
      type: DataTypes.UUID,
      references: {
        model: 'procuring_entities',
        key: 'id'
      }
    },
    documentType: {
      type: DataTypes.STRING,
      allowNull: false
    },
    fileName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    filePath: {
      type: DataTypes.STRING,
      allowNull: false
    },
    fileSize: {
      type: DataTypes.INTEGER
    },
    mimeType: {
      type: DataTypes.STRING
    },
    uploadedBy: {
      type: DataTypes.UUID,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    isVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    verifiedAt: {
      type: DataTypes.DATE
    },
    verifiedBy: {
      type: DataTypes.UUID,
      references: {
        model: 'users',
        key: 'id'
      }
    }
  }, {
    tableName: 'documents',
    timestamps: true
  });

  Document.associate = (models) => {
    Document.belongsTo(models.Supplier, { foreignKey: 'supplierId', as: 'supplier' });
    Document.belongsTo(models.ProcuringEntity, { foreignKey: 'procuringEntityId', as: 'procuringEntity' });
    Document.belongsTo(models.User, { foreignKey: 'uploadedBy', as: 'uploader' });
    Document.belongsTo(models.User, { foreignKey: 'verifiedBy', as: 'verifier' });
  };

  return Document;
};
