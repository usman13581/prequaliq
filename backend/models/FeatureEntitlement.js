module.exports = (sequelize, DataTypes) => {
  const FeatureEntitlement = sequelize.define('FeatureEntitlement', {
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
    featureKey: {
      type: DataTypes.STRING(128),
      allowNull: false
    },
    enabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    }
  }, {
    tableName: 'feature_entitlements',
    timestamps: true,
    indexes: [
      { unique: true, fields: ['userId', 'featureKey'] }
    ]
  });

  FeatureEntitlement.associate = (models) => {
    FeatureEntitlement.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
  };

  return FeatureEntitlement;
};
