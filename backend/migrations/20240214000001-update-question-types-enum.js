'use strict';

// Must run outside a transaction: PostgreSQL ALTER TYPE ADD VALUE cannot run inside a transaction block
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const dialect = queryInterface.sequelize.getDialect();
    if (dialect !== 'postgres') return;

    const enumType = 'enum_questions_questionType';
    const newValues = ['radio', 'checkbox', 'dropdown'];

    for (const val of newValues) {
      try {
        await queryInterface.sequelize.query(
          `ALTER TYPE "${enumType}" ADD VALUE IF NOT EXISTS '${val}';`,
          { transaction: false }
        );
      } catch (err) {
        if (err.message && err.message.includes('already exists')) continue;
        throw err;
      }
    }
  },

  down: async () => {
    // PostgreSQL doesn't support removing ENUM values without recreating the type
  }
};
