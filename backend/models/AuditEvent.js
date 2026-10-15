module.exports = (sequelize, DataTypes) => {
  const AuditEvent = sequelize.define('AuditEvent', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    actorUserId: { type: DataTypes.UUID, allowNull: true },
    action: { type: DataTypes.STRING(128), allowNull: false },
    entityType: { type: DataTypes.STRING(64), allowNull: false },
    entityId: { type: DataTypes.UUID, allowNull: true },
    meta: { type: DataTypes.JSONB, allowNull: true }
  }, { tableName: 'audit_events', timestamps: true });
  AuditEvent.associate = (models) => {
    AuditEvent.belongsTo(models.User, { foreignKey: 'actorUserId', as: 'actor' });
  };
  return AuditEvent;
};
