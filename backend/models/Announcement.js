module.exports = (sequelize, DataTypes) => {
  const Announcement = sequelize.define('Announcement', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    targetAudience: {
      type: DataTypes.ENUM('suppliers', 'procuring_entities', 'all'),
      defaultValue: 'all'
    },
    cpvCodeId: {
      type: DataTypes.UUID,
      references: {
        model: 'cpv_codes',
        key: 'id'
      }
    },
    expiryDate: {
      type: DataTypes.DATE,
      allowNull: false
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    procuringEntityId: {
      type: DataTypes.UUID,
      references: {
        model: 'procuring_entities',
        key: 'id'
      }
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'announcements',
    timestamps: true
  });

  Announcement.associate = (models) => {
    Announcement.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' });
    Announcement.belongsTo(models.ProcuringEntity, { foreignKey: 'procuringEntityId', as: 'procuringEntity' });
    Announcement.belongsTo(models.CPVCode, { foreignKey: 'cpvCodeId', as: 'cpvCode' });
  };

  return Announcement;
};
