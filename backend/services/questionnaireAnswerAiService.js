/**
 * AI-suggested answers for supplier questionnaires — grounded in profile + document metadata.
 */
const db = require('../models');
const { Op } = require('sequelize');

const AI_SERVICE_URL = (process.env.AI_SERVICE_URL || '').replace(/\/$/, '');
const AI_API_KEY = process.env.AI_API_KEY || '';

function isAiConfigured() {
  return Boolean(AI_SERVICE_URL && AI_API_KEY);
}

function truncate(text, max = 800) {
  const s = String(text || '').trim();
  if (!s) return '';
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

function buildSupplierProfileContext(supplier) {
  const docs = (supplier.documents || [])
    .filter((d) => d && d.isActive !== false)
    .slice(0, 40)
    .map((d) => ({
      id: d.id,
      documentType: d.documentType || null,
      fileName: d.fileName || null,
      issuer: d.issuer || null,
      documentNumber: d.documentNumber || null,
      validFrom: d.validFrom || null,
      validTo: d.validTo || null,
    }));

  const references = (supplier.references || []).slice(0, 20).map((r) => ({
    projectName: r.projectName || null,
    clientName: r.clientName || null,
    yearFrom: r.yearFrom || null,
    yearTo: r.yearTo || null,
    contractValue: r.contractValue || null,
    description: truncate(r.description, 400),
  }));

  return {
    companyName: supplier.companyName || null,
    registrationNumber: supplier.registrationNumber || null,
    taxId: supplier.taxId || null,
    address: supplier.address || null,
    city: supplier.city || null,
    country: supplier.country || null,
    phone: supplier.phone || null,
    website: supplier.website || null,
    turnover: supplier.turnover || null,
    employeeCount: supplier.employeeCount || null,
    yearEstablished: supplier.yearEstablished || null,
    financialStability: truncate(supplier.financialStability),
    qualityManagementSystem: truncate(supplier.qualityManagementSystem),
    environmentalManagementSystem: truncate(supplier.environmentalManagementSystem),
    socialResponsibilityManagementSystem: truncate(supplier.socialResponsibilityManagementSystem),
    ohsManagementSystem: truncate(supplier.ohsManagementSystem),
    groundsForExclusion: truncate(supplier.groundsForExclusion),
    laborLawRegulations: truncate(supplier.laborLawRegulations),
    sanctionsRussiaBelarus: truncate(supplier.sanctionsRussiaBelarus),
    technicalCapacityProfessionalExperience: truncate(supplier.technicalCapacityProfessionalExperience, 1200),
    insurerName: supplier.insurerName || null,
    insurancePolicyNumber: supplier.insurancePolicyNumber || null,
    insuranceCoverageAmount: supplier.insuranceCoverageAmount || null,
    insuranceValidTo: supplier.insuranceValidTo || null,
    cpvCodes: (supplier.cpvCodes || []).slice(0, 30).map((c) => ({
      code: c.code,
      description: c.description,
    })),
    nutsCodes: (supplier.nutsCodes || []).slice(0, 30).map((n) => ({
      code: n.code,
      name: n.name || n.description || null,
    })),
    references,
    documents: docs,
  };
}

function matchSuggestedDocument(question, suggestion, documents = []) {
  if (!question?.requiresDocument || !documents.length) return null;

  const wantedType = String(
    suggestion?.suggestedDocumentType || question.documentType || ''
  )
    .toLowerCase()
    .trim();

  if (wantedType) {
    const byType = documents.find((d) =>
      String(d.documentType || '')
        .toLowerCase()
        .includes(wantedType.replace(/\s+/g, '_').slice(0, 40))
      || String(d.documentType || '')
        .toLowerCase()
        .includes(wantedType.slice(0, 40))
      || String(d.fileName || '')
        .toLowerCase()
        .includes(wantedType.slice(0, 40))
    );
    if (byType) return byType;
  }

  // Soft keyword match for common certificate / insurance docs
  const hay = `${question.questionText || ''} ${question.documentType || ''}`.toLowerCase();
  const keywords = [
    ['iso 9001', 'q5', 'quality'],
    ['iso 14001', 'q6', 'environment'],
    ['iso 45001', 'q8', 'ohs', 'health'],
    ['insurance', 'insur'],
    ['financial', 'q2', 'turnover'],
    ['registration', 'company'],
  ];
  for (const group of keywords) {
    if (!group.some((k) => hay.includes(k))) continue;
    const found = documents.find((d) => {
      const blob = `${d.documentType || ''} ${d.fileName || ''}`.toLowerCase();
      return group.some((k) => blob.includes(k));
    });
    if (found) return found;
  }
  return null;
}

async function callAnswerAi(payload) {
  if (!isAiConfigured()) {
    const err = new Error('AI service is not configured');
    err.code = 'AI_NOT_CONFIGURED';
    throw err;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 180000);

  try {
    const res = await fetch(`${AI_SERVICE_URL}/generate/questionnaire/answers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': AI_API_KEY,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const detail = Array.isArray(data.detail)
        ? data.detail.map((d) => d.msg || JSON.stringify(d)).join('; ')
        : data.detail;
      const err = new Error(detail || data.message || `AI service error (${res.status})`);
      err.status = res.status;
      if (res.status === 401) err.code = 'AI_AUTH_FAILED';
      if (res.status === 404) err.code = 'AI_GPU_OUTDATED';
      if (res.status >= 502) err.code = 'AI_UNAVAILABLE';
      throw err;
    }
    return data;
  } catch (e) {
    if (e.name === 'AbortError') {
      const err = new Error('AI request timed out');
      err.code = 'AI_TIMEOUT';
      throw err;
    }
    if (e.cause?.code === 'ECONNREFUSED' || e.message?.includes('fetch failed')) {
      const err = new Error('Cannot reach AI server. Is the GPU instance running?');
      err.code = 'AI_UNAVAILABLE';
      throw err;
    }
    throw e;
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeSuggestions(rawAnswers, questions, documents) {
  const byId = Object.fromEntries(
    (rawAnswers || [])
      .filter((a) => a && a.questionId)
      .map((a) => [String(a.questionId), a])
  );

  return questions.map((q) => {
    const raw = byId[String(q.id)] || {};
    const skipped = Boolean(raw.skipped) || !(String(raw.answerText || raw.answerValue || '').trim());
    const matchedDoc = skipped ? null : matchSuggestedDocument(q, raw, documents);

    return {
      questionId: q.id,
      questionText: q.questionText,
      questionType: q.questionType,
      answerText: skipped ? '' : String(raw.answerText || '').trim(),
      answerValue: skipped ? '' : String(raw.answerValue || raw.answerText || '').trim(),
      confidence: typeof raw.confidence === 'number' ? raw.confidence : 0,
      rationale: String(raw.rationale || '').trim(),
      skipped,
      skipReason: skipped
        ? String(raw.skipReason || 'Insufficient profile evidence').trim()
        : '',
      suggestedDocumentId: matchedDoc?.id || null,
      suggestedDocumentName: matchedDoc?.fileName || null,
      requiresDocument: Boolean(q.requiresDocument),
    };
  });
}

/** Local heuristic fallback when GPU AI is down — grounded only in profile facts. */
function heuristicSuggestAnswers(questions, profile, documents = []) {
  const textBlob = Object.values(profile)
    .filter((v) => typeof v === 'string' && v.trim())
    .join(' ')
    .toLowerCase();

  return questions.map((q) => {
    const qt = String(q.questionText || '').toLowerCase();
    let answerText = '';
    let answerValue = '';
    let rationale = '';
    let confidence = 0.55;

    if (q.questionType === 'number' || /turnover|omsättning|revenue/.test(qt)) {
      if (/year|established|grundat|founded/.test(qt) && profile.yearEstablished) {
        answerText = String(profile.yearEstablished);
        answerValue = String(profile.yearEstablished);
        rationale = 'From company year established on your profile.';
        confidence = 0.85;
      } else if (/employee|anställd|staff|headcount/.test(qt) && profile.employeeCount) {
        answerText = String(profile.employeeCount);
        answerValue = String(profile.employeeCount);
        rationale = 'From employee count on your profile.';
        confidence = 0.8;
      } else if (profile.turnover != null) {
        answerText = String(profile.turnover);
        answerValue = String(profile.turnover);
        rationale = 'From turnover on your profile.';
        confidence = 0.8;
      }
    } else if (q.questionType === 'yes_no' || /certif|iso|hold|do you/.test(qt)) {
      const hasEvidence =
        (/9001|quality/.test(qt) && /iso\s*9001|quality/.test(textBlob)) ||
        (/14001|environment/.test(qt) && /iso\s*14001|environment/.test(textBlob)) ||
        (/45001|ohs|health/.test(qt) && /iso\s*45001|ohs|health/.test(textBlob)) ||
        (/insurance|försäkring/.test(qt) && (profile.insurerName || /insurance/.test(textBlob))) ||
        Boolean(profile.qualityManagementSystem || profile.environmentalManagementSystem);
      answerText = hasEvidence ? 'Yes' : '';
      answerValue = hasEvidence ? 'Yes' : '';
      rationale = hasEvidence
        ? 'Inferred from profile / document metadata (review carefully).'
        : '';
      confidence = hasEvidence ? 0.6 : 0;
    } else if (q.questionType === 'dropdown' || /contact method|preferred contact/.test(qt)) {
      answerText = 'Email';
      answerValue = 'Email';
      rationale = 'Default contact preference suggestion.';
      confidence = 0.7;
    } else if (/region|location|deliver|nuts|geographic|område/.test(qt)) {
      const nuts = (profile.nutsCodes || []).map((n) => n.code || n.name).filter(Boolean).join(', ');
      const place = [profile.city, profile.country].filter(Boolean).join(', ');
      answerText = nuts || place || '';
      rationale = nuts ? 'From NUTS codes on your profile.' : place ? 'From address on your profile.' : '';
      confidence = answerText ? 0.75 : 0;
    } else if (/experience|capacity|assignment|similar|erfarenhet|technical/.test(qt)) {
      answerText =
        profile.technicalCapacityProfessionalExperience ||
        (profile.references || [])
          .slice(0, 3)
          .map((r) => `${r.projectName || 'Project'}${r.clientName ? ` for ${r.clientName}` : ''}`)
          .join('; ') ||
        (profile.companyName
          ? `${profile.companyName} can deliver services matching this underlag based on our registered profile.`
          : '');
      rationale = profile.technicalCapacityProfessionalExperience
        ? 'From technical capacity on your profile.'
        : (profile.references || []).length
          ? 'From reference projects on your profile.'
          : answerText
            ? 'Draft from company profile (edit before submit).'
            : '';
      confidence = profile.technicalCapacityProfessionalExperience ? 0.75 : answerText ? 0.5 : 0;
    } else if (/financial|stability|ekonomi/.test(qt) && profile.financialStability) {
      answerText = profile.financialStability;
      rationale = 'From financial stability on your profile.';
      confidence = 0.8;
    } else if (profile.companyName) {
      // Soft fallback for open text — only if we have a company name
      answerText = '';
      rationale = '';
      confidence = 0;
    }

    const skipped = !String(answerText || answerValue || '').trim();
    const matchedDoc = skipped ? null : matchSuggestedDocument(q, { suggestedDocumentType: q.documentType }, documents);

    return {
      questionId: q.id,
      questionText: q.questionText,
      questionType: q.questionType,
      answerText: skipped ? '' : String(answerText).trim(),
      answerValue: skipped ? '' : String(answerValue || answerText).trim(),
      confidence: skipped ? 0 : confidence,
      rationale: skipped ? '' : rationale,
      skipped,
      skipReason: skipped ? 'Insufficient profile evidence' : '',
      suggestedDocumentId: matchedDoc?.id || null,
      suggestedDocumentName: matchedDoc?.fileName || null,
      requiresDocument: Boolean(q.requiresDocument),
    };
  });
}

async function suggestAnswersForQuestionnaire(supplierUserId, questionnaireId, options = {}) {
  const { language = 'en' } = options;

  const supplier = await db.Supplier.findOne({
    where: { userId: supplierUserId },
    include: [
      { model: db.CPVCode, as: 'cpvCodes', through: { attributes: [] }, required: false },
      { model: db.Document, as: 'documents', required: false },
      ...(db.NUTSCode
        ? [{ model: db.NUTSCode, as: 'nutsCodes', through: { attributes: [] }, required: false }]
        : []),
      ...(db.SupplierReference
        ? [{ model: db.SupplierReference, as: 'references', required: false }]
        : []),
    ],
  });

  if (!supplier) {
    const err = new Error('Supplier not found');
    err.code = 'SUPPLIER_NOT_FOUND';
    throw err;
  }
  if (!['approved', 'requalification_required'].includes(supplier.status)) {
    const err = new Error('Supplier not approved');
    err.code = 'SUPPLIER_NOT_APPROVED';
    throw err;
  }

  const supplierCpvIds = (supplier.cpvCodes || []).map((c) => c.id);
  if (!supplierCpvIds.length) {
    const err = new Error('Select CPV codes on your profile before using AI answers');
    err.code = 'NO_CPV';
    throw err;
  }

  const questionnaire = await db.Questionnaire.findOne({
    where: {
      id: questionnaireId,
      isActive: true,
      cpvCodeId: { [Op.in]: supplierCpvIds },
    },
    include: [
      {
        model: db.Question,
        as: 'questions',
        separate: true,
        order: [['order', 'ASC']],
      },
    ],
  });

  if (!questionnaire) {
    const err = new Error('Questionnaire not found or not available for this supplier');
    err.code = 'QUESTIONNAIRE_NOT_FOUND';
    throw err;
  }

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  if (new Date(questionnaire.deadline) < now) {
    const err = new Error('Questionnaire deadline has passed');
    err.code = 'QUESTIONNAIRE_EXPIRED';
    throw err;
  }

  const existing = await db.QuestionnaireResponse.findOne({
    where: { questionnaireId: questionnaire.id, supplierId: supplier.id, status: 'submitted' },
  });
  if (existing) {
    const err = new Error('Questionnaire already submitted');
    err.code = 'ALREADY_SUBMITTED';
    throw err;
  }

  const questions = questionnaire.questions || [];
  if (!questions.length) {
    return {
      suggestions: [],
      disclaimer:
        'AI-generated draft answers — review every answer before saving or submitting. Nothing is saved until you apply and save.',
    };
  }

  const profileContext = buildSupplierProfileContext(supplier);
  const docs = supplier.documents || [];

  let suggestions;
  let usedFallback = false;
  if (!isAiConfigured()) {
    suggestions = heuristicSuggestAnswers(questions, profileContext, docs);
    usedFallback = true;
  } else {
    try {
      const aiData = await callAnswerAi({
        language: (language || 'en').slice(0, 2),
        questionnaire: {
          title: questionnaire.title,
          description: questionnaire.description || '',
          questions: questions.map((q) => ({
            id: q.id,
            questionText: q.questionText,
            questionType: q.questionType,
            options: q.options || null,
            isRequired: q.isRequired !== false,
            requiresDocument: Boolean(q.requiresDocument),
            documentType: q.documentType || null,
          })),
        },
        supplierProfile: profileContext,
      });
      suggestions = normalizeSuggestions(aiData.answers || [], questions, docs);
    } catch (err) {
      // GPU down / timeout / outdated — still help the supplier with profile-based drafts
      console.warn('Answer AI unavailable, using profile heuristic fallback:', err.code || err.message);
      suggestions = heuristicSuggestAnswers(questions, profileContext, docs);
      usedFallback = true;
    }
  }

  return {
    suggestions,
    suggestedCount: suggestions.filter((s) => !s.skipped).length,
    skippedCount: suggestions.filter((s) => s.skipped).length,
    source: usedFallback ? 'profile_fallback' : 'ai',
    disclaimer: usedFallback
      ? 'Draft answers filled from your profile (AI server unavailable). Review every answer carefully. Nothing is saved until you apply and save/submit.'
      : 'AI-generated draft answers from your profile and document metadata. Review every answer. Nothing is saved until you apply and save/submit.',
  };
}

module.exports = {
  suggestAnswersForQuestionnaire,
  buildSupplierProfileContext,
  normalizeSuggestions,
};
