'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('suppliers', 'financialStability', { type: Sequelize.TEXT });
    await queryInterface.addColumn('suppliers', 'qualityManagementSystem', { type: Sequelize.TEXT });
    await queryInterface.addColumn('suppliers', 'environmentalManagementSystem', { type: Sequelize.TEXT });
    await queryInterface.addColumn('suppliers', 'socialResponsibilityManagementSystem', { type: Sequelize.TEXT });
    await queryInterface.addColumn('suppliers', 'ohsManagementSystem', { type: Sequelize.TEXT });
    await queryInterface.addColumn('suppliers', 'groundsForExclusion', { type: Sequelize.TEXT });
    await queryInterface.addColumn('suppliers', 'laborLawRegulations', { type: Sequelize.TEXT });
    await queryInterface.addColumn('suppliers', 'sanctionsRussiaBelarus', { type: Sequelize.TEXT });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('suppliers', 'financialStability');
    await queryInterface.removeColumn('suppliers', 'qualityManagementSystem');
    await queryInterface.removeColumn('suppliers', 'environmentalManagementSystem');
    await queryInterface.removeColumn('suppliers', 'socialResponsibilityManagementSystem');
    await queryInterface.removeColumn('suppliers', 'ohsManagementSystem');
    await queryInterface.removeColumn('suppliers', 'groundsForExclusion');
    await queryInterface.removeColumn('suppliers', 'laborLawRegulations');
    await queryInterface.removeColumn('suppliers', 'sanctionsRussiaBelarus');
  }
};
