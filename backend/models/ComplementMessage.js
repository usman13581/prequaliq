module.exports = (sequelize, DataTypes) => {
  const ComplementMessage = sequelize.define('ComplementMessage', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    complementRequestId: { type: DataTypes.UUID, allowNull: false },
    authorUserId: { type: DataTypes.UUID, allowNull: false },
    authorRole: { type: DataTypes.ENUM('procuring_entity', 'supplier'), allowNull: false },
    body: { type: DataTypes.TEXT, allowNull: false }
  }, { tableName: 'complement_messages', timestamps: true });

  ComplementMessage.associate = (models) => {
    ComplementMessage.belongsTo(models.ComplementRequest, { foreignKey: 'complementRequestId', as: 'complement' });
    ComplementMessage.belongsTo(models.User, { foreignKey: 'authorUserId', as: 'author' });
    ComplementMessage.hasMany(models.ComplementAttachment, { foreignKey: 'messageId', as: 'attachments' });
  };

  return ComplementMessage;
};
