module.exports = (sequelize, DataTypes) => {
  const ProcedureInvite = sequelize.define('ProcedureInvite', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    procedureId: { type: DataTypes.UUID, allowNull: false },
    supplierId: { type: DataTypes.UUID, allowNull: false },
    invitedBy: { type: DataTypes.UUID, allowNull: true },
    notifiedAt: { type: DataTypes.DATE, allowNull: true }
  }, { tableName: 'procedure_invites', timestamps: true });

  ProcedureInvite.associate = (models) => {
    ProcedureInvite.belongsTo(models.Procedure, { foreignKey: 'procedureId', as: 'procedure' });
    ProcedureInvite.belongsTo(models.Supplier, { foreignKey: 'supplierId', as: 'supplier' });
  };

  return ProcedureInvite;
};
