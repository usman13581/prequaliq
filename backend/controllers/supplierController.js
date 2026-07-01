const db = require('../models');
const { Op } = require('sequelize');
const { sendSupplierProfileSubmittedToAdminEmail, sendSupplierProfileSubmittedConfirmationEmail } = require('../services/emailService');
const { evaluateSupplierCompleteness } = require('../services/supplierCompleteness');
const {
  notifyRequalificationRequired,
  notifyDocumentExpiring,
  createNotification
} = require('../services/supplierNotificationService');

const PROFILE_INCLUDES = [
  { model: db.User, as: 'user', attributes: { exclude: ['password'] } },
  { model: db.CPVCode, as: 'cpvCodes', through: { attributes: [] } },
  { model: db.Document, as: 'documents' },
  ...(db.NUTSCode ? [{ model: db.NUTSCode, as: 'nutsCodes', through: { attributes: [] }, required: false }] : []),
  ...(db.SupplierReference ? [{ model: db.SupplierReference, as: 'references', required: false }] : []),
  ...(db.SupplierProfileSubmission ? [{
    model: db.SupplierProfileSubmission,
    as: 'profileSubmissions',
    required: false,
    separate: true,
    limit: 5,
    order: [['submittedAt', 'DESC']]
  }] : [])
];

async function loadSupplierForUser(userId) {
  return db.Supplier.findOne({ where: { userId }, include: PROFILE_INCLUDES });
}

async function checkRequalificationStatus(supplier) {
  if (!supplier || supplier.status !== 'approved' || !supplier.qualificationExpiresAt) return supplier;
  const now = new Date();
  const expires = new Date(supplier.qualificationExpiresAt);
  const daysUntil = Math.ceil((expires - now) / (1000 * 60 * 60 * 24));
  if (daysUntil <= 60) {
    if (supplier.status === 'approved') {
      await supplier.update({ status: 'requalification_required' });
      supplier.status = 'requalification_required';
      await notifyRequalificationRequired(supplier, supplier.qualificationExpiresAt);
    }
  }
  return supplier;
}

async function sendSubmissionEmails(supplier, user) {
  const companyName = supplier.companyName || 'Supplier';
  if (user?.email) {
    sendSupplierProfileSubmittedConfirmationEmail(user.email, user.firstName, user.lastName, companyName)
      .catch((err) => console.error('Failed to send profile submitted confirmation to supplier:', err));
  }
  const admins = await db.User.findAll({
    where: { role: 'admin', isActive: true },
    attributes: ['email', 'firstName', 'lastName']
  });
  for (const admin of admins) {
    if (admin.email) {
      const adminName = `${admin.firstName || ''} ${admin.lastName || ''}`.trim() || 'Administrator';
      sendSupplierProfileSubmittedToAdminEmail(admin.email, adminName, companyName, user?.email || '')
        .catch((err) => console.error('Failed to send profile submitted to admin:', err));
    }
  }
}

function buildSupplierUpdateData(body) {
  const fields = [
    'companyName', 'registrationNumber', 'taxId', 'address', 'city', 'country', 'phone', 'website',
    'turnover', 'employeeCount', 'yearEstablished', 'financialStability', 'qualityManagementSystem',
    'environmentalManagementSystem', 'socialResponsibilityManagementSystem', 'ohsManagementSystem',
    'groundsForExclusion', 'laborLawRegulations', 'sanctionsRussiaBelarus',
    'technicalCapacityProfessionalExperience', 'insurerName', 'insurancePolicyNumber',
    'insuranceCoverageAmount', 'insuranceValidTo'
  ];
  const updateData = {};
  for (const field of fields) {
    if (body[field] !== undefined) updateData[field] = body[field];
  }
  return updateData;
}

const getProfile = async (req, res) => {
  try {
    let supplier = await loadSupplierForUser(req.user.id);
    if (!supplier) return res.status(404).json({ message: 'Supplier profile not found' });
    supplier = await checkRequalificationStatus(supplier);
    res.json({ supplier });
  } catch (error) {
    console.error('Get supplier profile error:', error);
    res.status(500).json({ message: 'Error fetching profile', error: error.message });
  }
};

const updateProfile = async (req, res) => {
  try {
    const supplier = await db.Supplier.findOne({
      where: { userId: req.user.id },
      include: [{ model: db.User, as: 'user', attributes: ['email', 'firstName', 'lastName'] }]
    });
    if (!supplier) return res.status(404).json({ message: 'Supplier profile not found' });

    const { status, ...body } = req.body;
    const updateData = buildSupplierUpdateData(body);
    await supplier.update(updateData);

    if (req.body.firstName || req.body.lastName || req.body.phone) {
      await db.User.update(
        {
          ...(req.body.firstName && { firstName: req.body.firstName }),
          ...(req.body.lastName && { lastName: req.body.lastName }),
          ...(req.body.phone && { phone: req.body.phone })
        },
        { where: { id: req.user.id } }
      );
    }

    const updatedSupplier = await loadSupplierForUser(req.user.id);
    res.json({ message: 'Profile saved successfully', supplier: updatedSupplier });
  } catch (error) {
    console.error('Update supplier profile error:', error);
    res.status(500).json({ message: 'Error updating profile', error: error.message });
  }
};

const getCompleteness = async (req, res) => {
  try {
    const supplier = await loadSupplierForUser(req.user.id);
    if (!supplier) return res.status(404).json({ message: 'Supplier profile not found' });
    res.json(evaluateSupplierCompleteness(supplier));
  } catch (error) {
    console.error('Get completeness error:', error);
    res.status(500).json({ message: 'Error evaluating completeness', error: error.message });
  }
};

const getDashboard = async (req, res) => {
  try {
    let supplier = await loadSupplierForUser(req.user.id);
    if (!supplier) return res.status(404).json({ message: 'Supplier profile not found' });
    supplier = await checkRequalificationStatus(supplier);

    const completeness = evaluateSupplierCompleteness(supplier);
    const notifications = db.SupplierNotification
      ? await db.SupplierNotification.findAll({
        where: { supplierId: supplier.id, isRead: false },
        order: [['createdAt', 'DESC']],
        limit: 10
      })
      : [];

    let openQuestionnaires = 0;
    let nearestDeadline = null;
    if (['approved', 'requalification_required'].includes(supplier.status)) {
      const cpvIds = (supplier.cpvCodes || []).map((c) => c.id);
      if (cpvIds.length) {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const questionnaires = await db.Questionnaire.findAll({
          where: { cpvCodeId: { [Op.in]: cpvIds }, isActive: true, deadline: { [Op.gte]: now } },
          include: [{
            model: db.QuestionnaireResponse,
            as: 'responses',
            where: { supplierId: supplier.id, status: 'submitted' },
            required: false
          }],
          order: [['deadline', 'ASC']]
        });
        const open = questionnaires.filter((q) => !q.responses || q.responses.length === 0);
        openQuestionnaires = open.length;
        if (open[0]) nearestDeadline = open[0].deadline;
      }
    }

    let nextAction = { labelKey: 'viewDashboard', tab: 'overview' };
    if (supplier.status === 'rejected') {
      nextAction = { labelKey: 'fixAndResubmit', tab: 'profile' };
    } else if (supplier.status === 'requalification_required') {
      nextAction = { labelKey: 'completeRequalification', tab: 'profile' };
    } else if (!completeness.readyToSubmit && supplier.status !== 'approved') {
      nextAction = { labelKey: 'completeProfile', tab: 'profile' };
    } else if (completeness.readyToSubmit && ['pending', 'rejected'].includes(supplier.status)) {
      nextAction = { labelKey: 'submitForQualification', tab: 'profile' };
    } else if (openQuestionnaires > 0) {
      nextAction = { labelKey: 'respondQuestionnaire', tab: 'questionnaires' };
    } else if (completeness.documents.expiringCount > 0) {
      nextAction = { labelKey: 'reviewDocuments', tab: 'profile' };
    }

    res.json({
      status: supplier.status,
      companyName: supplier.companyName,
      completeness,
      documents: completeness.documents,
      openQuestionnaires,
      nearestDeadline,
      qualification: {
        qualifiedAt: supplier.qualifiedAt,
        qualificationExpiresAt: supplier.qualificationExpiresAt,
        profileSubmittedAt: supplier.profileSubmittedAt,
        profileVersion: supplier.profileVersion,
        rejectionReason: supplier.rejectionReason
      },
      notifications,
      nextAction
    });
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({ message: 'Error fetching dashboard', error: error.message });
  }
};

const submitProfile = async (req, res) => {
  try {
    const supplier = await loadSupplierForUser(req.user.id);
    if (!supplier) return res.status(404).json({ message: 'Supplier profile not found' });

    const completeness = evaluateSupplierCompleteness(supplier);
    if (!completeness.readyToSubmit) {
      return res.status(400).json({
        message: 'Profile is not complete enough to submit',
        completeness
      });
    }

    const nextVersion = (supplier.profileVersion || 0) + 1;
    const now = new Date();
    await supplier.update({
      status: 'pending',
      profileSubmittedAt: now,
      profileVersion: nextVersion,
      rejectionReason: null
    });

    if (db.SupplierProfileSubmission) {
      await db.SupplierProfileSubmission.create({
        supplierId: supplier.id,
        version: nextVersion,
        status: 'pending',
        submittedAt: now
      });
    }

    const user = supplier.user;
    await sendSubmissionEmails(supplier, user);

    const updatedSupplier = await loadSupplierForUser(req.user.id);
    res.json({
      message: 'Profile submitted for qualification review',
      supplier: updatedSupplier,
      completeness: evaluateSupplierCompleteness(updatedSupplier)
    });
  } catch (error) {
    console.error('Submit profile error:', error);
    res.status(500).json({ message: 'Error submitting profile', error: error.message });
  }
};

const getQualification = async (req, res) => {
  try {
    const supplier = await loadSupplierForUser(req.user.id);
    if (!supplier) return res.status(404).json({ message: 'Supplier profile not found' });
    if (!['approved', 'requalification_required'].includes(supplier.status)) {
      return res.status(403).json({ message: 'Qualification certificate is available after approval' });
    }
    res.json({
      companyName: supplier.companyName,
      status: supplier.status,
      qualifiedAt: supplier.qualifiedAt,
      qualificationExpiresAt: supplier.qualificationExpiresAt,
      profileVersion: supplier.profileVersion,
      cpvCodes: supplier.cpvCodes || [],
      nutsCodes: supplier.nutsCodes || []
    });
  } catch (error) {
    console.error('Get qualification error:', error);
    res.status(500).json({ message: 'Error fetching qualification', error: error.message });
  }
};

const updateCPVCodes = async (req, res) => {
  try {
    const { cpvCodeIds } = req.body;
    const supplier = await db.Supplier.findOne({ where: { userId: req.user.id } });
    if (!supplier) return res.status(404).json({ message: 'Supplier profile not found' });
    await supplier.setCpvCodes(cpvCodeIds);
    const updatedSupplier = await loadSupplierForUser(req.user.id);
    res.json({ message: 'CPV codes saved', supplier: updatedSupplier });
  } catch (error) {
    console.error('Update CPV codes error:', error);
    res.status(500).json({ message: 'Error updating CPV codes', error: error.message });
  }
};

const updateNUTSCodes = async (req, res) => {
  try {
    if (!db.NUTSCode) {
      return res.status(503).json({ message: 'NUTS codes feature not available. Please run migrations first.' });
    }
    const { nutsCodeIds } = req.body;
    const supplier = await db.Supplier.findOne({ where: { userId: req.user.id } });
    if (!supplier) return res.status(404).json({ message: 'Supplier profile not found' });
    await supplier.setNutsCodes(nutsCodeIds || []);
    const updatedSupplier = await loadSupplierForUser(req.user.id);
    res.json({ message: 'NUTS codes saved', supplier: updatedSupplier });
  } catch (error) {
    console.error('Update NUTS codes error:', error);
    res.status(500).json({ message: 'Error updating NUTS codes', error: error.message });
  }
};

const getReferences = async (req, res) => {
  try {
    const supplier = await db.Supplier.findOne({ where: { userId: req.user.id } });
    if (!supplier) return res.status(404).json({ message: 'Supplier profile not found' });
    const references = db.SupplierReference
      ? await db.SupplierReference.findAll({ where: { supplierId: supplier.id }, order: [['createdAt', 'DESC']] })
      : [];
    res.json({ references });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching references', error: error.message });
  }
};

const createReference = async (req, res) => {
  try {
    if (!db.SupplierReference) return res.status(503).json({ message: 'References not available' });
    const supplier = await db.Supplier.findOne({ where: { userId: req.user.id } });
    if (!supplier) return res.status(404).json({ message: 'Supplier profile not found' });
    const reference = await db.SupplierReference.create({ ...req.body, supplierId: supplier.id });
    res.status(201).json({ reference });
  } catch (error) {
    res.status(500).json({ message: 'Error creating reference', error: error.message });
  }
};

const updateReference = async (req, res) => {
  try {
    const supplier = await db.Supplier.findOne({ where: { userId: req.user.id } });
    if (!supplier) return res.status(404).json({ message: 'Supplier profile not found' });
    const reference = await db.SupplierReference.findOne({
      where: { id: req.params.referenceId, supplierId: supplier.id }
    });
    if (!reference) return res.status(404).json({ message: 'Reference not found' });
    await reference.update(req.body);
    res.json({ reference });
  } catch (error) {
    res.status(500).json({ message: 'Error updating reference', error: error.message });
  }
};

const deleteReference = async (req, res) => {
  try {
    const supplier = await db.Supplier.findOne({ where: { userId: req.user.id } });
    if (!supplier) return res.status(404).json({ message: 'Supplier profile not found' });
    const reference = await db.SupplierReference.findOne({
      where: { id: req.params.referenceId, supplierId: supplier.id }
    });
    if (!reference) return res.status(404).json({ message: 'Reference not found' });
    await reference.destroy();
    res.json({ message: 'Reference deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting reference', error: error.message });
  }
};

const getNotifications = async (req, res) => {
  try {
    const supplier = await db.Supplier.findOne({ where: { userId: req.user.id } });
    if (!supplier) return res.status(404).json({ message: 'Supplier profile not found' });
    const notifications = db.SupplierNotification
      ? await db.SupplierNotification.findAll({
        where: { supplierId: supplier.id },
        order: [['createdAt', 'DESC']],
        limit: 50
      })
      : [];
    res.json({ notifications });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching notifications', error: error.message });
  }
};

const markNotificationRead = async (req, res) => {
  try {
    const supplier = await db.Supplier.findOne({ where: { userId: req.user.id } });
    if (!supplier) return res.status(404).json({ message: 'Supplier profile not found' });
    const notification = await db.SupplierNotification.findOne({
      where: { id: req.params.notificationId, supplierId: supplier.id }
    });
    if (!notification) return res.status(404).json({ message: 'Notification not found' });
    await notification.update({ isRead: true });
    res.json({ notification });
  } catch (error) {
    res.status(500).json({ message: 'Error updating notification', error: error.message });
  }
};

const markAllNotificationsRead = async (req, res) => {
  try {
    const supplier = await db.Supplier.findOne({ where: { userId: req.user.id } });
    if (!supplier) return res.status(404).json({ message: 'Supplier profile not found' });
    if (db.SupplierNotification) {
      await db.SupplierNotification.update(
        { isRead: true },
        { where: { supplierId: supplier.id, isRead: false } }
      );
    }
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ message: 'Error updating notifications', error: error.message });
  }
};

const getActiveQuestionnaires = async (req, res) => {
  try {
    const supplier = await db.Supplier.findOne({ where: { userId: req.user.id } });
    if (!supplier || !['approved', 'requalification_required'].includes(supplier.status)) {
      return res.status(403).json({ message: 'Supplier not approved' });
    }

    const supplierCPVs = await db.SupplierCPV.findAll({ where: { supplierId: supplier.id } });
    const cpvIds = supplierCPVs.map((sc) => sc.cpvCodeId);
    if (cpvIds.length === 0) return res.json({ questionnaires: [] });

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const questionnaires = await db.Questionnaire.findAll({
      where: { cpvCodeId: { [Op.in]: cpvIds }, isActive: true, deadline: { [Op.gte]: now } },
      include: [
        {
          model: db.ProcuringEntity,
          as: 'procuringEntity',
          include: [{ model: db.User, as: 'user', attributes: ['firstName', 'lastName'] }]
        },
        { model: db.CPVCode, as: 'cpvCode' },
        {
          model: db.Question,
          as: 'questions',
          include: [{ model: db.Document, as: 'attachedDocument', required: false }]
        },
        {
          model: db.QuestionnaireResponse,
          as: 'responses',
          where: { supplierId: supplier.id },
          required: false
        }
      ],
      order: [['deadline', 'ASC'], [{ model: db.Question, as: 'questions' }, 'order', 'ASC']]
    });

    res.json({ questionnaires });
  } catch (error) {
    console.error('Get active questionnaires error:', error);
    res.status(500).json({ message: 'Error fetching questionnaires', error: error.message });
  }
};

const getQuestionnaireHistory = async (req, res) => {
  try {
    const supplier = await db.Supplier.findOne({ where: { userId: req.user.id } });
    if (!supplier) return res.status(404).json({ message: 'Supplier not found' });

    const responses = await db.QuestionnaireResponse.findAll({
      where: { supplierId: supplier.id, status: 'submitted' },
      include: [
        {
          model: db.Questionnaire,
          as: 'questionnaire',
          include: [
            { model: db.ProcuringEntity, as: 'procuringEntity' },
            { model: db.CPVCode, as: 'cpvCode' },
            { model: db.Question, as: 'questions' }
          ]
        },
        {
          model: db.Answer,
          as: 'answers',
          include: [
            { model: db.Question, as: 'question' },
            { model: db.Document, as: 'document', required: false }
          ]
        }
      ],
      order: [
        ['submittedAt', 'DESC'],
        [{ model: db.Questionnaire, as: 'questionnaire' }, { model: db.Question, as: 'questions' }, 'order', 'ASC']
      ]
    });

    res.json({ responses });
  } catch (error) {
    console.error('Get questionnaire history error:', error);
    res.status(500).json({ message: 'Error fetching history', error: error.message });
  }
};

const exportProfile = async (req, res) => {
  try {
    const supplier = await loadSupplierForUser(req.user.id);
    if (!supplier) return res.status(404).json({ message: 'Supplier profile not found' });
    const completeness = evaluateSupplierCompleteness(supplier);
    res.json({
      exportedAt: new Date().toISOString(),
      supplier: supplier.toJSON(),
      completeness
    });
  } catch (error) {
    res.status(500).json({ message: 'Error exporting profile', error: error.message });
  }
};

const getProfileSubmissions = async (req, res) => {
  try {
    const supplier = await db.Supplier.findOne({ where: { userId: req.user.id } });
    if (!supplier) return res.status(404).json({ message: 'Supplier profile not found' });
    const submissions = db.SupplierProfileSubmission
      ? await db.SupplierProfileSubmission.findAll({
        where: { supplierId: supplier.id },
        order: [['submittedAt', 'DESC']],
        limit: 20
      })
      : [];
    res.json({ submissions });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching submission history', error: error.message });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  getCompleteness,
  getDashboard,
  submitProfile,
  getQualification,
  updateCPVCodes,
  updateNUTSCodes,
  getReferences,
  createReference,
  updateReference,
  deleteReference,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getActiveQuestionnaires,
  getQuestionnaireHistory,
  exportProfile,
  getProfileSubmissions
};
