'use strict';

/**
 * Bids/answers for a linked underlag are per procedure.
 * General (non-procedure) questionnaire responses keep procedureId = NULL.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('questionnaire_responses', 'procedureId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'procedures',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    await queryInterface.addIndex('questionnaire_responses', ['procedureId'], {
      name: 'questionnaire_responses_procedure_id'
    });

    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS questionnaire_responses_q_supplier_procedure_unique
      ON questionnaire_responses ("questionnaireId", "supplierId", "procedureId")
      WHERE "procedureId" IS NOT NULL;
    `);

    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS questionnaire_responses_q_supplier_general_unique
      ON questionnaire_responses ("questionnaireId", "supplierId")
      WHERE "procedureId" IS NULL;
    `);
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.query(
      'DROP INDEX IF EXISTS questionnaire_responses_q_supplier_procedure_unique;'
    );
    await queryInterface.sequelize.query(
      'DROP INDEX IF EXISTS questionnaire_responses_q_supplier_general_unique;'
    );
    await queryInterface.removeIndex('questionnaire_responses', 'questionnaire_responses_procedure_id');
    await queryInterface.removeColumn('questionnaire_responses', 'procedureId');
  }
};
