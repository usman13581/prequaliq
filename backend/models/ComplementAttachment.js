module.exports = (sequelize, DataTypes) => {
  const ComplementAttachment = sequelize.define('ComplementAttachment', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    messageId: { type: DataTypes.UUID, allowNull: false },
    fileName: { type: DataTypes.STRING, allowNull: false },
    filePath: { type: DataTypes.STRING, allowNull: false },
    mimeType: { type: DataTypes.STRING, allowNull: true },
    fileSize: { type: DataTypes.INTEGER, allowNull: true },
    uploadedBy: { type: DataTypes.UUID, allowNull: true }
  }, { tableName: 'complement_attachments', timestamps: true });

  ComplementAttachment.associate = (models) => {
    ComplementAttachment.belongsTo(models.ComplementMessage, { foreignKey: 'messageId', as: 'message' });
    ComplementAttachment.belongsTo(models.User, { foreignKey: 'uploadedBy', as: 'uploader' });
  };

  return ComplementAttachment;
};
