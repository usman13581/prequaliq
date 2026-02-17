const db = require('../models');
const { Op } = require('sequelize');
const { sendNewQuestionnaireEmail } = require('../services/emailService');

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
          order: q.order !== undefined ? q.order : index
        });
      });

      await Promise.all(questionPromises);
    }

    const createdQuestionnaire = await db.Questionnaire.findByPk(questionnaire.id, {
      include: [
        {
          model: db.Question,
          as: 'questions',
          order: [['order', 'ASC']]
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
      ]
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

    const questionnaires = await db.Questionnaire.findAll({
      where: { procuringEntityId: procuringEntity.id },
      include: [
        {
          model: db.Question,
          as: 'questions',
          order: [['order', 'ASC']]
        },
        {
          model: db.CPVCode,
          as: 'cpvCode'
        },
        {
          model: db.QuestionnaireResponse,
          as: 'responses',
          where: { status: 'submitted' }, // Only show submitted responses to procuring entity
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
      order: [['createdAt', 'DESC']]
    });

    res.json({ questionnaires });
  } catch (error) {
    console.error('Get questionnaires error:', error);
    res.status(500).json({ message: 'Error fetching questionnaires', error: error.message });
  }
};

// Get questionnaire responses
const getQuestionnaireResponses = async (req, res) => {
  try {
    const { questionnaireId } = req.params;

    const procuringEntity = await db.ProcuringEntity.findOne({
      where: { userId: req.user.id }
    });

    const questionnaire = await db.Questionnaire.findOne({
      where: { 
        id: questionnaireId,
        procuringEntityId: procuringEntity.id 
      }
    });

    if (!questionnaire) {
      return res.status(404).json({ message: 'Questionnaire not found' });
    }

    const responses = await db.QuestionnaireResponse.findAll({
      where: {
        questionnaireId,
        status: 'submitted'
      },
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
        }
      ],
      order: [['submittedAt', 'DESC']]
    });

    res.json({ responses });
  } catch (error) {
    console.error('Get questionnaire responses error:', error);
    res.status(500).json({ message: 'Error fetching responses', error: error.message });
  }
};

// Submit questionnaire response (Supplier)
const submitResponse = async (req, res) => {
  try {
    const { questionnaireId } = req.params;
    const { answers, status } = req.body; // status: 'draft' or 'submitted'

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

    if (new Date(questionnaire.deadline) < new Date()) {
      return res.status(400).json({ message: 'Questionnaire deadline has passed' });
    }

    // Check if supplier has the CPV code
    const supplierCPV = await db.SupplierCPV.findOne({
      where: {
        supplierId: supplier.id,
        cpvCodeId: questionnaire.cpvCodeId
      }
    });

    if (!supplierCPV) {
      return res.status(403).json({ message: 'This questionnaire is not available for your CPV categories' });
    }

    // Find or create response
    console.log('=== SUBMIT RESPONSE DEBUG ===');
    console.log('Questionnaire ID:', questionnaireId);
    console.log('Supplier ID:', supplier.id);
    console.log('Status:', status);
    console.log('Answers count:', answers?.length || 0);
    
    let response = await db.QuestionnaireResponse.findOne({
      where: {
        questionnaireId,
        supplierId: supplier.id
      }
    });

    if (!response) {
      console.log('Creating new response');
      response = await db.QuestionnaireResponse.create({
        questionnaireId,
        supplierId: supplier.id,
        status: status || 'draft'
      });
      console.log('Created response ID:', response.id);
    } else {
      console.log('Updating existing response ID:', response.id);
      await response.update({ status: status || 'draft' });
    }

    if (status === 'submitted') {
      await response.update({
        submittedAt: new Date()
      });
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
const getResponse = async (req, res) => {
  try {
    const { questionnaireId } = req.params;
    console.log('=== GET RESPONSE DEBUG ===');
    console.log('Questionnaire ID:', questionnaireId);
    console.log('User ID:', req.user.id);

    const supplier = await db.Supplier.findOne({ where: { userId: req.user.id } });
    if (!supplier) {
      console.log('Supplier not found for user:', req.user.id);
      return res.status(404).json({ message: 'Supplier not found' });
    }
    console.log('Supplier ID:', supplier.id);

    // Find response - no expiration check; suppliers can always view their submitted responses
    const response = await db.QuestionnaireResponse.findOne({
      where: {
        questionnaireId,
        supplierId: supplier.id
      },
      include: [
        {
          model: db.Questionnaire,
          as: 'questionnaire',
          include: [
            {
              model: db.Question,
              as: 'questions',
              order: [['order', 'ASC']]
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
      ]
    });

    if (!response) {
      console.log('Response not found for questionnaire:', questionnaireId, 'supplier:', supplier.id);
      // Check if ANY response exists for this questionnaire
      const anyResponse = await db.QuestionnaireResponse.findOne({
        where: { questionnaireId }
      });
      console.log('Any response for this questionnaire?', !!anyResponse);
      if (anyResponse) {
        console.log('Found response but wrong supplier:', anyResponse.supplierId, 'vs', supplier.id);
      }
      return res.status(404).json({ message: 'Response not found' });
    }

    console.log('Response found! ID:', response.id, 'Status:', response.status);
    console.log('Answers count:', response.answers?.length || 0);
    if (response.answers && response.answers.length > 0) {
      console.log('Answers:', response.answers.map(a => ({
        questionId: a.questionId,
        answerText: a.answerText,
        answerValue: a.answerValue
      })));
    }
    res.json({ response });
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
          order: q.order !== undefined ? q.order : index
        });
      });

      await Promise.all(questionPromises);
    }

    const updatedQuestionnaire = await db.Questionnaire.findByPk(questionnaire.id, {
      include: [
        {
          model: db.Question,
          as: 'questions',
          order: [['order', 'ASC']]
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
      ]
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
