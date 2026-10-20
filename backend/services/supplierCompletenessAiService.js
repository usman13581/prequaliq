/**
 * Mature profile completeness / conflict check for AI extras.
 * Rules = same engine as the profile CompletenessRail; optional LLM narrative via GPU.
 */
const db = require('../models');
const {
  evaluateSupplierCompleteness,
  getDocumentStatus,
  getActiveDocuments,
} = require('./supplierCompleteness');
const { isAiConfigured, callAi } = require('./aiExtractionService');

const SECTION_MESSAGES = {
  company: 'Company information incomplete',
  q2: 'Financial stability (Q2) incomplete — answer and/or document',
  q5: 'Quality management (Q5) incomplete — answer and/or document',
  q6: 'Environmental management (Q6) incomplete — answer and/or document',
  q7: 'Social responsibility (Q7) incomplete — answer and/or document',
  q8: 'OHS management (Q8) incomplete — answer and/or document',
  q9: 'Exclusion grounds (Q9) not answered',
  q10: 'Labour law declaration (Q10) not answered',
  q11: 'Sanctions declaration (Q11) not answered',
  q12: 'Technical capacity (Q12) not answered',
  cpv: 'No CPV codes selected',
  nuts: 'No NUTS regions selected',
  references: 'No references / technical capacity evidence',
  insurance: 'Insurance details incomplete (insurer and policy number)',
};

const PROFILE_INCLUDES = [
  { model: db.User, as: 'user', attributes: { exclude: ['password'] } },
  { model: db.CPVCode, as: 'cpvCodes', through: { attributes: [] } },
  { model: db.Document, as: 'documents' },
  ...(db.NUTSCode
    ? [{ model: db.NUTSCode, as: 'nutsCodes', through: { attributes: [] }, required: false }]
    : []),
  ...(db.SupplierReference
    ? [{ model: db.SupplierReference, as: 'references', required: false }]
    : []),
];

function severityForMissing(missing = []) {
  if (missing.includes('expired_document')) return 'error';
  if (missing.includes('document') || missing.includes('answer') || missing.includes('cpv') || missing.includes('nuts')) {
    return 'error';
  }
  if (missing.includes('expiring_soon')) return 'warning';
  return 'error';
}

function issuesFromCompleteness(completeness) {
  const issues = [];
  for (const section of completeness.sections || []) {
    if (section.complete) continue;
    const missing = section.missing || [];
    issues.push({
      code: `section_${section.id}`,
      sectionId: section.id,
      severity: severityForMissing(missing),
      message: SECTION_MESSAGES[section.id] || `${section.label || section.id} incomplete`,
      missing,
    });
  }
  if ((completeness.documents?.expiredCount || 0) > 0) {
    issues.push({
      code: 'expired_docs',
      severity: 'error',
      message: `${completeness.documents.expiredCount} uploaded document(s) expired`,
    });
  }
  if ((completeness.documents?.expiringCount || 0) > 0) {
    issues.push({
      code: 'expiring_docs',
      severity: 'warning',
      message: `${completeness.documents.expiringCount} document(s) expiring within 30 days`,
    });
  }
  return issues;
}

function detectRuleConflicts(supplier) {
  const conflicts = [];
  const docs = getActiveDocuments(supplier.documents || []);

  if (supplier.insuranceValidTo) {
    const status = getDocumentStatus({
      validTo: supplier.insuranceValidTo,
      isActive: true,
    });
    if (status === 'expired') {
      conflicts.push({
        code: 'insurance_valid_to_expired',
        severity: 'error',
        message: `Insurance valid-to date has passed (${supplier.insuranceValidTo})`,
      });
    } else if (status === 'expiring_soon') {
      conflicts.push({
        code: 'insurance_valid_to_expiring',
        severity: 'warning',
        message: `Insurance expires soon (${supplier.insuranceValidTo})`,
      });
    }
  }

  const insurerFilled =
    Boolean(String(supplier.insurerName || '').trim()) &&
    Boolean(String(supplier.insurancePolicyNumber || '').trim());
  const hasInsuranceDoc = docs.some((d) =>
    /insurance|försäkr/i.test(String(d.documentType || '') + String(d.fileName || ''))
  );
  if (insurerFilled && !hasInsuranceDoc) {
    conflicts.push({
      code: 'insurance_fields_without_document',
      severity: 'warning',
      message: 'Insurance fields are filled but no insurance PDF is uploaded in Documents',
    });
  }

  const textDocPairs = [
    {
      field: 'qualityManagementSystem',
      type: 'q5-quality',
      label: 'Quality (Q5)',
    },
    {
      field: 'environmentalManagementSystem',
      type: 'q6-environment',
      label: 'Environment (Q6)',
    },
    {
      field: 'financialStability',
      type: 'q2-financial',
      label: 'Financial (Q2)',
    },
  ];
  for (const pair of textDocPairs) {
    const hasText = Boolean(String(supplier[pair.field] || '').trim());
    const doc = docs.find((d) => d.documentType === pair.type);
    if (hasText && !doc) {
      conflicts.push({
        code: `text_without_doc_${pair.type}`,
        severity: 'warning',
        message: `${pair.label} text is filled but the supporting document is missing`,
      });
    }
  }

  return conflicts;
}

function buildProfileSnapshot(supplier) {
  const plain = typeof supplier.toJSON === 'function' ? supplier.toJSON() : supplier;
  return {
    companyName: plain.companyName,
    registrationNumber: plain.registrationNumber,
    taxId: plain.taxId,
    address: plain.address,
    city: plain.city,
    country: plain.country,
    turnover: plain.turnover,
    employeeCount: plain.employeeCount,
    yearEstablished: plain.yearEstablished,
    insurerName: plain.insurerName,
    insurancePolicyNumber: plain.insurancePolicyNumber,
    insuranceCoverageAmount: plain.insuranceCoverageAmount,
    insuranceValidTo: plain.insuranceValidTo,
    financialStability: plain.financialStability,
    qualityManagementSystem: plain.qualityManagementSystem,
    environmentalManagementSystem: plain.environmentalManagementSystem,
    socialResponsibilityManagementSystem: plain.socialResponsibilityManagementSystem,
    ohsManagementSystem: plain.ohsManagementSystem,
    groundsForExclusion: plain.groundsForExclusion,
    laborLawRegulations: plain.laborLawRegulations,
    sanctionsRussiaBelarus: plain.sanctionsRussiaBelarus,
    technicalCapacityProfessionalExperience: plain.technicalCapacityProfessionalExperience,
    cpvCodes: (plain.cpvCodes || []).map((c) => ({ code: c.code, description: c.description })),
    nutsCodes: (plain.nutsCodes || []).map((n) => ({ code: n.code, name: n.name || n.description })),
    referencesCount: (plain.references || []).length,
    documents: (plain.documents || [])
      .filter((d) => d.isActive !== false)
      .map((d) => ({
        fileName: d.fileName,
        documentType: d.documentType,
        validTo: d.validTo,
      })),
  };
}

async function enrichWithAi({ completeness, issues, conflicts, profile, language }) {
  if (!isAiConfigured()) {
    return { summary: null, aiConflicts: [], source: 'rules' };
  }
  try {
    const data = await callAi(
      '/generate/completeness',
      {
        language: (language || 'en').slice(0, 2),
        completeness: {
          percent: completeness.percent,
          readyToSubmit: completeness.readyToSubmit,
          blockers: completeness.blockers,
          documents: completeness.documents,
        },
        issues,
        conflicts,
        supplierProfile: profile,
      },
      90000
    );
    return {
      summary: data.summary || null,
      aiConflicts: Array.isArray(data.conflicts) ? data.conflicts : [],
      nextActions: Array.isArray(data.nextActions) ? data.nextActions : [],
      source: 'ai',
    };
  } catch (err) {
    console.warn('Completeness AI enrich skipped:', err.code || err.message);
    return { summary: null, aiConflicts: [], source: 'rules' };
  }
}

async function runCompletenessAiCheck(userId, options = {}) {
  const supplier = await db.Supplier.findOne({
    where: { userId },
    include: PROFILE_INCLUDES,
  });
  if (!supplier) {
    const err = new Error('Supplier not found');
    err.code = 'SUPPLIER_NOT_FOUND';
    throw err;
  }

  const completeness = evaluateSupplierCompleteness(supplier);
  const issues = issuesFromCompleteness(completeness);
  const ruleConflicts = detectRuleConflicts(supplier);
  const profile = buildProfileSnapshot(supplier);

  const ai = await enrichWithAi({
    completeness,
    issues,
    conflicts: ruleConflicts,
    profile,
    language: options.language,
  });

  const allConflicts = [...ruleConflicts];
  for (const c of ai.aiConflicts || []) {
    if (!c || typeof c !== 'object') continue;
    allConflicts.push({
      code: String(c.code || 'ai_conflict').slice(0, 80),
      severity: c.severity === 'error' ? 'error' : 'warning',
      message: String(c.message || '').slice(0, 400),
    });
  }

  const hasErrors =
    issues.some((i) => i.severity === 'error') ||
    allConflicts.some((c) => c.severity === 'error');

  const ready = Boolean(completeness.readyToSubmit) && !hasErrors;

  let summary = ai.summary;
  if (!summary) {
    if (ready) {
      summary = `Profile is ${completeness.percent}% complete and ready to submit.`;
    } else {
      const top = issues.slice(0, 5).map((i) => i.message);
      summary = `Profile is ${completeness.percent}% complete with ${issues.length} gap(s). Priority: ${top.join('; ')}`;
    }
  }

  return {
    ready,
    percent: completeness.percent,
    readyToSubmit: completeness.readyToSubmit,
    issues,
    conflicts: allConflicts,
    nextActions: ai.nextActions || [],
    summary,
    completeness,
    source: ai.source,
  };
}

module.exports = {
  runCompletenessAiCheck,
  issuesFromCompleteness,
  detectRuleConflicts,
};
