/**
 * Merge multi-document AI extractions into supplier profile field suggestions.
 * Human review required — never auto-saves.
 */
const {
  extractAuto,
  getGpuEndpointsCatalog,
  callAi,
  SECTION_TEXT_FIELD,
} = require('./aiExtractionService');
const {
  searchCpvCandidatesFromDb,
  resolveAiCpvPicks,
} = require('./cpvSearchService');
const { searchNutsCandidatesFromDb } = require('./nutsSearchService');

const PROFILE_FIELDS = [
  'companyName', 'registrationNumber', 'taxId', 'address', 'city', 'country', 'phone', 'website',
  'yearEstablished', 'turnover', 'employeeCount', 'financialStability',
  'qualityManagementSystem', 'environmentalManagementSystem',
  'socialResponsibilityManagementSystem', 'ohsManagementSystem',
  'insurerName', 'insurancePolicyNumber', 'insuranceCoverageAmount', 'insuranceValidTo',
];

function normalizeValue(value) {
  if (value == null) return null;
  const s = String(value).trim();
  return s === '' ? null : s;
}

function normalizeForCompare(value) {
  const s = normalizeValue(value);
  if (s == null) return null;
  return s.toLowerCase().replace(/\s+/g, ' ');
}

function buildCertificateSummary(fields) {
  if (!fields || typeof fields !== 'object') return null;
  if (fields.summary) return normalizeValue(fields.summary);
  const parts = [fields.standardName, fields.issuer, fields.documentNumber].filter(Boolean);
  return parts.length ? parts.join(' — ') : null;
}

function mapExtractionToProfileFields(documentType, section, fields) {
  const out = {};
  if (!fields || typeof fields !== 'object') return out;

  if (documentType === 'insurance' || section === 'insurance') {
    if (fields.insurerName != null) out.insurerName = normalizeValue(fields.insurerName);
    if (fields.insurancePolicyNumber != null) out.insurancePolicyNumber = normalizeValue(fields.insurancePolicyNumber);
    if (fields.insuranceCoverageAmount != null) out.insuranceCoverageAmount = normalizeValue(fields.insuranceCoverageAmount);
    if (fields.insuranceValidTo != null) out.insuranceValidTo = normalizeValue(fields.insuranceValidTo);
    return out;
  }

  if (documentType === 'company_registration' || section === 'company') {
    const companyKeys = ['companyName', 'registrationNumber', 'taxId', 'address', 'city', 'country', 'phone', 'website'];
    for (const key of companyKeys) {
      if (fields[key] != null) out[key] = normalizeValue(fields[key]);
    }
    if (fields.yearEstablished != null) out.yearEstablished = normalizeValue(fields.yearEstablished);
    return out;
  }

  if (documentType === 'financial' || section === 'q2') {
    if (fields.financialStability != null) out.financialStability = normalizeValue(fields.financialStability);
    if (fields.turnoverHint != null) out.turnover = normalizeValue(fields.turnoverHint);
    if (fields.employeeCountHint != null) out.employeeCount = normalizeValue(fields.employeeCountHint);
    if (fields.reportingYear != null && !out.yearEstablished) out.yearEstablished = normalizeValue(fields.reportingYear);
    return out;
  }

  const textField = SECTION_TEXT_FIELD[section];
  if (textField) {
    const summary = buildCertificateSummary(fields);
    if (summary) out[textField] = summary;
  }

  return out;
}

function mergeProfileSuggestions(extractions, currentProfile = {}) {
  const fieldSources = {};
  const perDocument = [];

  for (const ext of extractions) {
    const mapped = mapExtractionToProfileFields(ext.documentType, ext.section, ext.fields);
    perDocument.push({
      fileName: ext.fileName,
      documentType: ext.documentType,
      section: ext.section,
      confidence: ext.confidence,
      fields: mapped,
      error: ext.error || null,
    });

    for (const [field, value] of Object.entries(mapped)) {
      if (!PROFILE_FIELDS.includes(field)) continue;
      if (!fieldSources[field]) fieldSources[field] = [];
      fieldSources[field].push({
        value,
        fileName: ext.fileName,
        documentType: ext.documentType,
        confidence: ext.confidence ?? 0.5,
      });
    }
  }

  const suggestions = {};
  const conflicts = [];

  for (const field of PROFILE_FIELDS) {
    const sources = fieldSources[field] || [];
    if (sources.length === 0) continue;

    const distinct = [];
    for (const src of sources) {
      const cmp = normalizeForCompare(src.value);
      if (cmp == null) continue;
      if (!distinct.find((d) => normalizeForCompare(d.value) === cmp)) {
        distinct.push(src);
      }
    }
    if (distinct.length === 0) continue;

    const current = normalizeValue(currentProfile[field]);
    const hasConflict = distinct.length > 1;
    const best = [...distinct].sort((a, b) => (b.confidence || 0) - (a.confidence || 0))[0];

    suggestions[field] = {
      value: best.value,
      sources: distinct.map((d) => d.fileName),
      documentType: best.documentType,
      confidence: best.confidence,
      conflict: hasConflict,
      currentValue: current,
      differsFromCurrent: current != null && normalizeForCompare(current) !== normalizeForCompare(best.value),
    };

    if (hasConflict) {
      conflicts.push({
        field,
        values: distinct.map((d) => ({ value: d.value, fileName: d.fileName, documentType: d.documentType })),
      });
    }
  }

  return { suggestions, conflicts, documents: perDocument };
}

function buildCpvContextText(documents, extractions) {
  const parts = [];
  for (const doc of documents) {
    if (doc.text && String(doc.text).trim().length >= 20) {
      parts.push(String(doc.text).trim().slice(0, 4000));
    }
  }
  for (const ext of extractions) {
    const fields = ext.fields || {};
    for (const key of ['companyName', 'qualityManagementSystem', 'financialStability']) {
      if (fields[key]) parts.push(String(fields[key]));
    }
  }
  return parts.join('\n\n').slice(0, 6000);
}

/**
 * Suggest CPV codes from document text — catalog codes only.
 * Tries GPU ranking when available; falls back to DB keyword matches.
 */
async function suggestCpvFromDocuments(documents, extractions, language = 'en') {
  const contextText = buildCpvContextText(documents, extractions);
  if (contextText.length < 20) return [];

  const candidates = await searchCpvCandidatesFromDb(contextText, [], 12);
  if (!candidates.length) return [];

  let picks = [];
  try {
    const aiData = await callAi(
      '/generate/profile/cpv',
      {
        documentText: contextText.slice(0, 6000),
        language: (language || 'en').slice(0, 2),
        cpvCandidates: candidates.map((c) => ({
          code: c.code,
          description: c.description,
        })),
      },
      90000
    );
    picks = resolveAiCpvPicks(aiData.selectedCpvCodes || [], candidates);
  } catch (err) {
    // Older GPU without /generate/profile/cpv — use catalog matches
    if (err.status !== 404 && err.code !== 'AI_NOT_CONFIGURED' && err.code !== 'AI_UNAVAILABLE') {
      console.warn('[profile-ai] CPV AI ranking skipped:', err.message);
    }
  }

  const selected = picks.length ? picks : candidates.slice(0, 3);
  return selected.slice(0, 3).map((c) => ({
    cpvCodeId: c.cpvCodeId,
    code: c.code,
    description: c.description,
    reason: c.reason || 'Matched from uploaded document',
    confidence: c.confidence ?? 0.7,
  }));
}

async function processDocumentsForProfile(documents, options = {}) {
  const { language = 'en', currentProfile = {} } = options;
  const extractions = [];
  const gpuCatalog = await getGpuEndpointsCatalog();
  const gpuV2 = Boolean(
    gpuCatalog?.version === '2.0.0' ||
      gpuCatalog?.endpoints?.some((endpoint) => endpoint.path === '/extract/auto')
  );

  for (const doc of documents) {
    if (doc.error) {
      extractions.push({
        fileName: doc.fileName,
        documentType: 'unknown',
        section: 'unknown',
        confidence: 0,
        fields: {},
        error: doc.error,
      });
      continue;
    }

    try {
      const result = await extractAuto(doc.text, { language, fileName: doc.fileName });
      extractions.push({
        fileName: doc.fileName,
        documentType: result.documentType || 'unknown',
        section: result.section || 'unknown',
        confidence: result.confidence ?? 0.5,
        fields: result.fields || {},
      });
    } catch (err) {
      extractions.push({
        fileName: doc.fileName,
        documentType: err.documentType || 'unknown',
        section: 'unknown',
        confidence: 0,
        fields: {},
        error: err.message || 'Extraction failed',
        code: err.code || null,
      });
    }
  }

  const merged = mergeProfileSuggestions(extractions, currentProfile);
  let cpvSuggestions = [];
  let nutsSuggestions = [];
  try {
    cpvSuggestions = await suggestCpvFromDocuments(documents, extractions, language);
  } catch (err) {
    console.warn('[profile-ai] CPV suggest failed:', err.message);
  }
  try {
    const contextText = buildCpvContextText(documents, extractions);
    nutsSuggestions = await searchNutsCandidatesFromDb(contextText, 3);
  } catch (err) {
    console.warn('[profile-ai] NUTS suggest failed:', err.message);
  }

  const allFailed = extractions.length > 0 && extractions.every((ext) => ext.error);
  const anyGpuOutdated = extractions.some((ext) => ext.code === 'AI_GPU_OUTDATED');

  return {
    ...merged,
    cpvSuggestions,
    nutsSuggestions,
    gpuV2,
    allFailed,
    gpuUpgradeRecommended: !gpuV2 || anyGpuOutdated,
    disclaimer:
      'AI suggestions require human review before saving. CPV and NUTS codes are from the system catalog only.',
  };
}

module.exports = {
  PROFILE_FIELDS,
  mapExtractionToProfileFields,
  mergeProfileSuggestions,
  suggestCpvFromDocuments,
  processDocumentsForProfile,
};
