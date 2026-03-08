'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn(
      'questions',
      'attachedDocumentId',
      {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'documents',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      }
    );
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('questions', 'attachedDocumentId');
  }
};
