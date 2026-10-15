module.exports = (sequelize, DataTypes) => {
  const LookupType = sequelize.define(
    'LookupType',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      key: {
        type: DataTypes.STRING(128),
        allowNull: false,
        unique: true
      },
      labelEn: {
        type: DataTypes.STRING,
        allowNull: false
      },
      labelSv: {
        type: DataTypes.STRING,
        allowNull: false
      },
      isSystem: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      }
    },
    {
      tableName: 'lookup_types',
      timestamps: true
    }
  );

  return LookupType;
};
