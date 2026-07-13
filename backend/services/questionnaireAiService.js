/**
 * AI questionnaire draft generation — calls GPU and resolves CPV codes from DB catalog only.
 */
const {
  searchCpvCandidatesFromDb,
  resolveAiCpvPicks,
} = require('./cpvSearchService');
const { validateQuestionnaireDescription, normalizeUnderstandResult } = require('./questionnaireDescriptionValidation');

const AI_SERVICE_URL = (process.env.AI_SERVICE_URL || '').replace(/\/$/, '');
const AI_API_KEY = process.env.AI_API_KEY || '';

const ALLOWED_QUESTION_TYPES = new Set([
  'text', 'textarea', 'number', 'date', 'yes_no',
  'multiple_choice', 'radio', 'checkbox', 'dropdown',
]);

function isAiConfigured() {
  return Boolean(AI_SERVICE_URL && AI_API_KEY);
}

function buildSupplierFacingFallback(title, language = 'en') {
  const safeTitle =
    String(title || '').trim() ||
    (language === 'sv' ? 'Leverantörskvalificering' : 'Supplier qualification');
  if (language === 'sv') {
    return (
      `Du inbjuds att besvara detta kvalificeringsformulär för «${safeTitle}». ` +
      'Beskriv din erfarenhet, kapacitet och efterlevnad av relevanta krav så att den upphandlande ' +
      'organisationen kan bedöma om ditt företag är kvalificerat för uppdraget.'
    );
  }
  return (
    `You are invited to complete this qualification questionnaire for "${safeTitle}". ` +
    'Please describe your experience, capacity, and compliance with the relevant requirements ' +
    'so the contracting authority can assess whether your company is qualified for this opportunity.'
  );
}

function looksLikeInternalProcurementNotes(text, internalNotes) {
  const a = String(text || '').toLowerCase().replace(/\s+/g, ' ').trim();
  const b = String(internalNotes || '').toLowerCase().replace(/\s+/g, ' ').trim();
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.length >= 30 && b.includes(a.slice(0, Math.min(80, a.length)))) return true;
  if (b.length >= 30 && a.includes(b.slice(0, Math.min(80, b.length)))) return true;
  return /\b(we need|we want|we require|our organisation|our organization|our authority|vi behöver|vi vill|vår organisation|vårt behov)\b/i.test(
    a
  );
}

function normalizeSupplierDescription(aiDesc, title, internalNotes, language) {
  let desc = String(aiDesc || '').trim();
  if (!desc || looksLikeInternalProcurementNotes(desc, internalNotes)) {
    desc = buildSupplierFacingFallback(title, language);
  }
  return desc.slice(0, 2000);
}

async function callUnderstandAi(description, language = 'en') {
  if (!isAiConfigured()) {
    const err = new Error('AI service is not configured');
    err.code = 'AI_NOT_CONFIGURED';
    throw err;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90000);

  try {
    const res = await fetch(`${AI_SERVICE_URL}/generate/questionnaire/understand`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': AI_API_KEY,
      },
      body: JSON.stringify({
        description,
        language: (language || 'en').slice(0, 2),
      }),
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

function buildFallbackUnderstanding(trimmed, category, language = 'en') {
  const lower = trimmed.toLowerCase();
  if (/\b(bridge|bro)\b/i.test(lower)) {
    return language === 'sv'
      ? 'Du vill kvalificera leverantörer för bro- eller anläggningsarbeten.'
      : 'You want to qualify suppliers for bridge or civil engineering works.';
  }
  if (/\b(construct|build|bygg|renovat)\b/i.test(lower)) {
    return language === 'sv'
      ? 'Du vill kvalificera leverantörer för bygg- eller anläggningsarbeten.'
      : 'You want to qualify suppliers for construction or building works.';
  }
  if (/\b(clean|städ)\b/i.test(lower)) {
    return language === 'sv'
      ? 'Du vill kvalificera leverantörer för städ- eller lokalvårdstjänster.'
      : 'You want to qualify suppliers for cleaning or facility services.';
  }
  return language === 'sv'
    ? `Du vill kvalificera leverantörer inom: ${category}.`
    : `You want to qualify suppliers for: ${category}.`;
}

function fallbackUnderstand(description, language = 'en') {
  const trimmed = String(description || '').trim();

  let category = language === 'sv' ? 'Upphandling' : 'Procurement';
  if (/\b(bridge|construct|build|civil|road|bro|bygg|anlägg)\b/i.test(trimmed)) {
    category = language === 'sv' ? 'Bygg / anläggningsarbeten' : 'Construction / civil works';
  } else if (/\b(clean|städ|facility)\b/i.test(trimmed)) {
    category = language === 'sv' ? 'Städtjänster' : 'Cleaning services';
  } else if (/\b(it |software|system|support)\b/i.test(trimmed)) {
    category = language === 'sv' ? 'IT-tjänster' : 'IT services';
  }

  return normalizeUnderstandResult(
    {
      isValid: true,
      understanding: buildFallbackUnderstanding(trimmed, category, language),
      category,
      rejectionReason: '',
    },
    trimmed,
    language
  );
}

async function understandQuestionnaireDescription(description, options = {}) {
  const { language = 'en' } = options;
  const trimmed = String(description || '').trim();

  const validation = validateQuestionnaireDescription(trimmed, language);
  if (!validation.valid) {
    const err = new Error(validation.message);
    err.code = validation.code;
    throw err;
  }

  if (!isAiConfigured()) {
    return fallbackUnderstand(trimmed, language);
  }

  try {
    const data = await callUnderstandAi(trimmed, language);
    return normalizeUnderstandResult(data, trimmed, language);
  } catch (err) {
    if (err.status === 404) {
      return fallbackUnderstand(trimmed, language);
    }
    throw err;
  }
}

async function callQuestionnaireAi(description, language = 'en', cpvCandidates = []) {
  if (!isAiConfigured()) {
    const err = new Error('AI service is not configured');
    err.code = 'AI_NOT_CONFIGURED';
    throw err;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 180000);

  try {
    const res = await fetch(`${AI_SERVICE_URL}/generate/questionnaire`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': AI_API_KEY,
      },
      body: JSON.stringify({
        description,
        language: (language || 'en').slice(0, 2),
        cpvCandidates: cpvCandidates.map((c) => ({
          code: c.code,
          description: c.description,
        })),
      }),
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

function normalizeQuestions(rawQuestions = []) {
  const out = [];
  for (const q of rawQuestions) {
    if (!q || typeof q !== 'object') continue;
    const questionText = String(q.questionText || '').trim();
    if (questionText.length < 5) continue;

    let questionType = String(q.questionType || 'text');
    if (!ALLOWED_QUESTION_TYPES.has(questionType)) questionType = 'text';

    let options = Array.isArray(q.options) ? q.options.map((o) => String(o).trim()).filter(Boolean) : null;
    const needsOptions = ['radio', 'checkbox', 'dropdown', 'multiple_choice'].includes(questionType);
    if (needsOptions && (!options || options.length < 2)) {
      questionType = 'text';
      options = null;
    }
    if (!needsOptions) options = null;

    const requiresDocument = Boolean(q.requiresDocument);
    const documentType = requiresDocument && q.documentType ? String(q.documentType).trim().slice(0, 120) : null;

    out.push({
      questionText: questionText.slice(0, 500),
      questionType,
      isRequired: q.isRequired !== false,
      requiresDocument,
      documentType,
      options,
    });
    if (out.length >= 15) break;
  }
  return out;
}

async function generateQuestionnaireDraft(description, options = {}) {
  const { language = 'en' } = options;
  const trimmed = String(description || '').trim();

  const validation = validateQuestionnaireDescription(trimmed, language);
  if (!validation.valid) {
    const err = new Error(validation.message);
    err.code = validation.code;
    throw err;
  }

  // 1) CPV candidates from DB catalog only (supplier-selectable codes)
  const cpvCandidates = await searchCpvCandidatesFromDb(trimmed, [], 12);

  let aiData;
  try {
    aiData = await callQuestionnaireAi(trimmed, language, cpvCandidates);
  } catch (err) {
    if (err.status === 404) {
      const upgrade = new Error(
        'GPU AI service needs questionnaire generation (v2.1+). Redeploy ai-service on Trooper.'
      );
      upgrade.code = 'AI_GPU_OUTDATED';
      throw upgrade;
    }
    throw err;
  }

  // 2) AI may rank CPV — only accept picks that exist in our candidate list
  const aiPicks =
    aiData.selectedCpvCodes ||
    aiData.cpvCodeHints ||
    [];
  let cpvSuggestions = resolveAiCpvPicks(aiPicks, cpvCandidates);

  // 3) Fallback: top DB matches (never invented codes)
  if (cpvSuggestions.length === 0) {
    cpvSuggestions = cpvCandidates.slice(0, 5).map((c) => ({
      ...c,
      reason: c.supplierCount
        ? `${c.reason} · ${c.supplierCount} supplier(s) registered`
        : c.reason,
    }));
  } else {
    cpvSuggestions = cpvSuggestions.map((c) => ({
      ...c,
      reason: c.supplierCount
        ? `${c.reason} · ${c.supplierCount} supplier(s) on this CPV`
        : c.reason,
    }));
  }

  const questions = normalizeQuestions(aiData.questions);

  const title = String(aiData.title || 'Supplier qualification questionnaire').trim().slice(0, 200);
  const supplierDescription = normalizeSupplierDescription(
    aiData.description,
    title,
    trimmed,
    language
  );

  return {
    title,
    description: supplierDescription,
    procurementDescription: trimmed,
    cpvSuggestions,
    recommendedCpvCodeId: cpvSuggestions[0]?.cpvCodeId || null,
    questions,
    questionCount: questions.length,
    disclaimer:
      'AI-generated draft — CPV codes are from your system catalog only. Review title, CPV, and every question before publishing.',
  };
}

module.exports = {
  understandQuestionnaireDescription,
  generateQuestionnaireDraft,
  normalizeQuestions,
};
