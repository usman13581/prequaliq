/**
 * Home screen summaries: what needs the signed-in buyer or supplier right now,
 * across procedures, bids and contracts. Read-only; each role sees only its own records.
 */
const { Op } = require('sequelize');
const db = require('../models');

const PREPARING = ['draft', 'planned', 'underlag_ready'];
const OPEN = ['published', 'qa_open', 'bidding'];
const AWARDED = ['awarded', 'standstill'];

const dayStr = (d) => (d ? new Date(d).toISOString().slice(0, 10) : null);
const todayStr = () => new Date().toISOString().slice(0, 10);
const inDays = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

/** Upcoming dated events, soonest first. */
function upcoming(events, limit = 6) {
  const today = todayStr();
  return events
    .filter((e) => e.date && e.date >= today)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
    .slice(0, limit);
}

/** Bids are still hidden from the buyer. */
function stillSealed(p, now = new Date()) {
  if (!p.isSealed) return false;
  return !p.sealedUntil || new Date(p.sealedUntil) > now;
}

const buyerHome = async (req, res) => {
  try {
    const entity = await db.ProcuringEntity.findOne({ where: { userId: req.user.id } });
    if (!entity) return res.status(404).json({ message: 'Procuring entity not found' });

    const [procedures, contracts, questionnaires] = await Promise.all([
      db.Procedure.findAll({
        where: { procuringEntityId: entity.id },
        include: [
          {
            model: db.AwardDecision,
            as: 'awardDecision',
            required: false,
            include: [{ model: db.Supplier, as: 'winner', attributes: ['id', 'companyName'] }]
          }
        ],
        order: [['updatedAt', 'DESC']]
      }),
      db.Contract.findAll({
        where: { procuringEntityId: entity.id },
        include: [{ model: db.Supplier, as: 'supplier', attributes: ['id', 'companyName'] }],
        order: [['updatedAt', 'DESC']]
      }),
      db.Questionnaire.findAll({
        where: { procuringEntityId: entity.id },
        attributes: ['id', 'title', 'deadline', 'isActive']
      })
    ]);

    const procedureIds = procedures.map((p) => p.id);
    const [bids, evaluations, qaMessages] = procedureIds.length
      ? await Promise.all([
          db.QuestionnaireResponse.findAll({
            where: { procedureId: { [Op.in]: procedureIds }, status: 'submitted' },
            attributes: ['procedureId', 'supplierId']
          }),
          db.BidEvaluation.findAll({
            where: { procedureId: { [Op.in]: procedureIds } },
            attributes: ['procedureId', 'supplierId', 'score']
          }),
          db.ProcedureQaMessage.findAll({
            where: { procedureId: { [Op.in]: procedureIds } },
            attributes: ['procedureId', 'threadSupplierId', 'authorRole', 'createdAt'],
            order: [['createdAt', 'ASC']]
          })
        ])
      : [[], [], []];

    const bidCount = {};
    bids.forEach((b) => { bidCount[b.procedureId] = (bidCount[b.procedureId] || 0) + 1; });
    const scoredCount = {};
    evaluations.forEach((e) => {
      if (e.score != null) scoredCount[e.procedureId] = (scoredCount[e.procedureId] || 0) + 1;
    });
    // A thread waits for the buyer when its latest message came from the supplier.
    const lastInThread = {};
    qaMessages.forEach((m) => { lastInThread[`${m.procedureId}:${m.threadSupplierId}`] = m; });
    const unanswered = {};
    Object.values(lastInThread).forEach((m) => {
      if (m.authorRole === 'supplier') unanswered[m.procedureId] = (unanswered[m.procedureId] || 0) + 1;
    });

    const now = new Date();
    const todo = [];
    procedures.forEach((p) => {
      const base = { procedureId: p.id, title: p.title, reference: p.referenceNumber, tab: 'procedures' };
      const nBids = bidCount[p.id] || 0;
      if (OPEN.includes(p.status) && unanswered[p.id]) {
        todo.push({ ...base, type: 'qa_unanswered', count: unanswered[p.id], priority: 1 });
      }
      if (OPEN.includes(p.status) && p.isSealed && !stillSealed(p, now)) {
        todo.push({ ...base, type: 'unseal', count: nBids, priority: 1 });
      }
      if (p.status === 'evaluation' && !p.awardDecision) {
        const scored = scoredCount[p.id] || 0;
        if (nBids > 0 && scored < nBids) {
          todo.push({ ...base, type: 'evaluate', count: nBids - scored, priority: 2 });
        } else if (nBids > 0) {
          todo.push({ ...base, type: 'award', priority: 2 });
        }
      }
      if (PREPARING.includes(p.status)) {
        todo.push({ ...base, type: 'publish', priority: 3 });
      }
    });
    contracts.forEach((c) => {
      const base = { contractId: c.id, title: c.title, reference: c.contractNumber, tab: 'contracts' };
      if (c.status === 'active' && c.deliveryStatus === 'marked_done') {
        todo.push({ ...base, type: 'delivery_review', priority: 1 });
      }
      if (c.status === 'active' && c.endDate && dayStr(c.endDate) >= todayStr() && dayStr(c.endDate) <= inDays(30)) {
        todo.push({ ...base, type: 'contract_ending', date: dayStr(c.endDate), priority: 3 });
      }
      if (c.status === 'draft') {
        todo.push({ ...base, type: 'contract_draft', priority: 3 });
      }
    });
    todo.sort((a, b) => a.priority - b.priority);

    const events = [];
    procedures.forEach((p) => {
      const base = { title: p.title, reference: p.referenceNumber, tab: 'procedures' };
      if (OPEN.includes(p.status)) {
        events.push({ ...base, kind: 'qa_deadline', date: dayStr(p.qaDeadline) });
        events.push({ ...base, kind: 'bid_deadline', date: dayStr(p.bidDeadline) });
      }
      if (PREPARING.includes(p.status)) events.push({ ...base, kind: 'bid_deadline', date: dayStr(p.bidDeadline) });
      if (p.status === 'standstill') events.push({ ...base, kind: 'standstill_end', date: dayStr(p.standstillEndsAt) });
    });
    contracts
      .filter((c) => c.status === 'active')
      .forEach((c) => events.push({ title: c.title, reference: c.contractNumber, tab: 'contracts', kind: 'contract_end', date: dayStr(c.endDate) }));

    // Stages that need the buyer come first: evaluation, open for bids, awarded, then drafts.
    const stageRank = (p) =>
      p.status === 'evaluation' ? 0 : OPEN.includes(p.status) ? 1 : AWARDED.includes(p.status) ? 2 : 3;
    const live = procedures
      .filter((p) => !['closed', 'cancelled'].includes(p.status))
      .sort((x, y) => stageRank(x) - stageRank(y));
    res.json({
      status: entity.status || 'pending',
      entityName: entity.entityName,
      counts: {
        preparing: procedures.filter((p) => PREPARING.includes(p.status)).length,
        open: procedures.filter((p) => OPEN.includes(p.status)).length,
        evaluation: procedures.filter((p) => p.status === 'evaluation').length,
        awarded: procedures.filter((p) => AWARDED.includes(p.status)).length,
        contractsActive: contracts.filter((c) => c.status === 'active').length,
        questionnaires: questionnaires.length
      },
      todo: todo.slice(0, 8).map(({ priority, ...rest }) => rest),
      todoTotal: todo.length,
      procedures: (live.length ? live : procedures).slice(0, 6).map((p) => ({
        id: p.id,
        title: p.title,
        reference: p.referenceNumber,
        status: p.status,
        procedureType: p.procedureType,
        bidDeadline: dayStr(p.bidDeadline),
        bidCount: bidCount[p.id] || 0,
        // Only a published procedure has bids to seal; a draft has none yet.
        sealed: OPEN.includes(p.status) && stillSealed(p, now),
        winner: p.awardDecision?.winner?.companyName || null
      })),
      contracts: contracts
        .filter((c) => c.status === 'active' || c.status === 'draft')
        .slice(0, 4)
        .map((c) => ({
          id: c.id,
          title: c.title,
          reference: c.contractNumber,
          status: c.status,
          supplier: c.supplier?.companyName || null,
          endDate: dayStr(c.endDate),
          deliveryStatus: c.deliveryStatus
        })),
      deadlines: upcoming(events)
    });
  } catch (error) {
    console.error('Buyer home error:', error);
    res.status(500).json({ message: 'Error loading home' });
  }
};

const supplierHome = async (req, res) => {
  try {
    const supplier = await db.Supplier.findOne({ where: { userId: req.user.id } });
    if (!supplier) return res.status(404).json({ message: 'Supplier profile not found' });

    const approved = supplier.status === 'approved';
    const invites = await db.ProcedureInvite.findAll({ where: { supplierId: supplier.id }, attributes: ['procedureId'] });
    const invitedIds = invites.map((i) => i.procedureId);

    // Same visibility as the Tenders list: every non-direct procedure, plus direct ones this supplier is invited to.
    const procedures = approved
      ? await db.Procedure.findAll({
          where: {
            status: { [Op.in]: [...OPEN, 'evaluation', ...AWARDED] },
            [Op.or]: [
              { procedureType: { [Op.ne]: 'direct' } },
              ...(invitedIds.length ? [{ id: { [Op.in]: invitedIds } }] : [{ id: null }])
            ]
          },
          include: [{ model: db.ProcuringEntity, as: 'procuringEntity', attributes: ['id', 'entityName'] }],
          order: [['bidDeadline', 'ASC']]
        })
      : [];
    const procedureIds = procedures.map((p) => p.id);

    const [responses, complements, contracts, espd] = await Promise.all([
      procedureIds.length
        ? db.QuestionnaireResponse.findAll({
            where: { supplierId: supplier.id, procedureId: { [Op.in]: procedureIds } },
            attributes: ['procedureId', 'status']
          })
        : [],
      db.ComplementRequest.findAll({
        where: { supplierId: supplier.id, status: 'open' },
        include: [{ model: db.Procedure, as: 'procedure', attributes: ['id', 'title', 'referenceNumber'] }]
      }).catch(() => []),
      db.Contract.findAll({
        where: { supplierId: supplier.id },
        include: [{ model: db.ProcuringEntity, as: 'procuringEntity', attributes: ['id', 'entityName'] }],
        order: [['updatedAt', 'DESC']]
      }),
      procedureIds.length && db.EspdDeclaration
        ? db.EspdDeclaration.findAll({
            where: { supplierId: supplier.id, procedureId: { [Op.in]: procedureIds } },
            attributes: ['procedureId']
          }).catch(() => [])
        : []
    ]);

    const bidStatus = {};
    responses.forEach((r) => {
      if (bidStatus[r.procedureId] !== 'submitted') bidStatus[r.procedureId] = r.status;
    });
    const espdDone = new Set(espd.map((e) => e.procedureId));
    const invitedSet = new Set(invitedIds);
    const today = todayStr();
    const openTenders = procedures.filter((p) => OPEN.includes(p.status));
    // Suppliers can answer until the bid deadline day starts.
    const biddable = (p) => OPEN.includes(p.status) && (!p.bidDeadline || dayStr(p.bidDeadline) > today);

    const todo = [];
    complements.forEach((c) => {
      todo.push({
        type: 'complement', tab: 'tenders', priority: 1,
        procedureId: c.procedureId, title: c.procedure?.title || '', reference: c.procedure?.referenceNumber || null,
        date: dayStr(c.deadline)
      });
    });
    contracts.forEach((c) => {
      if (c.status === 'active' && c.deliveryStatus === 'changes_requested') {
        todo.push({ type: 'delivery_changes', tab: 'contracts', priority: 1, contractId: c.id, title: c.title, reference: c.contractNumber });
      }
    });
    openTenders.filter(biddable).forEach((p) => {
      const base = { tab: 'tenders', procedureId: p.id, title: p.title, reference: p.referenceNumber, date: dayStr(p.bidDeadline) };
      if (bidStatus[p.id] === 'draft') todo.push({ ...base, type: 'bid_draft', priority: 2 });
      else if (!bidStatus[p.id] && invitedSet.has(p.id)) todo.push({ ...base, type: 'bid_invited', priority: 2 });
    });
    todo.sort((a, b) => a.priority - b.priority || String(a.date || '9').localeCompare(String(b.date || '9')));

    const events = [];
    openTenders.filter(biddable).forEach((p) => {
      const base = { title: p.title, reference: p.referenceNumber, tab: 'tenders' };
      events.push({ ...base, kind: 'qa_deadline', date: dayStr(p.qaDeadline) });
      if (bidStatus[p.id] !== 'submitted') events.push({ ...base, kind: 'bid_deadline', date: dayStr(p.bidDeadline) });
    });
    complements.forEach((c) => events.push({ title: c.procedure?.title || '', reference: c.procedure?.referenceNumber || null, tab: 'tenders', kind: 'complement_deadline', date: dayStr(c.deadline) }));
    contracts
      .filter((c) => c.status === 'active')
      .forEach((c) => events.push({ title: c.title, reference: c.contractNumber, tab: 'contracts', kind: 'contract_end', date: dayStr(c.endDate) }));

    res.json({
      counts: {
        openTenders: openTenders.length,
        invited: openTenders.filter((p) => invitedSet.has(p.id)).length,
        bidsDraft: openTenders.filter((p) => bidStatus[p.id] === 'draft').length,
        bidsSubmitted: procedures.filter((p) => bidStatus[p.id] === 'submitted' && [...OPEN, 'evaluation'].includes(p.status)).length,
        contractsActive: contracts.filter((c) => c.status === 'active').length
      },
      todo: todo.slice(0, 8).map(({ priority, ...rest }) => rest),
      todoTotal: todo.length,
      tenders: openTenders.slice(0, 6).map((p) => ({
        id: p.id,
        title: p.title,
        reference: p.referenceNumber,
        buyer: p.procuringEntity?.entityName || null,
        bidDeadline: dayStr(p.bidDeadline),
        invited: invitedSet.has(p.id),
        bid: bidStatus[p.id] || 'none',
        espd: espdDone.has(p.id)
      })),
      contracts: contracts
        .filter((c) => c.status === 'active')
        .slice(0, 4)
        .map((c) => ({
          id: c.id,
          title: c.title,
          reference: c.contractNumber,
          buyer: c.procuringEntity?.entityName || null,
          endDate: dayStr(c.endDate),
          deliveryStatus: c.deliveryStatus
        })),
      deadlines: upcoming(events)
    });
  } catch (error) {
    console.error('Supplier home error:', error);
    res.status(500).json({ message: 'Error loading home' });
  }
};

module.exports = { buyerHome, supplierHome, upcoming, stillSealed };
