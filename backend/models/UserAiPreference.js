module.exports = (sequelize, DataTypes) => {
  const UserAiPreference = sequelize.define(
    'UserAiPreference',
    {
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true,
        references: { model: 'users', key: 'id' }
      },
      masterEnabled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      preferences: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {}
      }
    },
    {
      tableName: 'user_ai_preferences',
      timestamps: true
    }
  );

  UserAiPreference.associate = (models) => {
    UserAiPreference.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
  };

  return UserAiPreference;
};