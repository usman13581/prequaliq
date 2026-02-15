module.exports = (sequelize, DataTypes) => {
  const Answer = sequelize.define('Answer', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    responseId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'questionnaire_responses',
        key: 'id'
      }
    },
    questionId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'questions',
        key: 'id'
      }
    },
    answerText: {
      type: DataTypes.TEXT
    },
    answerValue: {
      type: DataTypes.JSONB
    },
    documentId: {
      type: DataTypes.UUID,
      references: {
        model: 'documents',
        key: 'id'
      }
    }
  }, {
    tableName: 'answers',
    timestamps: true
  });

  Answer.associate = (models) => {
    Answer.belongsTo(models.QuestionnaireResponse, { foreignKey: 'responseId', as: 'response' });
    Answer.belongsTo(models.Question, { foreignKey: 'questionId', as: 'question' });
    Answer.belongsTo(models.Document, { foreignKey: 'documentId', as: 'document' });
  };

  return Answer;
};
