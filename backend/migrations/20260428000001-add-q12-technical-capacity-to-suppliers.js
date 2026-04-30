'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('suppliers', 'technicalCapacityProfessionalExperience', {
      type: Sequelize.TEXT
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('suppliers', 'technicalCapacityProfessionalExperience');
  }
};
