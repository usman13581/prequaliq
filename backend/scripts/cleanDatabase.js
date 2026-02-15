const db = require('../models');
const { Op } = require('sequelize');

/**
 * Clean all data from database except users table
 * This will delete all questionnaires, responses, answers, documents, suppliers, procuring entities, etc.
 * But keeps users intact
 */
async function cleanDatabase() {
  try {
    console.log('Starting database cleanup...');
    console.log('⚠️  WARNING: This will delete ALL data except users!');
    
    // For PostgreSQL, we need to use CASCADE or delete in correct order
    // For MySQL, disable foreign key checks
    const dialect = db.sequelize.getDialect();
    if (dialect === 'mysql') {
      await db.sequelize.query('SET FOREIGN_KEY_CHECKS = 0', { raw: true });
    }

    // Delete in order to respect foreign key constraints
    
    // 1. Delete answers (references questionnaire_responses, questions)
    console.log('Deleting answers...');
    const deletedAnswers = await db.Answer.destroy({ where: {}, force: true });
    console.log(`✓ Deleted ${deletedAnswers} answers`);

    // 2. Delete questionnaire responses (references questionnaires, suppliers)
    console.log('Deleting questionnaire responses...');
    const deletedResponses = await db.QuestionnaireResponse.destroy({ where: {}, force: true });
    console.log(`✓ Deleted ${deletedResponses} questionnaire responses`);

    // 3. Delete questions (references questionnaires)
    console.log('Deleting questions...');
    const deletedQuestions = await db.Question.destroy({ where: {}, force: true });
    console.log(`✓ Deleted ${deletedQuestions} questions`);

    // 4. Delete questionnaires (references procuring_entities, cpv_codes)
    console.log('Deleting questionnaires...');
    const deletedQuestionnaires = await db.Questionnaire.destroy({ where: {}, force: true });
    console.log(`✓ Deleted ${deletedQuestionnaires} questionnaires`);

    // 5. Delete documents (references suppliers, procuring_entities)
    console.log('Deleting documents...');
    const deletedDocuments = await db.Document.destroy({ where: {}, force: true });
    console.log(`✓ Deleted ${deletedDocuments} documents`);

    // 6. Delete supplier CPV associations (references suppliers, cpv_codes)
    console.log('Deleting supplier CPV associations...');
    let deletedSupplierCPVs = 0;
    try {
      // Try using raw SQL first (works for junction tables)
      const result = await db.sequelize.query('DELETE FROM supplier_cpv', { type: db.sequelize.QueryTypes.DELETE });
      deletedSupplierCPVs = Array.isArray(result) ? result.length : result;
    } catch (error) {
      // If model exists, use it
      if (db.SupplierCPV) {
        deletedSupplierCPVs = await db.SupplierCPV.destroy({ where: {}, force: true });
      }
    }
    console.log(`✓ Deleted ${deletedSupplierCPVs} supplier CPV associations`);

    // 7. Delete announcements (references procuring_entities, cpv_codes)
    console.log('Deleting announcements...');
    const deletedAnnouncements = await db.Announcement.destroy({ where: {}, force: true });
    console.log(`✓ Deleted ${deletedAnnouncements} announcements`);

    // 8. Delete suppliers (references users)
    console.log('Deleting suppliers...');
    const deletedSuppliers = await db.Supplier.destroy({ where: {}, force: true });
    console.log(`✓ Deleted ${deletedSuppliers} suppliers`);

    // 9. Delete procuring entities (references users, companies)
    console.log('Deleting procuring entities...');
    const deletedProcuringEntities = await db.ProcuringEntity.destroy({ where: {}, force: true });
    console.log(`✓ Deleted ${deletedProcuringEntities} procuring entities`);

    // 10. Delete companies
    console.log('Deleting companies...');
    const deletedCompanies = await db.Company.destroy({ where: {}, force: true });
    console.log(`✓ Deleted ${deletedCompanies} companies`);

    // 11. Delete CPV codes (optional - uncomment if you want to delete these too)
    // console.log('Deleting CPV codes...');
    // const deletedCPVCodes = await db.CPVCode.destroy({ where: {}, force: true });
    // console.log(`✓ Deleted ${deletedCPVCodes} CPV codes`);

    // Re-enable foreign key checks (MySQL only)
    if (dialect === 'mysql') {
      await db.sequelize.query('SET FOREIGN_KEY_CHECKS = 1', { raw: true });
    }

    console.log('\n✅ Database cleanup completed successfully!');
    console.log('Users table preserved.');
    console.log('\nSummary:');
    console.log(`- Answers: ${deletedAnswers}`);
    console.log(`- Questionnaire Responses: ${deletedResponses}`);
    console.log(`- Questions: ${deletedQuestions}`);
    console.log(`- Questionnaires: ${deletedQuestionnaires}`);
    console.log(`- Documents: ${deletedDocuments}`);
    console.log(`- Supplier CPV Associations: ${deletedSupplierCPVs}`);
    console.log(`- Announcements: ${deletedAnnouncements}`);
    console.log(`- Suppliers: ${deletedSuppliers}`);
    console.log(`- Procuring Entities: ${deletedProcuringEntities}`);
    console.log(`- Companies: ${deletedCompanies}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error cleaning database:', error);
    process.exit(1);
  }
}

// Run the cleanup
cleanDatabase();
