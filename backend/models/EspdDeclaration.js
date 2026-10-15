module.exports = (sequelize, DataTypes) => {
  const EspdDeclaration = sequelize.define('EspdDeclaration', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    procedureId: { type: DataTypes.UUID, allowNull: false },
    supplierId: { type: DataTypes.UUID, allowNull: false },
    exclusionGroundsOk: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    declarationText: { type: DataTypes.TEXT, allowNull: true },
    submittedAt: { type: DataTypes.DATE, allowNull: true }
  }, { tableName: 'espd_declarations', timestamps: true });
  EspdDeclaration.associate = (models) => {
    EspdDeclaration.belongsTo(models.Procedure, { foreignKey: 'procedureId', as: 'procedure' });
    EspdDeclaration.belongsTo(models.Supplier, { foreignKey: 'supplierId', as: 'supplier' });
  };
  return EspdDeclaration;
};
