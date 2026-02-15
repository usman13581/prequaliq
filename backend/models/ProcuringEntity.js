module.exports = (sequelize, DataTypes) => {
  const ProcuringEntity = sequelize.define('ProcuringEntity', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    companyId: {
      type: DataTypes.UUID,
      references: {
        model: 'companies',
        key: 'id'
      }
    },
    entityName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    address: {
      type: DataTypes.TEXT
    },
    city: {
      type: DataTypes.STRING
    },
    country: {
      type: DataTypes.STRING
    },
    phone: {
      type: DataTypes.STRING
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'procuring_entities',
    timestamps: true
  });

  ProcuringEntity.associate = (models) => {
    ProcuringEntity.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    ProcuringEntity.belongsTo(models.Company, { foreignKey: 'companyId', as: 'company' });
    ProcuringEntity.hasMany(models.Questionnaire, { foreignKey: 'procuringEntityId', as: 'questionnaires' });
    ProcuringEntity.hasMany(models.Announcement, { foreignKey: 'procuringEntityId', as: 'announcements' });
    ProcuringEntity.hasMany(models.Document, { foreignKey: 'procuringEntityId', as: 'documents' });
  };

  return ProcuringEntity;
};
