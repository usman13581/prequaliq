/**
 * Showcase sample data for LOCAL and TEST environments: accounts in every approval status and
 * procurements in every stage, so the three Home screens, lists and contract screens show real figures.
 *
 * How it works: everything is created through the running API, with the same rules as the screens.
 * Only "the bid deadline has passed" is written straight to the database, because time cannot be
 * fast-forwarded.
 *
 * Run (the backend must be running):
 *   cd backend && npm run seed-showcase
 *
 * Settings (all optional):
 *   API_URL          default http://localhost:5001/api
 *   ADMIN_EMAIL      default admin@prequaliq.com
 *   ADMIN_PASSWORD   default Admin123!
 *
 * Start from an empty database (npm run clean-db). Accounts that already exist are reused when they
 * accept the sample password; a procurement is skipped when one with the same title already exists.
 * Never runs in production.
 */
require('dotenv').config();

const API = (process.env.API_URL || 'http://localhost:5001/api').replace(/\/$/, '');
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@prequaliq.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin123!';
const PW = 'Password123!';

if (String(process.env.NODE_ENV || '').toLowerCase() === 'production') {
  console.error('seed-showcase creates made-up companies and bids. It does not run in production.');
  process.exit(1);
}

const db = require('../models');

const tokens = {};
const supplierIds = {};
const cpvIds = {};
let failures = 0;

const day = (offset) => new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10);

async function call(who, method, path, body) {
  const headers = {};
  if (who && tokens[who]) headers.Authorization = `Bearer ${tokens[who]}`;
  if (body) headers['content-type'] = 'application/json';
  const res = await fetch(API + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { message: text.slice(0, 200) }; }
  return { status: res.status, json };
}

/** Runs a step and reports a refusal without stopping the rest. */
async function step(label, who, method, path, body) {
  const r = await call(who, method, path, body);
  if (r.status >= 400) {
    failures += 1;
    console.warn(`  ! ${label}: ${r.status} ${r.json?.message || ''}`);
  }
  return r;
}

async function login(key, email, password) {
  const r = await call(null, 'POST', '/auth/login', { email, password });
  if (r.json?.token) tokens[key] = r.json.token;
  return Boolean(r.json?.token);
}

async function cpv(code) {
  if (!cpvIds[code]) {
    const r = await call('admin', 'GET', `/cpv?search=${code}`);
    const row = (r.json.cpvCodes || []).find((c) => c.code === code);
    if (!row) throw new Error(`CPV code ${code} is not in the catalogue. Seed the CPV codes first.`);
    cpvIds[code] = row.id;
  }
  return cpvIds[code];
}

async function adminSuppliers() {
  const r = await call('admin', 'GET', '/admin/suppliers');
  return r.json.suppliers || r.json || [];
}
async function adminEntities() {
  const r = await call('admin', 'GET', '/admin/procuring-entities');
  return r.json.procuringEntities || r.json.entities || r.json || [];
}

/** decide: 'approve' | 'reject' | 'none' (stays pending) */
async function ensureSupplier(key, s, decide = 'approve') {
  let row = (await adminSuppliers()).find((x) => x.user?.email === s.email);
  if (!row) {
    await step(`create supplier ${s.company}`, 'admin', 'POST', '/admin/suppliers', {
      email: s.email, password: PW, firstName: s.first, lastName: s.last, phone: s.phone
    });
  }
  if (!(await login(key, s.email, PW))) {
    throw new Error(`${s.email} exists with another password. Start from an empty database (npm run clean-db).`);
  }
  if (!row) {
    await step(`profile ${s.company}`, key, 'PUT', '/supplier/profile', {
      companyName: s.company, registrationNumber: s.reg, address: s.address, city: s.city, country: 'Sweden'
    });
    await step(`CPV ${s.company}`, key, 'PUT', '/supplier/cpv-codes', { cpvCodeIds: [await cpv(s.cpv)] });
    row = (await adminSuppliers()).find((x) => x.user?.email === s.email);
    if (decide === 'approve') {
      await step(`approve ${s.company}`, 'admin', 'PUT', `/admin/suppliers/${row.id}/review`, { action: 'approve' });
    } else if (decide === 'reject') {
      await step(`reject ${s.company}`, 'admin', 'PUT', `/admin/suppliers/${row.id}/review`, {
        action: 'reject',
        rejectionReason: 'Registration number could not be verified. Upload the registration certificate and submit again.'
      });
    }
  }
  supplierIds[key] = row.id;
  console.log(`  supplier  ${s.company}`);
}

async function ensureBuyer(key, b, decide = 'approve') {
  let row = (await adminEntities()).find((x) => x.user?.email === b.email);
  if (!row) {
    await step(`create buyer ${b.entity}`, 'admin', 'POST', '/admin/procuring-entities', {
      email: b.email, password: PW, firstName: b.first, lastName: b.last, entityName: b.entity, phone: b.phone
    });
  }
  if (!(await login(key, b.email, PW))) {
    throw new Error(`${b.email} exists with another password. Start from an empty database (npm run clean-db).`);
  }
  if (!row) {
    await step(`profile ${b.entity}`, key, 'PUT', '/procuring-entity/profile', {
      firstName: b.first, lastName: b.last, entityName: b.entity, address: b.address, city: b.city, country: 'Sweden'
    });
    row = (await adminEntities()).find((x) => x.user?.email === b.email);
    if (decide === 'approve') {
      await step(`approve ${b.entity}`, 'admin', 'PUT', `/admin/procuring-entities/${row.id}/review`, { action: 'approve' });
    }
  }
  console.log(`  buyer     ${b.entity}`);
}

const QUESTIONS = [
  { questionText: 'Describe how you will carry out the assignment.', questionType: 'textarea', isRequired: true, order: 1 },
  { questionText: 'How many comparable assignments have you completed in the last three years?', questionType: 'number', isRequired: true, order: 2 },
  { questionText: 'Can you start on the planned start date?', questionType: 'yes_no', isRequired: true, order: 3 },
  { questionText: 'State your total price in SEK excluding VAT.', questionType: 'number', isRequired: true, order: 4 }
];

/** Creates a questionnaire and a procedure, and publishes it unless publish is false. Returns null when it already exists. */
async function procedure(buyer, { title, type = 'open', code, desc, bid = 9, qa = 3, invite = [], publish = true }) {
  const mine = await call(buyer, 'GET', '/procedures/mine');
  if ((mine.json.procedures || mine.json || []).some((p) => p.title === title)) {
    console.log(`  exists    ${title}`);
    return null;
  }
  let r = await step(`questionnaire for ${title}`, buyer, 'POST', '/questionnaires', {
    title: `Qualification - ${title}`,
    description: `Qualification and bid questions for: ${title}.`,
    deadline: day(30),
    cpvCodeId: await cpv(code),
    questions: QUESTIONS
  });
  const questionnaireId = (r.json.questionnaire || r.json).id;
  r = await step(`procedure ${title}`, buyer, 'POST', '/procedures', {
    title, procedureType: type, bidDeadline: day(bid), description: desc
  });
  const id = (r.json.procedure || r.json).id;
  console.log(`  procedure ${title}`);
  if (!publish) return { id, questionnaireId, title };

  await step(`link ${title}`, buyer, 'PUT', `/procedures/${id}/underlag`, { questionnaireId });
  await step(`plan ${title}`, buyer, 'PUT', `/procedures/${id}`, { qaDeadline: day(qa), announcementText: desc });
  await step(`publish ${title}`, buyer, 'POST', `/procedures/${id}/publish`, { supplierIds: invite.map((k) => supplierIds[k]) });
  const q = await call(invite[0], 'GET', `/supplier/questionnaires/${questionnaireId}?procedureId=${id}`);
  const questionIds = ((q.json.questionnaire || q.json).questions || [])
    .sort((a, b) => a.order - b.order)
    .map((x) => x.id);
  return { id, questionnaireId, questionIds, title };
}

async function bid(who, p, values, status = 'submitted') {
  if (!p) return;
  await call(who, 'PUT', `/procedures/${p.id}/espd`, { exclusionGroundsOk: true, declarationText: 'No grounds for exclusion apply.' });
  const answers = values.map((v, i) => ({ questionId: p.questionIds[i], answerText: String(v), answerValue: String(v) }));
  await step(`bid by ${who} on ${p.title}`, who, 'POST', `/questionnaires/${p.questionnaireId}/responses`, {
    answers, status, procedureId: p.id
  });
}

/** The one direct database write: the bid deadline of this procedure was yesterday. */
async function closeBidding(p) {
  await db.Procedure.update(
    { bidDeadline: day(-1), sealedUntil: new Date(Date.now() - 60000) },
    { where: { id: p.id } }
  );
}

/** Unseals, scores and (with a winner) awards. Returns the contract created by the award. */
async function evaluate(buyer, p, scores, winner, memo) {
  if (!p) return null;
  await closeBidding(p);
  await step(`unseal ${p.title}`, buyer, 'POST', `/procedures/${p.id}/unseal`);
  for (const [who, score, notes] of scores) {
    await step(`score ${who}`, buyer, 'PUT', `/procedures/${p.id}/evaluations`, { supplierId: supplierIds[who], score, notes });
  }
  if (!winner) return null;
  await step(`award ${p.title}`, buyer, 'PUT', `/procedures/${p.id}/award`, {
    winnerSupplierId: supplierIds[winner], decisionMemo: memo, standstillEndsAt: day(10)
  });
  const c = await call(buyer, 'GET', '/contracts/mine');
  return (c.json.contracts || c.json || []).find((x) => x.procedureId === p.id) || null;
}

const SUPPLIERS = {
  erik: { first: 'Erik', last: 'Hallberg', email: 'erik.hallberg@hallbergbygg.test', phone: '+46 21 555 01 77', company: 'Hallberg Bygg & Renovering AB', reg: '556871-2249', address: 'Verkstadsgatan 12, 721 30', city: 'Vasteras', cpv: '45261900' },
  sara: { first: 'Sara', last: 'Nyman', email: 'sara.nyman@malarotak.test', phone: '+46 8 555 01 93', company: 'Malaro Tak & Fasad AB', reg: '559214-6630', address: 'Hamngatan 28, 151 73', city: 'Sodertalje', cpv: '45261900' },
  nordvik: { first: 'Linnea', last: 'Nordvik', email: 'linnea.nordvik@nordvikel.test', phone: '+46 70 555 01 11', company: 'Nordvik El & Automation AB', reg: '556702-1184', address: 'Storgatan 3', city: 'Vasteras', cpv: '50710000' },
  bergslagen: { first: 'Oskar', last: 'Lindgren', email: 'oskar.lindgren@bergslagenservice.test', phone: '+46 70 555 01 12', company: 'Bergslagen Stad & Service AB', reg: '556433-9021', address: 'Storgatan 4', city: 'Orebro', cpv: '90910000' },
  dalarna: { first: 'Maja', last: 'Eklund', email: 'maja.eklund@dalarnamaleri.test', phone: '+46 70 555 01 13', company: 'Dalarna Maleri & Fasad AB', reg: '556918-4470', address: 'Storgatan 5', city: 'Falun', cpv: '45443000' },
  kustbygg: { first: 'Anton', last: 'Sjoberg', email: 'anton.sjoberg@kustbygg.test', phone: '+46 70 555 01 14', company: 'Kustbygg Entreprenad AB', reg: '559120-3358', address: 'Storgatan 6', city: 'Gothenburg', cpv: '45261900' },
  skogmark: { first: 'Elin', last: 'Holm', email: 'elin.holm@skogmark.test', phone: '+46 70 555 01 15', company: 'Skog & Mark Anlaggning AB', reg: '556655-7712', address: 'Storgatan 7', city: 'Sundsvall', cpv: '90620000' },
  itpartner: { first: 'Johan', last: 'Berg', email: 'johan.berg@malardalenit.test', phone: '+46 70 555 01 16', company: 'Malardalen IT Partner AB', reg: '556840-2296', address: 'Storgatan 8', city: 'Uppsala', cpv: '72253000' }
};

const BUYERS = {
  karin: { first: 'Karin', last: 'Bergstrom', email: 'karin.bergstrom@lindholmen.test', phone: '+46 31 555 01 42', entity: 'Lindholmen Municipal Property Services AB', address: 'Lindholmspiren 7, 417 56', city: 'Gothenburg' },
  vasteras: { first: 'Peter', last: 'Astrom', email: 'peter.astrom@vasterasstad.test', phone: '+46 21 555 02 10', entity: 'Vasteras Stad - Tekniska forvaltningen', address: 'Stadshusgatan 1', city: 'Vasteras' },
  region: { first: 'Helena', last: 'Dahl', email: 'helena.dahl@regionfastigheter.test', phone: '+46 16 555 02 11', entity: 'Region Malardalen Fastigheter', address: 'Stadshusgatan 1', city: 'Eskilstuna' }
};

async function main() {
  console.log(`Seeding showcase data through ${API}`);
  if (!(await login('admin', ADMIN_EMAIL, ADMIN_PASSWORD))) {
    throw new Error(`Could not sign in as ${ADMIN_EMAIL}. Is the backend running, and are ADMIN_EMAIL / ADMIN_PASSWORD right?`);
  }

  console.log('Accounts');
  await ensureBuyer('karin', BUYERS.karin);
  await ensureBuyer('vasteras', BUYERS.vasteras);
  await ensureBuyer('region', BUYERS.region, 'none');
  await ensureSupplier('erik', SUPPLIERS.erik);
  await ensureSupplier('sara', SUPPLIERS.sara);
  await ensureSupplier('nordvik', SUPPLIERS.nordvik);
  await ensureSupplier('bergslagen', SUPPLIERS.bergslagen);
  await ensureSupplier('dalarna', SUPPLIERS.dalarna);
  await ensureSupplier('kustbygg', SUPPLIERS.kustbygg, 'none');
  await ensureSupplier('skogmark', SUPPLIERS.skogmark, 'reject');
  await ensureSupplier('itpartner', SUPPLIERS.itpartner);

  console.log('Procurements');
  // Open for bids: one bid in, one draft, one supplier question waiting for the buyer.
  const cleaning = await procedure('karin', { title: 'Cleaning services for municipal offices 2027', code: '90910000', desc: 'Daily cleaning of 14 municipal office buildings, 38 000 m2 in total, from 1 March 2027.', bid: 9, qa: 3, invite: ['bergslagen', 'sara'] });
  await bid('bergslagen', cleaning, ['Fixed teams per building, digital quality checks every week.', 22, 'yes', 4150000]);
  await bid('sara', cleaning, ['Draft answer, to be completed.', 2], 'draft');
  if (cleaning) await step('question', 'bergslagen', 'POST', `/procedures/${cleaning.id}/qa`, { body: 'Are window cleaning and floor polishing included in the base assignment, or ordered separately?' });

  // Deadline passed, bids still sealed: the buyer has to unseal.
  const electrical = await procedure('karin', { title: 'Framework agreement - electrical maintenance', type: 'framework', code: '50710000', desc: 'Four-year framework for electrical maintenance and minor installations in municipal properties.', bid: 5, qa: 2, invite: ['nordvik', 'erik'] });
  await bid('nordvik', electrical, ['On-call electricians within 2 hours, yearly inspections of all switchgear.', 31, 'yes', 1890000]);
  await bid('erik', electrical, ['Carried out with our certified partner electricians.', 6, 'yes', 2140000]);
  if (electrical) await closeBidding(electrical);

  // In evaluation: one of two bids scored, and a complement request waiting for the supplier.
  const facade = await procedure('karin', { title: 'Facade repainting - Lindholmen School', code: '45443000', desc: 'Repainting of 2 300 m2 rendered facade including scaffolding, summer 2027.', bid: 6, qa: 2, invite: ['erik', 'sara'] });
  await bid('erik', facade, ['Scaffolding in two stages, mineral paint system, 10-year warranty.', 18, 'yes', 1320000]);
  await bid('sara', facade, ['Full scaffolding from day one, silicate paint.', 7, 'yes', 1185000]);
  await evaluate('karin', facade, [['erik', 84, 'Staged scaffolding keeps the school yard open; strong references.']]);
  if (facade) await step('complement', 'karin', 'POST', `/procedures/${facade.id}/complements`, { supplierId: supplierIds.erik, message: 'Please send the product data sheet for the proposed paint system and confirm the warranty terms.', deadline: day(4) });

  // Awarded: contract running, supplier has marked the work done, contract ends within 30 days.
  const snow = await procedure('karin', { title: 'Snow clearing - northern district 2026/27', code: '90620000', desc: 'Snow clearing and gritting of 46 km municipal roads and 12 school yards.', bid: 5, qa: 2, invite: ['bergslagen', 'sara'] });
  await bid('bergslagen', snow, ['Three ploughs on standby, start within 1 hour of 4 cm snowfall.', 9, 'yes', 980000]);
  await bid('sara', snow, ['Subcontracted ploughing, start within 3 hours.', 1, 'yes', 870000]);
  const snowContract = await evaluate('karin', snow, [['bergslagen', 91, 'Own machines, fastest response time.'], ['sara', 58, 'Relies on subcontractors; slow start.']], 'bergslagen', 'Awarded to Bergslagen Stad & Service AB, highest score (91 against 58).');
  if (snowContract) {
    await step('contract terms', 'karin', 'PUT', `/contracts/${snowContract.id}`, { valueAmount: 980000, endDate: day(20), notes: 'Monthly invoicing per call-out.' });
    await step('message', 'karin', 'POST', `/contracts/${snowContract.id}/messages`, { body: 'Welcome. Please send the list of on-call drivers before the first frost.' });
    await step('message', 'bergslagen', 'POST', `/contracts/${snowContract.id}/messages`, { body: 'Driver list is ready. November call-outs are completed and reported.' });
    await step('work done', 'bergslagen', 'POST', `/contracts/${snowContract.id}/delivery/mark-done`, {});
  }

  // Awarded by direct award: the buyer has asked for changes to the delivery.
  const gutter = await procedure('karin', { title: 'Gutter replacement - Lindholmen sports hall', type: 'direct', code: '45261320', desc: 'Replacement of 240 m gutters and 12 downpipes on the sports hall.', bid: 5, qa: 2, invite: ['erik'] });
  await bid('erik', gutter, ['Aluminium-zinc gutters, work from mobile platforms, completed in two weeks.', 27, 'yes', 286000]);
  const gutterContract = await evaluate('karin', gutter, [['erik', 88, 'Clear method and short execution time.']], 'erik', 'Awarded to Hallberg Bygg & Renovering AB after direct award.');
  if (gutterContract) {
    await step('contract terms', 'karin', 'PUT', `/contracts/${gutterContract.id}`, { valueAmount: 286000, endDate: day(120) });
    await step('work done', 'erik', 'POST', `/contracts/${gutterContract.id}/delivery/mark-done`, {});
    await step('changes', 'karin', 'POST', `/contracts/${gutterContract.id}/delivery/request-changes`, { message: 'Two downpipes on the north side are not connected to the drain. Please fix and report back.' });
  }

  // Open with a close deadline and no bid yet, and two drafts.
  await procedure('karin', { title: 'IT support services for schools', code: '72253000', desc: 'On-site and remote IT support for 9 schools, about 2 400 users.', bid: 2, qa: 1, invite: ['erik', 'nordvik'] });
  await procedure('karin', { title: 'Playground equipment - Lindholmen park', code: '37535200', desc: 'Supply and installation of playground equipment for ages 2 to 12.', bid: 21, publish: false });
  await procedure('karin', { title: 'Waste collection for municipal properties', code: '90910000', desc: 'Collection and sorting of waste from 60 municipal properties.', bid: 28, publish: false });

  // A second buyer, so suppliers see tenders from more than one authority.
  const library = await procedure('vasteras', { title: 'Roof maintenance - Vasteras city library', code: '45261900', desc: 'Yearly inspection and maintenance of 3 200 m2 roof, three-year agreement.', bid: 12, qa: 5, invite: ['erik', 'sara'] });
  await bid('erik', library, ['Inspection twice a year with drone photos and a written report.', 40, 'yes', 415000]);
  await procedure('vasteras', { title: 'Office cleaning - Vasteras city hall', code: '90910000', desc: 'Daily cleaning of the city hall, 9 500 m2.', bid: 15, qa: 6, invite: ['bergslagen'] });

  console.log('Account statuses');
  // Two statuses no screen action can produce on demand: yearly re-qualification, and a deactivated account.
  await db.Supplier.update({ status: 'requalification_required' }, { where: { id: supplierIds.dalarna } });
  const it = (await adminSuppliers()).find((x) => x.id === supplierIds.itpartner);
  if (it?.user?.isActive) {
    await step('deactivate', 'admin', 'PUT', `/admin/suppliers/${supplierIds.itpartner}/toggle-status`);
  }

  console.log('');
  console.log(failures ? `Finished with ${failures} refused step(s), listed above.` : 'Showcase data is ready.');
  console.log(`Sample accounts sign in with the password ${PW}`);
  console.log(`  Buyer:    ${BUYERS.karin.email}`);
  console.log(`  Supplier: ${SUPPLIERS.erik.email}`);
  console.log(`  Platform admin: ${ADMIN_EMAIL}`);
}

main()
  .catch((err) => {
    failures += 1;
    console.error(`Stopped: ${err.message}`);
  })
  .finally(async () => {
    await db.sequelize.close().catch(() => {});
    process.exit(failures ? 1 : 0);
  });
