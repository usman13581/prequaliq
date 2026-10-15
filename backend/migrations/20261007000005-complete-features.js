'use strict';

/** Complete remaining feature gaps: procedure invites (direct inform), org invites */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('procedure_invites', {
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
      invitedBy: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      notifiedAt: { type: Sequelize.DATE, allowNull: true },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE }
    });
    await queryInterface.addIndex('procedure_invites', ['procedureId', 'supplierId'], {
      unique: true,
      name: 'procedure_invites_unique'
    });

    await queryInterface.createTable('org_invites', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      email: { type: Sequelize.STRING, allowNull: false },
      ownerType: {
        type: Sequelize.ENUM('procuring_entity', 'supplier'),
        allowNull: false
      },
      ownerId: { type: Sequelize.UUID, allowNull: false },
      departmentId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'departments', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      membershipRole: {
        type: Sequelize.ENUM('admin', 'member'),
        allowNull: false,
        defaultValue: 'member'
      },
      token: { type: Sequelize.STRING, allowNull: false, unique: true },
      invitedBy: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      status: {
        type: Sequelize.ENUM('pending', 'accepted', 'revoked'),
        allowNull: false,
        defaultValue: 'pending'
      },
      acceptedUserId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      expiresAt: { type: Sequelize.DATE, allowNull: true },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE }
    });
    await queryInterface.addIndex('org_invites', ['email', 'ownerType', 'ownerId']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('org_invites');
    await queryInterface.dropTable('procedure_invites');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_org_invites_ownerType";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_org_invites_membershipRole";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_org_invites_status";');
  }
};
