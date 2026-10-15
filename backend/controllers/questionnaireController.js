const db = require('../models');
const { Op } = require('sequelize');
const { sendNewQuestionnaireEmail } = require('../services/emailService');

const PROCEDURE_USES_QUESTIONNAIRE_STATUSES = [
  'published',
  'qa_open',
  'bidding',
  'evaluation',
  'awarded',
  'standstill',
  'closed'
];

function isProcedureSealedForLock(procedure, now = new Date()) {
  if (!procedure?.isSealed) return false;
  const until = procedure.sealedUntil ? new Date(procedure.sealedUntil) : null;
  return !until || until > now;
}

async function getQuestionnaireEditLock(questionnaireId, procuringEntityId) {
  if (!db.Procedure) return null;
  const linked = await db.Procedure.findAll({
    where: { questionnaireId, procuringEntityId },
    attributes: ['id', 'isSealed', 'sealedUntil', 'title']
  });
  const now = new Date();
  for (const p of linked) {
    if (isProcedureSealedForLock(p, now)) {
      return {
        message:
          'This questionnaire is locked while a linked procedure has sealed bids. Unseal the procedure to edit.',
        procedureId: p.id,
        sealedUntil: p.sealedUntil
      };
    }
  }
  return null;
}

async function attachQuestionnaireEditLockedFlags(questionnaires, procuringEntityId) {
  if (!db.Procedure || !questionnaires?.length) {
    return questionnaires.map((q) => {
      const plain = q.toJSON ? q.toJSON() : { ...q };
      return { ...plain, editLocked: false };
    });
  }
  const ids = questionnaires.map((q) => q.id);
  const linked = await db.Procedure.findAll({
    where: { questionnaireId: { [Op.in]: ids }, procuringEntityId },
    attributes: ['questionnaireId', 'isSealed', 'sealedUntil']
  });
  const now = new Date();
  const lockedIds = new Set();
  for (const p of linked) {
    if (isProcedureSealedForLock(p, now)) lockedIds.add(p.questionnaireId);
  }
  return questionnaires.map((q) => {
    const plain = q.toJSON ? q.toJSON() : { ...q };
    return { ...plain, editLocked: lockedIds.has(q.id) };
  });
}

/**
 * Helper function to send email notifications to suppliers matching the questionnaire's CPV code
 */
const sendQuestionnaireNotifications = async (questionnaire, procuringEntity) => {
  try {
    console.log('[Questionnaire Notifications] Starting notification process');
    console.log('[Questionnaire Notifications] Questionnaire ID:', questionnaire?.id);
    console.log('[Questionnaire Notifications] CPV Code ID:', questionnaire?.cpvCodeId);
    
    if (!questionnaire || !questionnaire.cpvCodeId) {
      console.log('[Questionnaire Notifications] Skipping - no CPV code');
      return;
    }

    // Find all suppliers with matching CPV code who are approved
    console.log(`[Questionnaire Notifications] Searching for suppliers with CPV code ID: ${questionnaire.cpvCodeId}`);
    
    // First, let's check if there are any suppliers at all
    const allSuppliersCount = await db.Supplier.count();
    const approvedSuppliersCount = await db.Supplier.count({ where: { status: 'approved' } });
    console.log(`[Questionnaire Notifications] Total suppliers: ${allSuppliersCount}, Approved: ${approvedSuppliersCount}`);
    
    // Check if CPV code exists
    const cpvCodeExists = await db.CPVCode.findByPk(questionnaire.cpvCodeId);
    if (!cpvCodeExists) {
      console.error(`[Questionnaire Notifications] CPV code ${questionnaire.cpvCodeId} does not exist in database!`);
      return;
    }
    console.log(`[Questionnaire Notifications] CPV code exists: ${cpvCodeExists.code} - ${cpvCodeExists.description}`);
    
    // Check how many suppliers have this CPV code (without status filter)
    const suppliersWithCpv = await db.Supplier.findAll({
      include: [
        {
          model: db.CPVCode,
          as: 'cpvCodes',
          where: {
            id: questionnaire.cpvCodeId
          },
          required: true
        }
      ]
    });
    console.log(`[Questionnaire Notifications] Suppliers with this CPV code (any status): ${suppliersWithCpv.length}`);
    if (suppliersWithCpv.length > 0) {
      suppliersWithCpv.forEach((s, idx) => {
        console.log(`[Questionnaire Notifications]   Supplier ${idx + 1}: ID=${s.id}, Status=${s.status}, UserID=${s.userId}`);
      });
    }
    
    const suppliers = await db.Supplier.findAll({
      where: {
        status: 'approved' // Only send to approved suppliers
      },
      include: [
        {
          model: db.User,
          as: 'user',
          where: {
            isActive: true // Only active users
          },
          required: true
        },
        {
          model: db.CPVCode,
          as: 'cpvCodes',
          where: {
            id: questionnaire.cpvCodeId
          },
          required: true
        }
      ]
    });

    console.log(`[Questionnaire Notifications] Found ${suppliers?.length || 0} matching supplier(s) (approved + active + CPV match)`);
    
    if (!suppliers || suppliers.length === 0) {
      console.log(`[Questionnaire Notifications] ⚠ No matching suppliers found for CPV code: ${questionnaire.cpvCodeId}`);
      console.log(`[Questionnaire Notifications] Requirements: status='approved', user.isActive=true, has CPV code ${questionnaire.cpvCodeId}`);
      console.log(`[Questionnaire Notifications] Check above logs to see what suppliers exist and their status`);
      return;
    }

    console.log(`[Questionnaire Notifications] Found ${suppliers.length} matching supplier(s) for questionnaire: ${questionnaire.title}`);

    // Get CPV code details
    const cpvCode = questionnaire.cpvCode || await db.CPVCode.findByPk(questionnaire.cpvCodeId);
    const cpvCodeDisplay = cpvCode ? `${cpvCode.code} - ${cpvCode.description}` : 'N/A';

    // Get entity name
    const entityName = procuringEntity?.entityName || procuringEntity?.user?.firstName + ' ' + procuringEntity?.user?.lastName || 'Procuring Entity';

    // Send emails to all matching suppliers
    const emailPromises = suppliers.map(async (supplier) => {
      const user = supplier.user;
      if (!user || !user.email) {
        console.log(`[Questionnaire Notifications] Skipping supplier ${supplier.id} - no email`);
        return;
      }

      try {
        console.log(`[Questionnaire Notifications] Attempting to send email to: ${user.email} (${user.firstName} ${user.lastName})`);
        const emailResult = await sendNewQuestionnaireEmail(
          user.email,
          user.firstName,
          user.lastName,
          questionnaire.title,
          questionnaire.description,
          questionnaire.deadline,
          cpvCodeDisplay,
          entityName,
          questionnaire.id
        );
        if (emailResult.success) {
          console.log(`[Questionnaire Notifications] ✓ Email sent successfully to: ${user.email} (Method: ${emailResult.method})`);
        } else if (emailResult.skipped) {
          console.log(`[Questionnaire Notifications] ⚠ Email skipped for ${user.email}: ${emailResult.reason}`);
        } else {
          console.error(`[Questionnaire Notifications] ✗ Email failed for ${user.email}:`, emailResult.error);
        }
      } catch (error) {
        console.error(`[Questionnaire Notifications] ✗ Exception sending email to ${user.email}:`, error.message);
        console.error(`[Questionnaire Notifications] Full error:`, error);
      }
    });

    await Promise.allSettled(emailPromises);
    console.log(`[Questionnaire Notifications] Completed sending notifications for questionnaire: ${questionnaire.title}`);
  } catch (error) {
    console.error('[Questionnaire Notifications] Error in sendQuestionnaireNotifications:', error);
    // Don't throw - we don't want to break the questionnaire creation/update
  }
};

// Create questionnaire (Procuring Entity)
const createQuestionnaire = async (req, res) => {
  try {
    const procuringEntity = await db.ProcuringEntity.findOne({
      where: { userId: req.user.id }
    });

    if (!procuringEntity) {
      return res.status(404).json({ message: 'Procuring entity not found' });
    }

    if (procuringEntity.status && procuringEntity.status !== 'approved') {
      return res.status(403).json({
        message: 'Your procuring entity account must be approved by an admin before creating questionnaires.'
      });
    }

    try {
      const { getEntitlementsForUser } = require('../services/entitlementService');
      const entitlements = await getEntitlementsForUser(req.user.id);
      if (entitlements['tender.requirements'] === false) {
        return res.status(403).json({ message: 'Feature not enabled for this account: tender.requirements' });
      }
    } catch (_entErr) {
      // If entitlements table missing during deploy race, allow create
    }

    const { title, description, deadline, cpvCodeId, questions } = req.body;

    const questionnaire = await db.Questionnaire.create({
      procuringEntityId: procuringEntity.id,
      cpvCodeId,
      title,
      description,
      deadline,
      createdBy: req.user.id
    });

    // Create questions
    if (questions && questions.length > 0) {
      const questionPromises = questions.map((q, index) => {
        const questionType = q.questionType || 'text';
        const needsOptions = ['radio', 'checkbox', 'dropdown', 'multiple_choice'].includes(questionType);
        let options = null;
        if (needsOptions) {
          options = Array.isArray(q.options)
            ? q.options.map((o) => (o != null ? String(o) : ''))
            : [];
        }
        return db.Question.create({
          questionnaireId: questionnaire.id,
          questionText: q.questionText != null ? String(q.questionText) : '',
          questionType,
          options,
          isRequired: q.isRequired !== undefined ? q.isRequired : true,
          requiresDocument: q.requiresDocument || false,
          documentType: q.documentType || null,
          attachedDocumentId: q.attachedDocumentId || null,
          order: q.order !== undefined ? q.order : index
        });
      });

      await Promise.all(questionPromises);
    }

    const createdQuestionnaire = await db.Questionnaire.findByPk(questionnaire.id, {
      include: [
        {
          model: db.Question,
          as: 'questions'
        },
        {
          model: db.CPVCode,
          as: 'cpvCode'
        },
        {
          model: db.ProcuringEntity,
          as: 'procuringEntity',
          include: [{
            model: db.User,
            as: 'user'
          }]
        }
      ],
      // Ensure associated questions are always ordered consistently
      order: [[{ model: db.Question, as: 'questions' }, 'order', 'ASC']]
    });

    console.log(`[Questionnaire Create] Questionnaire created successfully: ${createdQuestionnaire.title}`);
    console.log(`[Questionnaire Create] CPV Code ID: ${createdQuestionnaire.cpvCodeId}`);
    console.log(`[Questionnaire Create] Procuring Entity: ${procuringEntity?.entityName || 'N/A'}`);
    console.log(`[Questionnaire Create] Calling sendQuestionnaireNotifications...`);

    // Send email notifications to matching suppliers (async, don't block response)
    sendQuestionnaireNotifications(createdQuestionnaire, createdQuestionnaire.procuringEntity || procuringEntity).catch(err => {
      console.error('[Questionnaire Create] Error sending questionnaire notifications:', err);
      console.error('[Questionnaire Create] Error stack:', err.stack);
    });

    res.status(201).json({
      message: 'Questionnaire created successfully',
      questionnaire: createdQuestionnaire
    });
  } catch (error) {
    console.error('Create questionnaire error:', error);
    const msg = error.message || '';
    if (msg.includes('enum_questions_questionType') || msg.includes('invalid input value for enum')) {
      return res.status(400).json({
        message: 'Question type not supported by database. Run: npx sequelize-cli db:migrate',
        error: error.message
      });
    }
    res.status(500).json({ message: 'Error creating questionnaire', error: error.message });
  }
};

// Get questionnaires (Procuring Entity)
const getQuestionnaires = async (req, res) => {
  try {
    const procuringEntity = await db.ProcuringEntity.findOne({
      where: { userId: req.user.id }
    });

    if (!procuringEntity) {
      return res.status(404).json({ message: 'Procuring entity not found' });
    }

    let questionnaires;
    try {
      questionnaires = await db.Questionnaire.findAll({
        where: { procuringEntityId: procuringEntity.id },
        include: [
          {
            model: db.Question,
            as: 'questions',
            include: [{ model: db.Document, as: 'attachedDocument', required: false, attributes: ['id', 'fileName', 'filePath'] }]
          },
          {
            model: db.CPVCode,
            as: 'cpvCode'
          },
          {
            model: db.QuestionnaireResponse,
            as: 'responses',
            where: { status: 'submitted' },
            required: false,
            include: [
              {
                model: db.Supplier,
                as: 'supplier',
                include: [
                  {
                    model: db.User,
                    as: 'user',
                    attributes: ['firstName', 'lastName', 'email']
                  }
                ]
              }
            ]
          }
        ],
        order: [
          ['createdAt', 'DESC'],
          [{ model: db.Question, as: 'questions' }, 'order', 'ASC']
        ]
      });
    } catch (includeErr) {
      console.warn('Get questionnaires with attachedDocument failed, retrying without:', includeErr.message);
      questionnaires = await db.Questionnaire.findAll({
        where: { procuringEntityId: procuringEntity.id },
        include: [
          { model: db.Question, as: 'questions' },
          { model: db.CPVCode, as: 'cpvCode' },
          {
            model: db.QuestionnaireResponse,
            as: 'responses',
            where: { status: 'submitted' },
            required: false,
            include: [{ model: db.Supplier, as: 'supplier', include: [{ model: db.User, as: 'user', attributes: ['firstName', 'lastName', 'email'] }] }]
          }
        ],
        order: [
          ['createdAt', 'DESC'],
          [{ model: db.Question, as: 'questions' }, 'order', 'ASC']
        ]
      });
    }

    const withLockFlags = await attachQuestionnaireEditLockedFlags(questionnaires, procuringEntity.id);
    res.json({ questionnaires: withLockFlags });
  } catch (error) {
    console.error('Get questionnaires error:', error);
    res.status(500).json({ message: 'Error fetching questionnaires', error: error.message });
  }
};

function responseScopeWhere(questionnaireId, supplierId, procedureId) {
  const where = { questionnaireId, supplierId };
  if (procedureId) {
    where.procedureId = procedureId;
  } else {
    where.procedureId = null;
  }
  return where;
}

const OPEN_BID_STATUSES = ['published', 'qa_open', 'bidding'];

function computeBidEditability({ procedure, questionnaire, responseStatus }) {
  if (responseStatus === 'submitted') {
    return { editable: false, reason: 'submitted', label: 'submitted' };
  }
  if (procedure) {
    if (!OPEN_BID_STATUSES.includes(procedure.status)) {
      return {
        editable: false,
        reason: 'procedure_closed',
        label: procedure.status,
        procedureStatus: procedure.status,
        bidDeadline: procedure.bidDeadline || null
      };
    }
    if (procedure.bidDeadline && new Date(procedure.bidDeadline) < new Date()) {
      return {
        editable: false,
        reason: 'bid_deadline_passed',
        label: 'bid_deadline_passed',
        procedureStatus: procedure.status,
        bidDeadline: procedure.bidDeadline
      };
    }
    return {
      editable: true,
      reason: null,
      label: 'open',
      procedureStatus: procedure.status,
      bidDeadline: procedure.bidDeadline || null
    };
  }
  if (questionnaire?.deadline && new Date(questionnaire.deadline) < new Date()) {
    return { editable: false, reason: 'questionnaire_deadline_passed', label: 'deadline_passed' };
  }
  if (questionnaire && questionnaire.isActive === false) {
    return { editable: false, reason: 'questionnaire_inactive', label: 'inactive' };
  }
  return { editable: true, reason: null, label: 'open' };
}

async function loadAnswerPrefill(questionnaireId, supplierId, excludeProcedureId) {
  const where = {
    questionnaireId,
    supplierId,
    status: { [Op.in]: ['submitted', 'draft'] }
  };
  if (excludeProcedureId) {
    where[Op.or] = [
      { procedureId: null },
      { procedureId: { [Op.ne]: excludeProcedureId } }
    ];
  }
  const previous = await db.QuestionnaireResponse.findOne({
    where,
    include: [
      {
        model: db.Answer,
        as: 'answers',
        include: [
          { model: db.Question, as: 'question' },
          { model: db.Document, as: 'document', required: false }
        ]
      }
    ],
    order: [['updatedAt', 'DESC']]
  });
  if (!previous?.answers?.length) return null;
  return {
    fromResponseId: previous.id,
    fromProcedureId: previous.procedureId || null,
    status: previous.status,
    submittedAt: previous.submittedAt,
    answers: previous.answers
  };
}

// Get questionnaire responses
const getQuestionnaireResponses = async (req, res) => {
  try {
    const { questionnaireId } = req.params;
    const procedureId = req.query.procedureId || null;

    const procuringEntity = await db.ProcuringEntity.findOne({
      where: { userId: req.user.id }
    });

    if (!procuringEntity) {
      return res.status(404).json({ message: 'Procuring entity not found' });
    }

    const questionnaire = await db.Questionnaire.findOne({
      where: { 
        id: questionnaireId,
        procuringEntityId: procuringEntity.id 
      }
    });

    if (!questionnaire) {
      return res.status(404).json({ message: 'Questionnaire not found' });
    }

    // Sealed-bid lock: hide answer content until linked procedure is unsealed
    if (db.Procedure) {
      const linkedWhere = { questionnaireId, procuringEntityId: procuringEntity.id };
      if (procedureId) linkedWhere.id = procedureId;
      const linked = await db.Procedure.findOne({
        where: linkedWhere,
        order: [['updatedAt', 'DESC']]
      });
      if (linked?.isSealed) {
        const now = new Date();
        const until = linked.sealedUntil ? new Date(linked.sealedUntil) : null;
        if (!until || until > now) {
          const sealedCountWhere = { questionnaireId, status: 'submitted' };
          if (procedureId) sealedCountWhere.procedureId = procedureId;
          const sealedCount = await db.QuestionnaireResponse.count({
            where: sealedCountWhere
          });
          return res.status(403).json({
            message: 'Bids are sealed until the deadline. Unseal the procedure to view answers.',
            sealed: true,
            sealedUntil: linked.sealedUntil,
            submittedCount: sealedCount,
            procedureId: linked.id,
            responses: []
          });
        }
      }
    }

    const responseWhere = {
      questionnaireId,
      status: 'submitted'
    };
    if (procedureId) {
      responseWhere.procedureId = procedureId;
    }

    const responses = await db.QuestionnaireResponse.findAll({
      where: responseWhere,
      include: [
        {
          model: db.Supplier,
          as: 'supplier',
          include: [
            {
              model: db.User,
              as: 'user',
              attributes: ['firstName', 'lastName', 'email']
            }
          ]
        },
        {
          model: db.Answer,
          as: 'answers',
          include: [
            {
              model: db.Question,
              as: 'question'
            },
            {
              model: db.Document,
              as: 'document'
            }
          ]
        },
        db.Procedure
          ? {
              model: db.Procedure,
              as: 'procedure',
              attributes: ['id', 'title', 'referenceNumber', 'status'],
              required: false
            }
          : null
      ].filter(Boolean),
      order: [['submittedAt', 'DESC']]
    });

    res.json({ responses, sealed: false });
  } catch (error) {
    console.error('Get questionnaire responses error:', error);
    res.status(500).json({ message: 'Error fetching responses', error: error.message });
  }
};

// Submit questionnaire response (Supplier)
const submitResponse = async (req, res) => {
  try {
    const { questionnaireId } = req.params;
    const { answers, status, procedureId: bodyProcedureId } = req.body; // status: 'draft' or 'submitted'
    const procedureId = bodyProcedureId || req.query.procedureId || null;

    const supplier = await db.Supplier.findOne({ where: { userId: req.user.id } });
    if (!supplier || supplier.status !== 'approved') {
      return res.status(403).json({ message: 'Supplier not approved' });
    }

    // Check if questionnaire exists and matches supplier's CPV codes
    const questionnaire = await db.Questionnaire.findByPk(questionnaireId, {
      include: [{ model: db.CPVCode, as: 'cpvCode' }]
    });

    if (!questionnaire || !questionnaire.isActive) {
      return res.status(404).json({ message: 'Questionnaire not found or inactive' });
    }

    let procedure = null;
    if (procedureId) {
      try {
        const { getEntitlementsForUser } = require('../services/entitlementService');
        const ents = await getEntitlementsForUser(req.user.id);
        if (ents['tender.bid_submit'] === false) {
          return res.status(403).json({ message: 'Feature not enabled: tender.bid_submit' });
        }
      } catch (_e) {
        /* ignore if entitlements unavailable */
      }
      procedure = await db.Procedure.findByPk(procedureId);
      if (!procedure || procedure.questionnaireId !== questionnaireId) {
        return res.status(400).json({ message: 'Procedure is not linked to this questionnaire' });
      }
      const openStatuses = ['published', 'qa_open', 'bidding'];
      if (!openStatuses.includes(procedure.status)) {
        return res.status(400).json({
          message: 'This procedure is no longer open for bid answers'
        });
      }
      if (procedure.bidDeadline && new Date(procedure.bidDeadline) < new Date()) {
        return res.status(400).json({ message: 'Bid deadline has passed for this procedure' });
      }
    } else if (new Date(questionnaire.deadline) < new Date()) {
      return res.status(400).json({ message: 'Questionnaire deadline has passed' });
    }

    // Allow if supplier has matching CPV, or questionnaire is underlag on an open procedure
    const supplierCPV = await db.SupplierCPV.findOne({
      where: {
        supplierId: supplier.id,
        cpvCodeId: questionnaire.cpvCodeId
      }
    });
    if (!supplierCPV) {
      const openStatuses = ['published', 'qa_open', 'bidding', 'evaluation', 'awarded', 'standstill', 'closed'];
      const linkedProcedure = await db.Procedure.findOne({
        where: {
          ...(procedureId ? { id: procedureId } : {}),
          questionnaireId,
          status: { [Op.in]: openStatuses }
        },
        attributes: ['id']
      });
      if (!linkedProcedure) {
        return res.status(403).json({ message: 'This questionnaire is not available for your CPV categories' });
      }
    }

    // Find or create response (scoped to procedure when bidding on a tender)
    console.log('=== SUBMIT RESPONSE DEBUG ===');
    console.log('Questionnaire ID:', questionnaireId);
    console.log('Supplier ID:', supplier.id);
    console.log('Procedure ID:', procedureId || '(general)');
    console.log('Status:', status);
    console.log('Answers count:', answers?.length || 0);
    
    let response = await db.QuestionnaireResponse.findOne({
      where: responseScopeWhere(questionnaireId, supplier.id, procedureId)
    });

    if (response && response.isActive === false) {
      return res.status(400).json({
        message: 'This bid is no longer active for this procedure. The tender may have been unpublished.'
      });
    }

    const previousStatus = response?.status || 'draft';
    if (response?.status === 'submitted') {
      return res.status(400).json({
        message: procedureId
          ? 'This bid is already submitted for this procedure and cannot be edited'
          : 'This questionnaire response is already submitted and cannot be edited'
      });
    }
    if (!response) {
      console.log('Creating new response');
      response = await db.QuestionnaireResponse.create({
        questionnaireId,
        supplierId: supplier.id,
        procedureId: procedureId || null,
        status: 'draft'
      });
      console.log('Created response ID:', response.id);
    }

    // Save/update answers - update existing or create new, but don't create duplicates
    if (answers && answers.length > 0) {
      console.log('Saving/updating answers...');
      for (const answerData of answers) {
        console.log('Processing answer for question:', answerData.questionId, 'text:', answerData.answerText);
        // Find existing answer for this question
        const existingAnswer = await db.Answer.findOne({
          where: {
            responseId: response.id,
            questionId: answerData.questionId
          }
        });

        if (existingAnswer) {
          console.log('Updating existing answer ID:', existingAnswer.id);
          // Update existing answer
          await existingAnswer.update({
            answerText: answerData.answerText,
            answerValue: answerData.answerValue,
            documentId: answerData.documentId
          });
        } else {
          console.log('Creating new answer');
          // Create new answer
          const newAnswer = await db.Answer.create({
            responseId: response.id,
            questionId: answerData.questionId,
            answerText: answerData.answerText,
            answerValue: answerData.answerValue,
            documentId: answerData.documentId
          });
          console.log('Created answer ID:', newAnswer.id);
        }
      }
      console.log('Finished saving answers');
    } else {
      console.log('No answers to save');
    }

    // Bid completeness check before final submit
    if (status === 'submitted') {
      try {
        const { getEntitlementsForUser } = require('../services/entitlementService');
        const ents = await getEntitlementsForUser(req.user.id);
        if (ents['ai.completeness_conflict'] !== false) {
          const questions = await db.Question.findAll({
            where: { questionnaireId },
            attributes: ['id', 'isRequired']
          });
          const requiredIds = questions.filter((q) => q.isRequired).map((q) => q.id);
          const savedAnswers = await db.Answer.findAll({
            where: { responseId: response.id },
            attributes: ['questionId', 'answerText', 'answerValue', 'documentId']
          });
          const answeredMap = new Map(savedAnswers.map((a) => [a.questionId, a]));
          const missingRequired = requiredIds.filter((qid) => {
            const a = answeredMap.get(qid);
            if (!a) return true;
            const text = (a.answerText || a.answerValue || '').toString().trim();
            return !text && !a.documentId;
          });
          if (missingRequired.length > 0) {
            await response.update({ status: previousStatus === 'submitted' ? 'draft' : previousStatus });
            return res.status(400).json({
              message: `Bid incomplete: ${missingRequired.length} required question(s) unanswered`,
              completeness: {
                ready: false,
                missingRequiredCount: missingRequired.length,
                missingRequiredIds: missingRequired
              }
            });
          }
        }
      } catch (checkErr) {
        console.warn('Bid completeness check skipped:', checkErr.message);
      }
      await response.update({ status: 'submitted', submittedAt: new Date() });
    } else {
      await response.update({ status: status || 'draft' });
    }

    const updatedResponse = await db.QuestionnaireResponse.findByPk(response.id, {
      include: [
        {
          model: db.Answer,
          as: 'answers',
          include: [
            {
              model: db.Question,
              as: 'question'
            },
            {
              model: db.Document,
              as: 'document'
            }
          ]
        }
      ]
    });

    res.json({
      message: status === 'submitted' ? 'Response submitted successfully' : 'Response saved as draft',
      response: updatedResponse
    });
  } catch (error) {
    console.error('Submit response error:', error);
    res.status(500).json({ message: 'Error submitting response', error: error.message });
  }
};

// Get questionnaire response (Supplier)
// IMPORTANT: Always returns submitted responses regardless of questionnaire expiration status.
// Suppliers should be able to view their submitted answers forever, even if questionnaire expired.
// When procedureId is provided, returns the bid for that procedure only (editable until submitted).
const getResponse = async (req, res) => {
  try {
    const { questionnaireId } = req.params;
    const procedureId = req.query.procedureId || null;
    console.log('=== GET RESPONSE DEBUG ===');
    console.log('Questionnaire ID:', questionnaireId);
    console.log('Procedure ID:', procedureId || '(general)');
    console.log('User ID:', req.user.id);

    const supplier = await db.Supplier.findOne({ where: { userId: req.user.id } });
    if (!supplier) {
      console.log('Supplier not found for user:', req.user.id);
      return res.status(404).json({ message: 'Supplier not found' });
    }
    console.log('Supplier ID:', supplier.id);

    let procedure = null;
    if (procedureId) {
      procedure = await db.Procedure.findByPk(procedureId, {
        attributes: ['id', 'questionnaireId', 'status', 'bidDeadline', 'title', 'referenceNumber']
      });
      if (!procedure || procedure.questionnaireId !== questionnaireId) {
        return res.status(400).json({ message: 'Procedure is not linked to this questionnaire' });
      }
    }

    // Find response scoped to procedure (or general when no procedureId)
    const response = await db.QuestionnaireResponse.findOne({
      where: responseScopeWhere(questionnaireId, supplier.id, procedureId),
      include: [
        {
          model: db.Questionnaire,
          as: 'questionnaire',
          include: [
            {
              model: db.Question,
              as: 'questions',
              include: [{ model: db.Document, as: 'attachedDocument', required: false }]
            }
          ]
        },
        {
          model: db.Answer,
          as: 'answers',
          include: [
            {
              model: db.Question,
              as: 'question'
            },
            {
              model: db.Document,
              as: 'document',
              required: false
            }
          ]
        }
      ],
      // Ensure nested questionnaire.questions are ordered for the supplier view
      order: [
        [
          { model: db.Questionnaire, as: 'questionnaire' },
          { model: db.Question, as: 'questions' },
          'order',
          'ASC'
        ]
      ]
    });

    if (!response) {
      console.log(
        'No procedure-scoped response yet for questionnaire:',
        questionnaireId,
        'supplier:',
        supplier.id,
        'procedure:',
        procedureId || '(general)'
      );
      // For a new procedure bid, offer previous answers as editable prefill
      if (procedureId) {
        const questionnaire = await db.Questionnaire.findByPk(questionnaireId, {
          attributes: ['id', 'deadline', 'isActive']
        });
        const bidContext = computeBidEditability({
          procedure,
          questionnaire,
          responseStatus: null
        });
        const prefill = bidContext.editable
          ? await loadAnswerPrefill(questionnaireId, supplier.id, procedureId)
          : null;
        return res.json({
          response: null,
          prefill,
          procedureId,
          bidContext
        });
      }
      return res.status(404).json({ message: 'Response not found' });
    }

    const bidContext = computeBidEditability({
      procedure,
      questionnaire: response.questionnaire,
      responseStatus: response.status
    });

    console.log('Response found! ID:', response.id, 'Status:', response.status, 'editable:', bidContext.editable);
    console.log('Answers count:', response.answers?.length || 0);
    res.json({
      response,
      procedureId: response.procedureId || null,
      bidContext
    });
  } catch (error) {
    console.error('Get response error:', error);
    res.status(500).json({ message: 'Error fetching response', error: error.message });
  }
};

// Update questionnaire (Procuring Entity)
const updateQuestionnaire = async (req, res) => {
  try {
    const { questionnaireId } = req.params;
    const { title, description, deadline, cpvCodeId, questions } = req.body;

    const procuringEntity = await db.ProcuringEntity.findOne({
      where: { userId: req.user.id }
    });

    if (!procuringEntity) {
      return res.status(404).json({ message: 'Procuring entity not found' });
    }

    const questionnaire = await db.Questionnaire.findOne({
      where: {
        id: questionnaireId,
        procuringEntityId: procuringEntity.id
      }
    });

    if (!questionnaire) {
      return res.status(404).json({ message: 'Questionnaire not found' });
    }

    const editLock = await getQuestionnaireEditLock(questionnaire.id, procuringEntity.id);
    if (editLock) {
      return res.status(403).json({
        message: editLock.message,
        editLocked: true,
        procedureId: editLock.procedureId,
        sealedUntil: editLock.sealedUntil
      });
    }

    // Store old CPV code ID to check if it changed
    const oldCpvCodeId = questionnaire.cpvCodeId;

    // Update questionnaire basic info
    await questionnaire.update({
      title,
      description,
      deadline,
      cpvCodeId
    });

    // Update questions if provided
    if (questions && Array.isArray(questions)) {
      // Delete existing questions
      await db.Question.destroy({
        where: { questionnaireId: questionnaire.id }
      });

      // Create new questions
      const questionPromises = questions.map((q, index) => {
        const questionType = q.questionType || 'text';
        const needsOptions = ['radio', 'checkbox', 'dropdown', 'multiple_choice'].includes(questionType);
        let options = null;
        if (needsOptions) {
          options = Array.isArray(q.options)
            ? q.options.map((o) => (o != null ? String(o) : ''))
            : [];
        }
        return db.Question.create({
          questionnaireId: questionnaire.id,
          questionText: q.questionText != null ? String(q.questionText) : '',
          questionType,
          options,
          isRequired: q.isRequired !== undefined ? q.isRequired : true,
          requiresDocument: q.requiresDocument || false,
          documentType: q.documentType || null,
          attachedDocumentId: q.attachedDocumentId || null,
          order: q.order !== undefined ? q.order : index
        });
      });

      await Promise.all(questionPromises);
    }

    const updatedQuestionnaire = await db.Questionnaire.findByPk(questionnaire.id, {
      include: [
        {
          model: db.Question,
          as: 'questions'
        },
        {
          model: db.CPVCode,
          as: 'cpvCode'
        },
        {
          model: db.ProcuringEntity,
          as: 'procuringEntity',
          include: [{
            model: db.User,
            as: 'user'
          }]
        }
      ],
      order: [[{ model: db.Question, as: 'questions' }, 'order', 'ASC']]
    });

    // Verify CPV code was updated
    console.log(`[Questionnaire Update] Old CPV Code ID: ${oldCpvCodeId}, New CPV Code ID: ${cpvCodeId}`);
    console.log(`[Questionnaire Update] Updated questionnaire CPV Code ID: ${updatedQuestionnaire.cpvCodeId}`);
    
    // Send email notifications to matching suppliers on every update (async, don't block response)
    // This ensures suppliers are notified even if CPV code changes
    console.log(`[Questionnaire Update] Sending notifications for questionnaire ${questionnaire.id}, CPV Code ID: ${updatedQuestionnaire.cpvCodeId}`);
    sendQuestionnaireNotifications(updatedQuestionnaire, updatedQuestionnaire.procuringEntity || procuringEntity).catch(err => {
      console.error('[Questionnaire Update] Error sending questionnaire notifications:', err);
    });

    res.json({
      message: 'Questionnaire updated successfully',
      questionnaire: updatedQuestionnaire
    });
  } catch (error) {
    console.error('Update questionnaire error:', error);
    const msg = error.message || '';
    if (msg.includes('enum_questions_questionType') || msg.includes('invalid input value for enum')) {
      return res.status(400).json({
        message: 'Question type not supported by database. Run: npx sequelize-cli db:migrate',
        error: error.message
      });
    }
    res.status(500).json({ message: 'Error updating questionnaire', error: error.message });
  }
};

// Delete questionnaire (Procuring Entity)
const deleteQuestionnaire = async (req, res) => {
  try {
    const { questionnaireId } = req.params;

    const procuringEntity = await db.ProcuringEntity.findOne({
      where: { userId: req.user.id }
    });

    if (!procuringEntity) {
      return res.status(404).json({ message: 'Procuring entity not found' });
    }

    const questionnaire = await db.Questionnaire.findOne({
      where: {
        id: questionnaireId,
        procuringEntityId: procuringEntity.id
      }
    });

    if (!questionnaire) {
      return res.status(404).json({ message: 'Questionnaire not found' });
    }

    const editLock = await getQuestionnaireEditLock(questionnaire.id, procuringEntity.id);
    if (editLock) {
      return res.status(403).json({
        message: editLock.message,
        editLocked: true,
        procedureId: editLock.procedureId,
        sealedUntil: editLock.sealedUntil
      });
    }

    // Check if there are any submitted responses
    const submittedResponses = await db.QuestionnaireResponse.count({
      where: {
        questionnaireId: questionnaire.id,
        status: 'submitted'
      }
    });

    if (submittedResponses > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete questionnaire with submitted responses. You can deactivate it instead.' 
      });
    }

    // Delete questions first (cascade should handle this, but being explicit)
    await db.Question.destroy({
      where: { questionnaireId: questionnaire.id }
    });

    // Delete draft responses
    await db.QuestionnaireResponse.destroy({
      where: { questionnaireId: questionnaire.id }
    });

    // Delete questionnaire
    await questionnaire.destroy();

    res.json({ message: 'Questionnaire deleted successfully' });
  } catch (error) {
    console.error('Delete questionnaire error:', error);
    res.status(500).json({ message: 'Error deleting questionnaire', error: error.message });
  }
};

// Update question (Procuring Entity)
const updateQuestion = async (req, res) => {
  try {
    const { questionnaireId, questionId } = req.params;
    const { questionText, questionType, options, isRequired, requiresDocument, documentType, order } = req.body;

    const procuringEntity = await db.ProcuringEntity.findOne({
      where: { userId: req.user.id }
    });

    if (!procuringEntity) {
      return res.status(404).json({ message: 'Procuring entity not found' });
    }

    const questionnaire = await db.Questionnaire.findOne({
      where: {
        id: questionnaireId,
        procuringEntityId: procuringEntity.id
      }
    });

    if (!questionnaire) {
      return res.status(404).json({ message: 'Questionnaire not found' });
    }

    const editLock = await getQuestionnaireEditLock(questionnaire.id, procuringEntity.id);
    if (editLock) {
      return res.status(403).json({
        message: editLock.message,
        editLocked: true,
        procedureId: editLock.procedureId,
        sealedUntil: editLock.sealedUntil
      });
    }

    const question = await db.Question.findOne({
      where: {
        id: questionId,
        questionnaireId: questionnaire.id
      }
    });

    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    await question.update({
      questionText,
      questionType,
      options,
      isRequired,
      requiresDocument,
      documentType,
      order
    });

    res.json({
      message: 'Question updated successfully',
      question
    });
  } catch (error) {
    console.error('Update question error:', error);
    res.status(500).json({ message: 'Error updating question', error: error.message });
  }
};

// Delete question (Procuring Entity)
const deleteQuestion = async (req, res) => {
  try {
    const { questionnaireId, questionId } = req.params;

    const procuringEntity = await db.ProcuringEntity.findOne({
      where: { userId: req.user.id }
    });

    if (!procuringEntity) {
      return res.status(404).json({ message: 'Procuring entity not found' });
    }

    const questionnaire = await db.Questionnaire.findOne({
      where: {
        id: questionnaireId,
        procuringEntityId: procuringEntity.id
      }
    });

    if (!questionnaire) {
      return res.status(404).json({ message: 'Questionnaire not found' });
    }

    const editLock = await getQuestionnaireEditLock(questionnaire.id, procuringEntity.id);
    if (editLock) {
      return res.status(403).json({
        message: editLock.message,
        editLocked: true,
        procedureId: editLock.procedureId,
        sealedUntil: editLock.sealedUntil
      });
    }

    const question = await db.Question.findOne({
      where: {
        id: questionId,
        questionnaireId: questionnaire.id
      }
    });

    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    // Check if there are any submitted responses with answers for this question
    const responsesWithAnswers = await db.Answer.count({
      include: [{
        model: db.QuestionnaireResponse,
        as: 'response',
        where: {
          questionnaireId: questionnaire.id,
          status: 'submitted'
        }
      }],
      where: { questionId: question.id }
    });

    if (responsesWithAnswers > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete question with submitted answers' 
      });
    }

    await question.destroy();

    res.json({ message: 'Question deleted successfully' });
  } catch (error) {
    console.error('Delete question error:', error);
    res.status(500).json({ message: 'Error deleting question', error: error.message });
  }
};

// Toggle questionnaire active status
const toggleQuestionnaireStatus = async (req, res) => {
  try {
    const { questionnaireId } = req.params;

    const procuringEntity = await db.ProcuringEntity.findOne({
      where: { userId: req.user.id }
    });

    if (!procuringEntity) {
      return res.status(404).json({ message: 'Procuring entity not found' });
    }

    const questionnaire = await db.Questionnaire.findOne({
      where: {
        id: questionnaireId,
        procuringEntityId: procuringEntity.id
      }
    });

    if (!questionnaire) {
      return res.status(404).json({ message: 'Questionnaire not found' });
    }

    const willDeactivate = questionnaire.isActive;
    if (willDeactivate && db.Procedure) {
      const inUseCount = await db.Procedure.count({
        where: {
          questionnaireId: questionnaire.id,
          procuringEntityId: procuringEntity.id,
          status: { [Op.in]: PROCEDURE_USES_QUESTIONNAIRE_STATUSES }
        }
      });
      if (inUseCount > 0) {
        return res.status(400).json({
          message:
            'Cannot deactivate this questionnaire while it is linked to a published or active procedure. Unpublish or close the procedure first.'
        });
      }
    }

    await questionnaire.update({ isActive: !questionnaire.isActive });

    res.json({
      message: `Questionnaire ${questionnaire.isActive ? 'activated' : 'deactivated'} successfully`,
      questionnaire
    });
  } catch (error) {
    console.error('Toggle questionnaire status error:', error);
    res.status(500).json({ message: 'Error toggling questionnaire status', error: error.message });
  }
};

module.exports = {
  createQuestionnaire,
  getQuestionnaires,
  getQuestionnaireResponses,
  submitResponse,
  getResponse,
  updateQuestionnaire,
  deleteQuestionnaire,
  updateQuestion,
  deleteQuestion,
  toggleQuestionnaireStatus
};
