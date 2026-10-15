module.exports = (sequelize, DataTypes) => {
  const Contract = sequelize.define('Contract', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    procuringEntityId: { type: DataTypes.UUID, allowNull: false },
    supplierId: { type: DataTypes.UUID, allowNull: true },
    procedureId: { type: DataTypes.UUID, allowNull: true },
    title: { type: DataTypes.STRING, allowNull: false },
    contractNumber: { type: DataTypes.STRING, allowNull: true },
    contractType: {
      type: DataTypes.ENUM('standard', 'framework', 'call_off', 'dis'),
      allowNull: false,
      defaultValue: 'standard'
    },
    parentContractId: { type: DataTypes.UUID, allowNull: true },
    startDate: { type: DataTypes.DATEONLY, allowNull: true },
    endDate: { type: DataTypes.DATEONLY, allowNull: true },
    valueAmount: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
    status: {
      type: DataTypes.ENUM('draft', 'active', 'expired', 'terminated'),
      allowNull: false,
      defaultValue: 'draft'
    },
    deliveryStatus: {
      type: DataTypes.ENUM('none', 'marked_done', 'changes_requested', 'accepted'),
      allowNull: false,
      defaultValue: 'none'
    },
    notes: { type: DataTypes.TEXT, allowNull: true },
    createdBy: { type: DataTypes.UUID, allowNull: true }
  }, { tableName: 'contracts', timestamps: true });

  Contract.associate = (models) => {
    Contract.belongsTo(models.ProcuringEntity, { foreignKey: 'procuringEntityId', as: 'procuringEntity' });
    Contract.belongsTo(models.Supplier, { foreignKey: 'supplierId', as: 'supplier' });
    Contract.belongsTo(models.Procedure, { foreignKey: 'procedureId', as: 'procedure' });
    Contract.belongsTo(models.Contract, { foreignKey: 'parentContractId', as: 'parent' });
    Contract.hasMany(models.Contract, { foreignKey: 'parentContractId', as: 'callOffs' });
    if (models.ContractMessage) {
      Contract.hasMany(models.ContractMessage, { foreignKey: 'contractId', as: 'messages' });
    }
    if (models.ContractAttachment) {
      Contract.hasMany(models.ContractAttachment, { foreignKey: 'contractId', as: 'attachments' });
    }
  };

  return Contract;
};
