module.exports = (sequelize, DataTypes) => {
  const ProcedureQaMessage = sequelize.define('ProcedureQaMessage', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    procedureId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'procedures', key: 'id' }
    },
    /** Private thread owner — each supplier has a 1:1 chat with the buyer on this procedure */
    threadSupplierId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'suppliers', key: 'id' }
    },
    authorUserId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' }
    },
    authorRole: {
      type: DataTypes.ENUM('procuring_entity', 'supplier'),
      allowNull: false
    },
    parentId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'procedure_qa_messages', key: 'id' }
    },
    body: { type: DataTypes.TEXT, allowNull: false },
    isPublic: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false }
  }, {
    tableName: 'procedure_qa_messages',
    timestamps: true
  });

  ProcedureQaMessage.associate = (models) => {
    ProcedureQaMessage.belongsTo(models.Procedure, { foreignKey: 'procedureId', as: 'procedure' });
    ProcedureQaMessage.belongsTo(models.Supplier, { foreignKey: 'threadSupplierId', as: 'threadSupplier' });
    ProcedureQaMessage.belongsTo(models.User, { foreignKey: 'authorUserId', as: 'author' });
    ProcedureQaMessage.belongsTo(models.ProcedureQaMessage, { foreignKey: 'parentId', as: 'parent' });
    ProcedureQaMessage.hasMany(models.ProcedureQaMessage, { foreignKey: 'parentId', as: 'replies' });
  };

  return ProcedureQaMessage;
};
