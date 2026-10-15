'use strict';

/** Wave 3: contracts, call-offs, DIS membership, supplier discovery notes */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('contracts', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      procuringEntityId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'procuring_entities', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      supplierId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'suppliers', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      procedureId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'procedures', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      title: { type: Sequelize.STRING, allowNull: false },
      contractNumber: { type: Sequelize.STRING, allowNull: true },
      contractType: {
        type: Sequelize.ENUM('standard', 'framework', 'call_off', 'dis'),
        allowNull: false,
        defaultValue: 'standard'
      },
      parentContractId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'contracts', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      startDate: { type: Sequelize.DATEONLY, allowNull: true },
      endDate: { type: Sequelize.DATEONLY, allowNull: true },
      valueAmount: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
      status: {
        type: Sequelize.ENUM('draft', 'active', 'expired', 'terminated'),
        allowNull: false,
        defaultValue: 'draft'
      },
      notes: { type: Sequelize.TEXT, allowNull: true },
      createdBy: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE }
    });

    await queryInterface.createTable('dis_memberships', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      procedureId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'procedures', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      supplierId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'suppliers', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      status: {
        type: Sequelize.ENUM('applied', 'admitted', 'rejected'),
        allowNull: false,
        defaultValue: 'applied'
      },
      notes: { type: Sequelize.TEXT, allowNull: true },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE }
    });
    await queryInterface.addIndex('dis_memberships', ['procedureId', 'supplierId'], {
      unique: true,
      name: 'dis_memberships_unique'
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('dis_memberships');
    await queryInterface.dropTable('contracts');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_contracts_contractType";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_contracts_status";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_dis_memberships_status";');
  }
};
