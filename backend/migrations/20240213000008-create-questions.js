'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('questions', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      questionnaireId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'questionnaires',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      questionText: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      questionType: {
        type: Sequelize.ENUM('text', 'textarea', 'number', 'date', 'yes_no', 'multiple_choice', 'radio', 'checkbox', 'dropdown'),
        defaultValue: 'text'
      },
      options: {
        type: Sequelize.JSONB
      },
      isRequired: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      requiresDocument: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      documentType: {
        type: Sequelize.STRING
      },
      order: {
        type: Sequelize.INTEGER,
        defaultValue: 0
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
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('questions');
  }
};
