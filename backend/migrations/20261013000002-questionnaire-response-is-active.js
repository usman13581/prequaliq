'use strict';

/** Procedure-scoped bids can be invalidated when a tender is unpublished. */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('questionnaire_responses', 'isActive', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('questionnaire_responses', 'isActive');
  }
};
