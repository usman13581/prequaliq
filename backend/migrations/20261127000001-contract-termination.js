'use strict';

/** Ending a contract: mandatory reason on the contract, and a marked entry in the thread. */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('contracts', 'terminationReason', { type: Sequelize.TEXT, allowNull: true });
    await queryInterface.addColumn('contracts', 'terminatedAt', { type: Sequelize.DATE, allowNull: true });
    await queryInterface.addColumn('contracts', 'terminatedByUserId', { type: Sequelize.UUID, allowNull: true });
    await queryInterface.addColumn('contract_messages', 'kind', {
      type: Sequelize.STRING(20),
      allowNull: false,
      defaultValue: 'message'
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('contract_messages', 'kind');
    await queryInterface.removeColumn('contracts', 'terminatedByUserId');
    await queryInterface.removeColumn('contracts', 'terminatedAt');
    await queryInterface.removeColumn('contracts', 'terminationReason');
  }
};
