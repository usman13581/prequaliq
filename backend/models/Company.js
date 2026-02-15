module.exports = (sequelize, DataTypes) => {
  const Company = sequelize.define('Company', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    registrationNumber: {
      type: DataTypes.STRING,
      unique: true
    },
    address: {
      type: DataTypes.TEXT
    },
    city: {
      type: DataTypes.STRING
    },
    country: {
      type: DataTypes.STRING
    },
    phone: {
      type: DataTypes.STRING
    },
    email: {
      type: DataTypes.STRING,
      validate: {
        isEmail: true
      }
    },
    website: {
      type: DataTypes.STRING
    }
  }, {
    tableName: 'companies',
    timestamps: true
  });

  Company.associate = (models) => {
    Company.hasMany(models.ProcuringEntity, { foreignKey: 'companyId', as: 'procuringEntities' });
  };

  return Company;
};
