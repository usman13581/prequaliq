'use strict';

/** Unified in-app notifications for all roles (admin / buyer / supplier). */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('user_notifications', {
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
      type: {
        type: Sequelize.STRING,
        allowNull: false
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false
      },
      message: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      linkTab: {
        type: Sequelize.STRING,
        allowNull: true
      },
      linkPath: {
        type: Sequelize.STRING,
        allowNull: true
      },
      meta: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      isRead: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
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

    await queryInterface.addIndex('user_notifications', ['userId', 'createdAt'], {
      name: 'user_notifications_user_created_idx'
    });
    await queryInterface.addIndex('user_notifications', ['userId', 'isRead'], {
      name: 'user_notifications_user_read_idx'
    });

    // Backfill from legacy supplier_notifications when present
    try {
      await queryInterface.sequelize.query(`
        INSERT INTO user_notifications (id, "userId", type, title, message, "linkTab", meta, "isRead", "createdAt", "updatedAt")
        SELECT sn.id, s."userId", sn.type, sn.title, sn.message, sn."linkTab", sn.meta, sn."isRead", sn."createdAt", sn."updatedAt"
        FROM supplier_notifications sn
        INNER JOIN suppliers s ON s.id = sn."supplierId"
        WHERE NOT EXISTS (
          SELECT 1 FROM user_notifications un WHERE un.id = sn.id
        )
      `);
    } catch (e) {
      console.warn('[migration] user_notifications backfill skipped:', e.message);
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable('user_notifications');
  }
};
