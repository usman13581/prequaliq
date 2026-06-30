'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(
      "ALTER TYPE \"enum_suppliers_status\" ADD VALUE IF NOT EXISTS 'requalification_required';"
    ).catch(() => {
      return queryInterface.sequelize.query(
        "ALTER TYPE enum_suppliers_status ADD VALUE IF NOT EXISTS 'requalification_required';"
      );
    });

    await queryInterface.addColumn('suppliers', 'profileSubmittedAt', { type: Sequelize.DATE, allowNull: true });
    await queryInterface.addColumn('suppliers', 'profileVersion', { type: Sequelize.INTEGER, defaultValue: 0, allowNull: false });
    await queryInterface.addColumn('suppliers', 'qualifiedAt', { type: Sequelize.DATE, allowNull: true });
    await queryInterface.addColumn('suppliers', 'qualificationExpiresAt', { type: Sequelize.DATE, allowNull: true });
    await queryInterface.addColumn('suppliers', 'lastRequalificationAt', { type: Sequelize.DATE, allowNull: true });
    await queryInterface.addColumn('suppliers', 'insurerName', { type: Sequelize.STRING, allowNull: true });
    await queryInterface.addColumn('suppliers', 'insurancePolicyNumber', { type: Sequelize.STRING, allowNull: true });
    await queryInterface.addColumn('suppliers', 'insuranceCoverageAmount', { type: Sequelize.STRING, allowNull: true });
    await queryInterface.addColumn('suppliers', 'insuranceValidTo', { type: Sequelize.DATEONLY, allowNull: true });

    await queryInterface.addColumn('documents', 'validFrom', { type: Sequelize.DATEONLY, allowNull: true });
    await queryInterface.addColumn('documents', 'validTo', { type: Sequelize.DATEONLY, allowNull: true });
    await queryInterface.addColumn('documents', 'issuer', { type: Sequelize.STRING, allowNull: true });
    await queryInterface.addColumn('documents', 'documentNumber', { type: Sequelize.STRING, allowNull: true });
    await queryInterface.addColumn('documents', 'isActive', { type: Sequelize.BOOLEAN, defaultValue: true, allowNull: false });
    await queryInterface.addColumn('documents', 'replacedByDocumentId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'documents', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    await queryInterface.createTable('supplier_profile_submissions', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      supplierId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'suppliers', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      version: { type: Sequelize.INTEGER, allowNull: false },
      status: {
        type: Sequelize.ENUM('pending', 'approved', 'rejected'),
        defaultValue: 'pending'
      },
      rejectionReason: { type: Sequelize.TEXT },
      submittedAt: { type: Sequelize.DATE, allowNull: false },
      reviewedAt: { type: Sequelize.DATE },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    });

    await queryInterface.createTable('supplier_references', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      supplierId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'suppliers', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      projectName: { type: Sequelize.STRING, allowNull: false },
      clientName: { type: Sequelize.STRING },
      yearFrom: { type: Sequelize.INTEGER },
      yearTo: { type: Sequelize.INTEGER },
      contractValue: { type: Sequelize.STRING },
      description: { type: Sequelize.TEXT },
      contactName: { type: Sequelize.STRING },
      contactEmail: { type: Sequelize.STRING },
      contactPhone: { type: Sequelize.STRING },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    });

    await queryInterface.createTable('supplier_notifications', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      supplierId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'suppliers', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      type: { type: Sequelize.STRING, allowNull: false },
      title: { type: Sequelize.STRING, allowNull: false },
      message: { type: Sequelize.TEXT },
      linkTab: { type: Sequelize.STRING },
      isRead: { type: Sequelize.BOOLEAN, defaultValue: false, allowNull: false },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('supplier_notifications');
    await queryInterface.dropTable('supplier_references');
    await queryInterface.dropTable('supplier_profile_submissions');
    await queryInterface.removeColumn('documents', 'replacedByDocumentId');
    await queryInterface.removeColumn('documents', 'isActive');
    await queryInterface.removeColumn('documents', 'documentNumber');
    await queryInterface.removeColumn('documents', 'issuer');
    await queryInterface.removeColumn('documents', 'validTo');
    await queryInterface.removeColumn('documents', 'validFrom');
    await queryInterface.removeColumn('suppliers', 'insuranceValidTo');
    await queryInterface.removeColumn('suppliers', 'insuranceCoverageAmount');
    await queryInterface.removeColumn('suppliers', 'insurancePolicyNumber');
    await queryInterface.removeColumn('suppliers', 'insurerName');
    await queryInterface.removeColumn('suppliers', 'lastRequalificationAt');
    await queryInterface.removeColumn('suppliers', 'qualificationExpiresAt');
    await queryInterface.removeColumn('suppliers', 'qualifiedAt');
    await queryInterface.removeColumn('suppliers', 'profileVersion');
    await queryInterface.removeColumn('suppliers', 'profileSubmittedAt');
  }
};
