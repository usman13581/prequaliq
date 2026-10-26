/**
 * Match NUTS regions from document / address text (catalog codes only).
 */
const db = require('../models');
const { Op } = require('sequelize');

const COUNTRY_HINTS = {
  sweden: { codePrefix: 'SE', names: ['sweden', 'sverige'] },
  norway: { codePrefix: 'NO', names: ['norway', 'norge'] },
  denmark: { codePrefix: 'DK', names: ['denmark', 'danmark'] },
  finland: { codePrefix: 'FI', names: ['finland', 'suomi'] },
};

function extractCityHints(text) {
  const lower = String(text || '').toLowerCase();
  const hints = new Set();

  const labeled = lower.match(
    /(?:^|[\s])(?:city|postort|town|municipality|kommun)\s*[:\-]\s*([a-zåäöü][a-zåäöü\-]*(?:\s+[a-zåäöü][a-zåäöü\-]*){0,2})/i
  );
  if (labeled?.[1]) {
    const city = labeled[1].trim().split(/\s+(?:country|land|sweden|sverige)\b/i)[0].trim();
    if (city) hints.add(city);
  }

  // Common Swedish cities appearing as standalone words
  const cities = [
    'stockholm', 'göteborg', 'goteborg', 'malmö', 'malmo', 'uppsala', 'västerås',
    'vasteras', 'örebro', 'orebro', 'linköping', 'linkoping', 'helsingborg',
    'jönköping', 'jonkoping', 'norrköping', 'norrkoping', 'lund', 'umeå', 'umea',
  ];
  for (const city of cities) {
    if (new RegExp(`\\b${city}\\b`, 'i').test(lower)) hints.add(city);
  }

  return [...hints].filter(Boolean).slice(0, 6);
}

function detectCountryPrefix(text) {
  const lower = String(text || '').toLowerCase();
  for (const hint of Object.values(COUNTRY_HINTS)) {
    if (hint.names.some((n) => lower.includes(n))) return hint.codePrefix;
  }
  // Default Nordic focus for this product
  if (/\bse\d|\borg\.?\s*nr|\bsweden\b|\bsverige\b/i.test(text || '')) return 'SE';
  return null;
}

async function searchNutsCandidatesFromDb(text, limit = 5) {
  if (!db.NUTSCode) return [];

  const cities = extractCityHints(text);
  const countryPrefix = detectCountryPrefix(text);
  if (!cities.length && !countryPrefix) return [];

  const orClauses = [];
  for (const city of cities) {
    orClauses.push({ name: { [Op.iLike]: `%${city}%` } });
    orClauses.push({ nameSwedish: { [Op.iLike]: `%${city}%` } });
  }

  const where = {
    isActive: true,
    ...(orClauses.length ? { [Op.or]: orClauses } : {}),
    ...(countryPrefix && !orClauses.length
      ? { code: { [Op.like]: `${countryPrefix}%` } }
      : {}),
  };

  let rows = await db.NUTSCode.findAll({
    where,
    attributes: ['id', 'code', 'name', 'nameSwedish', 'level'],
    order: [['level', 'DESC'], ['code', 'ASC']],
    limit: 40,
  });

  if (countryPrefix) {
    rows = rows.filter((r) => String(r.code).startsWith(countryPrefix));
  }

  // Prefer NUTS 3, then 2; drop level 1 unless nothing else
  const ranked = [...rows].sort((a, b) => {
    const levelScore = (lvl) => (lvl === 3 ? 3 : lvl === 2 ? 2 : 1);
    return levelScore(b.level) - levelScore(a.level) || String(a.code).localeCompare(String(b.code));
  });

  const picked = [];
  const seen = new Set();
  for (const row of ranked) {
    if (seen.has(row.id)) continue;
    // Prefer county-level (3) for city matches
    if (cities.length && row.level === 1) continue;
    seen.add(row.id);
    picked.push({
      nutsCodeId: row.id,
      code: row.code,
      name: row.name,
      nameSwedish: row.nameSwedish,
      level: row.level,
      reason: cities.length
        ? `Matched location (${cities.slice(0, 2).join(', ')})`
        : `Matched country (${countryPrefix})`,
      confidence: row.level === 3 ? 0.9 : row.level === 2 ? 0.8 : 0.6,
    });
    if (picked.length >= limit) break;
  }

  // If only broad hits, allow one level-2
  if (!picked.length && ranked.length) {
    const row = ranked.find((r) => r.level >= 2) || ranked[0];
    picked.push({
      nutsCodeId: row.id,
      code: row.code,
      name: row.name,
      nameSwedish: row.nameSwedish,
      level: row.level,
      reason: 'Matched from document location',
      confidence: 0.7,
    });
  }

  return picked.slice(0, Math.min(limit, 3));
}

module.exports = {
  searchNutsCandidatesFromDb,
  extractCityHints,
  detectCountryPrefix,
};
