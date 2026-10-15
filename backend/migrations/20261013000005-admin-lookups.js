'use strict';

/** Admin-managed lookups: isActive on CPV/NUTS, generic lookup_types + app_lookups */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('cpv_codes', 'isActive', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true
    });
    await queryInterface.addColumn('nuts_codes', 'isActive', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true
    });

    await queryInterface.createTable('lookup_types', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      key: {
        type: Sequelize.STRING(128),
        allowNull: false,
        unique: true
      },
      labelEn: {
        type: Sequelize.STRING,
        allowNull: false
      },
      labelSv: {
        type: Sequelize.STRING,
        allowNull: false
      },
      isSystem: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE }
    });

    await queryInterface.createTable('app_lookups', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      typeKey: {
        type: Sequelize.STRING(128),
        allowNull: false
      },
      code: {
        type: Sequelize.STRING(128),
        allowNull: false
      },
      labelEn: {
        type: Sequelize.STRING,
        allowNull: false
      },
      labelSv: {
        type: Sequelize.STRING,
        allowNull: false
      },
      sortOrder: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      parentCode: {
        type: Sequelize.STRING(128),
        allowNull: true
      },
      level: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE }
    });
    await queryInterface.addIndex('app_lookups', ['typeKey', 'code'], {
      unique: true,
      name: 'app_lookups_type_key_code_unique'
    });
    await queryInterface.addIndex('app_lookups', ['typeKey'], {
      name: 'app_lookups_type_key_idx'
    });

    const now = new Date();

    await queryInterface.bulkInsert('lookup_types', [
      {
        id: Sequelize.literal('gen_random_uuid()'),
        key: 'document_type',
        labelEn: 'Document types',
        labelSv: 'Dokumenttyper',
        isSystem: true,
        createdAt: now,
        updatedAt: now
      }
    ]);

    const documentTypes = [
      { code: 'insurance', labelEn: 'Insurance', labelSv: 'Försäkring', sortOrder: 10 },
      { code: 'company_registration', labelEn: 'Company registration', labelSv: 'Företagsregistrering', sortOrder: 20 },
      { code: 'financial', labelEn: 'Financial statement', labelSv: 'Bokslut / årsredovisning', sortOrder: 30 },
      { code: 'quality_certificate', labelEn: 'Quality certificate', labelSv: 'Kvalitetscertifikat', sortOrder: 40 },
      { code: 'environment_certificate', labelEn: 'Environment certificate', labelSv: 'Miljöcertifikat', sortOrder: 50 },
      { code: 'social_certificate', labelEn: 'Social responsibility certificate', labelSv: 'Socialt ansvar / CSR-certifikat', sortOrder: 60 },
      { code: 'ohs_certificate', labelEn: 'Occupational health & safety certificate', labelSv: 'Arbetsmiljöcertifikat', sortOrder: 70 },
      { code: 'general', labelEn: 'General document', labelSv: 'Allmänt dokument', sortOrder: 80 },
      { code: 'question_attachment', labelEn: 'Question attachment', labelSv: 'Frågebilaga', sortOrder: 90 }
    ];

    await queryInterface.bulkInsert(
      'app_lookups',
      documentTypes.map((d) => ({
        id: Sequelize.literal('gen_random_uuid()'),
        typeKey: 'document_type',
        code: d.code,
        labelEn: d.labelEn,
        labelSv: d.labelSv,
        sortOrder: d.sortOrder,
        isActive: true,
        parentCode: null,
        level: null,
        createdAt: now,
        updatedAt: now
      }))
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable('app_lookups');
    await queryInterface.dropTable('lookup_types');
    await queryInterface.removeColumn('cpv_codes', 'isActive');
    await queryInterface.removeColumn('nuts_codes', 'isActive');
  }
};
