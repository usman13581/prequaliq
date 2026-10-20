/**
 * Realistic demo / staging seed — wipes prior demo data then reloads.
 *
 *   Buyers:    ~22 (approved / pending / rejected + active / inactive users)
 *   Suppliers: ~12 (approved / pending / rejected + active / inactive users)
 *   Questionnaires, procedures, bids, Q&A, evaluations, awards, contracts,
 *   complements, contract thread/delivery, notifications, NUTS/CPV links
 *
 * Extra packs:
 *   - [SCENARIO A–I] on buyer1 — each procedure has its own questionnaire copy
 *   - [AI TEST] award/announcement procedures on buyer1 (unique underlags)
 *   - E2E AI kit accounts: Maria / Jonas / Anna (*.e2e)
 *
 * Run (destructive to demo users):
 *   cd backend && npm run seed-demo
 *
 * Production / Railway (optional, after migrate):
 *   SEED_DEMO_DATA=1 npm start
 *   # or: npm run seed-demo
 *
 * Password for all demo / E2E users: Password123!
 * Admin: admin@prequaliq.com / Admin123!
 */

const db = require('../models');
const { Op } = require('sequelize');
const { hashPassword } = require('../utils/password');
const { ensureDefaultsForUser } = require('../services/entitlementService');

const PASSWORD = 'Password123!';

const BUYER_NAMES = [
  ['Anna', 'Bergström', 'Region Stockholm'],
  ['Lars', 'Eriksson', 'Göteborgs Stad'],
  ['Maria', 'Lindqvist', 'Malmö Stad'],
  ['Erik', 'Nilsson', 'Uppsala Kommun'],
  ['Sara', 'Holm', 'Västerås Stad'],
  ['Johan', 'Karlsson', 'Linköpings Kommun'],
  ['Emma', 'Svensson', 'Örebro Kommun'],
  ['Anders', 'Persson', 'Helsingborgs Stad'],
  ['Lisa', 'Olsson', 'Norrköpings Kommun'],
  ['Peter', 'Andersson', 'Lunds Kommun'],
  ['Karin', 'Gustafsson', 'Umeå Kommun'],
  ['Mikael', 'Johansson', 'Gävle Kommun'],
  ['Helena', 'Larsson', 'Borås Stad'],
  ['Fredrik', 'Sjöberg', 'Sundsvalls Kommun'],
  ['Sofia', 'Nyström', 'Växjö Kommun'],
  ['Daniel', 'Berg', 'Halmstads Kommun'],
  ['Nina', 'Ek', 'Karlstads Kommun'],
  ['Oskar', 'Lind', 'Kristianstads Kommun'],
  ['Clara', 'Åberg', 'Skellefteå Kommun'],
  ['Henrik', 'Månsson', 'Trollhättans Stad'],
  ['Ida', 'Forsberg', 'Luleå Kommun'],
  ['Tobias', 'Wikström', 'Jönköpings Kommun'],
  ['Elin', 'Sandberg', 'Kalmar Kommun']
];

const SUPPLIER_COMPANIES = [
  ['Alex', 'Johnson', 'Nordic Supplies AB'],
  ['Maria', 'Garcia', 'Garcia Industri AB'],
  ['David', 'Lee', 'Lee Tech Solutions'],
  ['Anna', 'Chen', 'Chen Logistics AB'],
  ['Michael', 'Taylor', 'Taylor Equipment AB'],
  ['Lisa', 'Anderson', 'Anderson Services'],
  ['Omar', 'Hassan', 'Nordic Build AB'],
  ['Ingrid', 'Berg', 'Berg Facility AB'],
  ['Karl', 'Svensson', 'Svensson IT Partner'],
  ['Eva', 'Lindholm', 'Lindholm Cleaning AB'],
  ['Nils', 'Åkesson', 'Åkesson Elektro AB'],
  ['Fatima', 'Ali', 'Ali Softworks AB'],
  ['Björn', 'Ekström', 'Ekström Maskin AB'],
  ['Helena', 'Norén', 'Norén Konsult AB']
];

const QUESTION_BANK = [
  { questionText: 'Describe your experience with similar assignments.', questionType: 'textarea' },
  { questionText: 'Annual turnover (SEK)?', questionType: 'number' },
  { questionText: 'Year the company was established?', questionType: 'number' },
  { questionText: 'Do you hold ISO 9001 certification?', questionType: 'yes_no' },
  { questionText: 'Preferred contact method?', questionType: 'dropdown', options: ['Email', 'Phone', 'Both'] },
  { questionText: 'Which regions can you deliver in?', questionType: 'textarea' }
];

const AD_TITLES = [
  'IT workplace equipment',
  'Office supplies framework',
  'Facility cleaning services',
  'Consulting – digital transformation',
  'School furniture supply',
  'Transport and logistics',
  'Medical consumables',
  'Software licenses',
  'Building maintenance',
  'Training and e-learning'
];

function daysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function pick(arr, n = 1) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  if (n === 1) return shuffled[0];
  return shuffled.slice(0, Math.min(n, arr.length));
}

async function safeDestroy(model) {
  if (!model) return;
  try {
    await model.destroy({ where: {}, force: true });
  } catch (e) {
    console.warn(`Cleanup ${model.name}: ${e.message}`);
  }
}

async function cleanup() {
  console.log('Cleaning previous demo / E2E test data…');
  const order = [
    db.ContractAttachment,
    db.ContractMessage,
    db.ComplementAttachment,
    db.ComplementMessage,
    db.Answer,
    db.QuestionnaireResponse,
    db.ComplementRequest,
    db.EspdDeclaration,
    db.ProcedureWatch,
    db.ProcedureInvite,
    db.ProcedureQaMessage,
    db.BidEvaluation,
    db.AwardDecision,
    db.DisMembership,
    db.Contract,
    db.OrgInvite,
    db.OrgMembership,
    db.Department,
    db.FeatureEntitlement,
    db.UserAiPreference,
    db.SupplierNotification,
    db.SupplierProfileSubmission,
    db.SupplierReference,
    db.Document,
    db.AuditEvent,
    db.Question,
    db.Questionnaire,
    db.Procedure
  ];
  for (const m of order) await safeDestroy(m);
  await db.sequelize.query('DELETE FROM supplier_nuts').catch(() => {});
  await db.sequelize.query('DELETE FROM supplier_cpv').catch(() => {});
  await safeDestroy(db.Supplier);
  await safeDestroy(db.ProcuringEntity);
  await safeDestroy(db.Company);
  await db.User.destroy({
    where: {
      [Op.or]: [
        { role: { [Op.in]: ['supplier', 'procuring_entity'] } },
        { email: { [Op.like]: '%@prequaliq.demo' } },
        { email: { [Op.like]: '%.e2e' } }
      ]
    }
  });
}

/** Create a questionnaire with questions cloned from a template (or QUESTION_BANK). */
async function createUniqueUnderlag({
  procuringEntityId,
  createdBy,
  cpvCodeId,
  title,
  description,
  templateQuestions = null,
  deadlineDays = 60
}) {
  const q = await db.Questionnaire.create({
    procuringEntityId,
    cpvCodeId,
    title: String(title).slice(0, 255),
    description: description || null,
    deadline: daysFromNow(deadlineDays),
    isActive: true,
    createdBy
  });
  const source = templateQuestions && templateQuestions.length
    ? templateQuestions
    : QUESTION_BANK.slice(0, 4).map((t, qi) => ({
        questionText: t.questionText,
        questionType: t.questionType,
        options: t.options || null,
        isRequired: qi < 3,
        order: qi
      }));
  for (let i = 0; i < source.length; i++) {
    const t = source[i];
    await db.Question.create({
      questionnaireId: q.id,
      questionText: t.questionText,
      questionType: t.questionType,
      options: t.options || null,
      isRequired: t.isRequired !== undefined ? t.isRequired : true,
      requiresDocument: t.requiresDocument || false,
      documentType: t.documentType || null,
      attachedDocumentId: t.attachedDocumentId || null,
      order: t.order != null ? t.order : i
    });
  }
  return q;
}

async function ensureAdmin() {
  let admin = await db.User.findOne({ where: { email: 'admin@prequaliq.com' } });
  if (!admin) {
    admin = await db.User.create({
      email: 'admin@prequaliq.com',
      password: await hashPassword('Admin123!'),
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      isActive: true
    });
  }
  await ensureDefaultsForUser(admin.id);
  return admin;
}

async function run() {
  await db.sequelize.authenticate();

  const cpvPool = await db.CPVCode.findAll({ attributes: ['id', 'code', 'description'], limit: 40 });
  if (cpvPool.length < 8) {
    console.error('Need CPV codes first: npm run seed-cpv-from-api');
    process.exit(1);
  }
  // Shared CPV set so suppliers actually see buyer ads
  const sharedCpvs = cpvPool.slice(0, 12);

  await cleanup();
  await ensureAdmin();
  const hashed = await hashPassword(PASSWORD);

  // -------- Buyers (22–23) --------
  // Mix: ~16 approved+active, ~2 approved+inactive user, ~2 pending, ~2 rejected
  const buyerSpecs = BUYER_NAMES.slice(0, 22).map((row, i) => {
    let status = 'approved';
    let isActive = true;
    if (i >= 16 && i < 18) { status = 'approved'; isActive = false; } // inactive accounts
    else if (i >= 18 && i < 20) { status = 'pending'; isActive = true; }
    else if (i >= 20) { status = 'rejected'; isActive = true; }
    return { firstName: row[0], lastName: row[1], entityName: row[2], status, isActive, n: i + 1 };
  });

  const buyers = [];
  for (const b of buyerSpecs) {
    const email = `buyer${b.n}@prequaliq.demo`;
    const user = await db.User.create({
      email,
      password: hashed,
      firstName: b.firstName,
      lastName: b.lastName,
      role: 'procuring_entity',
      phone: `+46 8 ${100 + b.n} ${200 + b.n} ${30 + b.n}`,
      isActive: b.isActive
    });
    const entity = await db.ProcuringEntity.create({
      userId: user.id,
      entityName: b.entityName,
      city: b.entityName.split(' ')[0],
      country: 'Sweden',
      status: b.status,
      approvedAt: b.status === 'approved' ? new Date() : null,
      rejectionReason: b.status === 'rejected' ? 'Incomplete organization profile' : null
    });
    await ensureDefaultsForUser(user.id);
    buyers.push({ user, entity, status: b.status, isActive: b.isActive, email });
  }

  // -------- Suppliers (12+) --------
  // Most approved+active; last few cover inactive / pending / rejected
  const supplierSpecs = SUPPLIER_COMPANIES.slice(0, 12).map((row, i) => {
    let status = 'approved';
    let isActive = true;
    if (i === 9) { status = 'approved'; isActive = false; }
    else if (i === 10) { status = 'pending'; isActive = true; }
    else if (i === 11) { status = 'rejected'; isActive = true; }
    return { firstName: row[0], lastName: row[1], companyName: row[2], status, isActive, n: i + 1 };
  });

  const suppliers = [];
  for (const s of supplierSpecs) {
    const email = `supplier${s.n}@prequaliq.demo`;
    const user = await db.User.create({
      email,
      password: hashed,
      firstName: s.firstName,
      lastName: s.lastName,
      role: 'supplier',
      phone: `+46 70 ${100 + s.n} ${20 + s.n} ${30 + s.n}`,
      isActive: s.isActive
    });
    const supplier = await db.Supplier.create({
      userId: user.id,
      companyName: s.companyName,
      city: 'Stockholm',
      country: 'Sweden',
      status: s.status,
      approvedAt: s.status === 'approved' ? new Date() : null,
      rejectionReason: s.status === 'rejected' ? 'Missing insurance documents' : null,
      turnover: 500000 + s.n * 350000,
      employeeCount: 8 + s.n * 5,
      yearEstablished: 2005 + s.n,
      financialStability: 'Stable operations with audited accounts.',
      profileSubmittedAt: new Date(),
      qualificationExpiresAt: s.status === 'approved' ? daysFromNow(280) : null
    });
    await ensureDefaultsForUser(user.id);

    // Each supplier gets 4–6 of the shared CPVs (overlap = they see same ads)
    const myCpvs = pick(sharedCpvs, 4 + (s.n % 3));
    for (const cpv of myCpvs) {
      await db.SupplierCPV.create({ supplierId: supplier.id, cpvCodeId: cpv.id });
    }

    if (s.status === 'approved' && db.Document) {
      await db.Document.create({
        supplierId: supplier.id,
        documentType: 'insurance',
        fileName: `${s.companyName.replace(/\s+/g, '_')}_insurance.pdf`,
        filePath: `demo/${supplier.id}/insurance.pdf`,
        fileSize: 15000,
        mimeType: 'application/pdf',
        uploadedBy: user.id,
        validFrom: daysFromNow(-120),
        validTo: daysFromNow(40 + s.n * 10),
        isActive: true
      });
      if (s.n <= 4) {
        await db.Document.create({
          supplierId: supplier.id,
          documentType: 'quality_certificate',
          fileName: `${s.companyName.replace(/\s+/g, '_')}_iso9001.pdf`,
          filePath: `demo/${supplier.id}/iso9001.pdf`,
          fileSize: 22000,
          mimeType: 'application/pdf',
          uploadedBy: user.id,
          validFrom: daysFromNow(-200),
          validTo: daysFromNow(400),
          isActive: true
        });
      }
    }

    if (db.SupplierReference && s.status === 'approved') {
      await db.SupplierReference.create({
        supplierId: supplier.id,
        projectName: `Public sector delivery ${s.n}`,
        clientName: `Ref Client ${s.n} AB`,
        description: `Successfully delivered services for public-sector client ${s.n}.`,
        contractValue: String(250000 + s.n * 50000),
        yearFrom: 2021 + (s.n % 3),
        yearTo: 2023 + (s.n % 2),
        contactName: 'Reference Contact',
        contactEmail: `ref${s.n}@example.se`
      }).catch(() => {});
    }

    suppliers.push({ user, supplier, status: s.status, isActive: s.isActive, email, cpvs: myCpvs });
  }

  // NUTS regions for approved suppliers
  if (db.NUTSCode && db.SupplierNUTS) {
    const nutsPool = await db.NUTSCode.findAll({ limit: 20 });
    for (const s of suppliers.filter((x) => x.status === 'approved')) {
      const nutsPick = pick(nutsPool, 2 + (s.supplier.employeeCount % 2));
      const list = Array.isArray(nutsPick) ? nutsPick : [nutsPick];
      for (const n of list) {
        if (!n) continue;
        await db.SupplierNUTS.findOrCreate({
          where: { supplierId: s.supplier.id, nutsCodeId: n.id },
          defaults: { supplierId: s.supplier.id, nutsCodeId: n.id }
        });
      }
    }
  }

  const activeApprovedBuyers = buyers.filter((b) => b.status === 'approved' && b.isActive);
  const activeApprovedSuppliers = suppliers.filter((s) => s.status === 'approved' && s.isActive);

  // -------- Questionnaires (open ads) per active buyer --------
  console.log('Seeding questionnaires / open ads…');
  const allQuestionnaires = [];
  for (const buyer of activeApprovedBuyers) {
    const adCount = 2 + (buyer.entity.entityName.length % 3); // 2–4 per buyer
    for (let a = 0; a < adCount; a++) {
      const cpv = sharedCpvs[(buyer.entity.id.charCodeAt(0) + a) % sharedCpvs.length] || pick(sharedCpvs);
      const titleBase = AD_TITLES[(a + buyer.email.length) % AD_TITLES.length];
      const isActive = a !== adCount - 1 || Math.random() > 0.35; // most open, some closed
      const questionnaire = await db.Questionnaire.create({
        procuringEntityId: buyer.entity.id,
        cpvCodeId: cpv.id,
        title: `${titleBase} – ${buyer.entity.entityName}`,
        description: `Open pre-qualification / underlag from ${buyer.entity.entityName}. CPV ${cpv.code}.`,
        deadline: daysFromNow(isActive ? 20 + a * 7 : -5),
        isActive,
        createdBy: buyer.user.id
      });
      const qs = pick(QUESTION_BANK, 4);
      for (let qi = 0; qi < qs.length; qi++) {
        const t = qs[qi];
        await db.Question.create({
          questionnaireId: questionnaire.id,
          questionText: t.questionText,
          questionType: t.questionType,
          options: t.options || null,
          isRequired: qi < 3,
          order: qi
        });
      }
      allQuestionnaires.push({ questionnaire, buyer, cpv, isActive });
    }
  }

  // -------- Procedures + announcement text (mix of open statuses) --------
  console.log('Seeding procedures / announcements…');
  const procStatuses = ['published', 'published', 'qa_open', 'bidding', 'evaluation', 'draft', 'planned'];
  let procIdx = 0;
  const createdProcedures = [];
  for (const buyer of activeApprovedBuyers.slice(1)) {
    // buyer1 gets dedicated scenario pack below
    const buyerAds = allQuestionnaires.filter((q) => q.buyer.entity.id === buyer.entity.id && q.isActive);
    const howMany = 1 + (procIdx % 2); // 1–2 procedures each
    for (let p = 0; p < howMany; p++) {
      const linked = buyerAds[p % Math.max(buyerAds.length, 1)];
      const status = procStatuses[procIdx % procStatuses.length];
      procIdx += 1;
      const sealed = ['published', 'qa_open', 'bidding'].includes(status);
      const procedure = await db.Procedure.create({
        procuringEntityId: buyer.entity.id,
        questionnaireId: linked && status !== 'draft' ? linked.questionnaire.id : null,
        title: linked
          ? linked.questionnaire.title.replace(' – ', ' — ')
          : `Upcoming procurement – ${buyer.entity.entityName}`,
        referenceNumber: `REF-2026-${String(1000 + procIdx)}`,
        procedureType: pick(['open', 'open', 'restricted', 'direct', 'framework']),
        description: `Public procurement run by ${buyer.entity.entityName}. Seeded for local testing.`,
        status,
        bidDeadline: daysFromNow(status === 'draft' ? 45 : 12 + (p * 5)),
        qaDeadline: daysFromNow(8),
        isSealed: sealed,
        sealedUntil: sealed ? new Date(Date.now() + 12 * 86400000) : null,
        announcementText: status === 'draft' || status === 'planned'
          ? null
          : [
              `ANNOUNCEMENT`,
              `${buyer.entity.entityName} invites tenders.`,
              `Reference: REF-2026-${1000 + procIdx}`,
              `Deadline: see bid deadline.`,
              `Contact: ${buyer.user.firstName} ${buyer.user.lastName} (${buyer.email})`
            ].join('\n'),
        createdBy: buyer.user.id
      });
      createdProcedures.push(procedure);
    }
  }

  // -------- Supplier responses to open ads (general / no procedureId) --------
  console.log('Seeding supplier responses…');
  let responseCount = 0;
  const openAds = allQuestionnaires.filter((q) => q.isActive);
  for (const ad of openAds) {
    // Skip buyer1 shared underlag — handled in scenario pack with procedure scope
    if (ad.buyer.email === 'buyer1@prequaliq.demo' && ad.questionnaire.title.startsWith('IT workplace')) {
      continue;
    }
    // 2–4 suppliers respond to each open ad (among those who have the CPV)
    const eligible = activeApprovedSuppliers.filter((s) =>
      s.cpvs.some((c) => c.id === ad.cpv.id)
    );
    // Ensure at least some overlap: if none, attach CPV to 2 suppliers
    let responders = eligible;
    if (responders.length === 0) {
      responders = pick(activeApprovedSuppliers, 2);
      for (const s of responders) {
        await db.SupplierCPV.findOrCreate({
          where: { supplierId: s.supplier.id, cpvCodeId: ad.cpv.id },
          defaults: { supplierId: s.supplier.id, cpvCodeId: ad.cpv.id }
        });
      }
    } else {
      responders = pick(eligible, Math.min(eligible.length, 2 + (ad.questionnaire.title.length % 3)));
      if (!Array.isArray(responders)) responders = [responders];
    }

    const questions = await db.Question.findAll({ where: { questionnaireId: ad.questionnaire.id } });
    for (let ri = 0; ri < responders.length; ri++) {
      const s = responders[ri];
      const status = ri === responders.length - 1 && Math.random() > 0.5 ? 'draft' : 'submitted';
      const response = await db.QuestionnaireResponse.create({
        questionnaireId: ad.questionnaire.id,
        supplierId: s.supplier.id,
        procedureId: null,
        status,
        submittedAt: status === 'submitted' ? new Date() : null
      });
      for (const question of questions) {
        // Drafts may leave last question empty
        if (status === 'draft' && question.order === questions.length - 1) continue;
        await db.Answer.create({
          responseId: response.id,
          questionId: question.id,
          answerText:
            question.questionType === 'yes_no'
              ? 'Yes'
              : question.questionType === 'dropdown'
                ? 'Email'
                : `Response from ${s.supplier.companyName} regarding “${ad.questionnaire.title}”.`,
          answerValue: question.questionType === 'number' ? String(800000 + Math.floor(Math.random() * 4000000)) : null
        });
      }
      responseCount += 1;
    }
  }

  // -------- Labelled scenarios (buyer1 + supplier1) for bid editability checks --------
  console.log('Seeding labelled bid-editability scenarios (A–I)…');
  const buyer1 = activeApprovedBuyers.find((b) => b.email === 'buyer1@prequaliq.demo') || activeApprovedBuyers[0];
  const supplier1 = activeApprovedSuppliers.find((s) => s.email === 'supplier1@prequaliq.demo') || activeApprovedSuppliers[0];
  const supplier2 = activeApprovedSuppliers.find((s) => s.email === 'supplier2@prequaliq.demo') || activeApprovedSuppliers[1];

  async function fillAnswers(responseId, questions, label) {
    for (const question of questions) {
      await db.Answer.create({
        responseId,
        questionId: question.id,
        answerText:
          question.questionType === 'yes_no'
            ? 'Yes'
            : question.questionType === 'dropdown'
              ? 'Email'
              : `[${label}] Answer from ${supplier1.supplier.companyName}`,
        answerValue: question.questionType === 'number' ? '1250000' : null
      });
    }
  }

  if (buyer1 && supplier1) {
    const sharedCpv = sharedCpvs[0];
    // Ensure supplier1/2 can see buyer1 CPV ads
    for (const s of [supplier1, supplier2].filter(Boolean)) {
      await db.SupplierCPV.findOrCreate({
        where: { supplierId: s.supplier.id, cpvCodeId: sharedCpv.id },
        defaults: { supplierId: s.supplier.id, cpvCodeId: sharedCpv.id }
      });
    }

    // Template questions for A–F — each procedure gets its own questionnaire copy
    const templateUnderlag = await createUniqueUnderlag({
      procuringEntityId: buyer1.entity.id,
      createdBy: buyer1.user.id,
      cpvCodeId: sharedCpv.id,
      title: `IT workplace equipment – ${buyer1.entity.entityName} (template)`,
      description: 'Template underlag; SCENARIO A–F each use a dedicated copy (1 procedure ↔ 1 questionnaire).',
      deadlineDays: 60
    });
    allQuestionnaires.push({ questionnaire: templateUnderlag, buyer: buyer1, cpv: sharedCpv, isActive: true });
    const templateQuestions = await db.Question.findAll({
      where: { questionnaireId: templateUnderlag.id },
      order: [['order', 'ASC']]
    });

    const scenarioDefs = [
      {
        key: 'A',
        title: '[SCENARIO A] Open — already submitted (expect READ-ONLY)',
        status: 'bidding',
        bidDeadline: daysFromNow(14),
        responseStatus: 'submitted',
        expect: 'read-only'
      },
      {
        key: 'B',
        title: '[SCENARIO B] Open — draft in progress (expect EDITABLE)',
        status: 'qa_open',
        bidDeadline: daysFromNow(18),
        responseStatus: 'draft',
        expect: 'editable'
      },
      {
        key: 'C',
        title: '[SCENARIO C] Reuses underlag — no bid yet (expect EDITABLE + prefill)',
        status: 'published',
        bidDeadline: daysFromNow(21),
        responseStatus: null,
        expect: 'editable-prefill'
      },
      {
        key: 'D',
        title: '[SCENARIO D] Bid deadline passed — draft locked (expect READ-ONLY)',
        status: 'bidding',
        bidDeadline: daysFromNow(-3),
        responseStatus: 'draft',
        expect: 'read-only'
      },
      {
        key: 'E',
        title: '[SCENARIO E] Awarded — viewing only (expect READ-ONLY)',
        status: 'awarded',
        bidDeadline: daysFromNow(-20),
        responseStatus: 'submitted',
        expect: 'read-only'
      },
      {
        key: 'F',
        title: '[SCENARIO F] Under evaluation (expect READ-ONLY)',
        status: 'evaluation',
        bidDeadline: daysFromNow(-5),
        responseStatus: 'submitted',
        expect: 'read-only',
        isSealed: false
      }
    ];

    for (const def of scenarioDefs) {
      procIdx += 1;
      const openish = ['published', 'qa_open', 'bidding'].includes(def.status);
      const underlag = await createUniqueUnderlag({
        procuringEntityId: buyer1.entity.id,
        createdBy: buyer1.user.id,
        cpvCodeId: sharedCpv.id,
        title: `IT workplace – SCENARIO ${def.key} (${buyer1.entity.entityName})`,
        description: `Dedicated underlag for ${def.title}`,
        templateQuestions,
        deadlineDays: 60
      });
      allQuestionnaires.push({ questionnaire: underlag, buyer: buyer1, cpv: sharedCpv, isActive: true });
      const underlagQuestions = await db.Question.findAll({
        where: { questionnaireId: underlag.id },
        order: [['order', 'ASC']]
      });

      const procedure = await db.Procedure.create({
        procuringEntityId: buyer1.entity.id,
        questionnaireId: underlag.id,
        title: def.title,
        referenceNumber: `SCN-${def.key}-2026`,
        procedureType: 'open',
        description: `Test case ${def.key}: expect ${def.expect}. Unique underlag (1 procedure ↔ 1 questionnaire).`,
        status: def.status,
        bidDeadline: def.bidDeadline,
        qaDeadline: daysFromNow(def.key === 'D' || def.key === 'E' || def.key === 'F' ? -10 : 7),
        isSealed: def.isSealed !== undefined ? def.isSealed : openish,
        sealedUntil: openish ? new Date(Date.now() + 14 * 86400000) : null,
        announcementText: `${def.title}\nBuyer: ${buyer1.entity.entityName}\nTest with supplier1@prequaliq.demo`,
        createdBy: buyer1.user.id
      });
      createdProcedures.push(procedure);

      await db.ProcedureWatch.create({
        procedureId: procedure.id,
        supplierId: supplier1.supplier.id
      }).catch(() => {});
      await db.ProcedureInvite.create({
        procedureId: procedure.id,
        supplierId: supplier1.supplier.id,
        invitedBy: buyer1.user.id,
        notifiedAt: new Date()
      }).catch(() => {});

      if (def.responseStatus) {
        const response = await db.QuestionnaireResponse.create({
          questionnaireId: underlag.id,
          supplierId: supplier1.supplier.id,
          procedureId: procedure.id,
          status: def.responseStatus,
          submittedAt: def.responseStatus === 'submitted' ? new Date() : null
        });
        await fillAnswers(response.id, underlagQuestions, `SCENARIO ${def.key}`);
        responseCount += 1;

        if (def.key === 'A' && supplier2) {
          const r2 = await db.QuestionnaireResponse.create({
            questionnaireId: underlag.id,
            supplierId: supplier2.supplier.id,
            procedureId: procedure.id,
            status: 'submitted',
            submittedAt: new Date()
          });
          for (const question of underlagQuestions) {
            await db.Answer.create({
              responseId: r2.id,
              questionId: question.id,
              answerText: `[SCENARIO A] Competing bid from ${supplier2.supplier.companyName}`,
              answerValue: question.questionType === 'number' ? '980000' : null
            });
          }
          responseCount += 1;
        }
      }

      if (def.key === 'E' && db.AwardDecision) {
        await db.AwardDecision.create({
          procedureId: procedure.id,
          winnerSupplierId: supplier1.supplier.id,
          decisionMemo: 'Seeded award for scenario E.',
          awardedAt: new Date(),
          notifiedAt: new Date(),
          createdBy: buyer1.user.id
        });
        if (db.Contract) {
          await db.Contract.create({
            procuringEntityId: buyer1.entity.id,
            supplierId: supplier1.supplier.id,
            procedureId: procedure.id,
            title: `Contract from SCENARIO E — ${supplier1.supplier.companyName}`,
            contractNumber: 'CTR-SCN-E-2026',
            contractType: 'standard',
            startDate: daysFromNow(-5),
            endDate: daysFromNow(360),
            status: 'active',
            notes: 'Auto from scenario seed',
            createdBy: buyer1.user.id
          });
        }
      }
    }

    // G — general questionnaire submitted (Questionnaires tab) READ-ONLY
    const qG = await db.Questionnaire.create({
      procuringEntityId: buyer1.entity.id,
      cpvCodeId: sharedCpv.id,
      title: '[SCENARIO G] General questionnaire — submitted (READ-ONLY on Questionnaires tab)',
      description: 'Not linked to a procedure. Open from Questionnaires → should be read-only.',
      deadline: daysFromNow(30),
      isActive: true,
      createdBy: buyer1.user.id
    });
    for (let qi = 0; qi < 3; qi++) {
      const t = QUESTION_BANK[qi];
      await db.Question.create({
        questionnaireId: qG.id,
        questionText: t.questionText,
        questionType: t.questionType,
        options: t.options || null,
        isRequired: true,
        order: qi
      });
    }
    const qGQuestions = await db.Question.findAll({ where: { questionnaireId: qG.id } });
    const rG = await db.QuestionnaireResponse.create({
      questionnaireId: qG.id,
      supplierId: supplier1.supplier.id,
      procedureId: null,
      status: 'submitted',
      submittedAt: new Date()
    });
    await fillAnswers(rG.id, qGQuestions, 'SCENARIO G');
    responseCount += 1;
    allQuestionnaires.push({ questionnaire: qG, buyer: buyer1, cpv: sharedCpv, isActive: true });

    // H — general draft EDITABLE
    const qH = await db.Questionnaire.create({
      procuringEntityId: buyer1.entity.id,
      cpvCodeId: sharedCpv.id,
      title: '[SCENARIO H] General questionnaire — draft (EDITABLE on Questionnaires tab)',
      description: 'Not linked to a procedure. Open from Questionnaires → should be editable.',
      deadline: daysFromNow(25),
      isActive: true,
      createdBy: buyer1.user.id
    });
    for (let qi = 0; qi < 3; qi++) {
      const t = QUESTION_BANK[qi];
      await db.Question.create({
        questionnaireId: qH.id,
        questionText: t.questionText,
        questionType: t.questionType,
        options: t.options || null,
        isRequired: true,
        order: qi
      });
    }
    const qHQuestions = await db.Question.findAll({ where: { questionnaireId: qH.id } });
    const rH = await db.QuestionnaireResponse.create({
      questionnaireId: qH.id,
      supplierId: supplier1.supplier.id,
      procedureId: null,
      status: 'draft',
      submittedAt: null
    });
    await fillAnswers(rH.id, qHQuestions.slice(0, 2), 'SCENARIO H');
    responseCount += 1;
    allQuestionnaires.push({ questionnaire: qH, buyer: buyer1, cpv: sharedCpv, isActive: true });

    // I — expired questionnaire, already submitted → History READ-ONLY
    const qI = await db.Questionnaire.create({
      procuringEntityId: buyer1.entity.id,
      cpvCodeId: sharedCpv.id,
      title: '[SCENARIO I] Expired questionnaire — submitted (READ-ONLY in History)',
      description: 'Deadline passed. Open from History → should be read-only.',
      deadline: daysFromNow(-10),
      isActive: false,
      createdBy: buyer1.user.id
    });
    for (let qi = 0; qi < 2; qi++) {
      const t = QUESTION_BANK[qi];
      await db.Question.create({
        questionnaireId: qI.id,
        questionText: t.questionText,
        questionType: t.questionType,
        options: t.options || null,
        isRequired: true,
        order: qi
      });
    }
    const qIQuestions = await db.Question.findAll({ where: { questionnaireId: qI.id } });
    const rI = await db.QuestionnaireResponse.create({
      questionnaireId: qI.id,
      supplierId: supplier1.supplier.id,
      procedureId: null,
      status: 'submitted',
      submittedAt: new Date(Date.now() - 12 * 86400000)
    });
    await fillAnswers(rI.id, qIQuestions, 'SCENARIO I');
    responseCount += 1;
    allQuestionnaires.push({ questionnaire: qI, buyer: buyer1, cpv: sharedCpv, isActive: false });

    console.log('  Scenario pack ready: A–F on Tenders (buyer1 underlag), G–I on Questionnaires.');
  }

  // Light Q&A + watches on a few published procedures
  if (db.Procedure && db.ProcedureQaMessage) {
    const published = await db.Procedure.findAll({
      where: { status: { [Op.in]: ['published', 'qa_open', 'bidding'] } },
      limit: 12
    });
    for (const proc of published) {
      const s = pick(activeApprovedSuppliers);
      if (db.ProcedureWatch) {
        await db.ProcedureWatch.create({ procedureId: proc.id, supplierId: s.supplier.id }).catch(() => {});
      }
      if (db.ProcedureInvite) {
        await db.ProcedureInvite.create({
          procedureId: proc.id,
          supplierId: s.supplier.id,
          invitedBy: proc.createdBy,
          notifiedAt: new Date()
        }).catch(() => {});
      }
      await db.ProcedureQaMessage.create({
        procedureId: proc.id,
        threadSupplierId: s.supplier.id,
        authorUserId: s.user.id,
        authorRole: 'supplier',
        body: 'Could you clarify the expected delivery volume for the first year?',
        isPublic: false
      });
      const buyerUserId = proc.createdBy;
      if (buyerUserId) {
        await db.ProcedureQaMessage.create({
          procedureId: proc.id,
          threadSupplierId: s.supplier.id,
          authorUserId: buyerUserId,
          authorRole: 'procuring_entity',
          body: 'Estimated volume is indicative only; see underlag section 3 for details.',
          isPublic: false
        });
      }
    }
  }

  // Contracts with delivery statuses + thread messages
  if (db.Contract) {
    const deliveryCycle = ['none', 'marked_done', 'changes_requested', 'accepted', 'none', 'marked_done'];
    const statusCycle = ['active', 'active', 'active', 'expired', 'terminated', 'draft'];
    for (let i = 0; i < Math.min(10, activeApprovedBuyers.length); i++) {
      const buyer = activeApprovedBuyers[i];
      const supplier = activeApprovedSuppliers[i % activeApprovedSuppliers.length];
      const deliveryStatus = deliveryCycle[i % deliveryCycle.length];
      const status = statusCycle[i % statusCycle.length];
      const contract = await db.Contract.create({
        procuringEntityId: buyer.entity.id,
        supplierId: supplier.supplier.id,
        title: `Framework – ${buyer.entity.entityName} / ${supplier.supplier.companyName}`,
        contractNumber: `FW-DEMO-${i + 1}`,
        contractType: i % 4 === 0 ? 'standard' : 'framework',
        startDate: daysFromNow(-90),
        endDate: daysFromNow(status === 'expired' ? -10 : 270),
        valueAmount: 1000000 + i * 200000,
        status,
        deliveryStatus: status === 'active' ? deliveryStatus : 'none',
        notes: `Seeded contract #${i + 1} for delivery/thread testing`,
        createdBy: buyer.user.id
      });

      if (db.ContractMessage && status === 'active') {
        const m1 = await db.ContractMessage.create({
          contractId: contract.id,
          senderUserId: buyer.user.id,
          senderRole: 'procuring_entity',
          body: `Welcome — please confirm kickoff for ${contract.contractNumber}.`
        });
        const m2 = await db.ContractMessage.create({
          contractId: contract.id,
          senderUserId: supplier.user.id,
          senderRole: 'supplier',
          body: 'Kickoff confirmed. We will upload the delivery report when ready.'
        });
        if (deliveryStatus === 'marked_done' || deliveryStatus === 'changes_requested' || deliveryStatus === 'accepted') {
          await db.ContractMessage.create({
            contractId: contract.id,
            senderUserId: supplier.user.id,
            senderRole: 'supplier',
            body: 'Work marked done — delivery package attached in message thread (seed).'
          });
        }
        if (deliveryStatus === 'changes_requested') {
          await db.ContractMessage.create({
            contractId: contract.id,
            senderUserId: buyer.user.id,
            senderRole: 'procuring_entity',
            body: 'Please revise section 2 of the delivery report and resubmit.'
          });
        }
        if (db.ContractAttachment && m2) {
          await db.ContractAttachment.create({
            contractId: contract.id,
            messageId: m1.id,
            fileName: `${contract.contractNumber}_kickoff.pdf`,
            filePath: `demo/contracts/${contract.id}/kickoff.pdf`,
            mimeType: 'application/pdf',
            size: 12000,
            uploadedByUserId: buyer.user.id
          }).catch(() => {});
        }
      }

      if (db.SupplierNotification && status === 'active') {
        const { createNotification } = require('../services/supplierNotificationService');
        await createNotification(supplier.supplier.id, {
          type: 'contract_updated',
          title: 'Contract available',
          message: `${contract.title} is ready in your Contracts tab.`,
          linkTab: 'contracts'
        }).catch(() => {});
      }
    }
  }

  // Full lifecycle pack on buyer2: unsealed evaluation + complements + award-ready
  if (buyer1 && activeApprovedBuyers[1] && activeApprovedSuppliers.length >= 2) {
    const buyer2 = activeApprovedBuyers[1];
    const sA = activeApprovedSuppliers[0];
    const sB = activeApprovedSuppliers[1];
    const sC = activeApprovedSuppliers[2] || sB;
    const lifeCpv = sharedCpvs[1] || sharedCpvs[0];
    for (const s of [sA, sB, sC]) {
      await db.SupplierCPV.findOrCreate({
        where: { supplierId: s.supplier.id, cpvCodeId: lifeCpv.id },
        defaults: { supplierId: s.supplier.id, cpvCodeId: lifeCpv.id }
      });
    }

    const lifeQ = await db.Questionnaire.create({
      procuringEntityId: buyer2.entity.id,
      cpvCodeId: lifeCpv.id,
      title: '[LIFECYCLE] Facility services — ready for eval / award / complements',
      description: 'Unsealed procedure with 3 submitted bids. Use for complement, scoring, award, contract.',
      deadline: daysFromNow(-2),
      isActive: true,
      createdBy: buyer2.user.id
    });
    for (let qi = 0; qi < 4; qi++) {
      const t = QUESTION_BANK[qi];
      await db.Question.create({
        questionnaireId: lifeQ.id,
        questionText: t.questionText,
        questionType: t.questionType,
        options: t.options || null,
        isRequired: true,
        order: qi
      });
    }
    const lifeQuestions = await db.Question.findAll({ where: { questionnaireId: lifeQ.id } });
    const lifeProc = await db.Procedure.create({
      procuringEntityId: buyer2.entity.id,
      questionnaireId: lifeQ.id,
      title: '[LIFECYCLE] Facility services — unsealed evaluation',
      referenceNumber: 'LIFE-EVAL-2026',
      procedureType: 'open',
      description: 'Bid deadline passed; unsealed. Score suppliers, send complements, then award.',
      status: 'evaluation',
      bidDeadline: daysFromNow(-2),
      qaDeadline: daysFromNow(-10),
      isSealed: false,
      sealedUntil: new Date(Date.now() - 2 * 86400000),
      announcementText: 'LIFECYCLE test procedure — evaluation open.',
      createdBy: buyer2.user.id
    });

    const lifeScores = [82, 71, 64];
    for (let i = 0; i < 3; i++) {
      const s = [sA, sB, sC][i];
      await db.ProcedureInvite.create({
        procedureId: lifeProc.id,
        supplierId: s.supplier.id,
        invitedBy: buyer2.user.id,
        notifiedAt: new Date()
      }).catch(() => {});
      if (db.EspdDeclaration) {
        await db.EspdDeclaration.create({
          procedureId: lifeProc.id,
          supplierId: s.supplier.id,
          exclusionGroundsOk: true,
          declarationText: 'No exclusion grounds apply (seed).',
          submittedAt: new Date()
        }).catch(() => {});
      }
      const resp = await db.QuestionnaireResponse.create({
        questionnaireId: lifeQ.id,
        supplierId: s.supplier.id,
        procedureId: lifeProc.id,
        status: 'submitted',
        submittedAt: new Date(Date.now() - (4 - i) * 86400000),
        isActive: true
      });
      for (const question of lifeQuestions) {
        await db.Answer.create({
          responseId: resp.id,
          questionId: question.id,
          answerText:
            question.questionType === 'yes_no'
              ? 'Yes'
              : `[LIFECYCLE] Bid from ${s.supplier.companyName}`,
          answerValue: question.questionType === 'number' ? String(900000 + i * 100000) : null
        });
      }
      if (db.BidEvaluation) {
        await db.BidEvaluation.create({
          procedureId: lifeProc.id,
          supplierId: s.supplier.id,
          score: lifeScores[i],
          notes: i === 0 ? 'Strong capacity and references.' : 'Acceptable; minor gaps.',
          evaluatedBy: buyer2.user.id
        });
      }
    }

    // Open complement on #2 supplier (for blinking CTA + slide-over)
    if (db.ComplementRequest && db.ComplementMessage) {
      const comp = await db.ComplementRequest.create({
        procedureId: lifeProc.id,
        supplierId: sB.supplier.id,
        requestedBy: buyer2.user.id,
        message: 'Please clarify your ISO certification expiry date and attach the certificate.',
        deadline: daysFromNow(5),
        status: 'open'
      });
      await db.ComplementMessage.create({
        complementRequestId: comp.id,
        authorUserId: buyer2.user.id,
        authorRole: 'procuring_entity',
        body: 'Please clarify your ISO certification expiry date and attach the certificate.'
      });
      if (db.SupplierNotification) {
        await db.SupplierNotification.create({
          supplierId: sB.supplier.id,
          type: 'complement_request',
          title: 'Complement requested',
          message: `Complement on ${lifeProc.title}`,
          linkTab: 'tenders',
          isRead: false,
          meta: { procedureId: lifeProc.id, complementId: comp.id }
        }).catch(() => {});
      }
    }

    // Sealed bidding procedure (award/complements should stay locked)
    const sealedProc = await db.Procedure.create({
      procuringEntityId: buyer2.entity.id,
      questionnaireId: lifeQ.id,
      title: '[SEALED] Still sealed — award/complements locked',
      referenceNumber: 'LIFE-SEALED-2026',
      procedureType: 'open',
      description: 'isSealed=true until bid deadline. Verify Award/Complements disabled.',
      status: 'bidding',
      bidDeadline: daysFromNow(5),
      qaDeadline: daysFromNow(3),
      isSealed: true,
      sealedUntil: new Date(Date.now() + 5 * 86400000),
      announcementText: 'Sealed bidding — do not unseal early.',
      createdBy: buyer2.user.id
    });
    for (const s of [sA, sB]) {
      await db.ProcedureInvite.create({
        procedureId: sealedProc.id,
        supplierId: s.supplier.id,
        invitedBy: buyer2.user.id,
        notifiedAt: new Date()
      }).catch(() => {});
    }

    createdProcedures.push(lifeProc, sealedProc);
    allQuestionnaires.push({ questionnaire: lifeQ, buyer: buyer2, cpv: lifeCpv, isActive: true });
  }

  // Extra notifications for supplier1
  if (db.SupplierNotification && activeApprovedSuppliers[0]) {
    const s1 = activeApprovedSuppliers[0];
    const { createNotification } = require('../services/supplierNotificationService');
    const notes = [
      { type: 'tender_invite', title: 'New tender invite', message: 'You were invited to a demo procedure.', linkTab: 'tenders' },
      { type: 'award_decision', title: 'Award decision', message: 'An award decision was published (seed).', linkTab: 'tenders' },
      { type: 'qa_reply', title: 'Q&A reply', message: 'Buyer replied in a private Q&A thread.', linkTab: 'tenders' }
    ];
    for (const n of notes) {
      await createNotification(s1.supplier.id, n).catch(() => {});
    }
  }

  // Sample notifications for buyer1 and admin (unified inbox)
  if (db.UserNotification) {
    const { createForUser } = require('../services/notificationService');
    if (activeApprovedBuyers[0]?.user?.id) {
      const buyerNotes = [
        { type: 'bid_submitted', title: 'New bid received', message: 'Nordic Facility submitted a bid on a demo procedure.', linkTab: 'procedures' },
        { type: 'complement_reply', title: 'Complement response', message: 'A supplier replied to a complement request.', linkTab: 'procedures' },
        { type: 'contract_activity', title: 'Contract activity', message: 'Supplier uploaded a delivery note.', linkTab: 'contracts' }
      ];
      for (const n of buyerNotes) {
        await createForUser(activeApprovedBuyers[0].user.id, n).catch(() => {});
      }
    }
    const adminUser = await db.User.findOne({ where: { role: 'admin', isActive: true }, attributes: ['id'] });
    if (adminUser) {
      const adminNotes = [
        { type: 'supplier_submitted', title: 'Supplier awaiting review', message: 'A demo supplier submitted a qualification profile.', linkTab: 'suppliers' },
        { type: 'entity_pending', title: 'Entity pending approval', message: 'A procuring entity registration needs review.', linkTab: 'entities' }
      ];
      for (const n of adminNotes) {
        await createForUser(adminUser.id, n).catch(() => {});
      }
    }
  }

  // Departments + org invites for first buyers (buyer1 gets a fuller set)
  if (db.Department) {
    const crypto = require('crypto');
    const deptNames = [
      ['Procurement', 'Central procurement office'],
      ['IT', 'Digital systems and licenses'],
      ['Facilities', 'Buildings and maintenance'],
      ['Education', 'Schools and education materials'],
      ['Healthcare', 'Care and medical supplies'],
      ['Transport', 'Fleet and logistics'],
      ['Legal', 'Contracts and compliance'],
      ['Finance', 'Budgets and follow-up'],
      ['HR', 'Staffing services'],
      ['Environment', 'Sustainability purchases'],
      ['Communications', 'Print and media'],
      ['Culture', 'Libraries and culture venues']
    ];
    for (let bi = 0; bi < Math.min(4, activeApprovedBuyers.length); bi++) {
      const buyer = activeApprovedBuyers[bi];
      const count = bi === 0 ? deptNames.length : 3 + (bi % 3);
      const createdDepts = [];
      for (let di = 0; di < count; di++) {
        const [dName, dDesc] = deptNames[di % deptNames.length];
        const dept = await db.Department.create({
          ownerType: 'procuring_entity',
          ownerId: buyer.entity.id,
          name: bi === 0 ? dName : `${dName} ${bi + 1}`,
          description: dDesc,
          isActive: di % 7 !== 6
        });
        createdDepts.push(dept);
      }
      if (db.OrgMembership) {
        await db.OrgMembership.findOrCreate({
          where: {
            userId: buyer.user.id,
            ownerType: 'procuring_entity',
            ownerId: buyer.entity.id
          },
          defaults: {
            membershipRole: 'owner',
            departmentId: createdDepts[0]?.id || null
          }
        });
      }
      if (db.OrgInvite) {
        const inviteCount = bi === 0 ? 8 : 2;
        for (let ii = 0; ii < inviteCount; ii++) {
          await db.OrgInvite.create({
            email: `colleague${ii + 1}.buyer${bi + 1}@prequaliq.demo`,
            ownerType: 'procuring_entity',
            ownerId: buyer.entity.id,
            departmentId: createdDepts[ii % createdDepts.length]?.id || null,
            membershipRole: ii % 3 === 0 ? 'admin' : 'member',
            token: crypto.randomBytes(24).toString('hex'),
            invitedBy: buyer.user.id,
            status: 'pending',
            expiresAt: daysFromNow(14)
          });
        }
      }
    }
  }

  // -------- E2E AI kit accounts (Maria / Jonas / Anna) + AI award test procedures --------
  console.log('Seeding E2E AI kit accounts + [AI TEST] award procedures…');
  let facilityCpv =
    (await db.CPVCode.findOne({ where: { code: '90920000' } })) ||
    sharedCpvs.find((c) => /clean|facility|sanitation|9092/i.test(`${c.code} ${c.description}`)) ||
    sharedCpvs[0];

  const e2eBuyerUser = await db.User.create({
    email: 'maria.lindqvist@uppsalastad.e2e',
    password: hashed,
    firstName: 'Maria',
    lastName: 'Lindqvist',
    role: 'procuring_entity',
    phone: '+46 18 727 00 00',
    isActive: true
  });
  const e2eBuyerEntity = await db.ProcuringEntity.create({
    userId: e2eBuyerUser.id,
    entityName: 'Uppsala Stad — Fastighet & Service',
    address: 'Stationsgatan 12',
    city: 'Uppsala',
    country: 'Sweden',
    phone: '+46 18 727 00 00',
    status: 'approved',
    approvedAt: new Date()
  });
  await ensureDefaultsForUser(e2eBuyerUser.id);

  const e2eJonasUser = await db.User.create({
    email: 'jonas.berg@nordicfacility.e2e',
    password: hashed,
    firstName: 'Jonas',
    lastName: 'Berg',
    role: 'supplier',
    phone: '+46 18 100 20 30',
    isActive: true
  });
  const e2eJonas = await db.Supplier.create({
    userId: e2eJonasUser.id,
    companyName: 'Nordic Facility Services AB',
    registrationNumber: '556812-3344',
    taxId: 'SE556812334401',
    address: 'Kungsgatan 45',
    city: 'Uppsala',
    country: 'Sweden',
    employeeCount: 62,
    yearEstablished: 2004,
    turnover: 18500000,
    insurerName: 'If Skadeförsäkring',
    insurancePolicyNumber: 'IF-UPP-2026-7781',
    insuranceCoverageAmount: '15000000',
    insuranceValidTo: '2027-12-31',
    qualityManagementSystem:
      'ISO 9001-aligned QMS. Night and weekend cleaning for municipal buildings. 14 active public-sector contracts in Mälardalen.',
    status: 'approved',
    approvedAt: new Date(),
    profileSubmittedAt: new Date(),
    profileVersion: 1
  });
  await ensureDefaultsForUser(e2eJonasUser.id);

  const e2eAnnaUser = await db.User.create({
    email: 'anna.holm@malardalenclean.e2e',
    password: hashed,
    firstName: 'Anna',
    lastName: 'Holm',
    role: 'supplier',
    phone: '+46 18 200 30 40',
    isActive: true
  });
  const e2eAnna = await db.Supplier.create({
    userId: e2eAnnaUser.id,
    companyName: 'Mälardalen Clean Partner AB',
    registrationNumber: '559041-8821',
    taxId: 'SE559041882101',
    address: 'Svarta vägen 8',
    city: 'Enköping',
    country: 'Sweden',
    employeeCount: 28,
    yearEstablished: 2012,
    turnover: 7200000,
    insurerName: 'Länsförsäkringar',
    insurancePolicyNumber: 'LF-ENK-2026-441',
    insuranceCoverageAmount: '10000000',
    insuranceValidTo: '2027-06-30',
    qualityManagementSystem: 'Daytime municipal cleaning; eco-labelled chemicals available on request.',
    status: 'approved',
    approvedAt: new Date(),
    profileSubmittedAt: new Date(),
    profileVersion: 1
  });
  await ensureDefaultsForUser(e2eAnnaUser.id);

  for (const s of [e2eJonas, e2eAnna]) {
    await db.SupplierCPV.findOrCreate({
      where: { supplierId: s.id, cpvCodeId: facilityCpv.id },
      defaults: { supplierId: s.id, cpvCodeId: facilityCpv.id }
    });
  }

  // Maria: one evaluation-ready procedure with unique underlag (for AI award/eval smoke)
  const mariaUnderlag = await createUniqueUnderlag({
    procuringEntityId: e2eBuyerEntity.id,
    createdBy: e2eBuyerUser.id,
    cpvCodeId: facilityCpv.id,
    title: 'AI kit — Ramavtal lokalvård Uppsala 2026',
    description: 'Municipal facility cleaning for schools and offices in Uppsala.',
    deadlineDays: 45
  });
  const mariaProc = await db.Procedure.create({
    procuringEntityId: e2eBuyerEntity.id,
    questionnaireId: mariaUnderlag.id,
    title: 'Ramavtal lokalvård — kommunala lokaler Uppsala 2026',
    referenceNumber: 'UPP-FS-2026-LV-01',
    procedureType: 'open',
    description:
      'Upphandling av lokalvård för skolor, kontor och vårdlokaler inom Uppsala Stad.',
    status: 'evaluation',
    bidDeadline: daysFromNow(-2),
    qaDeadline: daysFromNow(-5),
    isSealed: false,
    sealedUntil: null,
    createdBy: e2eBuyerUser.id
  });
  await db.BidEvaluation.create({
    procedureId: mariaProc.id,
    supplierId: e2eJonas.id,
    score: 88,
    notes: 'Strong QMS + insurance; night shift capacity',
    evaluatedBy: e2eBuyerUser.id
  });
  await db.BidEvaluation.create({
    procedureId: mariaProc.id,
    supplierId: e2eAnna.id,
    score: 72,
    notes: 'Good daytime coverage; limited nights',
    evaluatedBy: e2eBuyerUser.id
  });

  // buyer1: three [AI TEST] award procedures, each with unique underlag
  if (buyer1) {
    const aiScenarios = [
      {
        ref: 'AI-AWARD-001',
        title: '[AI TEST] Award memo — multi-supplier evaluation',
        description:
          'Facility cleaning framework. Use Award tab for AI award memo and announcement.',
        scores: [
          { supplierId: e2eJonas.id, score: 88, notes: 'Strong QMS and insurance; night-shift capacity.' },
          { supplierId: e2eAnna.id, score: 74, notes: 'Solid daytime; limited nights.' },
          ...(supplier1
            ? [{ supplierId: supplier1.supplier.id, score: 61, notes: 'Incomplete references.' }]
            : [])
        ]
      },
      {
        ref: 'AI-AWARD-002',
        title: '[AI TEST] Award memo — close scores',
        description: 'Two close contenders — nuanced award memo.',
        scores: [
          { supplierId: e2eJonas.id, score: 81, notes: 'Best eco-chemical proposal.' },
          { supplierId: e2eAnna.id, score: 79, notes: 'Strong public references.' }
        ]
      },
      {
        ref: 'AI-AWARD-003',
        title: '[AI TEST] Announcement + award — single evaluated',
        description: 'Single evaluated supplier + announcement draft.',
        scores: [
          { supplierId: e2eJonas.id, score: 92, notes: 'Only compliant bid; meets mandatory requirements.' }
        ]
      }
    ];
    for (const sc of aiScenarios) {
      const q = await createUniqueUnderlag({
        procuringEntityId: buyer1.entity.id,
        createdBy: buyer1.user.id,
        cpvCodeId: facilityCpv.id,
        title: `AI TEST underlag — ${sc.ref}`,
        description: `Dedicated underlag for ${sc.title}`,
        deadlineDays: 40
      });
      allQuestionnaires.push({ questionnaire: q, buyer: buyer1, cpv: facilityCpv, isActive: true });
      const proc = await db.Procedure.create({
        procuringEntityId: buyer1.entity.id,
        questionnaireId: q.id,
        title: sc.title,
        referenceNumber: sc.ref,
        procedureType: 'open',
        description: sc.description,
        status: 'evaluation',
        bidDeadline: daysFromNow(-3),
        qaDeadline: daysFromNow(-7),
        isSealed: false,
        sealedUntil: null,
        createdBy: buyer1.user.id
      });
      createdProcedures.push(proc);
      for (const row of sc.scores) {
        await db.BidEvaluation.create({
          procedureId: proc.id,
          supplierId: row.supplierId,
          score: row.score,
          notes: row.notes,
          evaluatedBy: buyer1.user.id
        });
      }
    }
  }

  const summary = {
    buyers: buyers.length + 1,
    buyersApprovedActive: activeApprovedBuyers.length + 1,
    buyersInactive: buyers.filter((b) => !b.isActive).length,
    buyersPending: buyers.filter((b) => b.status === 'pending').length,
    buyersRejected: buyers.filter((b) => b.status === 'rejected').length,
    suppliers: suppliers.length + 2,
    suppliersApprovedActive: activeApprovedSuppliers.length + 2,
    questionnaires: allQuestionnaires.length,
    openAds: openAds.length,
    procedures: db.Procedure ? await db.Procedure.count() : 0,
    responses: responseCount,
    contracts: db.Contract ? await db.Contract.count() : 0,
    e2e: {
      buyer: 'maria.lindqvist@uppsalastad.e2e',
      supplierA: 'jonas.berg@nordicfacility.e2e',
      supplierB: 'anna.holm@malardalenclean.e2e',
      cpv: facilityCpv.code
    }
  };

  console.log('\n✅ Demo seed complete (realistic mix + AI/E2E kit).\n');
  console.log(summary);
  console.log('\n--- Demo logins ---');
  console.log('Admin:     admin@prequaliq.com / Admin123!');
  console.log('Buyers:    buyer1@prequaliq.demo … buyer22@prequaliq.demo');
  console.log('           (buyer1–16 approved+active, 17–18 approved+inactive, 19–20 pending, 21–22 rejected)');
  console.log('Suppliers: supplier1@prequaliq.demo … supplier12@prequaliq.demo');
  console.log('           (1–9 approved+active, 10 approved+inactive, 11 pending, 12 rejected)');
  console.log('Password (all demo / E2E): Password123!');
  console.log('\nE2E AI kit:');
  console.log('  maria.lindqvist@uppsalastad.e2e  → buyer (Uppsala) + evaluation procedure ready for award AI');
  console.log('  jonas.berg@nordicfacility.e2e    → Nordic Facility Services AB');
  console.log('  anna.holm@malardalenclean.e2e    → Mälardalen Clean Partner AB');
  console.log('\nKey smoke logins:');
  console.log('  buyer1@prequaliq.demo     → SCENARIO A–I (unique underlags) + [AI TEST] award procedures');
  console.log('  buyer2@prequaliq.demo     → [LIFECYCLE] eval/award/complements + [SEALED]');
  console.log('  supplier1@prequaliq.demo  → Tenders A–F, contracts, notifications');
  console.log('  supplier2@prequaliq.demo  → open complement CTA on LIFECYCLE');
  console.log('\nBid editability (supplier1 Tenders):');
  console.log('  A submitted open        → READ-ONLY');
  console.log('  B draft open            → EDITABLE');
  console.log('  C open no bid yet       → EDITABLE');
  console.log('  D deadline passed draft → READ-ONLY');
  console.log('  E awarded               → READ-ONLY (+ contract)');
  console.log('  F evaluation            → READ-ONLY');
  console.log('\nAlso: [LIFECYCLE] on buyer2 (unsealed, scored, complement open)');
  console.log('      [SEALED] on buyer2 (award/complements locked)');
  console.log('      Each procedure has a unique questionnaire (no shared underlag).');

  await db.sequelize.close();
  process.exit(0);
}

run().catch(async (err) => {
  console.error('Seed failed:', err);
  try { await db.sequelize.close(); } catch (_) {}
  process.exit(1);
});
