/**
 * Reseed local database: remove existing suppliers & procuring entities (and their users),
 * then seed fresh dummy data (entities, suppliers, questionnaires).
 *
 * Run: node scripts/reseedDummyData.js
 *
 * Dummy logins (password: Password123!):
 *   Entities: entity1@prequaliq.demo, entity2@prequaliq.demo, entity3@prequaliq.demo
 *   Suppliers: supplier1@prequaliq.demo ... supplier6@prequaliq.demo
 */

const db = require('../models');
const { Sequelize } = require('sequelize');

async function cleanup() {
  console.log('Cleaning suppliers, entities, and related data...');
  const dialect = db.sequelize.getDialect();
  if (dialect === 'mysql') {
    await db.sequelize.query('SET FOREIGN_KEY_CHECKS = 0', { raw: true });
  }

  await db.Answer.destroy({ where: {} });
  await db.QuestionnaireResponse.destroy({ where: {} });
  await db.Question.destroy({ where: {} });
  await db.Questionnaire.destroy({ where: {} });
  await db.Document.destroy({ where: {} });
  await db.Announcement.destroy({ where: {} });

  if (db.SupplierNUTS) {
    await db.sequelize.query('DELETE FROM supplier_nuts', { type: db.sequelize.QueryTypes.DELETE }).catch(() => {});
  }
  if (db.SupplierCPV) {
    await db.sequelize.query('DELETE FROM supplier_cpv', { type: db.sequelize.QueryTypes.DELETE }).catch(() => {});
  }

  await db.Supplier.destroy({ where: {} });
  await db.ProcuringEntity.destroy({ where: {} });
  await db.Company.destroy({ where: {} });

  await db.User.destroy({
    where: {
      role: {
        [Sequelize.Op.in]: ['supplier', 'procuring_entity']
      }
    }
  });

  if (dialect === 'mysql') {
    await db.sequelize.query('SET FOREIGN_KEY_CHECKS = 1', { raw: true });
  }
  console.log('Cleanup done.');
}

async function run() {
  try {
    await db.sequelize.authenticate();
    await cleanup();

    const seeder = require('../seeders/20240216000001-seed-dummy-entities-suppliers-questionnaires.js');
    const queryInterface = db.sequelize.getQueryInterface();
    await seeder.up(queryInterface, Sequelize);

    console.log('\nDone. Dummy data seeded.');
    console.log('Entity logins: entity1@prequaliq.demo, entity2@prequaliq.demo, entity3@prequaliq.demo');
    console.log('Supplier logins: supplier1@prequaliq.demo ... supplier6@prequaliq.demo');
    console.log('Password: Password123!');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

run();
