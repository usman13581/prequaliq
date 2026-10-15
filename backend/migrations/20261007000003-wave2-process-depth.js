'use strict';

/** Wave 2: watches, sealed bids, complements, ESPD declarations, audit events, direct-inform */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('procedures', 'isSealed', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true
    });
    await queryInterface.addColumn('procedures', 'sealedUntil', {
      type: Sequelize.DATE,
      allowNull: true
    });
    await queryInterface.addColumn('procedures', 'announcementText', {
      type: Sequelize.TEXT,
      allowNull: true
    });
    await queryInterface.addColumn('procedures', 'afterAnnounceText', {
      type: Sequelize.TEXT,
      allowNull: true
    });
    await queryInterface.addColumn('procedures', 'closedAt', {
      type: Sequelize.DATE,
      allowNull: true
    });

    await queryInterface.createTable('procedure_watches', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      procedureId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'procedures', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      supplierId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'suppliers', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE }
    });
    await queryInterface.addIndex('procedure_watches', ['procedureId', 'supplierId'], {
      unique: true,
      name: 'procedure_watches_unique'
    });

    await queryInterface.createTable('complement_requests', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      procedureId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'procedures', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      supplierId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'suppliers', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      requestedBy: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      message: { type: Sequelize.TEXT, allowNull: false },
      deadline: { type: Sequelize.DATEONLY, allowNull: true },
      status: {
        type: Sequelize.ENUM('open', 'responded', 'closed'),
        allowNull: false,
        defaultValue: 'open'
      },
      responseText: { type: Sequelize.TEXT, allowNull: true },
      respondedAt: { type: Sequelize.DATE, allowNull: true },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE }
    });

    await queryInterface.createTable('espd_declarations', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      procedureId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'procedures', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      supplierId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'suppliers', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      exclusionGroundsOk: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      declarationText: { type: Sequelize.TEXT, allowNull: true },
      submittedAt: { type: Sequelize.DATE, allowNull: true },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE }
    });
    await queryInterface.addIndex('espd_declarations', ['procedureId', 'supplierId'], {
      unique: true,
      name: 'espd_declarations_unique'
    });

    await queryInterface.createTable('audit_events', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      actorUserId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      action: { type: Sequelize.STRING(128), allowNull: false },
      entityType: { type: Sequelize.STRING(64), allowNull: false },
      entityId: { type: Sequelize.UUID, allowNull: true },
      meta: { type: Sequelize.JSONB, allowNull: true },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE }
    });
    await queryInterface.addIndex('audit_events', ['entityType', 'entityId']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('audit_events');
    await queryInterface.dropTable('espd_declarations');
    await queryInterface.dropTable('complement_requests');
    await queryInterface.dropTable('procedure_watches');
    await queryInterface.removeColumn('procedures', 'closedAt');
    await queryInterface.removeColumn('procedures', 'afterAnnounceText');
    await queryInterface.removeColumn('procedures', 'announcementText');
    await queryInterface.removeColumn('procedures', 'sealedUntil');
    await queryInterface.removeColumn('procedures', 'isSealed');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_complement_requests_status";');
  }
};
