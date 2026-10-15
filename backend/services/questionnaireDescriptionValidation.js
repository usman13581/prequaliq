/**
 * Length checks + light irrelevant-query detection for AI understand step.
 * Prefer accepting plausible procurement notes; only hard-reject clear off-topic chat.
 */

const MIN_CHARS = 10;
const MAX_CHARS = 300;

/** Soft hints only — used for framing / fallbacks, not hard rejection. */
const PROCUREMENT_INTENT = [
  'procure', 'procurement', 'contract', 'tender', 'supplier', 'qualification',
  'pre-qualif', 'prequalif', 'service', 'services', 'construction', 'construct',
  'supply', 'supplies', 'works', 'maintenance', 'cleaning', 'software', 'consulting',
  'equipment', 'insurance', 'certification', 'certificate', 'iso', 'experience',
  'delivery', 'renovation', 'install', 'installation', 'transport', 'catering',
  'medical', 'required', 'seeking', 'qualified', 'contractor', 'vendor', 'provider',
  'framework', 'agreement', 'compliance', 'capacity', 'reference', 'project',
  'building', 'build', 'bridge', 'electrical', 'hvac', 'security', 'training',
  'printing', 'office', 'furniture', 'it ', 'network', 'cloud', 'facility',
  'waste', 'recycling', 'parking', 'road', 'asphalt', 'paint', 'laundry',
  'school', 'hospital', 'food', 'snow', 'plow', 'gard', 'landscape',
  'upphandl', 'leverantör', 'tjänst', 'tjänster', 'entrepren', 'bygg',
  'underhåll', 'städ', 'kvalific', 'avtal', 'anbud', 'kontrakt', 'försäkring',
  'certifier', 'erfarenhet', 'renovering', 'entreprenör', 'ramavtal', 'krav', 'leverans',
  'bro', 'anlägg', 'behöver', 'need to', 'want to', 'looking for', 'we need', 'vi behöver',
];

const MESSAGES = {
  en: {
    DESCRIPTION_TOO_SHORT:
      'Please enter at least 10 characters describing what you want to procure.',
    DESCRIPTION_TOO_LONG:
      'Maximum 300 characters allowed. Please shorten your description.',
    IRRELEVANT_QUERY:
      'This assistant only helps create supplier qualification questionnaires for procurement. It cannot answer general questions, travel opinions, chat, or unrelated topics. Please describe works, services, or supplies you want to procure.',
  },
  sv: {
    DESCRIPTION_TOO_SHORT:
      'Ange minst 10 tecken som beskriver vad du vill upphandla.',
    DESCRIPTION_TOO_LONG:
      'Högst 300 tecken tillåtna. Förkorta beskrivningen.',
    IRRELEVANT_QUERY:
      'Denna assistent skapar endast leverantörskvalificeringsenkäter för upphandling. Den svarar inte på allmänna frågor, resefrågor, chatt eller irrelevanta ämnen. Beskriv arbeten, tjänster eller varor du vill upphandla.',
  },
};

function messageFor(code, language = 'en') {
  const lang = language === 'sv' ? 'sv' : 'en';
  return MESSAGES[lang][code] || MESSAGES.en[code];
}

function irrelevantRejectionMessage(language = 'en') {
  return messageFor('IRRELEVANT_QUERY', language);
}

function hasProcurementIntent(text) {
  const lower = ` ${String(text || '').toLowerCase()} `;
  return PROCUREMENT_INTENT.some((term) => lower.includes(term.toLowerCase()));
}

/**
 * Only hard-reject clearly off-topic chat / trivia / travel.
 * Normal short procurement notes should pass even without keyword hits.
 */
function looksLikeIrrelevantQuery(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return true;

  // If it already looks procurement-related, never treat as irrelevant.
  if (hasProcurementIntent(trimmed)) {
    return false;
  }

  const irrelevantPatterns = [
    /\bwhich\s+(place|city|country|town|spot|destination|is better|one is|is more)\b/i,
    /\bwhat\s+is\s+(the\s+)?(best|capital|weather|prettier|beautiful)\b/i,
    /\bhow\s+are\s+you\b/i,
    /\bwhat'?s\s+up\b/i,
    /\bbeautiful\b|\bprettier\b|\bbetter\s+place\b/i,
    /\btell\s+me\s+(a\s+)?joke\b/i,
    /\btravel\b|\btourism\b|\bvacation\b|\bholiday\b/i,
    /\bwho\s+(won|is|was)\b/i,
    /\b(lahore|islamabad|isb|lhr|karachi|pakistan)\b.*\bor\b/i,
    /\bor\b.*\b(lahore|islamabad|isb|lhr|karachi)\b/i,
    /^(hi|hello|hey|hej|tja)[\s!.?]*$/i,
    /\bjoke\b|\bfunny\b/i,
  ];

  if (irrelevantPatterns.some((p) => p.test(trimmed))) {
    return true;
  }

  // Pure greeting / tiny chat
  if (/^(hi|hello|hey|hej|tja|thanks|thank you|ok|okay)\b/i.test(trimmed) && trimmed.length < 20) {
    return true;
  }

  // Opinion / trivia questions with "?" and no procurement framing
  if (
    /^(what|which|who|where|when|why|how)\b/i.test(trimmed) &&
    /\?/.test(trimmed) &&
    !/\b(procure|supplier|contract|tender|service|supply|works|build|construct)\b/i.test(trimmed)
  ) {
    return true;
  }

  return false;
}

function looksLikePlausibleProcurementNote(text) {
  const trimmed = String(text || '').trim();
  if (trimmed.length < MIN_CHARS) return false;
  if (looksLikeIrrelevantQuery(trimmed)) return false;
  // Any non-trivial note that isn't clearly off-topic is accepted for understand step.
  const words = trimmed.split(/\s+/).filter(Boolean);
  return words.length >= 2;
}

function isTrivialEcho(input, understanding) {
  const a = String(input || '').toLowerCase().replace(/\s+/g, ' ').trim();
  const b = String(understanding || '').toLowerCase().replace(/\s+/g, ' ').trim();
  if (!a || !b || a.length < 12) return false;

  const procurementFraming =
    /\b(procure\w*|qualif\w*|supplier\w*|contract\w*|tender\w*|upphandl\w*|leverantör\w*|kvalific\w*|works|services|supplies)\b/i.test(
      b
    );

  if (procurementFraming) return false;

  if (b === a || b.includes(a) || a.includes(b)) {
    return true;
  }

  const aWords = a.split(' ').filter((w) => w.length > 2);
  const matched = aWords.filter((w) => b.includes(w)).length;
  return aWords.length >= 4 && matched / aWords.length >= 0.75;
}

function buildFallbackUnderstanding(trimmed, language = 'en') {
  if (language === 'sv') {
    return `Du vill skapa en kvalificeringsenkät för leverantörer utifrån: ${trimmed}`;
  }
  return `You want to qualify suppliers based on: ${trimmed}`;
}

function normalizeUnderstandResult(raw, description, language = 'en') {
  const trimmed = String(description || '').trim();
  const rejection = irrelevantRejectionMessage(language);

  // Hard reject only clear off-topic input
  if (looksLikeIrrelevantQuery(trimmed)) {
    return {
      isValid: false,
      understanding: '',
      category: '',
      rejectionReason: rejection,
    };
  }

  let isValid = Boolean(raw?.isValid);
  let understanding = String(raw?.understanding || '').trim();
  let category = String(raw?.category || '').trim();
  let rejectionReason = String(raw?.rejectionReason || '').trim();

  // If model rejected but text looks like a normal procurement note → accept anyway
  if (!isValid && looksLikePlausibleProcurementNote(trimmed)) {
    isValid = true;
    understanding = understanding || buildFallbackUnderstanding(trimmed, language);
    category = category || (language === 'sv' ? 'Upphandling' : 'Procurement');
    rejectionReason = '';
  }

  // Soften trivial-echo: only reject if clearly off-topic AND echo-like
  if (isValid && isTrivialEcho(trimmed, understanding) && !hasProcurementIntent(trimmed)) {
    // Prefer reframing over rejecting
    understanding = buildFallbackUnderstanding(trimmed, language);
    category = category || (language === 'sv' ? 'Upphandling' : 'Procurement');
  }

  if (isValid && !understanding) {
    understanding = buildFallbackUnderstanding(trimmed, language);
  }
  if (isValid && !category) {
    category = language === 'sv' ? 'Upphandling' : 'Procurement';
  }

  if (!isValid && !rejectionReason) {
    rejectionReason = rejection;
  }

  return {
    isValid,
    understanding: isValid ? understanding : '',
    category: isValid ? category : '',
    rejectionReason: isValid ? '' : rejectionReason,
  };
}

function validateQuestionnaireDescription(text, language = 'en') {
  const trimmed = String(text || '').trim();

  if (trimmed.length < MIN_CHARS) {
    return {
      valid: false,
      code: 'DESCRIPTION_TOO_SHORT',
      message: messageFor('DESCRIPTION_TOO_SHORT', language),
    };
  }

  if (trimmed.length > MAX_CHARS) {
    return {
      valid: false,
      code: 'DESCRIPTION_TOO_LONG',
      message: messageFor('DESCRIPTION_TOO_LONG', language),
    };
  }

  return { valid: true };
}

module.exports = {
  MIN_CHARS,
  MAX_CHARS,
  validateQuestionnaireDescription,
  messageFor,
  hasProcurementIntent,
  looksLikeIrrelevantQuery,
  looksLikePlausibleProcurementNote,
  irrelevantRejectionMessage,
  normalizeUnderstandResult,
};
