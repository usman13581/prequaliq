module.exports = (sequelize, DataTypes) => {
  const BidEvaluation = sequelize.define('BidEvaluation', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    procedureId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'procedures', key: 'id' }
    },
    supplierId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'suppliers', key: 'id' }
    },
    responseId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'questionnaire_responses', key: 'id' }
    },
    score: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true },
    evaluatedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'users', key: 'id' }
    }
  }, {
    tableName: 'bid_evaluations',
    timestamps: true
  });

  BidEvaluation.associate = (models) => {
    BidEvaluation.belongsTo(models.Procedure, { foreignKey: 'procedureId', as: 'procedure' });
    BidEvaluation.belongsTo(models.Supplier, { foreignKey: 'supplierId', as: 'supplier' });
    BidEvaluation.belongsTo(models.QuestionnaireResponse, { foreignKey: 'responseId', as: 'response' });
    BidEvaluation.belongsTo(models.User, { foreignKey: 'evaluatedBy', as: 'evaluator' });
  };

  return BidEvaluation;
};
