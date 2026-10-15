module.exports = (sequelize, DataTypes) => {
  const ContractMessage = sequelize.define('ContractMessage', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    contractId: { type: DataTypes.UUID, allowNull: false },
    senderUserId: { type: DataTypes.UUID, allowNull: false },
    senderRole: { type: DataTypes.ENUM('procuring_entity', 'supplier'), allowNull: false },
    body: { type: DataTypes.TEXT, allowNull: false }
  }, { tableName: 'contract_messages', timestamps: true });

  ContractMessage.associate = (models) => {
    ContractMessage.belongsTo(models.Contract, { foreignKey: 'contractId', as: 'contract' });
    ContractMessage.belongsTo(models.User, { foreignKey: 'senderUserId', as: 'sender' });
    ContractMessage.hasMany(models.ContractAttachment, { foreignKey: 'messageId', as: 'attachments' });
  };

  return ContractMessage;
};
