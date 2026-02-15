module.exports = (sequelize, DataTypes) => {
  const Questionnaire = sequelize.define('Questionnaire', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    procuringEntityId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'procuring_entities',
        key: 'id'
      }
    },
    cpvCodeId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'cpv_codes',
        key: 'id'
      }
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT
    },
    deadline: {
      type: DataTypes.DATE,
      allowNull: false
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    createdBy: {
      type: DataTypes.UUID,
      references: {
        model: 'users',
        key: 'id'
      }
    }
  }, {
    tableName: 'questionnaires',
    timestamps: true
  });

  Questionnaire.associate = (models) => {
    Questionnaire.belongsTo(models.ProcuringEntity, { foreignKey: 'procuringEntityId', as: 'procuringEntity' });
    Questionnaire.belongsTo(models.CPVCode, { foreignKey: 'cpvCodeId', as: 'cpvCode' });
    Questionnaire.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' });
    Questionnaire.hasMany(models.Question, { foreignKey: 'questionnaireId', as: 'questions' });
    Questionnaire.hasMany(models.QuestionnaireResponse, { foreignKey: 'questionnaireId', as: 'responses' });
  };

  return Questionnaire;
};
