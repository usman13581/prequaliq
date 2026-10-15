module.exports = (sequelize, DataTypes) => {
  const Procedure = sequelize.define('Procedure', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    procuringEntityId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'procuring_entities', key: 'id' }
    },
    questionnaireId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'questionnaires', key: 'id' }
    },
    title: { type: DataTypes.STRING, allowNull: false },
    referenceNumber: { type: DataTypes.STRING, allowNull: true },
    procedureType: {
      type: DataTypes.ENUM('open', 'restricted', 'negotiated', 'direct', 'framework', 'dis', 'other'),
      allowNull: false,
      defaultValue: 'open'
    },
    description: { type: DataTypes.TEXT, allowNull: true },
    status: {
      type: DataTypes.ENUM(
        'draft', 'planned', 'underlag_ready', 'published', 'qa_open',
        'bidding', 'evaluation', 'awarded', 'standstill', 'closed', 'cancelled'
      ),
      allowNull: false,
      defaultValue: 'draft'
    },
    plannedPublishAt: { type: DataTypes.DATEONLY, allowNull: true },
    bidDeadline: { type: DataTypes.DATEONLY, allowNull: true },
    qaDeadline: { type: DataTypes.DATEONLY, allowNull: true },
    standstillEndsAt: { type: DataTypes.DATEONLY, allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true },
    isSealed: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    sealedUntil: { type: DataTypes.DATE, allowNull: true },
    announcementText: { type: DataTypes.TEXT, allowNull: true },
    afterAnnounceText: { type: DataTypes.TEXT, allowNull: true },
    closedAt: { type: DataTypes.DATE, allowNull: true },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'users', key: 'id' }
    }
  }, {
    tableName: 'procedures',
    timestamps: true
  });

  Procedure.associate = (models) => {
    Procedure.belongsTo(models.ProcuringEntity, { foreignKey: 'procuringEntityId', as: 'procuringEntity' });
    Procedure.belongsTo(models.Questionnaire, { foreignKey: 'questionnaireId', as: 'questionnaire' });
    Procedure.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' });
    Procedure.hasMany(models.ProcedureQaMessage, { foreignKey: 'procedureId', as: 'qaMessages' });
    Procedure.hasMany(models.BidEvaluation, { foreignKey: 'procedureId', as: 'evaluations' });
    Procedure.hasOne(models.AwardDecision, { foreignKey: 'procedureId', as: 'awardDecision' });
    if (models.ProcedureWatch) Procedure.hasMany(models.ProcedureWatch, { foreignKey: 'procedureId', as: 'watches' });
    if (models.ComplementRequest) Procedure.hasMany(models.ComplementRequest, { foreignKey: 'procedureId', as: 'complements' });
    if (models.EspdDeclaration) Procedure.hasMany(models.EspdDeclaration, { foreignKey: 'procedureId', as: 'espdDeclarations' });
    if (models.ProcedureInvite) Procedure.hasMany(models.ProcedureInvite, { foreignKey: 'procedureId', as: 'invites' });
    if (models.QuestionnaireResponse) {
      Procedure.hasMany(models.QuestionnaireResponse, { foreignKey: 'procedureId', as: 'bidResponses' });
    }
  };

  return Procedure;
};
