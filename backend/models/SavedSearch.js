module.exports = (sequelize, DataTypes) => {
  const SavedSearch = sequelize.define(
    'SavedSearch',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' }
      },
      scope: {
        type: DataTypes.STRING(128),
        allowNull: false
      },
      name: {
        type: DataTypes.STRING(160),
        allowNull: false
      },
      filters: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {}
      }
    },
    {
      tableName: 'saved_searches',
      timestamps: true
    }
  );

  SavedSearch.associate = (models) => {
    SavedSearch.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
  };

  return SavedSearch;
};
