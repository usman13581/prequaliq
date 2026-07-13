/**
 * Merge multi-document AI extractions into procuring entity profile field suggestions.
 * Human review required — never auto-saves.
 */
const { extractAuto, getGpuEndpointsCatalog } = require('./aiExtractionService');

const PROFILE_FIELDS = ['entityName', 'address', 'city', 'country', 'phone', 'firstName', 'lastName'];

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

function mapExtractionToProfileFields(documentType, section, fields) {
  const out = {};
  if (!fields || typeof fields !== 'object') return out;

  if (documentType === 'company_registration' || section === 'company') {
    if (fields.companyName != null) out.entityName = normalizeValue(fields.companyName);
    if (fields.entityName != null) out.entityName = normalizeValue(fields.entityName);
    if (fields.registrationNumber != null && !out.entityName) {
      // keep registration as fallback label only when no name
    }
    for (const key of ['address', 'city', 'country', 'phone']) {
      if (fields[key] != null) out[key] = normalizeValue(fields[key]);
    }
    return out;
  }

  // Generic contact hints from any readable document
  if (fields.phone != null) out.phone = normalizeValue(fields.phone);
  if (fields.contactName != null) {
    const parts = String(fields.contactName).trim().split(/\s+/);
    if (parts[0]) out.firstName = normalizeValue(parts[0]);
    if (parts.length > 1) out.lastName = normalizeValue(parts.slice(1).join(' '));
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
  const allFailed = extractions.length > 0 && extractions.every((ext) => ext.error);
  const anyGpuOutdated = extractions.some((ext) => ext.code === 'AI_GPU_OUTDATED');

  return {
    ...merged,
    gpuV2,
    allFailed,
    gpuUpgradeRecommended: !gpuV2 || anyGpuOutdated,
    disclaimer: 'AI suggestions require human review before saving.',
  };
}

module.exports = {
  PROFILE_FIELDS,
  mapExtractionToProfileFields,
  mergeProfileSuggestions,
  processDocumentsForProfile,
};
