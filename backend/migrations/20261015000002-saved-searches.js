'use strict';

/** Per-user saved filter sets, scoped by page/feature key. */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('saved_searches', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      scope: {
        type: Sequelize.STRING(128),
        allowNull: false
      },
      name: {
        type: Sequelize.STRING(160),
        allowNull: false
      },
      filters: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {}
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.addIndex('saved_searches', ['userId', 'scope'], {
      name: 'saved_searches_user_scope_idx'
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('saved_searches');
  }
};
