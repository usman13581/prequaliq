'use strict';

/** Wave 0: PE eligibility status, feature entitlements, departments, org memberships */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Procuring entity eligibility (mirror supplier status)
    await queryInterface.addColumn('procuring_entities', 'status', {
      type: Sequelize.ENUM('pending', 'approved', 'rejected'),
      allowNull: false,
      defaultValue: 'pending'
    });
    await queryInterface.addColumn('procuring_entities', 'approvedAt', {
      type: Sequelize.DATE,
      allowNull: true
    });
    await queryInterface.addColumn('procuring_entities', 'approvedBy', {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'users', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
    await queryInterface.addColumn('procuring_entities', 'rejectionReason', {
      type: Sequelize.TEXT,
      allowNull: true
    });

    // Existing entities were already usable — mark approved
    await queryInterface.sequelize.query(
      `UPDATE procuring_entities SET status = 'approved', "approvedAt" = NOW() WHERE status = 'pending'`
    );

    await queryInterface.createTable('feature_entitlements', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      featureKey: {
        type: Sequelize.STRING(128),
        allowNull: false
      },
      enabled: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE }
    });
    await queryInterface.addIndex('feature_entitlements', ['userId', 'featureKey'], {
      unique: true,
      name: 'feature_entitlements_user_key_unique'
    });

    await queryInterface.createTable('departments', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      ownerType: {
        type: Sequelize.ENUM('procuring_entity', 'supplier', 'company'),
        allowNull: false
      },
      ownerId: {
        type: Sequelize.UUID,
        allowNull: false
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE }
    });
    await queryInterface.addIndex('departments', ['ownerType', 'ownerId'], {
      name: 'departments_owner_idx'
    });

    await queryInterface.createTable('org_memberships', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      ownerType: {
        type: Sequelize.ENUM('procuring_entity', 'supplier'),
        allowNull: false
      },
      ownerId: {
        type: Sequelize.UUID,
        allowNull: false
      },
      departmentId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'departments', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      membershipRole: {
        type: Sequelize.ENUM('owner', 'admin', 'member'),
        allowNull: false,
        defaultValue: 'member'
      },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE }
    });
    await queryInterface.addIndex('org_memberships', ['userId', 'ownerType', 'ownerId'], {
      unique: true,
      name: 'org_memberships_user_owner_unique'
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('org_memberships');
    await queryInterface.dropTable('departments');
    await queryInterface.dropTable('feature_entitlements');
    await queryInterface.removeColumn('procuring_entities', 'rejectionReason');
    await queryInterface.removeColumn('procuring_entities', 'approvedBy');
    await queryInterface.removeColumn('procuring_entities', 'approvedAt');
    await queryInterface.removeColumn('procuring_entities', 'status');
    // ENUM cleanup (Postgres)
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_procuring_entities_status";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_departments_ownerType";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_org_memberships_ownerType";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_org_memberships_membershipRole";');
  }
};
