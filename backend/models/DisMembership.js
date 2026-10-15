module.exports = (sequelize, DataTypes) => {
  const DisMembership = sequelize.define('DisMembership', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    procedureId: { type: DataTypes.UUID, allowNull: false },
    supplierId: { type: DataTypes.UUID, allowNull: false },
    status: {
      type: DataTypes.ENUM('applied', 'admitted', 'rejected'),
      allowNull: false,
      defaultValue: 'applied'
    },
    notes: { type: DataTypes.TEXT, allowNull: true }
  }, { tableName: 'dis_memberships', timestamps: true });

  DisMembership.associate = (models) => {
    DisMembership.belongsTo(models.Procedure, { foreignKey: 'procedureId', as: 'procedure' });
    DisMembership.belongsTo(models.Supplier, { foreignKey: 'supplierId', as: 'supplier' });
  };

  return DisMembership;
};
