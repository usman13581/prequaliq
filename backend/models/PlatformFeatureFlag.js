module.exports = (sequelize, DataTypes) => {
  const PlatformFeatureFlag = sequelize.define(
    'PlatformFeatureFlag',
    {
      featureKey: {
        type: DataTypes.STRING(128),
        allowNull: false,
        primaryKey: true
      },
      enabled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      }
    },
    {
      tableName: 'platform_feature_flags',
      timestamps: true
    }
  );

  return PlatformFeatureFlag;
};
