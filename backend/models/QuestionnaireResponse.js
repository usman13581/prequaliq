module.exports = (sequelize, DataTypes) => {
  const QuestionnaireResponse = sequelize.define('QuestionnaireResponse', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    questionnaireId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'questionnaires',
        key: 'id'
      }
    },
    supplierId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'suppliers',
        key: 'id'
      }
    },
    status: {
      type: DataTypes.ENUM('draft', 'submitted'),
      defaultValue: 'draft'
    },
    submittedAt: {
      type: DataTypes.DATE
    }
  }, {
    tableName: 'questionnaire_responses',
    timestamps: true
  });

  QuestionnaireResponse.associate = (models) => {
    QuestionnaireResponse.belongsTo(models.Questionnaire, { foreignKey: 'questionnaireId', as: 'questionnaire' });
    QuestionnaireResponse.belongsTo(models.Supplier, { foreignKey: 'supplierId', as: 'supplier' });
    QuestionnaireResponse.hasMany(models.Answer, { foreignKey: 'responseId', as: 'answers' });
  };

  return QuestionnaireResponse;
};
