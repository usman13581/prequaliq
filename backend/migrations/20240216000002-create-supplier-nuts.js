'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('supplier_nuts', {
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
      nutsCodeId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'nuts_codes',
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

    await queryInterface.addIndex('supplier_nuts', ['supplierId', 'nutsCodeId'], {
      unique: true,
      name: 'supplier_nuts_unique'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('supplier_nuts');
  }
};
