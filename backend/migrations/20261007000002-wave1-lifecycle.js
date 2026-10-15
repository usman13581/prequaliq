'use strict';

/** Wave 1: Procedure lifecycle, Q&A, evaluation, award */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('procedures', {
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
      questionnaireId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'questionnaires', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      title: { type: Sequelize.STRING, allowNull: false },
      referenceNumber: { type: Sequelize.STRING, allowNull: true },
      procedureType: {
        type: Sequelize.ENUM(
          'open',
          'restricted',
          'negotiated',
          'direct',
          'framework',
          'dis',
          'other'
        ),
        allowNull: false,
        defaultValue: 'open'
      },
      description: { type: Sequelize.TEXT, allowNull: true },
      status: {
        type: Sequelize.ENUM(
          'draft',
          'planned',
          'underlag_ready',
          'published',
          'qa_open',
          'bidding',
          'evaluation',
          'awarded',
          'standstill',
          'closed',
          'cancelled'
        ),
        allowNull: false,
        defaultValue: 'draft'
      },
      plannedPublishAt: { type: Sequelize.DATEONLY, allowNull: true },
      bidDeadline: { type: Sequelize.DATEONLY, allowNull: true },
      qaDeadline: { type: Sequelize.DATEONLY, allowNull: true },
      standstillEndsAt: { type: Sequelize.DATEONLY, allowNull: true },
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
    await queryInterface.addIndex('procedures', ['procuringEntityId']);
    await queryInterface.addIndex('procedures', ['status']);

    await queryInterface.createTable('procedure_qa_messages', {
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
      authorUserId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      authorRole: {
        type: Sequelize.ENUM('procuring_entity', 'supplier'),
        allowNull: false
      },
      parentId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'procedure_qa_messages', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      body: { type: Sequelize.TEXT, allowNull: false },
      isPublic: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE }
    });

    await queryInterface.createTable('bid_evaluations', {
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
      responseId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'questionnaire_responses', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      score: { type: Sequelize.DECIMAL(10, 2), allowNull: true },
      notes: { type: Sequelize.TEXT, allowNull: true },
      evaluatedBy: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE }
    });
    await queryInterface.addIndex('bid_evaluations', ['procedureId', 'supplierId'], {
      unique: true,
      name: 'bid_evaluations_procedure_supplier_unique'
    });

    await queryInterface.createTable('award_decisions', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      procedureId: {
        type: Sequelize.UUID,
        allowNull: false,
        unique: true,
        references: { model: 'procedures', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      winnerSupplierId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'suppliers', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      decisionMemo: { type: Sequelize.TEXT, allowNull: true },
      awardedAt: { type: Sequelize.DATE, allowNull: true },
      standstillEndsAt: { type: Sequelize.DATEONLY, allowNull: true },
      notifiedAt: { type: Sequelize.DATE, allowNull: true },
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
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('award_decisions');
    await queryInterface.dropTable('bid_evaluations');
    await queryInterface.dropTable('procedure_qa_messages');
    await queryInterface.dropTable('procedures');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_procedures_procedureType";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_procedures_status";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_procedure_qa_messages_authorRole";');
  }
};
