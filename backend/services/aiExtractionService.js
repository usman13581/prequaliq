/**
 * Calls self-hosted AI extraction service on GPU server.
 * Env: AI_SERVICE_URL, AI_API_KEY
 */
const AI_SERVICE_URL = (process.env.AI_SERVICE_URL || '').replace(/\/$/, '');
const AI_API_KEY = process.env.AI_API_KEY || '';

const SECTION_TEXT_FIELD = {
  q2: 'financialStability',
  q5: 'qualityManagementSystem',
  q6: 'environmentalManagementSystem',
  q7: 'socialResponsibilityManagementSystem',
  q8: 'ohsManagementSystem',
};

const SECTION_DOC_TYPE = {
  q2: 'q2-financial',
  q5: 'q5-quality',
  q6: 'q6-environment',
  q7: 'q7-social',
  q8: 'q8-ohs',
};

function isAiConfigured() {
  return Boolean(AI_SERVICE_URL && AI_API_KEY);
}

function parseErrorBody(data, status) {
  const detail = Array.isArray(data.detail)
    ? data.detail.map((d) => d.msg || JSON.stringify(d)).join('; ')
    : data.detail;
  const err = new Error(detail || data.message || `AI service error (${status})`);
  err.status = status;
  if (status === 401) err.code = 'AI_AUTH_FAILED';
  if (status >= 502) err.code = 'AI_UNAVAILABLE';
  return err;
}

async function callAi(path, body, timeoutMs = 120000) {
  if (!isAiConfigured()) {
    const err = new Error('AI service is not configured');
    err.code = 'AI_NOT_CONFIGURED';
    throw err;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${AI_SERVICE_URL}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': AI_API_KEY,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw parseErrorBody(data, res.status);
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

async function suggestInsuranceFields(text, options = {}) {
  return callAi('/extract/insurance', {
    text,
    language: options.language || 'en',
    fileName: options.fileName,
  });
}

async function classifyDocument(text, options = {}) {
  return callAi('/extract/classify', {
    text,
    language: options.language || 'en',
    fileName: options.fileName,
  });
}

async function extractCompanyFields(text, options = {}) {
  const data = await callAi('/extract/company', {
    text,
    language: options.language || 'en',
    fileName: options.fileName,
  });
  return data.fields || data;
}

async function extractCertificateFields(text, options = {}) {
  const data = await callAi('/extract/certificate', {
    text,
    language: options.language || 'en',
    fileName: options.fileName,
  });
  return data.fields || data;
}

async function extractFinancialFields(text, options = {}) {
  const data = await callAi('/extract/financial', {
    text,
    language: options.language || 'en',
    fileName: options.fileName,
  });
  return data.fields || data;
}

const SECTION_FOR_TYPE = {
  insurance: 'insurance',
  company_registration: 'company',
  financial: 'q2',
  quality_certificate: 'q5',
  environment_certificate: 'q6',
  social_certificate: 'q7',
  ohs_certificate: 'q8',
};

const EXTRACTORS_BY_TYPE = {
  insurance: suggestInsuranceFields,
  company_registration: extractCompanyFields,
  financial: extractFinancialFields,
  quality_certificate: extractCertificateFields,
  environment_certificate: extractCertificateFields,
  social_certificate: extractCertificateFields,
  ohs_certificate: extractCertificateFields,
};

function heuristicClassify(text, fileName = '') {
  const hay = `${fileName} ${text}`.toLowerCase().slice(0, 4000);

  const rules = [
    { documentType: 'insurance', re: /insur|försäkr|policy|liabilit|ansvarsförsäkring|coverage|premium|försäkringsbrev/ },
    { documentType: 'company_registration', re: /registration|org\.?\s*nr|company register|bolagsverket|handelsregister|incorporation|vat number|tax id|företagsnamn/ },
    { documentType: 'financial', re: /balance sheet|income statement|annual report|bokslut|årsredovisning|financial statement|profit and loss|revenue|turnover|resultaträkning/ },
    { documentType: 'quality_certificate', re: /iso\s*9001|quality management|kvalitet|qms/ },
    { documentType: 'environment_certificate', re: /iso\s*14001|environmental|miljö/ },
    { documentType: 'social_certificate', re: /iso\s*26000|social responsibility|csr/ },
    { documentType: 'ohs_certificate', re: /iso\s*45001|ohs|occupational health|arbetsmiljö|ohsas/ },
    { documentType: 'quality_certificate', re: /certificate|certifikat|certification|iso\s*\d{4,5}/ },
  ];

  for (const rule of rules) {
    if (rule.re.test(hay)) {
      return {
        documentType: rule.documentType,
        section: SECTION_FOR_TYPE[rule.documentType] || 'unknown',
        confidence: 0.55,
      };
    }
  }

  return { documentType: 'unknown', section: 'unknown', confidence: 0.3 };
}

async function classifyDocumentWithFallback(text, options = {}) {
  try {
    return await classifyDocument(text, options);
  } catch (err) {
    if (err.status !== 404) throw err;
    return heuristicClassify(text, options.fileName);
  }
}

async function extractFieldsForDocumentType(documentType, text, options = {}) {
  const extractor = EXTRACTORS_BY_TYPE[documentType];
  if (!extractor) return {};

  try {
    return await extractor(text, options);
  } catch (err) {
    if (err.status === 404) {
      const upgrade = new Error(
        `GPU AI service is missing "${documentType}" extraction. ` +
          'Redeploy ai-service v2 on Trooper (see ai-service/README.md). ' +
          'Insurance PDFs work on the current server.'
      );
      upgrade.code = 'AI_GPU_OUTDATED';
      upgrade.documentType = documentType;
      throw upgrade;
    }
    throw err;
  }
}

async function extractAutoOrchestrated(text, options = {}) {
  const classified = await classifyDocumentWithFallback(text, options);
  const documentType = classified.documentType || 'unknown';
  const section = classified.section || SECTION_FOR_TYPE[documentType] || 'unknown';
  const confidence = classified.confidence ?? 0.5;

  if (documentType === 'unknown' || !EXTRACTORS_BY_TYPE[documentType]) {
    return { documentType, section, confidence, fields: {} };
  }

  const fields = await extractFieldsForDocumentType(documentType, text, options);
  return { documentType, section, confidence, fields };
}

async function extractAuto(text, options = {}) {
  const payload = {
    text,
    language: options.language || 'en',
    fileName: options.fileName,
  };

  try {
    return await callAi('/extract/auto', payload);
  } catch (err) {
    if (err.status !== 404) throw err;
    return extractAutoOrchestrated(text, options);
  }
}

async function checkAiHealth() {
  if (!AI_SERVICE_URL) return { configured: false, online: false };
  try {
    const res = await fetch(`${AI_SERVICE_URL}/health`, { signal: AbortSignal.timeout(8000) });
    const data = await res.json().catch(() => ({}));
    const catalog = await getGpuEndpointsCatalog();
    const gpuV2 = Boolean(catalog?.version === '2.0.0' || catalog?.endpoints?.some((e) => e.path === '/extract/auto'));
    return {
      configured: isAiConfigured(),
      online: res.ok && data.ollama === true,
      gpuV2,
      profileAssistReady: res.ok && data.ollama === true,
      ...data,
    };
  } catch {
    return { configured: isAiConfigured(), online: false, gpuV2: false, profileAssistReady: false };
  }
}

async function getGpuEndpointsCatalog() {
  if (!AI_SERVICE_URL) return null;
  try {
    const res = await fetch(`${AI_SERVICE_URL}/endpoints`, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

function getBackendAiEndpointsCatalog() {
  const base = '/api/supplier';
  return {
    service: 'prequaliq-backend-supplier-ai',
    endpoints: [
      { method: 'GET', path: `${base}/ai/status`, auth: 'supplier JWT', description: 'AI online + GPU health' },
      { method: 'GET', path: `${base}/ai/endpoints`, auth: 'supplier JWT', description: 'This catalog + GPU catalog' },
      { method: 'POST', path: `${base}/insurance/ai-suggest`, auth: 'supplier JWT', body: 'multipart document (PDF)' },
      { method: 'POST', path: `${base}/profile/ai-suggest`, auth: 'supplier JWT', body: 'multipart documents[] (PDFs, max 10)' },
      {
        method: 'POST',
        path: `${base}/questionnaires/:questionnaireId/ai-suggest-answers`,
        auth: 'supplier JWT',
        body: '{ language? }',
        description: 'Suggest questionnaire answers from supplier profile',
      },
    ],
    gpuServiceUrl: AI_SERVICE_URL || null,
    gpuDocsUrl: AI_SERVICE_URL ? `${AI_SERVICE_URL}/docs` : null,
  };
}

module.exports = {
  suggestInsuranceFields,
  classifyDocument,
  classifyDocumentWithFallback,
  extractCompanyFields,
  extractCertificateFields,
  extractFinancialFields,
  extractAuto,
  extractAutoOrchestrated,
  checkAiHealth,
  isAiConfigured,
  getGpuEndpointsCatalog,
  getBackendAiEndpointsCatalog,
  SECTION_TEXT_FIELD,
  SECTION_DOC_TYPE,
  SECTION_FOR_TYPE,
};
