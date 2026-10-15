module.exports = (sequelize, DataTypes) => {
  const ContractAttachment = sequelize.define('ContractAttachment', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    contractId: { type: DataTypes.UUID, allowNull: false },
    messageId: { type: DataTypes.UUID, allowNull: false },
    fileName: { type: DataTypes.STRING, allowNull: false },
    filePath: { type: DataTypes.STRING, allowNull: false },
    mimeType: { type: DataTypes.STRING, allowNull: true },
    size: { type: DataTypes.INTEGER, allowNull: true },
    uploadedByUserId: { type: DataTypes.UUID, allowNull: true }
  }, { tableName: 'contract_attachments', timestamps: true });

  ContractAttachment.associate = (models) => {
    ContractAttachment.belongsTo(models.Contract, { foreignKey: 'contractId', as: 'contract' });
    ContractAttachment.belongsTo(models.ContractMessage, { foreignKey: 'messageId', as: 'message' });
    ContractAttachment.belongsTo(models.User, { foreignKey: 'uploadedByUserId', as: 'uploadedBy' });
  };

  return ContractAttachment;
};
