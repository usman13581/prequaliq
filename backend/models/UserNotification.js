module.exports = (sequelize, DataTypes) => {
  const UserNotification = sequelize.define('UserNotification', {
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
    type: {
      type: DataTypes.STRING,
      allowNull: false
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    message: {
      type: DataTypes.TEXT
    },
    linkTab: {
      type: DataTypes.STRING
    },
    linkPath: {
      type: DataTypes.STRING
    },
    meta: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    isRead: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  }, {
    tableName: 'user_notifications',
    timestamps: true
  });

  UserNotification.associate = (models) => {
    UserNotification.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
  };

  return UserNotification;
};
