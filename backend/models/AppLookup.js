module.exports = (sequelize, DataTypes) => {
  const AppLookup = sequelize.define(
    'AppLookup',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      typeKey: {
        type: DataTypes.STRING(128),
        allowNull: false
      },
      code: {
        type: DataTypes.STRING(128),
        allowNull: false
      },
      labelEn: {
        type: DataTypes.STRING,
        allowNull: false
      },
      labelSv: {
        type: DataTypes.STRING,
        allowNull: false
      },
      sortOrder: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      parentCode: {
        type: DataTypes.STRING(128),
        allowNull: true
      },
      level: {
        type: DataTypes.INTEGER,
        allowNull: true
      }
    },
    {
      tableName: 'app_lookups',
      timestamps: true,
      indexes: [
        { unique: true, fields: ['typeKey', 'code'] },
        { fields: ['typeKey'] }
      ]
    }
  );

  return AppLookup;
};
