module.exports = (sequelize, DataTypes) => {
  const AwardDecision = sequelize.define('AwardDecision', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    procedureId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      references: { model: 'procedures', key: 'id' }
    },
    winnerSupplierId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'suppliers', key: 'id' }
    },
    decisionMemo: { type: DataTypes.TEXT, allowNull: true },
    awardedAt: { type: DataTypes.DATE, allowNull: true },
    standstillEndsAt: { type: DataTypes.DATEONLY, allowNull: true },
    notifiedAt: { type: DataTypes.DATE, allowNull: true },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'users', key: 'id' }
    }
  }, {
    tableName: 'award_decisions',
    timestamps: true
  });

  AwardDecision.associate = (models) => {
    AwardDecision.belongsTo(models.Procedure, { foreignKey: 'procedureId', as: 'procedure' });
    AwardDecision.belongsTo(models.Supplier, { foreignKey: 'winnerSupplierId', as: 'winner' });
    AwardDecision.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' });
  };

  return AwardDecision;
};
