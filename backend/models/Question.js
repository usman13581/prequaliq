module.exports = (sequelize, DataTypes) => {
  const Question = sequelize.define('Question', {
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
    questionText: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    questionType: {
      type: DataTypes.ENUM('text', 'textarea', 'number', 'date', 'yes_no', 'multiple_choice', 'radio', 'checkbox', 'dropdown'),
      defaultValue: 'text'
    },
    options: {
      type: DataTypes.JSONB
    },
    isRequired: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    requiresDocument: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    documentType: {
      type: DataTypes.STRING
    },
    order: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    }
  }, {
    tableName: 'questions',
    timestamps: true
  });

  Question.associate = (models) => {
    Question.belongsTo(models.Questionnaire, { foreignKey: 'questionnaireId', as: 'questionnaire' });
    Question.hasMany(models.Answer, { foreignKey: 'questionId', as: 'answers' });
  };

  return Question;
};
