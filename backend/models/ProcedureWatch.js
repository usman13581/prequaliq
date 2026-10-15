module.exports = (sequelize, DataTypes) => {
  const ProcedureWatch = sequelize.define('ProcedureWatch', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    procedureId: { type: DataTypes.UUID, allowNull: false },
    supplierId: { type: DataTypes.UUID, allowNull: false }
  }, { tableName: 'procedure_watches', timestamps: true });
  ProcedureWatch.associate = (models) => {
    ProcedureWatch.belongsTo(models.Procedure, { foreignKey: 'procedureId', as: 'procedure' });
    ProcedureWatch.belongsTo(models.Supplier, { foreignKey: 'supplierId', as: 'supplier' });
  };
  return ProcedureWatch;
};
