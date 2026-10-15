module.exports = (sequelize, DataTypes) => {
  const ComplementRequest = sequelize.define('ComplementRequest', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    procedureId: { type: DataTypes.UUID, allowNull: false },
    supplierId: { type: DataTypes.UUID, allowNull: false },
    requestedBy: { type: DataTypes.UUID, allowNull: true },
    message: { type: DataTypes.TEXT, allowNull: false },
    deadline: { type: DataTypes.DATEONLY, allowNull: true },
    status: { type: DataTypes.ENUM('open', 'responded', 'closed'), allowNull: false, defaultValue: 'open' },
    responseText: { type: DataTypes.TEXT, allowNull: true },
    respondedAt: { type: DataTypes.DATE, allowNull: true }
  }, { tableName: 'complement_requests', timestamps: true });
  ComplementRequest.associate = (models) => {
    ComplementRequest.belongsTo(models.Procedure, { foreignKey: 'procedureId', as: 'procedure' });
    ComplementRequest.belongsTo(models.Supplier, { foreignKey: 'supplierId', as: 'supplier' });
    ComplementRequest.belongsTo(models.User, { foreignKey: 'requestedBy', as: 'requester' });
    if (models.ComplementMessage) {
      ComplementRequest.hasMany(models.ComplementMessage, { foreignKey: 'complementRequestId', as: 'messages' });
    }
  };
  return ComplementRequest;
};
