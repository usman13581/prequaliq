'use strict';

/** Complement history messages + file attachments */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('complement_messages', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      complementRequestId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'complement_requests', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      authorUserId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      authorRole: {
        type: Sequelize.ENUM('procuring_entity', 'supplier'),
        allowNull: false
      },
      body: { type: Sequelize.TEXT, allowNull: false },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE }
    });

    await queryInterface.addIndex('complement_messages', ['complementRequestId', 'createdAt'], {
      name: 'complement_messages_request_created_idx'
    });

    await queryInterface.createTable('complement_attachments', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      messageId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'complement_messages', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      fileName: { type: Sequelize.STRING, allowNull: false },
      filePath: { type: Sequelize.STRING, allowNull: false },
      mimeType: { type: Sequelize.STRING, allowNull: true },
      fileSize: { type: Sequelize.INTEGER, allowNull: true },
      uploadedBy: {
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
    await queryInterface.dropTable('complement_attachments');
    await queryInterface.dropTable('complement_messages');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_complement_messages_authorRole";');
  }
};
