'use strict';

/**
 * Ensures questionType enum has 'radio', 'checkbox', 'dropdown'.
 * Safe to run multiple times (IF NOT EXISTS).
 * Run outside transaction for PostgreSQL.
 */
module.exports = {
  up: async (queryInterface) => {
    const dialect = queryInterface.sequelize.getDialect();
    if (dialect !== 'postgres') return;

    const enumType = 'enum_questions_questionType';
    const values = ['radio', 'checkbox', 'dropdown'];

    for (const val of values) {
      try {
        await queryInterface.sequelize.query(
          `ALTER TYPE "${enumType}" ADD VALUE IF NOT EXISTS '${val}';`,
          { transaction: false }
        );
      } catch (e) {
        if (e.message && !e.message.includes('already exists')) throw e;
      }
    }
  },

  down: async () => {}
};
