/**
 * Ensure each procuring entity has up to 5 sample questionnaires (idempotent).
 * Run on deploy so prod gets sample questionnaires; skips entities that already have 5.
 * Usage: from backend: NODE_ENV=production npm run seed-prod-questionnaires
 * Or use .env.prod for DATABASE_URL and run the same.
 */
require('dotenv').config();
require('dotenv').config({ path: require('path').join(__dirname, '../.env.prod') });
const db = require('../models');

const QUESTION_TEMPLATES = [
  { questionText: "Describe your company's experience in this sector.", questionType: 'textarea', order: 0 },
  { questionText: 'Annual turnover (EUR)?', questionType: 'number', order: 1 },
  { questionText: 'Year established?', questionType: 'number', order: 2 },
  { questionText: 'Do you hold relevant certifications?', questionType: 'yes_no', order: 3 },
  { questionText: 'Preferred contact method?', questionType: 'dropdown', options: ['Email', 'Phone', 'Both'], order: 4 },
  { questionText: 'Number of employees?', questionType: 'number', order: 5 },
  { questionText: 'Brief company overview', questionType: 'textarea', order: 6 }
];

function pickRandom(arr, count = 1) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  if (count === 1) return shuffled[0];
  return shuffled.slice(0, Math.min(count, arr.length));
}

async function run() {
  try {
    process.env.NODE_ENV = process.env.NODE_ENV || 'production';
    console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');

    const entities = await db.ProcuringEntity.findAll({
      include: [{ model: db.User, as: 'user', attributes: ['id', 'email', 'firstName', 'lastName'] }]
    });

    if (!entities.length) {
      console.log('No procuring entities found. Create an entity first (e.g. from Admin Dashboard).');
      await db.sequelize.close();
      process.exit(1);
    }

    const cpvCodes = await db.CPVCode.findAll();
    if (!cpvCodes.length) {
      console.log('No CPV codes found. Run CPV seed first: npx sequelize-cli db:seed --seed 20240213000001-seed-cpv-codes.js');
      await db.sequelize.close();
      process.exit(1);
    }

    const deadline = new Date();
    deadline.setFullYear(deadline.getFullYear() + 1);

    const targetPerEntity = 5;
    let created = 0;

    for (const entity of entities) {
      const entityUser = entity.user;
      if (!entityUser) continue;

      const existing = await db.Questionnaire.count({ where: { procuringEntityId: entity.id } });
      const toCreate = Math.max(0, targetPerEntity - existing);
      if (toCreate === 0) {
        console.log(`  Entity "${entity.entityName || entity.id}" already has ${existing} questionnaires, skipping.`);
        continue;
      }

      const usedCpvIds = new Set();
      const existingQ = await db.Questionnaire.findAll({ where: { procuringEntityId: entity.id }, attributes: ['cpvCodeId'] });
      existingQ.forEach((q) => usedCpvIds.add(q.cpvCodeId));

      for (let q = 0; q < toCreate; q++) {
        const available = cpvCodes.filter((c) => !usedCpvIds.has(c.id));
        if (!available.length) break;

        const cpv = pickRandom(available);
        usedCpvIds.add(cpv.id);

        const questionnaire = await db.Questionnaire.create({
          procuringEntityId: entity.id,
          cpvCodeId: cpv.id,
          title: `Pre-qualification – ${cpv.code}`,
          description: `Pre-qualification questionnaire for CPV ${cpv.code}: ${(cpv.description || '').slice(0, 80)}...`,
          deadline,
          isActive: true,
          createdBy: entityUser.id
        });

        const numQuestions = 4 + Math.floor(Math.random() * 2);
        const chosen = pickRandom(QUESTION_TEMPLATES, numQuestions).sort((a, b) => a.order - b.order);
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

        created++;
        console.log(`  Created questionnaire: "${questionnaire.title}" (CPV ${cpv.code}) with ${chosen.length} questions.`);
      }
    }

    console.log(`\n✓ Sample questionnaires done. Created ${created} new questionnaire(s) across ${entities.length} entity/entities.`);
    await db.sequelize.close();
  } catch (err) {
    console.error('Error:', err.message);
    await db.sequelize.close();
    process.exit(1);
  }
}

run();
