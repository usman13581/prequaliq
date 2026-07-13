/**
 * Search CPV codes from the database catalog (same list suppliers select from).
 */
const db = require('../models');
const { Op } = require('sequelize');

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'from', 'that', 'this', 'your', 'have', 'will',
  'need', 'must', 'should', 'including', 'required', 'services', 'service',
  'supplier', 'suppliers', 'procurement', 'contract', 'contracts', 'work',
  'och', 'för', 'med', 'som', 'att', 'ska', 'behöver', 'leverantör', 'tjänster',
]);

const TERM_SYNONYMS = {
  construction: ['construction', 'building', 'civil'],
  building: ['construction', 'architectural', 'engineering'],
  renovation: ['construction', 'repair', 'maintenance'],
  electrical: ['electrical', 'installation'],
  hvac: ['installation', 'ventilation', 'heating'],
  cleaning: ['cleaning', 'environmental', 'refuse'],
  software: ['software', 'information systems', 'it services'],
  it: ['it services', 'software', 'consulting'],
  consulting: ['consultancy', 'business services', 'research'],
  transport: ['transport'],
  catering: ['hotel', 'restaurant', 'food'],
  food: ['food', 'beverages'],
  medical: ['health', 'medical', 'pharmaceutical'],
  security: ['security', 'defence'],
  training: ['education', 'training'],
  printing: ['printed', 'printing'],
  maintenance: ['repair', 'maintenance'],
  insurance: ['insurance'],
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

function extractSearchTerms(description, extraKeywords = []) {
  const raw = [
    ...String(description || '').toLowerCase().split(/[\s,.;:!?()\-/]+/),
    ...extraKeywords.map((k) => String(k).toLowerCase()),
  ];
  const terms = new Set();
  for (let word of raw) {
    word = word.trim();
    if (word.length < 3 || STOP_WORDS.has(word)) continue;
    terms.add(word);
    const syns = TERM_SYNONYMS[word];
    if (syns) syns.forEach((s) => terms.add(s));
  }
  return [...terms].slice(0, 20);
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

  for (const term of terms) {
    if (hay.includes(term)) {
      matched.push(term);
      score += term.length >= 6 ? 3 : 2;
    }
  }

  const descWords = String(description || '')
    .toLowerCase()
    .split(/[\s,.;:!?()\-/]+/)
    .filter((w) => w.length >= 5 && !STOP_WORDS.has(w));
  for (const word of descWords.slice(0, 12)) {
    if (hay.includes(word)) {
      if (!matched.includes(word)) matched.push(word);
      score += 1;
    }
  }

  if (score === 0) return null;

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
  const usage = await getSupplierCpvUsageCounts();

  const allCodes = await db.CPVCode.findAll({
    attributes: ['id', 'code', 'description', 'level'],
    order: [['code', 'ASC']],
  });

  if (!allCodes.length) return [];

  const scored = [];
  for (const row of allCodes) {
    const hit = scoreCpvRow(row, terms, description, usage);
    if (hit) scored.push(hit);
  }

  let ranked = refineByDivision(scored);

  const withSuppliers = ranked.filter((s) => s.supplierCount > 0);
  if (withSuppliers.length >= 2) {
    ranked = [...withSuppliers, ...ranked.filter((s) => s.supplierCount === 0)];
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
};
