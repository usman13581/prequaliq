'use strict';

/**
 * Seeds dummy procuring entities, suppliers, and questionnaires (each tagged with random CPV codes).
 *
 * Procuring entities (login: email below, password: Password123!):
 *   entity1@prequaliq.demo – Emma Wilson – Public Works Authority
 *   entity2@prequaliq.demo – James Brown – Health Services Procurement
 *   entity3@prequaliq.demo – Sofia Martinez – Education & Training Board
 *
 * Suppliers (login: email below, password: Password123!):
 *   supplier1@prequaliq.demo … supplier6@prequaliq.demo (all approved, random CPV codes)
 *
 * Run: npx sequelize-cli db:seed --seed 20240216000001-seed-dummy-entities-suppliers-questionnaires.js
 * Undo: npx sequelize-cli db:seed:undo --seed 20240216000001-seed-dummy-entities-suppliers-questionnaires.js
 */

const db = require('../models');
const { hashPassword } = require('../utils/password');

const DUMMY_PASSWORD = 'Password123!';

function pickRandom(arr, count = 1) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return count === 1 ? shuffled[0] : shuffled.slice(0, Math.min(count, arr.length));
}

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const hashedPassword = await hashPassword(DUMMY_PASSWORD);

    // Get CPV codes (must be seeded first)
    const cpvCodes = await db.CPVCode.findAll({ attributes: ['id', 'code'] });
    if (cpvCodes.length === 0) {
      console.warn('No CPV codes found. Run the CPV seeder first.');
      return;
    }

    // --- Procuring entities (3 entities, each with a user) ---
    const entityUsers = [
      { email: 'entity1@prequaliq.demo', firstName: 'Emma', lastName: 'Wilson', entityName: 'Public Works Authority' },
      { email: 'entity2@prequaliq.demo', firstName: 'James', lastName: 'Brown', entityName: 'Health Services Procurement' },
      { email: 'entity3@prequaliq.demo', firstName: 'Sofia', lastName: 'Martinez', entityName: 'Education & Training Board' }
    ];

    const procuringEntities = [];
    for (const e of entityUsers) {
      const user = await db.User.create({
        email: e.email,
        password: hashedPassword,
        firstName: e.firstName,
        lastName: e.lastName,
        role: 'procuring_entity',
        phone: '+1 555 000 0001'
      });
      const entity = await db.ProcuringEntity.create({
        userId: user.id,
        entityName: e.entityName,
        city: 'New York',
        country: 'USA'
      });
      procuringEntities.push({ user, entity });
    }

    // --- Suppliers (6 approved suppliers with random CPV codes and turnover) ---
    const supplierUsers = [
      { email: 'supplier1@prequaliq.demo', firstName: 'Alex', lastName: 'Johnson', companyName: 'Johnson Supplies Ltd', turnover: 100000 },
      { email: 'supplier2@prequaliq.demo', firstName: 'Maria', lastName: 'Garcia', companyName: 'Garcia Industrial Co', turnover: 200000 },
      { email: 'supplier3@prequaliq.demo', firstName: 'David', lastName: 'Lee', companyName: 'Lee Tech Solutions', turnover: 300000 },
      { email: 'supplier4@prequaliq.demo', firstName: 'Anna', lastName: 'Chen', companyName: 'Chen Logistics Inc', turnover: 400000 },
      { email: 'supplier5@prequaliq.demo', firstName: 'Michael', lastName: 'Taylor', companyName: 'Taylor Equipment Ltd', turnover: 500000 },
      { email: 'supplier6@prequaliq.demo', firstName: 'Lisa', lastName: 'Anderson', companyName: 'Anderson Services Group', turnover: 600000 }
    ];

    const suppliers = [];
    for (const s of supplierUsers) {
      const user = await db.User.create({
        email: s.email,
        password: hashedPassword,
        firstName: s.firstName,
        lastName: s.lastName,
        role: 'supplier',
        phone: '+1 555 000 0002'
      });
      const supplier = await db.Supplier.create({
        userId: user.id,
        companyName: s.companyName,
        city: 'Chicago',
        country: 'USA',
        status: 'approved',
        approvedAt: new Date(),
        turnover: s.turnover
      });
      // Assign 2–4 random CPV codes per supplier
      const numCpv = 2 + Math.floor(Math.random() * 3);
      const selectedCpvs = pickRandom(cpvCodes, numCpv);
      for (const cpv of selectedCpvs) {
        await db.SupplierCPV.create({ supplierId: supplier.id, cpvCodeId: cpv.id });
      }
      suppliers.push({ user, supplier });
    }

    // --- Questionnaires per entity (2–4 per entity, each with a random CPV) and questions ---
    const questionTemplates = [
      { questionText: 'Describe your company\'s experience in this sector.', questionType: 'textarea', order: 0 },
      { questionText: 'Annual turnover (EUR)?', questionType: 'number', order: 1 },
      { questionText: 'Year established?', questionType: 'number', order: 2 },
      { questionText: 'Do you hold relevant certifications?', questionType: 'yes_no', order: 3 },
      { questionText: 'Preferred contact method?', questionType: 'dropdown', options: ['Email', 'Phone', 'Both'], order: 4 }
    ];

    const deadline = new Date();
    deadline.setFullYear(deadline.getFullYear() + 1);

    for (const { user: entityUser, entity } of procuringEntities) {
      const numQuestionnaires = 2 + Math.floor(Math.random() * 3);
      for (let q = 0; q < numQuestionnaires; q++) {
        const cpv = pickRandom(cpvCodes);
        const questionnaire = await db.Questionnaire.create({
          procuringEntityId: entity.id,
          cpvCodeId: cpv.id,
          title: `Questionnaire ${q + 1} – ${cpv.code}`,
          description: `Pre-qualification for CPV ${cpv.code}`,
          deadline,
          isActive: true,
          createdBy: entityUser.id
        });
        const numQuestions = 2 + Math.floor(Math.random() * 3);
        const chosen = pickRandom(questionTemplates, numQuestions).sort((a, b) => a.order - b.order);
        for (let i = 0; i < chosen.length; i++) {
          const t = chosen[i];
          await db.Question.create({
            questionnaireId: questionnaire.id,
            questionText: t.questionText,
            questionType: t.questionType,
            options: t.options ? (Array.isArray(t.options) ? t.options : null) : null,
            isRequired: true,
            order: i
          });
        }
      }
    }

    console.log('Dummy data seeded: 3 procuring entities, 6 suppliers, questionnaires with random CPV codes.');
  },

  down: async (queryInterface, Sequelize) => {
    // Delete in reverse order of dependencies
    await db.Answer.destroy({ where: {} });
    await db.QuestionnaireResponse.destroy({ where: {} });
    await db.Question.destroy({ where: {} });
    await db.Questionnaire.destroy({ where: {} });
    await db.SupplierCPV.destroy({ where: {} });
    await db.Supplier.destroy({ where: {} });
    await db.ProcuringEntity.destroy({ where: {} });

    await db.User.destroy({
      where: {
        email: [
          'entity1@prequaliq.demo',
          'entity2@prequaliq.demo',
          'entity3@prequaliq.demo',
          'supplier1@prequaliq.demo',
          'supplier2@prequaliq.demo',
          'supplier3@prequaliq.demo',
          'supplier4@prequaliq.demo',
          'supplier5@prequaliq.demo',
          'supplier6@prequaliq.demo'
        ]
      }
    });
  }
};
