'use strict';

/** Contract messaging thread, attachments, and delivery workflow */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('contracts', 'deliveryStatus', {
      type: Sequelize.ENUM('none', 'marked_done', 'changes_requested', 'accepted'),
      allowNull: false,
      defaultValue: 'none'
    });

    await queryInterface.createTable('contract_messages', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      contractId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'contracts', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      senderUserId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      senderRole: {
        type: Sequelize.ENUM('procuring_entity', 'supplier'),
        allowNull: false
      },
      body: { type: Sequelize.TEXT, allowNull: false },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE }
    });

    await queryInterface.addIndex('contract_messages', ['contractId', 'createdAt'], {
      name: 'contract_messages_contract_created_idx'
    });

    await queryInterface.createTable('contract_attachments', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      contractId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'contracts', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      messageId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'contract_messages', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      fileName: { type: Sequelize.STRING, allowNull: false },
      filePath: { type: Sequelize.STRING, allowNull: false },
      mimeType: { type: Sequelize.STRING, allowNull: true },
      size: { type: Sequelize.INTEGER, allowNull: true },
      uploadedByUserId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE }
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('contract_attachments');
    await queryInterface.dropTable('contract_messages');
    await queryInterface.removeColumn('contracts', 'deliveryStatus');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_contracts_deliveryStatus";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_contract_messages_senderRole";');
  }
};
