'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('supplier_cpv', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      supplierId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'suppliers',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      cpvCodeId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'cpv_codes',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    await queryInterface.addIndex('supplier_cpv', ['supplierId', 'cpvCodeId'], {
      unique: true,
      name: 'supplier_cpv_unique'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('supplier_cpv');
  }
};
