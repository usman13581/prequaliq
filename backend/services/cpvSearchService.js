/**
 * Search CPV codes from the database catalog (same list suppliers select from).
 */
const db = require('../models');
const { Op } = require('sequelize');

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'from', 'that', 'this', 'your', 'have', 'will',
  'need', 'must', 'should', 'including', 'required',
  'supplier', 'suppliers', 'procurement', 'contract', 'contracts', 'work',
  'och', 'för', 'med', 'som', 'att', 'ska', 'behöver', 'leverantör',
  // Company-registration boilerplate (must not dominate CPV search)
  'company', 'name', 'registration', 'extract', 'bolagsverket', 'number',
  'address', 'city', 'country', 'postal', 'code', 'phone', 'website', 'https',
  'www', 'example', 'year', 'established', 'employees', 'annual', 'turnover',
  'directors', 'status', 'active', 'sample', 'test', 'document', 'profile',
  'legal', 'form', 'aktiebolag', 'issued', 'purposes', 'real', 'not',
  'organisation', 'organization', 'org', 'momsregistreringsnummer', 'tax',
  'vat', 'ab', 'ceo', 'limited',
]);

/** Short tokens that are meaningful for CPV (normally filtered by length < 3). */
const SHORT_KEEP = new Set(['it', 'ict', 'hvac', 'iso']);

const TERM_SYNONYMS = {
  construction: ['construction', 'building', 'civil'],
  building: ['construction', 'architectural', 'engineering'],
  renovation: ['construction', 'repair', 'maintenance'],
  electrical: ['electrical', 'installation'],
  hvac: ['installation', 'ventilation', 'heating'],
  cleaning: ['cleaning', 'environmental', 'refuse', 'sanitation', 'facility'],
  software: ['software', 'information systems', 'it services', 'computer'],
  it: ['it services', 'software', 'consulting', 'information technology', 'computer'],
  information: ['information technology', 'it services', 'software'],
  technology: ['information technology', 'it services', 'software'],
  consulting: ['consultancy', 'business services', 'research'],
  consultancy: ['consulting', 'business services'],
  cloud: ['software', 'it services', 'information systems'],
  helpdesk: ['it services', 'support', 'computer'],
  managed: ['it services', 'support'],
  programming: ['software', 'it services'],
  internet: ['it services', 'software'],
  transport: ['transport'],
  catering: ['hotel', 'restaurant', 'food'],
  food: ['food', 'beverages'],
  medical: ['health', 'medical', 'pharmaceutical'],
  security: ['security', 'defence'],
  training: ['education', 'training'],
  printing: ['printed', 'printing'],
  maintenance: ['repair', 'maintenance'],
  insurance: ['insurance'],
  facility: ['facility', 'cleaning', 'sanitation'],
  sanitation: ['cleaning', 'facility'],
  // Cars / EV brands (catalog has no brand names — map to passenger-car CPVs)
  car: ['passenger cars', 'saloon cars', 'motor vehicles'],
  cars: ['passenger cars', 'saloon cars', 'motor vehicles'],
  automobile: ['passenger cars', 'saloon cars', 'motor vehicles'],
  automobiles: ['passenger cars', 'saloon cars'],
  vehicle: ['motor vehicles', 'passenger cars'],
  vehicles: ['motor vehicles', 'passenger cars'],
  sedan: ['saloon cars', 'passenger cars'],
  saloon: ['saloon cars', 'passenger cars'],
  estate: ['estate cars', 'passenger cars'],
  suv: ['passenger cars', '4-wheel-drive'],
  tesla: ['electric vehicles', 'passenger cars', 'saloon cars'],
  bmw: ['passenger cars', 'saloon cars'],
  volvo: ['passenger cars', 'saloon cars'],
  audi: ['passenger cars', 'saloon cars'],
  mercedes: ['passenger cars', 'saloon cars'],
  volkswagen: ['passenger cars', 'saloon cars'],
  toyota: ['passenger cars', 'saloon cars'],
  ev: ['electric vehicles', 'passenger cars'],
  electric: ['electric vehicles'],
  // Swedish / Nordic buyer wording → EN CPV catalog terms
  bil: ['passenger cars', 'saloon cars', 'motor vehicles'],
  bilar: ['passenger cars', 'saloon cars'],
  personbil: ['passenger cars', 'saloon cars'],
  personbilar: ['passenger cars', 'saloon cars'],
  elbil: ['electric vehicles', 'passenger cars'],
  elbilar: ['electric vehicles', 'passenger cars'],
  lokalvård: ['cleaning', 'facility', 'sanitation'],
  lokalvarden: ['cleaning', 'facility', 'sanitation'],
  städ: ['cleaning', 'facility', 'sanitation'],
  städning: ['cleaning', 'facility', 'sanitation'],
  städtjänster: ['cleaning', 'facility', 'sanitation'],
  stadtjanster: ['cleaning', 'facility', 'sanitation'],
  städservice: ['cleaning', 'facility'],
  rengöring: ['cleaning', 'sanitation'],
  rengoring: ['cleaning', 'sanitation'],
  hygien: ['cleaning', 'sanitation', 'facility'],
  bygg: ['construction', 'building', 'civil'],
  byggentreprenad: ['construction', 'building'],
  anläggning: ['construction', 'civil'],
  anlaggning: ['construction', 'civil'],
  renovering: ['construction', 'repair', 'maintenance'],
  elinstallation: ['electrical', 'installation'],
  ventilation: ['installation', 'ventilation', 'heating'],
  ittjänster: ['it services', 'software', 'information technology'],
  ittjänst: ['it services', 'software'],
  'it-tjänster': ['it services', 'software', 'information technology'],
  mjukvara: ['software', 'information systems'],
  konsult: ['consultancy', 'business services'],
  konsulttjänster: ['consultancy', 'business services'],
  transporttjänster: ['transport'],
  catering: ['hotel', 'restaurant', 'food'],
  livsmedel: ['food', 'beverages'],
  sjukvård: ['health', 'medical'],
  vård: ['health', 'medical'],
  utbildning: ['education', 'training'],
  säkerhet: ['security', 'defence'],
  underhåll: ['repair', 'maintenance'],
  underhall: ['repair', 'maintenance'],
  försäkring: ['insurance'],
  forsakring: ['insurance'],
  brobyggnation: ['construction', 'civil', 'bridge'],
  bro: ['construction', 'civil', 'bridge'],
};

function normalizeCpvCode(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  if (digits.length >= 8) return digits.slice(0, 8);
  if (digits.length >= 2) return digits.padEnd(8, '0').slice(0, 8);
  return null;
}

function isBroadDivisionCode(code) {
  return /^\d{2}000000$/.test(String(code || ''));
}

function extractExplicitCpvCodes(description) {
  const text = String(description || '');
  // Prefer digits listed in a CPV section (avoids picking turnover amounts like 42000000 SEK)
  const cpvSection = text.match(/cpv[^:]{0,40}:?\s*([\s\S]{0,900})/i)?.[1] || '';
  const scan = cpvSection || text;
  const found = [];
  const re = /\b(\d{8})\b/g;
  let m;
  while ((m = re.exec(scan)) !== null) {
    const idx = m.index;
    const window = scan.slice(Math.max(0, idx - 30), idx + 20).toLowerCase();
    if (/turnover|omsättning|sek|eur|usd|amount|coverage|employees|anställda/.test(window)) {
      continue;
    }
    const code = normalizeCpvCode(m[1]);
    if (code && !found.includes(code)) found.push(code);
  }
  return found.slice(0, 8);
}

/**
 * Prefer the "business activities / CPV" portion of company extracts so
 * registration boilerplate does not fill the term budget.
 */
function prioritizeBusinessText(description) {
  const text = String(description || '');
  const markers = [
    /business activities[:\s]+([\s\S]{20,1200})/i,
    /verksamhet[:\s]+([\s\S]{20,1200})/i,
    /primary cpv[^\n]*:?([\s\S]{10,800})/i,
    /cpv[^\n]*:?([\s\S]{10,800})/i,
  ];
  const chunks = [];
  for (const re of markers) {
    const m = text.match(re);
    if (m?.[1]) chunks.push(m[1]);
  }
  if (chunks.length) return `${chunks.join(' ')} ${text}`.slice(0, 8000);
  return text;
}

function extractSearchTerms(description, extraKeywords = []) {
  const prioritized = prioritizeBusinessText(description);
  const raw = [
    ...String(prioritized || '').toLowerCase().split(/[\s,.;:!?()\-/]+/),
    ...extraKeywords.map((k) => String(k).toLowerCase()),
  ];

  // Phrase boosts for common multi-word CPV intents (EN + SV)
  const lower = prioritized.toLowerCase();
  if (/\bit\s+services?\b/.test(lower) || /\bit[\s-]?tjänster?\b/.test(lower)) {
    raw.unshift('it', 'software', 'information', 'technology');
  }
  if (/\binformation\s+technology\b/.test(lower)) {
    raw.unshift('information', 'technology', 'software', 'it');
  }
  if (/\blokalvård|\bstäd|\bstädtjänst|\brengöring|\bfacility\s+clean/.test(lower)) {
    raw.unshift('cleaning', 'facility', 'sanitation');
  }
  if (/\bbygg|\banläggning|\brenovering|\bconstruction|\bcivil\s+work/.test(lower)) {
    raw.unshift('construction', 'building', 'civil');
  }
  // Passenger cars / EV brands (e.g. "Tesla S", "elbil", "personbil")
  if (
    /\b(tesla|bmw|volvo|audi|mercedes|volkswagen|toyota|ford|kia|hyundai)\b/.test(lower) ||
    /\b(model\s*[3syx]|personbil|elbil|sedan|saloon|suv)\b/.test(lower) ||
    /\b(passenger\s+cars?|electric\s+vehicles?|motor\s+vehicles?)\b/.test(lower) ||
    /\b(car|cars|automobile|bil|bilar)\b/.test(lower)
  ) {
    raw.unshift(
      'passenger cars',
      'saloon cars',
      'electric vehicles',
      'motor vehicles',
      'passenger',
      'saloon',
      'electric'
    );
  }

  const terms = new Set();
  for (let word of raw) {
    word = word.trim();
    if (!word || STOP_WORDS.has(word)) continue;
    if (word.length < 3 && !SHORT_KEEP.has(word)) continue;
    // Skip pure org numbers / noisy digit tokens unless 8-digit CPV
    if (/^\d+$/.test(word) && word.length !== 8) continue;
    terms.add(word);
    const syns = TERM_SYNONYMS[word];
    if (syns) syns.forEach((s) => terms.add(s));
  }
  return [...terms].slice(0, 40);
}

function termMatchesHay(term, hay) {
  const t = String(term || '').toLowerCase().trim();
  if (!t) return false;
  // Multi-word phrases: substring OK ("passenger cars")
  if (t.includes(' ')) return hay.includes(t);
  // Short/ambiguous tokens need word boundaries so "electric" ≠ "electricity"
  if (t.length <= 8) {
    try {
      return new RegExp(`(?:^|[^a-z0-9])${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=[^a-z0-9]|$)`).test(hay);
    } catch {
      return hay.includes(t);
    }
  }
  return hay.includes(t);
}

function isEmergencySpecialistCode(code, description) {
  const c = String(code || '');
  const d = String(description || '').toLowerCase();
  if (/^34114/.test(c) || /^34144/.test(c)) return true;
  return /\b(rescue|emergency|ambulance|firefight|police|prisoner|paramedic|military)\b/.test(d);
}

function descriptionHasEmergencyIntent(description) {
  return /\b(rescue|emergency|ambulance|firefight|fire\s*fight|police|paramedic|military)\b/i.test(
    String(description || '')
  );
}

function descriptionHasCarIntent(description) {
  return /\b(tesla|bmw|volvo|audi|mercedes|volkswagen|toyota|car|cars|automobile|bil|bilar|personbil|elbil|sedan|saloon|suv|model\s*[3syx])\b/i.test(
    String(description || '')
  );
}

async function getSupplierCpvUsageCounts() {
  try {
    const rows = await db.SupplierCPV.findAll({
      attributes: [
        'cpvCodeId',
        [db.sequelize.fn('COUNT', db.sequelize.col('cpvCodeId')), 'supplierCount'],
      ],
      group: ['cpvCodeId'],
      raw: true,
    });
    return Object.fromEntries(rows.map((r) => [r.cpvCodeId, Number(r.supplierCount) || 0]));
  } catch {
    return {};
  }
}

function scoreCpvRow(row, terms, description, usage) {
  const hay = `${row.code} ${row.description}`.toLowerCase();
  const matched = [];
  let score = 0;
  const carIntent = descriptionHasCarIntent(description);
  const emergencyIntent = descriptionHasEmergencyIntent(description);

  for (const term of terms) {
    if (termMatchesHay(term, hay)) {
      matched.push(term);
      score += term.length >= 6 || term.includes(' ') ? 3 : 2;
    }
  }

  const descWords = String(description || '')
    .toLowerCase()
    .split(/[\s,.;:!?()\-/]+/)
    .filter((w) => w.length >= 5 && !STOP_WORDS.has(w));
  for (const word of descWords.slice(0, 12)) {
    if (termMatchesHay(word, hay)) {
      if (!matched.includes(word)) matched.push(word);
      score += 1;
    }
  }

  if (score === 0) return null;

  // Car buys: boost passenger/EV codes; suppress rescue/emergency unless asked
  if (carIntent) {
    if (/^3411/.test(String(row.code)) || String(row.code) === '34144900') {
      score += 18;
    }
    if (/passenger cars|saloon cars|electric vehicles|estate cars/.test(hay)) {
      score += 10;
    }
    if (!emergencyIntent && isEmergencySpecialistCode(row.code, row.description)) {
      score -= 25;
    }
    // "procure" alone must not win via procurement software
    if (/procurement software|consultancy services|software development/.test(hay)) {
      score -= 20;
    }
  }

  const supplierCount = usage[row.id] || 0;
  score += Math.min(supplierCount, 20) * 2;
  if (supplierCount > 0) score += 5;
  if (isBroadDivisionCode(row.code)) score -= 3;

  return { row, score, matched, supplierCount };
}

/** Prefer specific codes over XX000000 when both match the same division */
function refineByDivision(scored) {
  const byPrefix = new Map();
  for (const item of scored) {
    const prefix = item.row.code.slice(0, 2);
    if (!byPrefix.has(prefix)) byPrefix.set(prefix, []);
    byPrefix.get(prefix).push(item);
  }

  const out = [];
  for (const items of byPrefix.values()) {
    items.sort((a, b) => b.score - a.score);
    const specific = items.filter((i) => !isBroadDivisionCode(i.row.code));
    const broad = items.filter((i) => isBroadDivisionCode(i.row.code));
    if (specific.length > 0) {
      out.push(...specific);
      if (specific.every((s) => s.supplierCount === 0) && broad.length) {
        out.push(broad[0]);
      }
    } else {
      out.push(...broad);
    }
  }

  out.sort((a, b) => b.score - a.score || b.supplierCount - a.supplierCount);
  return out;
}

async function searchCpvCandidatesFromDb(description, extraKeywords = [], limit = 10) {
  const terms = extractSearchTerms(description, extraKeywords);
  const explicitCodes = extractExplicitCpvCodes(description);
  const usage = await getSupplierCpvUsageCounts();

  const allCodes = await db.CPVCode.findAll({
    attributes: ['id', 'code', 'description', 'level'],
    order: [['code', 'ASC']],
  });

  if (!allCodes.length) return [];

  const scored = [];
  for (const row of allCodes) {
    const hit = scoreCpvRow(row, terms, description, usage);
    if (explicitCodes.includes(String(row.code))) {
      const boost = hit || {
        row,
        score: 0,
        matched: ['explicit-cpv'],
        supplierCount: usage[row.id] || 0,
      };
      boost.score += 40;
      boost.matched = [...new Set([...(boost.matched || []), 'explicit-cpv'])];
      scored.push(boost);
      continue;
    }
    if (hit) scored.push(hit);
  }

  let ranked = refineByDivision(scored);

  // Explicit document CPV codes always rank first
  if (explicitCodes.length) {
    ranked.sort((a, b) => {
      const aEx = explicitCodes.includes(String(a.row.code)) ? 1 : 0;
      const bEx = explicitCodes.includes(String(b.row.code)) ? 1 : 0;
      if (bEx !== aEx) return bEx - aEx;
      return b.score - a.score || b.supplierCount - a.supplierCount;
    });
  }

  if (ranked.length === 0 && terms.length > 0) {
    const orClauses = terms.slice(0, 6).map((term) => ({
      description: { [Op.iLike]: `%${term}%` },
    }));
    const rows = await db.CPVCode.findAll({
      where: { [Op.or]: orClauses },
      limit: Math.max(limit, 20),
      order: [['code', 'ASC']],
    });
    ranked = rows.map((row) => ({
      row,
      score: 1,
      matched: terms.slice(0, 2),
      supplierCount: usage[row.id] || 0,
    }));
    ranked = refineByDivision(ranked);
  }

  return ranked.slice(0, limit).map(({ row, score, matched, supplierCount }, idx) => ({
    cpvCodeId: row.id,
    code: row.code,
    description: row.description,
    reason:
      supplierCount > 0
        ? `In supplier catalog (${supplierCount} supplier(s)) · ${matched.slice(0, 2).join(', ')}`
        : matched.length > 0
          ? `Matches your description (${matched.slice(0, 3).join(', ')})`
          : 'Related category from CPV catalog',
    confidence: Math.max(0.4, Math.min(0.98, 0.55 + score * 0.04)),
    supplierCount,
    rank: idx + 1,
  }));
}

function resolveAiCpvPicks(aiPicks, candidates) {
  const byCode = new Map(candidates.map((c) => [normalizeCpvCode(c.code), c]));
  const results = [];
  const seen = new Set();

  for (const pick of aiPicks || []) {
    const code = normalizeCpvCode(pick?.code);
    if (!code) continue;
    const match = byCode.get(code);
    if (!match || seen.has(match.cpvCodeId)) continue;
    seen.add(match.cpvCodeId);
    results.push({
      ...match,
      reason: String(pick?.reason || match.reason).slice(0, 300),
      confidence: Math.min(0.99, (match.confidence || 0.7) + 0.1),
    });
  }
  return results;
}

module.exports = {
  searchCpvCandidatesFromDb,
  resolveAiCpvPicks,
  normalizeCpvCode,
  extractSearchTerms,
  extractExplicitCpvCodes,
  prioritizeBusinessText,
  refineByDivision,
  isBroadDivisionCode,
};
